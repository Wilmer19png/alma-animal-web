// Aplica en la página lo que se cambió en el gestor (Textos e imágenes): textos, títulos, bloques
// ocultos, título y descripción para Google, y la barra de anuncio. Si no hay conexión, queda lo de siempre.
import { PAGINAS, rich, tituloHtml, CAMPOS, type Sitio } from '../data/contenido';

const SB = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const CACHE = 'alma-sitio';

function aplicar(s: Sitio) {
  const t = s.textos ?? {};
  document.querySelectorAll<HTMLElement>('[data-c]').forEach((el) => {
    const v = t[el.dataset.c!];
    if (v == null) return;
    el.innerHTML = rich(v);
    el.hidden = !v.trim();
  });
  document.querySelectorAll<HTMLElement>('[data-ct]').forEach((el) => {
    const k = el.dataset.ct!, v = t[k];
    if (v == null && t[k + '#d'] == null) return;
    el.innerHTML = tituloHtml(v ?? CAMPOS[k]?.def ?? '', t[k + '#d'] ?? CAMPOS[k]?.dest ?? '');
  });
  document.querySelectorAll<HTMLElement>('[data-cb]').forEach((el) => { el.hidden = !!s.ocultos?.[el.dataset.cb!]; });

  const ruta = location.pathname.replace(/\.html$/, '').replace(/\/index$/, '/').replace(/(.)\/$/, '$1') || '/';
  const pagina = PAGINAS.find((p) => p.ruta === ruta);
  const seo = pagina && s.seo?.[pagina.id];
  if (seo?.title) { document.title = seo.title; document.querySelector('meta[property="og:title"]')?.setAttribute('content', seo.title); }
  if (seo?.desc) { document.querySelector('meta[name="description"]')?.setAttribute('content', seo.desc); document.querySelector('meta[property="og:description"]')?.setAttribute('content', seo.desc); }

  const bar = document.querySelector<HTMLElement>('[data-anuncio]');
  const a = s.anuncio;
  if (bar && a?.activo && a.texto.trim()) {
    const enlace = bar.querySelector('a')!;
    enlace.textContent = a.texto;
    if (a.enlace) enlace.setAttribute('href', a.enlace); else enlace.removeAttribute('href');
    bar.hidden = false;
  }
}

if (SB && KEY) {
  try { const c = JSON.parse(sessionStorage.getItem(CACHE) ?? 'null'); if (c?.valor) aplicar(c.valor); } catch { /* sin caché */ }
  fetch(`${SB}/rest/v1/ajustes?clave=eq.sitio&select=valor`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } })
    .then((r) => (r.ok ? r.json() : []))
    .then((filas: { valor: Sitio }[]) => {
      const v = filas[0]?.valor;
      if (!v) return;
      aplicar(v);
      try { sessionStorage.setItem(CACHE, JSON.stringify({ valor: v })); } catch { /* lleno o bloqueado */ }
    })
    .catch(() => {});
}
