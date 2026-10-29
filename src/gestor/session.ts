// Sesión del equipo: quién entró y con qué rol. Solo entra quien tiene ficha en la tabla "equipo".
import { useEffect, useState } from 'react';
import { sb, DEMO, store } from './lib';

export type Rol = 'admin' | 'veterinario' | 'peluqueria' | 'recepcion';
export interface Miembro { id: string; nombre: string; rol: Rol; correo: string }
export type Sesion =
  | { estado: 'cargando' }
  | { estado: 'fuera' }
  | { estado: 'sin-acceso'; correo: string } // entró, pero no es del equipo (o está inactivo)
  | { estado: 'dentro'; yo: Miembro };

export const ROL_TXT: Record<Rol, string> = { admin: 'Administradora', veterinario: 'Veterinario/a', peluqueria: 'Peluquería', recepcion: 'Recepción' };

const DEMO_KEY = 'alma-gestor-ejemplo';
const DEMO_YO: Miembro = { id: 'demo', nombre: 'Dra. Mariana Hoyos', rol: 'admin', correo: 'ejemplo@almaanimal.co' };

async function leer(): Promise<Sesion> {
  if (DEMO) return store.get(DEMO_KEY) ? { estado: 'dentro', yo: DEMO_YO } : { estado: 'fuera' };
  const { data } = await sb!.auth.getSession();
  const user = data.session?.user;
  if (!user) return { estado: 'fuera' };
  const { data: fila } = await sb!.from('equipo').select('nombre, rol, activo').eq('id', user.id).maybeSingle();
  if (!fila || !fila.activo) return { estado: 'sin-acceso', correo: user.email ?? '' };
  return { estado: 'dentro', yo: { id: user.id, nombre: fila.nombre, rol: fila.rol as Rol, correo: user.email ?? '' } };
}

export function useSesion() {
  const [s, setS] = useState<Sesion>({ estado: 'cargando' });
  useEffect(() => {
    let vivo = true;
    const actualizar = () => leer().then((x) => vivo && setS(x));
    actualizar();
    const sub = sb?.auth.onAuthStateChange(() => actualizar());
    return () => { vivo = false; sub?.data.subscription.unsubscribe(); };
  }, []);
  return s;
}

export async function entrar(correo: string, clave: string): Promise<string | null> {
  if (DEMO) return 'Todavía no está conectada la base de datos. Usa «Entrar con datos de ejemplo».';
  const { error } = await sb!.auth.signInWithPassword({ email: correo.trim(), password: clave });
  if (!error) return null;
  if (/invalid login/i.test(error.message)) return 'El correo o la contraseña no coinciden.';
  if (/email not confirmed/i.test(error.message)) return 'Ese correo todavía no está confirmado.';
  return 'No pudimos entrar. Revisa tu conexión e inténtalo de nuevo.';
}

export function entrarEjemplo() { store.set(DEMO_KEY, true); }

export async function salir() {
  store.del(DEMO_KEY);
  await sb?.auth.signOut();
}

// correo para crear una contraseña nueva (lo envía Supabase)
export async function recuperar(correo: string): Promise<string | null> {
  if (DEMO) return 'Esto funciona cuando esté conectada la base de datos.';
  const destino = location.origin + '/gestor/clave';
  const { error } = await sb!.auth.resetPasswordForEmail(correo.trim(), { redirectTo: destino });
  return error ? 'No pudimos enviar el correo. Inténtalo en unos minutos.' : null;
}

export async function nuevaClave(clave: string): Promise<string | null> {
  if (DEMO) return 'Esto funciona cuando esté conectada la base de datos.';
  const { error } = await sb!.auth.updateUser({ password: clave });
  return error ? 'No pudimos guardar la contraseña. El enlace pudo vencer: pide uno nuevo.' : null;
}

// cierre de sesión por inactividad: se guarda en cada computador (no en la cuenta)
const INACT = 'alma-gestor-inactividad';
export const inactividadActiva = () => { try { return localStorage.getItem(INACT) === '1'; } catch { return false; } };
export const activarInactividad = (si: boolean) => { try { if (si) localStorage.setItem(INACT, '1'); else localStorage.removeItem(INACT); } catch { /* bloqueado */ } };
