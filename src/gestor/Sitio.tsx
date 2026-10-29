// Textos e imágenes: cambia lo que dice la página sin tocar el diseño. Cada página tiene sus bloques;
// los títulos llevan una palabra destacada con el degradado. También: título para Google y barra de anuncio.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { DEMO, link } from './lib';
import { PAGINAS, CAMPOS, tituloHtml, type Sitio, type Campo, type Pagina } from '../data/contenido';
import { leerSitio, guardarSitio } from './sitio-datos';

const ENLACES: [string, string][] = [['', 'Sin enlace'], ['/', 'Inicio'], ['/consultorio', 'Consultorio'], ['/spa', 'Spa'], ['/agendar-spa', 'Agendar spa'], ['/petshop', 'Petshop'], ['/blog', 'Blog']];
const DOMINIO = 'almaanimalvet.netlify.app';

export default function SitioPagina() {
  const [s, setS] = useState<Sitio | null>(null);
  const [orig, setOrig] = useState('');
  const [pag, setPag] = useState<string>('inicio');
  const [abierto, setAbierto] = useState(0);
  const [aviso, setAviso] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { leerSitio().then((x) => { setS(x); setOrig(JSON.stringify(x)); }).catch(() => setAviso('No pudimos cargar los textos.')); }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 3500); return () => window.clearTimeout(t); }, [aviso]);

  const cambios = !!s && JSON.stringify(s) !== orig;
  useEffect(() => {
    const salir = (e: BeforeUnloadEvent) => { if (cambios) e.preventDefault(); };
    window.addEventListener('beforeunload', salir);
    return () => window.removeEventListener('beforeunload', salir);
  }, [cambios]);

  const val = (k: string) => s?.textos[k] ?? CAMPOS[k]?.def ?? '';
  const dest = (k: string) => s?.textos[k + '#d'] ?? CAMPOS[k]?.dest ?? '';
  const setTexto = (k: string, v: string, def: string) => setS((x) => {
    if (!x) return x;
    const t = { ...x.textos };
    if (v === def) delete t[k]; else t[k] = v;
    return { ...x, textos: t };
  });
  const p = PAGINAS.find((x) => x.id === pag);
  const publicar = async () => {
    if (!s) return;
    const malo = Object.values(CAMPOS).find((c) => c.tipo === 'titulo' && dest(c.k) && !val(c.k).includes(dest(c.k)));
    if (malo) { setAviso(`La palabra destacada de «${malo.label}» debe estar dentro del título.`); return; }
    setGuardando(true);
    try { await guardarSitio(s); setOrig(JSON.stringify(s)); setAviso('Publicado. Ya se ve en la página.'); }
    catch (e) { setAviso((e as Error).message); }
    setGuardando(false);
  };

  return (
    <Shell activo="sitio">
      {(yo) => {
        const puede = yo.rol === 'admin';
        return (
          <div className="sit">
            <div className="mhead">
              <div className="mhead__txt"><h1>Textos e imágenes</h1><p>Cambia lo que dice la página sin tocar el diseño. Los colores, letras y formas se mantienen solos.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
              <a className="gbtn out sm" href={link(p?.ruta ?? '/')} target="_blank" rel="noopener"><span className="ms" aria-hidden="true">visibility</span>Ver la página</a>
              {puede && <button type="button" className="gbtn sm" disabled={!cambios || guardando} onClick={publicar}><span className="ms" aria-hidden="true">publish</span>{guardando ? 'Publicando…' : 'Publicar cambios'}</button>}
            </div>
            {!puede && <p className="hint-g">Puedes ver los textos. Solo la administradora los cambia.</p>}

            <div className="sit__grid">
              <nav className="gcard sit__nav" aria-label="Páginas">
                <small>PÁGINAS</small>
                {PAGINAS.map((x) => (
                  <button key={x.id} type="button" aria-current={pag === x.id ? 'page' : undefined} onClick={() => { setPag(x.id); setAbierto(0); }}>
                    <span className="ms" aria-hidden="true">{x.icon}</span><b>{x.nombre}</b><span>{x.bloques.length} bloques</span>
                  </button>
                ))}
                <small>EN TODAS LAS PÁGINAS</small>
                <button type="button" aria-current={pag === 'anuncio' ? 'page' : undefined} onClick={() => setPag('anuncio')}>
                  <span className="ms" aria-hidden="true">campaign</span><b>Barra de anuncio</b><span>{s?.anuncio.activo ? 'Activa' : 'Apagada'}</span>
                </button>
              </nav>

              {!s ? <section className="gcard"><p className="vacio">Cargando…</p></section> : p ? (
                <>
                  <section className="sit__blocks" aria-labelledby="sbt">
                    <h2 className="ch2" id="sbt">{p.nombre}</h2>
                    {p.bloques.map((b, n) => {
                      const clave = `${p.id}.${b.id}`, visible = !s.ocultos[clave], abiertoB = abierto === n;
                      const vistazo = b.campos[0] ? val(b.campos[0].k).replace(/\*\*/g, '').replace(/\n/g, ' ') : b.auto?.txt ?? '';
                      return (
                        <div key={b.id} className="sblk" data-open={abiertoB || undefined} data-off={!visible || undefined}>
                          <div className="sblk__h">
                            <button type="button" className="sblk__t" aria-expanded={abiertoB} onClick={() => setAbierto(abiertoB ? -1 : n)}>
                              <span><b>{b.nombre}</b><span>{vistazo || 'Vacío'}</span></span>
                              <span className="ms" aria-hidden="true">expand_more</span>
                            </button>
                            {b.ocultable && <button type="button" className="sw" role="switch" aria-checked={visible} aria-label={`Mostrar «${b.nombre}»`} disabled={!puede}
                              onClick={() => setS((x) => x && ({ ...x, ocultos: { ...x.ocultos, [clave]: visible } }))}><i /></button>}
                          </div>
                          {abiertoB && (
                            <div className="sblk__b">
                              {b.auto && <p className="sblk__auto"><span className="ms" aria-hidden="true">autorenew</span>{b.auto.txt}<a href={link(b.auto.href)}>{b.auto.btn}</a></p>}
                              {b.campos.map((c) => <CampoEd key={c.k} c={c} puede={puede} v={val(c.k)} d={dest(c.k)}
                                set={(v) => setTexto(c.k, v, c.def)} setD={(v) => setTexto(c.k + '#d', v, c.dest ?? '')} />)}
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <p className="hint">Para cambiar una foto, envíala a quien administra la página: se optimiza para que cargue rápido en el celular.</p>
                  </section>
                  <Vista p={p} s={s} abierto={abierto} val={val} dest={dest} puede={puede}
                    setSeo={(c) => setS((x) => x && ({ ...x, seo: { ...x.seo, [p.id]: { ...x.seo[p.id], ...c } } }))} />
                </>
              ) : (
                <section className="gcard sit__anuncio" aria-labelledby="san">
                  <h2 className="ch2" id="san"><span className="ms" aria-hidden="true">campaign</span>Barra de anuncio
                    <button type="button" className="sw ch2__chip" role="switch" aria-checked={s.anuncio.activo} aria-label="Mostrar la barra" disabled={!puede}
                      onClick={() => setS((x) => x && ({ ...x, anuncio: { ...x.anuncio, activo: !x.anuncio.activo } }))}><i /></button></h2>
                  <p className="hint">Una línea arriba de todas las páginas para avisos cortos. Ej: «Jornada de vacunación el sábado».</p>
                  <div className="fld"><label htmlFor="an-t">Texto del anuncio</label>
                    <input id="an-t" className="cell" maxLength={110} disabled={!puede} value={s.anuncio.texto} placeholder="Ej: Envío gratis en toda Pereira 🛵"
                      onChange={(e) => setS((x) => x && ({ ...x, anuncio: { ...x.anuncio, texto: e.target.value } }))} />
                    <small className="cnt">{s.anuncio.texto.length} de 110 letras</small></div>
                  <div className="fld"><label htmlFor="an-e">Al tocarlo, lleva a</label>
                    <select id="an-e" className="cell" disabled={!puede} value={s.anuncio.enlace} onChange={(e) => setS((x) => x && ({ ...x, anuncio: { ...x.anuncio, enlace: e.target.value } }))}>
                      {ENLACES.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
                    </select></div>
                  <div className="sit__barra" aria-hidden="true" data-off={!s.anuncio.activo || !s.anuncio.texto.trim() || undefined}>{s.anuncio.texto || 'Escribe el anuncio'}</div>
                  {s.anuncio.activo && !s.anuncio.texto.trim() && <p className="hint-g">Escribe el texto para que se muestre.</p>}
                </section>
              )}
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}

function CampoEd({ c, puede, v, d, set, setD }: { c: Campo; puede: boolean; v: string; d: string; set: (v: string) => void; setD: (v: string) => void }) {
  const id = 'f-' + c.k.replace(/\W/g, '-');
  const cambiado = v !== c.def || (c.tipo === 'titulo' && d !== (c.dest ?? ''));
  return (
    <div className="sfld">
      <label htmlFor={id}>{c.label}{cambiado && puede && <button type="button" className="sfld__undo" onClick={() => { set(c.def); if (c.tipo === 'titulo') setD(c.dest ?? ''); }}><span className="ms" aria-hidden="true">undo</span>Volver al original</button>}</label>
      {c.tipo === 'texto'
        ? <input id={id} className="cell" disabled={!puede} value={v} onChange={(e) => set(e.target.value)} />
        : <textarea id={id} className="cell" rows={c.tipo === 'titulo' ? 2 : 3} disabled={!puede} value={v} onChange={(e) => set(e.target.value)} />}
      {c.tipo === 'titulo' && (
        <>
          <label htmlFor={id + '-d'} className="sfld__sub">Palabra destacada <span>· va con degradado</span></label>
          <input id={id + '-d'} className="cell" disabled={!puede} value={d} onChange={(e) => setD(e.target.value)} aria-invalid={!!d && !v.includes(d)} />
          {d && !v.includes(d) && <small className="sfld__err">Debe estar escrita igual dentro del título.</small>}
        </>
      )}
      {c.ayuda && <small className="sfld__help">{c.ayuda}</small>}
      {c.tipo === 'largo' && <small className="sfld__help">Para resaltar en negrita, ponlo entre dos asteriscos: **así**.</small>}
    </div>
  );
}

function Vista({ p, s, abierto, val, dest, puede, setSeo }: { p: Pagina; s: Sitio; abierto: number; val: (k: string) => string; dest: (k: string) => string; puede: boolean; setSeo: (c: { title?: string; desc?: string }) => void }) {
  const b = p.bloques[abierto] ?? p.bloques[0];
  const ct = b.campos.find((c) => c.tipo === 'titulo');
  const sub = b.campos.find((c) => c.tipo !== 'titulo');
  const title = s.seo[p.id]?.title ?? p.seo.title, desc = s.seo[p.id]?.desc ?? p.seo.desc;
  return (
    <aside className="sit__side">
      <section className="gcard" aria-labelledby="svp">
        <h2 className="ch2" id="svp"><span className="ms" aria-hidden="true">preview</span>Vista previa · {b.nombre}</h2>
        <div className="svp">
          {ct ? <b className="svp__t" dangerouslySetInnerHTML={{ __html: tituloHtml(val(ct.k), dest(ct.k)) }} /> : <b className="svp__t">{b.nombre}</b>}
          {sub && <p dangerouslySetInnerHTML={{ __html: val(sub.k).replace(/[&<>]/g, (x) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[x]!).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br />') || '<i>Vacío: no se muestra</i>' }} />}
        </div>
        <p className="hint">La palabra destacada se pinta con el degradado morado de la marca. Usa una o dos palabras, nunca la frase entera.</p>
      </section>
      <section className="gcard" aria-labelledby="sgo">
        <h2 className="ch2" id="sgo"><span className="ms" aria-hidden="true">travel_explore</span>Así aparece en Google</h2>
        <div className="sgo">
          <span>{DOMINIO}{p.ruta === '/' ? '' : ' › ' + p.ruta.slice(1)}</span>
          <b>{title}</b>
          <p>{desc}</p>
        </div>
        <div className="sfld"><label htmlFor="seo-t">Título para Google <small className="cnt" data-mal={title.length > 60 || undefined}>{title.length} de 60 letras</small></label>
          <input id="seo-t" className="cell" disabled={!puede} value={title} onChange={(e) => setSeo({ title: e.target.value })} /></div>
        <div className="sfld"><label htmlFor="seo-d">Descripción para Google <small className="cnt" data-mal={desc.length > 155 || undefined}>{desc.length} de 155 letras</small></label>
          <textarea id="seo-d" className="cell" rows={4} disabled={!puede} value={desc} onChange={(e) => setSeo({ desc: e.target.value })} /></div>
        <p className="hint">Nombrar «Pereira» y el servicio ayuda a que te encuentren cuando buscan «veterinaria en Pereira».</p>
      </section>
    </aside>
  );
}
