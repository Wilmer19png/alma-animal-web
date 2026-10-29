// Propietarios, pacientes e historia clínica (tablas propietarios, pacientes, registros; archivos en el
// depósito privado "clinica"). Sin Supabase se trabaja con datos de ejemplo guardados en esta pestaña.
import { sb, DEMO, store } from './lib';

export interface Propietario {
  id: string; nombre: string; apellidos: string; doc_tipo: string | null; doc_numero: string | null; celular: string;
  celular_norm?: string; correo: string | null; direccion: string | null; barrio: string | null; departamento: string | null;
  ciudad: string | null; fuente: string | null; notas: string | null; acepto_datos: boolean; acepto_fecha: string;
  portal: 'sin_invitar' | 'por_invitar' | 'invitado' | 'activo'; creado: string;
}
export interface Paciente {
  id: string; propietario_id: string; nombre: string; especie: 'canino' | 'felino' | 'otro'; raza: string | null; color: string | null;
  sexo: 'macho' | 'hembra'; reproductivo: 'entero' | 'esterilizado' | null; nacimiento: string | null; edad_aprox: string | null;
  peso: number | null; microchip: string | null; alimento: string | null; alimento_cant: string | null; alergias: string | null;
  cronicas: string | null; extras: [string, string][]; foto: string | null; activo: boolean; creado: string;
}
export interface Archivo { nombre: string; ruta: string; tipo: string }
export type TipoRegistro = 'consulta' | 'vacuna' | 'desparasitacion' | 'examen' | 'imagen' | 'cirugia' | 'procedimiento' | 'formula' | 'hospitalizacion' | 'peso' | 'spa' | 'nota';
export interface Registro {
  id: string; paciente_id: string; tipo: TipoRegistro; fecha: string; titulo: string; resumen: string | null;
  datos: Record<string, string>; archivos: Archivo[]; externo: boolean; por_nombre: string | null; creado: string;
}
export interface Compra { id: string; numero: number; codigo: string; creado: string; estado: string; total: number; items: { nombre: string; cantidad: number }[] }

export type NuevoPropietario = Omit<Propietario, 'id' | 'creado' | 'acepto_fecha' | 'celular_norm'>;
export type NuevoPaciente = Omit<Paciente, 'id' | 'creado'>;
export type NuevoRegistro = Omit<Registro, 'id' | 'creado'>;

/* ---------- textos ---------- */
export const ESPECIES = { canino: 'Canino', felino: 'Felino', otro: 'Otra especie' } as const;
export const DOCS = [['CC', 'C.C.'], ['CE', 'C.E.'], ['PA', 'Pasaporte'], ['NIT', 'NIT'], ['TI', 'T.I.']] as const;
export const FUENTES = ['Instagram', 'Facebook', 'Google', 'Recomendación', 'Pasaba por el consultorio', 'La tienda web', 'Otro'];
export const TIPOS: Record<TipoRegistro, { txt: string; icon: string }> = {
  consulta: { txt: 'Consulta', icon: 'stethoscope' }, vacuna: { txt: 'Vacuna', icon: 'vaccines' },
  desparasitacion: { txt: 'Desparasitación', icon: 'pest_control' }, examen: { txt: 'Examen de laboratorio', icon: 'biotech' },
  imagen: { txt: 'Imagen diagnóstica', icon: 'radiology' }, cirugia: { txt: 'Cirugía', icon: 'healing' },
  procedimiento: { txt: 'Procedimiento', icon: 'medical_services' }, formula: { txt: 'Fórmula médica', icon: 'prescriptions' },
  hospitalizacion: { txt: 'Hospitalización', icon: 'bed' }, peso: { txt: 'Control de peso', icon: 'monitor_weight' },
  spa: { txt: 'Spa', icon: 'shower' }, nota: { txt: 'Nota', icon: 'sticky_note_2' }
};
export const VACUNAS = {
  canino: ['Polivalente (parvovirus, moquillo y otras)', 'Antirrábica', 'Tos de las perreras', 'Leptospirosis'],
  felino: ['Triple felina', 'Antirrábica', 'Leucemia felina'],
  otro: ['Antirrábica']
};
export const DESPARASITACIONES = ['Desparasitación interna', 'Desparasitación externa (pulgas y garrapatas)'];

