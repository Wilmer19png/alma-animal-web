// Blog: artículos de la doctora (tabla articulos). La página del blog se vuelve a publicar sola
// unos minutos después de publicar o corregir un artículo (ver supabase/12-blog.sql).
import { sb, DEMO, store } from './lib';
import { comprimir } from './productos-datos';
import { EJEMPLOS, BLOG_CATS, anchor, type Block, type BlogCat } from '../data/blog-base';

export type { Block, BlogCat };
export { BLOG_CATS };
export interface Articulo {
  id: string; slug: string; titulo: string; categoria: BlogCat; resumen: string; cuerpo: Block[]; portada: string | null;
  ilustracion: number; min: number; estado: 'borrador' | 'publicado'; publicado: string | null; por_nombre: string | null; actualizado: string;
}
export type Estado = 'publicado' | 'programado' | 'borrador';
export const estadoDe = (a: Articulo): Estado => (a.estado === 'borrador' ? 'borrador' : new Date(a.publicado!) > new Date() ? 'programado' : 'publicado');
export const slugDe = (s: string) => anchor(s).slice(0, 90).replace(/-$/, '') || 'articulo';
// palabras del cuerpo → minutos de lectura (unas 200 palabras por minuto)
export const palabras = (a: Pick<Articulo, 'titulo' | 'resumen' | 'cuerpo'>) => {
  const t = [a.titulo, a.resumen, ...a.cuerpo.flatMap((b) => ('text' in b ? [b.text] : 'items' in b ? (b.items as unknown[]).map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) : []))].join(' ');
  return t.split(/\s+/).filter(Boolean).length;
};
export const nuevo = (): Articulo => ({
  id: '', slug: '', titulo: '', categoria: 'Cuidado', resumen: '', cuerpo: [{ t: 'p', text: '' }], portada: null, ilustracion: 0, min: 3,
  estado: 'borrador', publicado: null, por_nombre: null, actualizado: new Date().toISOString()
});

const K = 'alma-ej-articulos';
const semilla = (): Articulo[] => [...EJEMPLOS].sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => ({
  id: 'ej-a' + i, slug: p.slug, titulo: p.title, categoria: p.cat, resumen: p.excerpt, cuerpo: p.body, portada: null, ilustracion: i % 4, min: p.min,
  estado: 'publicado', publicado: p.date + 'T13:00:00.000Z', por_nombre: 'Dra. Mariana Hoyos', actualizado: p.date + 'T13:00:00.000Z'
}));
const ej = () => store.get<Articulo[]>(K) ?? (store.set(K, semilla()), store.get<Articulo[]>(K)!);

export async function listarArticulos(): Promise<Articulo[]> {
  if (DEMO) return ej();
  const { data, error } = await sb!.from('articulos').select('*').order('actualizado', { ascending: false });
  if (error) throw new Error('No pudimos cargar el blog. Revisa tu conexión.');
  return data as Articulo[];
}
export async function guardarArticulo(a: Articulo): Promise<Articulo> {
  const { id, actualizado, ...campos } = a; // eslint-disable-line @typescript-eslint/no-unused-vars
  if (DEMO) {
    const todos = ej();
    if (todos.some((x) => x.slug === a.slug && x.id !== a.id)) throw new Error('Ya hay un artículo con esa dirección. Cambia un poco el título.');
    const n = { ...a, id: a.id || 'ej-' + Date.now(), actualizado: new Date().toISOString() };
    store.set(K, a.id ? todos.map((x) => (x.id === a.id ? n : x)) : [n, ...todos]);
    return n;
  }
  const q = a.id ? sb!.from('articulos').update(campos).eq('id', a.id) : sb!.from('articulos').insert(campos);
  const { data, error } = await q.select('*').single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Ya hay un artículo con esa dirección. Cambia un poco el título.' : 'No se guardó el artículo. Inténtalo de nuevo.');
  return data as Articulo;
}
export async function borrarArticulo(a: Articulo): Promise<void> {
  if (DEMO) { store.set(K, ej().filter((x) => x.id !== a.id)); return; }
  const { error } = await sb!.from('articulos').delete().eq('id', a.id);
  if (error) throw new Error('No se borró el artículo.');
}
export async function subirPortada(file: File, slug: string): Promise<string> {
  const blob = await comprimir(file, 1600);
  if (DEMO) return URL.createObjectURL(blob);
  const ruta = `${slug || 'articulo'}/${Date.now()}.webp`;
  const { error } = await sb!.storage.from('blog').upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error('No se pudo subir la foto. Revisa tu conexión.');
  return sb!.storage.from('blog').getPublicUrl(ruta).data.publicUrl;
}
