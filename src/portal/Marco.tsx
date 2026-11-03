// Marco del portal: barra con el menú, cuenta del cliente y pie. Si no ha entrado, lo lleva a Ingresar.
import { useEffect, useState, type ReactNode } from 'react';
import heart from '../assets/corazon.png';
import { link, go, asset } from '../gestor/lib';
import { useCuenta, salir, DEMO, type Ficha } from './datos';
import { whatsapp, ADDRESS, PHONES, DOCTOR } from '../data/site';

const NAV = [
  { id: 'inicio', txt: 'Inicio', icon: 'home', href: '/portal' },
  { id: 'mascotas', txt: 'Mis mascotas', icon: 'pets', href: '/portal/mascota' },
  { id: 'agendar', txt: 'Agendar', icon: 'calendar_add_on', href: '/portal/agendar' },
  { id: 'pedidos', txt: 'Mis pedidos', icon: 'shopping_bag', href: '/portal/pedidos' }
];
export const iniciales = (f: Ficha) => (f.nombre[0] + (f.apellidos?.[0] ?? '')).toUpperCase();

export function Logo() {
  return (
    <a className="pbar__logo" href={link('/portal')}>
      <img src={asset(heart.src)} alt="" width={40} />
      <span><b>Alma Animal</b><small>Mi portal</small></span>
    </a>
  );
}

export function Pie() {
  return (
    <footer className="ppie">
      <span>Alma Animal · {ADDRESS.line}, Pereira · {PHONES.vet.display}</span>
      <span>{DOCTOR.name} · MVZ · {DOCTOR.tp} · <a href="/privacidad">Tratamiento de datos (Ley 1581 de 2012)</a></span>
    </footer>
  );
}

export default function Marco({ activo, children }: { activo: string; children: (yo: Ficha) => ReactNode }) {
  const c = useCuenta();
  const [menu, setMenu] = useState(false);
  useEffect(() => { if (c.estado === 'fuera') go('/portal/ingresar'); }, [c.estado]);
  useEffect(() => {
    if (!menu) return;
    const cerrar = (e: MouseEvent) => { if (!(e.target as HTMLElement).closest('.pyo')) setMenu(false); };
    document.addEventListener('click', cerrar);
    return () => document.removeEventListener('click', cerrar);
  }, [menu]);

  if (c.estado === 'cargando' || c.estado === 'fuera') return <div className="psplash"><img src={asset(heart.src)} alt="" width={64} /><span>Cargando tu portal…</span></div>;
  if (c.estado === 'equipo') {
    return (
      <main className="ing">
        <div className="ing__card">
          <img src={asset(heart.src)} alt="" width={72} className="ing__logo" />
          <h1>Eres del equipo de Alma Animal</h1>
          <p className="ing__sub">Hola, {c.nombre.split(' ')[0]}. Este es el portal de los clientes; lo tuyo es el gestor. Entra allá con tu correo <b>{c.correo}</b> y tu contraseña.</p>
          <a className="gbtn ing__btn" href={link('/gestor/ingresar')}><span className="ms" aria-hidden="true">space_dashboard</span>Ir al gestor</a>
          <button className="ing__link" type="button" onClick={() => salir().then(() => go('/portal/ingresar'))}>Salir del portal</button>
        </div>
      </main>
    );
  }
  if (c.estado === 'sin-ficha') {
    return (
      <main className="ing">
        <div className="ing__card">
          <img src={asset(heart.src)} alt="" width={72} className="ing__logo" />
          <h1>Todavía no encontramos tu ficha</h1>
          <p className="ing__sub">Entraste con <b>{c.correo}</b>, pero ese correo no está en la ficha de ninguna mascota. Escríbenos y lo agregamos: así ves el carnet y las citas de tu mascota.</p>
          <a className="gbtn wa ing__btn" href={whatsapp.vet(`Hola, Alma Animal. Quiero activar mi portal con el correo ${c.correo}.`)} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">chat</span>Escribir por WhatsApp</a>
          <button className="ing__link" type="button" onClick={() => salir().then(() => go('/portal/ingresar'))}>Entrar con otro correo</button>
        </div>
      </main>
    );
  }
  const yo = c.yo;
  return (
    <div className="pwrap">
      <header className="pbar">
        <div className="pbar__in">
          <Logo />
          <nav className="pnav" aria-label="Portal">
            {NAV.map((n) => <a key={n.id} href={link(n.href)} aria-current={activo === n.id ? 'page' : undefined}><span className="ms" aria-hidden="true">{n.icon}</span>{n.txt}</a>)}
          </nav>
          <a className="pbar__site" href="/"><span className="ms" aria-hidden="true">open_in_new</span>Ir a la página</a>
          <div className="pyo">
            <button type="button" className="pyo__b" aria-expanded={menu} aria-haspopup="menu" onClick={() => setMenu((m) => !m)}>
              <span className="pyo__ini" aria-hidden="true">{iniciales(yo)}</span><span className="pyo__n">{yo.nombre}</span><span className="ms" aria-hidden="true">expand_more</span>
            </button>
            {menu && (
              <div className="pyo__m" role="menu">
                <span className="pyo__c">{yo.correo}</span>
                <a role="menuitem" href={link('/portal/clave')}><span className="ms" aria-hidden="true">lock_reset</span>Crear o cambiar contraseña</a>
                <button role="menuitem" type="button" onClick={() => salir().then(() => go('/portal/ingresar'))}><span className="ms" aria-hidden="true">logout</span>Salir</button>
              </div>
            )}
          </div>
        </div>
      </header>
      {DEMO && <p className="pdemo">Estás viendo el portal con datos de ejemplo.</p>}
      <main className="pmain">{children(yo)}</main>
      <Pie />
      <nav className="pnav-m" aria-label="Portal">
        {NAV.map((n) => <a key={n.id} href={link(n.href)} aria-current={activo === n.id ? 'page' : undefined}><span className="ms" aria-hidden="true">{n.icon}</span>{n.txt.replace('Mis m', 'M').replace('Mis p', 'P')}</a>)}
      </nav>
    </div>
  );
}
