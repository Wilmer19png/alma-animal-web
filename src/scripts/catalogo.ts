// Catálogo de la tienda, leído en el navegador desde Supabase (lo que se cambia en el gestor se ve al instante,
// sin volver a publicar la página). Sin Supabase configurado usa los productos de ejemplo de data/shop.ts.
import { PRODUCTS, TAGS, CATEGORIES, money } from '../data/shop';
import { supabaseReady } from './supabase';

export interface Variante { id: string; nombre: string; precio: number; stock: number; antes: number | null } // antes: precio anterior (promoción)
export interface Producto {
  id: string; slug: string; nombre: string; categoria: string; para: string[]; tamanos: string[];
  marca: string | null; descripcion: string; tipo: string | null; etiquetas: string[]; icono: string; tono: string;
  caracteristicas: [string, string][]; fotos: string[]; precioAntes: number | null; orden: number; creado: string;
  variantes: Variante[];
}

export const TONOS: Record<string, string> = {
  lav: 'linear-gradient(160deg,#EADDFF,#D1C1DD)',
  peach: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)',
  rose: 'linear-gradient(160deg,#FBCFAF,#E8C6CF)',
  mix: 'linear-gradient(160deg,#E8C6CF,#D1C1DD)'
};
const TONO_DE: Record<string, string> = Object.fromEntries(Object.entries(TONOS).map(([k, v]) => [v, k]));

const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
const CAMPOS = 'id,slug,nombre,categoria,para,tamanos,marca,descripcion,tipo_variante,etiquetas,icono,tono,caracteristicas,fotos,precio_antes,orden,creado,variantes(id,nombre,precio,precio_antes,stock,orden,activo)';

type Fila = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const deFila = (r: Fila): Producto => ({
  id: r.id, slug: r.slug, nombre: r.nombre, categoria: r.categoria, para: r.para ?? [], tamanos: r.tamanos ?? [],
  marca: r.marca, descripcion: r.descripcion ?? '', tipo: r.tipo_variante, etiquetas: r.etiquetas ?? [], icono: r.icono, tono: r.tono,
  caracteristicas: r.caracteristicas ?? [], fotos: r.fotos ?? [], precioAntes: r.precio_antes, orden: r.orden ?? 0, creado: r.creado,
  variantes: ((r.variantes ?? []) as Fila[]).filter((v) => v.activo !== false).sort((a, b) => a.orden - b.orden)
    .map((v) => ({ id: v.id, nombre: v.nombre, precio: v.precio, stock: v.stock, antes: v.precio_antes ?? (r.variantes.length === 1 ? r.precio_antes : null) ?? null }))
});

// productos de ejemplo (sin Supabase)
const ejemplo = (): Producto[] => PRODUCTS.map((p, i) => ({
  id: p.id, slug: p.id, nombre: p.name, categoria: p.cat, para: p.for, tamanos: p.sizes, marca: null, descripcion: p.text,
  tipo: p.variants.length > 1 ? p.variantKind ?? 'Presentación' : null, etiquetas: p.tag ? [p.tag] : [], icono: p.icon,
  tono: TONO_DE[p.tone] ?? 'lav', caracteristicas: p.specs ?? [], fotos: [], precioAntes: p.variants.find((v) => v.was)?.was ?? null,
  orden: i, creado: p.added, variantes: p.variants.map((v) => ({ id: `${p.id}:${v.id}`, nombre: v.label, precio: v.price, stock: v.stock, antes: v.was ?? null }))
}));

let cache: Promise<Producto[]> | null = null;
export function catalogo(): Promise<Producto[]> {
  if (!supabaseReady) return Promise.resolve(ejemplo());
  cache ??= fetch(`${URL}/rest/v1/productos?select=${CAMPOS}&order=orden.asc,creado.desc`, { headers: { apikey: KEY!, Authorization: `Bearer ${KEY}` } })
    .then((r) => { if (!r.ok) throw new Error('catalogo'); return r.json(); })
    .then((rows: Fila[]) => rows.map(deFila).filter((p) => p.variantes.length > 0));
  return cache;
}
export const productoPorSlug = async (slug: string) => (await catalogo()).find((p) => p.slug === slug) ?? null;

/* ---------- utilidades ---------- */
export const stockDe = (p: Producto) => p.variantes.reduce((s, v) => s + Math.max(0, v.stock), 0);
export const precioMin = (p: Producto) => Math.min(...p.variantes.map((v) => v.precio));
export const categoria = (id: string) => CATEGORIES.find((c) => c.id === id)?.label ?? id;
export const paraTxt = (p: Producto) => (p.para.length > 1 ? 'Perros y gatos' : p.para[0] === 'gato' ? 'Gatos' : 'Perros');
// % de descuento de una variante en promoción (0 si no está en promoción)
export const descuento = (v: Variante) => (v.antes && v.antes > v.precio ? Math.round(((v.antes - v.precio) / v.antes) * 100) : 0);
export const maxDescuento = (p: Producto) => Math.max(0, ...p.variantes.map(descuento));
// Oferta sale sola si alguna variante está en promoción
export const etiquetas = (p: Producto) => [...new Set([...p.etiquetas, ...(maxDescuento(p) ? ['oferta'] : [])])].filter((t) => t in TAGS) as (keyof typeof TAGS)[];
export const resumenVariantes = (p: Producto) => {
  const n = p.variantes.length;
  if (n < 2) return '';
  if (n > 3) return `${n} ${p.tipo === 'Talla' ? 'tallas' : 'opciones'}`;
  return p.variantes.map((v) => v.nombre).join(', ');
};
export const esUnica = (nombre: string) => /^(único|única)$/i.test(nombre);
// lo que guarda el carrito (vid = variante: con eso se descuenta el inventario al confirmar)
export const itemCarrito = (p: Producto, v: Variante) => ({ id: p.slug, vid: v.id, name: p.nombre, variant: v.nombre, price: v.precio, icon: p.icono, tone: TONOS[p.tono] ?? TONOS.lav, max: Math.max(0, v.stock) });

