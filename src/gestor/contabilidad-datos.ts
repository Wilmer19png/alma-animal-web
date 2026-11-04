// Contabilidad: lo que entra, lo que sale y el reparto entre socios.
// Lo que ENTRA sale solo de donde ya se marca (no se escribe dos veces):
//   · citas de la doctora marcadas «Atendida» en la Agenda (datos.total y datos.pago),
//   · baños marcados «Entregada y pagada» en Citas de spa (datos.total y datos.pago),
//   · pedidos con el pago confirmado en Pedidos (pagado_en).
// Mientras no se marquen quedan «en espera» y no suman. Los gastos, los ingresos sueltos, los gastos fijos
// y el reparto se guardan en las tablas libro_contable, gastos_fijos y repartos (supabase/23-contabilidad.sql).
import { sb, DEMO, store } from './lib';
import { listarCitas, iso, sumarDias, SERVICIOS, type Cita } from './agenda-datos';
import { listar as listarPedidos, cobrado, pagaAlRecibir, type Pedido } from './pedidos-datos';
import { listarPacientes } from './clinica-datos';

/* ---------- categorías ---------- */
export type CatI = 'consulta' | 'vacuna' | 'spa' | 'tienda' | 'otro_ingreso';
export type CatG = 'arriendo' | 'servicios' | 'meta' | 'medic' | 'insumos' | 'merc' | 'otro';
export type Cat = CatI | CatG;
export const CATS_I: Record<CatI, { txt: string; icon: string }> = {
  consulta: { txt: 'Consultas', icon: 'stethoscope' },
  vacuna: { txt: 'Vacunas', icon: 'vaccines' },
  spa: { txt: 'Baños y spa', icon: 'shower' },
  tienda: { txt: 'Tienda', icon: 'storefront' },
  otro_ingreso: { txt: 'Otros ingresos', icon: 'payments' }
};
export const CATS_G: Record<CatG, { txt: string; icon: string; fijo?: boolean }> = {
  arriendo: { txt: 'Arriendo', icon: 'home', fijo: true },
  servicios: { txt: 'Luz, agua e internet', icon: 'bolt', fijo: true },
  meta: { txt: 'Pauta en Meta', icon: 'campaign' },
  medic: { txt: 'Medicamentos y vacunas', icon: 'medication' },
  insumos: { txt: 'Insumos de spa', icon: 'soap' },
  merc: { txt: 'Mercancía de la tienda', icon: 'inventory_2' },
  otro: { txt: 'Otros gastos', icon: 'more_horiz' }
};
export const catTxt = (c: Cat) => (c in CATS_I ? CATS_I[c as CatI].txt : CATS_G[c as CatG].txt);
export const catIcon = (c: Cat) => (c in CATS_I ? CATS_I[c as CatI].icon : CATS_G[c as CatG].icon);
export const MEDIOS = ['Efectivo', 'Nequi', 'Daviplata', 'Transferencia', 'Tarjeta', 'PSE'];
// servicio de la agenda → categoría (domicilios, radiografías y cirugías cuentan como consultas)
const catDeCita = (c: Cita): CatI => (c.servicio === 'spa' ? 'spa' : c.servicio === 'vacuna' ? 'vacuna' : 'consulta');

/* ---------- tipos ---------- */
export interface Movimiento {
  id: string; fecha: string; tipo: 'ingreso' | 'gasto'; categoria: Cat; concepto: string; valor: number;
  medio: string | null; factura: string | null; pagado: boolean; fijo_id: string | null; mes: string | null;
  por_nombre: string | null; creado: string;
}
export type NuevoMov = Omit<Movimiento, 'id' | 'creado'>;
export interface GastoFijo { id: string; nombre: string; categoria: CatG; icono: string; dia: number; varia: boolean; valor: number; activo: boolean; orden: number }
export interface Reparto { mes: string; socio: string; valor: number; pagado_en: string }
export interface Socio { id: string; nombre: string; rol: string; pct: number }

// una línea de la lista de movimientos (sale de una cita, un pedido o un movimiento a mano)
export type Origen = 'agenda' | 'spa' | 'pedido' | 'manual' | 'fijo';
export interface Linea {
  id: string; fecha: string; tipo: 'ingreso' | 'gasto'; cat: Cat; concepto: string; det: string; valor: number;
  medio: string; origen: Origen; espera: boolean; factura: string | null; mov?: Movimiento;
}