export const nombreCompleto = (p: Pick<Propietario, 'nombre' | 'apellidos'>) => `${p.nombre} ${p.apellidos}`.trim();
export const iniciales = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export const celNorm = (c: string) => c.replace(/\D/g, '').slice(-10);
export const edad = (p: Pick<Paciente, 'nacimiento' | 'edad_aprox'>) => {
  if (!p.nacimiento) return p.edad_aprox ?? '';
  const n = new Date(p.nacimiento + 'T12:00:00'), h = new Date();
  let m = (h.getFullYear() - n.getFullYear()) * 12 + h.getMonth() - n.getMonth() - (h.getDate() < n.getDate() ? 1 : 0);
  m = Math.max(0, m);
  return m < 12 ? `${m} ${m === 1 ? 'mes' : 'meses'}` : `${Math.floor(m / 12)} ${Math.floor(m / 12) === 1 ? 'año' : 'años'}`;
};
export const sexoTxt = (p: Pick<Paciente, 'sexo' | 'reproductivo'>) => {
  const base = p.sexo === 'hembra' ? 'Hembra' : 'Macho';
  if (!p.reproductivo) return base;
  return `${base} ${p.reproductivo === 'esterilizado' ? (p.sexo === 'hembra' ? 'esterilizada' : 'castrado') : 'entero' + (p.sexo === 'hembra' ? 'a' : '')}`;
};
export const kg = (n: number | null) => (n == null ? '' : `${String(n).replace('.', ',')} kg`);

/* ---------- modo de ejemplo ---------- */
const K = { prop: 'alma-ej-propietarios', pac: 'alma-ej-pacientes', reg: 'alma-ej-registros' };
const dias = (n: number) => new Date(Date.now() - n * 86400000).toISOString();
const SEMILLA = () => {
  const P = (id: string, nombre: string, apellidos: string, celular: string, extra: Partial<Propietario> = {}): Propietario => ({
    id, nombre, apellidos, celular, doc_tipo: 'CC', doc_numero: null, correo: null, direccion: null, barrio: null, departamento: 'Risaralda',
    ciudad: 'Pereira', fuente: 'Instagram', notas: null, acepto_datos: true, acepto_fecha: dias(200), portal: 'sin_invitar', creado: dias(200), ...extra
  });
  const M = (id: string, propietario_id: string, nombre: string, especie: Paciente['especie'], raza: string, sexo: Paciente['sexo'], extra: Partial<Paciente> = {}): Paciente => ({
    id, propietario_id, nombre, especie, raza, sexo, color: null, reproductivo: null, nacimiento: null, edad_aprox: null, peso: null, microchip: null,
    alimento: null, alimento_cant: null, alergias: null, cronicas: null, extras: [], foto: null, activo: true, creado: dias(180), ...extra
  });
  const props = [
    P('p1', 'Laura', 'Gómez Restrepo', '300 123 4567', { correo: 'laura@correo.com', direccion: 'Calle 19 # 8-34, apto 302', barrio: 'Álamos', doc_numero: '1.088.234.567', portal: 'activo', creado: dias(420) }),
    P('p2', 'Andrés', 'Ospina', '312 456 7890', { correo: 'andres.ospina@correo.com', ciudad: 'Dosquebradas', fuente: 'Google' }),
    P('p3', 'Sofía', 'Arango', '310 555 1212', { correo: 'sofia.arango@correo.com', barrio: 'Alfonso López', portal: 'invitado' }),
    P('p4', 'Juan Pablo', 'Ríos', '311 222 0099', { fuente: 'Recomendación' }),
    P('p5', 'Andrea', 'Muñoz', '315 777 3344', { correo: 'andrea.munoz@correo.com', fuente: 'Pasaba por el consultorio' })
  ];
  const pacs = [
    M('m1', 'p1', 'Luna', 'canino', 'Shih Tzu', 'hembra', { color: 'Blanco y dorado', reproductivo: 'esterilizado', nacimiento: '2022-03-12', peso: 8.4, microchip: '900 108 000 123 456', alimento: 'Concentrado raza pequeña adulto', alimento_cant: '110 g al día, en 2 tomas', alergias: 'Amoxicilina', cronicas: 'Piel sensible (dermatitis)', extras: [['Le teme a…', 'El secador. Mejor secado con toalla.']] }),
    M('m2', 'p1', 'Toby', 'canino', 'Schnauzer', 'macho', { reproductivo: 'entero', nacimiento: '2020-07-02', peso: 9 }),
    M('m3', 'p2', 'Max', 'canino', 'Labrador', 'macho', { reproductivo: 'esterilizado', edad_aprox: '6 años', peso: 31.5 }),
    M('m4', 'p3', 'Nala', 'felino', 'Criolla', 'hembra', { reproductivo: 'esterilizado', nacimiento: '2023-01-20', peso: 4 }),
    M('m5', 'p4', 'Rocky', 'canino', 'Golden retriever', 'macho', { nacimiento: '2021-05-10', peso: 28 }),
    M('m6', 'p5', 'Coco', 'canino', 'French poodle', 'hembra', { reproductivo: 'esterilizado', edad_aprox: '3 años', peso: 6.2 })
  ];
  const R = (id: string, paciente_id: string, tipo: TipoRegistro, n: number, titulo: string, resumen: string | null, datos: Record<string, string> = {}, archivos: Archivo[] = []): Registro => ({
    id, paciente_id, tipo, fecha: dias(n), titulo, resumen, datos, archivos, externo: false, por_nombre: tipo === 'spa' ? 'Albert' : 'Dra. Mariana Hoyos', creado: dias(n)
  });
  const regs = [
    R('r1', 'm1', 'consulta', 6, 'Otitis externa en oído derecho', 'Se rasca la oreja hace 4 días. Oído derecho con cera oscura y olor. Se limpia y se formulan gotas óticas por 7 días.', { motivo: 'Se rasca la oreja', diagnostico: 'Otitis externa', tratamiento: 'Gotas óticas cada 12 horas por 7 días', temperatura: '38,6', peso: '8,4' }),
    R('r2', 'm1', 'formula', 6, 'Gotas óticas', 'Aplicar 4 gotas en el oído derecho cada 12 horas durante 7 días. Control en una semana.'),
    R('r3', 'm1', 'vacuna', 40, 'Polivalente (parvovirus, moquillo y otras)', null, { laboratorio: 'Zoetis', lote: 'A1234', proxima: new Date(Date.now() + 325 * 86400000).toISOString().slice(0, 10) }),
    R('r4', 'm1', 'examen', 90, 'Hemograma', 'Valores dentro de lo normal.', {}, [{ nombre: 'hemograma-luna.pdf', ruta: '', tipo: 'application/pdf' }]),
    R('r5', 'm1', 'spa', 20, 'Baño medicado', 'Piel un poco seca detrás de las orejas. Se le avisa a la doctora.', { peso: '8,3' }),
    R('r6', 'm1', 'peso', 120, 'Control de peso', null, { peso: '8,1' }),
    R('r7', 'm1', 'desparasitacion', 75, 'Desparasitación interna', null, { producto: 'Antiparasitario de amplio espectro', proxima: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10) })
  ];
  return { props, pacs, regs };
};
function tabla<T>(k: string, semilla: () => T[]): T[] {
  const v = store.get<T[]>(k);
  if (v) return v;
  const s = semilla(); store.set(k, s); return s;
}
const ej = {
  props: () => tabla(K.prop, () => SEMILLA().props),
  pacs: () => tabla(K.pac, () => SEMILLA().pacs),
  regs: () => tabla(K.reg, () => SEMILLA().regs)
};
const uid = () => 'ej-' + Math.random().toString(36).slice(2, 10);

