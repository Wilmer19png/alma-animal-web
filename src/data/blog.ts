// Blog. La doctora publica desde el gestor (módulo Blog): al publicar el sitio se leen de Supabase los artículos
// publicados. Si todavía no hay ninguno, se muestran los de EJEMPLO (la página lo dice).
import { COVERS, EJEMPLOS, ordenar, type Post, type Block, type BlogCat } from './blog-base';
export * from './blog-base';

// artículos publicados en Supabase (solo los que ya llegaron a su fecha: lo filtra la base de datos)
interface Fila { slug: string; titulo: string; categoria: BlogCat; resumen: string; cuerpo: Block[]; portada: string | null; ilustracion: number; min: number; publicado: string }
async function publicados(): Promise<Post[] | null> {
  const SB = import.meta.env.PUBLIC_SUPABASE_URL, KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
  if (!SB || !KEY) return null;
  try {
    const r = await fetch(`${SB}/rest/v1/articulos?select=slug,titulo,categoria,resumen,cuerpo,portada,ilustracion,min,publicado&order=publicado.desc`, { headers: { apikey: KEY, Authorization: `Bearer ${KEY}` } });
    if (!r.ok) return null;
    const filas = (await r.json()) as Fila[];
    return filas.length ? filas.map((x) => ({
      slug: x.slug, cat: x.categoria, title: x.titulo, excerpt: x.resumen, min: x.min, date: new Date(new Date(x.publicado).getTime() - 5 * 3600000).toISOString().slice(0, 10), body: ordenar(x.cuerpo),
      cover: { ...COVERS[x.ilustracion % COVERS.length], ...(x.portada ? { foto: x.portada } : {}) }
    })) : null;
  } catch { return null; }
}
const REALES = await publicados();
export const BLOG_DEMO = !REALES;

// del más reciente al más antiguo; cada uno con su portada
export const POSTS: Post[] = REALES ?? EJEMPLOS.sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => ({ ...p, cover: COVERS[i % COVERS.length] }));
