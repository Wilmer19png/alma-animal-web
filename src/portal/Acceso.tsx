// Ingreso al portal: con un enlace al correo (sin contraseña, sirve también la primera vez) o con contraseña.
// Y la pantalla para crear o cambiar la contraseña.
import { useEffect, useState, type FormEvent } from 'react';
import heart from '../assets/corazon.png';
import { go, asset, link } from '../gestor/lib';
import { useCuenta, entrar, enlace, recuperar, nuevaClave, entrarEjemplo, DEMO } from './datos';
import { Pie } from './Marco';

function Tarjeta({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="pacc">
      <main className="ing">
        <div className="ing__card">
          <img src={asset(heart.src)} alt="" width={72} className="ing__logo" />
          <h1>{titulo}</h1>
          <p className="ing__sub">{sub}</p>
          {children}
        </div>
        <a className="ing__site" href="/"><span className="ms" aria-hidden="true">arrow_back</span> Volver a la página</a>
      </main>
      <Pie />
    </div>
  );
}

function Clave({ value, onChange, id, auto }: { value: string; onChange: (v: string) => void; id: string; auto: string }) {
  const [ver, setVer] = useState(false);
  return (
    <span className="ing__pass">
      <input id={id} type={ver ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} required />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}>
        <span className="ms" aria-hidden="true">{ver ? 'visibility_off' : 'visibility'}</span>
      </button>
    </span>
  );
}

export function Ingresar() {
  const c = useCuenta();
  const [modo, setModo] = useState<'enlace' | 'clave' | 'olvido'>('enlace');
  const [listo, setListo] = useState('');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (c.estado === 'dentro' || c.estado === 'sin-ficha') go('/portal'); }, [c.estado]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo.trim())) { setError('Escribe tu correo completo. Ej: laura@gmail.com'); return; }
    setError(''); setOcupado(true);
    const err = modo === 'clave' ? await entrar(correo, clave) : modo === 'olvido' ? await recuperar(correo) : await enlace(correo);
    setOcupado(false);
    if (err) setError(err);
    else if (modo !== 'clave') setListo(modo === 'enlace' ? 'enlace' : 'olvido');
  };

  if (listo) {
    return (
      <Tarjeta titulo="Revisa tu correo" sub={listo === 'enlace' ? `Te enviamos a ${correo} un enlace para entrar. Ábrelo desde este mismo celular o computador.` : `Te enviamos a ${correo} un enlace para crear una contraseña nueva.`}>
        <p className="hint">¿No llega? Revisa la carpeta de spam o promociones. El enlace sirve por una hora.</p>
        <button className="gbtn out ing__btn" type="button" onClick={() => { setListo(''); setModo('enlace'); }}>Volver</button>
      </Tarjeta>
    );
  }
  return (
    <Tarjeta titulo={modo === 'olvido' ? 'Crear una contraseña nueva' : 'Ingresa a tu portal'} sub={modo === 'olvido' ? 'Escribe tu correo y te enviamos un enlace.' : 'Mira el carnet de vacunas, los exámenes y agenda citas.'}>
      <form className="ing__form" onSubmit={enviar} noValidate>
        <label htmlFor="pc">Correo</label>
        <input id="pc" type="email" inputMode="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" placeholder="El que diste en el consultorio" />
        {modo === 'clave' && (<><label htmlFor="pk">Contraseña</label><Clave id="pk" value={clave} onChange={setClave} auto="current-password" /></>)}
        {error && <p className="gerr" role="alert">{error}</p>}
        <button className="gbtn ing__btn" type="submit" disabled={ocupado}>
          <span className="ms" aria-hidden="true">{modo === 'clave' ? 'lock' : 'mail'}</span>{ocupado ? 'Un momento…' : modo === 'clave' ? 'Ingresar' : modo === 'olvido' ? 'Enviar enlace' : 'Enviarme un enlace para entrar'}
        </button>
      </form>
      <div className="pacc__links">
        {modo !== 'clave' && <button className="ing__link" type="button" onClick={() => { setModo('clave'); setError(''); }}>Entrar con contraseña</button>}
        {modo === 'clave' && <button className="ing__link" type="button" onClick={() => { setModo('enlace'); setError(''); }}>Entrar con un enlace al correo</button>}
        {modo === 'clave' && <button className="ing__link" type="button" onClick={() => { setModo('olvido'); setError(''); }}>Olvidé mi contraseña</button>}
      </div>
      <p className="hint">¿Tu mascota aún no es paciente? <a href="/consultorio">Agenda su primera cita</a>; al registrarla te damos el acceso.</p>
      {DEMO && (
        <div className="ing__demo">
          <span>La base de datos todavía no está conectada.</span>
          <button className="gbtn out ing__btn" type="button" onClick={() => { entrarEjemplo(); go('/portal'); }}>Entrar con datos de ejemplo</button>
        </div>
      )}
    </Tarjeta>
  );
}

const REGLAS: [string, (s: string) => boolean][] = [['Mínimo 8 caracteres', (s) => s.length >= 8], ['Una letra mayúscula', (s) => /[A-ZÁÉÍÓÚÑ]/.test(s)], ['Un número', (s) => /\d/.test(s)]];
export function NuevaClave() {
  const c = useCuenta();
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  const cumple = REGLAS.every(([, f]) => f(clave));
  const fuerza = REGLAS.filter(([, f]) => f(clave)).length + (clave.length >= 12 ? 1 : 0);
  const guardar = async (e: FormEvent) => {
    e.preventDefault();
    if (!cumple) { setError('La contraseña todavía no cumple lo de abajo.'); return; }
    setOcupado(true);
    const err = await nuevaClave(clave);
    setOcupado(false);
    if (err) setError(err); else { setOk(true); window.setTimeout(() => go('/portal'), 1400); }
  };
  if (c.estado === 'fuera') {
    return <Tarjeta titulo="El enlace venció" sub="Pide uno nuevo y vuelve a intentarlo."><a className="gbtn ing__btn" href={link('/portal/ingresar')}>Ir a Ingresar</a></Tarjeta>;
  }
  return (
    <Tarjeta titulo="Crea tu contraseña" sub={c.estado === 'dentro' ? `Para ${c.yo.correo ?? 'tu cuenta'}. La próxima vez entras con tu correo y esta contraseña.` : 'La próxima vez entras con tu correo y esta contraseña.'}>
      {ok ? <p className="pacc__ok"><span className="ms" aria-hidden="true">check_circle</span>¡Listo! Entrando a tu portal…</p> : (
        <form className="ing__form" onSubmit={guardar} noValidate>
          <label htmlFor="pn">Contraseña</label>
          <Clave id="pn" value={clave} onChange={setClave} auto="new-password" />
          <span className="pmeter" aria-hidden="true">{[1, 2, 3, 4].map((n) => <i key={n} data-on={n <= fuerza ? fuerza : undefined} />)}</span>
          <ul className="preglas">{REGLAS.map(([t, f]) => <li key={t} data-ok={f(clave) || undefined}><span className="ms" aria-hidden="true">{f(clave) ? 'check_circle' : 'radio_button_unchecked'}</span>{t}</li>)}</ul>
          {error && <p className="gerr" role="alert">{error}</p>}
          <button className="gbtn ing__btn" type="submit" disabled={ocupado || c.estado === 'cargando'}>{ocupado ? 'Guardando…' : 'Crear contraseña y entrar'}</button>
        </form>
      )}
    </Tarjeta>
  );
}
