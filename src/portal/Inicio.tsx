// Inicio del portal: saludo, mascotas, lo que les toca pronto, la próxima cita y el último pedido.
import { useEffect, useState } from 'react';
import Marco from './Marco';
import { link, money } from '../gestor/lib';
import { misMascotas, historia, misCitas, misPedidos, cancelarCita, type MiPedido } from './datos';
import { pendientes, estadoDosis, fechaHora, fechaCorta, fechaLarga, especieTxt, peso, servicioTxt, calendario, ESTADO_CITA, ESTADO_PEDIDO, PASOS_PEDIDO } from './comun';
import { edad, type Paciente, type Registro } from '../gestor/clinica-datos';
import type { Cita } from '../gestor/agenda-datos';
import { whatsapp } from '../data/site';

export default function Inicio() {
  return <Marco activo="inicio">{(yo) => <Contenido yo={yo} />}</Marco>;
}

function Contenido({ yo }: { yo: Parameters<typeof misMascotas>[0] }) {
  const [pacs, setPacs] = useState<Paciente[] | null>(null);
  const [regs, setRegs] = useState<Registro[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [pedidos, setPedidos] = useState<MiPedido[]>([]);
  const [aviso, setAviso] = useState('');
  useEffect(() => {
    misMascotas(yo).then(async (p) => {
      setPacs(p);
      const ids = p.map((x) => x.id);
      const [r, c, o] = await Promise.all([historia(ids), misCitas(yo, ids), misPedidos(yo)]);
      setRegs(r); setCitas(c); setPedidos(o);
    }).catch(() => setPacs([]));
  }, [yo]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 4000); return () => window.clearTimeout(t); }, [aviso]);

  const nombre = (id: string | null) => pacs?.find((p) => p.id === id)?.nombre ?? 'tu mascota';
  const toca = pendientes(regs, pacs ?? []);
  const proxima = citas.filter((c) => (c.estado === 'confirmada' || c.estado === 'solicitada') && new Date(c.fin) > new Date()).sort((a, b) => a.inicio.localeCompare(b.inicio))[0];
  const pedido = pedidos.find((p) => p.estado !== 'entregado' && p.estado !== 'cancelado') ?? null;
  const ultimo = (m: Paciente, tipos: string[]) => regs.filter((r) => r.paciente_id === m.id && tipos.includes(r.tipo)).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  const resumen = [
    proxima && `${nombre(proxima.paciente_id)} tiene ${servicioTxt(proxima).toLowerCase()} el ${fechaLarga(new Date(proxima.inicio))}.`,
    toca[0] && `A ${toca[0].m.nombre} le toca ${toca[0].r.titulo.toLowerCase()}: agéndala cuando quieras.`
  ].filter(Boolean).join(' ') || 'Todo al día. Aquí ves el carnet, las citas y los pedidos de tus mascotas.';

  return (
    <div className="pin">
      <section className="phead">
        <span className="phead__f">{fechaLarga(new Date()).replace(/^./, (x) => x.toUpperCase())}</span>
        <h1>Hola, <b className="gt">{yo.nombre}</b></h1>
        <p>{resumen}</p>
        <div className="dacts">
          <a className="gbtn" href={link('/portal/agendar')}><span className="ms" aria-hidden="true">calendar_add_on</span>Agendar cita</a>
          <a className="gbtn out" href="/petshop"><span className="ms" aria-hidden="true">storefront</span>Petshop</a>
        </div>
      </section>

      <div className="pin__grid">
        <div className="pin__col">
          <section aria-labelledby="tm">
            <h2 className="ph2" id="tm">Tus mascotas</h2>
            {pacs === null && <p className="vacio">Cargando…</p>}
            {pacs?.length === 0 && <div className="gcard"><p className="vacio">Todavía no hay mascotas en tu ficha. Escríbenos y la agregamos.</p></div>}
            <div className="pets-p">
              {pacs?.map((m) => {
                const v = toca.filter((x) => x.m.id === m.id), venc = v.filter((x) => x.d < 0).length;
                const uc = ultimo(m, ['consulta', 'cirugia', 'procedimiento']), us = ultimo(m, ['spa']);
                return (
                  <a key={m.id} className="petc" href={link('/portal/mascota') + `?id=${m.id}`}>
                    <span className="petc__img">{m.foto ? <img src={m.foto} alt="" /> : <span className="ms" aria-hidden="true">pets</span>}</span>
                    <span className="petc__t"><b>{m.nombre}</b><span>{[especieTxt(m), m.raza, edad(m)].filter(Boolean).join(' · ')}</span></span>
                    <span className="ms petc__go" aria-hidden="true">chevron_right</span>
                    <dl className="petc__f">
                      <div><dt>Peso</dt><dd>{peso(m.peso)}</dd></div>
                      <div><dt>Última consulta</dt><dd>{uc ? fechaCorta(uc.fecha) : '—'}</dd></div>
                      <div><dt>Último spa</dt><dd>{us ? fechaCorta(us.fecha) : '—'}</dd></div>
                    </dl>
                    {v.length > 0 && <span className={`chip ${venc ? 'st-mal' : 'st-warn'}`}><span className="ms" aria-hidden="true">vaccines</span>{venc ? `${venc} ${venc === 1 ? 'vacuna vencida' : 'vacunas vencidas'}` : `${v.length} por vencer`}</span>}
                  </a>
                );
              })}
            </div>
          </section>

          <section className="gcard" aria-labelledby="tp">
            <h2 className="ch2" id="tp"><span className="ms" aria-hidden="true">notifications_active</span>Le toca pronto</h2>
            {!toca.length && <p className="hint">Nada pendiente en las próximas semanas.</p>}
            {toca.map(({ r, m, d }) => {
              const [st, cls] = estadoDosis(d);
              return (
                <div key={r.id} className="ptoca">
                  <span className={`ptoca__ic ${cls}`}><span className="ms" aria-hidden="true">{r.tipo === 'vacuna' ? 'vaccines' : 'medication'}</span></span>
                  <span className="ptoca__t"><b>{r.titulo} de {m.nombre}</b><span>{d < 0 ? `Venció el ${fechaLarga(new Date(r.datos.proxima + 'T12:00:00'))}. Mejor ponerla pronto.` : `Le toca el ${fechaLarga(new Date(r.datos.proxima + 'T12:00:00'))}.`}</span></span>
                  <span className={`chip ${cls}`}>{st}</span>
                  <a className="gbtn out sm" href={link('/portal/agendar') + `?mascota=${m.id}&servicio=vacuna`}>Agendar</a>
                </div>
              );
            })}
          </section>
        </div>

        <div className="pin__col">
          <section className="gcard pcita" aria-labelledby="pc">
            <h2 className="ch2" id="pc"><span className="ms" aria-hidden="true">event</span>Tu próxima cita</h2>
            {!proxima ? <><p className="hint">No tienes citas agendadas.</p><a className="gbtn sm" href={link('/portal/agendar')}>Agendar una cita</a></> : (() => {
              const d = new Date(proxima.inicio), [st, cls] = ESTADO_CITA[proxima.estado];
              return (
                <>
                  <div className="pcita__b">
                    <span className="pcita__d"><small>{['DOM', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB'][d.getDay()]}</small><b>{d.getDate()}</b><small>{['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'][d.getMonth()]}</small></span>
                    <span className="pcita__t"><b>{servicioTxt(proxima)} de {nombre(proxima.paciente_id)}</b><span>{fechaHora(proxima.inicio)}</span>
                      <span className={`chip ${cls}`}>{proxima.estado === 'confirmada' ? <><span className="ms" aria-hidden="true">check_circle</span>{st}</> : 'Por confirmar: te escribimos por WhatsApp'}</span></span>
                  </div>
                  <div className="dacts">
                    <button type="button" className="gbtn out sm" onClick={() => calendario(proxima, nombre(proxima.paciente_id))}><span className="ms" aria-hidden="true">calendar_month</span>Agregar a mi calendario</button>
                    <button type="button" className="gbtn ghost sm" onClick={async () => {
                      if (!confirm('¿Cancelar esta cita?')) return;
                      const r = await cancelarCita(proxima.id);
                      if (r === 'ok') { setCitas((cs) => cs.map((c) => (c.id === proxima.id ? { ...c, estado: 'cancelada' } : c))); setAviso('Cita cancelada'); }
                      else setAviso(r === 'tarde' ? 'Faltan menos de 24 horas: escríbenos por WhatsApp para cambiarla.' : 'No se pudo cancelar. Escríbenos por WhatsApp.');
                    }}>Cancelar</button>
                  </div>
                  <p className="hint">{proxima.direccion ? `Visita en ${proxima.direccion}.` : 'Calle 1 # 9-02, Alfonso López.'} Puedes cancelarla hasta 24 horas antes.</p>
                </>
              );
            })()}
          </section>

          {pedido && (
            <section className="gcard" aria-labelledby="pp">
              <h2 className="ch2" id="pp"><span className="ms" aria-hidden="true">local_shipping</span>Tu pedido #{pedido.numero}</h2>
              <ol className="ptrack">
                {PASOS_PEDIDO.map((p, i) => {
                  const actual = PASOS_PEDIDO.indexOf(pedido.estado === 'pagado' ? 'confirmado' : pedido.estado);
                  return <li key={p} data-st={i < actual ? 'hecho' : i === actual ? 'ahora' : undefined}><b>{ESTADO_PEDIDO[p][0]}</b>{i === 0 && <span>{fechaCorta(pedido.creado)}</span>}</li>;
                })}
              </ol>
              <p className="hint">{pedido.items.length} {pedido.items.length === 1 ? 'producto' : 'productos'} · {money(pedido.total)}</p>
              <a className="link-add" href={link('/portal/pedidos')}>Ver mis pedidos<span className="ms" aria-hidden="true">arrow_forward</span></a>
            </section>
          )}

          <a className="gcard pduda" href={whatsapp.vet(`Hola, doctora. Soy ${yo.nombre}. Tengo una pregunta sobre mi mascota.`)} target="_blank" rel="noopener">
            <span className="ms" aria-hidden="true">chat</span><span><b>¿Una duda?</b> Escríbele a la doctora por WhatsApp</span>
          </a>
        </div>
      </div>
      <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
    </div>
  );
}
