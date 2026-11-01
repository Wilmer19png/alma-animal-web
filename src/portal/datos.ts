// Portal de clientes: sesión propia (separada de la del gestor) y lo que el cliente puede ver o pedir.
// Lo que no le corresponde lo bloquea la base de datos (supabase/16-portal.sql).
import { useEffect, useState } from 'react';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { store } from '../gestor/lib';
import * as ej from '../gestor/clinica-datos';
import { listarCitas, type Cita, type Servicio } from '../gestor/agenda-datos';
import { listar as listarPedidosEj } from '../gestor/pedidos-datos';
import type { Paciente, Registro, Archivo } from '../gestor/clinica-datos';

const URL = import.meta.env.PUBLIC_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string | undefined;
export const pc: SupabaseClient | null = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: true, storageKey: 'alma-portal-sesion' } }) : null;
export const DEMO = !pc;
const DEMO_KEY = 'alma-portal-ejemplo';

export interface Ficha { id: string; nombre: string; apellidos: string; celular: string; correo: string | null; direccion: string | null; barrio: string | null; ciudad: string | null }
export type Cuenta =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'sin-ficha'; correo: string } // entró, pero su correo no está en ninguna ficha
  | { estado: 'dentro'; yo: Ficha };

async function leer(): Promise<Cuenta> {
  if (DEMO) {
    if (!store.get(DEMO_KEY)) return { estado: 'fuera' };
    const p = (await ej.listarPropietarios()).find((x) => x.id === 'p1')!;
    return { estado: 'dentro', yo: p };
  }
  const { data } = await pc!.auth.getSession();
  const user = data.session?.user;
  if (!user) return { estado: 'fuera' };
  let { data: f } = await pc!.rpc('mi_ficha');
  if (!f?.length) { await pc!.rpc('vincular_mi_cuenta'); ({ data: f } = await pc!.rpc('mi_ficha')); }
  return f?.length ? { estado: 'dentro', yo: f[0] as Ficha } : { estado: 'sin-ficha', correo: user.email ?? '' };
}
export function useCuenta() {
  const [c, setC] = useState<Cuenta>({ estado: 'cargando' });
  useEffect(() => {
    let vivo = true;
    const actualizar = () => leer().then((x) => vivo && setC(x)).catch(() => vivo && setC({ estado: 'fuera' }));
    actualizar();
    const sub = pc?.auth.onAuthStateChange((ev) => { if (ev !== 'TOKEN_REFRESHED') actualizar(); });
    return () => { vivo = false; sub?.data.subscription.unsubscribe(); };
  }, []);
  return c;
}

const destino = (p: string) => location.origin + p;
export async function entrar(correo: string, clave: string): Promise<string | null> {
  if (DEMO) return 'Todavía no está conectada la base de datos. Usa «Entrar con datos de ejemplo».';
  const { error } = await pc!.auth.signInWithPassword({ email: correo.trim(), password: clave });
  if (!error) return null;
  if (/invalid login/i.test(error.message)) return 'El correo o la contraseña no coinciden. Si nunca creaste una, entra con un enlace al correo.';
  if (/not confirmed/i.test(error.message)) return 'Primero confirma tu correo con el enlace que te enviamos.';
  return 'No pudimos entrar. Revisa tu conexión e inténtalo de nuevo.';
}
// enlace para entrar sin contraseña (también sirve la primera vez)
export async function enlace(correo: string): Promise<string | null> {
  if (DEMO) return 'Esto funciona cuando esté conectada la base de datos.';
  const { error } = await pc!.auth.signInWithOtp({ email: correo.trim(), options: { emailRedirectTo: destino('/portal'), shouldCreateUser: true } });
  if (!error) return null;
  if (/rate|seconds/i.test(error.message)) return 'Ya te enviamos un enlace hace poco. Espera un minuto y vuelve a intentarlo.';
  return 'No pudimos enviar el enlace. Revisa el correo e inténtalo de nuevo.';
}
export async function recuperar(correo: string): Promise<string | null> {
  if (DEMO) return 'Esto funciona cuando esté conectada la base de datos.';
  const { error } = await pc!.auth.resetPasswordForEmail(correo.trim(), { redirectTo: destino('/portal/clave') });
  return error ? 'No pudimos enviar el correo. Inténtalo de nuevo en un minuto.' : null;
}
export async function nuevaClave(clave: string): Promise<string | null> {
  if (DEMO) return null;
  const { error } = await pc!.auth.updateUser({ password: clave });
  if (!error) return null;
  return /session|jwt|missing/i.test(error.message) ? 'El enlace venció. Pide uno nuevo desde «Ingresar».' : 'No se guardó la contraseña. Prueba con otra.';
}
export const entrarEjemplo = () => store.set(DEMO_KEY, true);
export async function salir() { store.del(DEMO_KEY); await pc?.auth.signOut(); }

