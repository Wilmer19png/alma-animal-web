// Agenda: horario, duraciones, cierres y festivos, citas y cálculo de horas libres.
// Las horas se manejan en minutos desde la medianoche (480 = 8:00 a. m.) en la hora de Colombia.
import { sb, DEMO, store } from './lib';

/* ---------- servicios ---------- */
export type Servicio = 'consulta' | 'vacuna' | 'domicilio' | 'radiografia' | 'cirugia' | 'spa';
export type Carril = 'dra' | 'spa';
export const SERVICIOS: Record<Servicio, { txt: string; icon: string; carril: Carril; bg: string; fg: string }> = {
  consulta: { txt: 'Consulta', icon: 'stethoscope', carril: 'dra', bg: '#EADDFF', fg: '#4D3F6C' },
  vacuna: { txt: 'Vacuna o desparasitación', icon: 'vaccines', carril: 'dra', bg: '#B8F1B9', fg: '#1D5128' },
  domicilio: { txt: 'Consulta a domicilio', icon: 'home_health', carril: 'dra', bg: '#D1C1DD', fg: '#372C42' },
  radiografia: { txt: 'Radiografía', icon: 'radiology', carril: 'dra', bg: '#DCE8FF', fg: '#1E3A6E' },
  cirugia: { txt: 'Cirugía', icon: 'medical_services', carril: 'dra', bg: '#FFDAD5', fg: '#910809' },
  spa: { txt: 'Baño en el spa', icon: 'shower', carril: 'spa', bg: '#FFDCC3', fg: '#623F21' }
};
export const CARRILES: Record<Carril, string> = { dra: 'Doctora', spa: 'Spa' };
export type Estado = 'solicitada' | 'confirmada' | 'atendida' | 'no_vino' | 'cancelada';
export const ESTADOS_CITA: Record<Estado, { txt: string; bg: string; fg: string }> = {
  solicitada: { txt: 'Por confirmar', bg: '#FFDDB2', fg: '#624000' },
  confirmada: { txt: 'Confirmada', bg: '#EADDFF', fg: '#4D3F6C' },
  atendida: { txt: 'Atendida', bg: '#B8F1B9', fg: '#1D5128' },
  no_vino: { txt: 'No vino', bg: '#F2ECF2', fg: '#584E6E' },
  cancelada: { txt: 'Cancelada', bg: '#FFDAD5', fg: '#910809' }
};

/* ---------- horario ---------- */
export interface Dia { abre: boolean; manana: [number, number]; tarde: [number, number] | null }
export interface Horario { dias: Dia[]; festivos: boolean } // dias[0] = lunes … dias[6] = domingo
export type Duraciones = Record<Servicio, number>;
export interface Cierre { id?: string; fecha: string; nombre: string }

export const HORARIO_BASE: Horario = {
  dias: [0, 1, 2, 3, 4].map(() => ({ abre: true, manana: [480, 750], tarde: [840, 1020] } as Dia))
    .concat([{ abre: true, manana: [480, 750], tarde: null }, { abre: false, manana: [480, 750], tarde: null }]),
  festivos: true
};
export const DURACIONES_BASE: Duraciones = { consulta: 30, vacuna: 30, domicilio: 60, radiografia: 30, cirugia: 120, spa: 120 };
export const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_C = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// 480 → "8:00 a. m."; corto → "8:00"
export const hhmm = (m: number, corto = false) => {
  const h = Math.floor(m / 60), mm = String(m % 60).padStart(2, '0'), h12 = h % 12 || 12;
  return corto ? `${h12}:${mm}` : `${h12}:${mm} ${h < 12 ? 'a. m.' : 'p. m.'}`;
};
export const diaSemana = (d: Date) => (d.getDay() + 6) % 7; // lunes = 0
export const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const sumarDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const lunesDe = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return sumarDias(x, -diaSemana(x)); };
export const minutosDe = (iso: string) => { const d = new Date(iso); return d.getHours() * 60 + d.getMinutes(); };
export const enFecha = (dia: Date, min: number) => new Date(dia.getFullYear(), dia.getMonth(), dia.getDate(), Math.floor(min / 60), min % 60).toISOString();

