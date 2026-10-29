// Módulo Pedidos: lista con filtros por estado y detalle de cada pedido.
// Confirmar por WhatsApp → definir cómo paga → avanzar hasta entregado. También imprime el rótulo de envío.
import { useCallback, useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, money, when, waLink, prettyCel } from './lib';
import { listar, cambiar, ESTADOS, PAGOS, pasos, siguiente, mensaje, pagoTxt, type Pedido, type Estado, type Cambio } from './pedidos-datos';

const FILTROS: { id: 'todos' | Estado; txt: string }[] = [
  { id: 'todos', txt: 'Todos' }, { id: 'nuevo', txt: 'Nuevos' }, { id: 'confirmado', txt: 'Cliente confirmó' },
  { id: 'pagado', txt: 'Pago recibido' }, { id: 'enviado', txt: 'Enviados' }, { id: 'entregado', txt: 'Entregados' }, { id: 'cancelado', txt: 'Cancelados' }
];
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function Chip({ e }: { e: Estado }) {
  const st = ESTADOS[e];
  return <span className="chip" style={{ background: st.bg, color: st.fg }}>{st.txt}</span>;
}

export default function Pedidos() {
  const [lista, setLista] = useState<Pedido[] | null>(null);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState<'todos' | Estado>('todos');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [verDetalle, setVerDetalle] = useState(false); // celular: lista o detalle
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try { setLista(await listar()); setError(''); } catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => {
    cargar();
    // los pedidos nuevos aparecen solos: al volver a la pestaña y cada minuto
    const alVolver = () => document.visibilityState === 'visible' && cargar();
    document.addEventListener('visibilitychange', alVolver);
    const t = window.setInterval(alVolver, 60000);
    return () => { document.removeEventListener('visibilitychange', alVolver); window.clearInterval(t); };
  }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3000); return () => window.clearTimeout(t); }, [aviso]);

  const cuentas = useMemo(() => {
    const c: Record<string, number> = { todos: lista?.length ?? 0 };
    lista?.forEach((p) => { c[p.estado] = (c[p.estado] ?? 0) + 1; });
    return c;
  }, [lista]);

  const visibles = useMemo(() => {
    const t = norm(q.trim().replace(/^#/, ''));
    return (lista ?? []).filter((p) => (filtro === 'todos' || p.estado === filtro)
      && (!t || norm(`${p.numero} ${p.codigo} ${p.nombre} ${p.apellido} ${p.celular} ${p.ciudad}`).includes(t)
        || p.celular.replace(/\D/g, '').includes(t.replace(/\D/g, '') || '¬')));
  }, [lista, filtro, q]);

  const actual = lista?.find((p) => p.id === sel) ?? visibles[0] ?? null;

  // cambio con respuesta inmediata; si falla, se devuelve
  const aplicar = async (p: Pedido, c: Cambio, ok?: string) => {
    const antes = lista;
    setLista((l) => l!.map((x) => (x.id === p.id ? { ...x, ...c } : x)));
    try { await cambiar(p.id, c); if (ok) setAviso(ok); } catch (e) { setLista(antes); setAviso((e as Error).message); }
  };

  return (
    <Shell activo="pedidos" insignias={{ pedidos: cuentas.nuevo ?? 0 }}>
      {() => (
        <div className="ped" data-vista={verDetalle ? 'detalle' : 'lista'}>
          <div className="mhead">
            <div className="mhead__txt">
              <h1>Pedidos</h1>
              <p>Confirma cada pedido por WhatsApp, define cómo paga el cliente y avánzalo hasta entregarlo.</p>
            </div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <button className="gbtn out" type="button" onClick={() => { cargar(); setAviso('Lista actualizada'); }}><span className="ms" aria-hidden="true">refresh</span>Actualizar</button>
          </div>

          <div className="ped__tools">
            <label className="gsearch">
              <span className="ms" aria-hidden="true">search</span>
              <span className="sr-only">Buscar pedido</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca por nombre, celular o número. Ej: Laura, 300 123, #1043" />
            </label>
            <div className="filts" role="group" aria-label="Filtrar por estado">
              {FILTROS.filter((f) => f.id === 'todos' || cuentas[f.id] || f.id !== 'cancelado').map((f) => (
                <button key={f.id} type="button" className="filt" aria-pressed={filtro === f.id} onClick={() => setFiltro(f.id)}>
                  {f.txt}<span>{cuentas[f.id] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="gerr" role="alert">{error}</p>}

          <div className="ped__grid">
            {/* ---------- LISTA ---------- */}
            <section className="gcard ped__list" aria-label="Lista de pedidos">
              {lista === null && <p className="vacio">Cargando pedidos…</p>}
              {lista && visibles.length === 0 && (
                <p className="vacio">{lista.length === 0 ? 'Todavía no han llegado pedidos de la tienda.' : 'No hay pedidos con ese filtro o búsqueda.'}</p>
              )}
              {visibles.map((p) => (
                <button key={p.id} type="button" className="row" aria-pressed={actual?.id === p.id}
                  onClick={() => { setSel(p.id); setVerDetalle(true); window.scrollTo({ top: 0 }); }}>
                  <span className="row__n">#{p.numero}</span>
                  <span className="row__txt">
                    <b>{p.nombre} {p.apellido}</b>
                    <span>{p.ciudad} · {when(p.creado)}</span>
                    <span>{pagoTxt(p.pago)}{p.prioritario ? ' · ⚡ prioritario' : ''}</span>
                  </span>
                  <span className="row__end"><b>{money(p.total)}</b><Chip e={p.estado} /></span>
                </button>
              ))}
            </section>

            {/* ---------- DETALLE ---------- */}
            {actual && <Detalle key={actual.id} p={actual} aplicar={aplicar} volver={() => setVerDetalle(false)} />}
          </div>

          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

function Detalle({ p, aplicar, volver }: { p: Pedido; aplicar: (p: Pedido, c: Cambio, ok?: string) => void; volver: () => void }) {
  const [msgAbierto, setMsgAbierto] = useState(false);
  const [msg, setMsg] = useState(() => mensaje(p));
  const [nota, setNota] = useState(p.nota_interna ?? '');
  const sig = siguiente(p);
  const bloqueado = p.estado === 'confirmado' && p.pago === 'pendiente';
  const cancelado = p.estado === 'cancelado';
  useEffect(() => { setMsg(mensaje(p)); }, [p.pago]); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarNota = () => { if ((p.nota_interna ?? '') !== nota.trim()) aplicar(p, { nota_interna: nota.trim() || null }, 'Nota guardada'); };

  return (
    <section className="gcard ped__det" aria-labelledby="det">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Pedidos</button>

      <div className="det__head">
        <h2 id="det">Pedido #{p.numero}</h2>
        <Chip e={p.estado} />
        <span className="det__when">{when(p.creado)} · {p.codigo}</span>
        {p.prioritario && <span className="chip dark"><span className="ms" aria-hidden="true">bolt</span>Envío prioritario</span>}
        {p.obsequio && <span className="chip peach"><span className="ms" aria-hidden="true">redeem</span>Lleva obsequio</span>}
      </div>

      {!cancelado && (
        <ol className="pasos" aria-label="Avance del pedido">
          {pasos(p).map((s) => (
            <li key={s.id} className={(s.hecho ? 'hecho' : '') + (s.ahora ? ' ahora' : '')}>
              <span className="pasos__dot" aria-hidden="true"><span className="ms">{s.hecho ? 'check' : s.icon}</span></span>
              <span>{s.txt}</span>
            </li>
          ))}
        </ol>
      )}

      <div className="det__acts">
        {!cancelado && <button className="gbtn wa" type="button" aria-expanded={msgAbierto} onClick={() => setMsgAbierto((v) => !v)}><span className="ms" aria-hidden="true">chat</span>Escribir por WhatsApp</button>}
        {sig && <button className="gbtn" type="button" disabled={bloqueado} onClick={() => aplicar(p, { estado: sig.a }, ESTADOS[sig.a].txt)}><span className="ms" aria-hidden="true">arrow_forward</span>{sig.txt}</button>}
        {!cancelado && <button className="gbtn out" type="button" onClick={() => window.print()}><span className="ms" aria-hidden="true">print</span>Imprimir rótulo</button>}
        {!cancelado && p.estado !== 'entregado' && (
          <button className="gbtn ghost" type="button" onClick={() => { if (confirm(`¿Cancelar el pedido #${p.numero}? Puedes reabrirlo después.`)) aplicar(p, { estado: 'cancelado' }, 'Pedido cancelado'); }}>
            <span className="ms" aria-hidden="true">cancel</span>Cancelar pedido
          </button>
        )}
        {cancelado && <button className="gbtn out" type="button" onClick={() => aplicar(p, { estado: 'nuevo' }, 'Pedido reabierto')}><span className="ms" aria-hidden="true">undo</span>Reabrir pedido</button>}
      </div>
      {bloqueado && <p className="hint-g">Para avanzar, elige abajo cómo va a pagar el cliente.</p>}

      {msgAbierto && (
        <div className="wamsg">
          <div className="wamsg__head">
            <span className="wamsg__ic" aria-hidden="true"><span className="ms">chat</span></span>
            <span><b>Mensaje para {p.nombre} · {prettyCel(p.celular)}</b><span>Se arma solo con los datos del pedido. Puedes editarlo antes de enviar.</span></span>
          </div>
          <label className="sr-only" htmlFor="wamsg">Mensaje</label>
          <textarea id="wamsg" value={msg} onChange={(e) => setMsg(e.target.value)} rows={Math.min(14, msg.split('\n').length + 1)} />
          <div className="wamsg__acts">
            <a className="gbtn wa" href={waLink(p.celular, msg)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">send</span>Abrir en WhatsApp</a>
            <button className="gbtn out" type="button" onClick={() => setMsg(mensaje(p))}>Restaurar mensaje</button>
          </div>
        </div>
      )}

      <div className="pay">
        <b id="pay-l">Cómo paga</b>
        <div className="seg" role="radiogroup" aria-labelledby="pay-l">
          {PAGOS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={p.pago === x.id} disabled={cancelado}
              onClick={() => p.pago !== x.id && aplicar(p, { pago: x.id }, `Pago: ${x.txt}`)}>
              <span className="ms" aria-hidden="true">{x.icon}</span>{x.txt}
            </button>
          ))}
        </div>
      </div>

      <div className="det__cols">
        <div className="det__col">
          <h3>Cliente y envío</h3>
          <dl className="kv">
            <div><dt>Nombre</dt><dd>{p.nombre} {p.apellido}</dd></div>
            <div><dt>Celular</dt><dd><a href={`tel:+${p.celular.replace(/\D/g, '').replace(/^(?=\d{10}$)/, '57')}`}>{prettyCel(p.celular)}</a></dd></div>
            <div className="full"><dt>Correo</dt><dd>{p.correo || '—'}</dd></div>
            <div className="full"><dt>Dirección</dt><dd>{p.direccion}</dd></div>
            <div><dt>Barrio</dt><dd>{p.barrio}</dd></div>
            <div><dt>Ciudad</dt><dd>{p.ciudad}, {p.departamento}</dd></div>
            <div className="full"><dt>Indicaciones</dt><dd className="normal">{p.indicaciones || '—'}</dd></div>
          </dl>
        </div>
        <div className="det__col">
          <h3>Productos</h3>
          <div className="items">
            {p.items.map((it, i) => (
              <div className="item" key={i}>
                <span className="item__txt"><b>{it.nombre}</b><span>{it.variante && !/^(único|única)$/i.test(it.variante) ? it.variante + ' · ' : ''}{it.cantidad} × {money(it.precio)}</span></span>
                <b>{money(it.precio * it.cantidad)}</b>
              </div>
            ))}
            <dl className="tot">
              <div><dt>Subtotal</dt><dd>{money(p.subtotal)}</dd></div>
              <div><dt>Envío</dt><dd>{p.envio === 0 ? 'Gratis' : money(p.envio)}</dd></div>
              {p.prioritario && <div><dt>Prioritario</dt><dd>{money(5000)}</dd></div>}
              {p.obsequio && <div><dt>Obsequio</dt><dd>Snack dental</dd></div>}
              <div className="tot__t"><dt>Total</dt><dd>{money(p.total)}</dd></div>
            </dl>
          </div>
          <div className="nota">
            <label htmlFor={`nota-${p.id}`}>Nota interna <small>(solo la ve el equipo)</small></label>
            <textarea id={`nota-${p.id}`} value={nota} onChange={(e) => setNota(e.target.value)} onBlur={guardarNota} maxLength={1000}
              placeholder="Ej: Confirmó por WhatsApp, paga contraentrega. Sale mañana con Interrapidísimo." />
          </div>
        </div>
      </div>

      {/* rótulo de envío: solo aparece al imprimir */}
      <div className="rotulo" aria-hidden="true">
        <div className="rotulo__top"><b>Alma Animal</b><span>Pedido #{p.numero} · {p.codigo}</span>{p.prioritario && <strong>PRIORITARIO</strong>}</div>
        <p className="rotulo__lbl">Para</p>
        <p className="rotulo__name">{p.nombre} {p.apellido}</p>
        <p>{p.direccion}</p>
        <p>Barrio {p.barrio} · {p.ciudad}, {p.departamento}</p>
        <p>Cel. {prettyCel(p.celular)}</p>
        {p.indicaciones && <p className="rotulo__note">{p.indicaciones}</p>}
        <p className="rotulo__lbl">Envía</p>
        <p>Alma Animal · Calle 1 # 9-02, Alfonso López, Pereira · 301 792 5910</p>
        {pagoTxt(p.pago) === 'Contraentrega' && <p className="rotulo__cod">Cobrar al entregar: {money(p.total)}</p>}
      </div>
    </section>
  );
}
