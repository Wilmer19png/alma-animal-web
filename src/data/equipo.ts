// Equipo que se ve en la página (gestor → Equipo, tabla personas). Lo usan el Inicio (Nosotros),
// el Consultorio, «Conoce a la doctora» y /nosotros. Mientras carga (o sin conexión) se ve EQUIPO_BASE.

export type Area = 'consultorio' | 'spa' | 'tienda';
export interface PersonaWeb {
  nombre: string; cargo: string; tarjeta: string | null; instagram: string | null; desde: number | null; bio: string;
  foto: string | null; area: Area; temas: string[]; universidad: string | null; frase: string | null; historia: string | null;
  foto_cuerpo: string | null; video: string | null; galeria: { url: string; texto: string }[];
}
// fotos de respaldo, ya optimizadas al publicar (las pone cada página)
export interface FotosBase { consultorio: string; spa: string }

const vacia = { tarjeta: null, instagram: null, desde: null, bio: '', foto: null, universidad: null, frase: null, historia: null, foto_cuerpo: null, video: null, galeria: [] };
export const EQUIPO_BASE: PersonaWeb[] = [
  { ...vacia, nombre: 'Dra. Mariana Hoyos Giraldo', cargo: 'Médica Veterinaria y Zootecnista', tarjeta: 'TP 51206', instagram: '@vet_marianahoyos', area: 'consultorio', temas: ['Medicina preventiva', 'Cirugía', 'A domicilio'] },
  { ...vacia, nombre: 'Albert', cargo: 'Peluquero canino', area: 'spa', temas: ['Corte según la raza', 'Mascotas nerviosas', 'Baño medicado'] }
];

export async function cargarEquipo(): Promise<PersonaWeb[] | null> {
  const SB = import.meta.env.PUBLIC_SUPABASE_URL, KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!SB || !KEY) return null;
  try {
    const campos = 'nombre,cargo,tarjeta,instagram,desde,bio,foto,area,temas,universidad,frase,historia,foto_cuerpo,video,galeria';
    const r = await fetch(`${SB}/rest/v1/personas?select=${campos}&order=orden`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return null;
    const l = (await r.json()) as PersonaWeb[];
    return l.length ? l.map((p) => ({ ...vacia, ...p, temas: p.temas ?? [], galeria: p.galeria ?? [], area: p.area ?? 'consultorio' })) : null;
  } catch { return null; }
}
// la doctora: la primera persona del consultorio
export const laDoctora = (l: PersonaWeb[]) => l.find((p) => p.area === 'consultorio') ?? l[0];

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
// «Dra. Mariana Hoyos Giraldo» → «Dra. Mariana» + apellidos con el degradado de la marca
export function nombreHtml(n: string) {
  const w = n.trim().split(/\s+/), corte = /^(Dra?\.?)$/i.test(w[0]) ? 2 : 1;
  return w.length > corte + 1 ? `${esc(w.slice(0, corte).join(' '))} <span class="gt">${esc(w.slice(corte).join(' '))}</span>` : esc(n);
}
const AREA: Record<Area, { icon: string; txt: string; fondo: string }> = {
  consultorio: { icon: 'stethoscope', txt: 'Consultorio', fondo: 'linear-gradient(160deg,#FBCFAF,#E8C6CF 55%,#D1C1DD)' },
  spa: { icon: 'shower', txt: 'Spa', fondo: 'linear-gradient(160deg,#EADDFF,#D1C1DD)' },
  tienda: { icon: 'storefront', txt: 'Petshop', fondo: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)' }
};
// tarjeta de una persona (todas con el mismo diseño: foto, nombre, cargo, presentación, temas y botones)
export function tarjetaPersona(p: PersonaWeb, fotos: FotosBase, esLaDoctora: boolean) {
  const a = AREA[p.area] ?? AREA.consultorio;
  const recorte = !p.foto && p.area === 'consultorio'; // la foto de respaldo de la doctora es recortada (sin fondo)
  const src = p.foto ?? (p.area === 'spa' ? fotos.spa : fotos.consultorio);
  const nombre1 = p.nombre.replace(/^Dra?\.?\s+/i, '').split(/\s+/)[0];
  const ig = p.instagram?.replace(/^@/, '');
  const botones = p.area === 'spa'
    ? `<a class="btn btn--alma" href="/agendar-spa"><span class="ms" aria-hidden="true">shower</span>Agenda un baño con ${esc(nombre1)}</a>`
    : p.area === 'tienda'
      ? `<a class="btn btn--alma" href="/petshop"><span class="ms" aria-hidden="true">storefront</span>Ir al Petshop</a>`
      : (esLaDoctora ? `<a class="btn" href="/conoce-a-la-doctora"><span class="ms" aria-hidden="true">play_circle</span>Conoce a la doctora</a>` : '');
  return `<article class="tcard">
    <div class="tcard__foto${recorte ? ' tcard__foto--recorte' : ''}" style="background:${a.fondo}">
      <img src="${esc(src)}" alt="${esc(p.nombre)}" loading="lazy" decoding="async" />
      <span class="tcard__chip"><span class="ms" aria-hidden="true">${a.icon}</span>${a.txt}</span>
    </div>
    <div class="tcard__body">
      <h3>${nombreHtml(p.nombre)}</h3>
      <p class="tcard__cargo">${esc([p.cargo, p.tarjeta].filter(Boolean).join(' · '))}</p>
      ${p.bio ? `<p class="tcard__bio">${esc(p.bio)}</p>` : ''}
      ${p.temas.length ? `<ul class="tcard__temas">${p.temas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="tcard__acts">${botones}${ig ? `<a class="btn btn--outlined" href="https://instagram.com/${esc(ig)}" target="_blank" rel="noopener">@${esc(ig)}</a>` : ''}</div>
    </div>
  </article>`;
}
