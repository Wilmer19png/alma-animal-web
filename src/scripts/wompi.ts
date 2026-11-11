// Pago en línea con Wompi (Web Checkout). El pedido ya está guardado en Supabase con metodo_pago = 'wompi';
// aquí se pide la firma al servidor (netlify/functions/wompi-pago.mjs, que revisa precios y total) y se manda
// al cliente a la página de pago de Wompi. Al terminar, Wompi lo devuelve a /pago?id=<transacción>.
// El pedido se marca pagado solo cuando Wompi avisa a netlify/functions/wompi-eventos.mjs (no lo decide el navegador).

const FUNCION = '/.netlify/functions/wompi-pago';
export const CLAVE_PAGO = 'alma-wompi'; // lo que se necesita en /pago para el evento Purchase y para reintentar

export interface CompraGuardada {
  codigo: string; total: number; items: { id: string; precio: number; cantidad: number }[];
  cliente: { correo?: string; celular?: string; nombre?: string; apellido?: string; ciudad?: string; departamento?: string };
}

export async function pagarConWompi(codigo: string, compra?: CompraGuardada): Promise<void> {
  if (compra) try { sessionStorage.setItem(CLAVE_PAGO, JSON.stringify(compra)); } catch { /* sin almacenamiento */ }
  const res = await fetch(FUNCION, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codigo }) });
  const w = await res.json().catch(() => null);
  if (!res.ok || !w?.firma) throw new Error(w?.error || 'No pudimos abrir el pago en línea.');
  const u = new URL('https://checkout.wompi.co/p/');
  u.searchParams.set('public-key', w.llave);
  u.searchParams.set('currency', 'COP');
  u.searchParams.set('amount-in-cents', String(w.centavos));
  u.searchParams.set('reference', w.referencia);
  u.searchParams.set('signature:integrity', w.firma);
  u.searchParams.set('redirect-url', location.origin + '/pago');
  if (w.correo) u.searchParams.set('customer-data:email', w.correo);
  if (w.nombre) u.searchParams.set('customer-data:full-name', w.nombre);
  if (w.celular) { u.searchParams.set('customer-data:phone-number', w.celular); u.searchParams.set('customer-data:phone-number-prefix', '+57'); }
  location.href = u.toString();
}
