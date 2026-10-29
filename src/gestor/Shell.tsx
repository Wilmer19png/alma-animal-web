// Marco de todas las pantallas del gestor: menú lateral (escritorio), barra inferior (celular)
// y control de acceso. Si no hay sesión, manda a /gestor/ingresar.
import { useEffect, type ReactNode } from 'react';
import heart from '../assets/corazon.png';
import { useSesion, salir, ROL_TXT, type Miembro } from './session';
import { link, go, asset, DEMO } from './lib';

interface Item { id: string; txt: string; icon: string; href: string; listo: boolean }
const GRUPOS: { grp: string; items: Item[] }[] = [
  { grp: 'General', items: [{ id: 'hoy', txt: 'Hoy', icon: 'space_dashboard', href: '/gestor', listo: false }] },
  { grp: 'Clínica', items: [
    { id: 'agenda', txt: 'Agenda', icon: 'calendar_month', href: '/gestor/agenda', listo: false },
    { id: 'pacientes', txt: 'Pacientes', icon: 'pets', href: '/gestor/pacientes', listo: false },
    { id: 'propietarios', txt: 'Propietarios', icon: 'group', href: '/gestor/propietarios', listo: false },
    { id: 'vacunas', txt: 'Vacunas y recordatorios', icon: 'vaccines', href: '/gestor/vacunas', listo: false }
  ] },
  { grp: 'Spa', items: [
    { id: 'spa', txt: 'Citas de spa', icon: 'shower', href: '/gestor/spa', listo: false },
    { id: 'tarifas', txt: 'Servicios y tarifas', icon: 'sell', href: '/gestor/tarifas', listo: false }
  ] },
  { grp: 'Tienda', items: [
    { id: 'pedidos', txt: 'Pedidos', icon: 'receipt_long', href: '/gestor/pedidos', listo: true },
    { id: 'productos', txt: 'Productos e inventario', icon: 'inventory_2', href: '/gestor/productos', listo: false }
  ] },
  { grp: 'Sitio web', items: [
    { id: 'sitio', txt: 'Textos e imágenes', icon: 'web', href: '/gestor/sitio', listo: false },
    { id: 'blog', txt: 'Blog', icon: 'article', href: '/gestor/blog', listo: false },
    { id: 'equipo', txt: 'Equipo', icon: 'badge', href: '/gestor/equipo', listo: false }
  ] },
  { grp: 'Ajustes', items: [
    { id: 'envios', txt: 'Envíos y obsequio', icon: 'local_shipping', href: '/gestor/envios', listo: false },
    { id: 'horarios', txt: 'Horarios', icon: 'schedule', href: '/gestor/horarios', listo: false },
    { id: 'usuarios', txt: 'Usuarios y roles', icon: 'admin_panel_settings', href: '/gestor/usuarios', listo: false }
  ] }
];
const TODOS = GRUPOS.flatMap((g) => g.items);
const ABAJO = ['hoy', 'agenda', 'pacientes', 'pedidos'];

function Enlace({ it, activo, insignia }: { it: Item; activo: string; insignia?: number }) {
  const on = it.id === activo;
  if (!it.listo) {
    return (
      <span className="nav-off" aria-disabled="true" title="Se construye en los próximos pasos">
        <span className="ms" aria-hidden="true">{it.icon}</span>{it.txt}<i>Pronto</i>
      </span>
    );
  }
  return (
    <a href={link(it.href)} className={on ? 'on' : undefined} aria-current={on ? 'page' : undefined}>
      <span className="ms" aria-hidden="true">{it.icon}</span>{it.txt}
      {insignia ? <span className="n" aria-label={`${insignia} nuevos`}>{insignia}</span> : null}
    </a>
  );
}

function Menu({ activo, insignias }: { activo: string; insignias: Record<string, number> }) {
  return (
    <>
      {GRUPOS.map((g) => (
        <div key={g.grp} className="grp-wrap">
          {g.grp !== 'General' && <span className="grp">{g.grp}</span>}
          <nav aria-label={g.grp}>
            {g.items.map((it) => <Enlace key={it.id} it={it} activo={activo} insignia={insignias[it.id]} />)}
          </nav>
        </div>
      ))}
    </>
  );
}

function Yo({ yo }: { yo: Miembro }) {
  return (
    <div className="yo">
      <span className="yo__ini" aria-hidden="true">{yo.nombre.replace(/^Dra?\.\s*/, '').slice(0, 1)}</span>
      <span className="yo__txt"><b>{yo.nombre}</b><span>{ROL_TXT[yo.rol]}{DEMO ? ' · ejemplo' : ''}</span></span>
      <button type="button" className="yo__out" aria-label="Salir del gestor" title="Salir" onClick={() => salir().then(() => go('/gestor/ingresar'))}>
        <span className="ms" aria-hidden="true">logout</span>
      </button>
    </div>
  );
}

export default function Shell({ activo, insignias = {}, children }: { activo: string; insignias?: Record<string, number>; children: (yo: Miembro) => ReactNode }) {
  const s = useSesion();
  useEffect(() => { if (s.estado === 'fuera') go('/gestor/ingresar'); }, [s.estado]);

  if (s.estado === 'cargando' || s.estado === 'fuera') {
    return <div className="g-splash" role="status"><img src={asset(heart.src)} alt="" width={64} /><span>Cargando el gestor…</span></div>;
  }
  if (s.estado === 'sin-acceso') {
    return (
      <div className="g-splash">
        <img src={asset(heart.src)} alt="" width={64} />
        <b>Tu cuenta no tiene acceso al gestor</b>
        <span>Entraste como {s.correo}. Si eres del equipo, pídele a la administradora que te dé acceso.</span>
        <button className="gbtn out" type="button" onClick={() => salir().then(() => go('/gestor/ingresar'))}>Salir</button>
      </div>
    );
  }

  const yo = s.yo;
  const masActivo = !ABAJO.includes(activo);
  return (
    <div className="g">
      <a className="skip" href="#modulo">Saltar al contenido</a>
      <aside className="side" aria-label="Menú del gestor">
        <a className="side__logo" href={link('/gestor/pedidos')}>
          <span><img src={asset(heart.src)} alt="" width={34} /></span>
          <span><b>Alma Animal</b><small>Gestor interno</small></span>
        </a>
        <Menu activo={activo} insignias={insignias} />
        <Yo yo={yo} />
      </aside>

      <div className="gbar">
        <a className="gbar__logo" href={link('/gestor/pedidos')}><span><img src={asset(heart.src)} alt="" width={26} /></span>Alma Animal</a>
        <button type="button" className="gbar__ic" aria-label="Salir del gestor" onClick={() => salir().then(() => go('/gestor/ingresar'))}><span className="ms" aria-hidden="true">logout</span></button>
      </div>

      <main className="main" id="modulo">{children(yo)}</main>

      <nav className="gnav" aria-label="Menú del gestor">
        {ABAJO.map((id) => { const it = TODOS.find((x) => x.id === id)!; return <Enlace key={id} it={it} activo={activo} insignia={insignias[id]} />; })}
        <details className={'gmore' + (masActivo ? ' on' : '')}>
          <summary><span className="ms" aria-hidden="true">menu</span>Más</summary>
          <div className="gsheet">
            <Menu activo={activo} insignias={insignias} />
            <Yo yo={yo} />
          </div>
        </details>
      </nav>
    </div>
  );
}
