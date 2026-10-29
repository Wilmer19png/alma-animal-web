// Usuarios y roles: quién entra al gestor y qué puede ver. Cada persona entra con su propio correo.
// Los permisos los hace cumplir la base de datos (reglas RLS); la tabla de aquí los muestra tal como están.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { DEMO, fechaCorta, when } from './lib';
import { ROL_TXT, activarInactividad, inactividadActiva, type Rol } from './session';
import { listarMiembros, invitar, cambiarMiembro, quitarInvitacion, descargarCopia, ultimaCopia, type Miembro } from './usuarios-datos';
import { iniciales } from './clinica-datos';

const ROLES: Rol[] = ['admin', 'veterinario', 'recepcion', 'peluqueria'];
type Nivel = 'E' | 'V' | 'N' | string; // edita, ve, no; o una nota corta
const PERMISOS: [string, string, Nivel[]][] = [
  ['calendar_month', 'Hoy y agenda del consultorio', ['E', 'E', 'E', 'N']],
  ['shower', 'Citas de spa', ['E', 'E', 'E', 'E']],
  ['clinical_notes', 'Historia clínica', ['E', 'E', 'Ve y anota', 'Solo spa']],
  ['group', 'Propietarios y pacientes', ['E', 'E', 'E', 'V']],
  ['vaccines', 'Vacunas y recordatorios', ['E', 'E', 'E', 'N']],
  ['receipt_long', 'Pedidos', ['E', 'E', 'E', 'N']],
  ['inventory_2', 'Productos e inventario', ['E', 'E', 'E', 'N']],
  ['article', 'Blog', ['E', 'E', 'N', 'N']],
  ['web', 'Textos, tarifas, equipo, envíos y horarios', ['E', 'V', 'V', 'N']],
  ['admin_panel_settings', 'Usuarios y roles', ['E', 'N', 'N', 'N']]
];
const NIVEL: Record<string, [string, string, string]> = { E: ['edit', 'Edita', 'ok'], V: ['visibility', 'Ve', 'lav'], N: ['block', 'No', 'st-old'] };

