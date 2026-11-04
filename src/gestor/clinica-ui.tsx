// Piezas compartidas de Propietarios, Pacientes y Registro: formularios del propietario y de la mascota,
// selector segmentado y avatar.
import { DOCS, FUENTES, ESPECIES, SERVICIOS, servicioDe, vieneASpa, type NuevoPropietario, type NuevoPaciente, type PerfilSpa } from './clinica-datos';

const DEPTOS = ['Risaralda', 'Caldas', 'Quindío', 'Valle del Cauca', 'Antioquia', 'Bogotá D.C.', 'Cundinamarca', 'Otro'];
const CIUDADES_RIS = ['Pereira', 'Dosquebradas', 'Santa Rosa de Cabal', 'La Virginia', 'Marsella', 'Otra'];

export function Seg<T extends string>({ label, value, opts, onChange }: { label: string; value: T | null; opts: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {opts.map(([v, t]) => <button key={v} type="button" role="radio" aria-checked={value === v} onClick={() => onChange(v)}>{t}</button>)}
    </div>
  );
}

export function Avatar({ txt, foto, grande }: { txt: string; foto?: string | null; grande?: boolean }) {
  return <span className={'av' + (grande ? ' av--g' : '')} aria-hidden="true">{foto ? <img src={foto} alt="" /> : txt}</span>;
}

/* ---------- propietario ---------- */
export const propietarioVacio = (): NuevoPropietario => ({
  nombre: '', apellidos: '', doc_tipo: 'CC', doc_numero: null, celular: '', correo: null, direccion: null, barrio: null,
  departamento: 'Risaralda', ciudad: 'Pereira', fuente: null, notas: null, acepto_datos: false, portal: 'sin_invitar'
});
export const erroresPropietario = (p: NuevoPropietario) => {
  const e: Record<string, string> = {};
  if (!p.nombre.trim()) e.nombre = 'Escribe el nombre.';
  if (!p.apellidos.trim()) e.apellidos = 'Escribe los apellidos.';
  if (p.celular.replace(/\D/g, '').length < 10) e.celular = 'Escribe un celular de 10 dígitos. Ej: 300 123 4567';
  if (p.correo && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(p.correo)) e.correo = 'Revisa el correo. Ej: laura@correo.com';
  return e;
};
export function PropietarioForm({ v, set, errores = {}, idp = 'o' }: { v: NuevoPropietario; set: (c: Partial<NuevoPropietario>) => void; errores?: Record<string, string>; idp?: string }) {
  const t = (k: keyof NuevoPropietario) => (v[k] as string | null) ?? '';
  const F = ({ k, label, req, ph, type = 'text', hint, full }: { k: keyof NuevoPropietario; label: string; req?: boolean; ph?: string; type?: string; hint?: string; full?: boolean }) => (
    <div className={'fld' + (full ? ' full' : '')}>
      <label htmlFor={`${idp}-${k}`}>{label}{req && <span className="req"> *</span>}</label>
      <input id={`${idp}-${k}`} type={type} value={t(k)} placeholder={ph} aria-invalid={!!errores[k]}
        onChange={(e) => set({ [k]: e.target.value || (req ? '' : null) } as Partial<NuevoPropietario>)} />
      {hint && <span className="hint">{hint}</span>}
      {errores[k] && <span className="gerr-f">{errores[k]}</span>}
    </div>
  );
  const enRisaralda = v.departamento === 'Risaralda';
  return (
    <div className="grid2g">
      {F({ k: 'nombre', label: 'Nombre', req: true, ph: 'Ej: Laura' })}
      {F({ k: 'apellidos', label: 'Apellidos', req: true, ph: 'Ej: Gómez Restrepo' })}
      <div className="fld">
        <span className="fld__lb" id={`${idp}-doc`}>Documento</span>
        <div className="doc-in" role="group" aria-labelledby={`${idp}-doc`}>
          <select aria-label="Tipo de documento" value={v.doc_tipo ?? 'CC'} onChange={(e) => set({ doc_tipo: e.target.value })}>{DOCS.map(([id, txt]) => <option key={id} value={id}>{txt}</option>)}</select>
          <input aria-label="Número de documento" value={t('doc_numero')} placeholder="Ej: 1.088.234.567" onChange={(e) => set({ doc_numero: e.target.value || null })} />
        </div>
      </div>
      {F({ k: 'celular', label: 'Celular (WhatsApp)', req: true, ph: 'Ej: 300 123 4567', type: 'tel', hint: 'Con este número se unen sus compras de la tienda.' })}
      {F({ k: 'correo', label: 'Correo', ph: 'Ej: laura@correo.com', type: 'email', hint: 'Aquí le llegará el acceso al portal.' })}
      <div className="fld"><label htmlFor={`${idp}-fuente`}>¿Cómo nos conoció?</label>
        <select id={`${idp}-fuente`} value={v.fuente ?? ''} onChange={(e) => set({ fuente: e.target.value || null })}><option value="">Sin dato</option>{FUENTES.map((f) => <option key={f}>{f}</option>)}</select>
      </div>
      {F({ k: 'direccion', label: 'Dirección', ph: 'Ej: Calle 19 # 8-34, apto 302' })}
      {F({ k: 'barrio', label: 'Barrio', ph: 'Ej: Álamos' })}
      <div className="fld"><label htmlFor={`${idp}-dep`}>Departamento</label>
        <select id={`${idp}-dep`} value={v.departamento ?? 'Risaralda'} onChange={(e) => set({ departamento: e.target.value, ciudad: e.target.value === 'Risaralda' ? 'Pereira' : null })}>{DEPTOS.map((d) => <option key={d}>{d}</option>)}</select>
      </div>
      <div className="fld"><label htmlFor={`${idp}-ciu`}>Ciudad</label>
        {enRisaralda
          ? <select id={`${idp}-ciu`} value={v.ciudad ?? 'Pereira'} onChange={(e) => set({ ciudad: e.target.value })}>{CIUDADES_RIS.map((c) => <option key={c}>{c}</option>)}</select>
          : <input id={`${idp}-ciu`} value={t('ciudad')} placeholder="Ej: Manizales" onChange={(e) => set({ ciudad: e.target.value || null })} />}
      </div>
    </div>
  );
}

