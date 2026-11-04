// Ficha de la mascota en el portal: datos, peso, carnet de vacunación (imprimible), consultas,
// exámenes (archivos privados con enlace temporal) e historial de spa. Las notas internas no se muestran.
import { useEffect, useState } from 'react';
import Marco from './Marco';
import { link } from '../gestor/lib';
import { misMascotas, historia, abrirArchivo, type Ficha } from './datos';
import { fechaCorta, especieTxt, peso, diasA, estadoDosis } from './comun';
import { edad, sexoTxt, medicamentosDe, type Paciente, type Registro, type Archivo } from '../gestor/clinica-datos';
import { CarnetDoc, AtencionDoc, tutorDe } from '../gestor/documentos';
import { descargarPdf, nombreArchivo } from '../gestor/pdf';

type Tab = 'carnet' | 'consultas' | 'examenes' | 'spa';
const TABS: [Tab, string, string][] = [['carnet', 'Carnet', 'vaccines'], ['consultas', 'Consultas', 'stethoscope'], ['examenes', 'Exámenes', 'biotech'], ['spa', 'Spa', 'shower']];

export default function Mascota() {
  return <Marco activo="mascotas">{(yo) => <Contenido yo={yo} />}</Marco>;
}

function Contenido({ yo }: { yo: Ficha }) {
  const [pacs, setPacs] = useState<Paciente[] | null>(null);
  const [regs, setRegs] = useState<Registro[]>([]);
  const [id, setId] = useState(() => new URLSearchParams(location.search).get('id'));
  const [tab, setTab] = useState<Tab>('carnet');
  const [bajando, setBajando] = useState<string | null>(null);
  const bajar = async (clave: string, doc: React.ReactElement, nombre: string) => {
    setBajando(clave);
    try { await descargarPdf(doc, nombre); } catch { alert('No se pudo crear el PDF. Inténtalo de nuevo.'); }
    setBajando(null);
  };
  useEffect(() => {
    misMascotas(yo).then(async (p) => { setPacs(p); setRegs(await historia(p.map((x) => x.id))); }).catch(() => setPacs([]));
  }, [yo]);
  const m = pacs?.find((p) => p.id === id) ?? pacs?.[0];
  if (pacs === null) return <p className="vacio">Cargando…</p>;
  if (!m) return <div className="gcard"><p className="vacio">Todavía no hay mascotas en tu ficha.</p></div>;

  const suyos = regs.filter((r) => r.paciente_id === m.id).sort((a, b) => b.fecha.localeCompare(a.fecha));
  const de = (tipos: string[]) => suyos.filter((r) => tipos.includes(r.tipo));
  const pesos = suyos.filter((r) => r.datos.peso).map((r) => ({ f: r.fecha, kg: Number(String(r.datos.peso).replace(',', '.')) }))
    .filter((x) => x.kg > 0 && diasA(x.f) >= -365).reverse();
  const max = Math.max(...pesos.map((x) => x.kg), 1);
  const elegir = (x: Paciente) => { setId(x.id); history.replaceState(null, '', `?id=${x.id}`); };

  return (
    <div className="pmas">
      {pacs.length > 1 && <div className="filts" role="group" aria-label="Mascota">{pacs.map((x) => <button key={x.id} type="button" className="filt" aria-pressed={x.id === m.id} onClick={() => elegir(x)}><span className="ms" aria-hidden="true">pets</span>{x.nombre}</button>)}</div>}

      <section className="gcard pmas__head">
        <span className="pmas__img">{m.foto ? <img src={m.foto} alt="" /> : <span className="ms" aria-hidden="true">pets</span>}</span>
        <div className="pmas__t">
          <h1>{m.nombre}</h1>
          <p>{[especieTxt(m), m.raza, edad(m)].filter(Boolean).join(' · ')}</p>
          <dl className="pmas__f">
            <div><dt>Sexo</dt><dd>{sexoTxt(m) || '—'}</dd></div>
            <div><dt>Peso</dt><dd>{peso(m.peso)}</dd></div>
            {m.color && <div><dt>Color</dt><dd>{m.color}</dd></div>}
            {m.microchip && <div><dt>Microchip</dt><dd>{m.microchip}</dd></div>}
            {m.alergias && <div><dt>Alergias</dt><dd className="rojo">{m.alergias}</dd></div>}
          </dl>
        </div>
        <div className="pmas__side">
          {pesos.length > 1 && (
            <div className="ppeso" aria-label={`Peso en el último año: de ${peso(pesos[0].kg)} a ${peso(pesos[pesos.length - 1].kg)}`}>
              <small>Peso en el último año</small>
              <div className="ppeso__b" aria-hidden="true">{pesos.map((x, i) => <i key={i} style={{ height: `${Math.max(12, (x.kg / max) * 100)}%` }} title={`${fechaCorta(x.f)} · ${peso(x.kg)}`} />)}</div>
            </div>
          )}
          <a className="gbtn" href={link('/portal/agendar') + `?mascota=${m.id}`}><span className="ms" aria-hidden="true">calendar_add_on</span>Agendar para {m.nombre}</a>
        </div>
      </section>

      <div className="ptabs" role="tablist" aria-label="Historia">
        {TABS.map(([t, txt, icon]) => <button key={t} type="button" role="tab" aria-selected={tab === t} onClick={() => setTab(t)}><span className="ms" aria-hidden="true">{icon}</span>{txt}</button>)}
      </div>

      {tab === 'carnet' && (() => {
        const doc = <CarnetDoc p={m} tutor={tutorDe(yo)} regs={de(['vacuna', 'desparasitacion'])} />;
        return (
          <section className="pcarnet-doc" role="tabpanel" aria-label={`Carnet de vacunación de ${m.nombre}`}>
            <div className="doc-acts">
              <button type="button" className="gbtn sm" disabled={!!bajando} onClick={() => bajar('carnet', doc, nombreArchivo('carnet', m.nombre))}>
                <span className="ms" aria-hidden="true">picture_as_pdf</span>{bajando === 'carnet' ? 'Preparando…' : 'Descargar PDF'}</button>
            </div>
            {doc}
          </section>
        );
      })()}
      {tab === 'consultas' && (
        <section className="gcard plista" role="tabpanel">
          <p className="hint">Aquí ves el resumen de cada consulta y las indicaciones de la doctora. Las notas clínicas internas no se muestran.</p>
          {!de(['consulta', 'cirugia', 'procedimiento', 'formula', 'hospitalizacion']).length && <p className="vacio">Todavía no hay consultas registradas.</p>}
          {de(['consulta', 'cirugia', 'procedimiento', 'formula', 'hospitalizacion']).map((r) => (
            <article key={r.id} className="pcons">
              <span className="pcons__f"><b>{new Date(r.fecha).getDate()}</b><small>{fechaCorta(r.fecha).split(' ').slice(1).join(' ')}</small></span>
              <div>
                <b>{r.titulo}</b><span className="pcons__k">{{ consulta: 'Consulta', cirugia: 'Cirugía', procedimiento: 'Procedimiento', formula: 'Fórmula', hospitalizacion: 'Hospitalización' }[r.tipo as string]}{r.por_nombre ? ` · ${r.por_nombre}` : ''}</span>
                {r.tipo === 'formula' && medicamentosDe(r).length > 0 && (
                  <ul className="pmeds">{medicamentosDe(r).map((x, i) => <li key={i}><b>{x.nombre}</b> · {x.presentacion}{x.lote ? ` · lote ${x.lote}` : ''}</li>)}</ul>
                )}
                {r.resumen && <p>{r.resumen}</p>}
                {r.datos.plan && <p className="pcons__plan"><span className="ms" aria-hidden="true">assignment</span><span><b>Indicaciones:</b> {r.datos.plan}</span></p>}
                {r.archivos.length > 0 && <Archivos a={r.archivos} />}
                <button type="button" className="tl__pdf pcons__pdf" disabled={!!bajando} onClick={() => bajar(r.id, <AtencionDoc p={m} tutor={tutorDe(yo)} regs={[r]} />, nombreArchivo(r.tipo, m.nombre, r.fecha.slice(0, 10)))}>
                  <span className="ms" aria-hidden="true">picture_as_pdf</span>{bajando === r.id ? 'Preparando…' : 'Descargar PDF'}</button>
              </div>
            </article>
          ))}
        </section>
      )}
      {tab === 'examenes' && (
        <section className="gcard plista" role="tabpanel">
          {!de(['examen', 'imagen']).length && <p className="vacio">Todavía no hay exámenes ni imágenes.</p>}
          {de(['examen', 'imagen']).map((r) => (
            <article key={r.id} className="pcons">
              <span className="pcons__f"><span className="ms" aria-hidden="true">{r.tipo === 'imagen' ? 'radiology' : 'biotech'}</span></span>
              <div><b>{r.titulo}</b><span className="pcons__k">{fechaCorta(r.fecha)}{r.externo ? ' · traído de otro laboratorio' : ''}</span>{r.resumen && <p>{r.resumen}</p>}{r.archivos.length > 0 && <Archivos a={r.archivos} />}</div>
            </article>
          ))}
        </section>
      )}
      {tab === 'spa' && (
        <section className="gcard plista" role="tabpanel">
          {!de(['spa']).length && <p className="vacio">{m.nombre} todavía no ha venido al spa.</p>}
          {de(['spa']).map((r) => (
            <article key={r.id} className="pcons">
              <span className="pcons__f"><span className="ms" aria-hidden="true">shower</span></span>
              <div><b>{r.titulo}</b><span className="pcons__k">{fechaCorta(r.fecha)}{r.por_nombre ? ` · lo atendió ${r.por_nombre}` : ''}</span>{r.resumen && <p>{r.resumen}</p>}</div>
            </article>
          ))}
          <a className="gbtn out sm" href={link('/portal/agendar') + `?mascota=${m.id}&servicio=spa`}><span className="ms" aria-hidden="true">shower</span>Agendar el próximo baño</a>
        </section>
      )}
    </div>
  );
}

function Archivos({ a }: { a: Archivo[] }) {
  const [msg, setMsg] = useState('');
  return (
    <div className="parch">
      {a.map((x) => (
        <button key={x.ruta + x.nombre} type="button" className="gbtn out sm" onClick={async () => { setMsg(''); const u = await abrirArchivo(x); if (u) window.open(u, '_blank', 'noopener'); else setMsg('No se pudo abrir el archivo.'); }}>
          <span className="ms" aria-hidden="true">{x.tipo === 'application/pdf' ? 'picture_as_pdf' : x.tipo.startsWith('image/') ? 'image' : 'description'}</span>{x.nombre}
        </button>
      ))}
      {msg && <span className="sfld__err">{msg}</span>}
    </div>
  );
}

