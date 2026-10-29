// Textos e imágenes: lo que se cambió de la página (ajustes, clave "sitio", pública).
import { sb, DEMO, store } from './lib';
import { SITIO_VACIO, type Sitio } from '../data/contenido';

const K = 'alma-ej-sitio';
export async function leerSitio(): Promise<Sitio> {
  if (DEMO) return { ...SITIO_VACIO, ...(store.get<Sitio>(K) ?? {}) };
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'sitio').maybeSingle();
  return { ...SITIO_VACIO, ...((data?.valor as Partial<Sitio>) ?? {}) };
}
export async function guardarSitio(s: Sitio): Promise<void> {
  if (DEMO) { store.set(K, s); return; }
  const { data, error } = await sb!.from('ajustes').update({ valor: s }).eq('clave', 'sitio').select('clave');
  if (error || !data?.length) throw new Error('No se publicó. Solo la administradora puede cambiar la página.');
}
