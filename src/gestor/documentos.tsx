// Documentos para el cliente: el carnet de vacunación digital y el resumen de una atención (consulta, fórmula,
// examen…). Los usan el gestor y el portal, en pantalla y para descargar en PDF (ver pdf.ts).
import logo from '../assets/identidad/logo.webp';
import firma from '../assets/identidad/firma.webp';
import gatoMini from '../assets/identidad/gato-miniatura.webp';
import loboMini from '../assets/identidad/lobo-miniatura.webp';
import { asset } from './lib';
import { edad, TIPOS, type Paciente, type Registro } from './clinica-datos';

export interface Tutor { nombre: string; doc: string | null; celular: string; ciudad: string | null }
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const corta = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
const larga = (iso: string) => { const d = new Date(iso); return `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`; };
const diaDe = (f: string) => new Date(f.length === 10 ? f + 'T12:00:00' : f);
const peso = (n: number | null) => (n == null ? '—' : n < 1 ? `${Math.round(n * 1000)} g` : `${String(n).replace('.', ',')} kg`);
const especie = (p: Paciente) => (p.especie === 'felino' ? 'Felino' : p.especie === 'canino' ? 'Canino' : 'Otra especie');
const celBonito = (c: string) => { const d = c.replace(/\D/g, '').replace(/^57(?=\d{10}$)/, ''); return d.length === 10 ? `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}` : c; };
export const codigoDe = (p: Paciente) => `AA-${p.id.replace(/[^a-z0-9]/gi, '').slice(0, 4).toUpperCase()}-${new Date(p.creado).getFullYear()}`;
export const ETIQUETAS: Record<string, string> = {
  motivo: 'Motivo', diagnostico: 'Diagnóstico', tratamiento: 'Tratamiento', temperatura: 'Temperatura (°C)', fc: 'Frecuencia cardiaca',
  fr: 'Frecuencia respiratoria', peso: 'Peso (kg)', laboratorio: 'Laboratorio', lote: 'Lote', vence: 'Vencimiento del lote', proxima: 'Próxima dosis',
  proxima_que: 'Qué le toca', producto: 'Producto', obs: 'Observaciones', plan: 'Indicaciones'
};

function Firma({ chica }: { chica?: boolean }) {
  return (
    <span className={chica ? 'doc-sello' : 'doc-firma__img'} aria-label="Firma de la Dra. Mariana Hoyos Giraldo"><img src={asset(firma.src)} alt="" /></span>
  );
}
function Encabezado({ titulo }: { titulo: string }) {
  return (
    <header className="doc-head">
      <img src={asset(logo.src)} alt="Alma Animal" />
      <div><span className="doc-head__kick">Alma Animal · Consultorio · Spa · Petshop</span><h2>{titulo}</h2></div>
      <div className="doc-head__dra"><b>Hoyos Giraldo</b><span>Médica Veterinaria &amp; Zootecnista · TP 51206</span></div>
    </header>
  );
}
function Datos({ tutor, p }: { tutor: Tutor; p: Paciente }) {
  return (
    <>
      <section className="doc-sec">
        <h3><img src={asset(loboMini.src)} alt="" />Datos del tutor</h3>
        <dl className="doc-grid">
          <div><dt>Nombre</dt><dd>{tutor.nombre}</dd></div>
          <div><dt>Identificación</dt><dd>{tutor.doc || '—'}</dd></div>
          <div><dt>Contacto</dt><dd>{celBonito(tutor.celular)}</dd></div>
          <div><dt>Ciudad</dt><dd>{tutor.ciudad || 'Pereira'}</dd></div>
        </dl>
      </section>
      <section className="doc-sec">
        <h3><img src={asset(gatoMini.src)} alt="" />Datos del paciente</h3>
        <dl className="doc-grid">
          <div><dt>Nombre</dt><dd>{p.nombre}</dd></div>
          <div><dt>Especie</dt><dd>{especie(p)}</dd></div>
          <div><dt>Raza</dt><dd>{p.raza || '—'}</dd></div>
          <div><dt>Color</dt><dd>{p.color || '—'}</dd></div>
          <div><dt>Edad</dt><dd>{edad(p) || '—'}</dd></div>
          <div><dt>Peso</dt><dd>{peso(p.peso)}</dd></div>
          <div><dt>Género</dt><dd className="doc-opts"><span data-on={p.sexo === 'macho' || undefined}>Macho</span><span data-on={p.sexo === 'hembra' || undefined}>Hembra</span></dd></div>
          <div><dt>Estado reproductivo</dt><dd className="doc-opts"><span data-on={p.reproductivo === 'entero' || undefined}>Entero</span><span data-on={p.reproductivo === 'esterilizado' || undefined}>Esterilizado</span></dd></div>
        </dl>
      </section>
    </>
  );
}
function Pie({ texto }: { texto: React.ReactNode }) {
  return (
    <footer className="doc-pie">
      <p>{texto}</p>
      <div className="doc-firma"><Firma /><span><b>Dra. Mariana Hoyos Giraldo</b><span>Médica Veterinaria y Zootecnista · TP 51206</span></span></div>
    </footer>
  );
}

