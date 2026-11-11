// Prepara el pago en línea de un pedido con Wompi (Web Checkout).
// La página guarda el pedido (metodo_pago = 'wompi') y llama aquí con su código. Esta función lee el pedido
// con la clave de servicio, revisa que los precios sean los del catálogo y que el total cuadre (descuento,
// envío y prioritario), anota la referencia del intento y devuelve la firma de integridad que pide Wompi.
// Así nadie puede pagar menos cambiando el precio desde el navegador.
//
// Variables en Netlify (Project configuration → Environment variables):
//   PUBLIC_WOMPI_PUBLIC_KEY    llave pública (pub_prod_… o pub_test_… para pruebas). También activa la opción en la página.
//   WOMPI_INTEGRITY_SECRET     Wompi → Desarrolladores → Secretos para integración técnica → Integridad
//   SUPABASE_SERVICE_ROLE_KEY  Supabase → Project Settings → API → service_role (secreta: solo en Netlify)
//   PUBLIC_SUPABASE_URL        la misma de siempre
import { createHash, randomBytes } from 'node:crypto';

// mismo cálculo que descuentoEnLinea en src/data/shop.ts
const PCT = 5;
const TOPE = 10000;
const descuento = (sub) => Math.min(TOPE, Math.round((sub * PCT) / 100 / 100) * 100);

const SB = process.env.PUBLIC_SUPABASE_URL;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY;
const LLAVE = process.env.PUBLIC_WOMPI_PUBLIC_KEY;
const INTEGRIDAD = process.env.WOMPI_INTEGRITY_SECRET;

const resp = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const rest = (ruta, init = {}) => fetch(`${SB}/rest/v1/${ruta}`, {
  ...init, headers: { apikey: SR, Authorization: `Bearer ${SR}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) }
});
const NO_CUADRA = 'Revisamos tu pedido y algo no cuadra con los precios. Te escribimos por WhatsApp para terminarlo.';

export default async (req) => {
  if (req.method !== 'POST') return resp(405, { error: 'Método no permitido' });
  if (!SB || !SR || !LLAVE || !INTEGRIDAD) return resp(503, { error: 'El pago en línea no está disponible en este momento.' });

  let codigo;
  try { ({ codigo } = await req.json()); } catch { return resp(400, { error: 'Pedido no válido' }); }
  if (typeof codigo !== 'string' || !/^AA-[A-Z0-9]{3,12}$/.test(codigo)) return resp(400, { error: 'Pedido no válido' });

  const r = await rest(`pedidos?codigo=eq.${codigo}&select=id,codigo,creado,estado,departamento,ciudad,items,subtotal,envio,prioritario,descuento,total,metodo_pago,pago_estado,correo,nombre,apellido,celular`);
  const [p] = r.ok ? await r.json() : [];
  if (!p) return resp(404, { error: 'No encontramos tu pedido.' });
  if (p.metodo_pago !== 'wompi') return resp(409, { error: 'Este pedido es para pagar al recibir.' });
  if (p.pago_estado === 'aprobado') return resp(409, { error: 'Este pedido ya está pagado.' });
  if (['cancelado', 'entregado'].includes(p.estado)) return resp(409, { error: 'Este pedido ya no se puede pagar en línea.' });
  if (Date.now() - new Date(p.creado).getTime() > 7 * 864e5) return resp(409, { error: 'Este pedido es de hace más de una semana. Escríbenos por WhatsApp.' });

  // ---------- precios del catálogo ----------
  const items = Array.isArray(p.items) ? p.items : [];
  const vids = [...new Set(items.map((i) => i.vid).filter((v) => /^[0-9a-f-]{36}$/.test(v ?? '')))];
  const slugs = [...new Set(items.filter((i) => !i.vid).map((i) => i.id).filter((s) => /^[a-z0-9-]+$/.test(s ?? '')))];
  const precioVar = new Map();
  if (vids.length) {
    const rv = await rest(`variantes?id=in.(${vids.join(',')})&select=id,precio`);
    for (const v of rv.ok ? await rv.json() : []) precioVar.set(v.id, v.precio);
  }
  const preciosSlug = new Map();
  if (slugs.length) {
    const rp = await rest(`productos?slug=in.(${slugs.join(',')})&select=slug,variantes(precio,activo)`);
    for (const x of rp.ok ? await rp.json() : []) preciosSlug.set(x.slug, (x.variantes ?? []).filter((v) => v.activo !== false).map((v) => v.precio));
  }
  const precioOk = (i) => (i.vid ? precioVar.get(i.vid) === i.precio : (preciosSlug.get(i.id) ?? []).includes(i.precio));
  if (!items.length || !items.every((i) => Number.isInteger(i.cantidad) && i.cantidad > 0 && precioOk(i))) return resp(409, { error: NO_CUADRA });

  // ---------- total: productos − descuento + envío + prioritario ----------
  const ra = await rest('ajustes?clave=eq.envios&select=valor');
  const cfg = (ra.ok ? (await ra.json())[0]?.valor : null) ?? { ciudades: ['Pereira', 'Dosquebradas'], gratisDesde: 70000, fijo: 20000, prioritario: { activo: true, valor: 5000 } };
  const sub = items.reduce((s, i) => s + i.precio * i.cantidad, 0);
  const prio = p.prioritario ? (cfg.prioritario?.activo ? cfg.prioritario.valor : 0) : 0;
  const envioGratis = sub >= cfg.gratisDesde || (p.departamento === 'Risaralda' && (cfg.ciudades ?? []).includes(p.ciudad)) || items.some((i) => i.proveedor === 'dropi');
  const envioOk = p.envio === 0 ? envioGratis : p.envio === cfg.fijo;
  if (sub !== p.subtotal || p.descuento !== descuento(sub) || !envioOk || p.total !== sub - p.descuento + p.envio + prio || p.total <= 0) {
    console.warn('wompi-pago: no cuadra', codigo, { sub, subtotal: p.subtotal, descuento: p.descuento, envio: p.envio, total: p.total });
    return resp(409, { error: NO_CUADRA });
  }

  // ---------- referencia de este intento y firma ----------
  const referencia = `${p.codigo}-${randomBytes(2).toString('hex')}`;
  const centavos = p.total * 100;
  const up = await rest(`pedidos?id=eq.${p.id}`, { method: 'PATCH', headers: { Prefer: 'return=minimal' }, body: JSON.stringify({ wompi_referencia: referencia, pago_estado: 'pendiente' }) });
  if (!up.ok) return resp(500, { error: 'No pudimos preparar el pago. Inténtalo de nuevo.' });
  const firma = createHash('sha256').update(`${referencia}${centavos}COP${INTEGRIDAD}`).digest('hex');
  const cel = String(p.celular ?? '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  return resp(200, {
    llave: LLAVE, referencia, centavos, firma,
    correo: p.correo || null, nombre: `${p.nombre} ${p.apellido}`.trim().slice(0, 80), celular: /^3\d{9}$/.test(cel) ? cel : null
  });
};