/* ---------- mascota ---------- */
export const pacienteVacio = (propietario_id = ''): NuevoPaciente => ({
  propietario_id, nombre: '', especie: 'canino', raza: null, color: null, sexo: 'hembra', reproductivo: null, nacimiento: null,
  edad_aprox: null, peso: null, microchip: null, alimento: null, alimento_cant: null, alergias: null, cronicas: null, extras: [], foto: null, activo: true, servicio: 'consulta', spa: {}
});
// lo que se guarda del perfil de spa: sin espacios sobrantes y vacío si solo viene a consulta
export const spaLimpio = (p: NuevoPaciente): PerfilSpa => {
  if (!vieneASpa(p)) return {};
  return Object.fromEntries(Object.entries(p.spa ?? {}).map(([k, v]) => [k, (v ?? '').trim()]).filter(([, v]) => v));
};
export const erroresPaciente = (p: NuevoPaciente) => {
  const e: Record<string, string> = {};
  if (!p.nombre.trim()) e.nombre = 'Escribe el nombre de la mascota.';
  if (p.peso != null && (p.peso <= 0 || p.peso >= 200)) e.peso = 'Revisa el peso. Ej: 8,4';
  return e;
};
export function PacienteForm({ v, set, errores = {}, idp = 'p' }: { v: NuevoPaciente; set: (c: Partial<NuevoPaciente>) => void; errores?: Record<string, string>; idp?: string }) {
  const T = (k: keyof NuevoPaciente, label: string, ph: string, opts: { req?: boolean; hint?: string; type?: string } = {}) => (
    <div className="fld">
      <label htmlFor={`${idp}-${k}`}>{label}{opts.req && <span className="req"> *</span>}</label>
      <input id={`${idp}-${k}`} type={opts.type ?? 'text'} value={(v[k] as string | null) ?? ''} placeholder={ph} aria-invalid={!!errores[k]}
        onChange={(e) => set({ [k]: e.target.value || (opts.req ? '' : null) } as Partial<NuevoPaciente>)} />
      {opts.hint && <span className="hint">{opts.hint}</span>}
      {errores[k] && <span className="gerr-f">{errores[k]}</span>}
    </div>
  );
  const spa = v.spa ?? {};
  const S = (k: keyof PerfilSpa, label: string, ph: string, area?: boolean) => (
    <div className={'fld' + (area ? ' full' : '')}>
      <label htmlFor={`${idp}-spa-${k}`}>{label}</label>
      {area
        ? <textarea id={`${idp}-spa-${k}`} value={spa[k] ?? ''} placeholder={ph} onChange={(e) => set({ spa: { ...spa, [k]: e.target.value } })} />
        : <input id={`${idp}-spa-${k}`} value={spa[k] ?? ''} placeholder={ph} onChange={(e) => set({ spa: { ...spa, [k]: e.target.value } })} />}
    </div>
  );
  return (
    <div className="pform">
      <div className="fld"><span className="fld__lb">¿A qué viene? <span className="req">*</span></span>
        <Seg label="A qué viene" value={servicioDe(v)} opts={SERVICIOS} onChange={(x) => set({ servicio: x })} />
        <span className="hint">Así la encuentras rápido en la lista de pacientes. Lo puedes cambiar cuando quieras.</span>
      </div>
      {vieneASpa(v) && (
        <div className="spa-p" role="group" aria-label="Cliente de spa">
          <span className="spa-p__t"><span className="ms" aria-hidden="true">shower</span>Cliente de spa</span>
          <div className="grid2g">
            {S('cuchilla', 'Guía de cuchilla', 'Ej: N.º 7F en el cuerpo, peine de 1/2" en las patas')}
            {S('corte', 'Tipo de corte', 'Ej: Corte cachorro, solo baño, rapado sanitario')}
            {S('obs', 'Observaciones del spa', 'Ej: Champú hipoalergénico. Le da miedo el secador. Muerde al cortarle las uñas.', true)}
          </div>
        </div>
      )}
      <div className="grid2g">
        {T('nombre', 'Nombre', 'Ej: Luna', { req: true })}
        <div className="fld"><span className="fld__lb">Especie <span className="req">*</span></span>
          <Seg label="Especie" value={v.especie} opts={Object.entries(ESPECIES) as [NuevoPaciente['especie'], string][]} onChange={(x) => set({ especie: x })} />
        </div>
        {T('raza', 'Raza', 'Ej: Shih Tzu, criollo')}
        {T('color', 'Color', 'Ej: Blanco y dorado')}
        <div className="fld"><span className="fld__lb">Sexo <span className="req">*</span></span>
          <Seg label="Sexo" value={v.sexo} opts={[['hembra', 'Hembra'], ['macho', 'Macho']]} onChange={(x) => set({ sexo: x })} />
        </div>
        <div className="fld"><span className="fld__lb">Estado reproductivo</span>
          <Seg label="Estado reproductivo" value={v.reproductivo} opts={[['entero', v.sexo === 'hembra' ? 'Entera' : 'Entero'], ['esterilizado', v.sexo === 'hembra' ? 'Esterilizada' : 'Castrado']]} onChange={(x) => set({ reproductivo: x })} />
        </div>
      </div>
      <div className="grid3g">
        {T('nacimiento', 'Fecha de nacimiento', '', { type: 'date' })}
        {T('edad_aprox', 'O edad aproximada', 'Ej: 4 años')}
        <div className="fld"><label htmlFor={`${idp}-peso`}>Peso (kg)</label>
          <input id={`${idp}-peso`} inputMode="decimal" value={v.peso == null ? '' : String(v.peso).replace('.', ',')} placeholder="Ej: 8,4" aria-invalid={!!errores.peso}
            onChange={(e) => { const n = parseFloat(e.target.value.replace(',', '.')); set({ peso: e.target.value.trim() && !Number.isNaN(n) ? n : null }); }} />
          {errores.peso && <span className="gerr-f">{errores.peso}</span>}
        </div>
        {T('microchip', 'Microchip', 'Ej: 900 108 000 123 456')}
        {T('alimento', 'Alimento', 'Ej: Concentrado raza pequeña adulto')}
        {T('alimento_cant', 'Cantidad de alimento', 'Ej: 110 g al día, en 2 tomas')}
      </div>
      <div className="grid2g">
        {T('alergias', 'Alergias', 'Ej: Amoxicilina, pollo', { hint: 'Se muestran en rojo en la ficha.' })}
        {T('cronicas', 'Condiciones crónicas', 'Ej: Piel sensible, displasia de cadera')}
      </div>
      <div className="extras-c">
        <span className="fld__lb">Campos personalizados <small>(lo que quieras recordar)</small></span>
        {v.extras.map(([k, x], i) => (
          <div className="feat" key={i}>
            <input className="cell" aria-label="Nombre del campo" value={k} placeholder="Ej: Le teme a…" onChange={(e) => set({ extras: v.extras.map((y, j) => (j === i ? [e.target.value, y[1]] : y)) })} />
            <input className="cell" aria-label="Valor del campo" value={x} placeholder="Ej: El secador" onChange={(e) => set({ extras: v.extras.map((y, j) => (j === i ? [y[0], e.target.value] : y)) })} />
            <button type="button" className="vrow__x" aria-label="Quitar campo" onClick={() => set({ extras: v.extras.filter((_, j) => j !== i) })}><span className="ms">close</span></button>
          </div>
        ))}
        <button className="link-add" type="button" onClick={() => set({ extras: [...v.extras, ['', '']] })}><span className="ms" aria-hidden="true">add</span>Agregar campo</button>
      </div>
    </div>
  );
}
