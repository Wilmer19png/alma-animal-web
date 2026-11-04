// Contabilidad: lo que entró (consultas, vacunas, baños y tienda), lo que salió en gastos, la ganancia del mes
// y cuánto le toca a cada socio. Lo que entra sale solo de la Agenda, Citas de spa y Pedidos; aquí se registran
// los gastos, los ingresos sueltos y los gastos fijos de cada mes. Solo la ve la administradora.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, money, store } from './lib';
import { iso } from './agenda-datos';
import {
  cargarLibro, resumen, guardarMov, borrarMov, guardarFijo, pagarSocio, deshacerPagoSocio, subirFactura, verFactura, csvDelMes,
  CATS_I, CATS_G, MEDIOS, catTxt, catIcon, mesActual, mesTxt, sumarMeses, venceEn,
  type Libro, type Linea, type Cat, type CatI, type CatG, type GastoFijo, type Movimiento
} from './contabilidad-datos';
import type { Miembro } from './session';

type Tipo = 'ingreso' | 'gasto';
type Filtro = 'todos' | Tipo;
const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) + ' %' : '0 %');
const fechaTxt = (f: string) => { const d = new Date(f + 'T12:00:00'); return `${String(d.getDate()).padStart(2, '0')} ${mesTxt(f.slice(0, 7), false).slice(0, 3)}`; };
const FILTRO_K = 'alma-conta-filtro';

export default function Contabilidad() {
  return <Shell activo="contabilidad">{(yo) => (yo.rol === 'admin'
    ? <LibroMes yo={yo} />
    : <section className="gcard vacio-c"><p className="vacio">La contabilidad solo la ve la administradora.</p></section>)}</Shell>;
}

function LibroMes({ yo }: { yo: Miembro }) {
  const [mes, setMes] = useState(mesActual);
  const [libro, setLibro] = useState<Libro | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const cargar = useCallback(() => { cargarLibro(mes).then((l) => { setLibro(l); setError(''); }).catch((e) => setError((e as Error).message)); }, [mes]);
  useEffect(() => { setLibro(null); cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);
  const intentar = async (f: () => Promise<unknown>, ok: string) => { try { await f(); setAviso(ok); cargar(); } catch (e) { setAviso((e as Error).message); } };

  const meses = Array.from({ length: 13 }, (_, i) => sumarMeses(mesActual(), -i));
  const descargar = () => {
    if (!libro) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csvDelMes(libro.lineas, mes)], { type: 'text/csv;charset=utf-8' }));
    a.download = `alma-animal-contabilidad-${mes}.csv`;
    a.click();
    window.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <div className="cont">
      <div className="mhead">
        <div className="mhead__txt"><h1>Contabilidad</h1><p>Lo que entra por consultas, baños y tienda, lo que sale en gastos, y cuánto le toca a cada socio.</p></div>
        {DEMO && <span className="ex">Datos de ejemplo</span>}
        <label className="sr-only" htmlFor="c-mes">Mes</label>
        <select id="c-mes" className="cell cont__mes" value={mes} onChange={(e) => setMes(e.target.value)}>
          {meses.map((m) => <option key={m} value={m}>{mesTxt(m)[0].toUpperCase() + mesTxt(m).slice(1)}{m === mesActual() ? ' (en curso)' : ''}</option>)}
        </select>
        <button type="button" className="gbtn out sm" disabled={!libro} onClick={descargar}><span className="ms" aria-hidden="true">download</span>Descargar para el contador</button>
      </div>
      {error && <p className="gerr" role="alert">{error}</p>}
      {!libro ? <p className="vacio">Cargando…</p> : <Mes libro={libro} mes={mes} yo={yo} intentar={intentar} />}
      <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
    </div>
  );
}