// texto para la página: "Lunes a viernes: 8:00 a. m. – 12:30 p. m. y 2:00 – 5:00 p. m."
export const textoHorario = (h: Horario) => {
  const tramo = (d: Dia) => `${hhmm(d.manana[0])} – ${hhmm(d.manana[1])}${d.tarde ? ` y ${hhmm(d.tarde[0], true)} – ${hhmm(d.tarde[1])}` : ''}`;
  const grupos: { desde: number; hasta: number; t: string }[] = [];
  h.dias.forEach((d, i) => {
    const t = d.abre ? tramo(d) : 'Cerrado';
    const g = grupos[grupos.length - 1];
    if (g && g.t === t && g.hasta === i - 1) g.hasta = i; else grupos.push({ desde: i, hasta: i, t });
  });
  return grupos.filter((g) => g.t !== 'Cerrado').map((g) => ({
    dias: g.desde === g.hasta ? DIAS[g.desde] + (g.desde === 5 ? 's' : '') : `${DIAS[g.desde]} a ${DIAS[g.hasta].toLowerCase()}`, t: g.t
  }));
};

/* ---------- festivos de Colombia (Ley Emiliani: varios se mueven al lunes) ---------- */
function pascua(y: number) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, mes - 1, dia);
}
const alLunes = (d: Date) => sumarDias(d, (7 - diaSemana(d)) % 7);
export function festivosColombia(y: number): Cierre[] {
  const F = (m: number, d: number) => new Date(y, m - 1, d);
  const p = pascua(y);
  const lista: [Date, string][] = [
    [F(1, 1), 'Año Nuevo'], [alLunes(F(1, 6)), 'Reyes Magos'], [alLunes(F(3, 19)), 'San José'],
    [sumarDias(p, -3), 'Jueves Santo'], [sumarDias(p, -2), 'Viernes Santo'], [F(5, 1), 'Día del Trabajo'],
    [sumarDias(p, 43), 'Ascensión del Señor'], [sumarDias(p, 64), 'Corpus Christi'], [sumarDias(p, 71), 'Sagrado Corazón'],
    [alLunes(F(6, 29)), 'San Pedro y San Pablo'], [F(7, 20), 'Día de la Independencia'], [F(8, 7), 'Batalla de Boyacá'],
    [alLunes(F(8, 15)), 'Asunción de la Virgen'], [alLunes(F(10, 12)), 'Día de la Raza'], [alLunes(F(11, 1)), 'Todos los Santos'],
    [alLunes(F(11, 11)), 'Independencia de Cartagena'], [F(12, 8), 'Inmaculada Concepción'], [F(12, 25), 'Navidad']
  ];
  return lista.map(([d, nombre]) => ({ fecha: iso(d), nombre })).sort((a, b) => a.fecha.localeCompare(b.fecha));
}
// ¿se atiende ese día? (devuelve el motivo si no)
export function cerradoPor(dia: Date, h: Horario, cierres: Cierre[]): string | null {
  if (!h.dias[diaSemana(dia)].abre) return 'Cerrado';
  const f = iso(dia);
  const c = cierres.find((x) => x.fecha === f);
  if (c) return c.nombre;
  if (h.festivos) { const fe = festivosColombia(dia.getFullYear()).find((x) => x.fecha === f); if (fe) return `Festivo · ${fe.nombre}`; }
  return null;
}

/* ---------- citas ---------- */
export interface Cita {
  id: string; paciente_id: string | null; propietario_id: string | null; servicio: Servicio; carril: Carril; inicio: string; fin: string;
  estado: Estado; origen: 'consultorio' | 'web' | 'portal'; sobrecupo: boolean; nota: string | null; direccion: string | null;
  datos: Record<string, string>; por_nombre: string | null; creado: string;
}
export type NuevaCita = Omit<Cita, 'id' | 'creado'>;
export const ocupa = (c: Cita) => c.estado === 'confirmada' || c.estado === 'atendida' || c.estado === 'solicitada';

