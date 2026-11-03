// Ingreso al gestor (correo y contraseña del equipo), recuperación de contraseña
// y, mientras no esté conectada la base de datos, entrada con datos de ejemplo.
import { useEffect, useState, type FormEvent } from 'react';
import heart from '../assets/identidad/logo.webp';
import { useSesion, entrar, entrarEjemplo, recuperar, nuevaClave } from './session';
import { DEMO, go, asset } from './lib';

function Marco({ titulo, sub, children }: { titulo: string; sub: string; children: React.ReactNode }) {
  return (
    <main className="ing">
      <div className="ing__card">
        <img src={asset(heart.src)} alt="" width={72} className="ing__logo" />
        <h1>{titulo}</h1>
        <p className="ing__sub">{sub}</p>
        {children}
      </div>
      <a className="ing__site" href="/">Ir a la página de Alma Animal</a>
    </main>
  );
}

function Clave({ value, onChange, id, auto }: { value: string; onChange: (v: string) => void; id: string; auto: string }) {
  const [ver, setVer] = useState(false);
  return (
    <span className="ing__pass">
      <input id={id} type={ver ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={auto} required minLength={8} />
      <button type="button" onClick={() => setVer((v) => !v)} aria-label={ver ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={ver}>
        <span className="ms" aria-hidden="true">{ver ? 'visibility_off' : 'visibility'}</span>
      </button>
    </span>
  );
}

export function Ingreso() {
  const s = useSesion();
  const [modo, setModo] = useState<'entrar' | 'olvido' | 'enviado'>('entrar');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => { if (s.estado === 'dentro') go('/gestor'); }, [s.estado]);

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setError(''); setOcupado(true);
    const err = modo === 'entrar' ? await entrar(correo, clave) : await recuperar(correo);
    setOcupado(false);
    if (err) setError(err);
    else if (modo === 'olvido') setModo('enviado');
  };

  if (modo === 'enviado') {
    return (
      <Marco titulo="Revisa tu correo" sub={`Si ${correo} es del equipo, te llegó un enlace para crear una contraseña nueva.`}>
        <button className="gbtn out ing__btn" type="button" onClick={() => setModo('entrar')}>Volver a entrar</button>
      </Marco>
    );
  }

  return (
    <Marco titulo={modo === 'entrar' ? 'Gestor Alma Animal' : 'Crear una contraseña nueva'}
      sub={modo === 'entrar' ? 'Entra con el correo y la contraseña que te dio la administradora.' : 'Escribe tu correo y te enviamos un enlace.'}>
      <form className="ing__form" onSubmit={enviar} noValidate={false}>
        <label htmlFor="correo">Correo</label>
        <input id="correo" type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} autoComplete="username" required placeholder="Ej: mariana@almaanimal.co" />
        {modo === 'entrar' && (<><label htmlFor="clave">Contraseña</label><Clave id="clave" value={clave} onChange={setClave} auto="current-password" /></>)}
        {error && <p className="gerr" role="alert">{error}</p>}
        <button className="gbtn ing__btn" type="submit" disabled={ocupado}>
          <span className="ms" aria-hidden="true">{modo === 'entrar' ? 'lock' : 'mail'}</span>{ocupado ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Enviar enlace'}
        </button>
      </form>
      <button className="ing__link" type="button" onClick={() => { setModo(modo === 'entrar' ? 'olvido' : 'entrar'); setError(''); }}>
        {modo === 'entrar' ? '¿Olvidaste tu contraseña?' : 'Volver a entrar'}
      </button>
      {DEMO && (
        <div className="ing__demo">
          <span>La base de datos todavía no está conectada.</span>
          <button className="gbtn out ing__btn" type="button" onClick={() => { entrarEjemplo(); go('/gestor'); }}>Entrar con datos de ejemplo</button>
        </div>
      )}
    </Marco>
  );
}

// llega desde el enlace del correo de recuperación
export function NuevaClave() {
  const [clave, setClave] = useState('');
  const [otra, setOtra] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (clave.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.');
    if (clave !== otra) return setError('Las dos contraseñas no coinciden.');
    const err = await nuevaClave(clave);
    if (err) setError(err); else setListo(true);
  };
  if (listo) {
    return (
      <Marco titulo="Contraseña guardada" sub="Ya puedes entrar al gestor con tu contraseña nueva.">
        <button className="gbtn ing__btn" type="button" onClick={() => go('/gestor')}>Ir al gestor</button>
      </Marco>
    );
  }
  return (
    <Marco titulo="Tu contraseña nueva" sub="Usa al menos 8 caracteres. Mejor si mezclas letras y números.">
      <form className="ing__form" onSubmit={enviar}>
        <label htmlFor="c1">Contraseña nueva</label>
        <Clave id="c1" value={clave} onChange={setClave} auto="new-password" />
        <label htmlFor="c2">Repítela</label>
        <Clave id="c2" value={otra} onChange={setOtra} auto="new-password" />
        {error && <p className="gerr" role="alert">{error}</p>}
        <button className="gbtn ing__btn" type="submit"><span className="ms" aria-hidden="true">lock</span>Guardar contraseña</button>
      </form>
    </Marco>
  );
}
