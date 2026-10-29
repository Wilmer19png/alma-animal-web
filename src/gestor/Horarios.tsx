// Horarios: un solo horario para la agenda, el formulario del spa, el portal y la página.
// Duración de cada servicio, festivos de Colombia y cierres especiales.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO } from './lib';
import {
  leerHorario, leerDuraciones, guardarAjustes, listarCierres, agregarCierre, quitarCierre, festivosColombia, textoHorario, hhmm, iso,
  DIAS, MESES, SERVICIOS, CARRILES, type Horario, type Duraciones, type Cierre, type Servicio
} from './agenda-datos';

const OPCIONES = Array.from({ length: 33 }, (_, i) => 360 + i * 30); // 6:00 a. m. a 10:00 p. m.
const LARGOS = [15, 30, 45, 60, 90, 120, 150, 180];
const largoTxt = (m: number) => (m < 60 ? `${m} min` : m % 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m / 60} ${m === 60 ? 'hora' : 'horas'}`);

function Hora({ v, onChange, label }: { v: number; onChange: (n: number) => void; label: string }) {
  return <select className="cell" aria-label={label} value={v} onChange={(e) => onChange(Number(e.target.value))}>{OPCIONES.map((m) => <option key={m} value={m}>{hhmm(m)}</option>)}</select>;
}

export default function Horarios() {
  const [h, setH] = useState<Horario | null>(null);
  const [dur, setDur] = useState<Duraciones | null>(null);
  const [base, setBase] = useState('');
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [nuevo, setNuevo] = useState<Cierre>({ fecha: '', nombre: '' });
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([leerHorario(), leerDuraciones(), listarCierres()]).then(([a, b, c]) => { setH(a); setDur(b); setBase(JSON.stringify([a, b])); setCierres(c); })
      .catch(() => setError('No pudimos cargar el horario. Revisa tu conexión.'));
  }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const cambios = h && dur && JSON.stringify([h, dur]) !== base;
  const setDia = (i: number, c: Partial<Horario['dias'][number]>) => setH((x) => x && ({ ...x, dias: x.dias.map((d, k) => (k === i ? { ...d, ...c } : d)) }));
  const problemas = useMemo(() => (h?.dias ?? []).flatMap((d, i) => {
    if (!d.abre) return [];
    const e: string[] = [];
    if (d.manana[1] <= d.manana[0]) e.push(`${DIAS[i]}: en la mañana la hora de cierre debe ser después de la de apertura.`);
    if (d.tarde && d.tarde[1] <= d.tarde[0]) e.push(`${DIAS[i]}: en la tarde la hora de cierre debe ser después de la de apertura.`);
    if (d.tarde && d.tarde[0] < d.manana[1]) e.push(`${DIAS[i]}: la tarde empieza antes de que termine la mañana.`);
    return e;
  }), [h]);
  const proximos = useMemo(() => {
    const hoy = iso(new Date()), y = new Date().getFullYear();
    const fest = h?.festivos ? [...festivosColombia(y), ...festivosColombia(y + 1)].map((f) => ({ ...f, tipo: 'Festivo' })) : [];
    return [...fest, ...cierres.map((c) => ({ ...c, tipo: 'Cierre' }))].filter((c) => c.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 8);
  }, [h?.festivos, cierres]);

  const guardar = async () => {
    if (!h || !dur || problemas.length) return;
    try { await guardarAjustes(h, dur); setBase(JSON.stringify([h, dur])); setAviso('Guardado. La agenda ya usa el horario nuevo.'); }
    catch (e) { setAviso((e as Error).message); }
  };

  return (
    <Shell activo="horarios">
      {(yo) => {
        const admin = yo.rol === 'admin';
        if (!h || !dur) return <p className="vacio">{error || 'Cargando el horario…'}</p>;
        return (
          <div className="hor">
            <div className="mhead">
              <div className="mhead__txt"><h1>Horarios</h1><p>Un solo horario para todo: la agenda, el formulario del spa y el portal de clientes.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
              {admin && <button className="gbtn" type="button" onClick={guardar} disabled={!cambios || problemas.length > 0}><span className="ms" aria-hidden="true">check</span>Guardar cambios</button>}
            </div>
            {!admin && <p className="hint-g">Solo la administradora puede cambiar el horario. Aquí lo puedes consultar.</p>}
            {problemas.length > 0 && <ul className="gerr" role="alert">{problemas.map((p) => <li key={p}>{p}</li>)}</ul>}

            <div className="hor__grid">
              <div className="hor__col">
                <section className="gcard" aria-labelledby="se">
                  <h2 className="ch2" id="se"><span className="ms" aria-hidden="true">date_range</span>Horario de la semana</h2>
                  <div className="drow drow--h" aria-hidden="true"><span /><span>Día</span><span>Mañana</span><span>Tarde</span></div>
                  {h.dias.map((d, i) => (
                    <div className="drow" key={i} data-off={!d.abre || undefined}>
                      <button className="sw" type="button" role="switch" aria-checked={d.abre} aria-label={`Abre el ${DIAS[i].toLowerCase()}`} disabled={!admin} onClick={() => setDia(i, { abre: !d.abre })}><i /></button>
                      <b>{DIAS[i]}</b>
                      {d.abre ? (
                        <>
                          <span className="rng"><Hora v={d.manana[0]} label={`${DIAS[i]}: abre en la mañana`} onChange={(n) => setDia(i, { manana: [n, d.manana[1]] })} /><span>a</span><Hora v={d.manana[1]} label={`${DIAS[i]}: cierra en la mañana`} onChange={(n) => setDia(i, { manana: [d.manana[0], n] })} /></span>
                          <span className="rng">
                            {d.tarde
                              ? <><Hora v={d.tarde[0]} label={`${DIAS[i]}: abre en la tarde`} onChange={(n) => setDia(i, { tarde: [n, d.tarde![1]] })} /><span>a</span><Hora v={d.tarde[1]} label={`${DIAS[i]}: cierra en la tarde`} onChange={(n) => setDia(i, { tarde: [d.tarde![0], n] })} />
                                {admin && <button type="button" className="vrow__x" aria-label={`${DIAS[i]}: cerrar en la tarde`} onClick={() => setDia(i, { tarde: null })}><span className="ms">close</span></button>}</>
                              : <><span className="hint">Cerrado en la tarde</span>{admin && <button type="button" className="link-add" onClick={() => setDia(i, { tarde: [840, 1020] })}>Agregar</button>}</>}
                          </span>
                        </>
                      ) : <span className="hint drow__off">Cerrado</span>}
                    </div>
                  ))}
                </section>

                <section className="gcard" aria-labelledby="du">
                  <h2 className="ch2" id="du"><span className="ms" aria-hidden="true">timer</span>Cuánto dura cada servicio</h2>
                  <p className="hint">Con esto la agenda y el portal saben qué horas ofrecer, para que las citas nunca se crucen.</p>
                  {(Object.keys(SERVICIOS) as Servicio[]).map((s) => (
                    <div className="durrow" key={s}>
                      <span className="ms" aria-hidden="true">{SERVICIOS[s].icon}</span>
                      <b>{SERVICIOS[s].txt}</b>
                      <select className="cell" aria-label={`Duración de ${SERVICIOS[s].txt}`} value={dur[s]} disabled={!admin} onChange={(e) => setDur((x) => x && ({ ...x, [s]: Number(e.target.value) }))}>
                        {LARGOS.map((m) => <option key={m} value={m}>{largoTxt(m)}</option>)}
                      </select>
                      <span className="chip" style={{ background: SERVICIOS[s].carril === 'spa' ? '#FBCFAF' : '#EADDFF', color: SERVICIOS[s].carril === 'spa' ? '#623F21' : '#4D3F6C' }}>{CARRILES[SERVICIOS[s].carril]}</span>
                    </div>
                  ))}
                </section>
              </div>

              <div className="hor__col">
                <section className="gcard" aria-labelledby="fe">
                  <h2 className="ch2" id="fe"><span className="ms" aria-hidden="true">event_busy</span>Festivos y cierres</h2>
                  <div className="sec tg" style={{ borderTop: 0, paddingTop: 0 }}>
                    <span className="ms" aria-hidden="true">flag</span>
                    <span className="tg__txt"><b>Cerrar los festivos de Colombia</b><span>Se calculan solos cada año.</span></span>
                    <button className="sw" type="button" role="switch" aria-checked={h.festivos} aria-label="Cerrar festivos" disabled={!admin} onClick={() => setH((x) => x && ({ ...x, festivos: !x.festivos }))}><i /></button>
                  </div>
                  {admin && (
                    <div className="cierre-n">
                      <div className="fld"><label htmlFor="ci-f">Día de cierre</label><input id="ci-f" type="date" min={iso(new Date())} value={nuevo.fecha} onChange={(e) => setNuevo((x) => ({ ...x, fecha: e.target.value }))} /></div>
                      <div className="fld"><label htmlFor="ci-n">Motivo</label><input id="ci-n" value={nuevo.nombre} placeholder="Ej: Capacitación de la doctora" onChange={(e) => setNuevo((x) => ({ ...x, nombre: e.target.value }))} /></div>
                      <button className="gbtn out sm" type="button" disabled={!nuevo.fecha || !nuevo.nombre.trim()} onClick={async () => {
                        try { const c = await agregarCierre({ fecha: nuevo.fecha, nombre: nuevo.nombre.trim() }); setCierres((l) => [...l, c]); setNuevo({ fecha: '', nombre: '' }); setAviso('Cierre agregado'); }
                        catch (e) { setAviso((e as Error).message); }
                      }}><span className="ms" aria-hidden="true">add</span>Agregar cierre</button>
                    </div>
                  )}
                  <div className="cierres">
                    {proximos.map((c) => {
                      const d = new Date(c.fecha + 'T12:00:00');
                      return (
                        <div className="cierre" key={c.tipo + c.fecha} data-cierre={c.tipo === 'Cierre' || undefined}>
                          <span className="cierre__d"><b>{d.getDate()}</b><span>{MESES[d.getMonth()].slice(0, 3)}</span></span>
                          <span className="cierre__t"><b>{c.nombre}</b><span>{DIAS[(d.getDay() + 6) % 7]}</span></span>
                          <span className="chip">{c.tipo}</span>
                          {c.tipo === 'Cierre' && admin && 'id' in c && <button type="button" className="vrow__x" aria-label={`Quitar cierre del ${c.fecha}`} onClick={async () => { await quitarCierre((c as Cierre).id!); setCierres((l) => l.filter((x) => x.id !== (c as Cierre).id)); }}><span className="ms">close</span></button>}
                        </div>
                      );
                    })}
                    {!proximos.length && <p className="hint">No hay cierres próximos.</p>}
                  </div>
                  <p className="hint">Si ya hay citas un día que cierras, reprográmalas desde la Agenda.</p>
                </section>

                <section className="gcard" aria-labelledby="as">
                  <h2 className="ch2" id="as"><span className="ms" aria-hidden="true">preview</span>Así queda el horario</h2>
                  <div className="prevh">{textoHorario(h).map((g) => <span key={g.dias}><b>{g.dias}:</b> {g.t}</span>)}</div>
                  <p className="hint">La agenda y el formulario del spa ya usan este horario. El pie de la página pública se actualiza en la próxima publicación.</p>
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
