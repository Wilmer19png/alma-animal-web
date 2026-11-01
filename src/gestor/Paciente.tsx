// Ficha del paciente (/gestor/paciente?id=…): datos, peso con su gráfica, propietario, historia clínica
// (línea de tiempo por tipo, con archivos) y carnet de vacunas y desparasitaciones.
import { useEffect, useMemo, useRef, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, waLink, prettyCel, fechaCorta, mesCorto } from './lib';
import {
  listarPacientes, listarPropietarios, registrosDe, crearRegistros, actualizarPaciente, borrarRegistro, cambiarPrivado, subirArchivo, abrirArchivo,
  nombreCompleto, edad, kg, sexoTxt, ESPECIES, TIPOS, VACUNAS, DESPARASITACIONES,
  type Paciente as TPaciente, type Propietario, type Registro, type TipoRegistro, type NuevoPaciente, type Archivo
} from './clinica-datos';
import { PacienteForm, Avatar, erroresPaciente } from './clinica-ui';
import type { Rol } from './session';
import { leerEsquemas, ESQUEMAS_BASE, type Esquemas } from './vacunas-datos';

const fechaC = fechaCorta;
const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const enDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ETIQ: Record<string, string> = {
  motivo: 'Motivo', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', temperatura: 'Temperatura (°C)', fc: 'Frecuencia cardiaca',
  fr: 'Frecuencia respiratoria', peso: 'Peso (kg)', laboratorio: 'Laboratorio', lote: 'Lote', proxima: 'Próxima dosis', producto: 'Producto'
};
// lo que cada rol puede escribir en la historia
const PUEDE: Record<Rol, TipoRegistro[]> = {
  admin: Object.keys(TIPOS) as TipoRegistro[], veterinario: Object.keys(TIPOS) as TipoRegistro[],
  recepcion: ['peso', 'spa', 'nota'], peluqueria: ['spa', 'peso', 'nota']
};

