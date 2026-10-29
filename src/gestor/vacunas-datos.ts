// Recordatorios de vacunas y desparasitaciones: esquemas (cada cuántos días se repite cada una)
// y registro de cada aviso enviado al propietario.
import { sb, DEMO, store } from './lib';

export type Esquemas = Record<string, number>; // nombre de la vacuna → días hasta la próxima dosis
export interface Aviso { registro_id: string; canal: 'whatsapp' | 'correo'; creado: string; por_nombre: string | null }

export const ESQUEMAS_BASE: Esquemas = {
  'Polivalente (parvovirus, moquillo y otras)': 365, 'Antirrábica': 365, 'Tos de las perreras': 365, 'Leptospirosis': 365,
  'Triple felina': 365, 'Leucemia felina': 365, 'Desparasitación interna': 90, 'Desparasitación externa (pulgas y garrapatas)': 30
};
const K = { esq: 'alma-ej-esquemas', av: 'alma-ej-avisos' };

export async function leerEsquemas(): Promise<Esquemas> {
  if (DEMO) return store.get<Esquemas>(K.esq) ?? ESQUEMAS_BASE;
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'esquemas').maybeSingle();
  return (data?.valor as Esquemas) ?? ESQUEMAS_BASE;
}
export async function guardarEsquemas(e: Esquemas): Promise<void> {
  if (DEMO) { store.set(K.esq, e); return; }
  const { error } = await sb!.from('ajustes').update({ valor: e }).eq('clave', 'esquemas');
  if (error) throw new Error('Solo la administradora puede cambiar los esquemas.');
}
// último aviso de cada registro
export async function ultimosAvisos(ids: string[]): Promise<Record<string, Aviso>> {
  if (!ids.length) return {};
  const lista = DEMO
    ? (store.get<Aviso[]>(K.av) ?? []).filter((a) => ids.includes(a.registro_id))
    : ((await sb!.from('recordatorios').select('registro_id,canal,creado,por_nombre').in('registro_id', ids).order('creado', { ascending: false })).data ?? []) as Aviso[];
  const out: Record<string, Aviso> = {};
  for (const a of lista.sort((x, y) => y.creado.localeCompare(x.creado))) if (!out[a.registro_id]) out[a.registro_id] = a;
  return out;
}
export async function registrarAviso(registro_id: string, canal: Aviso['canal'], por_nombre: string): Promise<Aviso> {
  const a: Aviso = { registro_id, canal, por_nombre, creado: new Date().toISOString() };
  if (DEMO) { store.set(K.av, [...(store.get<Aviso[]>(K.av) ?? []), a]); return a; }
  await sb!.from('recordatorios').insert({ registro_id, canal, por_nombre });
  return a;
}
