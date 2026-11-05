// Servicios y tarifas del spa, como la hoja de precios del local: el precio sale del TIPO DE PELO y del PESO,
// y ya incluye el baño completo. Aparte: solo corte de uñas (sin baño) y los adicionales (medicado, nudos,
// difícil manejo, transporte). Se guardan en ajustes (clave "tarifas", pública: la página de Spa la lee).
import { sb, DEMO, store } from './lib';

// una fila de una tabla: «Hasta 15 kg · $70.000» (hasta = null → «Más de …» o una opción sin peso)
export interface Fila { hasta: number | null; nombre?: string; precio: number; abundante?: number | null }
export interface Tabla {
  id: string; nombre: string; razas: string;
  porPeso: boolean;      // las filas van por peso (si no, son opciones con nombre: gatos, uñas)
  abundante: boolean;    // tiene la columna «Pelo abundante (deslanado)»
  bano: boolean;         // incluye el baño (las uñas no)
  filas: Fila[];
  web: boolean;
}
// adicional: precio fijo, o uno si pesa hasta «kg» y otro si pesa más; «variable» = se escribe el valor en cada cita
export interface Adicional {
  id: string; nombre: string; desc: string; precio: number;
  kg: number | null; precioMas: number | null;
  variable: boolean; web: boolean;
}
export type Mostrar = 'desde' | 'tabla' | 'no';
export interface Tarifas {
  v: 2;
  tablas: Tabla[];
  adicionales: Adicional[];
  condiciones: string[]; // lo que no se recibe (se muestra en la página de Spa)
  mostrar: Mostrar;
  proximo: number; // semanas hasta el próximo baño sugerido
}

const F = (hasta: number | null, precio: number, abundante?: number): Fila => ({ hasta, precio, ...(abundante ? { abundante } : {}) });
const O = (nombre: string, precio: number): Fila => ({ hasta: null, nombre, precio });
// las tarifas de la hoja del local (noviembre de 2026)
export const TARIFAS_BASE: Tarifas = {
  v: 2,
  tablas: [
    { id: 'largo', nombre: 'Pelo largo o deslanado', razas: 'Husky, pastores, golden y similares', porPeso: true, abundante: true, bano: true, web: true,
      filas: [F(15, 70000, 80000), F(20, 75000, 85000), F(25, 80000, 90000), F(30, 85000, 100000), F(35, 90000, 110000), F(40, 100000, 120000), F(null, 110000, 130000)] },
    { id: 'corte', nombre: 'Con corte', razas: 'French poodle, schnauzer, cocker y similares', porPeso: true, abundante: false, bano: true, web: true,
      filas: [F(10, 50000), F(15, 55000), F(20, 58000), F(25, 62000), F(30, 65000), F(35, 68000)] },
    { id: 'corto', nombre: 'Pelo corto', razas: 'Pinscher, pitbull, bulldog, salchicha y similares', porPeso: true, abundante: false, bano: true, web: true,
      filas: [F(5, 40000), F(15, 45000), F(20, 48000), F(25, 53000), F(30, 58000), F(35, 63000), F(40, 65000), F(45, 68000), F(null, 75000)] },
    { id: 'gato', nombre: 'Gatos', razas: '', porPeso: false, abundante: false, bano: true, web: true,
      filas: [O('Pelo corto', 45000), O('Pelo largo', 55000), O('Pelo largo con corte', 70000)] },
    { id: 'unas', nombre: 'Solo corte de uñas', razas: 'Sin baño', porPeso: false, abundante: false, bano: false, web: true,
      filas: [O('Uñas pequeñas', 10000), O('Uñas medianas', 12000), O('Uñas grandes', 15000)] }
  ],
  adicionales: [
    { id: 'medicado', nombre: 'Baño medicado', desc: 'Para piel sensible o con indicación de la doctora.', precio: 5000, kg: 10, precioMas: 8000, variable: false, web: true },
    { id: 'nudos', nombre: 'Muchos nudos', desc: 'De $10.000 a $20.000 según el estado del manto. Se avisa antes.', precio: 10000, kg: null, precioMas: null, variable: true, web: true },
    { id: 'manejo', nombre: 'Agresivo o de difícil manejo', desc: 'O no se recibe, según el caso.', precio: 15000, kg: null, precioMas: null, variable: false, web: true },
    { id: 'transporte', nombre: 'Transporte', desc: 'Recogemos y llevamos a la mascota. El valor depende de la dirección.', precio: 0, kg: null, precioMas: null, variable: true, web: true }
  ],
  condiciones: [
    'No se reciben perritos en tratamiento o enfermos (salvo dermatológicos o con recomendación del médico).',
    'No se reciben cachorros sin vacunas completas (carné a la mano).',
    'No se reciben hembras en celo.',
    'Solo se reciben los animalitos a personas mayores de edad.'
  ],
  mostrar: 'no',
  proximo: 4
};

