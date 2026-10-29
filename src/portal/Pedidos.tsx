// Mis pedidos: lo comprado en el Petshop con el celular de la ficha, y en qué va cada pedido.
import { useEffect, useState } from 'react';
import Marco from './Marco';
import { money, prettyCel } from '../gestor/lib';
import { misPedidos, type Ficha, type MiPedido } from './datos';
import { fechaCorta, ESTADO_PEDIDO, PASOS_PEDIDO } from './comun';
import { whatsapp, GIFT_TXT } from './tienda';

export default function Pedidos() {
  return <Marco activo="pedidos">{(yo) => <Contenido yo={yo} />}</Marco>;
}

function Contenido({ yo }: { yo: Ficha }) {
  const [lista, setLista] = useState<MiPedido[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => { misPedidos(yo).then((l) => { setLista(l); setSel(l[0]?.id ?? null); }).catch(() => setLista([])); }, [yo]);
  const p = lista?.find((x) => x.id === sel) ?? null;
  return (
    <div className="pped">
      <section className="phead phead--s">
        <h1>Mis <b className="gt">pedidos</b></h1>
        <p>Lo que has comprado en el Petshop y en qué va cada pedido. Aparecen los que hiciste con el celular {prettyCel(yo.celular)}.</p>
        <div className="dacts"><a className="gbtn out" href="/petshop"><span className="ms" aria-hidden="true">storefront</span>Ir al Petshop</a></div>
      </section>
      <div className="pped__grid">
        <section className="gcard pped__l" aria-label="Pedidos">
          {lista === null && <p className="vacio">Cargando…</p>}
          {lista?.length === 0 && <p className="vacio">Todavía no tienes pedidos con este celular. Si compraste con otro número, escríbenos y lo unimos.</p>}
          {lista?.map((o) => {
            const [st, cls] = ESTADO_PEDIDO[o.estado] ?? [o.estado, 'st-old'];
            return (
              <button key={o.id} type="button" className="row" aria-pressed={sel === o.id} onClick={() => setSel(o.id)}>
                <span className="pped__ic"><span className="ms" aria-hidden="true">receipt_long</span></span>
                <span className="row__txt"><b>Pedido #{o.numero}</b><span>{fechaCorta(o.creado)} · {o.items.reduce((n, i) => n + i.cantidad, 0)} productos</span></span>
                <span className="row__end"><b>{money(o.total)}</b><span className={`chip ${cls}`}>{st}</span></span>
              </button>
            );
          })}
        </section>
        {p && (
          <section className="gcard pped__d" aria-labelledby="pdn">
            <div className="pped__h"><h2 id="pdn">Pedido #{p.numero}</h2><span className={`chip ${(ESTADO_PEDIDO[p.estado] ?? ['', 'st-old'])[1]}`}>{(ESTADO_PEDIDO[p.estado] ?? [p.estado])[0]}</span></div>
            {p.estado !== 'cancelado' && (
              <ol className="ptrack">
                {PASOS_PEDIDO.map((s, i) => {
                  const actual = PASOS_PEDIDO.indexOf(p.estado === 'pagado' ? 'confirmado' : p.estado);
                  return <li key={s} data-st={i < actual ? 'hecho' : i === actual ? 'ahora' : undefined}><b>{ESTADO_PEDIDO[s][0]}</b>{i === 0 && <span>{fechaCorta(p.creado)}</span>}</li>;
                })}
              </ol>
            )}
            <ul className="pped__items">
              {p.items.map((i, n) => <li key={n}><span><b>{i.nombre}</b>{i.variante && <small>{i.variante}</small>}<small>{i.cantidad} × {money(i.precio)}</small></span><b>{money(i.precio * i.cantidad)}</b></li>)}
            </ul>
            {p.obsequio && <p className="sim__m sim__m--g"><span className="ms" aria-hidden="true">redeem</span><span>Obsequio incluido{GIFT_TXT ? `: ${GIFT_TXT}` : ''}</span></p>}
            <dl className="tot">
              <div><dt>Subtotal</dt><dd>{money(p.subtotal)}</dd></div>
              <div><dt>Envío · {p.ciudad}</dt><dd>{p.envio ? money(p.envio) : 'Gratis'}</dd></div>
              {p.prioritario && <div><dt>Envío prioritario</dt><dd>Incluido</dd></div>}
              <div className="tot__t"><dt>Total</dt><dd>{money(p.total)}</dd></div>
            </dl>
            <div className="dacts">
              {p.estado === 'nuevo' && <a className="gbtn wa" href={whatsapp(`Hola, Alma Animal. Quiero confirmar mi pedido ${p.codigo}.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Coordinar por WhatsApp</a>}
              <a className="gbtn out" href={whatsapp(`Hola, Alma Animal. Tengo un problema con mi pedido ${p.codigo}.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">help</span>Tengo un problema con este pedido</a>
            </div>
            <p className="hint">Muy pronto podrás pagar en línea con tarjeta, PSE o Nequi.</p>
          </section>
        )}
      </div>
    </div>
  );
}