function Mes({ libro, mes, yo, intentar }: { libro: Libro; mes: string; yo: Miembro; intentar: (f: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const actual = mes === mesActual();
  const delMes = libro.lineas.filter((l) => l.fecha.startsWith(mes));
  const hechas = delMes.filter((l) => !l.espera);
  // en espera: lo del mes y, en el mes en curso, todos los pedidos que siguen sin pagar
  const espera = libro.lineas.filter((l) => l.espera && (l.fecha.startsWith(mes) || (actual && l.origen === 'pedido')));
  const sumar = (f: (l: Linea) => boolean) => hechas.filter(f).reduce((n, l) => n + l.valor, 0);
  const ing = (Object.keys(CATS_I) as CatI[]).map((k) => ({ k, v: sumar((l) => l.tipo === 'ingreso' && l.cat === k), n: hechas.filter((l) => l.tipo === 'ingreso' && l.cat === k).length }));
  const gas = (Object.keys(CATS_G) as CatG[]).map((k) => ({ k, v: sumar((l) => l.tipo === 'gasto' && l.cat === k) }));
  const totI = ing.reduce((n, x) => n + x.v, 0), totG = gas.reduce((n, x) => n + x.v, 0);
  const totF = gas.filter((x) => CATS_G[x.k].fijo).reduce((n, x) => n + x.v, 0);
  const r = resumen(libro, mes);
  const meta = gas.find((x) => x.k === 'meta')!.v;
  const maxI = Math.max(1, ...ing.map((x) => x.v)), maxG = Math.max(1, ...gas.map((x) => x.v));
  const totEspera = espera.reduce((n, l) => n + l.valor, 0);
  const nAtenciones = hechas.filter((l) => l.tipo === 'ingreso' && l.origen !== 'manual').length;

  return (
    <>
      <div className="kpis">
        <div className="kpi"><span><span className="ms cont__up" aria-hidden="true">trending_up</span>Entró</span><b className="cont__up">{money(totI)}</b><small>{nAtenciones} consultas, baños y ventas</small></div>
        <div className="kpi"><span><span className="ms cont__down" aria-hidden="true">trending_down</span>Salió en gastos</span><b className="cont__down">{money(totG)}</b><small>Fijos {money(totF)} · Variables {money(totG - totF)}</small></div>
        <div className="kpi kpi--dark"><span><span className="ms" aria-hidden="true">savings</span>Ganancia del mes</span><b>{r.ganancia < 0 ? '− ' : ''}{money(Math.abs(r.ganancia))}</b><small>{pct(r.ganancia, totI)} de lo que entró</small></div>
        <div className="kpi"><span><span className="ms" aria-hidden="true">handshake</span>A repartir</span><b>{money(r.aRepartir)}</b><small>{libro.socios.map((s) => `${s.nombre.split(' ')[0]} ${s.pct} %`).join(' · ')}</small></div>
      </div>

      <div className="cont__grid">
        {/* ---------- DE DÓNDE ENTRA Y A DÓNDE VA ---------- */}
        <section className="gcard" aria-labelledby="c-flujo">
          <h2 className="ch2" id="c-flujo"><span className="ms" aria-hidden="true">donut_large</span>De dónde entra y a dónde se va</h2>
          <div className="flujo">
            <div className="flujo__col">
              <span className="flujo__h cont__up"><span>ENTRADAS</span><span>{money(totI)}</span></span>
              {ing.filter((x) => x.v || x.k !== 'otro_ingreso').map((x) => (
                <div key={x.k} className="cbar">
                  <span className="cbar__ic cbar__ic--i"><span className="ms" aria-hidden="true">{CATS_I[x.k].icon}</span></span>
                  <span className="cbar__n">{CATS_I[x.k].txt}<small>{x.k === 'tienda' ? 'solo pedidos pagados' : x.k === 'otro_ingreso' ? 'registrados a mano' : `${x.n} ${x.k === 'spa' ? 'baños entregados' : 'hechas'}`}</small></span>
                  <span className="cbar__v">{money(x.v)}</span>
                  <span className="cbar__tr"><i style={{ width: Math.max(3, (x.v / maxI) * 100) + '%' }} /></span>
                </div>
              ))}
              <p className="hint cont__nota"><span className="ms" aria-hidden="true">bolt</span><span>Nada suma mientras esté en espera. Consultas y vacunas entran al marcarlas como hechas en la <a href={link('/gestor/agenda')}>Agenda</a>; los baños, al entregarlos en <a href={link('/gestor/spa')}>Citas de spa</a>; la tienda, al confirmar el pago en <a href={link('/gestor/pedidos')}>Pedidos</a>.</span></p>
              {totEspera > 0 && <p className="conta"><span className="ms" aria-hidden="true">hourglass_top</span><span><b>En espera: {money(totEspera)}</b> ({espera.length} {espera.length === 1 ? 'movimiento' : 'movimientos'}). No suma todavía.</span></p>}
            </div>
            <div className="flujo__col">
              <span className="flujo__h cont__down"><span>GASTOS</span><span>{money(totG)}</span></span>
              {gas.map((x) => (
                <div key={x.k} className="cbar">
                  <span className={'cbar__ic ' + (x.k === 'meta' ? 'cbar__ic--meta' : 'cbar__ic--g')}><span className="ms" aria-hidden="true">{CATS_G[x.k].icon}</span></span>
                  <span className="cbar__n">{CATS_G[x.k].txt}<small>{CATS_G[x.k].fijo ? 'Gasto fijo' : 'Variable'}</small></span>
                  <span className="cbar__v">{money(x.v)}</span>
                  <span className={'cbar__tr ' + (x.k === 'meta' ? 'cbar__tr--meta' : 'cbar__tr--g')}><i style={{ width: Math.max(3, (x.v / maxG) * 100) + '%' }} /></span>
                </div>
              ))}
            </div>
          </div>
          <p className="cont__meta"><span className="ms" aria-hidden="true">campaign</span><span><b>Pauta en Meta: {money(meta)}</b> en {mesTxt(mes, false)} ({pct(meta, totG)} de los gastos).</span></p>
        </section>

        <Reparto libro={libro} mes={mes} totI={totI} totG={totG} r={r} actual={actual} intentar={intentar} />
      </div>

      <div className="cont__grid">
        <Movimientos lineas={[...espera, ...hechas].sort((a, b) => b.fecha.localeCompare(a.fecha) || Number(b.espera) - Number(a.espera))} mes={mes} intentar={intentar} />
        <div className="cont__col">
          <Registrar yo={yo} mes={mes} intentar={intentar} />
          <Fijos libro={libro} mes={mes} intentar={intentar} />
        </div>
      </div>
    </>
  );
}

/* ---------- reparto entre socios ---------- */
function Reparto({ libro, mes, totI, totG, r, actual, intentar }: { libro: Libro; mes: string; totI: number; totG: number; r: ReturnType<typeof resumen>; actual: boolean; intentar: (f: () => Promise<unknown>, ok: string) => Promise<void> }) {
  return (
    <section className="gcard" aria-labelledby="c-rep">
      <h2 className="ch2" id="c-rep"><span className="ms" aria-hidden="true">handshake</span>Reparto entre socios</h2>
      <dl className="cuenta">
        <div><dt>Entró</dt><dd className="cont__up">{money(totI)}</dd></div>
        <div><dt>Menos gastos</dt><dd className="cont__down">− {money(totG)}</dd></div>
        {r.arrastre < 0 && <div><dt>Pérdida de meses anteriores</dt><dd className="cont__down">− {money(-r.arrastre)}</dd></div>}
        <div className="cuenta__t"><dt>Ganancia a repartir</dt><dd>{money(r.aRepartir)}</dd></div>
      </dl>
      {r.perdida < 0 && <p className="gerr">Este mes da pérdida de {money(-r.perdida)}: no se reparte y se descuenta del mes siguiente.</p>}
      <div className="socios">
        {libro.socios.map((s) => {
          const pago = libro.repartos.find((x) => x.mes === mes && x.socio === s.id);
          const valor = Math.round((r.aRepartir * s.pct) / 100);
          return (
            <div key={s.id} className="socio">
              <span className="socio__av" aria-hidden="true">{s.nombre.slice(0, 1)}</span>
              <span className="socio__n"><b>{s.nombre}</b><span>{s.rol} · {s.pct} %</span></span>
              <span className="socio__v">{money(pago ? pago.valor : valor)}</span>
              {pago
                ? <span className="socio__acts"><span className="chip ok"><span className="ms" aria-hidden="true">check_circle</span>Pagado el {fechaTxt(iso(new Date(pago.pagado_en)))}</span>
                    <button type="button" className="link-add" onClick={() => intentar(() => deshacerPagoSocio(mes, s.id), 'Pago deshecho')}><span className="ms" aria-hidden="true">undo</span>Deshacer</button></span>
                : <span className="socio__acts"><button type="button" className="gbtn out sm" disabled={!valor} onClick={() => intentar(() => pagarSocio(mes, s.id, valor), `Pago a ${s.nombre.split(' ')[0]} registrado`)}><span className="ms" aria-hidden="true">payments</span>Marcar como pagado</button></span>}
            </div>
          );
        })}
      </div>
      <p className="hint">{actual ? 'El mes todavía no termina: el valor cambia con cada consulta, baño o gasto que se marque. ' : ''}Si un mes da pérdida, no se reparte y se descuenta del mes siguiente.</p>
    </section>
  );
}

/* ---------- movimientos ---------- */
function Movimientos({ lineas, mes, intentar }: { lineas: Linea[]; mes: string; intentar: (f: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [flt, setFlt] = useState<Filtro>(() => store.get<Filtro>(FILTRO_K) ?? 'todos');
  const [cat, setCat] = useState<'' | 'espera' | Cat>('');
  useEffect(() => { store.set(FILTRO_K, flt); }, [flt]);
  const cats: ['' | 'espera' | Cat, string, string][] = [
    ['', 'Todas', 'apps'],
    ...(flt !== 'gasto' ? [['espera', 'En espera', 'hourglass_top'] as ['espera', string, string]] : []),
    ...(flt !== 'gasto' ? (Object.keys(CATS_I) as CatI[]).map((k) => [k, CATS_I[k].txt, CATS_I[k].icon] as [Cat, string, string]) : []),
    ...(flt !== 'ingreso' ? (Object.keys(CATS_G) as CatG[]).map((k) => [k, CATS_G[k].txt, CATS_G[k].icon] as [Cat, string, string]) : [])
  ];
  const lista = lineas.filter((l) => (flt === 'todos' || l.tipo === flt) && (cat === '' || (cat === 'espera' ? l.espera : l.cat === cat && !l.espera)));
  const sI = lista.filter((l) => !l.espera && l.tipo === 'ingreso').reduce((n, l) => n + l.valor, 0);
  const sG = lista.filter((l) => !l.espera && l.tipo === 'gasto').reduce((n, l) => n + l.valor, 0);
  const sE = lista.filter((l) => l.espera).reduce((n, l) => n + l.valor, 0);
  const abrir = async (ruta: string) => { const u = await verFactura(ruta); if (u) window.open(u, '_blank', 'noopener'); };
  const donde: Record<string, [string, string, string]> = {
    agenda: ['/gestor/agenda', 'calendar_month', 'Se marca en la Agenda'],
    spa: ['/gestor/spa', 'shower', 'Se marca en Citas de spa'],
    pedido: ['/gestor/pedidos', 'receipt_long', 'Se confirma en Pedidos']
  };

  return (
    <section className="gcard cmov" aria-labelledby="c-mov">
      <div className="cmov__head">
        <h2 className="ch2" id="c-mov"><span className="ms" aria-hidden="true">receipt_long</span>Movimientos de {mesTxt(mes, false)}</h2>
        <div className="filts" role="group" aria-label="Entradas o gastos">
          {([['todos', 'Todos'], ['ingreso', 'Entradas'], ['gasto', 'Gastos']] as const).map(([k, t]) => (
            <button key={k} type="button" className="filt" aria-pressed={flt === k} onClick={() => { setFlt(k); setCat(''); }}>{t}</button>
          ))}
        </div>
      </div>
      <div className="catbar" role="group" aria-label="Filtrar por categoría">
        {cats.map(([k, t, icon]) => <button key={k || 'todas'} type="button" className="filt" aria-pressed={cat === k} onClick={() => setCat(k)}><span className="ms" aria-hidden="true">{icon}</span>{t}</button>)}
      </div>
      <p className="cmov__sum"><b>{lista.length} {lista.length === 1 ? 'movimiento' : 'movimientos'}</b>
        {(sI > 0 || (!sG && !sE)) && <span>Entradas <b className="cont__up">{money(sI)}</b></span>}
        {sG > 0 && <span>Gastos <b className="cont__down">{money(sG)}</b></span>}
        {sE > 0 && <span>En espera <b className="cont__esp">{money(sE)}</b></span>}</p>
      <div className="mtabla">
        <div className="mrow mrow--h" aria-hidden="true"><span>Fecha</span><span>Concepto</span><span>Categoría</span><span>Medio de pago</span><span>Valor</span><span /></div>
        {lista.map((l) => (
          <div key={l.id} className={'mrow' + (l.espera ? ' mrow--esp' : '')}>
            <span className="mrow__f">{fechaTxt(l.fecha)}</span>
            <span className="mrow__c"><b>{l.concepto}</b><span>{l.det}</span>
              {l.espera && donde[l.origen] && <span className="mrow__esp"><span className="chip esp"><span className="ms" aria-hidden="true">hourglass_top</span>{l.origen === 'pedido' ? 'Esperando el pago' : 'Falta marcar como hecho'}</span>
                <a className="chip lav" href={link(donde[l.origen][0])}><span className="ms" aria-hidden="true">{donde[l.origen][1]}</span>{donde[l.origen][2]}</a></span>}</span>
            <span><span className={'chip ' + (l.cat === 'meta' ? 'meta' : l.tipo === 'ingreso' ? 'ok' : 'gasto')}><span className="ms" aria-hidden="true">{catIcon(l.cat)}</span>{catTxt(l.cat)}</span></span>
            <span className="mrow__m">{l.medio}</span>
            <span className={'mrow__v ' + (l.espera ? 'cont__gris' : l.tipo === 'ingreso' ? 'cont__up' : 'cont__down')}>{l.espera ? '' : l.tipo === 'ingreso' ? '+ ' : '− '}{money(l.valor)}{l.espera && <small>no suma aún</small>}</span>
            <span className="mrow__a">
              {l.factura && <button type="button" className="vrow__x" aria-label="Ver la factura" title="Ver la factura" onClick={() => abrir(l.factura!)}><span className="ms">description</span></button>}
              {l.origen === 'manual' && l.mov && <button type="button" className="vrow__x" aria-label={`Borrar ${l.concepto}`} title="Borrar" onClick={() => { if (confirm(`¿Borrar «${l.concepto}» por ${money(l.valor)}?`)) intentar(() => borrarMov(l.mov!), 'Movimiento borrado'); }}><span className="ms">delete</span></button>}
            </span>
          </div>
        ))}
        {!lista.length && <p className="vacio">No hay movimientos con este filtro.</p>}
      </div>
      <p className="hint">Cada consulta, vacuna, baño y pedido aparece aquí solo, primero en espera. Las consultas y vacunas suman al marcarlas como hechas en la Agenda; los baños, al entregarlos en Citas de spa; los pedidos, al confirmar el pago en Pedidos.</p>
    </section>
  );
}

/* ---------- registrar un gasto o un ingreso suelto ---------- */
function Registrar({ yo, mes, intentar }: { yo: Miembro; mes: string; intentar: (f: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const hoy = iso(new Date());
  const enMes = (f: string) => (f.startsWith(mes) ? f : mes === mesActual() ? hoy : venceEn(mes, 28));
  const [tipo, setTipo] = useState<Tipo>('gasto');
  const [cat, setCat] = useState<Cat>('meta');
  const [concepto, setConcepto] = useState('');
  const [valor, setValor] = useState(0);
  const [medio, setMedio] = useState('Tarjeta');
  const [fecha, setFecha] = useState(() => enMes(hoy));
  const [foto, setFoto] = useState<File | null>(null);
  const [err, setErr] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { setFecha((f) => enMes(f)); }, [mes]); // eslint-disable-line react-hooks/exhaustive-deps
  const opts = tipo === 'gasto' ? (Object.keys(CATS_G) as CatG[]) : (['tienda', 'consulta', 'vacuna', 'spa', 'otro_ingreso'] as CatI[]);
  const elegirTipo = (t: Tipo) => { setTipo(t); setCat(t === 'gasto' ? 'meta' : 'tienda'); setErr(false); };

  const guardar = async () => {
    if (!concepto.trim() || !valor) { setErr(true); return; }
    setOcupado(true);
    await intentar(async () => {
      const factura = foto ? await subirFactura(foto) : null;
      await guardarMov({ fecha, tipo, categoria: cat, concepto: concepto.trim(), valor, medio, factura, pagado: true, fijo_id: null, mes: null, por_nombre: yo.nombre });
      setConcepto(''); setValor(0); setFoto(null); setErr(false);
    }, 'Guardado. Ya se ve en los totales y en el reparto.');
    setOcupado(false);
  };

  return (
    <section className="gcard" aria-labelledby="c-reg">
      <h2 className="ch2" id="c-reg"><span className="ms" aria-hidden="true">add_card</span>Registrar un movimiento</h2>
      <div className="seg cont__seg" role="radiogroup" aria-label="Tipo de movimiento">
        <button type="button" role="radio" aria-checked={tipo === 'gasto'} onClick={() => elegirTipo('gasto')}><span className="ms" aria-hidden="true">trending_down</span>Gasto</button>
        <button type="button" role="radio" aria-checked={tipo === 'ingreso'} onClick={() => elegirTipo('ingreso')}><span className="ms" aria-hidden="true">trending_up</span>Ingreso</button>
      </div>
      <div className="fld"><label htmlFor="r-cat">Categoría</label>
        <select id="r-cat" value={cat} onChange={(e) => setCat(e.target.value as Cat)}>{opts.map((k) => <option key={k} value={k}>{k === 'tienda' ? 'Tienda (venta en mostrador)' : catTxt(k)}</option>)}</select>
        {tipo === 'ingreso' && <span className="hint">Las consultas, baños y pedidos de la web entran solos. Aquí registra solo lo que se cobró por fuera: ventas en el mostrador u otros ingresos.</span>}
      </div>
      <div className="fld"><label htmlFor="r-con">Concepto</label>
        <input id="r-con" value={concepto} maxLength={120} aria-invalid={err && !concepto.trim() ? 'true' : undefined} onChange={(e) => setConcepto(e.target.value)}
          placeholder={tipo === 'gasto' ? (cat === 'meta' ? 'Ej: Campaña de vacunas' : 'Ej: Compra a la distribuidora') : 'Ej: Venta en mostrador · collar'} /></div>
      <div className="grid2g">
        <div className="fld"><label htmlFor="r-val">Valor</label>
          <input id="r-val" inputMode="numeric" value={valor ? money(valor) : ''} placeholder="$0" aria-invalid={err && !valor ? 'true' : undefined} onChange={(e) => setValor(num(e.target.value))} /></div>
        <div className="fld"><label htmlFor="r-med">Medio de pago</label>
          <select id="r-med" value={medio} onChange={(e) => setMedio(e.target.value)}>{MEDIOS.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div className="fld"><label htmlFor="r-fec">Fecha</label><input id="r-fec" type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value || hoy)} /></div>
        <div className="fld"><span className="fld__lb">Factura <small>(opcional)</small></span>
          <label className="gbtn out sm cont__foto"><span className="ms" aria-hidden="true">photo_camera</span>{foto ? 'Cambiar foto' : 'Adjuntar foto'}
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFoto(e.target.files?.[0] ?? null)} /></label>
          {foto && <span className="hint">{foto.name}</span>}</div>
      </div>
      {err && <p className="gerr" role="alert">Escribe el concepto y el valor.</p>}
      <button type="button" className="gbtn" disabled={ocupado} onClick={guardar}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : 'Guardar movimiento'}</button>
    </section>
  );
}

/* ---------- gastos fijos del mes (editables) ---------- */
function Fijos({ libro, mes, intentar }: { libro: Libro; mes: string; intentar: (f: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [edita, setEdita] = useState<string | null>(null);
  const [borrador, setBorrador] = useState<Record<string, number>>({});
  useEffect(() => { setBorrador({}); }, [mes, libro]);
  const ant = sumarMeses(mes, -1);
  const filas = useMemo(() => libro.fijos.map((f) => {
    const inst = libro.movs.find((m) => m.fijo_id === f.id && m.mes === mes);
    const prev = libro.movs.find((m) => m.fijo_id === f.id && m.mes === ant);
    const valor = borrador[f.id] ?? inst?.valor ?? (f.varia ? 0 : f.valor);
    return { f, inst, prev, valor, pagado: !!inst?.pagado };
  }), [libro, mes, ant, borrador]);

  const instancia = (f: GastoFijo, inst: Movimiento | undefined, valor: number, pagado: boolean) => guardarMov({
    id: inst?.id, fecha: inst?.fecha ?? venceEn(mes, f.dia), tipo: 'gasto', categoria: f.categoria, concepto: f.nombre, valor,
    medio: inst?.medio ?? 'Transferencia', factura: inst?.factura ?? null, pagado, fijo_id: f.id, mes, por_nombre: inst?.por_nombre ?? null
  });
  const guardarValor = (x: typeof filas[number]) => {
    if (borrador[x.f.id] == null || borrador[x.f.id] === (x.inst?.valor ?? -1)) return;
    intentar(() => instancia(x.f, x.inst, x.valor, x.pagado), 'Valor guardado');
  };
  let pend = 0; const faltan: string[] = [];
  for (const x of filas) if (!x.pagado) { if (x.valor) pend += x.valor; else { pend += x.prev?.valor ?? x.f.valor; faltan.push(x.f.nombre.toLowerCase()); } }
  const nuevo = () => intentar(async () => {
    const n = await guardarFijo({ nombre: 'Nuevo gasto fijo', categoria: 'otro', icono: 'receipt_long', dia: 1, varia: true, valor: 0, activo: true, orden: Math.max(0, ...libro.fijos.map((f) => f.orden)) + 1 });
    setEdita(n.id);
  }, 'Gasto fijo agregado: ponle el nombre');

  return (
    <section className="gcard" aria-labelledby="c-fij">
      <h2 className="ch2" id="c-fij"><span className="ms" aria-hidden="true">event_repeat</span>Gastos fijos de {mesTxt(mes, false)}</h2>
      <p className="hint">Se crean solos cada mes. Los que cambian según el consumo (luz, agua) esperan el valor del recibo: escríbelo cuando llegue y márcalo como pagado. Al pagarlo pasa a Movimientos.</p>
      <div className="fijos">
        {filas.map((x) => (
          <div key={x.f.id} className="frow">
            <span className={'frow__ic' + (x.f.categoria === 'meta' ? ' frow__ic--meta' : '')}><span className="ms" aria-hidden="true">{x.f.icono}</span></span>
            <span className="frow__n"><b>{x.f.nombre}</b><span>Vence el {x.f.dia} de {mesTxt(mes, false)}</span>
              {x.f.varia && <span>Cambia cada mes · {x.prev ? `en ${mesTxt(ant, false)} fue ${money(x.prev.valor)}` : 'primer mes'}</span>}</span>
            <span className="frow__acts">
              <input className="cell frow__val" inputMode="numeric" aria-label={`Valor de ${x.f.nombre}`} placeholder="Valor del recibo" data-falta={!x.valor || undefined}
                value={x.valor ? money(x.valor) : ''} onChange={(e) => setBorrador((b) => ({ ...b, [x.f.id]: num(e.target.value) }))} onBlur={() => guardarValor(x)} />
              <button type="button" className={'paybtn ' + (x.pagado ? 'paybtn--ok' : x.valor ? 'paybtn--pend' : '')} aria-pressed={x.pagado} disabled={!x.valor}
                onClick={() => intentar(() => instancia(x.f, x.inst, x.valor, !x.pagado), x.pagado ? 'Vuelve a quedar pendiente' : `${x.f.nombre}: pagado`)}>
                <span className="ms" aria-hidden="true">{x.pagado ? 'check_circle' : x.valor ? 'schedule' : 'edit'}</span>{x.pagado ? 'Pagado' : x.valor ? 'Pendiente' : 'Falta el valor'}</button>
              <button type="button" className="vrow__x" aria-label={`Editar ${x.f.nombre}`} aria-expanded={edita === x.f.id} onClick={() => setEdita(edita === x.f.id ? null : x.f.id)}><span className="ms">{edita === x.f.id ? 'expand_less' : 'edit'}</span></button>
            </span>
            {edita === x.f.id && <EditarFijo f={x.f} listo={() => setEdita(null)} intentar={intentar} />}
          </div>
        ))}
        {!filas.length && <p className="vacio">Todavía no hay gastos fijos.</p>}
      </div>
      <div className="cuenta">
        <div className="cuenta__t"><dt>Pendiente por pagar</dt><dd className="cont__down">{money(pend)}</dd></div>
      </div>
      {faltan.length > 0 && <p className="hint">Aproximado: falta el recibo de {faltan.join(' y ')}; se usa el valor del mes anterior.</p>}
      <button type="button" className="link-add" onClick={nuevo}><span className="ms" aria-hidden="true">add</span>Agregar gasto fijo</button>
    </section>
  );
}

function EditarFijo({ f, listo, intentar }: { f: GastoFijo; listo: () => void; intentar: (fn: () => Promise<unknown>, ok: string) => Promise<void> }) {
  const [x, setX] = useState(f);
  const ICONOS: Record<CatG, string> = { arriendo: 'home', servicios: 'bolt', meta: 'campaign', medic: 'medication', insumos: 'soap', merc: 'inventory_2', otro: 'receipt_long' };
  const guardar = () => intentar(async () => { await guardarFijo({ ...x, nombre: x.nombre.trim() || f.nombre }); listo(); }, 'Gasto fijo guardado');
  return (
    <div className="fedit">
      <div className="fld"><label htmlFor={'fn' + f.id}>Nombre</label><input id={'fn' + f.id} value={x.nombre} maxLength={60} onChange={(e) => setX({ ...x, nombre: e.target.value })} /></div>
      <div className="fld"><label htmlFor={'fd' + f.id}>Día de pago</label><input id={'fd' + f.id} inputMode="numeric" value={x.dia} onChange={(e) => setX({ ...x, dia: Math.min(31, Math.max(1, num(e.target.value) || 1)) })} /></div>
      <div className="fld"><label htmlFor={'fc' + f.id}>Categoría</label>
        <select id={'fc' + f.id} value={x.categoria} onChange={(e) => { const c = e.target.value as CatG; setX({ ...x, categoria: c, icono: ['water_drop', 'wifi', 'bolt'].includes(x.icono) && c === 'servicios' ? x.icono : ICONOS[c] }); }}>
          {(Object.keys(CATS_G) as CatG[]).map((k) => <option key={k} value={k}>{CATS_G[k].txt}</option>)}</select></div>
      <div className="fld"><label htmlFor={'fv' + f.id}>El valor</label>
        <select id={'fv' + f.id} value={x.varia ? 'si' : 'no'} onChange={(e) => setX({ ...x, varia: e.target.value === 'si' })}><option value="no">Es igual cada mes</option><option value="si">Cambia cada mes</option></select></div>
      {!x.varia && <div className="fld"><label htmlFor={'fr' + f.id}>Valor de cada mes</label><input id={'fr' + f.id} inputMode="numeric" value={x.valor ? money(x.valor) : ''} placeholder="$0" onChange={(e) => setX({ ...x, valor: num(e.target.value) })} /></div>}
      <div className="fedit__acts">
        <button type="button" className="gbtn sm" onClick={guardar}><span className="ms" aria-hidden="true">check</span>Listo</button>
        <button type="button" className="gbtn ghost sm" onClick={() => { if (confirm(`¿Quitar «${f.nombre}» de los gastos fijos? Lo que ya se pagó queda en los meses anteriores.`)) intentar(async () => { await guardarFijo({ ...f, activo: false }); listo(); }, 'Gasto fijo quitado'); }}>
          <span className="ms" aria-hidden="true">delete</span>Quitar este gasto fijo</button>
      </div>
    </div>
  );
}
