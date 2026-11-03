// Equipo: las personas que se ven en la página Nosotros (foto, cargo, tarjeta profesional, presentación).
// El acceso al gestor se maneja aparte, en Usuarios y roles.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { DEMO, link } from './lib';
import { listarPersonas, guardarPersona, borrarPersona, ordenar, subirFotoPersona, subirVideo, nuevaPersona, AREAS, type Persona, type Area } from './equipo-datos';
import { Seg } from './clinica-ui';
import { iniciales } from './clinica-datos';

export default function Equipo() {
  const [lista, setLista] = useState<Persona[] | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [aviso, setAviso] = useState('');
  useEffect(() => { listarPersonas().then((l) => { setLista(l); setSel(l[0]?.id ?? null); }).catch((e) => { setLista([]); setAviso((e as Error).message); }); }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const [borrador, setBorrador] = useState<Persona | null>(null); // persona nueva todavía sin guardar
  const actual = borrador ?? lista?.find((p) => p.id === sel) ?? null;
  const mover = async (i: number, d: number) => {
    if (!lista) return;
    const l = [...lista]; const [x] = l.splice(i, 1); l.splice(i + d, 0, x);
    setLista(l);
    try { await ordenar(l); setAviso('Orden guardado'); } catch { setAviso('No se guardó el orden.'); }
  };

  return (
    <Shell activo="equipo">
      {(yo) => {
        const puede = yo.rol === 'admin';
        return (
          <div className="md equipo" data-vista={vista}>
            <div className="mhead">
              <div className="mhead__txt"><h1>Equipo</h1><p>Las personas que se ven en la página Nosotros, en este orden.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
              <a className="gbtn out sm" href={link('/nosotros')} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">visibility</span>Ver Nosotros</a>
              {puede && <button type="button" className="gbtn sm" onClick={() => { setBorrador(nuevaPersona(lista?.length ?? 0)); setVista('detalle'); }}><span className="ms" aria-hidden="true">person_add</span>Agregar persona</button>}
            </div>
            <div className="md__grid">
              <section className="gcard md__list" aria-label="Personas">
                {lista === null && <p className="vacio">Cargando…</p>}
                {lista?.map((p, i) => (
                  <div key={p.id} className="eqrow" data-sel={actual?.id === p.id || undefined}>
                    <button type="button" className="row" aria-pressed={actual?.id === p.id} onClick={() => { setBorrador(null); setSel(p.id); setVista('detalle'); }}>
                      <span className="av">{p.foto ? <img src={p.foto} alt="" /> : iniciales(p.nombre.replace(/^Dra?\.\s*/, ''))}</span>
                      <span className="row__txt"><b>{p.nombre}</b><span>{p.cargo || 'Sin cargo'}</span></span>
                      <span className={`chip ${p.web ? 'ok' : 'st-old'}`}>{p.web ? 'Visible' : 'Oculto'}</span>
                    </button>
                    {puede && <span className="eqrow__ord">
                      <button type="button" className="vrow__x" aria-label={`Subir a ${p.nombre}`} disabled={i === 0} onClick={() => mover(i, -1)}><span className="ms">arrow_upward</span></button>
                      <button type="button" className="vrow__x" aria-label={`Bajar a ${p.nombre}`} disabled={i === lista.length - 1} onClick={() => mover(i, 1)}><span className="ms">arrow_downward</span></button>
                    </span>}
                  </div>
                ))}
                <p className="hint">El acceso al gestor (quién entra y qué puede ver) se maneja aparte, en <a href={link('/gestor/usuarios')}>Usuarios y roles</a>.</p>
              </section>
              {actual ? <Ficha key={actual.id || 'nueva'} p={actual} puede={puede} volver={() => setVista('lista')} error={setAviso}
                  guardado={(n) => { setLista((l) => (l ?? []).some((x) => x.id === n.id) ? l!.map((x) => (x.id === n.id ? n : x)) : [...(l ?? []), n]); setBorrador(null); setSel(n.id); setAviso(n.web ? 'Guardado. Ya se ve en Nosotros.' : 'Guardado'); }}
                  borrado={(n) => { setLista((l) => (l ?? []).filter((x) => x.id !== n.id)); setBorrador(null); setSel(null); setVista('lista'); setAviso('Persona quitada'); }} />
                : <section className="gcard md__det vacio-c"><p className="vacio">Elige una persona o agrega una nueva.</p></section>}
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}

function Ficha({ p: inicial, puede, volver, guardado, borrado, error }: { p: Persona; puede: boolean; volver: () => void; guardado: (p: Persona) => void; borrado: (p: Persona) => void; error: (t: string) => void }) {
  const [p, setP] = useState(inicial);
  const [ocupado, setOcupado] = useState(false);
  const set = (c: Partial<Persona>) => setP((x) => ({ ...x, ...c }));
  const cambios = JSON.stringify(p) !== JSON.stringify(inicial) || !p.id;
  const foto = async (f?: File) => {
    if (!f) return;
    setOcupado(true);
    try { set({ foto: await subirFotoPersona(f) }); } catch (e) { error((e as Error).message); }
    setOcupado(false);
  };
  const subir = async (f: File | undefined, que: 'foto_cuerpo' | 'video') => {
    if (!f) return;
    setOcupado(true);
    try { set({ [que]: que === 'video' ? await subirVideo(f) : await subirFotoPersona(f, 1400) }); } catch (e) { error((e as Error).message); }
    setOcupado(false);
  };
  const sumarFotos = async (lista: FileList | null) => {
    if (!lista?.length) return;
    setOcupado(true);
    try {
      const nuevas: { url: string; texto: string }[] = [];
      for (const f of [...lista].slice(0, 8 - p.galeria.length)) nuevas.push({ url: await subirFotoPersona(f, 1400), texto: '' });
      set({ galeria: [...p.galeria, ...nuevas] });
    } catch (e) { error((e as Error).message); }
    setOcupado(false);
  };
  const [temasTxt, setTemasTxt] = useState(p.temas.join(', '));
  const guardar = async () => {
    if (!p.nombre.trim()) { error('Escribe el nombre.'); return; }
    if (p.instagram && !/^@?[A-Za-z0-9._]{1,30}$/.test(p.instagram)) { error('El Instagram va así: @usuario'); return; }
    setOcupado(true);
    try { guardado(await guardarPersona({ ...p, nombre: p.nombre.trim(), instagram: p.instagram ? '@' + p.instagram.replace(/^@/, '') : null })); } catch (e) { error((e as Error).message); }
    setOcupado(false);
  };
  const ano = new Date().getFullYear();
  return (
    <section className="gcard md__det eqf" aria-labelledby="eqn">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Equipo</button>
      <div className="eqf__top">
        <div className="eqf__foto">
          <span className="av av--g eqf__av">{p.foto ? <img src={p.foto} alt="" /> : <span className="ms" aria-hidden="true">person</span>}</span>
          {puede && <label className="gbtn out sm"><span className="ms" aria-hidden="true">add_a_photo</span>{p.foto ? 'Cambiar foto' : 'Subir foto'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => foto(e.target.files?.[0])} /></label>}
        </div>
        <div className="eqf__head"><h2 id="eqn">{p.nombre || 'Persona nueva'}</h2><p className="hint">Ideal: foto con fondo claro, de frente. Se recorta sola en círculo.</p></div>
      </div>
      <div className="eqf__grid">
        <div className="sfld"><label htmlFor="eq-n">Nombre como se presenta</label><input id="eq-n" className="cell" disabled={!puede} value={p.nombre} placeholder="Ej: Dra. Mariana Hoyos Giraldo" onChange={(e) => set({ nombre: e.target.value })} /></div>
        <div className="sfld"><label htmlFor="eq-c">Cargo</label><input id="eq-c" className="cell" disabled={!puede} value={p.cargo} placeholder="Ej: Peluquero canino" onChange={(e) => set({ cargo: e.target.value })} /></div>
        <div className="sfld"><label htmlFor="eq-t">Tarjeta profesional <span className="sfld__sub"><span>· si aplica</span></span></label><input id="eq-t" className="cell" disabled={!puede} value={p.tarjeta ?? ''} placeholder="Ej: TP 51206" onChange={(e) => set({ tarjeta: e.target.value || null })} /></div>
        <div className="sfld"><label htmlFor="eq-i">Instagram <span className="sfld__sub"><span>· opcional</span></span></label><input id="eq-i" className="cell" disabled={!puede} value={p.instagram ?? ''} placeholder="@usuario" onChange={(e) => set({ instagram: e.target.value.trim() || null })} /></div>
        <div className="sfld"><label htmlFor="eq-d">En Alma Animal desde</label>
          <select id="eq-d" className="cell" disabled={!puede} value={p.desde ?? ''} onChange={(e) => set({ desde: e.target.value ? Number(e.target.value) : null })}>
            <option value="">Sin año</option>{Array.from({ length: 20 }, (_, i) => ano - i).map((y) => <option key={y} value={y}>{y}</option>)}
          </select></div>
      </div>
      <div className="sfld"><label htmlFor="eq-b">Presentación <small className="cnt" data-mal={p.bio.length > 280 || undefined}>{p.bio.length} de 280 letras</small></label>
        <textarea id="eq-b" className="cell" rows={4} maxLength={280} disabled={!puede} value={p.bio} placeholder="Dos o tres frases en su propia voz: su formación, desde cuándo trabaja con mascotas y qué la mueve." onChange={(e) => set({ bio: e.target.value })} /></div>
      <div className="eqf__grid">
        <div className="sfld"><span className="sfld__lbl">Dónde atiende</span>
          <Seg label="Dónde atiende" value={p.area} opts={AREAS} onChange={(v: Area) => { if (puede) set({ area: v }); }} />
          <small className="sfld__help">Define el botón de su tarjeta: consultorio → «Conoce a la doctora», spa → «Agenda un baño».</small></div>
        <div className="sfld"><label htmlFor="eq-te">Temas <span className="sfld__sub"><span>· separados por coma, máximo 4</span></span></label>
          <input id="eq-te" className="cell" disabled={!puede} value={temasTxt} placeholder="Ej: Corte según la raza, Mascotas nerviosas"
            onChange={(e) => { setTemasTxt(e.target.value); set({ temas: e.target.value.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 4) }); }} /></div>
        <div className="sfld"><label htmlFor="eq-u">Universidad <span className="sfld__sub"><span>· opcional</span></span></label>
          <input id="eq-u" className="cell" disabled={!puede} value={p.universidad ?? ''} placeholder="Ej: Universidad de Caldas" onChange={(e) => set({ universidad: e.target.value || null })} /></div>
      </div>

      <details className="eqf__mas" open={p.area === 'consultorio' || undefined}>
        <summary><span className="ms" aria-hidden="true">auto_stories</span>Su página «Conoce a…» <small>· video, foto de cuerpo entero, historia y fotos en acción</small></summary>
        <div className="eqf__mas-in">
          <div className="sfld"><label htmlFor="eq-fr">Una frase suya <small className="cnt">{(p.frase ?? '').length} de 220</small></label>
            <input id="eq-fr" className="cell" maxLength={220} disabled={!puede} value={p.frase ?? ''} placeholder="Ej: Cuido a cada mascota como si fuera mía." onChange={(e) => set({ frase: e.target.value || null })} /></div>
          <div className="sfld"><label htmlFor="eq-h">Su historia <small className="cnt">{(p.historia ?? '').length} de 2000</small></label>
            <textarea id="eq-h" className="cell" rows={6} maxLength={2000} disabled={!puede} value={p.historia ?? ''} placeholder="Dónde estudió, cómo empezó y por qué creó Alma Animal. Separa los párrafos con un renglón en blanco." onChange={(e) => set({ historia: e.target.value || null })} /></div>
          <div className="eqf__medios">
            <div className="eqf__medio"><b>Foto de cuerpo entero</b><span className="hint">De pie, con la bata, ojalá sin fondo (PNG).</span>
              {p.foto_cuerpo && <img src={p.foto_cuerpo} alt="" className="eqf__cuerpo" />}
              {puede && <span className="dacts">
                <label className="gbtn out sm"><span className="ms" aria-hidden="true">add_a_photo</span>{p.foto_cuerpo ? 'Cambiar' : 'Subir foto'}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => subir(e.target.files?.[0], 'foto_cuerpo')} /></label>
                {p.foto_cuerpo && <button type="button" className="gbtn ghost sm" onClick={() => set({ foto_cuerpo: null })}>Quitar</button>}
              </span>}</div>
            <div className="eqf__medio"><b>Video de presentación</b><span className="hint">De 45 a 90 segundos, grabado con el celular. Máximo 50 MB.</span>
              {p.video && <video src={p.video} controls playsInline preload="metadata" className="eqf__video" />}
              {puede && <span className="dacts">
                <label className="gbtn out sm"><span className="ms" aria-hidden="true">movie</span>{p.video ? 'Cambiar video' : 'Subir video'}
                  <input type="file" accept="video/mp4,video/quicktime,video/webm" className="sr-only" onChange={(e) => subir(e.target.files?.[0], 'video')} /></label>
                {p.video && <button type="button" className="gbtn ghost sm" onClick={() => set({ video: null })}>Quitar</button>}
              </span>}</div>
          </div>
          <div className="sfld"><span className="sfld__lbl">Fotos en acción <small className="cnt">{p.galeria.length} de 8</small></span>
            <span className="hint">Atendiendo, vacunando, en cirugía, en moto rumbo a un domicilio… De cuerpo entero se ven mejor. Escribe qué está haciendo en cada una.</span>
            <div className="eqf__gal">
              {p.galeria.map((g, i) => (
                <div key={g.url} className="eqf__gi"><img src={g.url} alt="" />
                  <input className="cell" aria-label="Qué está haciendo" disabled={!puede} value={g.texto} placeholder="Ej: Vacunando a un cachorro"
                    onChange={(e) => set({ galeria: p.galeria.map((x, k) => (k === i ? { ...x, texto: e.target.value } : x)) })} />
                  {puede && <button type="button" className="vrow__x" aria-label="Quitar esta foto" onClick={() => set({ galeria: p.galeria.filter((_, k) => k !== i) })}><span className="ms">close</span></button>}
                </div>
              ))}
              {puede && p.galeria.length < 8 && <label className="eqf__gadd"><span className="ms" aria-hidden="true">add_photo_alternate</span>Agregar fotos
                <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => sumarFotos(e.target.files)} /></label>}
            </div>
          </div>
        </div>
      </details>
      {ocupado && <p className="hint-g">Subiendo… no cierres esta pantalla.</p>}

      <div className="eqf__sw">
        <span className="ms" aria-hidden="true">visibility</span>
        <span><b>Mostrar en la página</b><span>Aparece en el Inicio y en Nosotros, en el orden de la lista.</span></span>
        <button type="button" className="sw" role="switch" aria-checked={p.web} aria-label="Mostrar en la página" disabled={!puede} onClick={() => set({ web: !p.web })}><i /></button>
      </div>

      <div className="eqf__prev">
        <small>ASÍ SE VE EN NOSOTROS</small>
        <div className="eqcard">
          <span className="eqcard__foto">{p.foto ? <img src={p.foto} alt="" /> : <span className="ms" aria-hidden="true">person</span>}</span>
          <b>{p.nombre || 'Nombre'}</b>
          <span>{[p.cargo, p.tarjeta].filter(Boolean).join(' · ') || 'Cargo'}</span>
          {p.bio ? <p>{p.bio}</p> : <p className="eqcard__vacio">Sin presentación: solo se ven el nombre y el cargo.</p>}
        </div>
      </div>

      {puede && <div className="dacts">
        <button type="button" className="gbtn" disabled={ocupado || !cambios} onClick={guardar}><span className="ms" aria-hidden="true">check</span>Guardar</button>
        {p.id && <button type="button" className="gbtn ghost" disabled={ocupado} onClick={async () => { if (!confirm(`¿Quitar a ${p.nombre} del equipo de la página?`)) return; try { await borrarPersona(p); borrado(p); } catch (e) { error((e as Error).message); } }}><span className="ms" aria-hidden="true">delete</span>Quitar</button>}
      </div>}
    </section>
  );
}
