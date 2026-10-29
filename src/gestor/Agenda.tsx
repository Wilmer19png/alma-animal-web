// Agenda semanal con dos carriles por día (Doctora y Spa) y panel para agendar o ver una cita.
// Las horas libres salen del horario, la duración del servicio y las citas que ya hay. En celular, un día a la vez.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, waLink, prettyCel } from './lib';
import {
  leerHorario, leerDuraciones, listarCierres, listarCitas, crearCita, cambiarCita, horas, cerradoPor, hhmm, iso, sumarDias, lunesDe, minutosDe,
  enFecha, diaSemana, SERVICIOS, CARRILES, ESTADOS_CITA, DIAS_C, MESES, type Horario, type Duraciones, type Cierre, type Cita, type Servicio, type Carril, type Estado
} from './agenda-datos';
import { listarPacientes, listarPropietarios, nombreCompleto, type Paciente, type Propietario } from './clinica-datos';

const PX = 56 / 60; // píxeles por minuto
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const rango = (lun: Date, n: number) => {
  const fin = sumarDias(lun, n - 1);
  return lun.getMonth() === fin.getMonth() ? `${lun.getDate()} – ${fin.getDate()} de ${MESES[fin.getMonth()]}` : `${lun.getDate()} de ${MESES[lun.getMonth()].slice(0, 3)} – ${fin.getDate()} de ${MESES[fin.getMonth()].slice(0, 3)}`;
};
type Filtro = 'todo' | 'dra' | 'spa' | 'domicilio';

