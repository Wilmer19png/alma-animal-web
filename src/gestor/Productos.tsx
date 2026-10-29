// Módulo Productos e inventario: catálogo con resumen del mes, editor de cada producto (fotos, datos,
// etiquetas, variantes, costos y ganancia, características), inventario con movimientos y ventas del
// consultorio, y el interruptor de los avisos de compra de la página.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Shell from './Shell';
import { DEMO, money } from './lib';
import { TONOS } from '../scripts/catalogo';
import {
  listar, ventasMes, guardar, borrar, mover, subirFoto, borrarFoto, leerAvisos, guardarAvisos, nuevoProducto, slugify,
  stockTotal, pocoStock, CATEGORIAS, TIPOS_VARIANTE, ICONOS, ETIQUETAS_MANUALES,
  type Prod, type Var, type Venta, type Avisos
} from './productos-datos';

const catTxt = (id: string) => CATEGORIAS.find((c) => c[0] === id)?.[1] ?? id;
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const num = (s: string) => Number(s.replace(/\D/g, '')) || 0;
const pesos = (n: number) => (n ? money(n) : '');
const PLURAL: Record<string, string> = { 'Presentación': 'presentaciones', Talla: 'tallas', Sabor: 'sabores', Color: 'colores', Peso: 'pesos' };
const plural = (tipo: string | null) => PLURAL[tipo ?? ''] ?? 'opciones';
const vendidas = (vs: Venta[], ids: string[], motivo?: string) =>
  -vs.filter((m) => ids.includes(m.variante_id) && (!motivo || (motivo === 'web' ? m.motivo !== 'venta_consultorio' : m.motivo === motivo))).reduce((s, m) => s + m.cantidad, 0);

function Interruptor({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button type="button" className="sw" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}><i /></button>;
}
function Pesos({ id, value, onChange, placeholder }: { id: string; value: number | null; onChange: (n: number) => void; placeholder?: string }) {
  return <input id={id} inputMode="numeric" value={value ? money(value) : ''} placeholder={placeholder} onChange={(e) => onChange(num(e.target.value))} />;
}

