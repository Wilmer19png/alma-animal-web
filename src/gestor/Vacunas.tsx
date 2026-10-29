// Vacunas y recordatorios: lo que les toca a los pacientes (vencidas, esta semana, este mes, más adelante),
// mensaje listo para WhatsApp, registro del último aviso y esquemas de vacunación.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, waLink, prettyCel, fechaCorta } from './lib';
import { listarPacientes, listarPropietarios, proximasDosis, nombreCompleto, edad, ESPECIES, type Paciente, type Propietario, type Registro } from './clinica-datos';
import { leerEsquemas, guardarEsquemas, ultimosAvisos, registrarAviso, type Esquemas, type Aviso } from './vacunas-datos';
import { MESES } from './agenda-datos';

type Grupo = 'vencidas' | 'semana' | 'mes' | 'despues';
const GRUPOS: { id: Grupo; txt: string; icon: string; cls: string }[] = [
  { id: 'vencidas', txt: 'Vencidas', icon: 'error', cls: 'i--red' }, { id: 'semana', txt: 'Esta semana', icon: 'schedule', cls: 'i--amber' },
  { id: 'mes', txt: 'Este mes', icon: 'event', cls: 'i--lav' }, { id: 'despues', txt: 'Más adelante', icon: 'event_upcoming', cls: 'i--peach' }
];
const diasA = (f: string) => Math.round((new Date(f + 'T12:00:00').getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000);
const grupoDe = (d: number): Grupo => (d < 0 ? 'vencidas' : d <= 7 ? 'semana' : d <= 31 ? 'mes' : 'despues');
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Vacunas() {
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [props, setProps] = useState<Propietario[]>([]);
  const [avisos, setAvisos] = useState<Record<string, Aviso>>({});
  const [esq, setEsq] = useState<Esquemas | null>(null);
  const [grupo, setGrupo] = useState<Grupo | 'todo'>('vencidas');
  const [tipo, setTipo] = useState<'todo' | 'vacuna' | 'desparasitacion'>('todo');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    Promise.all([proximasDosis(90), listarPacientes(), listarPropietarios(), leerEsquemas()]).then(async ([r, p, o, e]) => {
      const activos = r.filter((x) => p.find((m) => m.id === x.paciente_id)?.activo !== false);
      setRegs(activos); setPacs(p); setProps(o); setEsq(e);
      setAvisos(await ultimosAvisos(activos.map((x) => x.id)));
      setGrupo((['vencidas', 'semana', 'mes', 'despues'] as Grupo[]).find((g) => activos.some((x) => grupoDe(diasA(x.datos.proxima)) === g)) ?? 'todo');
    }).catch(() => setRegs([]));
  }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const pac = (id: string) => pacs.find((p) => p.id === id);
  const dueño = (p?: Paciente) => props.find((o) => o.id === p?.propietario_id);
  const cuentas = useMemo(() => { const c: Record<string, number> = {}; regs?.forEach((r) => { const g = grupoDe(diasA(r.datos.proxima)); c[g] = (c[g] ?? 0) + 1; }); return c; }, [regs]);
  const filas = useMemo(() => {
    const t = norm(q.trim());
    return (regs ?? []).filter((r) => {
      const p = pac(r.paciente_id), d = dueño(p);
      return (grupo === 'todo' || grupoDe(diasA(r.datos.proxima)) === grupo) && (tipo === 'todo' || r.tipo === tipo)
        && (!t || norm(`${p?.nombre ?? ''} ${d ? nombreCompleto(d) : ''} ${r.titulo}`).includes(t));
    });
  }, [regs, grupo, tipo, q, pacs, props]); // eslint-disable-line react-hooks/exhaustive-deps

  const actual = regs?.find((r) => r.id === sel) ?? null;
  const textoPara = (r: Registro) => {
    const p = pac(r.paciente_id), d = dueño(p), dias = diasA(r.datos.proxima), f = new Date(r.datos.proxima + 'T12:00:00');
    const cuando = dias < 0 ? `se le venció el ${f.getDate()} de ${MESES[f.getMonth()]}` : dias === 0 ? 'le toca hoy' : `le toca el ${f.getDate()} de ${MESES[f.getMonth()]}`;
    return `Hola, ${d?.nombre ?? ''} 🐾 Te escribimos de Alma Animal: a ${p?.nombre} ${cuando} ${r.titulo.toLowerCase()}. ¿Te agendamos una cita? Respóndenos por aquí y te damos las horas libres.`;
  };
  const abrir = (r: Registro) => { setSel(r.id); setMsg(textoPara(r)); };

  return (
    <Shell activo="vacunas" insignias={{ vacunas: cuentas.vencidas ?? 0 }}>
      {(yo) => (
        <div className="vac">
          <div className="mhead">
            <div className="mhead__txt"><h1>Vacunas y recordatorios</h1><p>Lo que les toca a tus pacientes: vacunas y desparasitaciones. Avisa a los propietarios antes de que se venza.</p></div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
          </div>
          <div className="sum" role="group" aria-label="Filtrar por urgencia">
            {GRUPOS.map((g) => (
              <button key={g.id} type="button" className="sum__b" aria-pressed={grupo === g.id} onClick={() => setGrupo(g.id)}>
                <span className={`i ${g.cls}`}><span className="ms" aria-hidden="true">{g.icon}</span></span><b>{cuentas[g.id] ?? 0}</b>{g.txt}
              </button>
            ))}
            <button type="button" className="sum__b" aria-pressed={grupo === 'todo'} onClick={() => setGrupo('todo')}>Todo</button>
          </div>

          <div className="vac__grid">
            <section className="gcard" aria-label="Pendientes">
              <div className="vac__tools">
                <div className="filts" role="group" aria-label="Tipo">
                  {([['todo', 'Todo'], ['vacuna', 'Vacunas'], ['desparasitacion', 'Desparasitación']] as const).map(([id, t]) => <button key={id} type="button" className="filt" aria-pressed={tipo === id} onClick={() => setTipo(id)}>{t}</button>)}
                </div>
                <label className="gsearch sm"><span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar</span><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mascota o propietario. Ej: Luna" /></label>
              </div>
              {regs === null && <p className="vacio">Cargando…</p>}
              {regs && !filas.length && <p className="vacio">Nada pendiente en este grupo.</p>}
              <div className="vlist">
                {filas.map((r) => {
                  const p = pac(r.paciente_id), d = dueño(p), dias = diasA(r.datos.proxima), av = avisos[r.id];
                  const st = dias < 0 ? [`Vencida hace ${-dias} ${dias === -1 ? 'día' : 'días'}`, 'st-mal'] : dias === 0 ? ['Hoy', 'st-warn'] : [`En ${dias} ${dias === 1 ? 'día' : 'días'}`, dias <= 7 ? 'st-warn' : 'st-ok'];
                  return (
                    <div key={r.id} className="vitem" data-sel={sel === r.id || undefined}>
                      <a className="vitem__p" href={p ? link('/gestor/paciente') + `?id=${p.id}` : '#'}><b>{p?.nombre}</b><span>{[p && ESPECIES[p.especie], p?.raza, p && edad(p)].filter(Boolean).join(' · ')}</span></a>
                      <span className="vitem__o"><b>{d ? nombreCompleto(d) : '—'}</b><span>{d ? prettyCel(d.celular) : ''}</span></span>
                      <span className="vitem__q"><span className="ms" aria-hidden="true">{r.tipo === 'vacuna' ? 'vaccines' : 'pest_control'}</span>{r.titulo}<small>{fechaCorta(r.datos.proxima + 'T12:00:00')}</small></span>
                      <span className={`chip ${st[1]}`}>{st[0]}</span>
                      <span className="vitem__av">{av ? `${av.canal === 'whatsapp' ? 'WhatsApp' : 'Correo'} · ${fechaCorta(av.creado)}` : 'Sin aviso'}</span>
                      <span className="vitem__acts">
                        {d && <button className="gbtn wa sm" type="button" onClick={() => abrir(r)}><span className="ms" aria-hidden="true">chat</span>Recordar</button>}
                        <a className="gbtn out sm" href={link('/gestor/agenda') + `?paciente=${r.paciente_id}&servicio=vacuna`}>Agendar</a>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <div className="vac__side">
              {actual && (() => {
                const p = pac(actual.paciente_id), d = dueño(p);
                return d ? (
                  <section className="gcard" aria-labelledby="msg">
                    <h2 className="ch2" id="msg"><span className="ms" aria-hidden="true">chat</span>Mensaje para {d.nombre}<button type="button" className="vrow__x" aria-label="Cerrar" onClick={() => setSel(null)} style={{ marginLeft: 'auto' }}><span className="ms">close</span></button></h2>
                    <label className="sr-only" htmlFor="vmsg">Mensaje</label>
                    <textarea id="vmsg" className="vmsg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={6} />
                    <div className="dacts">
                      <a className="gbtn wa sm" href={waLink(d.celular, msg)} target="_blank" rel="noopener" onClick={async () => { const a = await registrarAviso(actual.id, 'whatsapp', yo.nombre); setAvisos((x) => ({ ...x, [actual.id]: a })); setAviso('Aviso registrado'); }}>
                        <span className="ms" aria-hidden="true">send</span>Abrir en WhatsApp
                      </a>
                    </div>
                    <p className="hint">Al abrirlo queda registrado como avisado hoy.</p>
                  </section>
                ) : null;
              })()}

              <section className="gcard" aria-labelledby="esq">
                <h2 className="ch2" id="esq"><span className="ms" aria-hidden="true">event_repeat</span>Esquemas</h2>
                <p className="hint">Cada cuánto se repite cada una. Al registrar una vacuna en la ficha, la próxima dosis se calcula sola con esto.</p>
                {esq && <EsquemasEd e={esq} puede={yo.rol === 'admin' || yo.rol === 'veterinario'} guardar={async (n) => { try { await guardarEsquemas(n); setEsq(n); setAviso('Esquemas guardados'); } catch (e) { setAviso((e as Error).message); } }} />}
              </section>

              <section className="gcard" aria-labelledby="auto">
                <h2 className="ch2" id="auto"><span className="ms" aria-hidden="true">notifications_active</span>Recordatorios automáticos</h2>
                <div className="canal"><span className="ms" aria-hidden="true">chat</span><span><b>WhatsApp con un clic</b> · gratis<span>Esta lista te deja el mensaje listo; lo envías tú.</span></span></div>
                <div className="canal"><span className="ms" aria-hidden="true">mail</span><span><b>Correo automático</b> · gratis<span>Sale solo días antes de la fecha. Se activa en el paso de correos, junto con el portal.</span></span></div>
                <div className="canal"><span className="ms" aria-hidden="true">payments</span><span><b>WhatsApp automático</b> · con costo<span>Necesita la API de WhatsApp Business, que cobra por mensaje. Lo evaluamos antes de activarlo.</span></span></div>
              </section>
            </div>
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

function EsquemasEd({ e, puede, guardar }: { e: Esquemas; puede: boolean; guardar: (e: Esquemas) => void }) {
  const [v, setV] = useState(e);
  const [nuevo, setNuevo] = useState('');
  const cambios = JSON.stringify(v) !== JSON.stringify(e);
  const OPC = [[30, '1 mes'], [60, '2 meses'], [90, '3 meses'], [120, '4 meses'], [180, '6 meses'], [365, '1 año'], [730, '2 años'], [1095, '3 años']] as const;
  return (
    <div className="esq">
      {Object.entries(v).map(([k, d]) => (
        <div className="esq__r" key={k}>
          <span>{k}</span>
          <select className="cell" aria-label={`Repetir ${k}`} value={d} disabled={!puede} onChange={(x) => setV((y) => ({ ...y, [k]: Number(x.target.value) }))}>
            {OPC.map(([n, t]) => <option key={n} value={n}>Cada {t}</option>)}
            {!OPC.some(([n]) => n === d) && <option value={d}>Cada {d} días</option>}
          </select>
          {puede && <button type="button" className="vrow__x" aria-label={`Quitar ${k}`} onClick={() => setV((y) => { const z = { ...y }; delete z[k]; return z; })}><span className="ms">close</span></button>}
        </div>
      ))}
      {puede && (
        <div className="esq__n">
          <input className="cell" value={nuevo} placeholder="Otra vacuna. Ej: Giardia" onChange={(x) => setNuevo(x.target.value)} />
          <button className="gbtn out sm" type="button" disabled={!nuevo.trim()} onClick={() => { setV((y) => ({ ...y, [nuevo.trim()]: 365 })); setNuevo(''); }}><span className="ms" aria-hidden="true">add</span>Agregar</button>
        </div>
      )}
      {puede && cambios && <button className="gbtn sm" type="button" onClick={() => guardar(v)}><span className="ms" aria-hidden="true">check</span>Guardar esquemas</button>}
    </div>
  );
}