/* ---------- lectura ---------- */
const falla = (que: string) => new Error(`No pudimos cargar ${que}. Revisa tu conexión.`);

export async function listarPropietarios(): Promise<Propietario[]> {
  if (DEMO) return ej.props();
  const { data, error } = await sb!.from('propietarios').select('*').order('apellidos').limit(5000);
  if (error) throw falla('los propietarios');
  return data as Propietario[];
}
export async function listarPacientes(): Promise<Paciente[]> {
  if (DEMO) return ej.pacs();
  const { data, error } = await sb!.from('pacientes').select('*').order('nombre').limit(10000);
  if (error) throw falla('los pacientes');
  return data as Paciente[];
}
export async function registrosDe(pacienteIds: string[]): Promise<Registro[]> {
  if (!pacienteIds.length) return [];
  if (DEMO) return ej.regs().filter((r) => pacienteIds.includes(r.paciente_id)).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const { data, error } = await sb!.from('registros').select('*').in('paciente_id', pacienteIds).order('fecha', { ascending: false }).limit(1000);
  if (error) throw falla('la historia clínica');
  return data as Registro[];
}
// vacunas y desparasitaciones cuya próxima dosis ya pasó o llega pronto (solo la aplicación más reciente de cada una)
export async function proximasDosis(dias = 15): Promise<Registro[]> {
  let regs: Registro[];
  if (DEMO) regs = ej.regs().filter((r) => r.tipo === 'vacuna' || r.tipo === 'desparasitacion');
  else {
    const { data, error } = await sb!.from('registros').select('*').in('tipo', ['vacuna', 'desparasitacion']).order('fecha', { ascending: false }).limit(5000);
    if (error) return [];
    regs = data as Registro[];
  }
  const vistos = new Set<string>();
  const limite = new Date(Date.now() + dias * 86400000).toISOString().slice(0, 10);
  return regs.sort((a, b) => b.fecha.localeCompare(a.fecha)).filter((r) => {
    const k = r.paciente_id + '|' + r.titulo;
    if (vistos.has(k)) return false;
    vistos.add(k);
    return !!r.datos.proxima && r.datos.proxima <= limite;
  }).sort((a, b) => a.datos.proxima.localeCompare(b.datos.proxima));
}

