// Servicios y tarifas del spa: tallas según el peso, precios por talla, qué se muestra en la web
// y cada cuánto se sugiere el próximo baño. Solo la administradora guarda cambios.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, money } from './lib';
import { leerTarifas, guardarTarifas, desde, TALLAS, type Tarifas, type ServicioSpa, type Mostrar, type TallaId } from './tarifas-datos';
import { leerDuraciones } from './agenda-datos';
import { Seg } from './clinica-ui';

const MODOS: { id: Mostrar; t: string; d: string }[] = [
  { id: 'desde', t: 'Mostrar «desde»', d: 'El precio más bajo de cada servicio. El valor exacto se confirma por WhatsApp. Recomendado.' },
  { id: 'tabla', t: 'Tabla completa por talla', d: 'Todos los precios a la vista. Más claro, pero más largo.' },
  { id: 'no', t: 'Sin precios', d: 'Solo «Escríbenos y te contamos el valor».' }
];
const num = (s: string) => { const d = s.replace(/\D/g, ''); return d ? Number(d) : null; };

export default function TarifasPagina() {
  const [t, setT] = useState<Tarifas | null>(null);
  const [orig, setOrig] = useState('');
  const [durSpa, setDurSpa] = useState(120);
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    leerTarifas().then((x) => { setT(x); setOrig(JSON.stringify(x)); }).catch(() => setAviso('No pudimos cargar las tarifas.'));
    leerDuraciones().then((d) => setDurSpa(d.spa)).catch(() => {});
  }, []);
  useEffect(() => { if (!aviso) return; const x = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(x); }, [aviso]);

  const cambios = !!t && JSON.stringify(t) !== orig;
  const set = (c: Partial<Tarifas>) => setT((x) => (x ? { ...x, ...c } : x));
  const setSv = (i: number, c: Partial<ServicioSpa>) => setT((x) => (x ? { ...x, servicios: x.servicios.map((s, n) => (n === i ? { ...s, ...c } : s)) } : x));
  const guardar = async () => {
    if (!t) return;
    const malos = t.servicios.filter((s) => !s.nombre.trim() || Object.values(s.precios).every((p) => p == null));
    if (malos.length) { setAviso('Cada servicio necesita un nombre y al menos un precio.'); return; }
    if (!(t.limites[0] < t.limites[1] && t.limites[1] < t.limites[2])) { setAviso('Los pesos de las tallas deben ir de menor a mayor.'); return; }
    setGuardando(true);
    try { await guardarTarifas(t); setOrig(JSON.stringify(t)); setAviso(t.mostrar === 'no' ? 'Guardado' : 'Guardado. La página de Spa ya muestra los cambios.'); }
    catch (e) { setAviso((e as Error).message); }
    setGuardando(false);
  };
  const base = t?.servicios.find((s) => s.id === 'bano');
  const vista = !t || !base ? '' : t.mostrar === 'desde' ? `Desde ${money(desde(base))} · el valor final depende del peso`
    : t.mostrar === 'tabla' ? TALLAS.filter((z) => base.precios[z.id] != null).map((z) => `${z.txt} ${money(base.precios[z.id]!)}`).join(' · ')
    : 'Escríbenos por WhatsApp y te contamos el valor.';

  return (
    <Shell activo="tarifas">
      {(yo) => {
        const puede = yo.rol === 'admin';
        return (
          <div className="tar">
            <div className="mhead">
              <div className="mhead__txt"><h1>Servicios y tarifas</h1><p>Lo que se muestra en la página de Spa y lo que usa el gestor para calcular el precio al confirmar una cita.</p></div>
              {DEMO && <span className="ex">Tarifas de ejemplo</span>}
              <a className="gbtn out sm" href={link('/spa')} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">visibility</span>Ver la página de Spa</a>
              {puede && <button type="button" className="gbtn sm" disabled={!cambios || guardando} onClick={guardar}><span className="ms" aria-hidden="true">check</span>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>}
            </div>
            {!puede && <p className="hint-g">Puedes ver las tarifas. Solo la administradora las cambia.</p>}
            {!t ? <p className="vacio">Cargando…</p> : (
              <>
                <section className="gcard" aria-labelledby="tz">
                  <h2 className="ch2" id="tz"><span className="ms" aria-hidden="true">monitor_weight</span>Tallas según el peso</h2>
                  <p className="hint">El cliente no tiene que saber su talla ni el largo del pelo: solo pone el peso en el formulario. El gestor calcula la talla y tú la confirmas al escribirle.</p>
                  <div className="tallas">
                    {TALLAS.map((z, i) => (
                      <div key={z.id} className="talla">
                        <span className="ms" aria-hidden="true" style={{ fontSize: 18 + Math.min(i, 3) * 4 }}>{z.icon}</span>
                        <b>{z.txt}</b>
                        {i < 3 ? (
                          <label>Hasta <input className="cell" inputMode="numeric" aria-label={`${z.txt}: hasta cuántos kg`} disabled={!puede} value={t.limites[i]}
                            onChange={(e) => { const l = [...t.limites] as Tarifas['limites']; l[i] = num(e.target.value) ?? 0; set({ limites: l }); }} /> kg</label>
                        ) : <span>{i === 3 ? `Más de ${t.limites[2]} kg` : 'Cualquier peso'}</span>}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="gcard" aria-labelledby="tsv">
                  <h2 className="ch2" id="tsv"><span className="ms" aria-hidden="true">shower</span>Servicios y precios por talla
                    {puede && <button type="button" className="link-add" onClick={() => set({ servicios: [...t.servicios, { id: 's' + Date.now(), nombre: '', tipo: 'adicional', desc: '', precios: { pequeno: null, mediano: null, grande: null, gigante: null, gato: null }, web: true }] })}><span className="ms" aria-hidden="true">add</span>Agregar servicio</button>}
                  </h2>
                  <div className="tsv" role="table" aria-label="Precios por talla">
                    <div className="tsv__r tsv__h" role="row">
                      <span role="columnheader">Servicio</span>
                      {TALLAS.map((z) => <span key={z.id} role="columnheader">{z.txt}</span>)}
                      <span role="columnheader">En la web</span><span />
                    </div>
                    {t.servicios.map((s, i) => (
                      <div key={s.id} className="tsv__r" role="row">
                        <div className="tsv__n" role="cell">
                          <div className="tsv__nt">
                            <input className="cell tsv__name" aria-label="Nombre del servicio" placeholder="Nombre. Ej: Hidratación" disabled={!puede} value={s.nombre} onChange={(e) => setSv(i, { nombre: e.target.value })} />
                            {s.id === 'bano' ? <span className="chip lav">Servicio</span> : (
                              <select className="cell tsv__tipo" aria-label="Tipo" disabled={!puede} value={s.tipo} onChange={(e) => setSv(i, { tipo: e.target.value as ServicioSpa['tipo'] })}>
                                <option value="servicio">Servicio</option><option value="adicional">Adicional</option>
                              </select>
                            )}
                          </div>
                          <input className="cell tsv__desc" aria-label="Descripción" placeholder="Descripción corta" disabled={!puede} value={s.desc} onChange={(e) => setSv(i, { desc: e.target.value })} />
                        </div>
                        {TALLAS.map((z) => (
                          <label key={z.id} className="tsv__p" role="cell">
                            <span className="tsv__lbl">{z.txt}</span>
                            <input className="cell" inputMode="numeric" placeholder="—" aria-label={`${s.nombre || 'Servicio'} · ${z.txt}`} disabled={!puede}
                              value={s.precios[z.id] == null ? '' : money(s.precios[z.id]!)}
                              onChange={(e) => setSv(i, { precios: { ...s.precios, [z.id as TallaId]: num(e.target.value) } })} />
                          </label>
                        ))}
                        <span className="tsv__w" role="cell"><span className="tsv__lbl">En la web</span>
                          <button type="button" className="sw" role="switch" aria-checked={s.web} aria-label={`${s.nombre}: mostrar en la web`} disabled={!puede} onClick={() => setSv(i, { web: !s.web })}><i /></button>
                        </span>
                        <span role="cell">{puede && s.id !== 'bano' && <button type="button" className="vrow__x" aria-label={`Quitar ${s.nombre}`} onClick={() => { if (confirm(`¿Quitar «${s.nombre || 'este servicio'}»?`)) set({ servicios: t.servicios.filter((_, n) => n !== i) }); }}><span className="ms">close</span></button>}</span>
                      </div>
                    ))}
                  </div>
                  <p className="hint">Los adicionales se suman al baño completo cuando confirmas la cita. Deja la casilla vacía si no aplica para esa talla. Lo que esté apagado en «En la web» solo se usa en el gestor. Cada baño ocupa {durSpa >= 60 ? `${durSpa / 60} ${durSpa === 60 ? 'hora' : 'horas'}` : `${durSpa} min`} en la agenda; eso se cambia en <a href={link('/gestor/horarios')}>Horarios</a>.</p>
                </section>

                <div className="tar__cols">
                  <section className="gcard" aria-labelledby="tmo">
                    <h2 className="ch2" id="tmo"><span className="ms" aria-hidden="true">sell</span>Cómo se ven los precios en la web</h2>
                    <div className="modos" role="radiogroup" aria-label="Cómo se ven los precios">
                      {MODOS.map((m) => (
                        <button key={m.id} type="button" role="radio" aria-checked={t.mostrar === m.id} disabled={!puede} onClick={() => set({ mostrar: m.id })}>
                          <span className="ms" aria-hidden="true">{t.mostrar === m.id ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                          <span><b>{m.t}</b><span>{m.d}</span></span>
                        </button>
                      ))}
                    </div>
                    <div className="tprev"><small>ASÍ SE VE EN LA PÁGINA</small><b>Baño completo</b><span data-no={t.mostrar === 'no' || undefined}>{vista}</span></div>
                    {DEMO && t.mostrar !== 'no' && <p className="hint-g">Antes de mostrar precios, cambia los de ejemplo por los reales.</p>}
                  </section>

                  <section className="gcard" aria-labelledby="tpx">
                    <h2 className="ch2" id="tpx"><span className="ms" aria-hidden="true">event_repeat</span>Próximo baño sugerido</h2>
                    <p className="hint">Al entregar una mascota, el gestor sugiere agendar el siguiente baño en este tiempo.</p>
                    {puede ? <Seg label="Próximo baño" value={String(t.proximo)} opts={[['4', 'Cada 4 semanas'], ['6', 'Cada 6 semanas'], ['8', 'Cada 8 semanas']]} onChange={(v) => set({ proximo: Number(v) })} />
                      : <p><b>Cada {t.proximo} semanas</b></p>}
                    <p className="hint">El horario del spa es el mismo del consultorio (<a href={link('/gestor/horarios')}>Horarios</a>). Hay un solo carril de spa: dos baños no se cruzan.</p>
                  </section>
                </div>
              </>
            )}
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}