/* ---------- fechas ---------- */
export const mesDe = (fecha: string | Date) => iso(typeof fecha === 'string' ? new Date(fecha.length === 10 ? fecha + 'T12:00:00' : fecha) : fecha).slice(0, 7);
export const mesActual = () => mesDe(new Date());
export const primerDia = (mes: string) => { const [y, m] = mes.split('-').map(Number); return new Date(y, m - 1, 1); };
export const sumarMeses = (mes: string, n: number) => { const d = primerDia(mes); d.setMonth(d.getMonth() + n); return mesDe(d); };
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const mesTxt = (mes: string, conAño = true) => { const d = primerDia(mes); return MESES[d.getMonth()] + (conAño ? ' ' + d.getFullYear() : ''); };
// fecha en que vence un gasto fijo ese mes (el 31 en un mes de 30 días = el 30)
export const venceEn = (mes: string, dia: number) => { const d = primerDia(mes); const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); return iso(new Date(d.getFullYear(), d.getMonth(), Math.min(dia, ult))); };

/* ---------- socios ---------- */
export const SOCIOS_BASE: Socio[] = [
  { id: 'mariana', nombre: 'Mariana Hoyos', rol: 'Médica veterinaria', pct: 50 },
  { id: 'albert', nombre: 'Albert', rol: 'Peluquero del spa', pct: 50 }
];

/* ---------- datos de ejemplo ---------- */
const K = { mov: 'alma-ej-movimientos', fijos: 'alma-ej-gastos-fijos', rep: 'alma-ej-repartos' };
const ej = <T>(k: string, s: () => T): T => { const v = store.get<T>(k); if (v) return v; const x = s(); store.set(k, x); return x; };
const FIJOS_EJ = (): GastoFijo[] => [
  { id: 'ej-f1', nombre: 'Arriendo del local', categoria: 'arriendo', icono: 'home', dia: 5, varia: false, valor: 1500000, activo: true, orden: 1 },
  { id: 'ej-f2', nombre: 'Agua', categoria: 'servicios', icono: 'water_drop', dia: 5, varia: true, valor: 92000, activo: true, orden: 2 },
  { id: 'ej-f3', nombre: 'Internet y celular', categoria: 'servicios', icono: 'wifi', dia: 15, varia: false, valor: 120000, activo: true, orden: 3 },
  { id: 'ej-f4', nombre: 'Luz', categoria: 'servicios', icono: 'bolt', dia: 27, varia: true, valor: 185000, activo: true, orden: 4 },
  { id: 'ej-f5', nombre: 'Pauta en Meta', categoria: 'meta', icono: 'campaign', dia: 30, varia: true, valor: 400000, activo: true, orden: 5 }
];
const MOVS_EJ = (): Movimiento[] => {
  const hoy = new Date(), mes = mesActual(), ant = sumarMeses(mes, -1);
  const M = (fecha: string, tipo: Movimiento['tipo'], categoria: Cat, concepto: string, valor: number, medio: string, extra: Partial<Movimiento> = {}): Movimiento => ({
    id: 'ej-m' + fecha + concepto.length + valor, fecha, tipo, categoria, concepto, valor, medio, factura: null, pagado: true, fijo_id: null, mes: null,
    por_nombre: 'Dra. Mariana Hoyos', creado: new Date().toISOString(), ...extra
  });
  const dia = (n: number) => iso(sumarDias(hoy, -n));
  const fijo = (m: string, f: GastoFijo, valor: number, pagado: boolean) => M(venceEn(m, f.dia), 'gasto', f.categoria, f.nombre, valor, 'Transferencia', { fijo_id: f.id, mes: m, pagado, id: `ej-fm-${f.id}-${m}` });
  const F = FIJOS_EJ();
  return [
    // mes pasado: todos los fijos pagados
    fijo(ant, F[0], 1500000, true), fijo(ant, F[1], 92000, true), fijo(ant, F[2], 120000, true), fijo(ant, F[3], 185000, true), fijo(ant, F[4], 400000, true),
    M(venceEn(ant, 12), 'gasto', 'medic', 'Vacunas y antiparasitarios', 780000, 'Transferencia'),
    M(venceEn(ant, 18), 'gasto', 'insumos', 'Shampoo y perfumes', 260000, 'Efectivo'),
    M(venceEn(ant, 20), 'gasto', 'merc', 'Bultos de concentrado', 690000, 'Transferencia'),
    M(venceEn(ant, 8), 'ingreso', 'consulta', 'Consultas del mes (antes del gestor)', 1980000, 'Efectivo'),
    M(venceEn(ant, 8), 'ingreso', 'spa', 'Baños del mes (antes del gestor)', 2140000, 'Efectivo'),
    M(venceEn(ant, 8), 'ingreso', 'tienda', 'Ventas de mostrador', 1320000, 'Efectivo'),
    // este mes: arriendo y agua pagados; luz sin recibo todavía
    fijo(mes, F[0], 1500000, true), fijo(mes, F[1], 96400, true),
    M(dia(2), 'gasto', 'medic', 'Vacunas y antiparasitarios', 520000, 'Transferencia'),
    M(dia(1), 'gasto', 'insumos', 'Shampoo hipoalergénico', 160000, 'Efectivo'),
    M(dia(0), 'ingreso', 'tienda', 'Venta en mostrador · collar', 25000, 'Nequi')
  ].filter((m) => m.fecha <= iso(hoy));
};

