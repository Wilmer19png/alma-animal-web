// Servicios y tarifas del spa: tallas según el peso, precios por talla y cómo se muestran en la página.
// Se guardan en ajustes (clave "tarifas", pública: la página de Spa la lee para mostrar los precios).
import { sb, DEMO, store } from './lib';

export type TallaId = 'pequeno' | 'mediano' | 'grande' | 'gigante' | 'gato';
export const TALLAS: { id: TallaId; txt: string; icon: string }[] = [
  { id: 'pequeno', txt: 'Pequeño', icon: 'pets' }, { id: 'mediano', txt: 'Mediano', icon: 'pets' }, { id: 'grande', txt: 'Grande', icon: 'pets' },
  { id: 'gigante', txt: 'Gigante', icon: 'pets' }, { id: 'gato', txt: 'Gato', icon: 'cruelty_free' }
];
export interface ServicioSpa {
  id: string; nombre: string; tipo: 'servicio' | 'adicional'; desc: string;
  precios: Record<TallaId, number | null>; // null = no aplica para esa talla
  web: boolean; // se muestra en la página de Spa
}
export type Mostrar = 'desde' | 'tabla' | 'no';
export interface Tarifas {
  limites: [number, number, number]; // kg máximos de pequeño, mediano y grande (más de eso, gigante)
  servicios: ServicioSpa[];
  mostrar: Mostrar;
  proximo: number; // semanas hasta el próximo baño sugerido
}

const P = (a: number, b: number, c: number, d: number, g: number): Record<TallaId, number> => ({ pequeno: a, mediano: b, grande: c, gigante: d, gato: g });
// tarifas de ejemplo: la doctora las cambia por las reales antes de mostrarlas en la web
export const TARIFAS_BASE: Tarifas = {
  limites: [10, 25, 40],
  servicios: [
    { id: 'bano', nombre: 'Baño completo', tipo: 'servicio', desc: 'Los 8 cuidados, secado y cierre con perfume, accesorio y snack.', precios: P(40000, 50000, 65000, 80000, 45000), web: true },
    { id: 'corte', nombre: 'Corte según la raza', tipo: 'adicional', desc: 'Se suma al baño completo.', precios: P(15000, 20000, 25000, 30000, 15000), web: true },
    { id: 'medicado', nombre: 'Baño medicado', tipo: 'adicional', desc: 'Para piel sensible o con indicación de la doctora.', precios: P(5000, 8000, 8000, 10000, 5000), web: true },
    { id: 'desenredo', nombre: 'Desenredado', tipo: 'adicional', desc: 'Si llega con nudos. Se avisa al dueño antes de cobrarlo.', precios: P(10000, 15000, 20000, 25000, 10000), web: false },
    { id: 'unas', nombre: 'Solo corte de uñas', tipo: 'servicio', desc: 'Sin baño, mientras esperas.', precios: P(10000, 10000, 12000, 15000, 10000), web: true }
  ],
  mostrar: 'no',
  proximo: 4
};

export function tallaDe(especie: string | undefined, peso: number | null | undefined, t: Tarifas): TallaId {
  if (/gat|felin/i.test(especie ?? '')) return 'gato';
  const kg = peso ?? 0;
  return kg <= t.limites[0] ? 'pequeno' : kg <= t.limites[1] ? 'mediano' : kg <= t.limites[2] ? 'grande' : 'gigante';
}
export const tallaTxt = (id: TallaId) => TALLAS.find((x) => x.id === id)!.txt;
// el precio más bajo de un servicio (para «desde»)
export const desde = (s: ServicioSpa) => Math.min(...Object.values(s.precios).filter((n): n is number => n != null));

const K = 'alma-ej-tarifas';
export async function leerTarifas(): Promise<Tarifas> {
  if (DEMO) return store.get<Tarifas>(K) ?? TARIFAS_BASE;
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'tarifas').maybeSingle();
  return { ...TARIFAS_BASE, ...((data?.valor as Partial<Tarifas>) ?? {}) };
}
export async function guardarTarifas(t: Tarifas): Promise<void> {
  if (DEMO) { store.set(K, t); return; }
  const { data, error } = await sb!.from('ajustes').update({ valor: t }).eq('clave', 'tarifas').select('clave');
  if (error || !data?.length) throw new Error('No se guardó. Solo la administradora puede cambiar las tarifas.');
}