export default function Usuarios() {
  const [lista, setLista] = useState<Miembro[] | null>(null);
  const [form, setForm] = useState<{ nombre: string; correo: string; rol: Rol } | null>(null);
  const [pendiente, setPendiente] = useState<string | null>(null); // correo recién agregado sin cuenta
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [inact, setInact] = useState(inactividadActiva());
  const [copia, setCopia] = useState(ultimaCopia());
  const cargar = () => listarMiembros().then(setLista).catch((e) => { setLista([]); setAviso((e as Error).message); });
  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 4000); return () => window.clearTimeout(t); }, [aviso]);

  return (
    <Shell activo="usuarios">
      {(yo) => {
        if (yo.rol !== 'admin') return <section className="gcard vacio-c"><p className="vacio">Solo la administradora maneja los usuarios del gestor.</p></section>;
        const admins = (lista ?? []).filter((m) => m.rol === 'admin' && m.activo && !m.pendiente).length;
        const agregar = async () => {
          if (!form) return;
          if (!form.nombre.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.correo.trim())) { setAviso('Escribe el nombre y un correo válido.'); return; }
          setOcupado(true);
          try {
            const r = await invitar(form.correo.trim(), form.nombre.trim(), form.rol);
            setPendiente(r === 'pendiente' ? form.correo.trim().toLowerCase() : null);
            setAviso(r === 'listo' ? `${form.nombre} ya tenía cuenta: entra desde ahora.` : 'Agregada. Falta un paso: la invitación.');
            setForm(null); cargar();
          } catch (e) { setAviso((e as Error).message); }
          setOcupado(false);
        };
        const cambiar = async (m: Miembro, c: { rol?: Rol; activo?: boolean }) => {
          const soyYo = m.id === yo.id;
          if (soyYo && (c.activo === false || (c.rol && c.rol !== 'admin'))) { setAviso('No puedes quitarte tu propio acceso de administradora.'); return; }
          try { await cambiarMiembro(m, c); setLista((l) => (l ?? []).map((x) => (x.correo === m.correo ? { ...x, ...c } : x))); setAviso('Guardado'); }
          catch (e) { setAviso((e as Error).message); }
        };
        return (
          <div className="usr">
            <div className="mhead">
              <div className="mhead__txt"><h1>Usuarios y roles</h1><p>Quién entra al gestor y qué puede ver. Cada persona entra con su propio correo.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
              <button type="button" className="gbtn sm" onClick={() => setForm(form ? null : { nombre: '', correo: '', rol: 'recepcion' })}><span className="ms" aria-hidden="true">person_add</span>Agregar persona</button>
            </div>

            {form && (
              <section className="gcard usr__form" aria-labelledby="uf">
                <h2 className="ch2" id="uf"><span className="ms" aria-hidden="true">mail</span>Agregar al gestor</h2>
                <div className="usr__f">
                  <div className="sfld"><label htmlFor="u-n">Nombre</label><input id="u-n" className="cell" value={form.nombre} placeholder="Ej: Laura Gómez" onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></div>
                  <div className="sfld"><label htmlFor="u-c">Correo</label><input id="u-c" className="cell" type="email" inputMode="email" autoComplete="off" value={form.correo} placeholder="nombre@gmail.com" onChange={(e) => setForm({ ...form, correo: e.target.value })} /></div>
                  <div className="sfld"><label htmlFor="u-r">Rol</label>
                    <select id="u-r" className="cell" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol })}>{ROLES.map((r) => <option key={r} value={r}>{ROL_TXT[r]}</option>)}</select></div>
                </div>
                <div className="dacts">
                  <button type="button" className="gbtn" disabled={ocupado} onClick={agregar}><span className="ms" aria-hidden="true">person_add</span>Agregar</button>
                  <button type="button" className="gbtn out" onClick={() => setForm(null)}>Cancelar</button>
                </div>
              </section>
            )}

            {pendiente && (
              <div className="usr__paso">
                <span className="ms" aria-hidden="true">mark_email_read</span>
                <div>
                  <b>Último paso: envíale la invitación desde Supabase (gratis)</b>
                  <ol>
                    <li>Entra a Supabase → <b>Authentication</b> → <b>Users</b> → <b>Invite user</b>.</li>
                    <li>Escribe <b>{pendiente}</b> y toca <b>Send invitation</b>.</li>
                    <li>Le llega un correo para crear su contraseña. Al crearla, entra sola con el rol que elegiste.</li>
                  </ol>
                </div>
                <button type="button" className="vrow__x" aria-label="Cerrar" onClick={() => setPendiente(null)}><span className="ms">close</span></button>
              </div>
            )}

            <section className="gcard" aria-label="Personas con acceso">
              {lista === null && <p className="vacio">Cargando…</p>}
              <div className="usr__list">
                {lista?.map((m) => (
                  <div key={m.correo} className="urow" data-off={!m.activo || undefined}>
                    <span className="av">{iniciales(m.nombre.replace(/^Dra?\.\s*/, ''))}</span>
                    <span className="row__txt"><b>{m.nombre}{m.id === yo.id && <em> · tú</em>}</b><span>{m.correo}</span></span>
                    <select className="cell urow__rol" aria-label={`Rol de ${m.nombre}`} value={m.rol} disabled={m.pendiente} onChange={(e) => cambiar(m, { rol: e.target.value as Rol })}>
                      {ROLES.map((r) => <option key={r} value={r}>{ROL_TXT[r]}</option>)}
                    </select>
                    <span className="urow__ult">{m.pendiente ? <span className="chip st-warn"><span className="ms" aria-hidden="true">schedule</span>Invitación pendiente</span> : m.ultimo ? `Entró ${when(m.ultimo)}` : 'Todavía no entra'}</span>
                    <span className="urow__acts">
                      {m.pendiente
                        ? <button type="button" className="gbtn ghost sm" onClick={async () => { if (!confirm(`¿Quitar la invitación de ${m.nombre}?`)) return; await quitarInvitacion(m); cargar(); }}>Quitar</button>
                        : <button type="button" className={'gbtn sm ' + (m.activo ? 'ghost' : 'out')} disabled={m.id === yo.id} onClick={() => { if (!m.activo || confirm(`¿Quitarle el acceso a ${m.nombre}? No podrá entrar al gestor; su historial se conserva.`)) cambiar(m, { activo: !m.activo }); }}>{m.activo ? 'Quitar acceso' : 'Devolver acceso'}</button>}
                    </span>
                  </div>
                ))}
              </div>
              {admins === 1 && <p className="hint">Hay una sola administradora. Te recomendamos dejar una segunda persona de confianza como administradora, por si algún día pierdes el acceso a tu correo.</p>}
            </section>

            <div className="usr__grid">
              <section className="gcard" aria-labelledby="up">
                <h2 className="ch2" id="up"><span className="ms" aria-hidden="true">shield_person</span>Qué puede hacer cada rol</h2>
                <div className="perm" role="table" aria-label="Permisos por rol">
                  <div className="perm__r perm__h" role="row"><span role="columnheader">Módulo</span>{ROLES.map((r) => <span key={r} role="columnheader">{ROL_TXT[r]}</span>)}</div>
                  {PERMISOS.map(([icon, mod, nv]) => (
                    <div key={mod} className="perm__r" role="row">
                      <span role="rowheader"><span className="ms" aria-hidden="true">{icon}</span>{mod}</span>
                      {nv.map((n, i) => { const x = NIVEL[n]; return <span key={i} role="cell" data-rol={ROL_TXT[ROLES[i]]}>{x ? <span className={`chip ${x[2]}`}><span className="ms" aria-hidden="true">{x[0]}</span>{x[1]}</span> : <span className="chip lav">{n}</span>}</span>; })}
                    </div>
                  ))}
                </div>
                <p className="hint">Estos permisos los protege la base de datos: aunque alguien intente entrar a otra sección, no ve los datos que no le tocan.</p>
              </section>

              <div className="usr__col">
                <section className="gcard" aria-labelledby="us">
                  <h2 className="ch2" id="us"><span className="ms" aria-hidden="true">lock</span>Seguridad</h2>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">timer_off</span>
                    <span className="regla__t"><b>Cerrar sesión por inactividad</b><span>Después de 30 minutos sin usar el gestor. Actívalo en computadores compartidos; se guarda en este computador.</span></span>
                    <button type="button" className="sw" role="switch" aria-checked={inact} aria-label="Cerrar sesión por inactividad" onClick={() => { activarInactividad(!inact); setInact(!inact); }}><i /></button>
                  </div>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">key</span>
                    <span className="regla__t"><b>Contraseñas</b><span>Cada quien cambia la suya con «¿Olvidaste tu contraseña?» al entrar. Nadie más la conoce, ni siquiera la administradora.</span></span>
                  </div>
                </section>
                <section className="gcard" aria-labelledby="uc">
                  <h2 className="ch2" id="uc"><span className="ms" aria-hidden="true">cloud_download</span>Copias de seguridad</h2>
                  <p className="canal"><span className="ms" aria-hidden="true">paid</span><span><b>Copias automáticas diarias</b> · plan pago de Supabase<span>Aproximadamente USD 25 al mes. Alternativa gratis: descargar una copia cada semana y guardarla en tu Google Drive.</span></span></p>
                  <button type="button" className="gbtn" disabled={ocupado} onClick={async () => { setOcupado(true); try { const n = await descargarCopia(); setCopia(ultimaCopia()); setAviso(`Copia descargada: ${n} filas.`); } catch { setAviso('No se pudo descargar la copia.'); } setOcupado(false); }}>
                    <span className="ms" aria-hidden="true">download</span>{ocupado ? 'Preparando…' : 'Descargar copia completa (Excel)'}</button>
                  <p className="hint">{copia ? `Última copia desde este computador: ${fechaCorta(copia)}.` : 'Todavía no has descargado una copia desde este computador.'}</p>
                  <p className="canal"><span className="ms" aria-hidden="true">policy</span><span><b>Ley 1581 de 2012</b><span>Si un cliente pide ver o borrar sus datos, lo haces desde su ficha en Propietarios. La historia clínica se conserva el tiempo que exige la ley.</span></span></p>
                </section>
              </div>
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}