// horas posibles de un día para un servicio, con el motivo si no se puede
export function horas(dia: Date, servicio: Servicio, citas: Cita[], h: Horario, dur: Duraciones, cierres: Cierre[], ignorarId?: string) {
  const d = h.dias[diaSemana(dia)];
  if (cerradoPor(dia, h, cierres)) return [];
  const largo = dur[servicio], carril = SERVICIOS[servicio].carril;
  const ahora = new Date();
  const tramos = [d.manana, ...(d.tarde ? [d.tarde] : [])];
  const delDia = citas.filter((c) => c.carril === carril && c.id !== ignorarId && (c.estado === 'confirmada' || c.estado === 'atendida') && iso(new Date(c.inicio)) === iso(dia));
  const out: { min: number; motivo: string; ocupado: boolean }[] = [];
  for (const [a, b] of tramos) {
    for (let m = a; m + 30 <= b; m += 30) {
      const fin = m + largo;
      let motivo = '';
      if (fin > b) motivo = 'No alcanza antes del descanso o del cierre';
      else if (new Date(enFecha(dia, m)) < ahora) motivo = 'Esta hora ya pasó';
      const ocupado = delDia.some((c) => m < minutosDe(c.fin) && fin > minutosDe(c.inicio));
      out.push({ min: m, motivo, ocupado });
    }
  }
  return out;
}

/* ---------- datos ---------- */
const K = { citas: 'alma-ej-citas', horario: 'alma-ej-horario', dur: 'alma-ej-duraciones', cierres: 'alma-ej-cierres' };
const semilla = (): Cita[] => {
  const lun = lunesDe(new Date());
  const C = (dia: number, min: number, servicio: Servicio, paciente_id: string | null, extra: Partial<Cita> = {}): Cita => ({
    id: 'ej-c' + dia + min + servicio, paciente_id, propietario_id: null, servicio, carril: SERVICIOS[servicio].carril,
    inicio: enFecha(sumarDias(lun, dia), min), fin: enFecha(sumarDias(lun, dia), min + DURACIONES_BASE[servicio]),
    estado: 'confirmada', origen: 'consultorio', sobrecupo: false, nota: null, direccion: null, datos: {}, por_nombre: 'Dra. Mariana Hoyos', creado: new Date().toISOString(), ...extra
  });
  const hoy = diaSemana(new Date());
  return [
    C(0, 540, 'consulta', 'm3'), C(0, 480, 'spa', 'm6'), C(0, 900, 'vacuna', 'm5'),
    C(1, 510, 'consulta', 'm1'), C(1, 600, 'vacuna', 'm3'), C(1, 840, 'spa', 'm5'),
    C(2, 540, 'cirugia', 'm6', { nota: 'Ayuno desde la noche anterior' }), C(2, 600, 'spa', 'm1'),
    C(3, 480, 'vacuna', 'm4'), C(3, 870, 'consulta', 'm2'),
    C(4, 600, 'domicilio', 'm5', { direccion: 'La Pradera, Dosquebradas' }), C(4, 840, 'spa', 'm3'),
    C(5, 480, 'spa', 'm2'), C(5, 600, 'consulta', 'm4', { origen: 'portal' }),
    C(Math.min(hoy, 5), 660, 'spa', null, { estado: 'solicitada', origen: 'web', por_nombre: null, datos: { mascota: 'Bruno', especie: 'perro', raza: 'French Poodle', peso: '7', servicio: 'Baño completo + corte', nombre: 'Camila Torres', celular: '300 555 9911' } })
  ];
};
const ej = <T>(k: string, s: () => T): T => { const v = store.get<T>(k); if (v) return v; const x = s(); store.set(k, x); return x; };

