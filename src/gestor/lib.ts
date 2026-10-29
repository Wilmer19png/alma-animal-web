// Utilidades del gestor: conexión con Supabase, enlaces entre páginas y formatos.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;

// Sin Supabase configurado, el gestor funciona con datos de ejemplo (para revisar el diseño).
export const sb: SupabaseClient | null = URL && KEY
  ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'alma-gestor-sesion' } })
  : null;
export const DEMO = !sb;

// Enlaces entre páginas: en el sitio son /gestor/pedidos; abriendo la vista previa con doble clic
// (file://) son archivos .html relativos.
const enArchivo = () => typeof location !== 'undefined' && location.protocol === 'file:';
const subir = () => (/\/gestor\/[^/]*$/.test(location.pathname.replace(/\\/g, '/')) ? '../' : './');
export const link = (path: string) => {
  if (!enArchivo()) return path;
  const [p, hash = ''] = path.replace(/^\//, '').split('#');
  return `${subir()}${p || 'index'}.html${hash ? '#' + hash : ''}`;
};
export const go = (path: string) => { location.href = link(path); };
// imágenes: en la vista previa la ruta /_astro/… se vuelve relativa
export const asset = (src: string) => (enArchivo() ? subir() + src.replace(/^\//, '') : src);

export const money = (n: number) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const hora = (d: Date) => {
  const h = d.getHours(), m = String(d.getMinutes()).padStart(2, '0');
  return `${h % 12 || 12}:${m} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
// "Hoy, 10:28 a. m." · "Ayer, 4:15 p. m." · "Lunes, 11:02 a. m." · "12 oct, 9:00 a. m."
export const when = (iso: string) => {
  const d = new Date(iso), now = new Date();
  const day = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(now) - day(d)) / 86400000);
  const lead = diff === 0 ? 'Hoy' : diff === 1 ? 'Ayer' : diff < 7 ? DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1) : `${d.getDate()} ${MESES[d.getMonth()]}`;
  return `${lead}, ${hora(d)}`;
};
// "23 oct 2026" (y "oct 26" para gráficas)
export const fechaCorta = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()]} ${d.getFullYear()}`; };
export const mesCorto = (iso: string) => { const d = new Date(iso); return `${MESES[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`; };
export const longDay =(d = new Date()) => `${DIAS[d.getDay()][0].toUpperCase() + DIAS[d.getDay()].slice(1)} ${d.getDate()} de ${['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'][d.getMonth()]}`;

// celular colombiano → número para wa.me (57 + 10 dígitos)
export const waNumber = (cel: string) => {
  const d = cel.replace(/\D/g, '');
  return d.length === 10 ? '57' + d : d;
};
export const waLink = (cel: string, text: string) => `https://wa.me/${waNumber(cel)}?text=${encodeURIComponent(text)}`;
// 3001234567 → 300 123 4567
export const prettyCel = (cel: string) => {
  const d = cel.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, '');
  return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : cel;
};

// almacenamiento del navegador que nunca rompe (modo privado, bloqueos)
export const store = {
  get<T>(k: string, area: Storage | undefined = globalThis.sessionStorage): T | null {
    try { const v = area?.getItem(k); return v ? (JSON.parse(v) as T) : null; } catch { return null; }
  },
  set(k: string, v: unknown, area: Storage | undefined = globalThis.sessionStorage) {
    try { area?.setItem(k, JSON.stringify(v)); } catch { /* sin almacenamiento */ }
  },
  del(k: string, area: Storage | undefined = globalThis.sessionStorage) {
    try { area?.removeItem(k); } catch { /* sin almacenamiento */ }
  }
};
