// Lista de pacientes: búsqueda por mascota, propietario, raza o microchip, y acceso a cada ficha.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, prettyCel } from './lib';
import { listarPacientes, listarPropietarios, nombreCompleto, edad, kg, ESPECIES, sexoTxt, type Paciente, type Propietario } from './clinica-datos';
import { Avatar } from './clinica-ui';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function Pacientes() {
  const [pacs, setPacs] = useState<Paciente[] | null>(null);
  const [props, setProps] = useState<Propietario[]>([]);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [filtro, setFiltro] = useState<'todos' | 'canino' | 'felino' | 'alergias' | 'inactivos'>('todos');
  useEffect(() => {
    Promise.all([listarPacientes(), listarPropietarios()]).then(([a, b]) => { setPacs(a); setProps(b); }).catch((e) => setError((e as Error).message));
  }, []);
  const dueño = (id: string) => props.find((p) => p.id === id);
  const visibles = useMemo(() => {
    const t = norm(q.trim());
    return (pacs ?? []).filter((m) => (filtro === 'inactivos' ? !m.activo : m.activo)
      && (filtro === 'todos' || filtro === 'inactivos' || (filtro === 'alergias' ? !!m.alergias : m.especie === filtro))
      && (!t || norm(`${m.nombre} ${m.raza ?? ''} ${m.microchip ?? ''} ${dueño(m.propietario_id) ? nombreCompleto(dueño(m.propietario_id)!) : ''} ${dueño(m.propietario_id)?.celular ?? ''}`).includes(t)));
  }, [pacs, props, q, filtro]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Shell activo="pacientes">
      {() => (
        <div className="md">
          <div className="mhead">
            <div className="mhead__txt"><h1>Pacientes</h1><p>Busca una mascota para abrir su ficha e historia clínica.</p></div>
            {DEMO && <span className="ex">Datos de ejemplo</span>}
            <a className="gbtn" href={link('/gestor/registro')}><span className="ms" aria-hidden="true">person_add</span>Registrar paciente</a>
          </div>
          <div className="ped__tools md__tools">
            <label className="gsearch"><span className="ms" aria-hidden="true">search</span><span className="sr-only">Buscar paciente</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mascota, propietario, raza o microchip. Ej: Luna, Gómez" autoFocus />
            </label>
            <div className="filts" role="group" aria-label="Filtrar">
              {([['todos', 'Todos'], ['canino', 'Caninos'], ['felino', 'Felinos'], ['alergias', 'Con alergias'], ['inactivos', 'Inactivos']] as const).map(([id, t]) => (
                <button key={id} type="button" className="filt" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t}</button>
              ))}
            </div>
          </div>
          {error && <p className="gerr" role="alert">{error}</p>}
          <section className="gcard plist" aria-label="Lista de pacientes">
            {pacs === null && <p className="vacio">Cargando pacientes…</p>}
            {pacs && !visibles.length && <p className="vacio">{pacs.length ? 'Ningún paciente coincide.' : 'Todavía no hay pacientes. Empieza con «Registrar paciente».'}</p>}
            {visibles.map((m) => {
              const d = dueño(m.propietario_id);
              return (
                <a key={m.id} className="row prow2" href={link('/gestor/paciente') + `?id=${m.id}`}>
                  <Avatar txt={m.nombre[0]} foto={m.foto} />
                  <span className="row__txt">
                    <b>{m.nombre}{m.alergias && <span className="alerg" title={`Alérgico a: ${m.alergias}`}><span className="ms" aria-hidden="true">warning</span>Alergias</span>}</b>
                    <span>{[ESPECIES[m.especie], m.raza, sexoTxt(m), edad(m), kg(m.peso)].filter(Boolean).join(' · ')}</span>
                  </span>
                  <span className="prow2__own">{d ? <><b>{nombreCompleto(d)}</b><span>{prettyCel(d.celular)}</span></> : null}</span>
                  <span className="ms" aria-hidden="true">chevron_right</span>
                </a>
              );
            })}
          </section>
        </div>
      )}
    </Shell>
  );
}