/* ---------- carnet de vacunación ---------- */
export function datosCarnet(regs: Registro[]) {
  const vax = regs.filter((r) => (r.tipo === 'vacuna' || r.tipo === 'desparasitacion') && !r.privado).sort((a, b) => a.fecha.localeCompare(b.fecha));
  // lo último de cada vacuna dice qué le toca
  const ultimo = new Map<string, Registro>();
  for (const r of vax) ultimo.set(r.titulo, r);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const proximas = [...ultimo.values()].filter((r) => r.datos.proxima).sort((a, b) => a.datos.proxima.localeCompare(b.datos.proxima));
  const prox = proximas.find((r) => diaDe(r.datos.proxima) >= hoy) ?? proximas[proximas.length - 1];
  const obs = [...vax].reverse().find((r) => r.datos.obs)?.datos.obs ?? '';
  return { vax, ultimo, prox, obs };
}
// datos del tutor para el carnet y los PDF (sirve con un propietario del gestor o la ficha del portal)
const DOC_TXT: Record<string, string> = { CC: 'C.C.', CE: 'C.E.', PA: 'Pasaporte', NIT: 'NIT', TI: 'T.I.' };
type ConDatos = { nombre: string; apellidos: string; celular: string; ciudad: string | null; doc_tipo?: string | null; doc_numero?: string | null };
export const tutorDe = (o: ConDatos | null): Tutor => o
  ? { nombre: [o.nombre, o.apellidos].filter(Boolean).join(' '), doc: o.doc_numero ? `${DOC_TXT[o.doc_tipo ?? ''] ?? ''} ${o.doc_numero}`.trim() : null, celular: o.celular, ciudad: o.ciudad }
  : { nombre: '—', doc: null, celular: '', ciudad: null };

