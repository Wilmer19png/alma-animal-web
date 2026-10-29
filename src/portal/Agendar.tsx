// Agendar desde el portal: mascota → servicio → día y hora (solo horas libres) → notas → pedir.
// La cita queda "por confirmar" y el equipo la confirma por WhatsApp.
import { useEffect, useMemo, useState } from 'react';
import Marco from './Marco';
import { link } from '../gestor/lib';
import { misMascotas, ocupadas, pedirCita, type Ficha } from './datos';
import { especieTxt, fechaLarga } from './comun';
import { edad, type Paciente } from '../gestor/clinica-datos';
import { leerHorario, leerDuraciones, listarCierres, horas, cerradoPor, textoHorario, hhmm, enFecha, sumarDias, iso, SERVICIOS,
  type Horario, type Duraciones, type Cierre, type Cita, type Servicio } from '../gestor/agenda-datos';
import { whatsapp } from '../data/site';

const OPCIONES: { id: Servicio; txt: string; sub: string; icon: string }[] = [
  { id: 'consulta', txt: 'Consulta', sub: 'Revisión, síntomas o control', icon: 'stethoscope' },
  { id: 'vacuna', txt: 'Vacuna o desparasitación', sub: 'Según su carnet', icon: 'vaccines' },
  { id: 'spa', txt: 'Baño en el spa', sub: 'Baño completo, corte y más', icon: 'shower' },
  { id: 'domicilio', txt: 'Consulta a domicilio', sub: 'La doctora va a tu casa', icon: 'home_health' }
];
const DIAS_C = ['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'];

export default function Agendar() {
  return <Marco activo="agendar">{(yo) => <Contenido yo={yo} />}</Marco>;
}