/* ---------- cargar un mes (con 6 meses atrás para arrastrar pérdidas) ---------- */
export interface Libro { lineas: Linea[]; fijos: GastoFijo[]; movs: Movimiento[]; repartos: Reparto[]; socios: Socio[] }

export async function cargarLibro(mes: string): Promise<Libro> {
  const desde = primerDia(sumarMeses(mes, -6)), hasta = primerDia(sumarMeses(mes, 1));
  const dIso = iso(desde), hIso = iso(hasta);
  const [citas, pedidos, movs, fijos, repartos, socios, pacs] = await Promise.all([
    listarCitas(desde, hasta),
    leerPedidos(desde),
    leerMovs(dIso, hIso),
    leerFijos(),
    leerRepartos(sumarMeses(mes, -6), mes),
    leerSocios(),
    listarPacientes().catch(() => [])
  ]);
  const nombre = (c: Cita) => pacs.find((p) => p.id === c.paciente_id)?.nombre ?? c.datos.mascota ?? 'Sin paciente';
  const ahora = new Date(), finHoy = iso(sumarDias(ahora, 1));
  const lineas: Linea[] = [];

  // citas: atendidas suman; las que ya pasaron (o están hoy en el spa) y no se han marcado quedan en espera
  for (const c of citas) {
    const spa = c.carril === 'spa';
    const valor = Number(c.datos.total) || 0;
    const fecha = (c.datos.entregada as string) || (c.datos.hecha as string) || c.inicio;
    const base = { id: 'c-' + c.id, tipo: 'ingreso' as const, cat: catDeCita(c), concepto: SERVICIOS[c.servicio].txt, det: nombre(c), valor, origen: (spa ? 'spa' : 'agenda') as Origen, factura: null };
    if (c.estado === 'atendida') lineas.push({ ...base, fecha: iso(new Date(fecha)), medio: String(c.datos.pago ?? '').replace(/ \(.*/, '') || '—', espera: false });
    else if (c.estado === 'confirmada' && (spa ? iso(new Date(c.inicio)) < finHoy : new Date(c.fin) < ahora))
      lineas.push({ ...base, fecha: iso(new Date(c.inicio)), medio: '—', espera: true, det: base.det + (spa ? ' · falta entregarlo' : ' · falta marcarla') });
  }
  // pedidos: suman cuando el pago está confirmado; los confirmados por el cliente sin pago quedan en espera
  for (const p of pedidos) {
    if (p.estado === 'cancelado') continue;
    const base = { id: 'p-' + p.id, tipo: 'ingreso' as const, cat: 'tienda' as Cat, concepto: `Pedido #${p.numero}`, valor: p.total, origen: 'pedido' as Origen, factura: null };
    const medio = p.pago === 'contraentrega' ? 'Contraentrega' : p.pago === 'consultorio' ? 'En el consultorio' : p.pago === 'transferencia' ? 'Transferencia' : p.pago === 'en_linea' ? 'En línea' : '—';
    if (cobrado(p)) lineas.push({ ...base, fecha: iso(new Date(p.pagado_en ?? p.creado)), det: `${p.nombre} ${p.apellido}`, medio, espera: false });
    else if (p.estado !== 'nuevo') lineas.push({ ...base, fecha: iso(new Date(p.creado)), det: `${p.nombre} ${p.apellido} · ${pagaAlRecibir(p) ? 'paga al recibir' : 'falta el pago'}`, medio, espera: true });
  }
  // movimientos a mano (y gastos fijos ya pagados)
  for (const m of movs) {
    if (!m.pagado) continue;
    lineas.push({ id: 'm-' + m.id, fecha: m.fecha, tipo: m.tipo, cat: m.categoria, concepto: m.concepto, det: m.fijo_id ? 'Gasto fijo' : m.por_nombre ? `Registró ${m.por_nombre}` : 'Registrado a mano',
      valor: m.valor, medio: m.medio ?? '—', origen: m.fijo_id ? 'fijo' : 'manual', espera: false, factura: m.factura, mov: m });
  }
  lineas.sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(b.espera) - Number(a.espera));
  return { lineas, fijos: fijos.filter((f) => f.activo).sort((a, b) => a.orden - b.orden), movs, repartos, socios };
}