// compras de la tienda con el mismo celular
export async function comprasDe(celular: string): Promise<Compra[]> {
  const n = celNorm(celular);
  if (DEMO) {
    const pedidos = store.get<Compra[]>('alma-gestor-pedidos-ejemplo') ?? [];
    return pedidos.filter((p) => celNorm((p as unknown as { celular: string }).celular ?? '') === n);
  }
  const { data } = await sb!.from('pedidos').select('id,numero,codigo,creado,estado,total,items').eq('celular_norm', n).order('creado', { ascending: false }).limit(50);
  return (data ?? []) as Compra[];
}

/* ---------- escritura ---------- */
const fallaG = new Error('No se guardó. Revisa los datos y tu conexión, e inténtalo de nuevo.');

export async function crearPropietario(p: NuevoPropietario): Promise<Propietario> {
  if (DEMO) { const n = { ...p, id: uid(), creado: new Date().toISOString(), acepto_fecha: new Date().toISOString() }; store.set(K.prop, [...ej.props(), n]); return n; }
  const { data, error } = await sb!.from('propietarios').insert(p).select('*').single();
  if (error) throw /duplicate|unique/i.test(error.message) ? new Error('Ya hay un propietario con esos datos.') : fallaG;
  return data as Propietario;
}
export async function actualizarPropietario(id: string, c: Partial<NuevoPropietario>): Promise<Propietario> {
  if (DEMO) { let out!: Propietario; store.set(K.prop, ej.props().map((x) => (x.id === id ? (out = { ...x, ...c }) : x))); return out; }
  const { data, error } = await sb!.from('propietarios').update(c).eq('id', id).select('*').single();
  if (error) throw fallaG;
  return data as Propietario;
}
export async function crearPaciente(p: NuevoPaciente): Promise<Paciente> {
  if (DEMO) { const n = { ...p, id: uid(), creado: new Date().toISOString() }; store.set(K.pac, [...ej.pacs(), n]); return n; }
  const { data, error } = await sb!.from('pacientes').insert(p).select('*').single();
  if (error) throw fallaG;
  return data as Paciente;
}
export async function actualizarPaciente(id: string, c: Partial<NuevoPaciente>): Promise<Paciente> {
  if (DEMO) { let out!: Paciente; store.set(K.pac, ej.pacs().map((x) => (x.id === id ? (out = { ...x, ...c }) : x))); return out; }
  const { data, error } = await sb!.from('pacientes').update(c).eq('id', id).select('*').single();
  if (error) throw fallaG;
  return data as Paciente;
}
export async function crearRegistros(rs: NuevoRegistro[]): Promise<Registro[]> {
  if (!rs.length) return [];
  if (DEMO) {
    const nuevos = rs.map((r) => ({ ...r, id: uid(), creado: new Date().toISOString() }));
    store.set(K.reg, [...ej.regs(), ...nuevos]);
    // el peso de la ficha se actualiza con el registro más reciente que trae peso
    for (const r of nuevos) if (r.datos.peso) {
      const ultimo = ej.regs().filter((x) => x.paciente_id === r.paciente_id && x.datos.peso).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      if (ultimo?.id === r.id) await actualizarPaciente(r.paciente_id, { peso: Number(r.datos.peso.replace(',', '.')) });
    }
    return nuevos;
  }
  const { data, error } = await sb!.from('registros').insert(rs).select('*');
  if (error) throw /row-level security/i.test(error.message) ? new Error('Tu rol no puede escribir este tipo de registro.') : fallaG;
  return data as Registro[];
}
export async function borrarRegistro(id: string): Promise<void> {
  if (DEMO) { store.set(K.reg, ej.regs().filter((r) => r.id !== id)); return; }
  const { error } = await sb!.from('registros').delete().eq('id', id);
  if (error) throw new Error('Solo la administradora puede borrar registros de la historia clínica.');
}

/* ---------- archivos (privados) ---------- */
export async function subirArchivo(file: File, carpeta: string): Promise<Archivo> {
  if (file.size > 10 * 1024 * 1024) throw new Error(`«${file.name}» pesa más de 10 MB.`);
  if (DEMO) return { nombre: file.name, ruta: URL.createObjectURL(file), tipo: file.type };
  const limpio = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-80);
  const ruta = `${carpeta}/${Date.now()}-${limpio}`;
  const { error } = await sb!.storage.from('clinica').upload(ruta, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error(`No se pudo subir «${file.name}». Revisa tu conexión.`);
  return { nombre: file.name, ruta, tipo: file.type };
}
// enlace temporal (1 hora) para abrir un archivo privado
export async function abrirArchivo(a: Archivo): Promise<string | null> {
  if (DEMO) return a.ruta || null;
  const { data } = await sb!.storage.from('clinica').createSignedUrl(a.ruta, 3600);
  return data?.signedUrl ?? null;
}
