// API de conversiones de Meta. El navegador manda aquí el mismo evento que dispara el píxel (mismo event_id)
// y esta función lo reenvía a Meta desde el servidor, con la IP y el navegador del visitante.
// Variables en Netlify (Project configuration → Environment variables):
//   META_CAPI_TOKEN        token de la API de conversiones (Administrador de eventos → Configuración). Obligatorio.
//   META_PIXEL_ID          opcional; por defecto el píxel de Alma Animal.
//   META_TEST_EVENT_CODE   opcional; el código de «Probar eventos» para ver los eventos en vivo. Quitarlo después.
import { createHash } from 'node:crypto';

const PIXEL = process.env.META_PIXEL_ID || '843169261930833';
const VERSION = 'v23.0';
const EVENTOS = new Set(['PageView', 'ViewContent', 'AddToCart', 'InitiateCheckout', 'Purchase', 'Contact', 'Schedule', 'Lead']);
const DATOS = ['value', 'currency', 'content_ids', 'content_type', 'content_name', 'content_category', 'contents', 'num_items', 'order_id'];

const sha = (v) => createHash('sha256').update(v).digest('hex');
const limpio = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
// celular colombiano con indicativo: 3001234567 → 573001234567
const celular = (v) => { const d = String(v ?? '').replace(/\D/g, ''); return d.length === 10 ? '57' + d : d; };
const texto = (v) => limpio(v).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z]/g, '');

const resp = (status, body) => new Response(body ? JSON.stringify(body) : null, { status, headers: { 'Content-Type': 'application/json' } });

export default async (req) => {
  if (req.method !== 'POST') return resp(405);
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return resp(204); // sin token solo funciona el píxel del navegador

  let b;
  try { b = await req.json(); } catch { return resp(400); }
  if (!EVENTOS.has(b?.evento) || typeof b.id !== 'string' || b.id.length > 64) return resp(400);

  // solo eventos de páginas del propio sitio
  let url;
  try { url = new URL(b.url); } catch { return resp(400); }
  const host = new URL(req.url).host;
  if (url.host !== host) return resp(400);

  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const user = { client_ip_address: ip, client_user_agent: req.headers.get('user-agent') ?? undefined, country: [sha('co')] };
  if (typeof b.fbp === 'string') user.fbp = b.fbp;
  if (typeof b.fbc === 'string') user.fbc = b.fbc;
  const c = b.cliente ?? {};
  if (limpio(c.correo).includes('@')) user.em = [sha(limpio(c.correo))];
  const cel = celular(c.celular);
  if (cel.length >= 10) { user.ph = [sha(cel)]; user.external_id = [sha(cel)]; }
  if (texto(c.nombre)) user.fn = [sha(texto(c.nombre))];
  if (texto(c.apellido)) user.ln = [sha(texto(c.apellido))];
  if (texto(c.ciudad)) user.ct = [sha(texto(c.ciudad))];
  if (texto(c.departamento)) user.st = [sha(texto(c.departamento))];

  const custom = {};
  for (const k of DATOS) if (b.datos?.[k] !== undefined) custom[k] = b.datos[k];

  const evento = {
    event_name: b.evento, event_time: Math.floor(Date.now() / 1000), event_id: b.id,
    action_source: 'website', event_source_url: url.href, user_data: user, custom_data: custom
  };
  const payload = { data: [evento] };
  if (process.env.META_TEST_EVENT_CODE) payload.test_event_code = process.env.META_TEST_EVENT_CODE;

  const r = await fetch(`https://graph.facebook.com/${VERSION}/${PIXEL}/events?access_token=${encodeURIComponent(token)}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
  }).catch(() => null);
  if (!r?.ok) {
    console.error('Meta CAPI', r?.status, r ? (await r.text()).slice(0, 300) : 'sin respuesta');
    return resp(502);
  }
  return resp(200, { ok: true });
};
