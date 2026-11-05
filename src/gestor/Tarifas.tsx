// Servicios y tarifas del spa, como la hoja del local: precio por tipo de pelo y peso (ya incluye el baño),
// solo uñas, los adicionales, lo que no se recibe, qué se muestra en la web y cada cuánto el próximo baño.
// Solo la administradora guarda cambios.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, money } from './lib';
import { leerTarifas, guardarTarifas, desde, filaTxt, adicionalTxt, type Tarifas, type Tabla, type Fila, type Adicional, type Mostrar } from './tarifas-datos';
import { leerDuraciones } from './agenda-datos';
import { Seg } from './clinica-ui';

const MODOS: { id: Mostrar; t: string; d: string }[] = [
  { id: 'desde', t: 'Mostrar «desde»', d: 'El precio más bajo de cada tipo de pelo. El valor exacto se confirma por WhatsApp. Recomendado.' },
  { id: 'tabla', t: 'Tablas completas', d: 'Todos los precios por peso a la vista. Más claro, pero más largo.' },
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
  const setTab = (i: number, c: Partial<Tabla>) => setT((x) => (x ? { ...x, tablas: x.tablas.map((s, n) => (n === i ? { ...s, ...c } : s)) } : x));
  const setFila = (i: number, j: number, c: Partial<Fila>) => setT((x) => (x ? { ...x, tablas: x.tablas.map((s, n) => (n === i ? { ...s, filas: s.filas.map((f, m) => (m === j ? { ...f, ...c } : f)) } : s)) } : x));
  const setAd = (i: number, c: Partial<Adicional>) => setT((x) => (x ? { ...x, adicionales: x.adicionales.map((s, n) => (n === i ? { ...s, ...c } : s)) } : x));

  const revisar = (t: Tarifas): string => {
    for (const tb of t.tablas) {
      if (!tb.nombre.trim()) return 'Cada tabla necesita un nombre.';
      if (!tb.filas.length) return `«${tb.nombre}» no tiene precios.`;
      if (tb.filas.some((f) => !f.precio)) return `En «${tb.nombre}» falta algún precio.`;
      if (!tb.porPeso && tb.filas.some((f) => !f.nombre?.trim())) return `En «${tb.nombre}» falta el nombre de alguna opción.`;
      if (tb.porPeso) {
        const ks = tb.filas.map((f) => f.hasta);
        if (ks.slice(0, -1).some((k) => k == null)) return `En «${tb.nombre}» solo la última fila puede ser «Más de…».`;
        for (let n = 1; n < ks.length; n++) if (ks[n] != null && ks[n]! <= ks[n - 1]!) return `En «${tb.nombre}» los pesos deben ir de menor a mayor.`;
      }
    }
    if (t.adicionales.some((a) => !a.nombre.trim())) return 'Cada adicional necesita un nombre.';
    return '';
  };
  const guardar = async () => {
    if (!t) return;
    const malo = revisar(t);
    if (malo) { setAviso(malo); return; }
    setGuardando(true);
    try { await guardarTarifas(t); setOrig(JSON.stringify(t)); setAviso(t.mostrar === 'no' ? 'Guardado' : 'Guardado. La página de Spa ya muestra los cambios.'); }
    catch (e) { setAviso((e as Error).message); }
    setGuardando(false);
  };
  const base = t?.tablas.find((x) => x.web && x.bano);
  const vista = !t || !base ? '' : t.mostrar === 'desde' ? `Desde ${money(desde(base))} · el valor final depende del peso`
    : t.mostrar === 'tabla' ? base.filas.slice(0, 3).map((_, j) => `${filaTxt(base, j)} ${money(base.filas[j].precio)}`).join(' · ') + ' …'
    : 'Escríbenos por WhatsApp y te contamos el valor.';

  return (
    <Shell activo="tarifas">
      {(yo) => {
        const puede = yo.rol === 'admin';
        return (
          <div className="tar">
            <div className="mhead">
              <div className="mhead__txt"><h1>Servicios y tarifas</h1><p>Lo que se muestra en la página de Spa y lo que usa el gestor para calcular el precio al confirmar una cita.</p></div>
              <a className="gbtn out sm" href={link('/spa')} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">visibility</span>Ver la página de Spa</a>
              {puede && <button type="button" className="gbtn sm" disabled={!cambios || guardando} onClick={guardar}><span className="ms" aria-hidden="true">check</span>{guardando ? 'Guardando…' : 'Guardar cambios'}</button>}
            </div>
            {!puede && <p className="hint-g">Puedes ver las tarifas. Solo la administradora las cambia.</p>}
            {!t ? <p className="vacio">Cargando…</p> : (
              <>
                <section className="gcard" aria-labelledby="tpel">
                  <h2 className="ch2" id="tpel"><span className="ms" aria-hidden="true">shower</span>Precios por tipo de pelo y peso
                    {puede && <button type="button" className="link-add" onClick={() => set({ tablas: [...t.tablas, { id: 't' + Date.now(), nombre: '', razas: '', porPeso: true, abundante: false, bano: true, web: true, filas: [{ hasta: 10, precio: 0 }, { hasta: null, precio: 0 }] }] })}><span className="ms" aria-hidden="true">add</span>Agregar tabla</button>}
                  </h2>
                  <p className="hint">Los precios ya incluyen el baño completo (menos «Solo corte de uñas»). El cliente solo pone la raza y el peso: el gestor elige la tabla y la fila, y tú la confirmas en la cita.</p>
                  <div className="ttabs">
                    {t.tablas.map((tb, i) => (
                      <div key={tb.id} className="ttab">
                        <div className="ttab__h">
                          <input className="cell ttab__n" aria-label="Nombre de la tabla" placeholder="Nombre. Ej: Pelo corto" disabled={!puede} value={tb.nombre} onChange={(e) => setTab(i, { nombre: e.target.value })} />
                          <span className="ttab__w"><span className="tsv__lbl">En la web</span>
                            <button type="button" className="sw" role="switch" aria-checked={tb.web} aria-label={`${tb.nombre}: mostrar en la web`} disabled={!puede} onClick={() => setTab(i, { web: !tb.web })}><i /></button></span>
                          {puede && <button type="button" className="vrow__x" aria-label={`Quitar la tabla ${tb.nombre}`} onClick={() => { if (confirm(`¿Quitar la tabla «${tb.nombre || 'sin nombre'}»?`)) set({ tablas: t.tablas.filter((_, n) => n !== i) }); }}><span className="ms">close</span></button>}
                        </div>
                        <input className="cell ttab__r" aria-label="Razas" placeholder="Razas. Ej: Pinscher, pitbull y similares" disabled={!puede} value={tb.razas} onChange={(e) => setTab(i, { razas: e.target.value })} />
                        <div className="tfilas" data-ab={tb.abundante || undefined}>
                          <div className="tfila tfila--h" aria-hidden="true"><span>{tb.porPeso ? 'Peso' : 'Opción'}</span><span>Precio</span>{tb.abundante && <span>Pelo abundante</span>}<span /></div>
                          {tb.filas.map((f, j) => (
                            <div key={j} className="tfila">
                              {tb.porPeso ? (
                                <span className="tfila__k">
                                  {j === tb.filas.length - 1 && f.hasta == null ? <span>{filaTxt(tb, j)}</span> : (
                                    <label>{j === 0 ? 'Hasta' : `De ${tb.filas[j - 1].hasta ?? '…'} a`}
                                      <input className="cell" inputMode="numeric" aria-label={`${tb.nombre}: hasta cuántos kg`} disabled={!puede} value={f.hasta ?? ''} onChange={(e) => setFila(i, j, { hasta: num(e.target.value) ?? 0 })} /> kg</label>
                                  )}
                                </span>
                              ) : <input className="cell" aria-label="Nombre de la opción" placeholder="Ej: Pelo largo" disabled={!puede} value={f.nombre ?? ''} onChange={(e) => setFila(i, j, { nombre: e.target.value })} />}
                              <input className="cell tfila__p" inputMode="numeric" placeholder="$0" aria-label={`${tb.nombre} · ${filaTxt(tb, j)} · precio`} disabled={!puede} value={f.precio ? money(f.precio) : ''} onChange={(e) => setFila(i, j, { precio: num(e.target.value) ?? 0 })} />
                              {tb.abundante && <input className="cell tfila__p" inputMode="numeric" placeholder="—" aria-label={`${tb.nombre} · ${filaTxt(tb, j)} · pelo abundante`} disabled={!puede} value={f.abundante ? money(f.abundante) : ''} onChange={(e) => setFila(i, j, { abundante: num(e.target.value) })} />}
                              <span>{puede && tb.filas.length > 1 && <button type="button" className="vrow__x" aria-label={`Quitar ${filaTxt(tb, j)}`} onClick={() => setTab(i, { filas: tb.filas.filter((_, m) => m !== j) })}><span className="ms">close</span></button>}</span>
                            </div>
                          ))}
                        </div>
                        {puede && (
                          <div className="ttab__acts">
                            <button type="button" className="link-add" onClick={() => {
                              if (!tb.porPeso) { setTab(i, { filas: [...tb.filas, { hasta: null, nombre: '', precio: 0 }] }); return; }
                              // la fila nueva va antes de «Más de…» (si la hay)
                              const ult = tb.filas[tb.filas.length - 1], abierta = ult?.hasta == null;
                              const prev = abierta ? tb.filas[tb.filas.length - 2]?.hasta ?? 0 : ult?.hasta ?? 0;
                              const nueva: Fila = { hasta: prev + 5, precio: 0 };
                              setTab(i, { filas: abierta ? [...tb.filas.slice(0, -1), nueva, ult] : [...tb.filas, nueva] });
                            }}><span className="ms" aria-hidden="true">add</span>{tb.porPeso ? 'Agregar peso' : 'Agregar opción'}</button>
                            {tb.porPeso && tb.filas[tb.filas.length - 1]?.hasta != null && <button type="button" className="link-add" onClick={() => setTab(i, { filas: [...tb.filas, { hasta: null, precio: 0 }] })}><span className="ms" aria-hidden="true">add</span>Agregar «Más de {tb.filas[tb.filas.length - 1].hasta} kg»</button>}
                            <label className="ttab__chk"><input type="checkbox" checked={tb.abundante} onChange={(e) => setTab(i, { abundante: e.target.checked })} />Precio para pelo abundante</label>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>

                <section className="gcard" aria-labelledby="tad">
                  <h2 className="ch2" id="tad"><span className="ms" aria-hidden="true">add_circle</span>Adicionales
                    {puede && <button type="button" className="link-add" onClick={() => set({ adicionales: [...t.adicionales, { id: 'a' + Date.now(), nombre: '', desc: '', precio: 0, kg: null, precioMas: null, variable: false, web: true }] })}><span className="ms" aria-hidden="true">add</span>Agregar adicional</button>}
                  </h2>
                  <p className="hint">Se suman al precio cuando los activas en la cita. «Valor variable» es para lo que cambia cada vez (transporte, nudos): el valor se escribe en cada cita.</p>
                  <div className="tads">
                    {t.adicionales.map((a, i) => (
                      <div key={a.id} className="tad">
                        <div className="tsv__n">
                          <input className="cell tsv__name" aria-label="Nombre del adicional" placeholder="Nombre. Ej: Transporte" disabled={!puede} value={a.nombre} onChange={(e) => setAd(i, { nombre: e.target.value })} />
                          <input className="cell tsv__desc" aria-label="Descripción" placeholder="Descripción corta" disabled={!puede} value={a.desc} onChange={(e) => setAd(i, { desc: e.target.value })} />
                        </div>
                        <label className="tad__f"><span className="tsv__lbl">{a.variable ? 'Valor sugerido' : a.kg != null ? `Hasta ${a.kg} kg` : 'Precio'}</span>
                          <input className="cell tfila__p" inputMode="numeric" placeholder="$0" disabled={!puede} value={a.precio ? money(a.precio) : ''} onChange={(e) => setAd(i, { precio: num(e.target.value) ?? 0 })} /></label>
                        {!a.variable && (
                          <label className="tad__f"><span className="tsv__lbl">Si pesa más de</span>
                            <span className="tad__kg"><input className="cell" inputMode="numeric" placeholder="—" aria-label={`${a.nombre}: kilos`} disabled={!puede} value={a.kg ?? ''} onChange={(e) => setAd(i, { kg: num(e.target.value) })} /> kg
                              <input className="cell tfila__p" inputMode="numeric" placeholder="$0" aria-label={`${a.nombre}: precio si pesa más`} disabled={!puede || a.kg == null} value={a.precioMas ? money(a.precioMas) : ''} onChange={(e) => setAd(i, { precioMas: num(e.target.value) })} /></span></label>
                        )}
                        <span className="tad__s"><span className="tsv__lbl">Valor variable</span>
                          <button type="button" className="sw" role="switch" aria-checked={a.variable} aria-label={`${a.nombre}: valor variable`} disabled={!puede} onClick={() => setAd(i, { variable: !a.variable })}><i /></button></span>
                        <span className="tad__s"><span className="tsv__lbl">En la web</span>
                          <button type="button" className="sw" role="switch" aria-checked={a.web} aria-label={`${a.nombre}: mostrar en la web`} disabled={!puede} onClick={() => setAd(i, { web: !a.web })}><i /></button></span>
                        <span className="tad__x">{puede && <button type="button" className="vrow__x" aria-label={`Quitar ${a.nombre}`} onClick={() => { if (confirm(`¿Quitar «${a.nombre || 'este adicional'}»?`)) set({ adicionales: t.adicionales.filter((_, n) => n !== i) }); }}><span className="ms">close</span></button>}</span>
                        <small className="tad__v">{adicionalTxt(a)}</small>
                      </div>
                    ))}
                  </div>
                  <p className="hint">Cada baño ocupa {durSpa >= 60 ? `${durSpa / 60} ${durSpa === 60 ? 'hora' : 'horas'}` : `${durSpa} min`} en la agenda; eso se cambia en <a href={link('/gestor/horarios')}>Horarios</a>.</p>
                </section>

                <section className="gcard" aria-labelledby="tcon">
                  <h2 className="ch2" id="tcon"><span className="ms" aria-hidden="true">block</span>Lo que no se recibe</h2>
                  <p className="hint">Una condición por línea. Se muestran en la página de Spa junto a los precios.</p>
                  <label className="sr-only" htmlFor="tcon-t">Condiciones</label>
                  <textarea id="tcon-t" className="cell tcon" rows={5} disabled={!puede} value={t.condiciones.join('\n')} onChange={(e) => set({ condiciones: e.target.value.split('\n') })}
                    onBlur={() => set({ condiciones: t.condiciones.map((x) => x.trim()).filter(Boolean) })} />
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
                    <div className="tprev"><small>ASÍ SE VE EN LA PÁGINA</small><b>{base?.nombre ?? 'Baño'}</b><span data-no={t.mostrar === 'no' || undefined}>{vista}</span></div>
                  </section>

                  <section className="gcard" aria-labelledby="tpx">
                    <h2 className="ch2" id="tpx"><span className="ms" aria-hidden="true">event_repeat</span>Próximo baño sugerido</h2>
                    <p className="hint">Al entregar una mascota, el gestor sugiere agendar el siguiente baño en este tiempo.</p>
                    {puede ? <Seg label="Próximo baño" value={String(t.proximo)} opts={[['4', 'Cada 4 semanas'], ['6', 'Cada 6 semanas'], ['8', 'Cada 8 semanas']]} onChange={(v) => set({ proximo: Number(v) })} />
                      : <p><b>Cada {t.proximo} semanas</b></p>}
                    <p className="hint">El horario del spa es el mismo del consultorio (<a href={link('/gestor/horarios')}>Horarios</a>). Hay un solo carril de spa: dos baños no se cruzan.</p>
                  </section>
                </div>
                {DEMO && <p className="hint">Modo de ejemplo: los cambios se guardan solo en este navegador.</p>}
              </>
            )}
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}
