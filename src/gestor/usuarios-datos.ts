// Usuarios del gestor (tabla equipo + invitaciones pendientes) y copia de seguridad descargable.
import { sb, DEMO, store } from './lib';
import type { Rol } from './session';
import { listarPropietarios, listarPacientes } from './clinica-datos';

export interface Miembro { id: string | null; nombre: string; rol: Rol; activo: boolean; correo: string; ultimo: string | null; pendiente: boolean }

const K = 'alma-ej-miembros';
const semilla = (): Miembro[] => [
  { id: 'demo', nombre: 'Dra. Mariana Hoyos', rol: 'admin', activo: true, correo: 'ejemplo@almaanimal.co', ultimo: new Date().toISOString(), pendiente: false },
  { id: 'ej-u2', nombre: 'Albert', rol: 'peluqueria', activo: true, correo: 'spa@ejemplo.co', ultimo: new Date(Date.now() - 3 * 3600000).toISOString(), pendiente: false }
];
const ej = () => store.get<Miembro[]>(K) ?? (store.set(K, semilla()), store.get<Miembro[]>(K)!);

export async function listarMiembros(): Promise<Miembro[]> {
  if (DEMO) return ej();
  const { data, error } = await sb!.rpc('miembros');
  if (error) throw new Error('No pudimos cargar los usuarios. Revisa tu conexión.');
  return data as Miembro[];
}
// 'listo' = ya tenía cuenta y entra de una; 'pendiente' = falta invitarla desde Supabase
export async function invitar(correo: string, nombre: string, rol: Rol): Promise<'listo' | 'pendiente'> {
  if (DEMO) { store.set(K, [...ej().filter((m) => m.correo !== correo.toLowerCase()), { id: null, nombre, rol, activo: true, correo: correo.toLowerCase(), ultimo: null, pendiente: true }]); return 'pendiente'; }
  const { data, error } = await sb!.rpc('invitar_miembro', { p_correo: correo, p_nombre: nombre, p_rol: rol });
  if (error) throw new Error(/admin/i.test(error.message) ? 'Solo la administradora agrega personas.' : 'No se pudo agregar. Revisa el correo.');
  return data as 'listo' | 'pendiente';
}
export async function cambiarMiembro(m: Miembro, c: { rol?: Rol; activo?: boolean }): Promise<void> {
  if (DEMO) { store.set(K, ej().map((x) => (x.correo === m.correo ? { ...x, ...c } : x))); return; }
  const { error } = await sb!.from('equipo').update(c).eq('id', m.id!);
  if (error) throw new Error('No se guardó el cambio.');
}
export async function quitarInvitacion(m: Miembro): Promise<void> {
  if (DEMO) { store.set(K, ej().filter((x) => x.correo !== m.correo)); return; }
  await sb!.from('invitaciones').delete().eq('correo', m.correo);
}

/* ---------- copia de seguridad: un archivo de Excel con una hoja por tabla ---------- */
const TABLAS: [string, string][] = [
  ['propietarios', 'Propietarios'], ['pacientes', 'Pacientes'], ['registros', 'Historia clínica'], ['citas', 'Citas'],
  ['recordatorios', 'Recordatorios'], ['pedidos', 'Pedidos'], ['productos', 'Productos'], ['variantes', 'Variantes'],
  ['movimientos', 'Inventario'], ['suscriptores', 'Suscriptores'], ['articulos', 'Blog']
];
const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
function hoja(nombre: string, filas: Record<string, unknown>[]) {
  const cols = [...new Set(filas.flatMap((f) => Object.keys(f)))];
  const celda = (v: unknown) => {
    if (v == null) return '<Cell/>';
    if (typeof v === 'number') return `<Cell><Data ss:Type="Number">${v}</Data></Cell>`;
    return `<Cell><Data ss:Type="String">${xml(typeof v === 'object' ? JSON.stringify(v) : String(v))}</Data></Cell>`;
  };
  return `<Worksheet ss:Name="${xml(nombre.slice(0, 31))}"><Table>`
    + `<Row>${cols.map((c) => `<Cell ss:StyleID="t"><Data ss:Type="String">${xml(c)}</Data></Cell>`).join('')}</Row>`
    + filas.map((f) => `<Row>${cols.map((c) => celda(f[c])).join('')}</Row>`).join('')
    + '</Table></Worksheet>';
}
export async function descargarCopia(): Promise<number> {
  const hojas: [string, Record<string, unknown>[]][] = [];
  if (DEMO) {
    hojas.push(['Propietarios', (await listarPropietarios()) as unknown as Record<string, unknown>[]], ['Pacientes', (await listarPacientes()) as unknown as Record<string, unknown>[]]);
  } else {
    for (const [t, nombre] of TABLAS) {
      const filas: Record<string, unknown>[] = [];
      for (let desde = 0; ; desde += 1000) { // de a 1.000 filas (límite de Supabase por consulta)
        const { data, error } = await sb!.from(t).select('*').range(desde, desde + 999);
        if (error || !data?.length) break;
        filas.push(...data);
        if (data.length < 1000) break;
      }
      hojas.push([nombre, filas]);
    }
  }
  const doc = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>'
    + '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">'
    + '<Styles><Style ss:ID="t"><Font ss:Bold="1"/></Style></Styles>'
    + hojas.map(([n, f]) => hoja(n, f)).join('') + '</Workbook>';
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([doc], { type: 'application/vnd.ms-excel' }));
  a.download = `alma-animal-copia-${new Date().toISOString().slice(0, 10)}.xls`;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  store.set('alma-gestor-copia', new Date().toISOString(), globalThis.localStorage);
  return hojas.reduce((n, [, f]) => n + f.length, 0);
}
export const ultimaCopia = () => store.get<string>('alma-gestor-copia', globalThis.localStorage);