export default function Paciente() {
  const id = new URLSearchParams(location.search).get('id') ?? '';
  const [m, setM] = useState<TPaciente | null | undefined>(undefined);
  const [dueño, setDueño] = useState<Propietario | null>(null);
  const [hermanos, setHermanos] = useState<TPaciente[]>([]);
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tab, setTab] = useState<'todo' | 'carnet' | TipoRegistro>('todo');
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState<TipoRegistro | null>(null);
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const histRef = useRef<HTMLElement>(null);
  const [esq, setEsq] = useState<Esquemas>(ESQUEMAS_BASE);
  useEffect(() => { leerEsquemas().then(setEsq).catch(() => {}); }, []);

  useEffect(() => {
    (async () => {
      try {
        const [ps, os] = await Promise.all([listarPacientes(), listarPropietarios()]);
        const x = ps.find((p) => p.id === id) ?? null;
        setM(x);
        if (!x) return;
        setDueño(os.find((o) => o.id === x.propietario_id) ?? null);
        setHermanos(ps.filter((p) => p.propietario_id === x.propietario_id && p.id !== x.id));
        setRegs(await registrosDe([x.id]));
      } catch (e) { setError((e as Error).message); setM(null); }
    })();
  }, [id]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3000); return () => window.clearTimeout(t); }, [aviso]);

  const cuentas = useMemo(() => { const c: Record<string, number> = {}; regs?.forEach((r) => { c[r.tipo] = (c[r.tipo] ?? 0) + 1; }); return c; }, [regs]);
  const visibles = useMemo(() => {
    const t = norm(q.trim());
    return (regs ?? []).filter((r) => (tab === 'todo' || r.tipo === tab) && (!t || norm(`${r.titulo} ${r.resumen ?? ''} ${Object.values(r.datos).join(' ')}`).includes(t)));
  }, [regs, tab, q]);

  return (
    <Shell activo="pacientes">
      {(yo) => {
        if (m === undefined) return <p className="vacio">Cargando la ficha…</p>;
        if (m === null) return (
          <div className="gcard vacio-c"><b>No encontramos este paciente</b>{error && <span>{error}</span>}<a className="gbtn" href={link('/gestor/pacientes')}>Ir a Pacientes</a></div>
        );
        const tipos = PUEDE[yo.rol];
        return (
          <div className="ficha">
            <nav className="miga" aria-label="Estás en"><a href={link('/gestor/pacientes')}>Pacientes</a><span className="ms" aria-hidden="true">chevron_right</span><span aria-current="page">{m.nombre}</span>{DEMO && <span className="ex">Datos de ejemplo</span>}</nav>

            {/* ---------- CABECERA ---------- */}
            <section className="gcard fhead" aria-labelledby="pn">
              <Avatar txt={m.nombre[0]} foto={m.foto} grande />
              <div className="fhead__txt">
                <h1 id="pn">{m.nombre}{!m.activo && <span className="chip">Inactivo</span>}</h1>
                <div className="fhead__chips">
                  <span className="chip lav">{ESPECIES[m.especie]}{m.raza ? ` · ${m.raza}` : ''}</span>
                  <span className="chip lav">{sexoTxt(m)}</span>
                  {edad(m) && <span className="chip lav">{edad(m)}</span>}
                  {m.peso != null && <span className="chip lav">{kg(m.peso)}</span>}
                  {m.alergias && <span className="chip alerta"><span className="ms" aria-hidden="true">warning</span>Alérgico/a a: {m.alergias}</span>}
                </div>
              </div>
              <div className="fhead__acts">
                <a className="gbtn out" href={link('/gestor/agenda') + `?paciente=${m.id}`}><span className="ms" aria-hidden="true">event</span>Agendar cita</a>
                <button className="gbtn out" type="button" onClick={() => { setNuevo('examen'); setMenu(false); setTab('todo'); setTimeout(() => histRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}><span className="ms" aria-hidden="true">upload_file</span>Subir examen</button>
                <button className="gbtn out" type="button" onClick={() => { setTab('carnet'); histRef.current?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ms" aria-hidden="true">badge</span>Carnet</button>
                <div className="menu-w">
                  <button className="gbtn" type="button" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><span className="ms" aria-hidden="true">add</span>Nuevo registro</button>
                  {menu && (
                    <div className="menu" role="menu">
                      {tipos.map((t) => (
                        <button key={t} type="button" role="menuitem" onClick={() => { setNuevo(t); setMenu(false); setTab('todo'); setTimeout(() => histRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}>
                          <span className="ms" aria-hidden="true">{TIPOS[t].icon}</span>{TIPOS[t].txt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="ficha__grid">
              {/* ---------- IZQUIERDA ---------- */}
              <div className="ficha__side">
                <section className="gcard" aria-labelledby="dp">
                  <h2 className="ch2" id="dp"><span className="ms" aria-hidden="true">pets</span>Datos del paciente
                    {!editando && <button className="link-add" type="button" onClick={() => setEditando(true)}>Editar</button>}</h2>
                  {editando
                    ? <EditarPaciente m={m} listo={(x, msg) => { if (x) setM(x); setEditando(false); if (msg) setAviso(msg); }} />
                    : (
                      <dl className="kv">
                        <div><dt>Especie</dt><dd>{ESPECIES[m.especie]}</dd></div>
                        <div><dt>Raza</dt><dd>{m.raza ?? '—'}</dd></div>
                        <div><dt>Color</dt><dd>{m.color ?? '—'}</dd></div>
                        <div><dt>Sexo</dt><dd>{sexoTxt(m)}</dd></div>
                        <div><dt>Nacimiento</dt><dd>{m.nacimiento ? `${fechaC(m.nacimiento + 'T12:00:00')} · ${edad(m)}` : m.edad_aprox ? `Aprox. ${m.edad_aprox}` : '—'}</dd></div>
                        <div><dt>Microchip</dt><dd>{m.microchip ?? '—'}</dd></div>
                        <div className="full"><dt>Alimento</dt><dd>{[m.alimento, m.alimento_cant].filter(Boolean).join(' · ') || '—'}</dd></div>
                        <div><dt>Alergias</dt><dd className={m.alergias ? 'rojo' : ''}>{m.alergias ?? 'Ninguna conocida'}</dd></div>
                        <div><dt>Condiciones crónicas</dt><dd>{m.cronicas ?? '—'}</dd></div>
                        {m.extras.filter(([k]) => k).map(([k, v]) => <div className="full" key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}
                      </dl>
                    )}
                </section>

                <Peso regs={regs ?? []} actual={m.peso} />

                {dueño && (
                  <section className="gcard" aria-labelledby="pr">
                    <h2 className="ch2" id="pr"><span className="ms" aria-hidden="true">person</span>Propietario/a</h2>
                    <div className="own"><b>{nombreCompleto(dueño)}</b><span>{prettyCel(dueño.celular)}{dueño.correo ? ` · ${dueño.correo}` : ''}</span>
                      {(dueño.direccion || dueño.barrio) && <span>{[dueño.direccion, dueño.barrio, dueño.ciudad].filter(Boolean).join(' · ')}</span>}</div>
                    {hermanos.length > 0 && <div className="own__pets"><span>Otras mascotas:</span>{hermanos.map((h) => <a key={h.id} className="chip lav" href={link('/gestor/paciente') + `?id=${h.id}`}>{h.nombre}{h.raza ? ` · ${h.raza}` : ''}</a>)}</div>}
                    <div className="dacts">
                      <a className="gbtn wa sm" href={waLink(dueño.celular, `Hola, ${dueño.nombre}. Te escribimos de Alma Animal sobre ${m.nombre}.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>WhatsApp</a>
                      <a className="gbtn out sm" href={link('/gestor/propietarios') + `?id=${dueño.id}`}><span className="ms" aria-hidden="true">person</span>Ver propietario</a>
                    </div>
                  </section>
                )}
              </div>

              {/* ---------- HISTORIA CLÍNICA ---------- */}
              <section className="gcard hist" aria-labelledby="hc" ref={histRef}>
                <div className="hist__head">
                  <h2 className="ch2" id="hc"><span className="ms" aria-hidden="true">history_edu</span>Historia clínica</h2>
                  <label className="gsearch sm"><span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar en la historia</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar. Ej: otitis, hemograma" /></label>
                </div>
                <div className="tabs" role="tablist" aria-label="Tipo de registro">
                  <button type="button" role="tab" aria-selected={tab === 'todo'} onClick={() => setTab('todo')}>Todo<span>{regs?.length ?? 0}</span></button>
                  <button type="button" role="tab" aria-selected={tab === 'carnet'} onClick={() => setTab('carnet')}><span className="ms" aria-hidden="true">badge</span>Carnet</button>
                  {(Object.keys(TIPOS) as TipoRegistro[]).filter((t) => cuentas[t]).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}><span className="ms" aria-hidden="true">{TIPOS[t].icon}</span>{TIPOS[t].txt}<span>{cuentas[t]}</span></button>
                  ))}
                </div>

                {nuevo && <NuevoRegistro tipo={nuevo} m={m} esq={esq} autor={yo.nombre} cerrar={() => setNuevo(null)}
                  guardado={(rs) => { setRegs((l) => [...rs, ...(l ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))); const p = rs.find((r) => r.datos.peso); if (p) setM((x) => x && ({ ...x, peso: Number(p.datos.peso.replace(',', '.')) })); setNuevo(null); setAviso('Registro guardado en la historia'); }} />}

                {tab === 'carnet'
                  ? <Carnet m={m} regs={regs ?? []} dueño={dueño} />
                  : (
                    <ol className="tl">
                      {regs === null && <li className="vacio">Cargando la historia…</li>}
                      {regs && !visibles.length && <li className="tl__vacio"><span className="ms" aria-hidden="true">inventory</span><b>{q ? 'Nada coincide con la búsqueda' : `${m.nombre} aún no tiene registros${tab !== 'todo' ? ' de este tipo' : ''}`}</b><span>Agrégalo con «Nuevo registro» y quedará en su historia.</span></li>}
                      {visibles.map((r) => <Entrada key={r.id} r={r} puedeBorrar={yo.rol === 'admin'} borrar={async () => {
                        if (!confirm(`¿Borrar «${r.titulo}» de la historia de ${m.nombre}? No se puede deshacer.`)) return;
                        try { await borrarRegistro(r.id); setRegs((l) => l!.filter((x) => x.id !== r.id)); setAviso('Registro borrado'); } catch (e) { setAviso((e as Error).message); }
                      }} />)}
                    </ol>
                  )}
              </section>
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}

/* ---------- editar datos ---------- */
function EditarPaciente({ m, listo }: { m: TPaciente; listo: (m: TPaciente | null, msg?: string) => void }) {
  const [v, setV] = useState<NuevoPaciente>(m);
  const [err, setErr] = useState<Record<string, string>>({});
  const [falla, setFalla] = useState('');
  const guardar = async () => {
    const e = erroresPaciente(v); setErr(e);
    if (Object.keys(e).length) return;
    try {
      const { propietario_id, nombre, especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip, alimento, alimento_cant, alergias, cronicas, extras, foto, activo } = v;
      listo(await actualizarPaciente(m.id, { propietario_id, nombre: nombre.trim(), especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip, alimento, alimento_cant, alergias, cronicas, extras: extras.filter(([k]) => k.trim()), foto, activo }), 'Datos guardados');
    } catch (e) { setFalla((e as Error).message); }
  };
  return (
    <div className="edit-p">
      <PacienteForm v={v} set={(c) => setV((x) => ({ ...x, ...c }))} errores={err} idp="ep" />
      <label className="chk-l"><input type="checkbox" checked={!v.activo} onChange={(e) => setV((x) => ({ ...x, activo: !e.target.checked }))} />Ya no es paciente (falleció o se fue)</label>
      {falla && <p className="gerr" role="alert">{falla}</p>}
      <div className="dacts"><button className="gbtn" type="button" onClick={guardar}><span className="ms" aria-hidden="true">check</span>Guardar</button><button className="gbtn out" type="button" onClick={() => listo(null)}>Cancelar</button></div>
    </div>
  );
}

/* ---------- peso ---------- */
function Peso({ regs, actual }: { regs: Registro[]; actual: number | null }) {
  const puntos = regs.filter((r) => r.datos.peso).map((r) => ({ f: r.fecha, v: Number(String(r.datos.peso).replace(',', '.')) })).filter((p) => p.v > 0).sort((a, b) => a.f.localeCompare(b.f));
  const W = 320, H = 110, P = 14;
  const min = Math.min(...puntos.map((p) => p.v)), max = Math.max(...puntos.map((p) => p.v));
  const x = (i: number) => P + (puntos.length < 2 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (puntos.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - P - ((v - min) * (H - 2 * P)) / (max - min));
  return (
    <section className="gcard" aria-labelledby="pw">
      <h2 className="ch2" id="pw"><span className="ms" aria-hidden="true">monitor_weight</span>Peso<b className="ch2__val">{actual != null ? kg(actual) : '—'}</b></h2>
      {puntos.length ? (
        <svg className="peso" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Peso: ${puntos.map((p) => `${fechaC(p.f)} ${kg(p.v)}`).join(', ')}`}>
          <polyline points={puntos.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
          {puntos.map((p, i) => (
            <g key={i}><circle cx={x(i)} cy={y(p.v)} r="4.5" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
              {(i === 0 || i === puntos.length - 1 || p.v === max || p.v === min) && <text x={x(i)} y={y(p.v) - 9} textAnchor="middle">{String(p.v).replace('.', ',')}</text>}
              {(i === 0 || i === puntos.length - 1) && <text className="peso__f" x={x(i)} y={H + 14} textAnchor="middle">{mesCorto(p.f)}</text>}
            </g>
          ))}
        </svg>
      ) : <p className="hint">Todavía no hay pesos registrados.</p>}
      <span className="hint">Se registra en cada consulta, en cada baño y en los controles de peso.</span>
    </section>
  );
}

/* ---------- una entrada de la historia ---------- */
function Entrada({ r, puedeBorrar, borrar }: { r: Registro; puedeBorrar: boolean; borrar: () => void }) {
  const [privado, setPrivado] = useState(!!r.privado);
  const alternar = async () => { const n = !privado; setPrivado(n); try { await cambiarPrivado(r.id, n); } catch { setPrivado(!n); } };
  const filas = Object.entries(r.datos).filter(([k, v]) => v && ETIQ[k]);
  const abrir = async (a: Archivo) => { const u = await abrirArchivo(a); if (u) window.open(u, '_blank', 'noopener'); };
  return (
    <li className="tl__item">
      <span className="tl__fecha">{fechaC(r.fecha)}</span>
      <span className="tl__dot" aria-hidden="true"><span className="ms">{TIPOS[r.tipo].icon}</span></span>
      <article className="tl__card">
        <div className="tl__top">
          <span className="tl__kind">{TIPOS[r.tipo].txt}{r.externo ? ' · aplicada en otra veterinaria' : ''}</span>
          <b>{r.titulo}</b>
          {r.por_nombre && <span className="hint">{r.por_nombre}</span>}
          {puedeBorrar && <button type="button" className="vrow__x tl__x" aria-label={`Borrar ${r.titulo}`} onClick={borrar}><span className="ms">delete</span></button>}
        </div>
        {r.resumen && <p>{r.resumen}</p>}
        {filas.length > 0 && <dl className="tl__dl">{filas.map(([k, v]) => <div key={k}><dt>{ETIQ[k]}</dt><dd>{k === 'proxima' ? fechaC(v + 'T12:00:00') : v}</dd></div>)}</dl>}
        {r.archivos.length > 0 && <div className="tl__files">{r.archivos.map((a, i) => (
          <button key={i} type="button" className="chip lav" onClick={() => abrir(a)} disabled={!a.ruta}><span className="ms" aria-hidden="true">{a.tipo.includes('pdf') ? 'picture_as_pdf' : 'image'}</span>{a.nombre}</button>
        ))}</div>}
        {r.tipo !== 'nota' && <button type="button" className="tl__vis" data-priv={privado || undefined} onClick={alternar} title="Toca para cambiar">
          <span className="ms" aria-hidden="true">{privado ? 'visibility_off' : 'visibility'}</span>{privado ? 'Solo el equipo · no sale en el portal' : 'El dueño lo ve en su portal'}</button>}
      </article>
    </li>
  );
}

/* ---------- carnet ---------- */
function Carnet({ m, regs, dueño }: { m: TPaciente; regs: Registro[]; dueño: Propietario | null }) {
  const vax = regs.filter((r) => r.tipo === 'vacuna' || r.tipo === 'desparasitacion');
  const estado = (r: Registro): [string, string] => {
    if (!r.datos.proxima) return ['Aplicada', 'ok'];
    const d = (new Date(r.datos.proxima + 'T12:00:00').getTime() - Date.now()) / 86400000;
    return d < 0 ? ['Vencida', 'mal'] : d <= 30 ? ['Vence pronto', 'warn'] : ['Al día', 'ok'];
  };
  // solo la aplicación más reciente de cada vacuna cuenta para el estado
  const vistos = new Set<string>();
  return (
    <div className="carnet">
      <div className="carnet__top">
        <p>Esto es lo que verá {dueño ? dueño.nombre : 'el propietario'} en su portal. Cada vacuna lleva el sello de su laboratorio.</p>
        {dueño && <a className="gbtn wa sm" href={waLink(dueño.celular, `Hola, ${dueño.nombre}. Este es el carnet de vacunas de ${m.nombre}:\n` + vax.map((r) => `• ${r.titulo}: ${fechaC(r.fecha)}${r.datos.proxima ? ` · próxima ${fechaC(r.datos.proxima + 'T12:00:00')}` : ''}`).join('\n'))} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Enviar a {dueño.nombre}</a>}
      </div>
      {!vax.length && <p className="hint">Todavía no tiene vacunas ni desparasitaciones registradas.</p>}
      <div className="vax">
        {vax.map((r) => {
          const repetida = vistos.has(r.titulo); vistos.add(r.titulo);
          const [st, cls] = repetida ? ['Anterior', 'old'] : estado(r);
          const lab = r.datos.laboratorio || (r.externo ? 'Otra veterinaria' : 'Alma Animal');
          return (
            <article className="vcard" key={r.id}>
              <div className="vcard__top">
                <div><b>{r.titulo}</b><span className={`chip st-${cls}`}>{st}</span></div>
                <svg className="sello" viewBox="0 0 84 84" role="img" aria-label={`Sello de ${lab}${r.datos.lote ? `, lote ${r.datos.lote}` : ''}`}>
                  <circle cx="42" cy="42" r="38" fill="none" stroke="currentColor" strokeWidth="2.5" />
                  <circle cx="42" cy="42" r="31" fill="none" stroke="currentColor" strokeWidth="1" strokeDasharray="3 3" />
                  <text x="42" y="40" textAnchor="middle" className="sello__lab">{lab.slice(0, 14)}</text>
                  <text x="42" y="53" textAnchor="middle" className="sello__lote">{r.datos.lote ? `Lote ${r.datos.lote}` : fechaC(r.fecha)}</text>
                </svg>
              </div>
              <dl>
                <div><dt>Aplicada</dt><dd>{fechaC(r.fecha)}</dd></div>
                <div><dt>Próxima dosis</dt><dd>{r.datos.proxima ? fechaC(r.datos.proxima + 'T12:00:00') : '—'}</dd></div>
                <div><dt>{r.tipo === 'vacuna' ? 'Laboratorio' : 'Producto'}</dt><dd>{r.datos.laboratorio || r.datos.producto || '—'}</dd></div>
                <div><dt>Aplicó</dt><dd>{r.externo ? 'Otra veterinaria' : r.por_nombre ?? '—'}</dd></div>
              </dl>
            </article>
          );
        })}
      </div>
    </div>
  );
}

/* ---------- nuevo registro ---------- */
interface Campo { k: string; label: string; tipo?: 'text' | 'area' | 'date' | 'num' | 'select'; opts?: string[]; req?: boolean; ph?: string; dato?: boolean }
const CAMPOS = (t: TipoRegistro, m: TPaciente): Campo[] => {
  switch (t) {
    case 'consulta': return [
      { k: 'motivo', label: 'Motivo de consulta', req: true, ph: 'Ej: Se rasca la oreja hace 4 días', dato: true },
      { k: 'resumen', label: 'Anamnesis y examen físico', tipo: 'area', ph: 'Lo que cuenta el propietario y lo que encuentras al examinar.' },
      { k: 'temperatura', label: 'Temperatura (°C)', tipo: 'num', ph: 'Ej: 38,6', dato: true }, { k: 'fc', label: 'Frecuencia cardiaca', tipo: 'num', ph: 'Ej: 110', dato: true },
      { k: 'fr', label: 'Frecuencia respiratoria', tipo: 'num', ph: 'Ej: 24', dato: true }, { k: 'peso', label: 'Peso (kg)', tipo: 'num', ph: 'Ej: 8,4', dato: true },
      { k: 'diagnostico', label: 'Diagnóstico', ph: 'Ej: Otitis externa', dato: true }, { k: 'tratamiento', label: 'Tratamiento', tipo: 'area', ph: 'Ej: Gotas óticas cada 12 horas por 7 días', dato: true }
    ];
    case 'vacuna': return [
      { k: 'titulo', label: 'Vacuna', tipo: 'select', opts: [...VACUNAS[m.especie], 'Otra'], req: true },
      { k: 'laboratorio', label: 'Laboratorio', ph: 'Ej: Zoetis', dato: true }, { k: 'lote', label: 'Lote', ph: 'Ej: A1234', dato: true },
      { k: 'proxima', label: 'Próxima dosis', tipo: 'date', dato: true }
    ];
    case 'desparasitacion': return [
      { k: 'titulo', label: 'Tipo', tipo: 'select', opts: DESPARASITACIONES, req: true },
      { k: 'producto', label: 'Producto', ph: 'Ej: Antiparasitario de amplio espectro', dato: true }, { k: 'proxima', label: 'Próxima dosis', tipo: 'date', dato: true }
    ];
    case 'peso': return [{ k: 'peso', label: 'Peso (kg)', tipo: 'num', req: true, ph: 'Ej: 8,4', dato: true }, { k: 'resumen', label: 'Nota', tipo: 'area', ph: 'Opcional' }];
    case 'spa': return [{ k: 'titulo', label: 'Servicio', req: true, ph: 'Ej: Baño completo y corte' }, { k: 'peso', label: 'Peso (kg)', tipo: 'num', ph: 'Ej: 8,4', dato: true }, { k: 'resumen', label: 'Observaciones', tipo: 'area', ph: 'Ej: Piel un poco seca detrás de las orejas.' }];
    case 'formula': return [{ k: 'titulo', label: 'Medicamento', req: true, ph: 'Ej: Gotas óticas' }, { k: 'resumen', label: 'Indicaciones', tipo: 'area', req: true, ph: 'Ej: 4 gotas en el oído derecho cada 12 horas por 7 días.' }];
    case 'examen': return [{ k: 'titulo', label: 'Examen', req: true, ph: 'Ej: Hemograma, química sanguínea' }, { k: 'resumen', label: 'Resultados', tipo: 'area', ph: 'Lo más importante del resultado.' }];
    case 'imagen': return [{ k: 'titulo', label: 'Estudio', req: true, ph: 'Ej: Radiografía de cadera' }, { k: 'resumen', label: 'Hallazgos', tipo: 'area' }];
    case 'hospitalizacion': return [{ k: 'titulo', label: 'Motivo', req: true, ph: 'Ej: Gastroenteritis' }, { k: 'resumen', label: 'Evolución', tipo: 'area' }];
    case 'nota': return [{ k: 'titulo', label: 'Título', req: true, ph: 'Ej: Llamada de seguimiento' }, { k: 'resumen', label: 'Nota', tipo: 'area', req: true }];
    default: return [{ k: 'titulo', label: t === 'cirugia' ? 'Cirugía' : 'Procedimiento', req: true, ph: t === 'cirugia' ? 'Ej: Esterilización' : 'Ej: Limpieza dental' }, { k: 'resumen', label: 'Descripción', tipo: 'area' }];
  }
};
const CON_ARCHIVOS: TipoRegistro[] = ['examen', 'imagen', 'cirugia', 'procedimiento', 'formula', 'hospitalizacion', 'consulta'];

function NuevoRegistro({ tipo, m, esq, autor, cerrar, guardado }: { tipo: TipoRegistro; m: TPaciente; esq: Esquemas; autor: string; cerrar: () => void; guardado: (r: Registro[]) => void }) {
  const campos = CAMPOS(tipo, m);
  const [v, setV] = useState<Record<string, string>>(() => ({
    fecha: hoyISO(),
    ...(tipo === 'vacuna' ? { titulo: VACUNAS[m.especie][0], proxima: enDias(esq[VACUNAS[m.especie][0]] ?? 365) } : {}),
    ...(tipo === 'desparasitacion' ? { titulo: DESPARASITACIONES[0], proxima: enDias(esq[DESPARASITACIONES[0]] ?? 90) } : {}),
    ...(tipo === 'spa' ? { titulo: 'Baño completo' } : {})
  }));
  const [otra, setOtra] = useState('');
  const [externo, setExterno] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [privado, setPrivado] = useState(false);
  const [err, setErr] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const guardar = async () => {
    const falta = campos.find((c) => c.req && !(c.k === 'titulo' && v.titulo === 'Otra' ? otra.trim() : (v[c.k] ?? '').trim()));
    if (falta) { setErr(`Falta: ${falta.label.toLowerCase()}.`); return; }
    if (v.peso && !/^\d+([.,]\d+)?$/.test(v.peso.trim())) { setErr('Escribe el peso solo con números. Ej: 8,4'); return; }
    setErr(''); setOcupado(true);
    try {
      const subidos = [];
      for (const f of archivos) subidos.push(await subirArchivo(f, `pacientes/${m.id}`));
      const datos = Object.fromEntries(campos.filter((c) => c.dato && v[c.k]?.trim()).map((c) => [c.k, v[c.k].trim()]));
      const titulo = (v.titulo === 'Otra' ? otra : v.titulo) || (tipo === 'consulta' ? (v.diagnostico || v.motivo) : TIPOS[tipo].txt);
      const rs = await crearRegistros([{
        paciente_id: m.id, tipo, fecha: new Date(v.fecha).toISOString(), titulo: titulo.trim().slice(0, 120), resumen: v.resumen?.trim() || null,
        datos, archivos: subidos, externo, por_nombre: externo ? null : autor, ...(privado ? { privado: true } : {})
      }]);
      guardado(rs);
    } catch (e) { setErr((e as Error).message); }
    setOcupado(false);
  };

  return (
    <div className="nreg" role="group" aria-labelledby="nreg-t">
      <div className="nreg__head"><span className="ms" aria-hidden="true">{TIPOS[tipo].icon}</span><b id="nreg-t">Nuevo registro: {TIPOS[tipo].txt.toLowerCase()}</b>
        <button type="button" className="vrow__x" aria-label="Cerrar" onClick={cerrar}><span className="ms">close</span></button></div>
      <div className="grid2g">
        <div className="fld"><label htmlFor="nr-fecha">Fecha y hora</label><input id="nr-fecha" type="datetime-local" value={v.fecha} max={hoyISO()} onChange={(e) => setV((x) => ({ ...x, fecha: e.target.value }))} /></div>
        {campos.map((c) => (
          <div key={c.k} className={'fld' + (c.tipo === 'area' ? ' full' : '')}>
            <label htmlFor={`nr-${c.k}`}>{c.label}{c.req && <span className="req"> *</span>}</label>
            {c.tipo === 'area' ? <textarea id={`nr-${c.k}`} value={v[c.k] ?? ''} placeholder={c.ph} onChange={(e) => setV((x) => ({ ...x, [c.k]: e.target.value }))} />
              : c.tipo === 'select' ? <select id={`nr-${c.k}`} value={v[c.k] ?? ''} onChange={(e) => { const t = e.target.value; setV((x) => ({ ...x, [c.k]: t, ...(c.k === 'titulo' && esq[t] ? { proxima: new Date(new Date(x.fecha).getTime() + esq[t] * 86400000).toISOString().slice(0, 10) } : {}) })); }}>{c.opts!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input id={`nr-${c.k}`} type={c.tipo === 'date' ? 'date' : 'text'} inputMode={c.tipo === 'num' ? 'decimal' : undefined} value={v[c.k] ?? ''} placeholder={c.ph} onChange={(e) => setV((x) => ({ ...x, [c.k]: e.target.value }))} />}
            {c.k === 'titulo' && v.titulo === 'Otra' && <input aria-label="¿Cuál?" value={otra} placeholder="¿Cuál?" onChange={(e) => setOtra(e.target.value)} />}
          </div>
        ))}
      </div>
      {(tipo === 'vacuna' || tipo === 'desparasitacion') && <label className="chk-l"><input type="checkbox" checked={externo} onChange={(e) => setExterno(e.target.checked)} />Se la aplicaron en otra veterinaria</label>}
      {CON_ARCHIVOS.includes(tipo) && <Adjuntos archivos={archivos} setArchivos={setArchivos} />}
      {tipo !== 'nota' && (
        <label className="chk-l"><input type="checkbox" checked={!privado} onChange={(e) => setPrivado(!e.target.checked)} />El dueño lo puede ver en su portal{privado && <span className="hint"> · quedará solo para el equipo</span>}</label>
      )}
      {err && <p className="gerr" role="alert">{err}</p>}
      <div className="dacts"><button className="gbtn" type="button" onClick={guardar} disabled={ocupado}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : 'Guardar en la historia'}</button><button className="gbtn out" type="button" onClick={cerrar}>Cancelar</button></div>
    </div>
  );
}

/* ---------- adjuntos: elegir, tomar foto, arrastrar y vista previa ---------- */
function Adjuntos({ archivos, setArchivos }: { archivos: File[]; setArchivos: (f: File[]) => void }) {
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState('');
  const [vistas, setVistas] = useState<string[]>([]);
  useEffect(() => {
    const urls = archivos.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
    setVistas(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [archivos]);
  const sumar = (lista: FileList | File[] | null) => {
    const nuevos = [...(lista ?? [])];
    const malos = nuevos.filter((f) => !(f.type.startsWith('image/') || f.type === 'application/pdf'));
    const grandes = nuevos.filter((f) => f.type === 'application/pdf' && f.size > 10 * 1024 * 1024);
    setError(malos.length ? 'Solo se pueden subir fotos o PDF.' : grandes.length ? `«${grandes[0].name}» pesa más de 10 MB.` : '');
    setArchivos([...archivos, ...nuevos.filter((f) => !malos.includes(f) && !grandes.includes(f))].slice(0, 12));
  };
  return (
    <div className="fld">
      <span className="fld__lb">Archivos <small>(fotos o PDF del resultado; quedan privados y las fotos se achican solas)</small></span>
      <div className={'adj' + (encima ? ' is-over' : '')}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }} onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); sumar(e.dataTransfer.files); }}>
        <span className="ms adj__ic" aria-hidden="true">cloud_upload</span>
        <span className="adj__t">Arrastra aquí los archivos o elige cómo subirlos</span>
        <span className="adj__b">
          <label className="gbtn out sm"><span className="ms" aria-hidden="true">attach_file</span>Elegir archivos
            <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { sumar(e.target.files); e.target.value = ''; }} /></label>
          <label className="gbtn out sm adj__cam"><span className="ms" aria-hidden="true">photo_camera</span>Tomar foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { sumar(e.target.files); e.target.value = ''; }} /></label>
        </span>
      </div>
      {error && <p className="gerr" role="alert">{error}</p>}
      {archivos.length > 0 && (
        <ul className="adj__l">
          {archivos.map((f, i) => (
            <li key={i}>
              {vistas[i] ? <img src={vistas[i]} alt="" /> : <span className="ms" aria-hidden="true">picture_as_pdf</span>}
              <span title={f.name}>{f.name}</span>
              <button type="button" className="vrow__x" aria-label={`Quitar ${f.name}`} onClick={() => setArchivos(archivos.filter((_, k) => k !== i))}><span className="ms">close</span></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
