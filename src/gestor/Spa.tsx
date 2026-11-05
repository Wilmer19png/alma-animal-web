// Citas de spa: las solicitudes de la web y el día del spa. Cada cita avanza por cinco etapas:
// solicitada → confirmada → en el spa → lista para recoger → entregada. El precio sale de Servicios y tarifas.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, waLink, prettyCel, money, when } from './lib';
import { listarPacientes, listarPropietarios, crearRegistros, nombreCompleto, edad, kg, type Paciente, type Propietario } from './clinica-datos';
import { leerHorario, leerDuraciones, listarCierres, horas, hhmm, minutosDe, diaSemana, iso, sumarDias, enFecha, cerradoPor, MESES, DIAS,
  type Cita, type Horario, type Duraciones, type Cierre } from './agenda-datos';
import { leerTarifas, filaDe, filaTxt, fueraDeTabla, type Tarifas } from './tarifas-datos';
import { listarSpa, avanzar, fase, cobroDe, cuenta, pesoDe, FASES, FICHA, PAGOS, fichaAlerta, fichaTexto, type Fase, type Ficha, type Cobro } from './spa-datos';
import { Seg, Avatar } from './clinica-ui';
import type { Miembro } from './session';

type Filtro = 'activas' | 'solicitada' | 'hoy' | 'entregada';
const FILTROS: [Filtro, string][] = [['activas', 'Activas'], ['solicitada', 'Por confirmar'], ['hoy', 'Hoy'], ['entregada', 'Historial']];
const esHoy = (c: Cita) => iso(new Date(c.inicio)) === iso(new Date());
const pasa = (c: Cita, f: Filtro) => { const x = fase(c); return f === 'activas' ? x !== 'entregada' : f === 'hoy' ? esHoy(c) && x !== 'solicitada' : x === f; };
const DIAS_C = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
const corto = (d: Date) => `${esMismoDia(d, new Date()) ? 'Hoy' : esMismoDia(d, sumarDias(new Date(), 1)) ? 'Mañana' : DIAS_C[d.getDay()] + ' ' + d.getDate()} · ${hhmm(d.getHours() * 60 + d.getMinutes())}`;
const largo = (d: Date) => `${DIAS[diaSemana(d)].toLowerCase()} ${d.getDate()} de ${MESES[d.getMonth()]} a las ${hhmm(d.getHours() * 60 + d.getMinutes())}`;
const esMismoDia = (a: Date, b: Date) => iso(a) === iso(b);
const franja = (d: Date) => (d.getHours() < 12 ? 'en la mañana' : 'en la tarde');

