// Envíos y obsequio: las reglas que usan el carrito, los contadores de «te faltan» y los pedidos.
// Al guardar, el sitio se vuelve a publicar solo en unos minutos (las reglas quedan escritas en varias páginas).
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { sb, DEMO, store, money } from './lib';
import { ENVIOS_BASE, type Envios } from '../data/shop';

const CIUDADES = ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia'];
const K = 'alma-ej-envios';
async function leer(): Promise<Envios> {
  if (DEMO) return store.get<Envios>(K) ?? ENVIOS_BASE;
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'envios').maybeSingle();
  return { ...ENVIOS_BASE, ...((data?.valor as Partial<Envios>) ?? {}) };
}
async function guardar(e: Envios) {
  if (DEMO) { store.set(K, e); return; }
  const { data, error } = await sb!.from('ajustes').update({ valor: e }).eq('clave', 'envios').select('clave');
  if (error || !data?.length) throw new Error('No se guardó. Solo la administradora puede cambiar los envíos.');
}
const yLista = (l: string[]) => (l.length > 1 ? l.slice(0, -1).join(', ') + ' y ' + l[l.length - 1] : l[0] ?? '');
const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;

export default function EnviosPagina() {
  const [e, setE] = useState<Envios | null>(null);
  const [orig, setOrig] = useState('');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [sub, setSub] = useState(52000);
  const [lugar, setLugar] = useState('Medellín');
  useEffect(() => { leer().then((x) => { setE(x); setOrig(JSON.stringify(x)); }).catch(() => setAviso('No pudimos cargar las reglas.')); }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 4000); return () => window.clearTimeout(t); }, [aviso]);
  const set = (c: Partial<Envios>) => setE((x) => (x ? { ...x, ...c } : x));
  const cambios = !!e && JSON.stringify(e) !== orig;

  const enviar = async () => {
    if (!e) return;
    if (e.gratisDesde < 10000 || e.fijo < 0) { setAviso('Revisa los valores: el envío gratis desde debe ser mayor a $10.000.'); return; }
    if (!Object.values(e.pagos).some(Boolean)) { setAviso('Deja al menos una forma de pago.'); return; }
    setOcupado(true);
    try { await guardar(e); setOrig(JSON.stringify(e)); setAviso('Guardado. La tienda se actualiza en unos 10 minutos.'); } catch (x) { setAviso((x as Error).message); }
    setOcupado(false);
  };

  return (
    <Shell activo="envios">
      {(yo) => {
        const puede = yo.rol === 'admin';
        if (!e) return <p className="vacio">Cargando…</p>;
        const local = e.ciudades.includes(lugar), porMonto = sub >= e.gratisDesde, envio = local || porMonto ? 0 : e.fijo;
        return (
          <div className="env">
            <div className="mhead">
              <div className="mhead__txt"><h1>Envíos y obsequio</h1><p>Las reglas que usan el carrito, los contadores de «te faltan» y los pedidos.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
              {puede && <button type="button" className="gbtn sm" disabled={!cambios || ocupado} onClick={enviar}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button>}
            </div>
            {!puede && <p className="hint-g">Puedes ver las reglas. Solo la administradora las cambia.</p>}
            <div className="env__grid">
              <div className="env__col">
                <section className="gcard" aria-labelledby="en1">
                  <h2 className="ch2" id="en1"><span className="ms" aria-hidden="true">local_shipping</span>Envío</h2>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">location_city</span>
                    <span className="regla__t"><b>Gratis siempre en</b><span>Sin importar el valor del pedido.</span></span>
                    <div className="regla__v filts">
                      {CIUDADES.map((c) => <button key={c} type="button" className="filt" aria-pressed={e.ciudades.includes(c)} disabled={!puede}
                        onClick={() => set({ ciudades: e.ciudades.includes(c) ? e.ciudades.filter((x) => x !== c) : [...e.ciudades, c] })}>{e.ciudades.includes(c) && <span className="ms" aria-hidden="true">check</span>}{c}</button>)}
                    </div>
                  </div>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">public</span>
                    <span className="regla__t"><b>Gratis a toda Colombia desde</b><span>Por debajo de este valor, el resto del país paga envío.</span></span>
                    <input className="cell regla__n" inputMode="numeric" aria-label="Envío gratis desde" disabled={!puede} value={money(e.gratisDesde)} onChange={(x) => set({ gratisDesde: num(x.target.value) })} />
                  </div>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">package_2</span>
                    <span className="regla__t"><b>Si no llega al mínimo</b><span>Valor fijo del envío fuera de {yLista(e.ciudades) || 'las ciudades gratis'}.</span></span>
                    <input className="cell regla__n" inputMode="numeric" aria-label="Valor del envío" disabled={!puede} value={money(e.fijo)} onChange={(x) => set({ fijo: num(x.target.value) })} />
                  </div>
                  <div className="regla">
                    <span className="ms" aria-hidden="true">bolt</span>
                    <span className="regla__t"><b>Envío prioritario</b><span>El pedido sale primero. Se ofrece como casilla en el carrito.</span></span>
                    <span className="regla__v">
                      {e.prioritario.activo && <input className="cell regla__n" inputMode="numeric" aria-label="Valor del envío prioritario" disabled={!puede} value={money(e.prioritario.valor)} onChange={(x) => set({ prioritario: { ...e.prioritario, valor: num(x.target.value) } })} />}
                      <button type="button" className="sw" role="switch" aria-checked={e.prioritario.activo} aria-label="Ofrecer envío prioritario" disabled={!puede} onClick={() => set({ prioritario: { ...e.prioritario, activo: !e.prioritario.activo } })}><i /></button>
                    </span>
                  </div>
                </section>

                <section className="gcard" aria-labelledby="en2">
                  <h2 className="ch2" id="en2"><span className="ms" aria-hidden="true">redeem</span>Obsequio
                    <button type="button" className="sw ch2__chip" role="switch" aria-checked={e.obsequio.activo} aria-label="Dar obsequio" disabled={!puede} onClick={() => set({ obsequio: { ...e.obsequio, activo: !e.obsequio.activo } })}><i /></button></h2>
                  {e.obsequio.activo ? <>
                    <div className="regla">
                      <span className="ms" aria-hidden="true">savings</span>
                      <span className="regla__t"><b>Desde</b><span>Lo ideal es un poco por encima del envío gratis, para que sumen un producto más.</span></span>
                      <input className="cell regla__n" inputMode="numeric" aria-label="Obsequio desde" disabled={!puede} value={money(e.obsequio.desde)} onChange={(x) => set({ obsequio: { ...e.obsequio, desde: num(x.target.value) } })} />
                    </div>
                    <div className="regla">
                      <span className="ms" aria-hidden="true">inventory_2</span>
                      <span className="regla__t"><b>Qué se regala</b><span>Sale en el carrito y en el pedido. Ej: snack dental.</span></span>
                      <input className="cell regla__txt" aria-label="Qué se regala" maxLength={40} disabled={!puede} value={e.obsequio.nombre} onChange={(x) => set({ obsequio: { ...e.obsequio, nombre: x.target.value } })} />
                    </div>
                    {e.obsequio.desde <= e.gratisDesde && <p className="hint-g">El obsequio sale antes que el envío gratis. Súbelo un poco para que sumen un producto más.</p>}
                  </> : <p className="hint">Apagado: el carrito no muestra la barra del obsequio.</p>}
                </section>

                <section className="gcard" aria-labelledby="en3">
                  <h2 className="ch2" id="en3"><span className="ms" aria-hidden="true">payments</span>Formas de pago</h2>
                  <p className="hint">Se nombran en el carrito; el pago lo coordinas por WhatsApp al confirmar el pedido.</p>
                  {([['contraentrega', 'local_atm', 'Contraentrega', 'Pagan en efectivo al recibir.'], ['transferencia', 'account_balance', 'Transferencia', 'Nequi, Daviplata o banco. Los números los mandas al confirmar.'], ['consultorio', 'storefront', 'Pagar en el consultorio', 'Si pasan a recoger el pedido.']] as const).map(([k, icon, t, d]) => (
                    <div key={k} className="regla">
                      <span className="ms" aria-hidden="true">{icon}</span>
                      <span className="regla__t"><b>{t}</b><span>{d}</span></span>
                      <button type="button" className="sw" role="switch" aria-checked={e.pagos[k]} aria-label={t} disabled={!puede} onClick={() => set({ pagos: { ...e.pagos, [k]: !e.pagos[k] } })}><i /></button>
                    </div>
                  ))}
                  <p className="canal"><span className="ms" aria-hidden="true">credit_card</span><span><b>Pago en línea con Wompi</b> · más adelante<span>No cobra mensualidad, pero sí una comisión por venta (aprox. 2,7 % a 3,5 % + IVA según el medio). Mientras tanto, la transferencia sigue siendo gratis.</span></span></p>
                </section>
              </div>

              <section className="gcard env__sim" aria-labelledby="en4">
                <h2 className="ch2" id="en4"><span className="ms" aria-hidden="true">shopping_cart_checkout</span>Pruébalo como cliente</h2>
                <div className="sfld"><span className="sfld__lbl">Valor del carrito</span>
                  <div className="filts">{[30000, 52000, 75000, 90000].map((v) => <button key={v} type="button" className="filt" aria-pressed={sub === v} onClick={() => setSub(v)}>{money(v)}</button>)}</div></div>
                <div className="sfld"><span className="sfld__lbl">Ciudad</span>
                  <div className="filts">{['Pereira', 'Dosquebradas', 'Medellín'].map((v) => <button key={v} type="button" className="filt" aria-pressed={lugar === v} onClick={() => setLugar(v)}>{v}</button>)}</div></div>
                <div className="sim">
                  <small>ASÍ LO VE EN EL CARRITO</small>
                  <p className="sim__m"><span className="ms" aria-hidden="true">{envio ? 'local_shipping' : 'celebration'}</span>
                    <span>{local ? `Envío gratis en ${lugar}.` : porMonto ? `¡Lograste el envío gratis a ${lugar}!` : <>Te faltan <b>{money(e.gratisDesde - sub)}</b> para el envío gratis.</>}</span></p>
                  {e.obsequio.activo && <p className="sim__m sim__m--g"><span className="ms" aria-hidden="true">redeem</span>
                    <span>{sub >= e.obsequio.desde ? <>Tu pedido lleva de obsequio un <b>{e.obsequio.nombre}</b>.</> : <>Agrega <b>{money(e.obsequio.desde - sub)}</b> más y llévate un <b>obsequio</b>.</>}</span></p>}
                  <dl className="tot">
                    <div><dt>Subtotal</dt><dd>{money(sub)}</dd></div>
                    <div><dt>Envío</dt><dd>{envio ? money(envio) : 'Gratis'}</dd></div>
                    <div className="tot__t"><dt>Total</dt><dd>{money(sub + envio)}</dd></div>
                  </dl>
                </div>
              </section>
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}