export default function Productos() {
  const [lista, setLista] = useState<Prod[] | null>(null);
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [avisos, setAvisos] = useState<Avisos | null>(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null); // id del producto abierto, o 'nuevo'
  const [verEditor, setVerEditor] = useState(false);
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try {
      const [l, v, a] = await Promise.all([listar(), ventasMes(), leerAvisos()]);
      setLista(l); setVentas(v); setAvisos(a); setError('');
    } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3000); return () => window.clearTimeout(t); }, [aviso]);

  const activos = (p: Prod) => p.variantes.filter((v) => v.activo);
  const kpis = useMemo(() => {
    const todos = lista ?? [];
    const plata = -ventas.reduce((s, m) => s + m.cantidad * (m.precio ?? 0), 0);
    const unidades = -ventas.reduce((s, m) => s + m.cantidad, 0);
    const valor = todos.reduce((s, p) => s + activos(p).reduce((t, v) => t + Math.max(0, v.stock) * v.costo, 0), 0);
    return [
      { icon: 'payments', txt: 'Ventas del mes', val: money(plata), sub: 'Web y consultorio' },
      { icon: 'shopping_bag', txt: 'Unidades vendidas', val: String(unidades), sub: 'Este mes' },
      { icon: 'inventory_2', txt: 'Con poco stock', val: String(todos.filter(pocoStock).length), sub: 'Para pedir pronto' },
      { icon: 'account_balance', txt: 'Valor del inventario', val: money(valor), sub: 'A precio de costo' }
    ];
  }, [lista, ventas]);

  const FILTROS = useMemo(() => {
    const todos = lista ?? [];
    return [
      { id: 'todos', txt: 'Todos', n: todos.length },
      ...CATEGORIAS.map(([id, txt]) => ({ id, txt, n: todos.filter((p) => p.categoria === id).length })),
      { id: 'poco', txt: 'Poco stock', n: todos.filter(pocoStock).length },
      { id: 'ocultos', txt: 'Ocultos', n: todos.filter((p) => !p.visible).length }
    ];
  }, [lista]);

  const visibles = useMemo(() => {
    const t = norm(q.trim());
    return (lista ?? []).filter((p) => (filtro === 'todos' || (filtro === 'poco' ? pocoStock(p) : filtro === 'ocultos' ? !p.visible : p.categoria === filtro))
      && (!t || norm(`${p.nombre} ${p.codigo ?? ''} ${p.marca ?? ''} ${p.variantes.map((v) => `${v.nombre} ${v.codigo ?? ''}`).join(' ')}`).includes(t)));
  }, [lista, filtro, q]);

  const actual = sel === 'nuevo' ? null : (lista?.find((p) => p.id === sel) ?? visibles[0] ?? null);
  const abrir = (id: string) => { setSel(id); setVerEditor(true); window.scrollTo({ top: 0 }); };

  const reemplazar = (p: Prod) => setLista((l) => (l!.some((x) => x.id === p.id) ? l!.map((x) => (x.id === p.id ? p : x)) : [p, ...l!]));

  return (
    <Shell activo="productos" insignias={{ productos: (lista ?? []).filter(pocoStock).length }}>
      {(yo) => (
        <div className="prods" data-vista={verEditor ? 'detalle' : 'lista'}>
          <div className="mhead">
            <div className="mhead__txt">
              <h1>Productos e inventario</h1>
              <p>Lo que se vende en la tienda web y en el consultorio. Cada cambio se ve de inmediato en la página.</p>
            </div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <button className="gbtn" type="button" onClick={() => abrir('nuevo')}><span className="ms" aria-hidden="true">add</span>Nuevo producto</button>
          </div>

          <div className="kpis">
            {kpis.map((k) => (
              <div className="kpi" key={k.txt}><span><span className="ms" aria-hidden="true">{k.icon}</span>{k.txt}</span><b>{k.val}</b><small>{k.sub}</small></div>
            ))}
          </div>

          <div className="ped__tools">
            <label className="gsearch">
              <span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar producto</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, marca o código. Ej: shampoo, SH-250" />
            </label>
            <div className="filts" role="group" aria-label="Filtrar productos">
              {FILTROS.filter((f) => f.n || f.id === 'todos').map((f) => (
                <button key={f.id} type="button" className="filt" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>{f.txt}<span>{f.n}</span></button>
              ))}
            </div>
          </div>

          {error && <p className="gerr" role="alert">{error}</p>}

          <div className="prods__grid">
            <div className="prods__side">
              <section className="gcard ped__list" aria-label="Catálogo">
                {lista === null && <p className="vacio">Cargando productos…</p>}
                {lista && visibles.length === 0 && <p className="vacio">{lista.length ? 'No hay productos con ese filtro.' : 'Todavía no hay productos. Crea el primero con «Nuevo producto».'}</p>}
                {visibles.map((p) => {
                  const st = stockTotal(p);
                  const bajo = pocoStock(p);
                  return (
                    <button key={p.id} type="button" className="row prow" aria-pressed={actual?.id === p.id && sel !== 'nuevo'} onClick={() => abrir(p.id!)}>
                      <span className="prow__img" style={{ background: TONOS[p.tono] ?? TONOS.lav }}>
                        {p.fotos[0] ? <img src={p.fotos[0]} alt="" /> : <span className="ms" aria-hidden="true">{p.icono}</span>}
                      </span>
                      <span className="row__txt">
                        <b>{p.nombre}</b>
                        <span>{catTxt(p.categoria)} · {activos(p).length > 1 ? `${activos(p).length} ${plural(p.tipo_variante)}` : money(activos(p)[0]?.precio ?? 0)}{!p.visible ? ' · oculto' : ''}</span>
                        <span className="prow__tags">{p.etiquetas.map((t) => { const e = ETIQUETAS_MANUALES.find((x) => x[0] === t); return e ? <i key={t}>{e[1]} {e[2]}</i> : null; })}{p.precio_antes ? <i>🏷️ Oferta</i> : null}</span>
                      </span>
                      <span className="chip" style={st === 0 ? { background: '#FFDAD5', color: '#910809' } : bajo ? { background: '#FFDDB2', color: '#624000' } : { background: '#B8F1B9', color: '#1D5128' }}>
                        {st === 0 ? 'Agotado' : `${st} und.`}
                      </span>
                    </button>
                  );
                })}
              </section>
              {avisos && <AvisosCard a={avisos} puede={yo.rol === 'admin'} onChange={async (a) => {
                const antes = avisos; setAvisos(a);
                try { await guardarAvisos(a); setAviso(a.activo ? 'Avisos de compra encendidos' : 'Avisos de compra apagados'); } catch (e) { setAvisos(antes); setAviso((e as Error).message); }
              }} />}
            </div>

            {(sel === 'nuevo' || actual) && (
              <Editor key={sel === 'nuevo' ? 'nuevo' : actual!.id} base={sel === 'nuevo' ? nuevoProducto() : actual!} ventas={ventas}
                volver={() => setVerEditor(false)}
                guardado={(p, msg) => { reemplazar(p); setSel(p.id!); setAviso(msg); }}
                borrado={(p) => { setLista((l) => l!.filter((x) => x.id !== p.id)); setSel(null); setVerEditor(false); setAviso('Producto eliminado'); }}
                movido={(p, venta) => { reemplazar(p); if (venta) setVentas((v) => [...v, venta]); }}
                avisar={setAviso} />
            )}
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

function AvisosCard({ a, puede, onChange }: { a: Avisos; puede: boolean; onChange: (a: Avisos) => void }) {
  return (
    <section className="gcard avisos" aria-labelledby="av">
      <div className="avisos__head">
        <h2 id="av"><span className="ms" aria-hidden="true">campaign</span>Avisos de compra en la web</h2>
        {puede && <Interruptor on={a.activo} label="Mostrar avisos de compra" onChange={(v) => onChange({ ...a, activo: v })} />}
      </div>
      <p>Aparecen abajo a la izquierda en la tienda: «🔥 Laura, de Pereira, compró…», uno a la vez.</p>
      <ul>
        <li><span className="ms" aria-hidden="true">check</span>Solo compras reales: pedidos confirmados en Pedidos.</li>
        <li><span className="ms" aria-hidden="true">check</span>Solo de clientes que dieron permiso al comprar. Nombre sin apellido y ciudad.</li>
        <li><span className="ms" aria-hidden="true">check</span>Compras de los últimos 7 días. Si no hay ninguna, no aparece nada.</li>
      </ul>
      {puede ? (
        <div className="fld"><label htmlFor="bz">Mostrar un aviso cada</label>
          <select id="bz" value={a.cada} onChange={(e) => onChange({ ...a, cada: Number(e.target.value) })}>
            <option value={20}>20 segundos</option><option value={40}>40 segundos</option><option value={60}>1 minuto</option>
          </select>
        </div>
      ) : <p className="hint">Solo la administradora puede encenderlos o apagarlos.</p>}
    </section>
  );
}

/* =================== EDITOR =================== */
function Editor({ base, ventas, volver, guardado, borrado, movido, avisar }: {
  base: Prod; ventas: Venta[]; volver: () => void; guardado: (p: Prod, msg: string) => void; borrado: (p: Prod) => void;
  movido: (p: Prod, venta?: Venta) => void; avisar: (m: string) => void;
}) {
  const [d, setD] = useState<Prod>(base);
  const [quitadas, setQuitadas] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [subiendo, setSubiendo] = useState(false);
  const [cv, setCv] = useState(0); // variante para calcular la ganancia y vender en consultorio
  const [errores, setErrores] = useState<string[]>([]);
  const nuevo = !d.id;
  const cambios = JSON.stringify(d) !== JSON.stringify(base) || quitadas.length > 0;
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Prod>(k: K, v: Prod[K]) => setD((x) => ({ ...x, [k]: v }));
  const setVar = (i: number, cambio: Partial<Var>) => setD((x) => ({ ...x, variantes: x.variantes.map((v, k) => (k === i ? { ...v, ...cambio } : v)) }));
  const variantes = d.variantes;
  const conVariantes = d.tipo_variante !== null;
  const ids = variantes.map((v) => v.id).filter(Boolean) as string[];

  // avisa si se va a salir sin guardar
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (cambios) e.preventDefault(); };
    window.addEventListener('beforeunload', f);
    return () => window.removeEventListener('beforeunload', f);
  }, [cambios]);

  const validar = () => {
    const e: string[] = [];
    if (d.nombre.trim().length < 2) e.push('Escribe el nombre del producto.');
    if (!d.para.length) e.push('Elige si es para perros, gatos o ambos.');
    if (!variantes.length) e.push('Agrega al menos una variante con su precio.');
    variantes.forEach((v, i) => { if (!v.precio) e.push(conVariantes ? `Falta el precio de «${v.nombre || 'variante ' + (i + 1)}».` : 'Escribe el precio.'); });
    if (conVariantes && variantes.some((v) => !v.nombre.trim())) e.push('Cada variante necesita un nombre. Ej: 250 ml, Talla M.');
    setErrores(e);
    return !e.length;
  };

  const onGuardar = async () => {
    if (!validar()) return;
    setOcupado(true);
    try {
      const p = await guardar({ ...d, variantes: conVariantes ? variantes : variantes.slice(0, 1).map((v) => ({ ...v, nombre: 'Único' })) }, quitadas);
      setD(p); setQuitadas([]);
      guardado(p, nuevo ? 'Producto creado. Ya se ve en la tienda.' : 'Guardado. Ya se ve en la tienda.');
    } catch (e) { avisar((e as Error).message); }
    setOcupado(false);
  };

  const onFotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setSubiendo(true);
    try {
      const urls: string[] = [];
      for (const f of [...files].slice(0, 8)) urls.push(await subirFoto(f, d.slug || slugify(d.nombre)));
      set('fotos', [...d.fotos, ...urls]);
      avisar('Foto agregada. Recuerda guardar los cambios.');
    } catch (e) { avisar((e as Error).message); }
    setSubiendo(false);
    if (fileRef.current) fileRef.current.value = '';
  };
  const moverFoto = (i: number, k: number) => { const f = [...d.fotos]; [f[i], f[i + k]] = [f[i + k], f[i]]; set('fotos', f); };
  const quitarFoto = (i: number) => { borrarFoto(d.fotos[i]); set('fotos', d.fotos.filter((_, k) => k !== i)); };

  // movimiento inmediato de inventario (no espera a "Guardar")
  const inventario = async (i: number, cantidad: number, motivo: 'ingreso' | 'ajuste' | 'venta_consultorio') => {
    const v = variantes[i];
    if (!v.id) { setVar(i, { stock: Math.max(0, v.stock + cantidad) }); return; } // variante nueva: stock inicial
    if (v.stock + cantidad < 0) return;
    try {
      await mover(v, cantidad, motivo);
      const nuevaV = { ...v, stock: v.stock + cantidad };
      setD((x) => ({ ...x, variantes: x.variantes.map((y, k) => (k === i ? nuevaV : y)) }));
      movido({ ...base, variantes: base.variantes.map((y) => (y.id === v.id ? nuevaV : y)) },
        motivo === 'venta_consultorio' ? { variante_id: v.id, cantidad, precio: v.precio, motivo, creado: new Date().toISOString() } : undefined);
      avisar(motivo === 'venta_consultorio' ? `Venta en consultorio: ${d.nombre}${conVariantes ? ' · ' + v.nombre : ''}` : `Stock de ${v.nombre}: ${v.stock + cantidad}`);
    } catch (e) { avisar((e as Error).message); }
  };

  // ganancia de la variante elegida
  const vc = variantes[Math.min(cv, variantes.length - 1)];
  const unidadesMes = Math.max(1, vendidas(ventas, ids));
  const pautaU = d.pauta_mes ? Math.round(d.pauta_mes / unidadesMes) : 0;
  const ganancia = vc ? vc.precio - vc.costo - pautaU - d.envio_unidad : 0;
  const margen = vc?.precio ? Math.round((ganancia / vc.precio) * 100) : 0;
  const reparto = vc?.precio ? [
    { txt: 'Costo', v: vc.costo, c: '#B4A3D6' }, { txt: 'Pauta', v: pautaU, c: '#E8A6B4' },
    { txt: 'Envío', v: d.envio_unidad, c: '#F0BC95' }, { txt: 'Ganancia', v: Math.max(0, ganancia), c: '#655785' }
  ] : [];

  return (
    <section className="gcard editor" aria-labelledby="ed">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Productos</button>
      <div className="editor__head">
        <h2 id="ed">{nuevo ? 'Nuevo producto' : d.nombre || 'Sin nombre'}</h2>
        {!nuevo && <a className="gbtn out sm" href={`${location.protocol === 'file:' ? '../producto.html' : '/producto'}?p=${encodeURIComponent(base.slug)}`} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">visibility</span>Ver en la tienda</a>}
      </div>

      {/* ---------- FOTOS ---------- */}
      <div className="sec">
        <h3><span className="ms" aria-hidden="true">add_photo_alternate</span>Fotos <small>· la primera es la portada</small></h3>
        <div className="fotos">
          {d.fotos.map((f, i) => (
            <figure key={f} className="foto">
              <img src={f} alt={`Foto ${i + 1}`} />
              {i === 0 && <figcaption>Portada</figcaption>}
              <span className="foto__acts">
                {i > 0 && <button type="button" onClick={() => moverFoto(i, -1)} aria-label="Mover a la izquierda"><span className="ms">arrow_back</span></button>}
                {i < d.fotos.length - 1 && <button type="button" onClick={() => moverFoto(i, 1)} aria-label="Mover a la derecha"><span className="ms">arrow_forward</span></button>}
                <button type="button" onClick={() => quitarFoto(i)} aria-label="Quitar foto"><span className="ms">delete</span></button>
              </span>
            </figure>
          ))}
          <label className="foto foto--add">
            <span className="ms" aria-hidden="true">{subiendo ? 'hourglass_top' : 'add_photo_alternate'}</span>{subiendo ? 'Subiendo…' : 'Agregar'}
            <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => onFotos(e.target.files)} disabled={subiendo} />
          </label>
        </div>
        {!d.fotos.length && (
          <div className="sinfoto">
            <span>Mientras no haya foto, la tienda muestra este ícono:</span>
            <div className="iconos" role="radiogroup" aria-label="Ícono del producto">
              {ICONOS.map((ic) => <button key={ic} type="button" role="radio" aria-checked={d.icono === ic} aria-label={ic} onClick={() => set('icono', ic)} style={{ background: TONOS[d.tono] }}><span className="ms">{ic}</span></button>)}
            </div>
            <div className="tonos" role="radiogroup" aria-label="Color de fondo">
              {Object.entries(TONOS).map(([k, g]) => <button key={k} type="button" role="radio" aria-checked={d.tono === k} aria-label={`Color ${k}`} onClick={() => set('tono', k)} style={{ background: g }} />)}
            </div>
          </div>
        )}
      </div>

      {/* ---------- DATOS ---------- */}
      <div className="grid2g">
        <div className="fld full"><label htmlFor="pn">Nombre</label><input id="pn" value={d.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Ej: Shampoo hipoalergénico" /></div>
        <div className="fld"><label htmlFor="pc">Categoría</label>
          <select id="pc" value={d.categoria} onChange={(e) => set('categoria', e.target.value)}>{CATEGORIAS.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select>
        </div>
        <div className="fld"><label htmlFor="psp">Para</label>
          <select id="psp" value={d.para.join(',')} onChange={(e) => set('para', e.target.value.split(','))}>
            <option value="perro">Perros</option><option value="gato">Gatos</option><option value="perro,gato">Perros y gatos</option>
          </select>
        </div>
        <div className="fld"><label htmlFor="pb">Marca <small>(opcional)</small></label><input id="pb" value={d.marca ?? ''} onChange={(e) => set('marca', e.target.value)} placeholder="Ej: Hipoalergénica Pet" /></div>
        <fieldset className="fld chk"><legend>Tamaño de mascota <small>(filtro de la tienda)</small></legend>
          {[['pequeno', 'Pequeño'], ['mediano', 'Mediano'], ['grande', 'Grande']].map(([id, t]) => (
            <label key={id}><input type="checkbox" checked={d.tamanos.includes(id)} onChange={(e) => set('tamanos', e.target.checked ? [...d.tamanos, id] : d.tamanos.filter((x) => x !== id))} />{t}</label>
          ))}
        </fieldset>
        <div className="fld full"><label htmlFor="pd">Descripción</label><textarea id="pd" value={d.descripcion} maxLength={600} onChange={(e) => set('descripcion', e.target.value)} placeholder="Ej: El mismo que usamos en el spa. Libre de parabenos, para pieles sensibles." /></div>
      </div>

      {/* ---------- ETIQUETAS ---------- */}
      <div className="sec">
        <h3><span className="ms" aria-hidden="true">sell</span>Etiquetas <small>· se ven sobre la foto en la tienda</small></h3>
        <div className="tagpicks">
          {ETIQUETAS_MANUALES.map(([id, emo, txt]) => (
            <button key={id} type="button" className="tagpick" aria-pressed={d.etiquetas.includes(id)} onClick={() => set('etiquetas', d.etiquetas.includes(id) ? d.etiquetas.filter((x) => x !== id) : [...d.etiquetas, id])}>
              <span aria-hidden="true">{emo}</span>{txt}{d.etiquetas.includes(id) && <span className="ms" aria-hidden="true">check</span>}
            </button>
          ))}
        </div>
        <p className="hint">La etiqueta <b>Oferta</b> aparece sola cuando el producto tiene precio anterior.</p>
      </div>

      {/* ---------- VARIANTES ---------- */}
      <div className="sec">
        <div className="sec__row">
          <h3><span className="ms" aria-hidden="true">tune</span>Variantes <small>· talla, presentación, sabor o color, cada una con su precio y su stock</small></h3>
          <Interruptor on={conVariantes} label="Este producto tiene variantes" onChange={(v) => set('tipo_variante', v ? 'Presentación' : null)} />
        </div>
        {conVariantes && (
          <div className="vtipos" role="radiogroup" aria-label="Tipo de variante">
            <span>Tipo:</span>
            {TIPOS_VARIANTE.map((t) => <button key={t} type="button" role="radio" aria-checked={d.tipo_variante === t} onClick={() => set('tipo_variante', t)}>{t}</button>)}
          </div>
        )}
        <div className="vtabla" role="table" aria-label="Variantes">
          <div className="vrow vrow--h" role="row">
            {conVariantes && <span role="columnheader">{d.tipo_variante}</span>}
            <span role="columnheader">Precio</span><span role="columnheader">Costo</span><span role="columnheader">Ganancia</span><span role="columnheader">Stock</span>{conVariantes && <span />}
          </div>
          {(conVariantes ? variantes : variantes.slice(0, 1)).map((v, i) => (
            <div className="vrow" role="row" key={v.id ?? 'n' + i} data-sinvar={!conVariantes || undefined}>
              {conVariantes && <input className="cell" aria-label="Nombre de la variante" value={v.nombre} placeholder="Ej: 250 ml" onChange={(e) => setVar(i, { nombre: e.target.value })} />}
              <input className="cell" aria-label="Precio" inputMode="numeric" value={pesos(v.precio)} placeholder="$0" onChange={(e) => setVar(i, { precio: num(e.target.value) })} />
              <input className="cell" aria-label="Costo de compra" inputMode="numeric" value={pesos(v.costo)} placeholder="$0" onChange={(e) => setVar(i, { costo: num(e.target.value) })} />
              <b className="vrow__gain" data-neg={v.precio - v.costo < 0 || undefined}>{v.precio ? money(v.precio - v.costo) : '—'}</b>
              <span className="step" data-bajo={v.id && v.stock <= d.aviso_stock ? true : undefined}>
                <button type="button" aria-label={`Restar una unidad de ${v.nombre}`} onClick={() => inventario(i, -1, 'ajuste')} disabled={v.stock <= 0}>−</button>
                <b>{v.stock}</b>
                <button type="button" aria-label={`Sumar una unidad de ${v.nombre}`} onClick={() => inventario(i, 1, 'ingreso')}>+</button>
              </span>
              {conVariantes && (
                <button type="button" className="vrow__x" aria-label={`Quitar ${v.nombre || 'variante'}`} disabled={variantes.length < 2}
                  onClick={() => { if (v.id) setQuitadas((q) => [...q, v.id!]); setD((x) => ({ ...x, variantes: x.variantes.filter((_, k) => k !== i) })); }}>
                  <span className="ms">close</span>
                </button>
              )}
            </div>
          ))}
        </div>
        {conVariantes && <button className="link-add" type="button" onClick={() => set('variantes', [...variantes, { nombre: '', codigo: null, precio: variantes[variantes.length - 1]?.precio ?? 0, costo: 0, stock: 0, orden: variantes.length, activo: true }])}><span className="ms" aria-hidden="true">add</span>Agregar variante</button>}
        <p className="hint">Los botones + y − del stock se guardan al instante (entrada de mercancía o ajuste por conteo).</p>
        <div className="grid3g">
          <div className="fld"><label htmlFor="po">Precio anterior <small>(si está en oferta)</small></label><Pesos id="po" value={d.precio_antes} onChange={(n) => set('precio_antes', n || null)} placeholder="Ej: $32.000" /></div>
          <div className="fld"><label htmlFor="ps">Código <small>(opcional)</small></label><input id="ps" value={d.codigo ?? ''} onChange={(e) => set('codigo', e.target.value)} placeholder="Ej: SH" /></div>
          <div className="fld"><label htmlFor="pm">Avisarme cuando queden</label><input id="pm" inputMode="numeric" value={d.aviso_stock} onChange={(e) => set('aviso_stock', num(e.target.value))} /></div>
        </div>
      </div>

      {/* ---------- COSTOS Y GANANCIA ---------- */}
      <div className="sec">
        <h3><span className="ms" aria-hidden="true">payments</span>Costos y ganancia <small>· solo los ve el equipo, no salen en la tienda</small></h3>
        <div className="grid3g">
          <div className="fld"><label htmlFor="ka">Pauta de este producto (mes)</label><Pesos id="ka" value={d.pauta_mes} onChange={(n) => set('pauta_mes', n)} placeholder="Ej: $60.000" />
            <span className="hint">Repartida entre las {unidadesMes} unidades vendidas este mes: {money(pautaU)} c/u.</span></div>
          <div className="fld"><label htmlFor="ke">Envío que asume la tienda, por unidad</label><Pesos id="ke" value={d.envio_unidad} onChange={(n) => set('envio_unidad', n)} placeholder="Ej: $3.000" />
            <span className="hint">Promedio del envío gratis que pagan ustedes.</span></div>
          {conVariantes && variantes.length > 1 && (
            <div className="fld"><label htmlFor="kv">Calcular para</label>
              <select id="kv" value={Math.min(cv, variantes.length - 1)} onChange={(e) => setCv(Number(e.target.value))}>{variantes.map((v, i) => <option key={i} value={i}>{v.nombre || `Variante ${i + 1}`}</option>)}</select>
            </div>
          )}
        </div>
        {vc?.precio ? (
          <div className="gan">
            <div className="gan__top">
              <span>De cada <b>{money(vc.precio)}</b>{conVariantes ? <> por <b>{vc.nombre}</b></> : null}, les quedan:</span>
              <b className="gan__val">{money(ganancia)}</b>
              <span className="chip" style={margen >= 30 ? { background: '#B8F1B9', color: '#1D5128' } : margen >= 15 ? { background: '#FFDDB2', color: '#624000' } : { background: '#FFDAD5', color: '#910809' }}>{margen}% de margen</span>
            </div>
            <div className="gan__bar" role="img" aria-label={reparto.map((r) => `${r.txt} ${money(r.v)}`).join(', ')}>
              {reparto.map((r) => <i key={r.txt} style={{ flexGrow: r.v, background: r.c }} />)}
            </div>
            <div className="gan__ley">{reparto.map((r) => <span key={r.txt}><i style={{ background: r.c }} />{r.txt} <b>{money(r.v)}</b></span>)}</div>
          </div>
        ) : <p className="hint">Escribe el precio y el costo para ver cuánto les queda.</p>}
      </div>

      {/* ---------- INVENTARIO ---------- */}
      {!nuevo && (
        <div className="sec">
          <div className="sec__row"><h3><span className="ms" aria-hidden="true">inventory_2</span>Inventario</h3>
            <span className="chip" style={stockTotal(d) === 0 ? { background: '#FFDAD5', color: '#910809' } : pocoStock(d) ? { background: '#FFDDB2', color: '#624000' } : { background: '#B8F1B9', color: '#1D5128' }}>{stockTotal(d) === 0 ? 'Agotado' : pocoStock(d) ? 'Poco stock' : 'Con stock'}</span>
          </div>
          <div className="minis">
            <div className="mini"><span>Unidades en total</span><b>{stockTotal(d)}</b></div>
            <div className="mini"><span>Vendidas en la web este mes</span><b>{vendidas(ventas, ids, 'web')}</b></div>
            <div className="mini"><span>Vendidas en el consultorio este mes</span><b>{vendidas(ventas, ids, 'venta_consultorio')}</b></div>
          </div>
          {vc?.id && (
            <div className="consul">
              <span className="ms" aria-hidden="true">storefront</span>
              <span>¿Lo vendiste en el consultorio? Descuéntalo aquí: <b>{conVariantes ? vc.nombre : d.nombre}</b>, 1 unidad.</span>
              <button className="gbtn sm" type="button" disabled={vc.stock <= 0} onClick={() => inventario(Math.min(cv, variantes.length - 1), -1, 'venta_consultorio')}>
                <span className="ms" aria-hidden="true">point_of_sale</span>Venta en consultorio
              </button>
            </div>
          )}
          <p className="hint">Las ventas de la tienda web se descuentan solas cuando confirmas el pedido en Pedidos (y vuelven si lo cancelas).</p>
        </div>
      )}

      {/* ---------- CARACTERÍSTICAS ---------- */}
      <div className="sec">
        <h3><span className="ms" aria-hidden="true">list_alt</span>Características <small>· la tabla de la ficha del producto</small></h3>
        {d.caracteristicas.map(([k, v], i) => (
          <div className="feat" key={i}>
            <input className="cell" aria-label="Característica" value={k} placeholder="Ej: Tipo de piel" onChange={(e) => set('caracteristicas', d.caracteristicas.map((x, j) => (j === i ? [e.target.value, x[1]] : x)))} />
            <input className="cell" aria-label="Valor" value={v} placeholder="Ej: Sensible" onChange={(e) => set('caracteristicas', d.caracteristicas.map((x, j) => (j === i ? [x[0], e.target.value] : x)))} />
            <button type="button" className="vrow__x" aria-label="Quitar característica" onClick={() => set('caracteristicas', d.caracteristicas.filter((_, j) => j !== i))}><span className="ms">close</span></button>
          </div>
        ))}
        <button className="link-add" type="button" onClick={() => set('caracteristicas', [...d.caracteristicas, ['', '']])}><span className="ms" aria-hidden="true">add</span>Agregar característica</button>
      </div>

      {/* ---------- VISIBILIDAD ---------- */}
      <div className="sec tg">
        <span className="ms" aria-hidden="true">{d.visible ? 'visibility' : 'visibility_off'}</span>
        <span className="tg__txt"><b>Visible en la tienda</b><span>{d.visible ? 'Los clientes lo ven y lo pueden comprar.' : 'Oculto: no sale en la tienda, pero no se borra.'}</span></span>
        <Interruptor on={d.visible} label="Visible en la tienda" onChange={(v) => set('visible', v)} />
      </div>

      {errores.length > 0 && <ul className="gerr" role="alert">{errores.map((e) => <li key={e}>{e}</li>)}</ul>}

      <div className="editor__acts">
        <button className="gbtn" type="button" onClick={onGuardar} disabled={ocupado || (!cambios && !nuevo)}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : nuevo ? 'Crear producto' : 'Guardar cambios'}</button>
        {cambios && !nuevo && <button className="gbtn out" type="button" onClick={() => { setD(base); setQuitadas([]); setErrores([]); }}>Descartar cambios</button>}
        {!nuevo && <button className="gbtn out" type="button" onClick={() => { setD({ ...base, id: undefined, slug: '', nombre: base.nombre + ' (copia)', fotos: [], variantes: base.variantes.filter((v) => v.activo).map((v) => ({ ...v, id: undefined, stock: 0 })) }); avisar('Copia lista: cámbiale lo necesario y créala.'); }}><span className="ms" aria-hidden="true">content_copy</span>Duplicar</button>}
        {!nuevo && <button className="gbtn ghost" type="button" onClick={async () => {
          if (!confirm(`¿Eliminar «${base.nombre}»? Se borra también su historial de inventario. Si solo quieres que no se vea, mejor ocúltalo.`)) return;
          try { await borrar(base); borrado(base); } catch (e) { avisar((e as Error).message); }
        }}><span className="ms" aria-hidden="true">delete</span>Eliminar</button>}
      </div>
    </section>
  );
}
