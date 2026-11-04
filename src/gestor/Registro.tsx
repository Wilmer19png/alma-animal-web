// Registrar paciente en 3 pasos: propietario (existente o nuevo, con su autorización de datos),
// mascota (con vacunas y desparasitaciones que ya trae) y revisión. Al guardar se abre su ficha.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, go, prettyCel } from './lib';
import {
  listarPropietarios, listarPacientes, crearPropietario, crearPaciente, crearRegistros, nombreCompleto, iniciales, celNorm,
  ESPECIES, VACUNAS, DESPARASITACIONES, SERVICIOS, servicioDe, sexoTxt, edad, kg, type Propietario, type Paciente, type NuevoPropietario, type NuevoPaciente
} from './clinica-datos';
import { PropietarioForm, PacienteForm, Seg, Avatar, propietarioVacio, pacienteVacio, erroresPropietario, erroresPaciente, spaLimpio } from './clinica-ui';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
interface Previa { que: string; fecha: string; lab: string }
const PASOS = [['Propietario', 'Quién la trae'], ['Mascota', 'Sus datos y lo que ya trae'], ['Revisar', 'Y guardar']];

export default function Registro() {
  const pre = new URLSearchParams(location.search).get('propietario');
  const [paso, setPaso] = useState(0);
  const [props, setProps] = useState<Propietario[]>([]);
  const [pacs, setPacs] = useState<Paciente[]>([]);
  const [modo, setModo] = useState<'existe' | 'nuevo'>(pre ? 'existe' : 'nuevo');
  const [elegido, setElegido] = useState<string | null>(pre);
  const [buscar, setBuscar] = useState('');
  const [prop, setProp] = useState<NuevoPropietario>(propietarioVacio);
  const [invitar, setInvitar] = useState(true);
  const [pac, setPac] = useState<NuevoPaciente>(pacienteVacio());
  const [previas, setPrevias] = useState<Previa[]>([]);
  const [errP, setErrP] = useState<Record<string, string>>({});
  const [errM, setErrM] = useState<Record<string, string>>({});
  const [falla, setFalla] = useState('');
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => { Promise.all([listarPropietarios(), listarPacientes()]).then(([a, b]) => { setProps(a); setPacs(b); }).catch((e) => setFalla((e as Error).message)); }, []);

  const existente = props.find((p) => p.id === elegido) ?? null;
  // si escriben un celular que ya existe, se ofrece usar esa ficha
  const repetido = modo === 'nuevo' && celNorm(prop.celular).length === 10 ? props.find((p) => celNorm(p.celular) === celNorm(prop.celular)) : undefined;
  const coinciden = useMemo(() => {
    const t = norm(buscar.trim()), dig = buscar.replace(/\D/g, '');
    if (!t) return props.slice(0, 6);
    return props.filter((p) => norm(`${nombreCompleto(p)} ${pacs.filter((m) => m.propietario_id === p.id).map((m) => m.nombre).join(' ')}`).includes(t)
      || (dig.length >= 3 && (p.celular.replace(/\D/g, '').includes(dig) || (p.doc_numero ?? '').replace(/\D/g, '').includes(dig)))).slice(0, 8);
  }, [buscar, props, pacs]);
  const dueñoTxt = modo === 'existe' ? (existente ? nombreCompleto(existente) : '—') : (nombreCompleto(prop) || '—');
  const mascotaTxt = pac.nombre.trim() || 'Nueva mascota';
  const mascotaDesc = [ESPECIES[pac.especie], pac.raza, sexoTxt(pac), edad(pac), kg(pac.peso), 'Viene a ' + SERVICIOS.find(([k]) => k === servicioDe(pac))![1].toLowerCase()].filter(Boolean).join(' · ');

  const validarPaso = (n: number) => {
    setFalla('');
    if (n === 0) {
      if (modo === 'existe') { if (!existente) { setFalla('Elige el propietario de la lista.'); return false; } return true; }
      const e = erroresPropietario(prop);
      if (!prop.acepto_datos) e.acepto = 'Para registrarlo necesitamos su autorización de datos.';
      setErrP(e);
      return !Object.keys(e).length;
    }
    if (n === 1) {
      const e = erroresPaciente(pac);
      if (previas.some((x) => !x.fecha)) e.previas = 'Pon la fecha de cada vacuna o desparasitación anterior.';
      setErrM(e);
      return !Object.keys(e).length;
    }
    return true;
  };
  const ir = (n: number) => { for (let i = paso; i < n; i++) if (!validarPaso(i)) return; setPaso(n); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const guardar = async (despues: 'ficha' | 'otra') => {
    setOcupado(true); setFalla('');
    try {
      const dueño = modo === 'existe' ? existente! : await crearPropietario({
        ...prop, nombre: prop.nombre.trim(), apellidos: prop.apellidos.trim(),
        portal: invitar && prop.correo ? 'por_invitar' : 'sin_invitar'
      });
      const m = await crearPaciente({ ...pac, nombre: pac.nombre.trim(), propietario_id: dueño.id, extras: pac.extras.filter(([k]) => k.trim()), spa: spaLimpio(pac) });
      await crearRegistros(previas.map((x) => ({
        paciente_id: m.id, tipo: DESPARASITACIONES.includes(x.que) ? 'desparasitacion' : 'vacuna', fecha: new Date(x.fecha + 'T12:00:00').toISOString(),
        titulo: x.que, resumen: null, datos: x.lab ? { laboratorio: x.lab } : {}, archivos: [], externo: true, por_nombre: null
      })));
      if (despues === 'ficha') go('/gestor/paciente?id=' + m.id);
      else { setProps((l) => (l.some((p) => p.id === dueño.id) ? l : [...l, dueño])); setModo('existe'); setElegido(dueño.id); setPac(pacienteVacio()); setPrevias([]); setPaso(1); setOcupado(false); }
    } catch (e) { setFalla((e as Error).message); setOcupado(false); }
  };

  return (
    <Shell activo="pacientes">
      {() => (
        <div className="reg">
          <nav className="miga" aria-label="Estás en"><a href={link('/gestor/pacientes')}>Pacientes</a><span className="ms" aria-hidden="true">chevron_right</span><span aria-current="page">Registrar paciente</span>{DEMO && <span className="ex">Datos de ejemplo</span>}</nav>
          <div className="mhead"><div className="mhead__txt"><h1>Registrar paciente</h1><p>Primero el propietario, después la mascota. Toma un par de minutos y queda lista su historia clínica.</p></div></div>
          <ol className="pasos-r" aria-label="Pasos">
            {PASOS.map(([t, s], i) => (
              <li key={t}><button type="button" aria-current={paso === i ? 'step' : undefined} data-hecho={i < paso || undefined} onClick={() => (i < paso ? setPaso(i) : ir(i))}>
                <span className="pasos-r__n">{i < paso ? <span className="ms" aria-hidden="true">check</span> : i + 1}</span><span><b>{t}</b><span>{s}</span></span>
              </button></li>
            ))}
          </ol>

          <div className="reg__grid">
            <div className="reg__main">
              {/* ---------- 1 · PROPIETARIO ---------- */}
              {paso === 0 && (
                <section className="gcard" aria-labelledby="s1">
                  <div className="reg__h"><h2 id="s1">Propietario</h2>
                    <Seg label="Tipo de propietario" value={modo} opts={[['existe', 'Ya es cliente'], ['nuevo', 'Nuevo propietario']]} onChange={setModo} />
                  </div>
                  {modo === 'existe' ? (
                    <>
                      <div className="fld"><label htmlFor="bus">Buscar propietario</label><input id="bus" value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Nombre, celular, cédula o mascota. Ej: Gómez, 300 123 4567" autoFocus /></div>
                      <div className="pick" role="radiogroup" aria-label="Propietarios">
                        {coinciden.map((p) => {
                          const ms = pacs.filter((m) => m.propietario_id === p.id);
                          return (
                            <button key={p.id} type="button" role="radio" aria-checked={elegido === p.id} onClick={() => setElegido(p.id)}>
                              <Avatar txt={iniciales(nombreCompleto(p))} />
                              <span><b>{nombreCompleto(p)}</b><span>{prettyCel(p.celular)}{ms.length ? ` · ${ms.map((m) => m.nombre).join(', ')}` : ''}</span></span>
                              <span className="ms" aria-hidden="true">{elegido === p.id ? 'check_circle' : 'radio_button_unchecked'}</span>
                            </button>
                          );
                        })}
                        {!coinciden.length && <p className="hint">Nadie coincide. ¿Es nuevo? Toca «Nuevo propietario».</p>}
                      </div>
                    </>
                  ) : (
                    <>
                      <PropietarioForm v={prop} set={(c) => setProp((x) => ({ ...x, ...c }))} errores={errP} />
                      {repetido && (
                        <div className="aviso-r"><span className="ms" aria-hidden="true">info</span><span>Ya hay un cliente con ese celular: <b>{nombreCompleto(repetido)}</b>.</span>
                          <button className="gbtn sm" type="button" onClick={() => { setModo('existe'); setElegido(repetido.id); }}>Usar esa ficha</button></div>
                      )}
                      <div className="checks">
                        <label className="chk-l"><input type="checkbox" checked={prop.acepto_datos} onChange={(e) => setProp((x) => ({ ...x, acepto_datos: e.target.checked }))} />
                          <span><b>Autoriza el tratamiento de sus datos</b> según la Ley 1581 de 2012. <a href={link('/privacidad')} target="_blank" rel="noopener">Ver política</a><span className="hint">Queda guardado con la fecha y quién lo registró.</span></span></label>
                        {errP.acepto && <span className="gerr-f">{errP.acepto}</span>}
                        <label className="chk-l"><input type="checkbox" checked={invitar} onChange={(e) => setInvitar(e.target.checked)} disabled={!prop.correo} />
                          <span><b>Invitarlo al portal de clientes</b> con un correo para crear su contraseña.<span className="hint">{prop.correo ? 'El correo sale cuando el portal esté activo.' : 'Necesita correo.'}</span></span></label>
                      </div>
                    </>
                  )}
                </section>
              )}

              {/* ---------- 2 · MASCOTA ---------- */}
              {paso === 1 && (
                <>
                  <section className="gcard" aria-labelledby="s2"><h2 id="s2">Mascota</h2><PacienteForm v={pac} set={(c) => setPac((x) => ({ ...x, ...c }))} errores={errM} /></section>
                  <section className="gcard" aria-labelledby="s2b">
                    <div><h2 id="s2b">Vacunas y desparasitaciones anteriores</h2><p className="hint">Si llega vacunada de otra veterinaria, anótalo aquí. Queda en su carnet como «aplicada en otra veterinaria».</p></div>
                    {previas.map((x, i) => (
                      <div className="prev" key={i}>
                        <select aria-label="Qué se le aplicó" value={x.que} onChange={(e) => setPrevias((l) => l.map((y, j) => (j === i ? { ...y, que: e.target.value } : y)))}>
                          {[...VACUNAS[pac.especie], ...DESPARASITACIONES].map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <input type="date" aria-label="Fecha de aplicación" value={x.fecha} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setPrevias((l) => l.map((y, j) => (j === i ? { ...y, fecha: e.target.value } : y)))} />
                        <input aria-label="Laboratorio" placeholder="Laboratorio (opcional)" value={x.lab} onChange={(e) => setPrevias((l) => l.map((y, j) => (j === i ? { ...y, lab: e.target.value } : y)))} />
                        <button type="button" className="vrow__x" aria-label="Quitar" onClick={() => setPrevias((l) => l.filter((_, j) => j !== i))}><span className="ms">close</span></button>
                      </div>
                    ))}
                    {errM.previas && <span className="gerr-f">{errM.previas}</span>}
                    <button className="link-add" type="button" onClick={() => setPrevias((l) => [...l, { que: VACUNAS[pac.especie][0], fecha: '', lab: '' }])}><span className="ms" aria-hidden="true">add</span>Agregar vacuna o desparasitación anterior</button>
                  </section>
                </>
              )}

              {/* ---------- 3 · REVISAR ---------- */}
              {paso === 2 && (
                <section className="gcard" aria-labelledby="s3">
                  <h2 id="s3">Revisa y guarda</h2>
                  <div className="rev">
                    <div><span className="rev__k">Propietario</span><b>{dueñoTxt}</b>
                      <span className="hint">{modo === 'existe' ? 'Ya es cliente' : `Datos autorizados${invitar && prop.correo ? ' · se le invitará al portal' : ''}`}</span>
                      <button type="button" className="link-add" onClick={() => setPaso(0)}>Cambiar</button></div>
                    <div><span className="rev__k">Mascota</span><b>{mascotaTxt}</b><span className="hint">{mascotaDesc}</span>
                      <button type="button" className="link-add" onClick={() => setPaso(1)}>Cambiar</button></div>
                    {previas.length > 0 && <div><span className="rev__k">Lo que ya trae</span><b>{previas.map((x) => x.que).join(', ')}</b><span className="hint">Quedan en su carnet</span></div>}
                  </div>
                  <p className="hint">Al guardar se crea su historia clínica y su carnet de vacunas. Lo que le falte de vacunas lo verás en «Vacunas y recordatorios» cuando esté ese módulo.</p>
                  <div className="dacts">
                    <button className="gbtn" type="button" disabled={ocupado} onClick={() => guardar('ficha')}><span className="ms" aria-hidden="true">check</span>{ocupado ? 'Guardando…' : 'Guardar y abrir la ficha'}</button>
                    <button className="gbtn out" type="button" disabled={ocupado} onClick={() => guardar('otra')}><span className="ms" aria-hidden="true">add</span>Guardar y registrar otra mascota</button>
                  </div>
                </section>
              )}

              {falla && <p className="gerr" role="alert">{falla}</p>}
              <div className="reg__nav">
                {paso > 0 && <button className="gbtn out" type="button" onClick={() => setPaso(paso - 1)}><span className="ms" aria-hidden="true">arrow_back</span>Atrás</button>}
                {paso < 2 && <button className="gbtn" type="button" onClick={() => ir(paso + 1)}>Continuar<span className="ms" aria-hidden="true">arrow_forward</span></button>}
              </div>
            </div>

            <aside className="gcard reg__res" aria-label="Así va el registro">
              <b>Así va el registro</b>
              <div className="reg__pet"><Avatar txt={mascotaTxt[0]} /><span><b>{mascotaTxt}</b><span>{mascotaDesc || 'Sin datos todavía'}</span></span></div>
              <div className="reg__own"><span className="hint">Propietario</span><b>{dueñoTxt}</b></div>
              <p className="hint">Al guardar se crea su historia clínica y su carnet de vacunas.</p>
            </aside>
          </div>
        </div>
      )}
    </Shell>
  );
}
