// Ficha del paciente (/gestor/paciente?id=…): datos, peso con su gráfica, propietario, historia clínica
// (línea de tiempo por tipo, con archivos) y carnet de vacunas y desparasitaciones.
import { useEffect, useMemo, useRef, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, waLink, prettyCel, fechaCorta, mesCorto } from './lib';
import {
  listarPacientes, listarPropietarios, registrosDe, crearRegistros, actualizarPaciente, borrarPaciente, borrarRegistro,cambiarPrivado, subirArchivo, abrirArchivo,
  nombreCompleto, edad, kg, sexoTxt, ESPECIES, TIPOS, VACUNAS, DESPARASITACIONES, SERVICIOS, PRESENTACIONES, servicioDe, vieneASpa, medicamentosDe, cantidadEj,
  type Paciente as TPaciente, type Propietario, type Registro, type TipoRegistro, type NuevoPaciente, type Archivo, type Medicamento
} from './clinica-datos';
import { PacienteForm, Avatar, erroresPaciente, spaLimpio } from './clinica-ui';
import { CarnetDoc, AtencionDoc, tutorDe } from './documentos';
import { descargarPdf, nombreArchivo } from './pdf';
import type { Rol } from './session';
import { leerEsquemas, ESQUEMAS_BASE, type Esquemas } from './vacunas-datos';

const fechaC = fechaCorta;
const hoyISO = () => { const d = new Date(); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); };
const enDias = (n: number) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const ETIQ: Record<string, string> = {
  motivo: 'Motivo', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', temperatura: 'Temperatura (°C)', fc: 'Frecuencia cardiaca',
  fr: 'Frecuencia respiratoria', peso: 'Peso (kg)', laboratorio: 'Laboratorio', lote: 'Lote', proxima: 'Próxima dosis', producto: 'Producto',
  vence: 'Vencimiento del lote', proxima_que: 'Qué le toca', obs: 'Observaciones', cuchilla: 'Guía de cuchilla'
};

// lo que cada rol puede escribir en la historia
const PUEDE: Record<Rol, TipoRegistro[]> = {
  admin: Object.keys(TIPOS) as TipoRegistro[], veterinario: Object.keys(TIPOS) as TipoRegistro[],
  recepcion: ['peso', 'spa', 'nota'], peluqueria: ['spa', 'peso', 'nota']
};