const enArchivo = () => location.protocol === 'file:';
// productos con página propia (landing de anuncios): su tarjeta y su ficha llevan ahí
export const LANDINGS: Record<string, string> = { 'bano-sanitario-perros': '/bano-sanitario-perros' };
// dirección de la ficha (en la vista previa con doble clic es un archivo relativo)
export const productoUrl = (slug: string) => {
  if (LANDINGS[slug]) return enArchivo() ? '.' + LANDINGS[slug] + '.html' : LANDINGS[slug];
  if (!enArchivo()) return `/producto?p=${encodeURIComponent(slug)}`;
  const up = /\/(blog|gestor)\/[^/]*$/.test(location.pathname.replace(/\\/g, '/')) ? '../' : './';
  return `${up}producto.html?p=${encodeURIComponent(slug)}`;
};

export const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const portada = (p: Producto, clase = '') => (p.fotos[0]
  ? `<img class="${clase}" src="${esc(p.fotos[0])}" alt="" loading="lazy" decoding="async" />`
  : `<span class="ms">${esc(p.icono)}</span>`);

// tarjeta de la tienda (Petshop y "Te puede interesar"). Con variantes lleva a la ficha; sin variantes agrega directo.
export function tarjeta(p: Producto, i = 0): string {
  const stock = stockDe(p);
  const v = p.variantes[0];
  const multi = p.variantes.length > 1;
  const desde = multi && new Set(p.variantes.map((x) => x.precio)).size > 1;
  const tags = etiquetas(p);
  const tag = tags[0] ? `<span class="tag ${TAGS[tags[0]].tone}">${TAGS[tags[0]].label}</span>` : '';
  const pill = stock === 0 ? '<span class="stock out">Agotado</span>' : stock <= 3 ? `<span class="stock low">Últimas ${stock}</span>` : '<span class="stock">En stock</span>';
  const url = productoUrl(p.slug);
  const det = resumenVariantes(p);
  // promoción: precio anterior tachado (de la variante más barata) y % de descuento
  const barata = p.variantes.reduce((a, x) => (x.precio < a.precio ? x : a), v);
  const off = maxDescuento(p), offTodas = p.variantes.every((x) => descuento(x) === off);
  const descTxt = off ? `<span class="off">${offTodas ? '' : 'Hasta '}-${off}%</span>` : '';
  const boton = stock === 0 ? '' : multi
    ? `<a class="add" href="${url}" aria-label="Agregar ${esc(p.nombre)}: elige ${esc((p.tipo ?? 'la opción').toLowerCase())}"><span class="ms" aria-hidden="true">add_shopping_cart</span></a>`
    : `<button class="add" type="button" aria-label="Agregar ${esc(p.nombre)} al carrito" data-add='${esc(JSON.stringify(itemCarrito(p, v)))}'><span class="ms" aria-hidden="true">add_shopping_cart</span></button>`;
  const q = `${p.nombre} ${categoria(p.categoria)} ${p.marca ?? ''} ${p.variantes.map((x) => x.nombre).join(' ')}`.toLowerCase();
  return `<article class="prod" data-prod data-i="${i}" data-cat="${p.categoria}" data-para="${p.para.join(' ')}" data-talla="${p.tamanos.join(' ')}" data-price="${precioMin(p)}" data-stock="${stock}" data-top="${p.etiquetas.includes('top') ? 1 : 0}" data-added="${esc(p.creado ?? '')}" data-q="${esc(q)}" data-tags="${etiquetas(p).join(' ')}">
  <a class="prod__img${p.fotos[0] ? ' has-foto' : ''}" href="${url}" tabindex="-1" aria-hidden="true" style="background:${TONOS[p.tono] ?? TONOS.lav}">${portada(p)}${pill}${tag}${descTxt}</a>
  <div class="prod__body">
    <span class="prod__cat">${categoria(p.categoria)}${det ? `<span> · ${esc(det)}</span>` : ''}</span>
    <h3><a href="${url}">${esc(p.nombre)}</a></h3>
    <div class="prod__buy">
      <span class="prod__price">${desde ? '<small>Desde</small>' : ''}<b>${money(precioMin(p))}</b>${descuento(barata) ? `<s>${money(barata.antes!)}</s>` : ''}</span>
      ${boton}
    </div>
  </div>
</article>`;
}
