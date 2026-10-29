// Equipo que se ve en la página (tabla personas). El acceso al gestor va aparte (Usuarios y roles).
import { sb, DEMO, store } from './lib';
import { comprimir } from './productos-datos';

export interface Persona {
  id: string; nombre: string; cargo: string; tarjeta: string | null; instagram: string | null; desde: number | null;
  bio: string; foto: string | null; web: boolean; orden: number;
}
export const nuevaPersona = (orden: number): Persona => ({ id: '', nombre: '', cargo: '', tarjeta: null, instagram: null, desde: null, bio: '', foto: null, web: false, orden });

const K = 'alma-ej-personas';
const semilla = (): Persona[] => [
  { id: 'ej-p1', nombre: 'Dra. Mariana Hoyos Giraldo', cargo: 'Médica Veterinaria y Zootecnista', tarjeta: 'TP 51206', instagram: '@vet_marianahoyos', desde: null, bio: '', foto: null, web: true, orden: 0 },
  { id: 'ej-p2', nombre: 'Albert', cargo: 'Peluquero canino', tarjeta: null, instagram: null, desde: null, bio: '', foto: null, web: false, orden: 1 }
];
const ej = () => store.get<Persona[]>(K) ?? (store.set(K, semilla()), store.get<Persona[]>(K)!);

export async function listarPersonas(): Promise<Persona[]> {
  if (DEMO) return [...ej()].sort((a, b) => a.orden - b.orden);
  const { data, error } = await sb!.from('personas').select('*').order('orden');
  if (error) throw new Error('No pudimos cargar el equipo. Revisa tu conexión.');
  return data as Persona[];
}
export async function guardarPersona(p: Persona): Promise<Persona> {
  const { id, ...campos } = p;
  if (DEMO) {
    const n = { ...p, id: id || 'ej-' + Date.now() };
    store.set(K, id ? ej().map((x) => (x.id === id ? n : x)) : [...ej(), n]);
    return n;
  }
  const q = id ? sb!.from('personas').update(campos).eq('id', id) : sb!.from('personas').insert(campos);
  const { data, error } = await q.select('*').single();
  if (error) throw new Error('No se guardó. Solo la administradora puede cambiar el equipo.');
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
export async function subirFotoPersona(file: File): Promise<string> {
  const blob = await comprimir(file, 800);
  if (DEMO) return URL.createObjectURL(blob);
  const ruta = `${Date.now()}.webp`;
  const { error } = await sb!.storage.from('equipo').upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error('No se pudo subir la foto. Revisa tu conexión.');
  return sb!.storage.from('equipo').getPublicUrl(ruta).data.publicUrl;
}