/* ---------- mascotas e historia ---------- */
export async function misMascotas(yo: Ficha): Promise<Paciente[]> {
  if (DEMO) return (await ej.listarPacientes()).filter((m) => m.propietario_id === yo.id && m.activo);
  const { data } = await pc!.from('pacientes').select('*').eq('activo', true).order('creado');
  return (data ?? []) as Paciente[];
}
export async function historia(ids: string[]): Promise<Registro[]> {
  if (!ids.length) return [];
  if (DEMO) return (await ej.registrosDe(ids)).filter((r) => r.tipo !== 'nota' && !r.privado);
  const { data } = await pc!.from('registros').select('*').in('paciente_id', ids).order('fecha', { ascending: false });
  return (data ?? []) as Registro[];
}
export async function abrirArchivo(a: Archivo): Promise<string | null> {
  if (DEMO) return a.ruta || null;
  const { data } = await pc!.storage.from('clinica').createSignedUrl(a.ruta, 3600);
  return data?.signedUrl ?? null;
}

/* ---------- citas ---------- */
export async function misCitas(yo: Ficha, ids: string[]): Promise<Cita[]> {
  const desde = new Date(Date.now() - 365 * 86400000), hasta = new Date(Date.now() + 120 * 86400000);
  if (DEMO) return (await listarCitas(desde, hasta)).filter((c) => (c.paciente_id && ids.includes(c.paciente_id)) || c.propietario_id === yo.id);
  const { data } = await pc!.from('citas').select('*').gte('inicio', desde.toISOString()).lt('inicio', hasta.toISOString()).order('inicio');
  return (data ?? []) as Cita[];
}
// horas ocupadas de la agenda (sin datos de nadie), como citas para reusar el cálculo de horas libres
export async function ocupadas(desde: Date, hasta: Date): Promise<Cita[]> {
  if (DEMO) return (await listarCitas(desde, hasta)).filter((c) => c.estado === 'confirmada' || c.estado === 'atendida');
  const { data } = await pc!.rpc('horas_ocupadas', { desde: desde.toISOString(), hasta: hasta.toISOString() });
  return ((data ?? []) as { carril: Cita['carril']; inicio: string; fin: string }[]).map((x, i) => ({
    id: 'o' + i, carril: x.carril, inicio: x.inicio, fin: x.fin, estado: 'confirmada', servicio: 'consulta', paciente_id: null, propietario_id: null,
    origen: 'consultorio', sobrecupo: false, nota: null, direccion: null, datos: {}, por_nombre: null, creado: x.inicio
  }));
}
export async function pedirCita(c: { paciente_id: string; propietario_id: string; servicio: Servicio; carril: Cita['carril']; inicio: string; fin: string; nota: string | null; direccion: string | null }): Promise<void> {
  const fila = { ...c, estado: 'solicitada', origen: 'portal', sobrecupo: false, datos: {} };
  if (DEMO) {
    const K = 'alma-ej-citas';
    store.set(K, [...(store.get<Cita[]>(K) ?? []), { ...fila, id: 'ej-' + Date.now(), creado: new Date().toISOString(), por_nombre: null }]);
    return;
  }
  const { error } = await pc!.from('citas').insert(fila);
  if (error) throw new Error('No se pudo pedir la cita. Inténtalo de nuevo o escríbenos por WhatsApp.');
}
export async function cancelarCita(id: string): Promise<'ok' | 'tarde' | 'no'> {
  if (DEMO) {
    const K = 'alma-ej-citas';
    store.set(K, (store.get<Cita[]>(K) ?? []).map((c) => (c.id === id ? { ...c, estado: 'cancelada' } : c)));
    return 'ok';
  }
  const { data } = await pc!.rpc('cancelar_mi_cita', { p_id: id });
  return (data as 'ok' | 'tarde' | 'no') ?? 'no';
}

/* ---------- pedidos ---------- */
export interface MiPedido {
  id: string; numero: number; codigo: string; creado: string; estado: string; pago: string;
  items: { nombre: string; variante: string; precio: number; cantidad: number }[];
  subtotal: number; envio: number; prioritario: boolean; total: number; obsequio: boolean; ciudad: string; direccion: string;
}
export async function misPedidos(yo: Ficha): Promise<MiPedido[]> {
  if (DEMO) {
    const n = (s: string) => s.replace(/\D/g, '').slice(-10);
    return (await listarPedidosEj()).filter((p) => n(p.celular) === n(yo.celular)) as unknown as MiPedido[];
  }
  const { data } = await pc!.rpc('mis_pedidos');
  return (data ?? []) as MiPedido[];
}
