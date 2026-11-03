// Módulo Propietarios: lista con búsqueda y ficha de cada propietario (mascotas, contacto, autorización de
// datos, portal, compras en la tienda unidas por el celular y actividad reciente de sus mascotas).
import { useCallback, useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, money, when, waLink, prettyCel, fechaCorta } from './lib';
import { ESTADOS } from './pedidos-datos';
import {
  listarPropietarios, listarPacientes, registrosDe, comprasDe, actualizarPropietario, nombreCompleto, iniciales, edad, ESPECIES, TIPOS,
  type Propietario, type Paciente, type Registro, type Compra, type NuevoPropietario
} from './clinica-datos';
import { PropietarioForm, Avatar, erroresPropietario } from './clinica-ui';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const fecha = fechaCorta;
const PORTAL = { sin_invitar: ['Sin invitar', '#F2ECF2', '#584E6E'], por_invitar: ['Invitación pendiente', '#FFDDB2', '#624000'], invitado: ['Invitado', '#EADDFF', '#4D3F6C'], activo: ['Activo', '#B8F1B9', '#1D5128'] } as const;

export default function Propietarios() {
  const [props, setProps] = useState<Propietario[] | null>(null);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'portal' | 'sincorreo'>('todos');
  const [sel, setSel] = useState<string | null>(() => new URLSearchParams(location.search).get('id'));
  const [verDetalle, setVerDetalle] = useState(() => !!new URLSearchParams(location.search).get('id'));
  const [aviso, setAviso] = useState('');

  const cargar = useCallback(async () => {
    try { const [a, b] = await Promise.all([listarPropietarios(), listarPacientes()]); setProps(a); setPacs(b); setError(''); }
    catch (e) { setError((e as Error).message); }
  }, []);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3000); return () => window.clearTimeout(t); }, [aviso]);

  const mascotasDe = useCallback((id: string) => pacs.filter((p) => p.propietario_id === id), [pacs]);
  const visibles = useMemo(() => {
    const t = norm(q.trim()), dig = q.replace(/\D/g, '');
    return (props ?? []).filter((p) => (filtro === 'todos' || (filtro === 'portal' ? p.portal === 'activo' : !p.correo))
      && (!t || norm(`${nombreCompleto(p)} ${p.doc_numero ?? ''} ${mascotasDe(p.id).map((m) => m.nombre).join(' ')}`).includes(t)
        || (dig.length >= 3 && (p.celular.replace(/\D/g, '').includes(dig) || (p.doc_numero ?? '').replace(/\D/g, '').includes(dig)))));
  }, [props, q, filtro, mascotasDe]);
  const actual = props?.find((p) => p.id === sel) ?? visibles[0] ?? null;

  return (
    <Shell activo="propietarios">
      {() => (
        <div className="md" data-vista={verDetalle ? 'detalle' : 'lista'}>
          <div className="mhead">
            <div className="mhead__txt">
              <h1>Propietarios</h1>
              <p>Cada propietario con sus mascotas, sus compras y su autorización de datos.</p>
            </div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <a className="gbtn" href={link('/gestor/registro')}><span className="ms" aria-hidden="true">person_add</span>Registrar paciente</a>
          </div>
          <div className="ped__tools md__tools">
            <label className="gsearch"><span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar propietario</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, celular, cédula o mascota. Ej: Gómez, 300 123 4567" />
            </label>
            <div className="filts" role="group" aria-label="Filtrar">
              {([['todos', 'Todos'], ['portal', 'Con portal activo'], ['sincorreo', 'Sin correo']] as const).map(([id, t]) => (
                <button key={id} type="button" className="filt" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t}</button>
              ))}
            </div>
          </div>
          {error && <p className="gerr" role="alert">{error}</p>}

          <div className="md__grid">
            <section className="gcard md__list" aria-label="Lista de propietarios">
              {props === null && <p className="vacio">Cargando propietarios…</p>}
              {props && !visibles.length && <p className="vacio">{props.length ? 'Nadie coincide con la búsqueda.' : 'Todavía no hay propietarios. Empieza con «Registrar paciente».'}</p>}
              {visibles.map((p) => {
                const ms = mascotasDe(p.id);
                return (
                  <button key={p.id} type="button" className="row orow" aria-pressed={actual?.id === p.id}
                    onClick={() => { setSel(p.id); setVerDetalle(true); history.replaceState(null, '', `?id=${p.id}`); window.scrollTo({ top: 0 }); }}>
                    <Avatar txt={iniciales(nombreCompleto(p))} />
                    <span className="row__txt">
                      <b>{nombreCompleto(p)}</b>
                      <span>{prettyCel(p.celular)}{p.ciudad ? ` · ${p.ciudad}` : ''}</span>
                      <span className="orow__pets">{ms.length ? ms.map((m) => <i key={m.id}>{m.nombre}</i>) : <em>Sin mascotas</em>}</span>
                    </span>
                    <span className="chip" style={{ background: PORTAL[p.portal][1], color: PORTAL[p.portal][2] }}>{PORTAL[p.portal][0]}</span>
                  </button>
                );
              })}
            </section>
            {actual && <Ficha key={actual.id} p={actual} mascotas={mascotasDe(actual.id)} volver={() => setVerDetalle(false)}
              cambiado={(n, msg) => { setProps((l) => l!.map((x) => (x.id === n.id ? n : x))); setAviso(msg); }} avisar={setAviso} />}
          </div>
          <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
        </div>
      )}
    </Shell>
  );
}