// ganancia de cada mes y lo que se reparte: si un mes da pérdida, se descuenta de los siguientes
export function resumen(libro: Libro, mes: string) {
  const neto: Record<string, number> = {};
  for (const l of libro.lineas) if (!l.espera) { const m = l.fecha.slice(0, 7); neto[m] = (neto[m] ?? 0) + (l.tipo === 'ingreso' ? l.valor : -l.valor); }
  let arrastre = 0;
  for (let k = -6; k < 0; k++) { const aj = (neto[sumarMeses(mes, k)] ?? 0) + arrastre; arrastre = aj < 0 ? aj : 0; }
  const ganancia = neto[mes] ?? 0;
  const aRepartir = Math.max(0, ganancia + arrastre);
  return { ganancia, arrastre, aRepartir, perdida: ganancia + arrastre < 0 ? ganancia + arrastre : 0 };
}

/* ---------- lecturas ---------- */
async function leerPedidos(desde: Date): Promise<Pedido[]> {
  if (DEMO) return listarPedidos();
  const { data, error } = await sb!.from('pedidos').select('*')
    .or(`pagado_en.gte."${desde.toISOString()}",pagado_en.is.null`).neq('estado', 'cancelado').order('creado', { ascending: false }).limit(1000);
  if (error) throw new Error('No pudimos cargar los pedidos. Revisa tu conexión.');
  return data as Pedido[];
}
async function leerMovs(desde: string, hasta: string): Promise<Movimiento[]> {
  if (DEMO) return ej(K.mov, MOVS_EJ).filter((m) => m.fecha >= desde && m.fecha < hasta);
  const { data, error } = await sb!.from('libro_contable').select('*').gte('fecha', desde).lt('fecha', hasta).order('fecha', { ascending: false });
  if (error) throw new Error('No pudimos cargar la contabilidad. Revisa tu conexión.');
  return data as Movimiento[];
}
async function leerFijos(): Promise<GastoFijo[]> {
  if (DEMO) return ej(K.fijos, FIJOS_EJ);
  const { data } = await sb!.from('gastos_fijos').select('*').order('orden');
  return (data ?? []) as GastoFijo[];
}
async function leerRepartos(desde: string, hasta: string): Promise<Reparto[]> {
  if (DEMO) return ej<Reparto[]>(K.rep, () => []);
  const { data } = await sb!.from('repartos').select('*').gte('mes', desde).lte('mes', hasta);
  return (data ?? []) as Reparto[];
}
export async function leerSocios(): Promise<Socio[]> {
  if (DEMO) return SOCIOS_BASE;
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'socios').maybeSingle();
  const v = data?.valor as Socio[] | undefined;
  return Array.isArray(v) && v.length ? v : SOCIOS_BASE;
}

/* ---------- escrituras ---------- */
const sinPermiso = (e: { message: string } | null) => (e && /row-level security|permission/i.test(e.message) ? 'Solo la administradora puede cambiar la contabilidad.' : 'No se guardó. Revisa tu conexión e inténtalo de nuevo.');