export function CarnetDoc({ p, tutor, regs, conBoton }: { p: Paciente; tutor: Tutor; regs: Registro[]; conBoton?: React.ReactNode }) {
  const { vax, ultimo, prox, obs } = datosCarnet(regs);
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const estado = (r: Registro): [string, string] => {
    if (ultimo.get(r.titulo) !== r) return ['Anterior', 'old'];
    if (!r.datos.proxima) return ['Aplicada', 'ok'];
    const d = Math.round((diaDe(r.datos.proxima).getTime() - hoy.getTime()) / 86400000);
    return d < 0 ? ['Vencida', 'mal'] : d <= 30 ? [d === 0 ? 'Hoy' : `En ${d} días`, 'warn'] : ['Al día', 'ok'];
  };
  const proxD = prox ? diaDe(prox.datos.proxima) : null;
  const faltan = proxD ? Math.round((proxD.getTime() - hoy.getTime()) / 86400000) : 0;
  const actual = vax.length ? vax.map((r) => r.creado).sort().pop()! : p.creado;
  return (
    <article className="doc" aria-label={`Carnet de vacunación de ${p.nombre}`}>
      <img className="doc__marca" src={asset(gatoMini.src)} alt="" />
      <Encabezado titulo="Carnet de vacunación" />
      <div className="doc-body">
        <div className="doc-fechas">
          <span><b>Fecha de expedición:</b> {larga(vax[0]?.fecha ?? p.creado)}</span>
          <span><b>Última actualización:</b> {larga(actual)}</span>
        </div>
        <Datos tutor={tutor} p={p} />
        <section className="doc-sec">
          <h3><span className="ms" aria-hidden="true">vaccines</span>Vacunas y desparasitaciones</h3>
          {!vax.length ? <p className="doc-vacio">Todavía no tiene vacunas ni desparasitaciones registradas.</p> : (
            <div className="doc-tabla" role="table" aria-label="Vacunas aplicadas">
              <div className="doc-tr doc-th" role="row"><span>Aplicada</span><span>Vacuna o producto</span><span>Laboratorio</span><span>Lote</span><span>Venc. lote</span><span>Próxima dosis</span><span>Firma</span></div>
              {vax.map((r) => {
                const [st, cls] = estado(r);
                return (
                  <div key={r.id} className="doc-tr" role="row">
                    <span><b>{corta(r.fecha)}</b></span>
                    <span data-l="Vacuna"><b>{r.titulo}</b><small>{r.tipo === 'vacuna' ? 'Vacuna' : 'Desparasitación'}{r.externo ? ' · otra veterinaria' : ''}</small></span>
                    <span data-l="Laboratorio">{r.datos.laboratorio || r.datos.producto || '—'}</span>
                    <span data-l="Lote">{r.datos.lote || '—'}</span>
                    <span data-l="Venc. lote">{r.datos.vence || '—'}</span>
                    <span data-l="Próxima">{r.datos.proxima ? corta(r.datos.proxima + 'T12:00:00') : '—'} <i className={`doc-chip doc-chip--${cls}`}>{st}</i></span>
                    <span>{r.externo ? <small>Otra veterinaria</small> : <Firma chica />}</span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
        {prox && proxD && (
          <div className="doc-prox">
            <span className="doc-prox__d"><small>{DIAS[proxD.getDay()].slice(0, 3).toUpperCase()}</small><b>{proxD.getDate()}</b><small>{MESES[proxD.getMonth()].slice(0, 3).toUpperCase()}</small></span>
            <span><small>{faltan < 0 ? 'Vacuna vencida' : 'Próxima vacuna'}</small><b>{prox.datos.proxima_que || `${prox.tipo === 'vacuna' ? 'Refuerzo de' : ''} ${prox.titulo}`.trim()}</b>
              <span>{DIAS[proxD.getDay()][0].toUpperCase() + DIAS[proxD.getDay()].slice(1)} {larga(prox.datos.proxima + 'T12:00:00')}{faltan > 0 ? ` · en ${faltan} ${faltan === 1 ? 'día' : 'días'}` : faltan === 0 ? ' · hoy' : ''}</span></span>
            {conBoton}
          </div>
        )}
        {obs && (
          <section className="doc-sec">
            <h3><span className="ms" aria-hidden="true">edit_note</span>Observaciones</h3>
            <p className="doc-obs">{obs}</p>
          </section>
        )}
        <Pie texto={<>Carnet digital de Alma Animal. Se actualiza solo con cada vacuna registrada en el consultorio. Código de verificación <b>{codigoDe(p)}</b>.</>} />
      </div>
    </article>
  );
}

/* ---------- resumen de una atención (uno o varios registros del mismo día) ---------- */
export function AtencionDoc({ p, tutor, regs }: { p: Paciente; tutor: Tutor; regs: Registro[] }) {
  const ordenados = [...regs].sort((a, b) => a.fecha.localeCompare(b.fecha));
  const fecha = ordenados[0]?.fecha ?? new Date().toISOString();
  const titulo = ordenados.length === 1 ? TIPOS[ordenados[0].tipo].txt : 'Resumen de la atención';
  return (
    <article className="doc" aria-label={`${titulo} de ${p.nombre}`}>
      <img className="doc__marca" src={asset(loboMini.src)} alt="" />
      <Encabezado titulo={titulo} />
      <div className="doc-body">
        <div className="doc-fechas"><span><b>Fecha de la atención:</b> {larga(fecha)}</span></div>
        <Datos tutor={tutor} p={p} />
        {ordenados.map((r) => {
          const filas = Object.entries(r.datos).filter(([k, v]) => v && ETIQUETAS[k] && k !== 'obs');
          return (
            <section key={r.id} className="doc-sec doc-reg">
              <h3><span className="ms" aria-hidden="true">{TIPOS[r.tipo].icon}</span>{TIPOS[r.tipo].txt}</h3>
              <b className="doc-reg__t">{r.titulo}</b>
              {r.resumen && <p className="doc-reg__p">{r.resumen}</p>}
              {filas.length > 0 && (
                <dl className="doc-grid doc-grid--2">
                  {filas.map(([k, v]) => <div key={k}><dt>{ETIQUETAS[k]}</dt><dd>{k === 'proxima' ? larga(v + 'T12:00:00') : v}</dd></div>)}
                </dl>
              )}
              {r.datos.obs && <p className="doc-obs">{r.datos.obs}</p>}
              {r.archivos.length > 0 && <p className="doc-adj"><span className="ms" aria-hidden="true">attach_file</span>Adjuntos: {r.archivos.map((a) => a.nombre).join(', ')}. Los encuentras en tu portal.</p>}
            </section>
          );
        })}
        <Pie texto={<>Documento de Alma Animal · Calle 1 # 9-02, Alfonso López, Pereira · WhatsApp 324 679 6695. Código del paciente <b>{codigoDe(p)}</b>.</>} />
      </div>
    </article>
  );
}
