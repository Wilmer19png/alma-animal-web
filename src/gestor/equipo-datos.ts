// Equipo que se ve en la página (tabla personas). El acceso al gestor va aparte (Usuarios y roles).
import { sb, DEMO, store } from './lib';
import { comprimir } from './productos-datos';

export interface Persona {
  id: string; nombre: string; cargo: string; tarjeta: string | null; instagram: string | null; desde: number | null;
  bio: string; foto: string | null; web: boolean; orden: number;
  area: Area; temas: string[]; universidad: string | null; frase: string | null; historia: string | null;
  foto_cuerpo: string | null; video: string | null; galeria: { url: string; texto: string }[];
  videos_ig?: string[]; // enlaces de reels de Instagram (paso 21 en Supabase)
}
export type Area = 'consultorio' | 'spa' | 'tienda';
export const AREAS: [Area, string][] = [['consultorio', 'Consultorio'], ['spa', 'Spa'], ['tienda', 'Tienda']];
const EXTRA = { area: 'consultorio' as Area, temas: [] as string[], universidad: null, frase: null, historia: null, foto_cuerpo: null, video: null, galeria: [] };
export const nuevaPersona = (orden: number): Persona => ({ id: '', nombre: '', cargo: '', tarjeta: null, instagram: null, desde: null, bio: '', foto: null, web: false, orden, ...EXTRA });

const K = 'alma-ej-personas';
const semilla = (): Persona[] => [
  { id: 'ej-p1', nombre: 'Dra. Mariana Hoyos Giraldo', cargo: 'Médica Veterinaria y Zootecnista', tarjeta: 'TP 51206', instagram: '@vet_marianahoyos', desde: null, bio: '', foto: null, web: true, orden: 0, ...EXTRA, temas: ['Medicina preventiva', 'Cirugía', 'A domicilio'] },
  { id: 'ej-p2', nombre: 'Albert', cargo: 'Peluquero canino', tarjeta: null, instagram: null, desde: null, bio: '', foto: null, web: true, orden: 1, ...EXTRA, area: 'spa', temas: ['Corte según la raza', 'Mascotas nerviosas', 'Baño medicado'] }
];
const ej = () => store.get<Persona[]>(K) ?? (store.set(K, semilla()), store.get<Persona[]>(K)!);

export async function listarPersonas(): Promise<Persona[]> {
  if (DEMO) return [...ej()].map((p) => ({ ...EXTRA, ...p })).sort((a, b) => a.orden - b.orden);
  const { data, error } = await sb!.from('personas').select('*').order('orden');
  if (error) throw new Error('No pudimos cargar el equipo. Revisa tu conexión.');
  return data as Persona[];
}
export async function guardarPersona(p: Persona): Promise<Persona> {
  const { id, videos_ig, ...resto } = p;
  // los videos de Instagram solo se mandan si se tocaron (así se puede guardar aunque falte el paso 21)
  const campos = videos_ig === undefined ? resto : { ...resto, videos_ig: videos_ig.map((x) => x.trim()).filter(Boolean).slice(0, 9) };
  if (DEMO) {
    const n = { ...p, id: id || 'ej-' + Date.now() };
    store.set(K, id ? ej().map((x) => (x.id === id ? n : x)) : [...ej(), n]);
    return n;
  }
  const q = id ? sb!.from('personas').update(campos).eq('id', id) : sb!.from('personas').insert(campos);
  const { data, error } = await q.select('*').single();
  if (error) throw new Error(/videos_ig/i.test(error.message) ? 'Falta un paso en la base de datos: corre supabase/21-videos-instagram.sql en Supabase y vuelve a intentarlo.' : /does not exist|42703|column/i.test(error.message) ? 'Falta un paso en la base de datos: corre supabase/19-equipo-perfil.sql en Supabase y vuelve a intentarlo.' : 'No se guardó. Solo la administradora puede cambiar el equipo.');
  return data as Persona;
}
export async function ordenar(ps: Persona[]): Promise<void> {
  if (DEMO) { store.set(K, ej().map((x) => ({ ...x, orden: ps.findIndex((p) => p.id === x.id) }))); return; }
  await Promise.all(ps.map((p, i) => sb!.from('personas').update({ orden: i }).eq('id', p.id)));
}
export async function borrarPersona(p: Persona): Promise<void> {
  if (DEMO) { store.set(K, ej().filter((x) => x.id !== p.id)); return; }
  const { error } = await sb!.from('personas').delete().eq('id', p.id);
  if (error) throw new Error('No se borró.');
}
export async function subirFotoPersona(file: File, max = 800): Promise<string> {
  const blob = await comprimir(file, max);
  if (DEMO) return URL.createObjectURL(blob);
  const ruta = `${Date.now()}.webp`;
  const { error } = await sb!.storage.from('equipo').upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error('No se pudo subir la foto. Revisa tu conexión.');
  return sb!.storage.from('equipo').getPublicUrl(ruta).data.publicUrl;
}

// video de presentación (hasta 50 MB, el máximo por archivo del plan gratis de Supabase)
export async function subirVideo(file: File): Promise<string> {
  if (file.size > 50 * 1024 * 1024) throw new Error('El video pesa más de 50 MB. Grábalo más corto o en 720p.');
  if (DEMO) return URL.createObjectURL(file);
  const ruta = `video-${Date.now()}.${(file.name.split('.').pop() || 'mp4').toLowerCase()}`;
  const { error } = await sb!.storage.from('equipo').upload(ruta, file, { contentType: file.type || 'video/mp4', cacheControl: '31536000' });
  if (error) throw new Error('No se pudo subir el video. Revisa tu conexión.');
  return sb!.storage.from('equipo').getPublicUrl(ruta).data.publicUrl;
}