export default function Paciente() {
  const id = new URLSearchParams(location.search).get('id') ?? '';
  const [m, setM] = useState<TPaciente | null | undefined>(undefined);
  const [dueño, setDueño] = useState<Propietario | null>(null);
  const [hermanos, setHermanos] = useState<TPaciente[]>([]);
  const [regs, setRegs] = useState<Registro[] | null>(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [tab, setTab] = useState<'todo' | 'carnet' | TipoRegistro>('todo');
  const [q, setQ] = useState('');
  const [nuevo, setNuevo] = useState<TipoRegistro | null>(null);
  const [menu, setMenu] = useState(false);
  const [editando, setEditando] = useState(false);
  const histRef = useRef<HTMLElement>(null);
  const [esq, setEsq] = useState<Esquemas>(ESQUEMAS_BASE);
  const [pdfOcupado, setPdfOcupado] = useState(false);
  const bajar = async (doc: React.ReactElement, nombre: string) => {
    setPdfOcupado(true); setAviso('Preparando el PDF…');
    try { await descargarPdf(doc, nombre); setAviso('PDF descargado. Ya lo puedes mandar por WhatsApp.'); } catch { setAviso('No se pudo crear el PDF. Inténtalo de nuevo.'); }
    setPdfOcupado(false);
  };
  useEffect(() => { leerEsquemas().then(setEsq).catch(() => {}); }, []);

  useEffect(() => {
    (async () => {
      try {
        const [ps, os] = await Promise.all([listarPacientes(), listarPropietarios()]);
        const x = ps.find((p) => p.id === id) ?? null;
        setM(x);
        if (!x) return;
        setDueño(os.find((o) => o.id === x.propietario_id) ?? null);
        setHermanos(ps.filter((p) => p.propietario_id === x.propietario_id && p.id !== x.id));
        setRegs(await registrosDe([x.id]));
      } catch (e) { setError((e as Error).message); setM(null); }
    })();
  }, [id]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3000); return () => window.clearTimeout(t); }, [aviso]);

  const cuentas = useMemo(() => { const c: Record<string, number> = {}; regs?.forEach((r) => { c[r.tipo] = (c[r.tipo] ?? 0) + 1; }); return c; }, [regs]);
  const visibles = useMemo(() => {
    const t = norm(q.trim());
    return (regs ?? []).filter((r) => (tab === 'todo' || r.tipo === tab) && (!t || norm(`${r.titulo} ${r.resumen ?? ''} ${Object.values(r.datos).join(' ')}`).includes(t)));
  }, [regs, tab, q]);

  return (
    <Shell activo="pacientes">
      {(yo) => {
        if (m === undefined) return <p className="vacio">Cargando la ficha…</p>;
        if (m === null) return (
          <div className="gcard vacio-c"><b>No encontramos este paciente</b>{error && <span>{error}</span>}<a className="gbtn" href={link('/gestor/pacientes')}>Ir a Pacientes</a></div>
        );
        const tipos = PUEDE[yo.rol];
        return (
          <div className="ficha">
            <nav className="miga" aria-label="Estás en"><a href={link('/gestor/pacientes')}>Pacientes</a><span className="ms" aria-hidden="true">chevron_right</span><span aria-current="page">{m.nombre}</span>{DEMO && <span className="ex">Datos de ejemplo</span>}</nav>

            {/* ---------- CABECERA ---------- */}
            <section className="gcard fhead" aria-labelledby="pn">
              <Avatar txt={m.nombre[0]} foto={m.foto} grande />
              <div className="fhead__txt">
                <h1 id="pn">{m.nombre}{!m.activo && <span className="chip">Inactivo</span>}</h1>
                <div className="fhead__chips">
                  <span className={'chip ' + (vieneASpa(m) ? 'spa' : 'lav')}><span className="ms" aria-hidden="true">{servicioDe(m) === 'consulta' ? 'stethoscope' : 'shower'}</span>{SERVICIOS.find(([k]) => k === servicioDe(m))![1]}</span>
                  <span className="chip lav">{ESPECIES[m.especie]}{m.raza ? ` · ${m.raza}` : ''}</span>
                  <span className="chip lav">{sexoTxt(m)}</span>
                  {edad(m) && <span className="chip lav">{edad(m)}</span>}
                  {m.peso != null && <span className="chip lav">{kg(m.peso)}</span>}
                  {m.alergias && <span className="chip alerta"><span className="ms" aria-hidden="true">warning</span>Alérgico/a a: {m.alergias}</span>}
                </div>
              </div>
              <div className="fhead__acts">
                <a className="gbtn out" href={link('/gestor/agenda') + `?paciente=${m.id}`}><span className="ms" aria-hidden="true">event</span>Agendar cita</a>
                <button className="gbtn out" type="button" onClick={() => { setNuevo('examen'); setMenu(false); setTab('todo'); setTimeout(() => histRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}><span className="ms" aria-hidden="true">upload_file</span>Subir examen</button>
                <button className="gbtn out" type="button" onClick={() => { setTab('carnet'); histRef.current?.scrollIntoView({ behavior: 'smooth' }); }}><span className="ms" aria-hidden="true">badge</span>Carnet</button>
                {(() => {
                  // la visita más reciente: todo lo registrado ese día (sin notas internas ni lo marcado «solo equipo»)
                  const para = (regs ?? []).filter((r) => r.tipo !== 'nota' && !r.privado);
                  const dia = para.map((r) => r.fecha.slice(0, 10)).sort().pop();
                  if (!dia) return null;
                  const deEseDia = para.filter((r) => r.fecha.slice(0, 10) === dia);
                  const etiqueta = dia === new Date().toISOString().slice(0, 10) ? 'de hoy' : 'del ' + fechaC(dia + 'T12:00:00');
                  return <button className="gbtn out" type="button" disabled={pdfOcupado} onClick={() => bajar(<AtencionDoc p={m} tutor={tutorDe(dueño)} regs={deEseDia} />, nombreArchivo('visita', m.nombre, dia))}>
                    <span className="ms" aria-hidden="true">picture_as_pdf</span>PDF de la visita {etiqueta}</button>;
                })()}
                <div className="menu-w">
                  <button className="gbtn" type="button" aria-expanded={menu} onClick={() => setMenu((v) => !v)}><span className="ms" aria-hidden="true">add</span>Nuevo registro</button>
                  {menu && (
                    <div className="menu" role="menu">
                      {tipos.map((t) => (
                        <button key={t} type="button" role="menuitem" onClick={() => { setNuevo(t); setMenu(false); setTab('todo'); setTimeout(() => histRef.current?.scrollIntoView({ behavior: 'smooth' }), 50); }}>
                          <span className="ms" aria-hidden="true">{TIPOS[t].icon}</span>{TIPOS[t].txt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </section>

            <div className="ficha__grid">
              {/* ---------- IZQUIERDA ---------- */}
              <div className="ficha__side">
                <section className="gcard" aria-labelledby="dp">
                  <h2 className="ch2" id="dp"><span className="ms" aria-hidden="true">pets</span>Datos del paciente
                    {!editando && <button className="link-add" type="button" onClick={() => setEditando(true)}>Editar</button>}</h2>
                  {editando
                    ? <EditarPaciente m={m} esAdmin={yo.rol === 'admin'} borrado={() => { location.href = dueño ? link('/gestor/propietarios') + `?id=${dueño.id}` : link('/gestor/pacientes'); }} listo={(x, msg) => { if (x) setM(x); setEditando(false); if (msg) setAviso(msg); }} />
                    : (
                      <dl className="kv">
                        <div><dt>Especie</dt><dd>{ESPECIES[m.especie]}</dd></div>
                        <div><dt>Raza</dt><dd>{m.raza ?? '—'}</dd></div>
                        <div><dt>Color</dt><dd>{m.color ?? '—'}</dd></div>
                        <div><dt>Sexo</dt><dd>{sexoTxt(m)}</dd></div>
                        <div><dt>Nacimiento</dt><dd>{m.nacimiento ? `${fechaC(m.nacimiento + 'T12:00:00')} · ${edad(m)}` : m.edad_aprox ? `Aprox. ${m.edad_aprox}` : '—'}</dd></div>
                        <div><dt>Microchip</dt><dd>{m.microchip ?? '—'}</dd></div>
                        <div className="full"><dt>Alimento</dt><dd>{[m.alimento, m.alimento_cant].filter(Boolean).join(' · ') || '—'}</dd></div>
                        <div><dt>Alergias</dt><dd className={m.alergias ? 'rojo' : ''}>{m.alergias ?? 'Ninguna conocida'}</dd></div>
                        <div><dt>Condiciones crónicas</dt><dd>{m.cronicas ?? '—'}</dd></div>
                        {m.extras.filter(([k]) => k).map(([k, v]) => <div className="full" key={k}><dt>{k}</dt><dd>{v || '—'}</dd></div>)}
                      </dl>
                    )}
                </section>

                {vieneASpa(m) && <SpaCard m={m} regs={regs ?? []} editar={yo.rol === 'peluqueria' ? undefined : () => setEditando(true)} />}

                <Peso regs={regs ?? []} actual={m.peso} />

                {dueño && (
                  <section className="gcard" aria-labelledby="pr">
                    <h2 className="ch2" id="pr"><span className="ms" aria-hidden="true">person</span>Propietario/a</h2>
                    <div className="own"><b>{nombreCompleto(dueño)}</b><span>{prettyCel(dueño.celular)}{dueño.correo ? ` · ${dueño.correo}` : ''}</span>
                      {(dueño.direccion || dueño.barrio) && <span>{[dueño.direccion, dueño.barrio, dueño.ciudad].filter(Boolean).join(' · ')}</span>}</div>
                    {hermanos.length > 0 && <div className="own__pets"><span>Otras mascotas:</span>{hermanos.map((h) => <a key={h.id} className="chip lav" href={link('/gestor/paciente') + `?id=${h.id}`}>{h.nombre}{h.raza ? ` · ${h.raza}` : ''}</a>)}</div>}
                    <div className="dacts">
                      <a className="gbtn wa sm" href={waLink(dueño.celular, `Hola, ${dueño.nombre}. Te escribimos de Alma Animal sobre ${m.nombre}.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>WhatsApp</a>
                      <a className="gbtn out sm" href={link('/gestor/propietarios') + `?id=${dueño.id}`}><span className="ms" aria-hidden="true">person</span>Ver propietario</a>
                    </div>
                  </section>
                )}
              </div>

              {/* ---------- HISTORIA CLÍNICA ---------- */}
              <section className="gcard hist" aria-labelledby="hc" ref={histRef}>
                <div className="hist__head">
                  <h2 className="ch2" id="hc"><span className="ms" aria-hidden="true">history_edu</span>Historia clínica</h2>
                  <label className="gsearch sm"><span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar en la historia</span>
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar. Ej: otitis, hemograma" /></label>
                </div>
                <div className="tabs" role="tablist" aria-label="Tipo de registro">
                  <button type="button" role="tab" aria-selected={tab === 'todo'} onClick={() => setTab('todo')}>Todo<span>{regs?.length ?? 0}</span></button>
                  <button type="button" role="tab" aria-selected={tab === 'carnet'} onClick={() => setTab('carnet')}><span className="ms" aria-hidden="true">badge</span>Carnet</button>
                  {(Object.keys(TIPOS) as TipoRegistro[]).filter((t) => cuentas[t]).map((t) => (
                    <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}><span className="ms" aria-hidden="true">{TIPOS[t].icon}</span>{TIPOS[t].txt}<span>{cuentas[t]}</span></button>
                  ))}
                </div>

                {nuevo && <NuevoRegistro tipo={nuevo} m={m} esq={esq} autor={yo.nombre} cerrar={() => setNuevo(null)}
                  guardado={(rs) => { setRegs((l) => [...rs, ...(l ?? [])].sort((a, b) => b.fecha.localeCompare(a.fecha))); const p = rs.find((r) => r.datos.peso); if (p) setM((x) => x && ({ ...x, peso: Number(p.datos.peso.replace(',', '.')) })); setNuevo(null); setAviso('Registro guardado en la historia'); }} />}

                {tab === 'carnet'
                  ? <Carnet m={m} regs={regs ?? []} dueño={dueño} ocupado={pdfOcupado} bajar={bajar} />
                  : (
                    <ol className="tl">
                      {regs === null && <li className="vacio">Cargando la historia…</li>}
                      {regs && !visibles.length && <li className="tl__vacio"><span className="ms" aria-hidden="true">inventory</span><b>{q ? 'Nada coincide con la búsqueda' : `${m.nombre} aún no tiene registros${tab !== 'todo' ? ' de este tipo' : ''}`}</b><span>Agrégalo con «Nuevo registro» y quedará en su historia.</span></li>}
                      {visibles.map((r) => <Entrada key={r.id} r={r} puedeBorrar={yo.rol === 'admin'} pdf={r.tipo === 'nota' ? undefined : () => bajar(<AtencionDoc p={m} tutor={tutorDe(dueño)} regs={[r]} />, nombreArchivo(TIPOS[r.tipo].txt, m.nombre, r.fecha.slice(0, 10)))} borrar={async () => {
                        if (!confirm(`¿Borrar «${r.titulo}» de la historia de ${m.nombre}? No se puede deshacer.`)) return;
                        try { await borrarRegistro(r.id); setRegs((l) => l!.filter((x) => x.id !== r.id)); setAviso('Registro borrado'); } catch (e) { setAviso((e as Error).message); }
                      }} />)}
                    </ol>
                  )}
              </section>
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}

/* ---------- editar datos ---------- */
function EditarPaciente({ m, listo, esAdmin, borrado }: { m: TPaciente; listo: (m: TPaciente | null, msg?: string) => void; esAdmin: boolean; borrado: () => void }) {
  const [v, setV] = useState<NuevoPaciente>(m);
  const [err, setErr] = useState<Record<string, string>>({});
  const [falla, setFalla] = useState('');
  const [borrando, setBorrando] = useState(false);
  const borrar = async () => {
    if (!confirm(`¿Borrar a ${m.nombre} con toda su historia clínica y sus archivos? No se puede deshacer.\n\nSi solo falleció o ya no viene, mejor marca «Ya no es paciente».`)) return;
    setBorrando(true);
    try { await borrarPaciente(m.id); borrado(); } catch (e) { setFalla((e as Error).message); setBorrando(false); }
  };
  const guardar = async () => {
    const e = erroresPaciente(v); setErr(e);
    if (Object.keys(e).length) return;
    try {
      const { propietario_id, nombre, especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip, alimento, alimento_cant, alergias, cronicas, extras, foto, activo } = v;
      listo(await actualizarPaciente(m.id, { propietario_id, nombre: nombre.trim(), especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip, alimento, alimento_cant, alergias, cronicas, extras: extras.filter(([k]) => k.trim()), foto, activo, servicio: servicioDe(v), spa: spaLimpio(v) }), 'Datos guardados');
    } catch (e) { setFalla((e as Error).message); }
  };
  return (
    <div className="edit-p">
      <PacienteForm v={v} set={(c) => setV((x) => ({ ...x, ...c }))} errores={err} idp="ep" />
      <label className="chk-l"><input type="checkbox" checked={!v.activo} onChange={(e) => setV((x) => ({ ...x, activo: !e.target.checked }))} />Ya no es paciente (falleció o se fue)</label>
      {falla && <p className="gerr" role="alert">{falla}</p>}
      <div className="dacts"><button className="gbtn" type="button" onClick={guardar}><span className="ms" aria-hidden="true">check</span>Guardar</button><button className="gbtn out" type="button" onClick={() => listo(null)}>Cancelar</button>
        {esAdmin && <button className="gbtn ghost" type="button" disabled={borrando} onClick={borrar}><span className="ms" aria-hidden="true">delete</span>{borrando ? 'Borrando…' : 'Borrar mascota'}</button>}</div>
    </div>
  );
}

/* ---------- spa: cómo se le hace y qué cuchilla se usó la última vez ---------- */
function SpaCard({ m, regs, editar }: { m: TPaciente; regs: Registro[]; editar?: () => void }) {
  const spa = m.spa ?? {};
  const ultimo = regs.filter((r) => r.tipo === 'spa').sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
  return (
    <section className="gcard" aria-labelledby="sp">
      <h2 className="ch2" id="sp"><span className="ms" aria-hidden="true">shower</span>Spa
        {editar && <button className="link-add" type="button" onClick={editar}>Editar</button>}</h2>
      <dl className="kv">
        <div className="full"><dt>Guía de cuchilla</dt><dd>{spa.cuchilla || '—'}</dd></div>
        <div className="full"><dt>Tipo de corte</dt><dd>{spa.corte || '—'}</dd></div>
        {spa.obs && <div className="full"><dt>Observaciones</dt><dd>{spa.obs}</dd></div>}
        {ultimo && <div className="full"><dt>Último spa</dt><dd>{fechaC(ultimo.fecha)} · {ultimo.titulo}{ultimo.datos.cuchilla ? ` · cuchilla ${ultimo.datos.cuchilla}` : ''}</dd></div>}
      </dl>
    </section>
  );
}

/* ---------- peso ---------- */
function Peso({ regs, actual }: { regs: Registro[]; actual: number | null }) {
  const puntos = regs.filter((r) => r.datos.peso).map((r) => ({ f: r.fecha, v: Number(String(r.datos.peso).replace(',', '.')) })).filter((p) => p.v > 0).sort((a, b) => a.f.localeCompare(b.f));
  const W = 320, H = 110, P = 14;
  const min = Math.min(...puntos.map((p) => p.v)), max = Math.max(...puntos.map((p) => p.v));
  const x = (i: number) => P + (puntos.length < 2 ? (W - 2 * P) / 2 : (i * (W - 2 * P)) / (puntos.length - 1));
  const y = (v: number) => (max === min ? H / 2 : H - P - ((v - min) * (H - 2 * P)) / (max - min));
  return (
    <section className="gcard" aria-labelledby="pw">
      <h2 className="ch2" id="pw"><span className="ms" aria-hidden="true">monitor_weight</span>Peso<b className="ch2__val">{actual != null ? kg(actual) : '—'}</b></h2>
      {puntos.length ? (
        <svg className="peso" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label={`Peso: ${puntos.map((p) => `${fechaC(p.f)} ${kg(p.v)}`).join(', ')}`}>
          <polyline points={puntos.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinejoin="round" />
          {puntos.map((p, i) => (
            <g key={i}><circle cx={x(i)} cy={y(p.v)} r="4.5" fill="#fff" stroke="var(--primary)" strokeWidth="2.5" />
              {(i === 0 || i === puntos.length - 1 || p.v === max || p.v === min) && <text x={x(i)} y={y(p.v) - 9} textAnchor="middle">{String(p.v).replace('.', ',')}</text>}
              {(i === 0 || i === puntos.length - 1) && <text className="peso__f" x={x(i)} y={H + 14} textAnchor="middle">{mesCorto(p.f)}</text>}
            </g>
          ))}
        </svg>
      ) : <p className="hint">Todavía no hay pesos registrados.</p>}
      <span className="hint">Se registra en cada consulta, en cada baño y en los controles de peso.</span>
    </section>
  );
}

/* ---------- una entrada de la historia ---------- */
function Entrada({ r, puedeBorrar, borrar, pdf }: { r: Registro; puedeBorrar: boolean; borrar: () => void; pdf?: () => void }) {
  const [privado, setPrivado] = useState(!!r.privado);
  const alternar = async () => { const n = !privado; setPrivado(n); try { await cambiarPrivado(r.id, n); } catch { setPrivado(!n); } };
  const filas = Object.entries(r.datos).filter(([k, v]) => v && ETIQ[k]);
  const meds = r.tipo === 'formula' ? medicamentosDe(r) : [];
  const abrir = async (a: Archivo) => { const u = await abrirArchivo(a); if (u) window.open(u, '_blank', 'noopener'); };
  return (
    <li className="tl__item">
      <span className="tl__fecha">{fechaC(r.fecha)}</span>
      <span className="tl__dot" aria-hidden="true"><span className="ms">{TIPOS[r.tipo].icon}</span></span>
      <article className="tl__card">
        <div className="tl__top">
          <span className="tl__kind">{TIPOS[r.tipo].txt}{r.externo ? ' · aplicada en otra veterinaria' : ''}</span>
          <b>{r.titulo}</b>
          {r.por_nombre && <span className="hint">{r.por_nombre}</span>}
          {pdf && <button type="button" className="tl__pdf" onClick={pdf} title="Descargar en PDF para mandárselo al cliente"><span className="ms" aria-hidden="true">picture_as_pdf</span>PDF</button>}
          {puedeBorrar && <button type="button" className="vrow__x tl__x" aria-label={`Borrar ${r.titulo}`} onClick={borrar}><span className="ms">delete</span></button>}
        </div>
        {meds.length > 0 && (
          <ul className="meds">
            {meds.map((x, i) => (
              <li key={i}><span className="meds__t"><b>{x.nombre}</b><span>{[x.presentacion, x.cantidad, x.lote && `lote ${x.lote}`].filter(Boolean).join(' · ')}</span></span>
                {x.indicacion && <span className="meds__i">{x.indicacion}</span>}</li>
            ))}
          </ul>
        )}
        {r.resumen && <p>{meds.length > 0 && <b>Observaciones: </b>}{r.resumen}</p>}
        {filas.length > 0 && <dl className="tl__dl">{filas.map(([k, v]) => <div key={k}><dt>{ETIQ[k]}</dt><dd>{k === 'proxima' ? fechaC(v + 'T12:00:00') : v}</dd></div>)}</dl>}
        {r.archivos.length > 0 && <div className="tl__files">{r.archivos.map((a, i) => (
          <button key={i} type="button" className="chip lav" onClick={() => abrir(a)} disabled={!a.ruta}><span className="ms" aria-hidden="true">{a.tipo.includes('pdf') ? 'picture_as_pdf' : 'image'}</span>{a.nombre}</button>
        ))}</div>}
        {r.tipo !== 'nota' && <button type="button" className="tl__vis" data-priv={privado || undefined} onClick={alternar} title="Toca para cambiar">
          <span className="ms" aria-hidden="true">{privado ? 'visibility_off' : 'visibility'}</span>{privado ? 'Solo el equipo · no sale en el portal' : 'El dueño lo ve en su portal'}</button>}
      </article>
    </li>
  );
}

/* ---------- carnet (el mismo que ve el cliente en su portal) ---------- */
function Carnet({ m, regs, dueño, ocupado, bajar }: { m: TPaciente; regs: Registro[]; dueño: Propietario | null; ocupado: boolean; bajar: (d: React.ReactElement, n: string) => void }) {
  const doc = <CarnetDoc p={m} tutor={tutorDe(dueño)} regs={regs} />;
  return (
    <div className="carnet-g">
      <div className="doc-acts">
        <button className="gbtn sm" type="button" disabled={ocupado} onClick={() => bajar(doc, nombreArchivo('carnet', m.nombre))}><span className="ms" aria-hidden="true">picture_as_pdf</span>Descargar PDF</button>
        {dueño && <a className="gbtn wa sm" href={waLink(dueño.celular, `Hola, ${dueño.nombre} 🐾 Te comparto el carnet de vacunación de ${m.nombre}. También lo ves siempre actualizado en tu portal de Alma Animal.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Abrir WhatsApp de {dueño.nombre}</a>}
      </div>
      <p className="hint">Así lo ve {dueño ? dueño.nombre : 'el propietario'} en su portal. Descarga el PDF y adjúntalo en el chat.</p>
      {doc}
    </div>
  );
}

/* ---------- nuevo registro ---------- */
interface Campo { k: string; label: string; tipo?: 'text' | 'area' | 'date' | 'num' | 'select'; opts?: string[]; req?: boolean; ph?: string; dato?: boolean }
const CAMPOS = (t: TipoRegistro, m: TPaciente): Campo[] => {
  switch (t) {
    case 'consulta': return [
      { k: 'motivo', label: 'Motivo de consulta', req: true, ph: 'Ej: Se rasca la oreja hace 4 días', dato: true },
      { k: 'resumen', label: 'Anamnesis y examen físico', tipo: 'area', ph: 'Lo que cuenta el propietario y lo que encuentras al examinar.' },
      { k: 'temperatura', label: 'Temperatura (°C)', tipo: 'num', ph: 'Ej: 38,6', dato: true }, { k: 'fc', label: 'Frecuencia cardiaca', tipo: 'num', ph: 'Ej: 110', dato: true },
      { k: 'fr', label: 'Frecuencia respiratoria', tipo: 'num', ph: 'Ej: 24', dato: true }, { k: 'peso', label: 'Peso (kg)', tipo: 'num', ph: 'Ej: 8,4', dato: true },
      { k: 'diagnostico', label: 'Diagnóstico', ph: 'Ej: Otitis externa', dato: true }, { k: 'tratamiento', label: 'Tratamiento', tipo: 'area', ph: 'Ej: Gotas óticas cada 12 horas por 7 días', dato: true }
    ];
    case 'vacuna': return [
      { k: 'titulo', label: 'Vacuna', tipo: 'select', opts: [...VACUNAS[m.especie], 'Otra'], req: true },
      { k: 'laboratorio', label: 'Laboratorio', ph: 'Ej: Virbac', dato: true }, { k: 'lote', label: 'Lote', ph: 'Ej: 9W6P', dato: true },
      { k: 'vence', label: 'Vencimiento del lote', ph: 'Mes/año. Ej: 05/2027', dato: true }, { k: 'peso', label: 'Peso hoy (kg)', tipo: 'num', ph: 'Ej: 0,5', dato: true },
      { k: 'proxima_que', label: 'Próxima: qué le toca', ph: 'Ej: Refuerzo de triple felina', dato: true }, { k: 'proxima', label: 'Próxima: fecha', tipo: 'date', dato: true },
      { k: 'obs', label: 'Observaciones para el carnet', tipo: 'area', ph: 'Ej: Considerar test de sida y leucemia felina.', dato: true }
    ];
    case 'desparasitacion': return [
      { k: 'titulo', label: 'Tipo', tipo: 'select', opts: DESPARASITACIONES, req: true },
      { k: 'producto', label: 'Producto', ph: 'Ej: Antiparasitario de amplio espectro', dato: true }, { k: 'lote', label: 'Lote', ph: 'Opcional', dato: true },
      { k: 'vence', label: 'Vencimiento del lote', ph: 'Mes/año. Ej: 11/2027', dato: true }, { k: 'proxima', label: 'Próxima dosis', tipo: 'date', dato: true },
      { k: 'obs', label: 'Observaciones para el carnet', tipo: 'area', ph: 'Opcional', dato: true }
    ];
    case 'peso': return [{ k: 'peso', label: 'Peso (kg)', tipo: 'num', req: true, ph: 'Ej: 8,4', dato: true }, { k: 'resumen', label: 'Nota', tipo: 'area', ph: 'Opcional' }];
    case 'spa': return [
      { k: 'titulo', label: 'Servicio', req: true, ph: 'Ej: Baño completo y corte' }, { k: 'cuchilla', label: 'Guía de cuchilla', ph: 'Ej: N.º 7F', dato: true },
      { k: 'peso', label: 'Peso (kg)', tipo: 'num', ph: 'Ej: 8,4', dato: true }, { k: 'resumen', label: 'Observaciones', tipo: 'area', ph: 'Ej: Piel un poco seca detrás de las orejas.' }
    ];
    // los medicamentos van en su propia lista (ver Medicamentos)
    case 'formula': return [{ k: 'resumen', label: 'Observaciones generales', tipo: 'area', ph: 'Ej: Control en una semana. Si deja de comer o empeora, escríbenos.' }];
    case 'examen': return [{ k: 'titulo', label: 'Examen', req: true, ph: 'Ej: Hemograma, química sanguínea' }, { k: 'resumen', label: 'Resultados', tipo: 'area', ph: 'Lo más importante del resultado.' }];
    case 'imagen': return [{ k: 'titulo', label: 'Estudio', req: true, ph: 'Ej: Radiografía de cadera' }, { k: 'resumen', label: 'Hallazgos', tipo: 'area' }];
    case 'hospitalizacion': return [{ k: 'titulo', label: 'Motivo', req: true, ph: 'Ej: Gastroenteritis' }, { k: 'resumen', label: 'Evolución', tipo: 'area' }];
    case 'nota': return [{ k: 'titulo', label: 'Título', req: true, ph: 'Ej: Llamada de seguimiento' }, { k: 'resumen', label: 'Nota', tipo: 'area', req: true }];
    default: return [{ k: 'titulo', label: t === 'cirugia' ? 'Cirugía' : 'Procedimiento', req: true, ph: t === 'cirugia' ? 'Ej: Esterilización' : 'Ej: Limpieza dental' }, { k: 'resumen', label: 'Descripción', tipo: 'area' }];
  }
};
const CON_ARCHIVOS: TipoRegistro[] = ['examen', 'imagen', 'cirugia', 'procedimiento', 'formula', 'hospitalizacion', 'consulta'];

function NuevoRegistro({ tipo, m, esq, autor, cerrar, guardado }: { tipo: TipoRegistro; m: TPaciente; esq: Esquemas; autor: string; cerrar: () => void; guardado: (r: Registro[]) => void }) {
  const campos = CAMPOS(tipo, m);
  const [v, setV] = useState<Record<string, string>>(() => ({
    fecha: hoyISO(),
    ...(tipo === 'vacuna' ? { titulo: VACUNAS[m.especie][0], proxima: enDias(esq[VACUNAS[m.especie][0]] ?? 365) } : {}),
    ...(tipo === 'desparasitacion' ? { titulo: DESPARASITACIONES[0], proxima: enDias(esq[DESPARASITACIONES[0]] ?? 90) } : {}),
    ...(tipo === 'spa' ? { titulo: 'Baño completo', cuchilla: m.spa?.cuchilla ?? '' } : {})
  }));
  const [meds, setMeds] = useState<Medicamento[]>([medVacio()]);
  const [otra, setOtra] = useState('');
  const [externo, setExterno] = useState(false);
  const [archivos, setArchivos] = useState<File[]>([]);
  const [privado, setPrivado] = useState(false);
  const [err, setErr] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const guardar = async () => {
    const falta = campos.find((c) => c.req && !(c.k === 'titulo' && v.titulo === 'Otra' ? otra.trim() : (v[c.k] ?? '').trim()));
    const lista = meds.map((x) => ({ nombre: x.nombre.trim(), presentacion: x.presentacion, cantidad: x.cantidad.trim(), indicacion: x.indicacion.trim() }));
    if (tipo === 'formula') {
      if (!lista.some((x) => x.nombre)) { setErr('Falta: el nombre de al menos un medicamento.'); return; }
      const n = lista.findIndex((x) => !x.nombre && (x.cantidad || x.indicacion));
      if (n >= 0) { setErr(`Al medicamento ${n + 1} le falta el nombre. Escríbelo o quita esa fila.`); return; }
      const s = lista.findIndex((x) => x.nombre && !x.indicacion);
      if (s >= 0) { setErr(`Falta la indicación de ${lista[s].nombre}: cómo y para qué se le da.`); return; }
    }
    if (falta) { setErr(`Falta: ${falta.label.toLowerCase()}.`); return; }
    if (v.peso && !/^\d+([.,]\d+)?$/.test(v.peso.trim())) { setErr('Escribe el peso solo con números. Ej: 8,4'); return; }
    setErr(''); setOcupado(true);
    try {
      const subidos = [];
      for (const f of archivos) subidos.push(await subirArchivo(f, `pacientes/${m.id}`));
      const datos: Record<string, string> = Object.fromEntries(campos.filter((c) => c.dato && v[c.k]?.trim()).map((c) => [c.k, v[c.k].trim()]));
      const recetados = lista.filter((x) => x.nombre);
      if (tipo === 'formula') datos.medicamentos = JSON.stringify(recetados);
      const titulo = tipo === 'formula' ? recetados.map((x) => x.nombre).join(', ')
        : (v.titulo === 'Otra' ? otra : v.titulo) || (tipo === 'consulta' ? (v.diagnostico || v.motivo) : TIPOS[tipo].txt);
      const rs = await crearRegistros([{
        paciente_id: m.id, tipo, fecha: new Date(v.fecha).toISOString(), titulo: titulo.trim().slice(0, 120), resumen: v.resumen?.trim() || null,
        datos, archivos: subidos, externo, por_nombre: externo ? null : autor, ...(privado ? { privado: true } : {})
      }]);
      guardado(rs);
    } catch (e) { setErr((e as Error).message); }
    setOcupado(false);
  };

  return (
    <div className="nreg" role="group" aria-labelledby="nreg-t">
      <div className="nreg__head"><span className="ms" aria-hidden="true">{TIPOS[tipo].icon}</span><b id="nreg-t">Nuevo registro: {TIPOS[tipo].txt.toLowerCase()}</b>
        <button type="button" className="vrow__x" aria-label="Cerrar" onClick={cerrar}><span className="ms">close</span></button></div>
      <div className="grid2g">
        <div className="fld"><label htmlFor="nr-fecha">Fecha y hora</label><input id="nr-fecha" type="datetime-local" value={v.fecha} max={hoyISO()} onChange={(e) => setV((x) => ({ ...x, fecha: e.target.value }))} /></div>
        {tipo === 'formula' && <Medicamentos meds={meds} setMeds={setMeds} />}
        {campos.map((c) => (
          <div key={c.k} className={'fld' + (c.tipo === 'area' ? ' full' : '')}>
            <label htmlFor={`nr-${c.k}`}>{c.label}{c.req && <span className="req"> *</span>}</label>
            {c.tipo === 'area' ? <textarea id={`nr-${c.k}`} value={v[c.k] ?? ''} placeholder={c.ph} onChange={(e) => setV((x) => ({ ...x, [c.k]: e.target.value }))} />
              : c.tipo === 'select' ? <select id={`nr-${c.k}`} value={v[c.k] ?? ''} onChange={(e) => { const t = e.target.value; setV((x) => ({ ...x, [c.k]: t, ...(c.k === 'titulo' && esq[t] ? { proxima: new Date(new Date(x.fecha).getTime() + esq[t] * 86400000).toISOString().slice(0, 10) } : {}) })); }}>{c.opts!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input id={`nr-${c.k}`} type={c.tipo === 'date' ? 'date' : 'text'} inputMode={c.tipo === 'num' ? 'decimal' : undefined} value={v[c.k] ?? ''} placeholder={c.ph} onChange={(e) => setV((x) => ({ ...x, [c.k]: e.target.value }))} />}
            {c.k === 'titulo' && v.titulo === 'Otra' && <input aria-label="¿Cuál?" value={otra} placeholder="¿Cuál?" onChange={(e) => setOtra(e.target.value)} />}
          </div>
        ))}
      </div>
      {(tipo === 'vacuna' || tipo === 'desparasitacion') && <label className="chk-l"><input type="checkbox" checked={externo} onChange={(e) => setExterno(e.target.checked)} />Se la aplicaron en otra veterinaria</label>}
      {CON_ARCHIVOS.includes(tipo) && <Adjuntos archivos={archivos} setArchivos={setArchivos} />}
      {tipo !== 'nota' && (
        <label className="chk-l"><input type="checkbox" checked={!privado} onChange={(e) => setPrivado(!e.target.checked)} />El dueño lo puede ver en su portal{privado && <span className="hint"> · quedará solo para el equipo</span>}</label>
      )}
      {err && <p className="gerr" role="alert">{err}</p>}
      <div className="dacts"><button className="gbtn" type="button" onClick={guardar} disabled={ocupado}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : 'Guardar en la historia'}</button><button className="gbtn out" type="button" onClick={cerrar}>Cancelar</button></div>
    </div>
  );
}

/* ---------- fórmula médica: un bloque por medicamento ---------- */
const medVacio = (): Medicamento => ({ nombre: '', presentacion: PRESENTACIONES[0], cantidad: '', indicacion: '' });
function Medicamentos({ meds, setMeds }: { meds: Medicamento[]; setMeds: (f: (l: Medicamento[]) => Medicamento[]) => void }) {
  const cambiar = (i: number, c: Partial<Medicamento>) => setMeds((l) => l.map((x, j) => (j === i ? { ...x, ...c } : x)));
  return (
    <div className="fld full medf" role="group" aria-labelledby="medf-t">
      <span className="fld__lb" id="medf-t">Medicamentos <span className="req">*</span></span>
      {meds.map((x, i) => (
        <div className="medf__card" key={i}>
          <div className="medf__top"><b>Medicamento {i + 1}</b>
            <button type="button" className="vrow__x" aria-label={`Quitar medicamento ${i + 1}`} disabled={meds.length === 1} onClick={() => setMeds((l) => l.filter((_, j) => j !== i))}><span className="ms">close</span></button></div>
          <div className="medf__row">
            <div className="fld"><label htmlFor={`med-${i}-n`}>Nombre</label><input id={`med-${i}-n`} value={x.nombre} placeholder="Ej: Meloxicam 1 mg" onChange={(e) => cambiar(i, { nombre: e.target.value })} /></div>
            <div className="fld"><label htmlFor={`med-${i}-p`}>Presentación</label>
              <select id={`med-${i}-p`} value={x.presentacion} onChange={(e) => cambiar(i, { presentacion: e.target.value })}>{PRESENTACIONES.map((o) => <option key={o}>{o}</option>)}</select></div>
            <div className="fld"><label htmlFor={`med-${i}-c`}>Cantidad por dosis</label><input id={`med-${i}-c`} value={x.cantidad} placeholder={cantidadEj(x.presentacion)} onChange={(e) => cambiar(i, { cantidad: e.target.value })} /></div>
          </div>
          <div className="fld"><label htmlFor={`med-${i}-i`}>Indicación o uso <span className="req">*</span></label>
            <textarea id={`med-${i}-i`} rows={2} value={x.indicacion} placeholder="Ej: Cada 12 horas por 7 días, con comida. Para el dolor." onChange={(e) => cambiar(i, { indicacion: e.target.value })} /></div>
        </div>
      ))}
      <button className="link-add" type="button" onClick={() => setMeds((l) => [...l, medVacio()])}><span className="ms" aria-hidden="true">add</span>Agregar otro medicamento</button>
    </div>
  );
}

/* ---------- adjuntos: elegir, tomar foto, arrastrar y vista previa ---------- */
function Adjuntos({ archivos, setArchivos }: { archivos: File[]; setArchivos: (f: File[]) => void }) {
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState('');
  const [vistas, setVistas] = useState<string[]>([]);
  useEffect(() => {
    const urls = archivos.map((f) => (f.type.startsWith('image/') ? URL.createObjectURL(f) : ''));
    setVistas(urls);
    return () => urls.forEach((u) => u && URL.revokeObjectURL(u));
  }, [archivos]);
  const sumar = (lista: FileList | File[] | null) => {
    const nuevos = [...(lista ?? [])];
    const malos = nuevos.filter((f) => !(f.type.startsWith('image/') || f.type === 'application/pdf'));
    const grandes = nuevos.filter((f) => f.type === 'application/pdf' && f.size > 10 * 1024 * 1024);
    setError(malos.length ? 'Solo se pueden subir fotos o PDF.' : grandes.length ? `«${grandes[0].name}» pesa más de 10 MB.` : '');
    setArchivos([...archivos, ...nuevos.filter((f) => !malos.includes(f) && !grandes.includes(f))].slice(0, 12));
  };
  return (
    <div className="fld">
      <span className="fld__lb">Archivos <small>(fotos o PDF del resultado; quedan privados y las fotos se achican solas)</small></span>
      <div className={'adj' + (encima ? ' is-over' : '')}
        onDragOver={(e) => { e.preventDefault(); setEncima(true); }} onDragLeave={() => setEncima(false)}
        onDrop={(e) => { e.preventDefault(); setEncima(false); sumar(e.dataTransfer.files); }}>
        <span className="ms adj__ic" aria-hidden="true">cloud_upload</span>
        <span className="adj__t">Arrastra aquí los archivos o elige cómo subirlos</span>
        <span className="adj__b">
          <label className="gbtn out sm"><span className="ms" aria-hidden="true">attach_file</span>Elegir archivos
            <input type="file" multiple accept="image/*,application/pdf" className="sr-only" onChange={(e) => { sumar(e.target.files); e.target.value = ''; }} /></label>
          <label className="gbtn out sm adj__cam"><span className="ms" aria-hidden="true">photo_camera</span>Tomar foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { sumar(e.target.files); e.target.value = ''; }} /></label>
        </span>
      </div>
      {error && <p className="gerr" role="alert">{error}</p>}
      {archivos.length > 0 && (
        <ul className="adj__l">
          {archivos.map((f, i) => (
            <li key={i}>
              {vistas[i] ? <img src={vistas[i]} alt="" /> : <span className="ms" aria-hidden="true">picture_as_pdf</span>}
              <span title={f.name}>{f.name}</span>
              <button type="button" className="vrow__x" aria-label={`Quitar ${f.name}`} onClick={() => setArchivos(archivos.filter((_, k) => k !== i))}><span className="ms">close</span></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