export default function Spa() {
  const [citas, setCitas] = useState<Cita[] | null>(null);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [props, setProps] = useState<Propietario[]>([]);
  const [tar, setTar] = useState<Tarifas | null>(null);
  const [hor, setHor] = useState<{ h: Horario; d: Duraciones; c: Cierre[] } | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('activas');
  const [sel, setSel] = useState<string | null>(null);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [aviso, setAviso] = useState('');

  const cargar = () => listarSpa().then(setCitas).catch(() => setCitas([]));
  useEffect(() => {
    cargar();
    Promise.all([listarPacientes(), listarPropietarios(), leerTarifas(), leerHorario(), leerDuraciones(), listarCierres()])
      .then(([p, o, t, h, d, c]) => { setPacs(p); setProps(o); setTar(t); setHor({ h, d, c }); }).catch(() => {});
  }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const orden = (a: Cita, b: Cita) => {
    const fa = FASES.findIndex((x) => x.id === fase(a)), fb = FASES.findIndex((x) => x.id === fase(b));
    return filtro === 'entregada' ? b.inicio.localeCompare(a.inicio) : (fa === 0 ? -1 : 0) - (fb === 0 ? -1 : 0) || a.inicio.localeCompare(b.inicio);
  };
  const filas = useMemo(() => (citas ?? []).filter((c) => pasa(c, filtro)).sort(orden), [citas, filtro]); // eslint-disable-line react-hooks/exhaustive-deps
  const actual = citas?.find((c) => c.id === sel) ?? filas[0] ?? null;
  const pac = (c: Cita) => pacs.find((p) => p.id === c.paciente_id);
  const dueño = (c: Cita) => { const p = pac(c); return props.find((o) => o.id === (p?.propietario_id ?? c.propietario_id)); };
  const mascota = (c: Cita) => pac(c)?.nombre ?? c.datos.mascota ?? 'Sin nombre';
  const raza = (c: Cita) => pac(c)?.raza ?? c.datos.raza ?? '';
  const servicioTxt = (c: Cita) => (tar ? cuenta(cobroDe(c, tar, pac(c)), tar, pesoDe(c, pac(c))).txt : String(c.datos.servicio ?? 'Baño'));
  const guardado = (n: Cita, txt: string) => { setCitas((cs) => (cs ?? []).map((c) => (c.id === n.id ? n : c)).filter((c) => fase(c))); setAviso(txt); };
  const elegir = (c: Cita) => { setSel(c.id); setVista('detalle'); };
  const porConfirmar = (citas ?? []).filter((c) => fase(c) === 'solicitada').length;

  return (
    <Shell activo="spa" insignias={{ spa: porConfirmar }}>
      {(yo) => (
        <div className="md spa" data-vista={vista}>
          <div className="mhead">
            <div className="mhead__txt"><h1>Citas de spa</h1><p>Las solicitudes del formulario de la web llegan aquí. Confírmalas por WhatsApp con la hora y el precio.</p></div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <a className="gbtn out sm" href={link('/gestor/tarifas')}><span className="ms" aria-hidden="true">sell</span>Servicios y tarifas</a>
            <a className="gbtn sm" href={link('/gestor/agenda') + '?servicio=spa'}><span className="ms" aria-hidden="true">add</span>Nueva cita</a>
          </div>

          {hor && citas && <HoySpa h={hor.h} c={hor.c} citas={citas.filter((c) => esHoy(c) && fase(c) !== 'solicitada')} sel={actual?.id} nombre={mascota} elegir={elegir} />}

          <div className="md__grid">
            <section className="gcard md__list" aria-label="Citas de spa">
              <div className="filts" role="group" aria-label="Filtrar">
                {FILTROS.map(([id, t]) => <button key={id} type="button" className="filt" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t}<span>{(citas ?? []).filter((c) => pasa(c, id)).length}</span></button>)}
              </div>
              {citas === null && <p className="vacio">Cargando…</p>}
              {citas && !filas.length && <p className="vacio">{filtro === 'solicitada' ? 'No hay solicitudes por confirmar.' : 'No hay citas en este grupo.'}</p>}
              {filas.map((c) => {
                const f = FASES.find((x) => x.id === fase(c))!, d = new Date(c.inicio);
                return (
                  <button key={c.id} type="button" className="row srow" aria-pressed={actual?.id === c.id} onClick={() => elegir(c)}>
                    <Avatar txt={mascota(c).slice(0, 1).toUpperCase()} />
                    <span className="row__txt">
                      <b>{mascota(c)}{raza(c) && <em> · {raza(c)}</em>}</b>
                      <span>{servicioTxt(c)}</span>
                      <span className="srow__when">{c.origen === 'web' && <span className="ms" aria-label="Llegó por la web">language</span>}{f.id === 'solicitada' ? `Pidió ${corto(d).replace(/ · .*/, '')} · ${franja(d).replace('en la ', '')}` : corto(d)}</span>
                    </span>
                    <span className="chip" style={{ background: f.bg, color: f.fg }}>{f.txt}</span>
                  </button>
                );
              })}
              {hor && <p className="hint">Cada cita confirmada ocupa {hor.d.spa >= 60 ? `${hor.d.spa / 60} ${hor.d.spa === 60 ? 'hora' : 'horas'}` : `${hor.d.spa} min`} en el carril de spa de la <a href={link('/gestor/agenda')}>Agenda</a>. Así no se cruza con otra.</p>}
            </section>

            {actual && tar && hor
              ? <Detalle key={actual.id} c={actual} yo={yo} p={pac(actual)} o={dueño(actual)} t={tar} hor={hor} citas={citas ?? []}
                  mascota={mascota(actual)} servicioTxt={servicioTxt} volver={() => setVista('lista')} guardado={guardado} error={setAviso} />
              : <section className="gcard md__det vacio-c"><p className="vacio">{citas === null ? 'Cargando…' : 'Elige una cita para ver el detalle.'}</p></section>}
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

/* ---------- hoy en el spa: línea de tiempo ---------- */
function HoySpa({ h, c: cierres, citas, sel, nombre, elegir }: { h: Horario; c: Cierre[]; citas: Cita[]; sel?: string; nombre: (c: Cita) => string; elegir: (c: Cita) => void }) {
  const hoy = new Date(), dia = h.dias[diaSemana(hoy)], cerrado = cerradoPor(hoy, h, cierres);
  const a = dia.manana[0], b = dia.tarde ? dia.tarde[1] : dia.manana[1], pct = (m: number) => ((m - a) / (b - a)) * 100;
  const marcas: number[] = []; for (let m = Math.ceil(a / 60) * 60; m <= b; m += 60) marcas.push(m);
  return (
    <section className="gcard shoy" aria-labelledby="shoy">
      <h2 className="ch2" id="shoy"><span className="ms" aria-hidden="true">today</span>Hoy · {DIAS[diaSemana(hoy)].toLowerCase()} {hoy.getDate()} de {MESES[hoy.getMonth()]}
        <a className="link-add" href={link('/gestor/agenda')}><span className="ms" aria-hidden="true">calendar_month</span>Ver en la agenda</a></h2>
      {cerrado ? <p className="vacio">Hoy no se atiende ({cerrado.toLowerCase()}).</p> : (
        <div className="shoy__wrap">
          <div className="shoy__t">
            {dia.tarde && <span className="shoy__alm" style={{ left: pct(dia.manana[1]) + '%', width: pct(dia.tarde[0]) - pct(dia.manana[1]) + '%' }}>Almuerzo</span>}
            {citas.map((c) => {
              const f = FASES.find((x) => x.id === fase(c))!, i = minutosDe(c.inicio), j = minutosDe(c.fin);
              return (
                <button key={c.id} type="button" className="shoy__b" aria-pressed={sel === c.id} onClick={() => elegir(c)}
                  style={{ left: `calc(${pct(i)}% + 2px)`, width: `calc(${pct(j) - pct(i)}% - 4px)`, background: f.bg, color: f.fg }}>
                  <b>{nombre(c)} · {hhmm(i, true)}</b><span>{f.txt}</span>
                </button>
              );
            })}
            {!citas.length && <span className="shoy__vacio">Sin baños agendados hoy.</span>}
          </div>
          <div className="shoy__h" aria-hidden="true">
            {marcas.map((m, n) => <span key={m} className={n % 2 ? 'impar' : undefined} style={{ left: pct(m) + '%' }}>{hhmm(m).replace(':00', '')}</span>)}
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- detalle de una cita ---------- */
function Detalle({ c, yo, p, o, t, hor, citas, mascota, servicioTxt, volver, guardado, error }: {
  c: Cita; yo: Miembro; p?: Paciente; o?: Propietario; t: Tarifas; hor: { h: Horario; d: Duraciones; c: Cierre[] }; citas: Cita[]; mascota: string;
  servicioTxt: (c: Cita) => string; volver: () => void; guardado: (c: Cita, txt: string) => void; error: (t: string) => void;
}) {
  const f = fase(c)!, si = FASES.findIndex((x) => x.id === f);
  const peso = pesoDe(c, p);
  const especie = p ? p.especie : c.datos.especie;
  const celular = o?.celular ?? c.datos.celular ?? '';
  const quien = o ? nombreCompleto(o) : c.datos.nombre ?? '';
  const primer = (o?.nombre ?? quien).split(' ')[0];
  const [cobro, setCobro] = useState<Cobro>(() => cobroDe(c, t, p));
  const { tb, base, total, txt: svc } = cuenta(cobro, t, peso);
  const cerrada = f === 'entregada';
  const direccion = String(c.datos.direccion ?? c.direccion ?? '');
  const ficha: Ficha = (c.datos as unknown as { ficha?: Ficha }).ficha ?? {};
  const [fi, setFi] = useState<Ficha>(ficha);
  const [pago, setPago] = useState<string>((c.datos.pago as string) || PAGOS[0]);
  const [ocupado, setOcupado] = useState(false);

  const paso = async (cambio: Parameters<typeof avanzar>[1], txt: string) => {
    setOcupado(true);
    try { guardado(await avanzar(c, cambio), txt); } catch (e) { error((e as Error).message); }
    setOcupado(false);
  };
  // cada cambio del servicio se guarda en la cita (los valores escritos, al salir de la casilla)
  const guardarCobro = (n: Cobro, ya = true) => {
    setCobro(n);
    if (ya && !cerrada) avanzar(c, { datos: { ...n } }).then((x) => guardado(x, 'Servicio actualizado')).catch((e) => error((e as Error).message));
  };
  const cambiarExtra = (id: string) => guardarCobro({ ...cobro, extras: cobro.extras.includes(id) ? cobro.extras.filter((x) => x !== id) : [...cobro.extras, id] });
  const cambiarTabla = (g: string) => { const n = t.tablas.find((x) => x.id === g); guardarCobro({ ...cobro, grupo: g, fila: n ? filaDe(n, peso) : 0, abundante: false }); };

  // horas libres del spa: las del día que pidió y las de los días siguientes
  const pedida = new Date(c.inicio);
  const opciones = useMemo(() => {
    if (f !== 'solicitada') return [];
    const out: { d: Date; tag: string; libre: boolean }[] = [];
    const pm = minutosDe(c.inicio);
    for (let n = 0; n < 8 && out.length < 8; n++) {
      const dia = sumarDias(new Date(pedida.getFullYear(), pedida.getMonth(), pedida.getDate()), n);
      const hs = horas(dia, 'spa', citas, hor.h, hor.d, hor.c, c.id).filter((x) => !x.motivo && x.min % 60 === 0);
      if (n === 0) {
        const suya = hs.find((x) => x.min === pm) ?? (horas(dia, 'spa', citas, hor.h, hor.d, hor.c, c.id).find((x) => x.min === pm));
        if (suya) out.push({ d: new Date(enFecha(dia, pm)), tag: suya.ocupado ? 'Ocupado' : suya.motivo ? 'Ya no está libre' : 'Lo que pidió', libre: !suya.ocupado && !suya.motivo });
      }
      hs.filter((x) => !x.ocupado && !(n === 0 && x.min === pm)).slice(0, n === 0 ? 3 : 2).forEach((x) => out.push({ d: new Date(enFecha(dia, x.min)), tag: '', libre: true }));
    }
    return out.slice(0, 8);
  }, [f, citas, hor]); // eslint-disable-line react-hooks/exhaustive-deps
  const [hora, setHora] = useState<number>(() => Math.max(0, opciones.findIndex((x) => x.libre)));
  const elegida = opciones[hora]?.libre ? opciones[hora].d : null;
  const confirmTxt = elegida ? `¡Hola, ${primer}! Te escribimos de Alma Animal. Confirmamos el spa de ${mascota} para el ${largo(elegida)}.\nServicio: ${svc}.\nValor: ${money(total)}.\nTe esperamos en la Calle 1 # 9-02, Alfonso López. Si necesitas cambiar la hora, respóndenos por aquí.` : '';
  const [msg, setMsg] = useState('');
  useEffect(() => { setMsg(confirmTxt); }, [hora, total]); // eslint-disable-line react-hooks/exhaustive-deps
  const cierre = hor.h.dias[diaSemana(new Date())];
  const listaTxt = `¡Hola, ${primer}! ${mascota} ya terminó su spa. Puedes pasar cuando quieras, hoy antes de las ${hhmm((cierre.tarde ?? cierre.manana)[1])}.\nTotal: ${money(total)}. Gracias por confiar en nosotros.`;
  const [msgL, setMsgL] = useState(listaTxt);
  const recordarTxt = `¡Hola, ${primer}! Te recordamos el spa de ${mascota} el ${largo(pedida)}. Te esperamos en la Calle 1 # 9-02, Alfonso López.`;

  const flags = [
    c.origen === 'web' && ['language', 'Llegó por la web', 'lav'],
    p && ['stethoscope', 'Paciente de la Dra.', 'ok'],
    p?.alergias && ['warning', `Alergias: ${p.alergias}`, 'alerta'],
    !p && ['info', 'Sin ficha todavía', 'peach']
  ].filter(Boolean) as [string, string, string][];

  return (
    <section className="gcard md__det sdet" aria-labelledby="sdn">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Citas de spa</button>
      <div className="dhead">
        <Avatar txt={mascota.slice(0, 1).toUpperCase()} grande />
        <div className="dhead__txt">
          <h2 id="sdn">{mascota}</h2>
          <span>{[p ? (p.especie === 'felino' ? 'Gato' : p.especie === 'canino' ? 'Perro' : 'Otra especie') : (/gat/i.test(especie ?? '') ? 'Gato' : 'Perro'), p?.raza ?? c.datos.raza, peso ? kg(peso) : '', p ? edad(p) : c.datos.edad].filter(Boolean).join(' · ')}</span>
        </div>
        {p && <a className="gbtn out sm" href={link('/gestor/paciente') + `?id=${p.id}`}><span className="ms" aria-hidden="true">clinical_notes</span>Ficha clínica</a>}
      </div>
      <p className="sdet__own"><span className="ms" aria-hidden="true">person</span>{quien}{celular && ` · ${prettyCel(celular)}`}<span>{c.origen === 'web' ? `Solicitud ${when(c.creado)}` : 'Agendada en el consultorio'}</span></p>

      <ol className="pasos" aria-label="Avance de la cita">
        {FASES.map((x, n) => (
          <li key={x.id} className={n < si ? 'hecho' : n === si ? 'ahora hecho' : ''} aria-current={n === si ? 'step' : undefined}>
            <span className="pasos__dot" aria-hidden="true"><span className="ms">{n < si ? 'check' : ['inbox', 'event_available', 'shower', 'pets', 'done_all'][n]}</span></span>{x.txt}
          </li>
        ))}
      </ol>

      {(c.datos.notas || flags.length > 0) && (
        <div className="sdet__notas">
          {c.datos.notas && <><b>Lo que nos contó{c.origen === 'web' ? ' en el formulario' : ''}</b><p>«{c.datos.notas}»</p></>}
          <div className="vc__chips">{flags.map(([i, txt, cls]) => <span key={txt} className={`chip ${cls}`}><span className="ms" aria-hidden="true">{i}</span>{txt}</span>)}</div>
        </div>
      )}

      <div className="sprecio">
        <h3 className="ch2"><span className="ms" aria-hidden="true">shower</span>Servicio y precio<small>{peso ? `pesa ${kg(peso)}` : 'sin peso: elige la fila'}{p?.raza ?? c.datos.raza ? ` · ${p?.raza ?? c.datos.raza}` : ''}</small></h3>
        <div className="sserv">
          <div className="fld"><label htmlFor="ss-t">Tipo</label>
            <select id="ss-t" value={cobro.grupo} disabled={cerrada} onChange={(e) => cambiarTabla(e.target.value)}>
              {t.tablas.map((x) => <option key={x.id} value={x.id}>{x.nombre}</option>)}
            </select></div>
          {tb && <div className="fld"><label htmlFor="ss-f">{tb.porPeso ? 'Peso' : 'Opción'}</label>
            <select id="ss-f" value={cobro.fila} disabled={cerrada} onChange={(e) => guardarCobro({ ...cobro, fila: Number(e.target.value) })}>
              {tb.filas.map((x, j) => <option key={j} value={j}>{filaTxt(tb, j)} · {money(x.precio)}</option>)}
            </select></div>}
        </div>
        {tb && fueraDeTabla(tb, peso) && <p className="hint-g">Pesa más de lo que cubre la tabla «{tb.nombre}». Revisa el precio con el peluquero.</p>}
        <ul>
          {tb && (
            <li data-on>
              <span className="ms sprecio__ic" aria-hidden="true">check_circle</span>
              <span className="sprecio__n"><b>{tb.bano ? `Baño · ${tb.nombre.toLowerCase()}` : tb.nombre}</b><span>{filaTxt(tb, cobro.fila)}{tb.bano ? ' · incluye el baño completo' : ''}</span></span>
              <b className="sprecio__v">{money(base)}</b>
            </li>
          )}
          {tb?.abundante && tb.filas[cobro.fila]?.abundante && (
            <li data-on={cobro.abundante || undefined}>
              <button type="button" className="sw" role="switch" aria-checked={cobro.abundante} aria-label="Pelo abundante (deslanado)" disabled={cerrada} onClick={() => guardarCobro({ ...cobro, abundante: !cobro.abundante })}><i /></button>
              <span className="sprecio__n"><b>Pelo abundante (deslanado)</b><span>Cambia el precio de la fila a {money(tb.filas[cobro.fila].abundante!)}</span></span>
              <b className="sprecio__v">{cobro.abundante ? '' : money(tb.filas[cobro.fila].abundante!)}</b>
            </li>
          )}
          {t.adicionales.map((a) => {
            const on = cobro.extras.includes(a.id);
            const v = cuenta({ ...cobro, extras: [a.id] }, t, peso).ads[0]?.v ?? 0;
            return (
              <li key={a.id} data-on={on || undefined}>
                <button type="button" className="sw" role="switch" aria-checked={on} aria-label={a.nombre} disabled={cerrada} onClick={() => cambiarExtra(a.id)}><i /></button>
                <span className="sprecio__n"><b>{a.nombre}</b><span>{a.id === 'transporte' && direccion ? `Dirección: ${direccion}` : a.desc}</span></span>
                {a.variable && on ? (
                  <input className="cell sprecio__in" inputMode="numeric" aria-label={`Valor de ${a.nombre}`} placeholder="$0" disabled={cerrada}
                    value={v ? money(v) : ''}
                    onChange={(e) => guardarCobro({ ...cobro, montos: { ...cobro.montos, [a.id]: Number(e.target.value.replace(/\D/g, '')) || 0 } }, false)}
                    onBlur={() => guardarCobro(cobro)} />
                ) : <b className="sprecio__v">{a.variable && !v ? 'Según el caso' : '+' + money(v)}</b>}
              </li>
            );
          })}
        </ul>
        <div className="sprecio__t"><span>Total</span><b>{money(total)}</b></div>
        <p className="hint">Las tarifas se cambian en <a href={link('/gestor/tarifas')}>Servicios y tarifas</a>.</p>
      </div>

      {f === 'solicitada' && (
        <>
          <div className="shoras">
            <h3 className="ch2"><span className="ms" aria-hidden="true">event_available</span>Elige la hora<small>pidió {corto(pedida).replace(/ · .*/, '').toLowerCase()} {franja(pedida)}; solo se ofrecen horas libres del spa</small></h3>
            {!opciones.length && <p className="hint-g">No hay horas libres cerca de lo que pidió. Escríbele para proponerle otro día.</p>}
            <div className="shoras__g" role="radiogroup" aria-label="Hora del spa">
              {opciones.map((x, n) => (
                <button key={n} type="button" role="radio" aria-checked={hora === n} disabled={!x.libre} onClick={() => setHora(n)}>
                  <b>{corto(x.d)}</b>{x.tag && <span>{x.tag}</span>}
                </button>
              ))}
            </div>
          </div>
          {celular ? (
            <div className="wamsg">
              <div className="wamsg__head"><span className="wamsg__ic" aria-hidden="true"><span className="ms">chat</span></span><span><b>Mensaje de confirmación</b><span>Se abre en tu WhatsApp, listo para enviar.</span></span></div>
              <label className="sr-only" htmlFor="smsg">Mensaje</label>
              <textarea id="smsg" rows={6} value={msg} onChange={(e) => setMsg(e.target.value)} />
              <div className="wamsg__acts">
                <a className={'gbtn wa' + (elegida && !ocupado ? '' : ' off')} href={elegida ? waLink(celular, msg) : undefined} target="_blank" rel="noopener" aria-disabled={!elegida}
                  onClick={(e) => { if (!elegida || ocupado) { e.preventDefault(); return; } paso({ estado: 'confirmada', inicio: elegida.toISOString(), fin: new Date(elegida.getTime() + hor.d.spa * 60000).toISOString(), datos: { ...cobro, total: String(total) } }, 'Cita confirmada'); }}>
                  <span className="ms" aria-hidden="true">send</span>Confirmar por WhatsApp
                </a>
                <button type="button" className="gbtn ghost" disabled={ocupado} onClick={() => { if (confirm(`¿Rechazar la solicitud de ${mascota}? Escríbele para contarle el motivo.`)) paso({ estado: 'cancelada' }, 'Solicitud rechazada'); }}>Rechazar</button>
              </div>
            </div>
          ) : (
            <div className="dacts">
              <button type="button" className="gbtn" disabled={!elegida || ocupado} onClick={() => elegida && paso({ estado: 'confirmada', inicio: elegida.toISOString(), fin: new Date(elegida.getTime() + hor.d.spa * 60000).toISOString(), datos: { ...cobro, total: String(total) } }, 'Cita confirmada')}><span className="ms" aria-hidden="true">check</span>Confirmar</button>
              <button type="button" className="gbtn ghost" disabled={ocupado} onClick={() => { if (confirm(`¿Rechazar la solicitud de ${mascota}?`)) paso({ estado: 'cancelada' }, 'Solicitud rechazada'); }}>Rechazar</button>
            </div>
          )}
          <p className="hint">Al confirmar, la cita queda en la agenda{c.origen === 'web' ? ' y el cliente la verá en su portal cuando lo activemos' : ''}.</p>
        </>
      )}

      {f === 'confirmada' && (
        <>
          <p className="sdet__slot"><span className="ms" aria-hidden="true">event</span>{corto(pedida)}</p>
          <p className="hint">Cuando se activen los correos, le llegará un recordatorio un día antes (gratis). Por WhatsApp lo envías tú con un toque.</p>
          <div className="dacts">
            {celular && <a className="gbtn wa sm" href={waLink(celular, recordarTxt)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Recordar por WhatsApp</a>}
            <button type="button" className="gbtn sm" disabled={ocupado} onClick={() => paso({ datos: { fase: 'spa', llego: new Date().toISOString() } }, `${mascota} está en el spa`)}><span className="ms" aria-hidden="true">login</span>Llegó · empezar el baño</button>
            <a className="gbtn out sm" href={link('/gestor/agenda')}><span className="ms" aria-hidden="true">schedule</span>Cambiar hora</a>
            <button type="button" className="gbtn ghost sm" disabled={ocupado} onClick={() => { if (confirm(`¿Marcar que ${mascota} no vino? Se libera el espacio en la agenda.`)) paso({ estado: 'no_vino' }, 'Marcada como no vino'); }}>No vino</button>
          </div>
        </>
      )}

      {f === 'spa' && (
        <>
          <div className="sficha">
            <h3 className="ch2"><span className="ms" aria-hidden="true">checklist</span>Ficha del baño<small>lo que encontró el peluquero</small></h3>
            {FICHA.map((x) => (
              <div key={x.k} className="sficha__r">
                <span>{x.q}</span>
                <Seg label={x.q} value={String(fi[x.k] ?? 0)} opts={x.opts.map((t, i) => [String(i), t] as [string, string])} onChange={(v) => setFi((y) => ({ ...y, [x.k]: Number(v) }))} />
              </div>
            ))}
            {fichaAlerta(fi) && <p className="hint-g"><span className="ms" aria-hidden="true">medical_services</span> {p ? `Se le avisa a la Dra. Mariana y queda anotado en la historia clínica de ${mascota}.` : 'Cuéntaselo al dueño al entregarla y recomiéndale una consulta.'}</p>}
          </div>
          <div className="dacts">
            <button type="button" className="gbtn" disabled={ocupado} onClick={async () => {
              if (p) {
                try {
                  await crearRegistros([{ paciente_id: p.id, tipo: 'spa', fecha: new Date().toISOString(), titulo: svc, resumen: fichaTexto(fi) + (fichaAlerta(fi) ? '. Revisar en consulta.' : '.'), datos: {}, archivos: [], externo: false, por_nombre: yo.nombre }]);
                } catch { error('No se anotó en la historia clínica, pero la cita sigue.'); }
              }
              paso({ datos: { fase: 'lista', ficha: fi } }, `${mascota} está lista`);
            }}><span className="ms" aria-hidden="true">done_all</span>Terminó · está lista</button>
          </div>
        </>
      )}

      {f === 'lista' && (
        <>
          {celular && (
            <div className="wamsg">
              <div className="wamsg__head"><span className="wamsg__ic" aria-hidden="true"><span className="ms">chat</span></span><span><b>Avisar que está lista</b><span>Se abre en tu WhatsApp, listo para enviar.</span></span></div>
              <label className="sr-only" htmlFor="smsgl">Mensaje</label>
              <textarea id="smsgl" rows={4} value={msgL} onChange={(e) => setMsgL(e.target.value)} />
              <div className="wamsg__acts"><a className="gbtn wa sm" href={waLink(celular, msgL)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">send</span>Avisar por WhatsApp</a></div>
            </div>
          )}
          <div className="pay"><b>Cómo pagó</b><Seg label="Cómo pagó" value={pago} opts={PAGOS.map((x) => [x, x.replace(/ \(.*/, '')] as [string, string])} onChange={setPago} /></div>
          <div className="dacts">
            <button type="button" className="gbtn" disabled={ocupado} onClick={() => paso({ estado: 'atendida', datos: { ...cobro, pago, total: String(total), entregada: new Date().toISOString(), sin_conta: '' } }, 'Entregada y pagada')}><span className="ms" aria-hidden="true">check</span>Entregada y pagada</button>
          </div>
          <p className="conta"><span className="ms" aria-hidden="true">hourglass_top</span><span>Este baño está <b>en espera</b> en Contabilidad. Al marcarlo como entregado y pagado entran <b>{money(total)}</b> en «Baños y spa».</span></p>
        </>
      )}

      {f === 'entregada' && (
        <>
          <dl className="kv">
            <div><dt>Fecha</dt><dd>{corto(pedida)}</dd></div>
            <div><dt>Pagó</dt><dd>{c.datos.total ? money(Number(c.datos.total)) : money(total)}{c.datos.pago ? ` · ${String(c.datos.pago).replace(/ \(.*/, '')}` : ''}</dd></div>
            {(c.datos as unknown as { ficha?: Ficha }).ficha && <div className="full"><dt>Ficha del baño</dt><dd className="normal">{fichaTexto(ficha)}</dd></div>}
          </dl>
          <p className="conta conta--ok"><span className="ms" aria-hidden="true">account_balance_wallet</span><span>Entraron <b>{money(Number(c.datos.total) || total)}</b> a Contabilidad en «Baños y spa».</span></p>
          <p className="sdet__prox"><span className="ms" aria-hidden="true">event_repeat</span>Próximo baño sugerido: <b>{largo(sumarDias(pedida, t.proximo * 7)).replace(/ a las .*/, '')}</b> (en {t.proximo} semanas).</p>
          <div className="dacts"><a className="gbtn sm" href={link('/gestor/agenda') + `?servicio=spa${p ? `&paciente=${p.id}` : ''}`}><span className="ms" aria-hidden="true">add</span>Agendar el próximo</a></div>
          <p className="hint">Queda en el historial de spa de {mascota}{p ? ', que el dueño también verá en su portal' : ''}.</p>
        </>
      )}
    </section>
  );
}