function Ficha({ p, mascotas, volver, cambiado, avisar }: { p: Propietario; mascotas: Paciente[]; volver: () => void; cambiado: (p: Propietario, msg: string) => void; avisar: (m: string) => void }) {
  const [editando, setEditando] = useState(false);
  const [v, setV] = useState<NuevoPropietario>(p);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [compras, setCompras] = useState<Compra[] | null>(null);
  const [actividad, setActividad] = useState<Registro[] | null>(null);
  useEffect(() => {
    comprasDe(p.celular).then(setCompras).catch(() => setCompras([]));
    registrosDe(mascotas.map((m) => m.id)).then((r) => setActividad(r.slice(0, 6))).catch(() => setActividad([]));
  }, [p.celular, mascotas]);

  const guardar = async () => {
    const e = erroresPropietario(v); setErrores(e);
    if (Object.keys(e).length) return;
    try {
      const { nombre, apellidos, doc_tipo, doc_numero, celular, correo, direccion, barrio, departamento, ciudad, fuente, notas } = v;
      const n = await actualizarPropietario(p.id, { nombre: nombre.trim(), apellidos: apellidos.trim(), doc_tipo, doc_numero, celular, correo, direccion, barrio, departamento, ciudad, fuente, notas });
      cambiado(n, 'Datos guardados'); setEditando(false);
    } catch (e) { avisar((e as Error).message); }
  };
  const invitar = async () => {
    if (!p.correo) { avisar('Primero agrega su correo.'); return; }
    const msg = `Hola, ${p.nombre} 🐾 Te escribimos de Alma Animal. Ya puedes ver el carnet, la historia y las citas de tus mascotas en tu portal: ${location.origin}/portal/ingresar
La primera vez toca «¿Primera vez o la olvidaste? Crea tu contraseña» y escribe tu correo ${p.correo}. Desde ahí también puedes agendar.`;
    window.open(waLink(p.celular, msg), '_blank', 'noopener');
    try { cambiado(await actualizarPropietario(p.id, { portal: p.portal === 'activo' ? 'activo' : 'invitado' }), 'Invitación abierta en WhatsApp'); }
    catch (e) { avisar((e as Error).message); }
  };
  const mascota = (m: Paciente) => [ESPECIES[m.especie], m.raza, edad(m)].filter(Boolean).join(' · ');
  const totalCompras = (compras ?? []).filter((c) => c.estado !== 'cancelado').reduce((s, c) => s + c.total, 0);

  return (
    <section className="gcard md__det" aria-labelledby="on">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Propietarios</button>
      <div className="dhead">
        <Avatar txt={iniciales(nombreCompleto(p))} grande />
        <div className="dhead__txt"><h2 id="on">{nombreCompleto(p)}</h2><span>Cliente desde {fecha(p.creado)}</span></div>
        {!editando && <button className="gbtn out sm" type="button" onClick={() => { setV(p); setEditando(true); }}><span className="ms" aria-hidden="true">edit</span>Editar</button>}
      </div>
      <div className="dacts">
        <a className="gbtn wa sm" href={waLink(p.celular, `Hola, ${p.nombre}. Te escribimos de Alma Animal.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>WhatsApp</a>
        <a className="gbtn out sm" href={link(`/gestor/registro`) + `?propietario=${p.id}`}><span className="ms" aria-hidden="true">add</span>Agregar mascota</a>
      </div>

      {editando ? (
        <div className="sec">
          <h3><span className="ms" aria-hidden="true">edit</span>Editar datos</h3>
          <PropietarioForm v={v} set={(c) => setV((x) => ({ ...x, ...c }))} errores={errores} idp="ed" />
          <div className="fld"><label htmlFor="ed-notas">Notas internas</label><textarea id="ed-notas" value={v.notas ?? ''} onChange={(e) => setV((x) => ({ ...x, notas: e.target.value || null }))} placeholder="Ej: Prefiere que le escriban en la tarde." /></div>
          <div className="dacts"><button className="gbtn" type="button" onClick={guardar}><span className="ms" aria-hidden="true">check</span>Guardar</button><button className="gbtn out" type="button" onClick={() => { setEditando(false); setErrores({}); }}>Cancelar</button></div>
        </div>
      ) : (
        <>
          <h3 className="dh3">Mascotas</h3>
          <div className="pets">
            {mascotas.map((m) => (
              <a key={m.id} className="pet" href={link('/gestor/paciente') + `?id=${m.id}`}>
                <Avatar txt={m.nombre[0]} foto={m.foto} />
                <span><b>{m.nombre}{!m.activo && ' · inactivo'}</b><span>{mascota(m)}</span></span>
                <span className="ms" aria-hidden="true">chevron_right</span>
              </a>
            ))}
            {!mascotas.length && <p className="hint">Todavía no tiene mascotas registradas.</p>}
          </div>

          <h3 className="dh3">Datos de contacto</h3>
          <dl className="kv">
            <div><dt>Documento</dt><dd>{p.doc_numero ? `${p.doc_tipo ?? ''} ${p.doc_numero}` : '—'}</dd></div>
            <div><dt>Celular</dt><dd>{prettyCel(p.celular)}</dd></div>
            <div className="full"><dt>Correo</dt><dd>{p.correo ?? '—'}</dd></div>
            <div className="full"><dt>Dirección</dt><dd>{[p.direccion, p.barrio].filter(Boolean).join(' · ') || '—'}</dd></div>
            <div><dt>Ciudad</dt><dd>{[p.ciudad, p.departamento].filter(Boolean).join(', ') || '—'}</dd></div>
            <div><dt>Nos conoció por</dt><dd>{p.fuente ?? '—'}</dd></div>
            {p.notas && <div className="full"><dt>Notas internas</dt><dd className="normal">{p.notas}</dd></div>}
          </dl>

          <div className="legal-b">
            <div><b>Tratamiento de datos</b><span className="chip ok"><span className="ms" aria-hidden="true">verified_user</span>Aceptado</span><span className="hint">{fecha(p.acepto_fecha)} · Ley 1581 de 2012</span></div>
            <div><b>Portal de clientes</b><span className="chip" style={{ background: PORTAL[p.portal][1], color: PORTAL[p.portal][2] }}>{PORTAL[p.portal][0]}</span>
              {p.portal !== 'activo' && <button className="link-add" type="button" onClick={invitar}>{p.portal === 'sin_invitar' ? 'Invitar al portal por WhatsApp' : 'Reenviar la invitación'}</button>}
              {p.portal === 'activo' && <span className="hint">Ya entra a su portal con su correo.</span>}
            </div>
          </div>

          <div className="dh3 dh3--row"><h3>Compras en la tienda</h3>{compras && compras.length > 0 && <span className="hint">{compras.length} {compras.length === 1 ? 'pedido' : 'pedidos'} · {money(totalCompras)}</span>}</div>
          <div className="buys">
            {compras === null && <p className="hint">Buscando pedidos con su celular…</p>}
            {compras?.map((c) => (
              <a key={c.id} className="buy-r" href={link('/gestor/pedidos')}>
                <b>#{c.numero}</b>
                <span>{when(c.creado)} · {c.items.map((i) => `${i.cantidad} × ${i.nombre}`).join(', ')}</span>
                <b>{money(c.total)}</b>
                <span className="chip" style={{ background: ESTADOS[c.estado as keyof typeof ESTADOS]?.bg, color: ESTADOS[c.estado as keyof typeof ESTADOS]?.fg }}>{ESTADOS[c.estado as keyof typeof ESTADOS]?.txt ?? c.estado}</span>
              </a>
            ))}
            {compras && !compras.length && <p className="hint">Aún no ha comprado en la tienda. Cuando compre con su celular, el pedido aparece aquí.</p>}
          </div>

          <h3 className="dh3">Actividad reciente</h3>
          <ol className="acts">
            {actividad?.map((r) => {
              const m = mascotas.find((x) => x.id === r.paciente_id);
              return <li key={r.id}><span className="acts__ic"><span className="ms" aria-hidden="true">{TIPOS[r.tipo].icon}</span></span><span>{m?.nombre}: {TIPOS[r.tipo].txt.toLowerCase()} · {r.titulo}</span><span className="hint">{fecha(r.fecha)}</span></li>;
            })}
            {actividad && !actividad.length && <li className="hint">Sin actividad todavía.</li>}
          </ol>
        </>
      )}
    </section>
  );
}
