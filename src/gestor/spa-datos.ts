// Citas de spa: las mismas citas de la agenda (carril "spa") con su avance dentro del spa.
// solicitada → confirmada → en el spa → lista para recoger → entregada (atendida).
// El avance, los adicionales, la ficha del baño y el pago se guardan en citas.datos.
import { DEMO, store } from './lib';
import { listarCitas, cambiarCita, iso, enFecha, sumarDias, type Cita } from './agenda-datos';

export type Fase = 'solicitada' | 'confirmada' | 'spa' | 'lista' | 'entregada';
export const FASES: { id: Fase; txt: string; bg: string; fg: string }[] = [
  { id: 'solicitada', txt: 'Solicitada', bg: '#FBCFAF', fg: '#623F21' },
  { id: 'confirmada', txt: 'Confirmada', bg: '#EADDFF', fg: '#4D3F6C' },
  { id: 'spa', txt: 'En el spa', bg: '#655785', fg: '#FFFFFF' },
  { id: 'lista', txt: 'Lista para recoger', bg: '#B8F1B9', fg: '#1D5128' },
  { id: 'entregada', txt: 'Entregada', bg: '#F2ECF2', fg: '#584E6E' }
];
export const fase = (c: Cita): Fase | null =>
  c.estado === 'solicitada' ? 'solicitada' : c.estado === 'atendida' ? 'entregada'
    : c.estado === 'confirmada' ? ((c.datos.fase as Fase) === 'spa' || c.datos.fase === 'lista' ? (c.datos.fase as Fase) : 'confirmada') : null;

// ficha del baño: lo que encontró el peluquero
export const FICHA: { k: string; q: string; opts: string[]; mal: number }[] = [
  { k: 'pelaje', q: 'Pelaje', opts: ['Bien', 'Con nudos', 'Muy enredado'], mal: 9 },
  { k: 'piel', q: 'Piel', opts: ['Sana', 'Irritada', 'Con heridas'], mal: 1 },
  { k: 'pulgas', q: 'Pulgas o garrapatas', opts: ['No', 'Sí'], mal: 1 },
  { k: 'oidos', q: 'Oídos', opts: ['Limpios', 'Con cera', 'Mal olor'], mal: 2 },
  { k: 'animo', q: 'Comportamiento', opts: ['Tranquilo', 'Nervioso', 'Agresivo'], mal: 9 }
];
export type Ficha = Record<string, number>;
export const fichaAlerta = (f: Ficha) => FICHA.some((x) => (f[x.k] ?? 0) >= x.mal);
export const fichaTexto = (f: Ficha) => FICHA.map((x) => `${x.q}: ${x.opts[f[x.k] ?? 0].toLowerCase()}`).join(' · ');
export const PAGOS = ['Efectivo', 'Transferencia (Nequi, Daviplata o banco)', 'Tarjeta'];

// lo que pidió en el formulario de la web ("Baño completo + corte + baño medicado") → adicionales
export const extrasDe = (c: Cita): string[] => {
  const d = c.datos as unknown as { extras?: string[]; servicio?: string };
  if (Array.isArray(d.extras)) return d.extras;
  const s = (d.servicio ?? '').toLowerCase();
  return [/corte/.test(s) && 'corte', /medicad/.test(s) && 'medicado', /desenred|nudo/.test(s) && 'desenredo'].filter(Boolean) as string[];
};

// citas del spa desde hace 30 días hasta dentro de 60 (activas + historial reciente)
export async function listarSpa(): Promise<Cita[]> {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  if (DEMO) sembrar(hoy);
  const todas = await listarCitas(sumarDias(hoy, -30), sumarDias(hoy, 60));
  return todas.filter((c) => c.carril === 'spa' && fase(c));
}
export const avanzar = (c: Cita, cambio: Omit<Partial<Cita>, 'datos'> & { datos?: Record<string, unknown> }) => {
  const { datos, ...resto } = cambio;
  return cambiarCita(c.id, { ...resto, ...(datos ? { datos: { ...c.datos, ...datos } as Record<string, string> } : {}) });
};

// en modo de ejemplo: un día de spa con citas en cada etapa (una sola vez por sesión)
function sembrar(hoy: Date) {
  if (store.get<boolean>('alma-ej-spa')) return;
  const K = 'alma-ej-citas';
  listarCitas(hoy, hoy); // crea la semilla de la agenda si no existe
  const hoyIso = iso(hoy);
  const base = (store.get<Cita[]>(K) ?? []).filter((c) => !(c.carril === 'spa' && c.estado !== 'solicitada' && iso(new Date(c.inicio)) === hoyIso));
  const C = (dia: number, min: number, extra: Partial<Cita>): Cita => ({
    id: `ej-spa-${dia}-${min}`, paciente_id: null, propietario_id: null, servicio: 'spa', carril: 'spa',
    inicio: enFecha(sumarDias(hoy, dia), min), fin: enFecha(sumarDias(hoy, dia), min + 120), estado: 'confirmada', origen: 'web',
    sobrecupo: false, nota: null, direccion: null, datos: {}, por_nombre: null, creado: new Date(Date.now() - 2 * 86400000).toISOString(), ...extra
  });
  const extra = [
    C(0, 480, { paciente_id: 'm6', origen: 'consultorio', datos: { fase: 'lista', extras: ['corte', 'desenredo'], notas: 'Corte de verano, bien cortico.', ficha: { pelaje: 1, piel: 0, pulgas: 0, oidos: 1, animo: 0 } } as never }),
    C(0, 600, { paciente_id: 'm5', datos: { fase: 'spa', notas: 'Suelta muchísimo pelo, por favor deslanar bien.' } as never }),
    C(0, 840, { paciente_id: 'm2', datos: { extras: ['corte'], notas: 'Primera vez en el spa.' } as never }),
    C(1, 900, { estado: 'solicitada', creado: new Date(Date.now() - 2 * 3600000).toISOString(),
      datos: { mascota: 'Simón', especie: 'gato', raza: 'Persa', peso: '4.5', edad: '6 años', servicio: 'Baño completo + baño medicado', nombre: 'Julián Ospina', celular: '3014442211', notas: 'Tiene caspa; la doctora le recetó baño medicado en la última consulta.' } }),
    C(-3, 600, { paciente_id: 'm3', estado: 'atendida', datos: { pago: 'Efectivo', total: '65000', ficha: { pelaje: 0, piel: 0, pulgas: 0, oidos: 0, animo: 0 } } as never })
  ];
  store.set(K, [...base.filter((c) => !extra.some((x) => x.id === c.id)), ...extra]);
  store.set('alma-ej-spa', true);
}
