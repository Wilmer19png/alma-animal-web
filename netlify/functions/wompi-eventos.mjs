// Wompi llama aquí cada vez que cambia una transacción (evento transaction.updated).
// Se verifica la firma del evento, se busca el pedido por la referencia (código + intento) y se anota el pago.
// Si el pago se aprueba y el valor es el del pedido, el pedido pasa solo a «Pago recibido» (pago = en_linea):
// así descuenta inventario y entra a Contabilidad, igual que si el equipo lo marcara en el gestor.
//
// En Wompi → Desarrolladores → Seguimiento de transacciones, la URL de eventos es:
//   https://almaanimal.co/.netlify/functions/wompi-eventos      (con el dominio del sitio)
// Variables en Netlify: WOMPI_EVENTS_SECRET (Wompi → Desarrolladores → Secretos → Eventos),
//   SUPABASE_SERVICE_ROLE_KEY y PUBLIC_SUPABASE_URL.
import { createHash } from 'node:crypto';

const SB = process.env.PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SECRETO = process.env.WOMPI_EVENTS_SECRET;
const ESTADOS = { APPROVED: 'aprobado', DECLINED: 'rechazado', VOIDED: 'anulado', ERROR: 'error', PENDING: 'pendiente' };

const resp = (status) => new Response(null, { status });
const rest = (ruta, init = {}) => fetch(`${SB}/rest/v1/${ruta}`, {
  ...init, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }
});

// Firma de Wompi: SHA256 de los valores de signature.properties (en orden) + timestamp + secreto de eventos
const firmaValida = (ev) => {
  const props = ev?.signature?.properties ?? [];
  const recibida = String(ev?.signature?.checksum ?? '').toLowerCase();
  if (!props.length || !recibida) return false;
  const valores = props.map((ruta) => ruta.split('.').reduce((o, k) => o?.[k], ev.data) ?? '').join('');
  return createHash('sha256').update(`${valores}${ev.timestamp}${SECRETO}`).digest('hex') === recibida;
};

export default async (req) => {
  if (req.method !== 'POST') return resp(405);
  if (!SB || !SR || !SECRETO) { console.error('wompi-eventos: faltan variables'); return resp(500); } // Wompi reintenta
  let ev;
  try { ev = await req.json(); } catch { return resp(400); }
  if (!firmaValida(ev)) { console.warn('wompi-eventos: firma inválida', ev?.event); return resp(401); }
  if (ev.event !== 'transaction.updated') return resp(200);

  const tx = ev.data?.transaction ?? {};
  const referencia = String(tx.reference ?? '');
  const estado = ESTADOS[tx.status];
  if (!/^AA-[A-Z0-9]{3,12}-[0-9a-f]{4}$/.test(referencia) || !estado) return resp(200);

  const campos = 'id,codigo,estado,total,pago_estado,wompi_referencia,wompi_transaccion';
  let r = await rest(`pedidos?wompi_referencia=eq.${referencia}&select=${campos}`);
  let [p] = r.ok ? await r.json() : [];
  const ultimoIntento = Boolean(p);
  if (!p) { r = await rest(`pedidos?codigo=eq.${referencia.replace(/-[0-9a-f]{4}$/, '')}&select=${campos}`); [p] = r.ok ? await r.json() : []; }
  if (!p) { console.warn('wompi-eventos: pedido no encontrado', referencia); return resp(200); }

  // un pago aprobado solo cambia si esa misma transacción se anula; un intento viejo no aprobado no pisa el actual
  if (p.pago_estado === 'aprobado' && !(estado === 'anulado' && tx.id === p.wompi_transaccion)) return resp(200);
  if (!ultimoIntento && estado !== 'aprobado') return resp(200);

  const cambios = { pago_estado: estado, wompi_transaccion: tx.id ?? null, wompi_medio: tx.payment_method_type ?? null };
  if (estado === 'aprobado') {
    if (Number(tx.amount_in_cents) !== p.total * 100 || tx.currency !== 'COP') {
      console.error(`wompi-eventos: ${p.codigo} vale ${p.total * 100} y Wompi aprobó ${tx.amount_in_cents} ${tx.currency}. No se marca pagado.`);
      cambios.pago_estado = 'error';
    } else {
      Object.assign(cambios, { wompi_referencia: referencia, pago: 'en_linea', metodo_pago: 'wompi' });
      if (['nuevo', 'confirmado'].includes(p.estado)) cambios.estado = 'pagado';
    }
  }
  const up = await rest(`pedidos?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify(cambios) });
  if (!up.ok) { console.error('wompi-eventos: no se guardó', p.codigo, await up.text()); return resp(500); }
  console.log(`wompi-eventos: ${p.codigo} ${tx.status} (${tx.payment_method_type ?? '?'})`);
  return resp(200);
};