/* ---------- cálculos ---------- */
const plata = (n: number) => '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
// «Hasta 15 kg», «De 15 a 20 kg», «Más de 40 kg» (o el nombre de la opción)
export function filaTxt(t: Tabla, i: number): string {
  const f = t.filas[i];
  if (!t.porPeso) return f.nombre || `Opción ${i + 1}`;
  const prev = i > 0 ? t.filas[i - 1].hasta : null;
  if (f.hasta == null) return prev != null ? `Más de ${prev} kg` : 'Cualquier peso';
  return prev == null ? `Hasta ${f.hasta} kg` : `De ${prev} a ${f.hasta} kg`;
}
// la fila que le toca según el peso (si pesa más que la última, la última)
export function filaDe(t: Tabla, peso: number | null | undefined): number {
  if (!t.porPeso || !t.filas.length) return 0;
  if (peso == null || !(peso > 0)) return 0;
  const i = t.filas.findIndex((f) => f.hasta == null || peso <= f.hasta);
  return i < 0 ? t.filas.length - 1 : i;
}
// si pesa más de lo que cubre la tabla (ej: con corte, más de 35 kg)
export const fueraDeTabla = (t: Tabla, peso: number | null | undefined) =>
  t.porPeso && peso != null && t.filas.length > 0 && t.filas[t.filas.length - 1].hasta != null && peso > t.filas[t.filas.length - 1].hasta!;

// adivina el tipo de pelo por la especie y la raza (en el gestor se confirma)
const RAZAS: [string, RegExp][] = [
  ['corte', /poodle|poodel|french|schnau|cocker|shih|shitz|yorki|york|malt[eé]s|bich[oó]n|lhasa|westie|terrier|caniche|maltipoo|schnoodle/i],
  ['largo', /husky|pastor|golden|labrador|lobo|chow|akita|samoyedo|pomerania|collie|malamute|san bernardo|bernes|border/i],
  ['corto', /pinscher|pin?cher|pit ?bull|bull|salchich|dachs|beagle|boxer|chihuahua|pug|carlino|doberman|rottw|dalmat|criollo|mestizo|french bull|bulldog|terrier americano|american/i]
];
export function tablaDe(especie: string | undefined, raza: string | undefined, t: Tarifas, servicio?: string): string {
  const ids = t.tablas.map((x) => x.id);
  if (/u[ñn]as/i.test(servicio ?? '') && !/ba[ñn]o/i.test(servicio ?? '') && ids.includes('unas')) return 'unas';
  if (/gat|felin/i.test(especie ?? '') && ids.includes('gato')) return 'gato';
  const r = raza ?? '';
  // «french bulldog» va antes que «french» (poodle)
  if (/bull/i.test(r) && ids.includes('corto')) return 'corto';
  for (const [id, re] of RAZAS) if (re.test(r) && ids.includes(id)) return id;
  return ids.includes('corte') ? 'corte' : t.tablas[0]?.id ?? '';
}
// precio de un adicional según el peso (el variable usa el valor escrito en la cita)
export const precioAdicional = (a: Adicional, peso: number | null | undefined, escrito?: number) =>
  a.variable ? (escrito ?? a.precio) : a.kg != null && a.precioMas != null && (peso ?? 0) > a.kg ? a.precioMas : a.precio;
// texto corto del precio de un adicional («+$5.000 hasta 10 kg · +$8.000 más de 10 kg»)
export function adicionalTxt(a: Adicional): string {
  if (a.variable) return a.precio ? `+ desde ${plata(a.precio)}` : 'Según el caso';
  if (a.kg != null && a.precioMas != null) return `+${plata(a.precio)} hasta ${a.kg} kg · +${plata(a.precioMas)} más de ${a.kg} kg`;
  return `+${plata(a.precio)}`;
}
// el precio más bajo de una tabla (para «desde»)
export const desde = (t: Tabla) => Math.min(...t.filas.map((f) => f.precio).filter((n) => n > 0));

/* ---------- leer y guardar ---------- */
// las tarifas viejas (por talla pequeño/mediano/grande) se cambian por las de la hoja; se conservan «mostrar» y «próximo»
function normalizar(v: Partial<Tarifas> | null | undefined): Tarifas {
  if (!v) return TARIFAS_BASE;
  if (v.v !== 2 || !Array.isArray(v.tablas)) return { ...TARIFAS_BASE, mostrar: v.mostrar ?? TARIFAS_BASE.mostrar, proximo: Number(v.proximo) || TARIFAS_BASE.proximo };
  return { ...TARIFAS_BASE, ...v } as Tarifas;
}
const K = 'alma-ej-tarifas';
export async function leerTarifas(): Promise<Tarifas> {
  if (DEMO) return normalizar(store.get<Tarifas>(K));
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'tarifas').maybeSingle();
  return normalizar(data?.valor as Tarifas | undefined);
}
export async function guardarTarifas(t: Tarifas): Promise<void> {
  if (DEMO) { store.set(K, t); return; }
  const { data, error } = await sb!.from('ajustes').update({ valor: t }).eq('clave', 'tarifas').select('clave');
  if (error || !data?.length) throw new Error('No se guardó. Solo la administradora puede cambiar las tarifas.');
}