async function ajuste<T>(clave: string, base: T): Promise<T> {
  if (DEMO) return ej(clave === 'horario' ? K.horario : K.dur, () => base);
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', clave).maybeSingle();
  return (data?.valor as T) ?? base;
}
export const leerHorario = () => ajuste<Horario>('horario', HORARIO_BASE);
export const leerDuraciones = () => ajuste<Duraciones>('duraciones', DURACIONES_BASE);
export async function guardarAjustes(h: Horario, d: Duraciones): Promise<void> {
  if (DEMO) { store.set(K.horario, h); store.set(K.dur, d); return; }
  const r1 = await sb!.from('ajustes').update({ valor: h }).eq('clave', 'horario');
  const r2 = await sb!.from('ajustes').update({ valor: d }).eq('clave', 'duraciones');
  if (r1.error || r2.error) throw new Error('No se guardó. Solo la administradora puede cambiar el horario.');
}
export async function listarCierres(): Promise<Cierre[]> {
  if (DEMO) return ej<Cierre[]>(K.cierres, () => []);
  const { data } = await sb!.from('cierres').select('*').order('fecha');
  return (data ?? []) as Cierre[];
}
export async function agregarCierre(c: Cierre): Promise<Cierre> {
  if (DEMO) { const n = { ...c, id: 'ej-' + Date.now() }; store.set(K.cierres, [...ej<Cierre[]>(K.cierres, () => []), n]); return n; }
  const { data, error } = await sb!.from('cierres').insert(c).select('*').single();
  if (error) throw new Error(/duplicate|unique/i.test(error.message) ? 'Ese día ya está como cierre.' : 'No se guardó el cierre.');
  return data as Cierre;
}
export async function quitarCierre(id: string): Promise<void> {
  if (DEMO) { store.set(K.cierres, ej<Cierre[]>(K.cierres, () => []).filter((c) => c.id !== id)); return; }
  await sb!.from('cierres').delete().eq('id', id);
}

export async function listarCitas(desde: Date, hasta: Date): Promise<Cita[]> {
  if (DEMO) return ej(K.citas, semilla).filter((c) => c.inicio >= desde.toISOString() && c.inicio < hasta.toISOString());
  const { data, error } = await sb!.from('citas').select('*').gte('inicio', desde.toISOString()).lt('inicio', hasta.toISOString()).order('inicio');
  if (error) throw new Error('No pudimos cargar la agenda. Revisa tu conexión.');
  return data as Cita[];
}
// solicitudes de la web pendientes de confirmar (de cualquier fecha futura)
export async function solicitudes(): Promise<Cita[]> {
  if (DEMO) return ej(K.citas, semilla).filter((c) => c.estado === 'solicitada');
  const { data } = await sb!.from('citas').select('*').eq('estado', 'solicitada').order('creado', { ascending: false }).limit(50);
  return (data ?? []) as Cita[];
}
const cruce = (msg: string) => /citas_sin_cruces|exclusion|23P01|conflicting key/i.test(msg);
export async function crearCita(c: NuevaCita): Promise<Cita> {
  if (DEMO) {
    const todas = ej(K.citas, semilla);
    if (!c.sobrecupo && (c.estado === 'confirmada') && todas.some((x) => x.carril === c.carril && (x.estado === 'confirmada' || x.estado === 'atendida') && !x.sobrecupo && x.inicio < c.fin && x.fin > c.inicio))
      throw new Error('Ese horario ya está ocupado. Elige otra hora o marca sobrecupo.');
    const n = { ...c, id: 'ej-' + Date.now(), creado: new Date().toISOString() };
    store.set(K.citas, [...todas, n]); return n;
  }
  const { data, error } = await sb!.from('citas').insert(c).select('*').single();
  if (error) throw new Error(cruce(error.message) ? 'Ese horario ya está ocupado. Elige otra hora o marca sobrecupo.' : 'No se guardó la cita. Inténtalo de nuevo.');
  return data as Cita;
}
export async function cambiarCita(id: string, cambio: Partial<NuevaCita>): Promise<Cita> {
  if (DEMO) {
    const todas = ej(K.citas, semilla);
    const actual = todas.find((x) => x.id === id)!;
    const n = { ...actual, ...cambio };
    if ((n.estado === 'confirmada' || n.estado === 'atendida') && !n.sobrecupo && todas.some((x) => x.id !== id && x.carril === n.carril && (x.estado === 'confirmada' || x.estado === 'atendida') && !x.sobrecupo && x.inicio < n.fin && x.fin > n.inicio))
      throw new Error('Ese horario ya está ocupado. Muévela a otra hora en la Agenda.');
    store.set(K.citas, todas.map((x) => (x.id === id ? n : x))); return n;
  }
  const { data, error } = await sb!.from('citas').update(cambio).eq('id', id).select('*').single();
  if (error) throw new Error(cruce(error.message) ? 'Ese horario ya está ocupado. Muévela a otra hora en la Agenda.' : 'No se guardó el cambio.');
  return data as Cita;
}