export async function guardarMov(m: NuevoMov & { id?: string }): Promise<Movimiento> {
  if (DEMO) {
    const todos = ej(K.mov, MOVS_EJ);
    const previo = m.id ? todos.find((x) => x.id === m.id) : m.fijo_id ? todos.find((x) => x.fijo_id === m.fijo_id && x.mes === m.mes) : undefined;
    const n: Movimiento = { ...(previo ?? { id: 'ej-' + Date.now(), creado: new Date().toISOString() }), ...m } as Movimiento;
    store.set(K.mov, previo ? todos.map((x) => (x.id === previo.id ? n : x)) : [n, ...todos]);
    return n;
  }
  const { id, ...resto } = m;
  const q = id ? sb!.from('libro_contable').update(resto).eq('id', id) : sb!.from('libro_contable').insert(resto);
  const { data, error } = await q.select('*').single();
  if (error) throw new Error(sinPermiso(error));
  return data as Movimiento;
}
export async function borrarMov(m: Movimiento): Promise<void> {
  if (DEMO) { store.set(K.mov, ej(K.mov, MOVS_EJ).filter((x) => x.id !== m.id)); return; }
  const { error } = await sb!.from('libro_contable').delete().eq('id', m.id);
  if (error) throw new Error(sinPermiso(error));
  if (m.factura) await sb!.storage.from('contabilidad').remove([m.factura]).catch(() => {});
}
export async function guardarFijo(f: Omit<GastoFijo, 'id'> & { id?: string }): Promise<GastoFijo> {
  if (DEMO) {
    const todos = ej(K.fijos, FIJOS_EJ);
    const n = { ...f, id: f.id ?? 'ej-f' + Date.now() } as GastoFijo;
    store.set(K.fijos, f.id ? todos.map((x) => (x.id === f.id ? n : x)) : [...todos, n]);
    return n;
  }
  const { id, ...resto } = f;
  const q = id ? sb!.from('gastos_fijos').update(resto).eq('id', id) : sb!.from('gastos_fijos').insert(resto);
  const { data, error } = await q.select('*').single();
  if (error) throw new Error(sinPermiso(error));
  return data as GastoFijo;
}
export async function pagarSocio(mes: string, socio: string, valor: number): Promise<Reparto> {
  const r: Reparto = { mes, socio, valor, pagado_en: new Date().toISOString() };
  if (DEMO) { store.set(K.rep, [...ej<Reparto[]>(K.rep, () => []).filter((x) => !(x.mes === mes && x.socio === socio)), r]); return r; }
  const { data, error } = await sb!.from('repartos').upsert(r).select('*').single();
  if (error) throw new Error(sinPermiso(error));
  return data as Reparto;
}
export async function deshacerPagoSocio(mes: string, socio: string): Promise<void> {
  if (DEMO) { store.set(K.rep, ej<Reparto[]>(K.rep, () => []).filter((x) => !(x.mes === mes && x.socio === socio))); return; }
  const { error } = await sb!.from('repartos').delete().eq('mes', mes).eq('socio', socio);
  if (error) throw new Error(sinPermiso(error));
}

/* ---------- fotos de facturas (privadas) ---------- */
export async function subirFactura(original: File): Promise<string> {
  let file = original;
  if (/^image\//i.test(original.type) && original.size > 400 * 1024) {
    try {
      const { comprimir } = await import('./productos-datos');
      const b = await comprimir(original, 1800);
      if (b.size < original.size) file = new File([b], original.name.replace(/\.[^.]+$/, '') + '.webp', { type: 'image/webp' });
    } catch { /* se sube como está */ }
  }
  if (file.size > 10 * 1024 * 1024) throw new Error('La foto pesa más de 10 MB.');
  if (DEMO) return URL.createObjectURL(file);
  const limpio = file.name.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.-]+/g, '-').slice(-60);
  const ruta = `${mesActual()}/${Date.now()}-${limpio}`;
  const { error } = await sb!.storage.from('contabilidad').upload(ruta, file, { contentType: file.type || 'application/octet-stream' });
  if (error) throw new Error('No se pudo subir la foto. Revisa tu conexión.');
  return ruta;
}
export async function verFactura(ruta: string): Promise<string | null> {
  if (DEMO) return ruta;
  const { data } = await sb!.storage.from('contabilidad').createSignedUrl(ruta, 3600);
  return data?.signedUrl ?? null;
}

/* ---------- para el contador ---------- */
export function csvDelMes(lineas: Linea[], mes: string): string {
  const q = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const filas = lineas.filter((l) => l.fecha.startsWith(mes) && !l.espera).sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((l) => [l.fecha, l.tipo === 'ingreso' ? 'Ingreso' : 'Gasto', catTxt(l.cat), l.concepto, l.det, l.medio, String(l.tipo === 'ingreso' ? l.valor : -l.valor), l.factura ? 'Sí' : 'No'].map(q).join(';'));
  return '﻿' + ['Fecha;Tipo;Categoría;Concepto;Detalle;Medio de pago;Valor;Factura', ...filas].join('\r\n');
}