export default function Agenda() {
  const [lunes, setLunes] = useState(() => lunesDe(new Date()));
  const [h, setH] = useState<Horario | null>(null);
  const [dur, setDur] = useState<Duraciones | null>(null);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [props, setProps] = useState<Propietario[]>([]);
  const [filtro, setFiltro] = useState<Filtro>('todo');
  const [diaM, setDiaM] = useState(() => Math.min(diaSemana(new Date()), 5)); // celular: día visible
  const [panel, setPanel] = useState<{ modo: 'nueva'; dia?: Date; min?: number; servicio?: Servicio; mover?: Cita } | { modo: 'ver'; cita: Cita }>({ modo: 'nueva' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    Promise.all([leerHorario(), leerDuraciones(), listarCierres(), listarPacientes(), listarPropietarios()])
      .then(([a, b, c, d, e]) => { setH(a); setDur(b); setCierres(c); setPacs(d); setProps(e); }).catch((e) => setError((e as Error).message));
  }, []);
  const cargar = useCallback(() => { listarCitas(lunes, sumarDias(lunes, 7)).then(setCitas).catch((e) => setError((e as Error).message)); }, [lunes]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const dias = useMemo(() => (h ? h.dias.map((d, i) => ({ i, d, fecha: sumarDias(lunes, i) })).filter((x) => x.i < 6 || x.d.abre) : []), [h, lunes]);
  const desde = useMemo(() => (h ? Math.min(...h.dias.filter((d) => d.abre).map((d) => d.manana[0])) : 480), [h]);
  const hasta = useMemo(() => (h ? Math.max(...h.dias.filter((d) => d.abre).map((d) => (d.tarde ?? d.manana)[1])) : 1020), [h]);
  const carriles: Carril[] = filtro === 'spa' ? ['spa'] : filtro === 'todo' ? ['dra', 'spa'] : ['dra'];
  const pac = (id: string | null) => pacs.find((p) => p.id === id);
  const dueñoDe = (c: Cita) => props.find((p) => p.id === (c.propietario_id ?? pac(c.paciente_id)?.propietario_id));
  const nombreCita = (c: Cita) => pac(c.paciente_id)?.nombre ?? c.datos.mascota ?? 'Sin paciente';
  const visibles = citas.filter((c) => c.estado !== 'cancelada' && (filtro !== 'domicilio' || c.servicio === 'domicilio'));
  const hoy = iso(new Date());
  const ahoraMin = new Date().getHours() * 60 + new Date().getMinutes();

  const guardada = (c: Cita, msg: string) => { setCitas((l) => (l.some((x) => x.id === c.id) ? l.map((x) => (x.id === c.id ? c : x)) : [...l, c])); setAviso(msg); };

  return (
    <Shell activo="agenda">
      {(yo) => (
        <div className="ag">
          <div className="mhead ag__head">
            <h1>Agenda</h1>
            <div className="ag__nav">
              <button className="gbtn out sm" type="button" aria-label="Semana anterior" onClick={() => setLunes((d) => sumarDias(d, -7))}><span className="ms">chevron_left</span></button>
              <b>{rango(lunes, dias.length || 6)}</b>
              <button className="gbtn out sm" type="button" aria-label="Semana siguiente" onClick={() => setLunes((d) => sumarDias(d, 7))}><span className="ms">chevron_right</span></button>
              <button className="gbtn out sm" type="button" onClick={() => { setLunes(lunesDe(new Date())); setDiaM(Math.min(diaSemana(new Date()), 5)); }}>Hoy</button>
            </div>
            <div className="filts" role="group" aria-label="Filtrar por servicio">
              {([['todo', 'Todo'], ['dra', 'Doctora'], ['spa', 'Spa'], ['domicilio', 'Domicilios']] as const).map(([id, t]) => (
                <button key={id} type="button" className="filt" aria-pressed={filtro === id} onClick={() => setFiltro(id)}><i className={`dot dot--${id}`} aria-hidden="true" />{t}</button>
              ))}
            </div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
          </div>
          {error && <p className="gerr" role="alert">{error}</p>}

          <div className="ag__grid">
            {/* ---------- SEMANA ---------- */}
            <section className="gcard ag__sem" aria-label="Semana">
              <div className="mdays" role="tablist" aria-label="Día">
                {dias.map((x) => (
                  <button key={x.i} type="button" role="tab" aria-selected={diaM === x.i} onClick={() => setDiaM(x.i)} data-hoy={iso(x.fecha) === hoy || undefined}>
                    <span>{DIAS_C[x.i]}</span><b>{x.fecha.getDate()}</b>
                  </button>
                ))}
              </div>
              {h && (
                <div className="wk" style={{ ['--dias' as string]: dias.length, ['--carriles' as string]: carriles.length }}>
                  <div className="wk__head">
                    <span />
                    {dias.map((x) => (
                      <div key={x.i} className="wk__dh" data-m={diaM === x.i || undefined} data-hoy={iso(x.fecha) === hoy || undefined}>
                        <div><span>{DIAS_C[x.i]}</span><b>{x.fecha.getDate()}</b></div>
                        {carriles.length > 1 && <div className="wk__lanes">{carriles.map((c) => <span key={c}>{CARRILES[c]}</span>)}</div>}
                      </div>
                    ))}
                  </div>
                  <div className="wk__body" style={{ height: (hasta - desde) * PX }}>
                    <div className="wk__horas">{Array.from({ length: Math.floor((hasta - desde) / 60) + 1 }, (_, k) => desde + k * 60).map((m) => <span key={m} style={{ top: (m - desde) * PX }}>{hhmm(m, true)}</span>)}</div>
                    {dias.map((x) => {
                      const cerrado = cerradoPor(x.fecha, h, cierres);
                      return (
                        <div key={x.i} className="wk__day" data-m={diaM === x.i || undefined}>
                          {cerrado && <div className="wk__cerrado" style={{ top: 0, height: '100%' }}>{cerrado}</div>}
                          {!cerrado && x.d.tarde && <div className="wk__desc" style={{ top: (x.d.manana[1] - desde) * PX, height: (x.d.tarde[0] - x.d.manana[1]) * PX }}>Descanso</div>}
                          {!cerrado && !x.d.tarde && (x.d.manana[1] < hasta) && <div className="wk__cerrado" style={{ top: (x.d.manana[1] - desde) * PX, height: (hasta - x.d.manana[1]) * PX }}>Cerrado desde {hhmm(x.d.manana[1])}</div>}
                          {iso(x.fecha) === hoy && ahoraMin > desde && ahoraMin < hasta && <span className="wk__now" style={{ top: (ahoraMin - desde) * PX }} aria-hidden="true" />}
                          <div className="wk__lns">
                            {carriles.map((cr) => (
                              <div key={cr} className="wk__ln">
                                {!cerrado && dur && horas(x.fecha, cr === 'spa' ? 'spa' : 'consulta', citas, h, dur, cierres).filter((s) => !s.motivo && !s.ocupado).map((s) => (
                                  <button key={s.min} type="button" className="wk__free" style={{ top: (s.min - desde) * PX, height: 30 * PX }}
                                    aria-label={`Agendar ${CARRILES[cr].toLowerCase()} el ${DIAS_C[x.i].toLowerCase()} ${x.fecha.getDate()} a las ${hhmm(s.min)}`}
                                    onClick={() => setPanel({ modo: 'nueva', dia: x.fecha, min: s.min, servicio: cr === 'spa' ? 'spa' : 'consulta' })} />
                                ))}
                                {visibles.filter((c) => c.carril === cr && iso(new Date(c.inicio)) === iso(x.fecha)).map((c) => {
                                  const a = minutosDe(c.inicio), b = minutosDe(c.fin), sv = SERVICIOS[c.servicio];
                                  return (
                                    <button key={c.id} type="button" className={'appt' + (b - a < 45 ? ' appt--corta' : '')} data-estado={c.estado} data-sel={panel.modo === 'ver' && panel.cita.id === c.id || undefined}
                                      style={{ top: (a - desde) * PX, height: Math.max(22, (b - a) * PX - 2), background: sv.bg, color: sv.fg }}
                                      title={`${hhmm(a)} · ${nombreCita(c)} · ${sv.txt}${c.estado === 'solicitada' ? ' · por confirmar' : ''}`}
                                      onClick={() => setPanel({ modo: 'ver', cita: c })}>
                                      <b>{hhmm(a, true)}{c.origen !== 'consultorio' && <span className="ms" aria-label="Agendada por el cliente">language</span>}{c.sobrecupo && <span className="ms" aria-label="Sobrecupo">warning</span>}</b>
                                      <span>{nombreCita(c)}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <div className="ag__ley">
                <span><span className="ms" aria-hidden="true">touch_app</span>Toca un espacio libre para agendar ahí</span>
                <span><span className="ms" aria-hidden="true">language</span>La agendó el cliente</span>
                <span><i className="ag__sol" aria-hidden="true" />Por confirmar</span>
              </div>
            </section>

            {/* ---------- PANEL ---------- */}
            <aside className="gcard ag__panel">
              {panel.modo === 'ver'
                ? <VerCita c={citas.find((x) => x.id === panel.cita.id) ?? panel.cita} paciente={pac(panel.cita.paciente_id)} dueño={dueñoDe(panel.cita)}
                    cambiar={async (cambio, msg) => { try { guardada(await cambiarCita(panel.cita.id, cambio), msg); } catch (e) { setAviso((e as Error).message); } }}
                    mover={() => setPanel({ modo: 'nueva', mover: panel.cita, servicio: panel.cita.servicio, dia: new Date(panel.cita.inicio) })} cerrar={() => setPanel({ modo: 'nueva' })} />
                : h && dur && <Agendar key={`${panel.dia?.toISOString()}-${panel.min}-${panel.mover?.id}`} inicial={panel} lunes={lunes} h={h} dur={dur} cierres={cierres} citas={citas}
                    pacs={pacs} props={props} autor={yo.nombre}
                    listo={(c, msg) => { guardada(c, msg); setPanel({ modo: 'ver', cita: c }); }} avisar={setAviso} />}
            </aside>
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

/* ---------- ver una cita ---------- */
function VerCita({ c, paciente, dueño, cambiar, mover, cerrar }: { c: Cita; paciente?: Paciente; dueño?: Propietario; cambiar: (x: Partial<Cita>, msg: string) => void; mover: () => void; cerrar: () => void }) {
  const sv = SERVICIOS[c.servicio], st = ESTADOS_CITA[c.estado];
  const d = new Date(c.inicio);
  const cuando = `${['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'][d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}, ${hhmm(minutosDe(c.inicio))}`;
  const nombre = paciente?.nombre ?? c.datos.mascota ?? 'la mascota';
  const cel = dueño?.celular ?? c.datos.celular;
  const quien = dueño ? nombreCompleto(dueño) : c.datos.nombre;
  const msg = `Hola${dueño ? ', ' + dueño.nombre : c.datos.nombre ? ', ' + c.datos.nombre.split(' ')[0] : ''}. Te escribimos de Alma Animal para ${c.estado === 'solicitada' ? 'confirmar' : 'recordarte'} la cita de ${nombre}: ${sv.txt.toLowerCase()} el ${cuando}.${c.servicio === 'domicilio' && c.direccion ? ` Vamos a ${c.direccion}.` : ' Te esperamos en la Calle 1 # 9-02, Alfonso López.'}`;
  return (
    <div className="vc">
      <div className="vc__head"><span className="vc__ic" style={{ background: sv.bg, color: sv.fg }}><span className="ms" aria-hidden="true">{sv.icon}</span></span>
        <div><b>{sv.txt}</b><span>{cuando}</span></div>
        <button type="button" className="vrow__x" aria-label="Cerrar" onClick={cerrar}><span className="ms">close</span></button></div>
      <div className="vc__chips"><span className="chip" style={{ background: st.bg, color: st.fg }}>{st.txt}</span>{c.origen !== 'consultorio' && <span className="chip lav"><span className="ms" aria-hidden="true">language</span>{c.origen === 'web' ? 'Desde la página' : 'Desde el portal'}</span>}{c.sobrecupo && <span className="chip alerta">Sobrecupo</span>}</div>
      <dl className="kv">
        <div className="full"><dt>Paciente</dt><dd>{paciente ? <a href={link('/gestor/paciente') + `?id=${paciente.id}`}>{paciente.nombre}{paciente.raza ? ` · ${paciente.raza}` : ''}</a> : [c.datos.mascota, c.datos.raza, c.datos.peso && `${c.datos.peso} kg`].filter(Boolean).join(' · ') || '—'}</dd></div>
        <div className="full"><dt>Propietario</dt><dd>{quien ?? '—'}{cel ? ` · ${prettyCel(cel)}` : ''}</dd></div>
        {c.datos.servicio && <div className="full"><dt>Pidió</dt><dd>{c.datos.servicio}</dd></div>}
        {c.direccion && <div className="full"><dt>Dirección</dt><dd>{c.direccion}</dd></div>}
        {(c.nota || c.datos.notas) && <div className="full"><dt>Nota</dt><dd className="normal">{c.nota ?? c.datos.notas}</dd></div>}
        {c.por_nombre && <div className="full"><dt>Agendó</dt><dd>{c.por_nombre}</dd></div>}
      </dl>
      {!paciente && c.origen === 'web' && <p className="hint">Es una solicitud de la página: todavía no tiene ficha. <a href={link('/gestor/registro')}>Registrar paciente</a></p>}
      <div className="dacts">
        {cel && <a className="gbtn wa sm" href={waLink(cel, msg)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>{c.estado === 'solicitada' ? 'Escribir para confirmar' : 'Recordar por WhatsApp'}</a>}
        {c.estado === 'solicitada' && <button className="gbtn sm" type="button" onClick={() => cambiar({ estado: 'confirmada' }, 'Cita confirmada')}><span className="ms" aria-hidden="true">check</span>Confirmar cita</button>}
        {c.estado === 'confirmada' && <button className="gbtn sm" type="button" onClick={() => cambiar({ estado: 'atendida' }, 'Marcada como atendida')}><span className="ms" aria-hidden="true">done_all</span>Atendida</button>}
      </div>
      <div className="dacts">
        {(c.estado === 'confirmada' || c.estado === 'solicitada') && <button className="gbtn out sm" type="button" onClick={mover}><span className="ms" aria-hidden="true">schedule</span>Cambiar hora</button>}
        {c.estado === 'confirmada' && <button className="gbtn out sm" type="button" onClick={() => cambiar({ estado: 'no_vino' }, 'Marcada: no vino')}>No vino</button>}
        {(c.estado === 'confirmada' || c.estado === 'solicitada') && <button className="gbtn ghost sm" type="button" onClick={() => { if (confirm('¿Cancelar esta cita? Se libera el espacio en la agenda.')) cambiar({ estado: 'cancelada' }, 'Cita cancelada'); }}><span className="ms" aria-hidden="true">cancel</span>Cancelar</button>}
        {(c.estado === 'no_vino' || c.estado === 'cancelada' || c.estado === 'atendida') && <button className="gbtn out sm" type="button" onClick={() => cambiar({ estado: 'confirmada' }, 'Cita reabierta')}><span className="ms" aria-hidden="true">undo</span>Reabrir</button>}
      </div>
    </div>
  );
}

/* ---------- agendar (o cambiar la hora) ---------- */
function Agendar({ inicial, lunes, h, dur, cierres, citas, pacs, props, autor, listo, avisar }: {
  inicial: { dia?: Date; min?: number; servicio?: Servicio; mover?: Cita }; lunes: Date; h: Horario; dur: Duraciones; cierres: Cierre[]; citas: Cita[];
  pacs: Paciente[]; props: Propietario[]; autor: string; listo: (c: Cita, msg: string) => void; avisar: (m: string) => void;
}) {
  const mover = inicial.mover;
  const [q, setQ] = useState('');
  const [pid, setPid] = useState<string | null>(mover?.paciente_id ?? null);
  const [sv, setSv] = useState<Servicio>(inicial.servicio ?? 'consulta');
  const [dia, setDia] = useState<Date>(inicial.dia ?? (diaSemana(new Date()) < 6 && lunes <= new Date() ? new Date() : lunes));
  const [min, setMin] = useState<number | null>(inicial.min ?? null);
  const [sobre, setSobre] = useState(false);
  const [nota, setNota] = useState(mover?.nota ?? '');
  const [dir, setDir] = useState(mover?.direccion ?? '');
  const [avisarWa, setAvisarWa] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const paciente = pacs.find((p) => p.id === pid);
  const dueño = props.find((p) => p.id === paciente?.propietario_id);
  const resultados = useMemo(() => {
    const t = norm(q.trim()); if (!t) return [];
    return pacs.filter((p) => p.activo).map((p) => ({ p, d: props.find((o) => o.id === p.propietario_id) }))
      .filter(({ p, d }) => norm(`${p.nombre} ${p.raza ?? ''} ${d ? nombreCompleto(d) : ''} ${d?.celular ?? ''}`).includes(t)).slice(0, 6);
  }, [q, pacs, props]);
  const semana = Array.from({ length: 14 }, (_, i) => sumarDias(lunesDe(dia), i)).filter((d) => !cerradoPor(d, h, cierres) && iso(d) >= iso(new Date()));
  const lista = horas(dia, sv, citas, h, dur, cierres, mover?.id);
  const elegida = lista.find((x) => x.min === min);
  const valida = elegida && !elegida.motivo && (!elegida.ocupado || sobre);
  const cuando = min != null ? `${DIAS_C[diaSemana(dia)].toLowerCase()} ${dia.getDate()} de ${MESES[dia.getMonth()]}, ${hhmm(min)}` : '';

  const agendar = async () => {
    if (!valida || min == null) return;
    if (!mover && !paciente) { avisar('Elige el paciente.'); return; }
    if (sv === 'domicilio' && !dir.trim() && !dueño?.direccion) { avisar('Escribe la dirección del domicilio.'); return; }
    setOcupado(true);
    try {
      const inicio = enFecha(dia, min), fin = enFecha(dia, min + dur[sv]);
      const datosBase = { servicio: sv, carril: SERVICIOS[sv].carril, inicio, fin, sobrecupo: !!elegida.ocupado && sobre, nota: nota.trim() || null, direccion: sv === 'domicilio' ? (dir.trim() || dueño?.direccion || null) : null };
      const c = mover
        ? await cambiarCita(mover.id, { ...datosBase, estado: 'confirmada', ...(paciente ? { paciente_id: paciente.id, propietario_id: paciente.propietario_id } : {}) })
        : await crearCita({ ...datosBase, paciente_id: paciente!.id, propietario_id: paciente!.propietario_id, estado: 'confirmada', origen: 'consultorio', datos: {}, por_nombre: autor });
      if (avisarWa && dueño) window.open(waLink(dueño.celular, `Hola, ${dueño.nombre}. Te confirmamos la cita de ${paciente!.nombre} en Alma Animal: ${SERVICIOS[sv].txt.toLowerCase()} el ${cuando}.${sv === 'domicilio' ? ' Vamos a tu casa.' : ' Te esperamos en la Calle 1 # 9-02, Alfonso López.'}`), '_blank', 'noopener');
      listo(c, mover ? 'Cita movida' : 'Cita agendada');
    } catch (e) { avisar((e as Error).message); }
    setOcupado(false);
  };

  return (
    <div className="agf">
      <div><h2 className="ch2"><span className="ms" aria-hidden="true">event_available</span>{mover ? 'Cambiar la hora' : 'Agendar cita'}</h2>
        <p className="hint">{mover ? 'Elige el nuevo día y la nueva hora.' : 'Desde el consultorio, por llamada o WhatsApp.'}</p></div>

      {!mover && (
        <div className="fld">
          <label htmlFor="ag-pac">Paciente</label>
          {paciente
            ? <div className="agf__pac"><b>{paciente.nombre}</b><span>{dueño ? nombreCompleto(dueño) : ''}</span><button type="button" className="link-add" onClick={() => { setPid(null); setQ(''); }}>Cambiar</button></div>
            : <>
                <input id="ag-pac" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca mascota o propietario. Ej: Luna" autoComplete="off" />
                {resultados.length > 0 && <div className="agf__res" role="listbox" aria-label="Pacientes">{resultados.map(({ p, d }) => (
                  <button key={p.id} type="button" role="option" aria-selected="false" onClick={() => setPid(p.id)}><b>{p.nombre}</b><span>{[p.raza, d && nombreCompleto(d)].filter(Boolean).join(' · ')}</span></button>
                ))}</div>}
                <a className="hint" href={link('/gestor/registro')}>¿Es nuevo? Registrar paciente</a>
              </>}
        </div>
      )}

      <div className="fld"><span className="fld__lb">Servicio</span>
        <div className="agf__svs" role="radiogroup" aria-label="Servicio">
          {(Object.keys(SERVICIOS) as Servicio[]).map((s) => (
            <button key={s} type="button" role="radio" aria-checked={sv === s} onClick={() => { setSv(s); setMin(null); }}>
              <span className="ms" aria-hidden="true">{SERVICIOS[s].icon}</span><span><b>{SERVICIOS[s].txt}</b><span>{dur[s]} min · {CARRILES[SERVICIOS[s].carril]}</span></span>
            </button>
          ))}
        </div>
      </div>

      <div className="fld"><span className="fld__lb">Día</span>
        <div className="agf__dias" role="radiogroup" aria-label="Día">
          {semana.map((d) => (
            <button key={iso(d)} type="button" role="radio" aria-checked={iso(d) === iso(dia)} onClick={() => { setDia(d); setMin(null); }}><span>{DIAS_C[diaSemana(d)]}</span><b>{d.getDate()}</b></button>
          ))}
        </div>
      </div>

      <div className="fld"><span className="fld__lb">Hora <small>({lista.filter((x) => !x.motivo && !x.ocupado).length} libres)</small></span>
        <div className="agf__horas" role="radiogroup" aria-label="Hora">
          {lista.map((x) => {
            const no = !!x.motivo || (x.ocupado && !sobre);
            return <button key={x.min} type="button" role="radio" aria-checked={min === x.min} disabled={no} data-ocupado={x.ocupado || undefined}
              title={x.motivo || (x.ocupado ? 'Ocupado' + (sobre ? ' · sobrecupo' : '') : 'Libre')} onClick={() => setMin(x.min)}>{hhmm(x.min, true)}</button>;
          })}
          {!lista.length && <p className="hint">Ese día no se atiende.</p>}
        </div>
      </div>
      <label className="chk-l"><input type="checkbox" checked={sobre} onChange={(e) => setSobre(e.target.checked)} /><span><b>Permitir sobrecupo</b><span className="hint">Para urgencias: deja agendar sobre una hora ocupada.</span></span></label>
      {sv === 'domicilio' && <div className="fld"><label htmlFor="ag-dir">Dirección del domicilio</label><input id="ag-dir" value={dir} placeholder={dueño?.direccion ?? 'Ej: Calle 19 # 8-34, Álamos'} onChange={(e) => setDir(e.target.value)} /></div>}
      <div className="fld"><label htmlFor="ag-nota">Nota <small>(opcional)</small></label><input id="ag-nota" value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Viene por control de la otitis" /></div>
      {!mover && <label className="chk-l"><input type="checkbox" checked={avisarWa} onChange={(e) => setAvisarWa(e.target.checked)} />Avisar al propietario por WhatsApp al agendar</label>}

      <div className="agf__res2">
        <b>{min != null ? `${SERVICIOS[sv].txt} · ${cuando}` : 'Elige una hora'}</b>
        {elegida?.ocupado && sobre && <span className="chip alerta"><span className="ms" aria-hidden="true">warning</span>Sobrecupo: se cruza con otra cita</span>}
      </div>
      <button className="gbtn" type="button" disabled={!valida || ocupado || (!mover && !paciente)} onClick={agendar}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : mover ? 'Guardar nueva hora' : 'Agendar cita'}</button>
    </div>
  );
}