function Contenido({ yo }: { yo: Ficha }) {
  const q = new URLSearchParams(location.search);
  const [pacs, setPacs] = useState<Paciente[] | null>(null);
  const [cfg, setCfg] = useState<{ h: Horario; d: Duraciones; c: Cierre[] } | null>(null);
  const [ocup, setOcup] = useState<Cita[]>([]);
  const [paso, setPaso] = useState(1);
  const [pid, setPid] = useState<string | null>(q.get('mascota'));
  const [svc, setSvc] = useState<Servicio | null>((q.get('servicio') as Servicio) || null);
  const [dir, setDir] = useState(yo.direccion ?? '');
  const [barrio, setBarrio] = useState(yo.barrio ?? '');
  const [desde, setDesde] = useState(0); // primer día que se ve en la tira
  const [dia, setDia] = useState<Date | null>(null);
  const [min, setMin] = useState<number | null>(null);
  const [nota, setNota] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const hoy = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  useEffect(() => {
    misMascotas(yo).then((p) => { setPacs(p); if (!pid && p.length === 1) setPid(p[0].id); }).catch(() => setPacs([]));
    Promise.all([leerHorario(), leerDuraciones(), listarCierres(), ocupadas(hoy, sumarDias(hoy, 30))]).then(([h, d, c, o]) => { setCfg({ h, d, c }); setOcup(o); }).catch(() => setError('No pudimos cargar el horario. Revisa tu conexión.'));
  }, [yo]); // eslint-disable-line react-hooks/exhaustive-deps

  const m = pacs?.find((p) => p.id === pid);
  const dias = useMemo(() => Array.from({ length: 30 }, (_, i) => sumarDias(hoy, i)), [hoy]);
  const libres = (d: Date) => (cfg && svc ? horas(d, svc, ocup, cfg.h, cfg.d, cfg.c).filter((x) => !x.motivo && !x.ocupado) : []);
  const delDia = dia ? libres(dia) : [];
  const listo3 = !!(dia && min != null);
  const puede = paso === 1 ? !!pid : paso === 2 ? !!svc && (svc !== 'domicilio' || (dir.trim().length > 5 && barrio.trim().length > 1)) : paso === 3 ? listo3 : true;
  const pedir = async () => {
    if (!m || !svc || !dia || min == null || !cfg) return;
    setOcupado(true); setError('');
    try {
      await pedirCita({ paciente_id: m.id, propietario_id: yo.id, servicio: svc, carril: SERVICIOS[svc].carril, inicio: enFecha(dia, min), fin: enFecha(dia, min + cfg.d[svc]),
        nota: nota.trim() || null, direccion: svc === 'domicilio' ? `${dir.trim()}, ${barrio.trim()}` : null });
      setListo(true);
    } catch (e) { setError((e as Error).message); }
    setOcupado(false);
  };

  if (listo && m && svc && dia && min != null) {
    return (
      <section className="gcard pdone">
        <span className="ms" aria-hidden="true">check_circle</span>
        <h1>¡Recibimos tu solicitud!</h1>
        <p>{SERVICIOS[svc].txt} para {m.nombre} el {fechaLarga(dia)} a las {hhmm(min)}. En breve te escribimos por WhatsApp para confirmarla.</p>
        <div className="dacts"><a className="gbtn" href={link('/portal')}>Volver al inicio</a></div>
      </section>
    );
  }

  const PASOS = ['¿Para quién?', '¿Qué necesita?', 'Día y hora', 'Notas'];
  return (
    <div className="pag">
      <section className="phead phead--s"><h1>Agenda una <b className="gt">cita</b></h1><p>Solo te mostramos horas libres. Así nunca se cruza con otra cita.</p></section>
      <ol className="pasos pag__pasos" aria-label="Pasos">
        {PASOS.map((t, i) => <li key={t} className={i + 1 < paso ? 'hecho' : i + 1 === paso ? 'ahora hecho' : ''} aria-current={i + 1 === paso ? 'step' : undefined}><span className="pasos__dot" aria-hidden="true"><span className="ms">{i + 1 < paso ? 'check' : ['pets', 'stethoscope', 'event', 'edit'][i]}</span></span>{t}</li>)}
      </ol>
      <div className="pag__grid">
        <section className="gcard pag__paso">
          {paso === 1 && <>
            <h2 className="ch2">1 · ¿Para quién?</h2>
            {pacs === null && <p className="vacio">Cargando…</p>}
            <div className="pag__ops">
              {pacs?.map((p) => (
                <button key={p.id} type="button" className="pop" aria-pressed={pid === p.id} onClick={() => setPid(p.id)}>
                  <span className="pop__ic"><span className="ms" aria-hidden="true">pets</span></span><span><b>{p.nombre}</b><span>{[especieTxt(p), p.raza, edad(p)].filter(Boolean).join(' · ')}</span></span>
                </button>
              ))}
            </div>
          </>}
          {paso === 2 && <>
            <h2 className="ch2">2 · ¿Qué necesita {m?.nombre}?</h2>
            <div className="pag__ops">
              {OPCIONES.map((o) => (
                <button key={o.id} type="button" className="pop" aria-pressed={svc === o.id} onClick={() => { setSvc(o.id); setDia(null); setMin(null); }}>
                  <span className="pop__ic"><span className="ms" aria-hidden="true">{o.icon}</span></span><span><b>{o.txt}</b><span>{o.sub}</span></span>
                </button>
              ))}
            </div>
            {svc === 'domicilio' && (
              <div className="pag__dir">
                <div className="sfld"><label htmlFor="pd">Dirección de la visita</label><input id="pd" className="cell" value={dir} onChange={(e) => setDir(e.target.value)} placeholder="Ej: Calle 19 # 8-34, apto 302" /></div>
                <div className="sfld"><label htmlFor="pb">Barrio</label><input id="pb" className="cell" value={barrio} onChange={(e) => setBarrio(e.target.value)} placeholder="Ej: Álamos" /></div>
                <p className="hint">Cubrimos toda Pereira y Dosquebradas. La doctora llega a la hora que elijas.</p>
              </div>
            )}
          </>}
          {paso === 3 && <>
            <h2 className="ch2">3 · Día y hora</h2>
            {!cfg ? <p className="vacio">Cargando el horario…</p> : <>
              <div className="pdias">
                <button type="button" className="vrow__x" aria-label="Días anteriores" disabled={desde === 0} onClick={() => setDesde((d) => Math.max(0, d - 7))}><span className="ms">chevron_left</span></button>
                <div className="pdias__l">
                  {dias.slice(desde, desde + 7).map((d) => {
                    const n = cerradoPor(d, cfg.h, cfg.c) ? 0 : libres(d).length;
                    return (
                      <button key={iso(d)} type="button" aria-pressed={!!dia && iso(dia) === iso(d)} disabled={!n} onClick={() => { setDia(d); setMin(null); }}>
                        <small>{DIAS_C[d.getDay()]}</small><b>{d.getDate()}</b><span>{n ? `${n} libres` : 'Lleno'}</span>
                      </button>
                    );
                  })}
                </div>
                <button type="button" className="vrow__x" aria-label="Días siguientes" disabled={desde >= 21} onClick={() => setDesde((d) => Math.min(21, d + 7))}><span className="ms">chevron_right</span></button>
              </div>
              {dia && (delDia.length ? (
                [['Mañana', delDia.filter((x) => x.min < 720)], ['Tarde', delDia.filter((x) => x.min >= 720)]].filter(([, l]) => (l as typeof delDia).length).map(([t, l]) => (
                  <div key={t as string} className="phoras">
                    <small>{t as string}</small>
                    <div>{(l as typeof delDia).map((x) => <button key={x.min} type="button" aria-pressed={min === x.min} onClick={() => setMin(x.min)}>{hhmm(x.min)}</button>)}</div>
                  </div>
                ))
              ) : <p className="hint-g">Ese día ya no hay horas libres para este servicio. Prueba otro día o <a href={whatsapp.vet('Hola, Alma Animal. Quiero agendar una cita.')} target="_blank" rel="noopener">escríbenos por WhatsApp</a>.</p>)}
              {!dia && <p className="hint">Elige un día para ver las horas libres.</p>}
              <p className="hint">{svc && `Dura unos ${cfg.d[svc] >= 60 ? `${cfg.d[svc] / 60} ${cfg.d[svc] === 60 ? 'hora' : 'horas'}` : `${cfg.d[svc]} minutos`}. `}{textoHorario(cfg.h).map((x) => `${x.dias}: ${x.t}`).join(' · ')}</p>
            </>}
          </>}
          {paso === 4 && <>
            <h2 className="ch2">4 · ¿Algo que debamos saber? <small>opcional</small></h2>
            <div className="sfld"><label htmlFor="pn" className="sr-only">Notas</label>
              <textarea id="pn" className="cell" rows={4} maxLength={500} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Ej: Está vomitando desde ayer. / Se pone nerviosa con el secador." /></div>
          </>}
          {error && <p className="gerr" role="alert">{error}</p>}
          <div className="pag__nav">
            {paso > 1 && <button type="button" className="gbtn out" onClick={() => setPaso((p) => p - 1)}><span className="ms" aria-hidden="true">arrow_back</span>Atrás</button>}
            {paso < 4 && <button type="button" className="gbtn" disabled={!puede} onClick={() => setPaso((p) => p + 1)}>Siguiente<span className="ms" aria-hidden="true">arrow_forward</span></button>}
          </div>
        </section>

        <aside className="gcard pag__res" aria-labelledby="tu">
          <h2 className="ch2" id="tu"><span className="ms" aria-hidden="true">event_available</span>Tu cita</h2>
          <dl className="kv">
            <div className="full"><dt>Mascota</dt><dd>{m?.nombre ?? '—'}</dd></div>
            <div className="full"><dt>Servicio</dt><dd>{svc ? SERVICIOS[svc].txt : '—'}</dd></div>
            <div className="full"><dt>Cuándo</dt><dd>{dia && min != null ? `${fechaLarga(dia)} · ${hhmm(min)}` : '—'}</dd></div>
            <div className="full"><dt>Dónde</dt><dd className="normal">{svc === 'domicilio' ? (dir ? `${dir}${barrio ? ', ' + barrio : ''}` : 'Tu casa') : 'Calle 1 # 9-02, Alfonso López'}</dd></div>
          </dl>
          <button type="button" className="gbtn" disabled={paso < 4 || !listo3 || ocupado} onClick={pedir}>{ocupado ? 'Enviando…' : 'Pedir la cita'}<span className="ms" aria-hidden="true">arrow_forward</span></button>
          <p className="hint">La cita queda por confirmar: te escribimos por WhatsApp para confirmarla.</p>
        </aside>
      </div>
    </div>
  );
}
