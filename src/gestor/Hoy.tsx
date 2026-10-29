// Hoy: el tablero del día. Resumen, agenda de hoy en carriles (Consulta, Spa, Domicilio), lo que llegó de la
// página por atender (solicitudes de spa y pedidos nuevos), vacunas por vencer y el estado de la tienda.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, money, when, waLink, prettyCel } from './lib';
import {
  leerHorario, listarCierres, listarCitas, solicitudes, cambiarCita, cerradoPor, hhmm, minutosDe, diaSemana, sumarDias, textoHorario,
  SERVICIOS, ESTADOS_CITA, MESES, type Cita, type Horario, type Cierre
} from './agenda-datos';
import { listarPacientes, listarPropietarios, proximasDosis, nombreCompleto, type Paciente, type Propietario, type Registro } from './clinica-datos';
import { listar as listarPedidos, mensaje, ESTADOS, type Pedido } from './pedidos-datos';
import { listar as listarProductos, pocoStock, type Prod } from './productos-datos';

const PX = 64 / 60;
const LANES = [['c', 'Consulta · Doctora', 'stethoscope'], ['s', 'Spa · Peluquería', 'shower'], ['d', 'Domicilio', 'home_health']] as const;
type Lane = (typeof LANES)[number][0];
const laneDe = (c: Cita): Lane => (c.carril === 'spa' ? 's' : c.servicio === 'domicilio' ? 'd' : 'c');
const DIAS_L = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export default function Hoy() {
  const [h, setH] = useState<Horario | null>(null);
  const [cierres, setCierres] = useState<Cierre[]>([]);
  const [citas, setCitas] = useState<Cita[]>([]);
  const [sols, setSols] = useState<Cita[]>([]);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [props, setProps] = useState<Propietario[]>([]);
  const [dosis, setDosis] = useState<Registro[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [lane, setLane] = useState<Lane>('c');
  const [aviso, setAviso] = useState('');
  const [listos, setListos] = useState<Record<string, string>>({});
  const [ahora, setAhora] = useState(new Date());

  useEffect(() => {
    const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0);
    const suave = <T,>(p: Promise<T>, vacio: T) => p.catch(() => vacio); // cada rol ve lo suyo: lo que no puede ver queda vacío
    Promise.all([suave(leerHorario(), null), suave(listarCierres(), []), suave(listarCitas(hoy0, sumarDias(hoy0, 1)), []), suave(solicitudes(), []),
      suave(listarPacientes(), []), suave(listarPropietarios(), []), suave(proximasDosis(15), []), suave(listarPedidos(), []), suave(listarProductos(), [])])
      .then(([a, b, c, d, e, f, g, i, j]) => { setH(a); setCierres(b); setCitas(c); setSols(d); setPacs(e); setProps(f); setDosis(g); setPedidos(i); setProds(j); });
    const t = window.setInterval(() => setAhora(new Date()), 60000);
    return () => window.clearInterval(t);
  }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const pac = (id: string | null) => pacs.find((p) => p.id === id);
  const dueño = (pid: string | null | undefined) => props.find((p) => p.id === pid);
  const hoyCitas = citas.filter((c) => c.estado !== 'cancelada');
  const nuevos = pedidos.filter((p) => p.estado === 'nuevo');
  const bajos = prods.filter((p) => p.visible && pocoStock(p));
  const hoyD = h?.dias[diaSemana(ahora)];
  const cerrado = h ? cerradoPor(ahora, h, cierres) : null;
  const desde = hoyD?.manana[0] ?? 480, hasta = (hoyD?.tarde ?? hoyD?.manana)?.[1] ?? 1020;
  const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
  const saludo = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches';

  const inbox = useMemo(() => [
    ...sols.map((c) => ({ id: 'c' + c.id, cita: c, creado: c.creado })),
    ...nuevos.map((p) => ({ id: 'p' + p.id, pedido: p, creado: p.creado }))
  ].sort((a, b) => b.creado.localeCompare(a.creado)), [sols, nuevos]);
  const pendientes = inbox.filter((x) => !listos[x.id]).length;

  const confirmarCita = async (c: Cita, id: string) => {
    try { await cambiarCita(c.id, { estado: 'confirmada' }); setListos((l) => ({ ...l, [id]: 'Cita confirmada' })); setAviso('Cita confirmada: ya está en la agenda'); }
    catch (e) { setAviso((e as Error).message); }
  };

  return (
    <Shell activo="hoy" insignias={{ pedidos: nuevos.length, productos: bajos.length }}>
      {(yo) => (
        <div className="hoy">
          <div className="mhead">
            <div className="mhead__txt">
              <h1>{saludo}, {yo.nombre.replace(/^Dra?\.\s*/, '').split(' ')[0]}</h1>
              <p>{DIAS_L[ahora.getDay()]} {ahora.getDate()} de {MESES[ahora.getMonth()]} · {cerrado ? cerrado : hoyD ? `Atención de ${hhmm(hoyD.manana[0])} a ${hhmm(hoyD.manana[1])}${hoyD.tarde ? ` y de ${hhmm(hoyD.tarde[0], true)} a ${hhmm(hoyD.tarde[1])}` : ''}` : ''}</p>
            </div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <a className="gbtn out" href={link('/gestor/registro')}><span className="ms" aria-hidden="true">person_add</span>Nuevo paciente</a>
            <a className="gbtn" href={link('/gestor/agenda')}><span className="ms" aria-hidden="true">add</span>Nueva cita</a>
          </div>

          <div className="sum">
            <a href="#agenda"><span className="i i--lav"><span className="ms" aria-hidden="true">event</span></span><b>{hoyCitas.length}</b> {hoyCitas.length === 1 ? 'cita' : 'citas'} hoy</a>
            <a href="#atender"><span className="i i--peach"><span className="ms" aria-hidden="true">inbox</span></span><b>{pendientes}</b> por atender</a>
            <a href={link('/gestor/pedidos')}><span className="i i--peach"><span className="ms" aria-hidden="true">receipt_long</span></span><b>{nuevos.length}</b> {nuevos.length === 1 ? 'pedido nuevo' : 'pedidos nuevos'}</a>
            <a href="#alertas"><span className="i i--red"><span className="ms" aria-hidden="true">vaccines</span></span><b>{dosis.length}</b> vacunas por vencer o vencidas</a>
            <a href="#stock"><span className="i i--amber"><span className="ms" aria-hidden="true">inventory_2</span></span><b>{bajos.length}</b> con poco stock</a>
          </div>

          <div className="hoy__grid">
            <div className="hoy__col">
              {/* ---------- AGENDA DE HOY ---------- */}
              <section id="agenda" className="gcard" aria-labelledby="ag">
                <div className="hoy__agh">
                  <h2 className="ch2" id="ag"><span className="ms" aria-hidden="true">calendar_month</span>Agenda de hoy</h2>
                  <div className="lanebtns" role="tablist" aria-label="Carril">
                    {LANES.map(([id, t, ic]) => <button key={id} type="button" role="tab" aria-selected={lane === id} onClick={() => setLane(id)} data-lane={id}><span className="ms" aria-hidden="true">{ic}</span>{t.split(' · ')[0]}</button>)}
                  </div>
                  <a className="link-add" href={link('/gestor/agenda')}>Ver semana</a>
                </div>
                {cerrado || !hoyD ? <p className="vacio">Hoy no se atiende{cerrado ? `: ${cerrado}` : ''}.</p> : (
                  <div className="dl" data-lane={lane}>
                    <div className="dl__head"><span />{LANES.map(([id, t]) => <b key={id} className={`dl__l dl__l--${id}`}>{t}</b>)}</div>
                    <div className="dl__body" style={{ height: (hasta - desde) * PX }}>
                      <div className="wk__horas">{Array.from({ length: Math.floor((hasta - desde) / 60) + 1 }, (_, k) => desde + k * 60).map((m) => <span key={m} style={{ top: (m - desde) * PX }}>{hhmm(m, true)}</span>)}</div>
                      {hoyD.tarde && <div className="dl__desc" style={{ top: (hoyD.manana[1] - desde) * PX, height: (hoyD.tarde[0] - hoyD.manana[1]) * PX }}>Descanso · {hhmm(hoyD.manana[1])} a {hhmm(hoyD.tarde[0])}</div>}
                      {minAhora > desde && minAhora < hasta && <span className="dl__now" style={{ top: (minAhora - desde) * PX }} aria-label={`Ahora: ${hhmm(minAhora)}`} />}
                      {LANES.map(([id]) => (
                        <div key={id} className={`dl__lane dl__l--${id}`}>
                          {hoyCitas.filter((c) => laneDe(c) === id).map((c) => {
                            const a = minutosDe(c.inicio), b = minutosDe(c.fin), sv = SERVICIOS[c.servicio], p = pac(c.paciente_id), d = dueño(c.propietario_id ?? p?.propietario_id);
                            return (
                              <a key={c.id} className={'appt appt--hoy' + (b - a < 45 ? ' appt--corta' : '')} data-estado={c.estado} href={p ? link('/gestor/paciente') + `?id=${p.id}` : link('/gestor/agenda')}
                                style={{ top: (a - desde) * PX, height: Math.max(26, (b - a) * PX - 3), background: sv.bg, color: sv.fg }}>
                                <b>{hhmm(a)} · {p?.nombre ?? c.datos.mascota ?? 'Sin paciente'} · {sv.txt}</b>
                                {(b - a) >= 45 && <span>{[p?.raza ?? c.datos.raza, d ? nombreCompleto(d) : c.datos.nombre, c.direccion].filter(Boolean).join(' · ')}</span>}
                                {c.estado !== 'confirmada' && (b - a) >= 60 && <span className="chip" style={{ background: ESTADOS_CITA[c.estado].bg, color: ESTADOS_CITA[c.estado].fg }}>{ESTADOS_CITA[c.estado].txt}</span>}
                              </a>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              {/* ---------- POR ATENDER ---------- */}
              <section id="atender" className="gcard" aria-labelledby="pa">
                <h2 className="ch2" id="pa"><span className="ms" aria-hidden="true">inbox</span>Por atender{pendientes > 0 && <span className="chip peach ch2__chip">{pendientes} {pendientes === 1 ? 'nueva' : 'nuevas'}</span>}</h2>
                <p className="hint">Lo que llegó desde la página web. Confírmalo por WhatsApp y queda en la agenda o en pedidos.</p>
                {!inbox.length && <p className="vacio">Todo al día: no hay solicitudes nuevas.</p>}
                {inbox.map((x) => {
                  const hecho = listos[x.id];
                  if ('cita' in x && x.cita) {
                    const c = x.cita, dt = new Date(c.inicio);
                    const pide = `${DIAS_L[dt.getDay()].toLowerCase()} ${dt.getDate()}, ${hhmm(minutosDe(c.inicio))}`;
                    return (
                      <article className="inb" key={x.id} data-hecho={!!hecho || undefined}>
                        <span className="inb__ic"><span className="ms" aria-hidden="true">shower</span></span>
                        <div className="inb__txt"><span>Cita de spa · {when(c.creado)}</span><b>{[c.datos.mascota, c.datos.raza, c.datos.servicio].filter(Boolean).join(' · ')}</b>
                          <span>Pide {pide} · {c.datos.nombre}{c.datos.celular ? ` · ${prettyCel(c.datos.celular)}` : ''}</span></div>
                        {hecho ? <span className="chip ok"><span className="ms" aria-hidden="true">check_circle</span>{hecho}</span> : (
                          <div className="dacts">
                            {c.datos.celular && <a className="gbtn wa sm" href={waLink(c.datos.celular, `Hola, ${(c.datos.nombre ?? '').split(' ')[0]}. Te escribimos de Alma Animal por el baño de ${c.datos.mascota}: lo pediste para el ${pide}. ¿Te confirmamos esa hora?`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Escribir</a>}
                            <button className="gbtn sm" type="button" onClick={() => confirmarCita(c, x.id)}><span className="ms" aria-hidden="true">check</span>Confirmar</button>
                            <a className="gbtn out sm" href={link('/gestor/agenda')}>Ver</a>
                          </div>
                        )}
                      </article>
                    );
                  }
                  const p = x.pedido!;
                  return (
                    <article className="inb" key={x.id} data-hecho={!!hecho || undefined}>
                      <span className="inb__ic"><span className="ms" aria-hidden="true">receipt_long</span></span>
                      <div className="inb__txt"><span>Pedido #{p.numero} · {when(p.creado)}</span><b>{p.nombre} {p.apellido} · {money(p.total)}</b>
                        <span>{p.ciudad}{p.prioritario ? ' · envío prioritario' : ''} · {p.items.reduce((s, i) => s + i.cantidad, 0)} productos{p.obsequio ? ' · lleva obsequio' : ''}</span></div>
                      {hecho ? <span className="chip ok"><span className="ms" aria-hidden="true">check_circle</span>{hecho}</span> : (
                        <div className="dacts">
                          <a className="gbtn wa sm" href={waLink(p.celular, mensaje(p))} target="_blank" rel="noopener" onClick={() => setListos((l) => ({ ...l, [x.id]: 'Mensaje enviado' }))}><span className="ms" aria-hidden="true">chat</span>Confirmar pedido</a>
                          <a className="gbtn out sm" href={link('/gestor/pedidos')}>Ver</a>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            </div>

            <div className="hoy__col">
              {/* ---------- VACUNAS ---------- */}
              <section id="alertas" className="gcard" aria-labelledby="rv">
                <h2 className="ch2" id="rv"><span className="ms" aria-hidden="true">vaccines</span>Vacunas y desparasitaciones</h2>
                {!dosis.length && <p className="vacio">Nada por vencer en los próximos 15 días.</p>}
                <div className="vrows">
                  {dosis.map((r) => {
                    const p = pac(r.paciente_id), d = dueño(p?.propietario_id);
                    const dias = Math.round((new Date(r.datos.proxima + 'T12:00:00').getTime() - Date.now()) / 86400000);
                    const st = dias < 0 ? ['Vencida', 'st-mal'] : dias === 0 ? ['Hoy', 'st-warn'] : [`En ${dias} ${dias === 1 ? 'día' : 'días'}`, 'st-warn'];
                    const f = new Date(r.datos.proxima + 'T12:00:00');
                    return (
                      <div className="vrow2" key={r.id}>
                        <a className="vrow2__p" href={p ? link('/gestor/paciente') + `?id=${p.id}` : '#'}><b>{p?.nombre ?? 'Paciente'}</b><span>{d ? nombreCompleto(d) : ''}</span></a>
                        <span className="vrow2__q">{r.titulo}<span>{f.getDate()} {MESES[f.getMonth()].slice(0, 3)}</span></span>
                        <span className={`chip ${st[1]}`}>{st[0]}</span>
                        {d && <a className="gbtn wa sm" href={waLink(d.celular, `Hola, ${d.nombre}. Te escribimos de Alma Animal: a ${p?.nombre} ${dias < 0 ? 'ya se le venció' : 'le toca pronto'} ${r.titulo.toLowerCase()} (${f.getDate()} de ${MESES[f.getMonth()]}). ¿Te agendamos una cita?`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Recordar</a>}
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* ---------- TIENDA ---------- */}
              <section id="stock" className="gcard" aria-labelledby="ti">
                <h2 className="ch2" id="ti"><span className="ms" aria-hidden="true">storefront</span>Tienda</h2>
                <div className="tcount">
                  {(['nuevo', 'confirmado', 'enviado', 'entregado'] as const).map((e) => (
                    <a key={e} href={link('/gestor/pedidos')} style={{ background: ESTADOS[e].bg, color: ESTADOS[e].fg }}><b>{pedidos.filter((p) => p.estado === e).length}</b><span>{ESTADOS[e].txt}</span></a>
                  ))}
                </div>
                <b className="tcount__t">Poco stock</b>
                {!bajos.length && <p className="hint">Todo con existencias.</p>}
                {bajos.flatMap((p) => p.variantes.filter((v) => v.activo && v.stock <= p.aviso_stock).map((v) => ({ p, v }))).slice(0, 6).map(({ p, v }) => (
                  <div className="tlow" key={p.id + v.nombre}><span>{p.nombre}{p.variantes.filter((x) => x.activo).length > 1 ? ` · ${v.nombre}` : ''}</span><span className={`chip ${v.stock <= 0 ? 'st-mal' : 'st-warn'}`}>{v.stock <= 0 ? 'Agotado' : `${v.stock} und.`}</span></div>
                ))}
                <a className="gbtn out sm" href={link('/gestor/productos')}>Ir a inventario</a>
              </section>

              {h && <section className="gcard" aria-label="Horario"><h2 className="ch2"><span className="ms" aria-hidden="true">schedule</span>Horario</h2>
                <div className="prevh">{textoHorario(h).map((g) => <span key={g.dias}><b>{g.dias}:</b> {g.t}</span>)}</div></section>}
            </div>
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}
