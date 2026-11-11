// Píxel de Meta + API de conversiones. Cada evento sale dos veces con el mismo event_id:
// desde el navegador (fbq) y desde el servidor (netlify/functions/meta-capi.mjs). Meta los junta y no cuenta doble.
// Lo que va desde el servidor llega aunque el navegador bloquee el píxel.
// Los datos del cliente (correo, celular, nombre) solo se mandan en Purchase y Schedule, y el servidor
// los cifra (SHA-256) antes de enviarlos a Meta.

type Fbq = (...args: unknown[]) => void;
declare global { interface Window { fbq?: Fbq } }

export interface Cliente { correo?: string; celular?: string; nombre?: string; apellido?: string; ciudad?: string; departamento?: string }

const ENDPOINT = '/.netlify/functions/meta-capi';
const local = location.protocol === 'file:' || ['localhost', '127.0.0.1'].includes(location.hostname);

const nuevoId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const cookie = (n: string) => document.cookie.split('; ').find((c) => c.startsWith(n + '='))?.slice(n.length + 1);

// eventId: para la compra se usa el código del pedido (si se repite, Meta lo cuenta una sola vez)
export function track(evento: string, datos: Record<string, unknown> = {}, cliente?: Cliente, eventId?: string) {
  const id = eventId ?? nuevoId();
  try { window.fbq?.('track', evento, datos, { eventID: id }); } catch { /* píxel bloqueado */ }
  if (local) return;
  const body = JSON.stringify({ evento, id, url: location.href, datos, cliente, fbp: cookie('_fbp'), fbc: cookie('_fbc') });
  // keepalive: el evento sale aunque la persona cambie de página (por ejemplo al abrir WhatsApp)
  fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true }).catch(() => {});
}

// clics en cualquier botón o enlace de WhatsApp
document.addEventListener('click', (e) => {
  const a = (e.target as Element | null)?.closest?.('a[href*="wa.me/"], a[href*="api.whatsapp.com/"]') as HTMLAnchorElement | null;
  if (!a) return;
  const area = a.href.includes('573017925910') ? 'petshop' : 'veterinaria';
  track('Contact', { content_category: area });
}, { capture: true });
