// Blog: artículos de la doctora. Lista a la izquierda y editor a la derecha: portada, título, categoría,
// resumen, cuerpo por bloques (párrafo, subtítulo, lista, consejo, producto, spa, pregunta) y publicar o programar.
import { useEffect, useMemo, useState } from 'react';
import Shell from './Shell';
import { DEMO, link, fechaCorta } from './lib';
import { listar as listarProductos, type Prod } from './productos-datos';
import { listarArticulos, guardarArticulo, borrarArticulo, subirPortada, estadoDe, slugDe, palabras, nuevo, BLOG_CATS, type Articulo, type Block, type Estado } from './blog-datos';
import { COVERS } from '../data/blog-base';
import { hhmm } from './agenda-datos';
import { Seg } from './clinica-ui';

const DOMINIO = 'almaanimalvet.netlify.app';
const ESTADOS: Record<Estado, { txt: string; cls: string }> = { publicado: { txt: 'Publicado', cls: 'st-ok' }, programado: { txt: 'Programado', cls: 'lav' }, borrador: { txt: 'Borrador', cls: 'st-old' } };
const FILTROS: [Estado | 'todos', string][] = [['todos', 'Todos'], ['publicado', 'Publicados'], ['programado', 'Programados'], ['borrador', 'Borradores']];
const TIPOS: { t: Block['t']; txt: string; icon: string }[] = [
  { t: 'p', txt: 'Párrafo', icon: 'notes' }, { t: 'h2', txt: 'Subtítulo', icon: 'title' }, { t: 'ul', txt: 'Lista', icon: 'format_list_bulleted' },
  { t: 'tip', txt: 'Consejo de la doctora', icon: 'format_quote' }, { t: 'product', txt: 'Producto del Petshop', icon: 'storefront' },
  { t: 'spa', txt: 'Invitación al spa', icon: 'shower' }, { t: 'ask', txt: 'Pregúntale a la doctora', icon: 'chat' }
];
const vacio = (t: Block['t'], prods: Prod[]): Block =>
  t === 'p' || t === 'h2' || t === 'tip' ? { t, text: '' } : t === 'ul' ? { t, items: [''] } : t === 'product' ? { t, id: prods[0]?.slug ?? '' } : ({ t } as Block);
const cuando = (a: Articulo) => {
  const e = estadoDe(a), d = a.publicado ? new Date(a.publicado) : null;
  return e === 'borrador' ? `Editado ${fechaCorta(a.actualizado)}` : e === 'programado' ? `Sale el ${fechaCorta(a.publicado!)} · ${hhmm(d!.getHours() * 60 + d!.getMinutes())}` : `Publicado el ${fechaCorta(a.publicado!)}`;
};

export default function Blog() {
  const [lista, setLista] = useState<Articulo[] | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);
  const [filtro, setFiltro] = useState<Estado | 'todos'>('todos');
  const [sel, setSel] = useState<Articulo | null>(null);
  const [vista, setVista] = useState<'lista' | 'detalle'>('lista');
  const [aviso, setAviso] = useState('');
  const [ultimo, setUltimo] = useState<{ id: string; txt: string } | null>(null); // lo último publicado (para «Copiar enlace»)

  useEffect(() => {
    listarArticulos().then((l) => { setLista(l); setSel(l[0] ?? null); }).catch((e) => { setLista([]); setAviso((e as Error).message); });
    listarProductos().then((p) => setProds(p.filter((x) => x.visible))).catch(() => {});
  }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 4000); return () => window.clearTimeout(t); }, [aviso]);

  const filas = useMemo(() => (lista ?? []).filter((a) => filtro === 'todos' || estadoDe(a) === filtro), [lista, filtro]);
  const guardado = (a: Articulo, txt: string) => { setLista((l) => [a, ...(l ?? []).filter((x) => x.id !== a.id)]); setSel(a); setAviso(txt); setUltimo(a.estado === 'publicado' ? { id: a.id, txt } : null); };

  return (
    <Shell activo="blog">
      {(yo) => {
        const puede = yo.rol === 'admin' || yo.rol === 'veterinario';
        return (
          <div className="md blog-g" data-vista={vista}>
            <div className="mhead">
              <div className="mhead__txt"><h1>Blog</h1><p>Artículos de la doctora. Los 3 más recientes salen solos en el Inicio.</p></div>
              {DEMO && <span className="ex">Artículos de ejemplo</span>}
              {puede && <button type="button" className="gbtn sm" onClick={() => { setSel(nuevo()); setVista('detalle'); }}><span className="ms" aria-hidden="true">edit_square</span>Nuevo artículo</button>}
            </div>
            <div className="md__grid">
              <section className="gcard md__list" aria-label="Artículos">
                <div className="filts" role="group" aria-label="Filtrar">
                  {FILTROS.map(([id, t]) => <button key={id} type="button" className="filt" aria-pressed={filtro === id} onClick={() => setFiltro(id)}>{t}<span>{(lista ?? []).filter((a) => id === 'todos' || estadoDe(a) === id).length}</span></button>)}
                </div>
                {lista === null && <p className="vacio">Cargando…</p>}
                {lista && !filas.length && <p className="vacio">No hay artículos aquí todavía.</p>}
                {filas.map((a) => {
                  const e = ESTADOS[estadoDe(a)], c = COVERS[a.ilustracion % COVERS.length];
                  return (
                    <button key={a.id} type="button" className="row brow" aria-pressed={sel?.id === a.id} onClick={() => { setSel(a); setVista('detalle'); }}>
                      <span className="brow__img" style={{ background: c.bg }}>{a.portada && <img src={a.portada} alt="" />}</span>
                      <span className="row__txt"><b>{a.titulo || 'Sin título'}</b><span>{a.categoria} · {cuando(a)}</span></span>
                      <span className={`chip ${e.cls}`}>{e.txt}</span>
                    </button>
                  );
                })}
              </section>
              {sel ? <Editor key={sel.id || 'nuevo'} a={sel} listo={ultimo?.id === sel.id ? ultimo.txt : ''} prods={prods} puede={puede} yo={yo.nombre} volver={() => setVista('lista')} guardado={guardado}
                  borrado={(a) => { setLista((l) => (l ?? []).filter((x) => x.id !== a.id)); setSel(null); setVista('lista'); setAviso('Artículo borrado'); }} error={setAviso} />
                : <section className="gcard md__det vacio-c"><p className="vacio">{lista === null ? 'Cargando…' : 'Elige un artículo o escribe uno nuevo.'}</p></section>}
            </div>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}

function Editor({ a: inicial, listo, prods, puede, yo, volver, guardado, borrado, error }: {
  a: Articulo; listo: string; prods: Prod[]; puede: boolean; yo: string; volver: () => void; guardado: (a: Articulo, t: string) => void; borrado: (a: Articulo) => void; error: (t: string) => void;
}) {
  const [a, setA] = useState(inicial);
  const [modo, setModo] = useState<'ahora' | 'programar'>(estadoDe(inicial) === 'programado' ? 'programar' : 'ahora');
  const prog = inicial.publicado && estadoDe(inicial) === 'programado' ? new Date(inicial.publicado) : new Date(Date.now() + 86400000);
  const [dia, setDia] = useState(`${prog.getFullYear()}-${String(prog.getMonth() + 1).padStart(2, '0')}-${String(prog.getDate()).padStart(2, '0')}`);
  const [hora, setHora] = useState(estadoDe(inicial) === 'programado' ? `${String(prog.getHours()).padStart(2, '0')}:${String(prog.getMinutes()).padStart(2, '0')}` : '08:00');
  const [ocupado, setOcupado] = useState(false);
  const set = (c: Partial<Articulo>) => setA((x) => ({ ...x, ...c }));
  const setB = (i: number, b: Block) => set({ cuerpo: a.cuerpo.map((x, n) => (n === i ? b : x)) });
  const mover = (i: number, d: number) => { const c = [...a.cuerpo]; const [x] = c.splice(i, 1); c.splice(i + d, 0, x); set({ cuerpo: c }); };
  const e = estadoDe(a), n = palabras(a), min = Math.max(1, Math.round(n / 200));
  const publicadoYa = inicial.estado === 'publicado';
  const cambios = JSON.stringify(a) !== JSON.stringify(inicial);
  const url = `https://${DOMINIO}/blog/${a.slug || slugDe(a.titulo)}`;

  const guardar = async (estado: Articulo['estado']) => {
    if (!a.titulo.trim()) { error('Ponle un título al artículo.'); return; }
    const publicado = estado === 'borrador' ? null : modo === 'programar' ? new Date(`${dia}T${hora}:00`).toISOString() : (publicadoYa && inicial.publicado && estadoDe(inicial) === 'publicado' ? inicial.publicado : new Date().toISOString());
    if (estado === 'publicado') {
      if (!a.resumen.trim()) { error('Escribe el resumen: sale en la tarjeta del Inicio y en Google.'); return; }
      if (!a.cuerpo.some((b) => b.t === 'p' && b.text.trim())) { error('El artículo necesita al menos un párrafo.'); return; }
      if (modo === 'programar' && new Date(publicado!) <= new Date()) { error('Elige una fecha y hora que todavía no hayan pasado.'); return; }
    }
    setOcupado(true);
    try {
      const cuerpo = a.cuerpo.filter((b) => !('text' in b) || b.text.trim()).map((b) => (b.t === 'ul' ? { ...b, items: b.items.filter((x) => x.trim()) } : b));
      const slug = publicadoYa ? a.slug : slugDe(a.titulo);
      const n2 = await guardarArticulo({ ...a, slug, cuerpo, estado, publicado, min, por_nombre: a.por_nombre ?? yo });
      setA(n2);
      const txt = estado === 'borrador' ? 'Borrador guardado' : modo === 'programar' ? `Programado. Sale el ${fechaCorta(publicado!)} a las ${hora}.` : 'Publicado. La página se actualiza en unos 10 minutos.';
      guardado(n2, txt);
    } catch (x) { error((x as Error).message); }
    setOcupado(false);
  };
  const portada = async (f?: File) => {
    if (!f) return;
    setOcupado(true);
    try { set({ portada: await subirPortada(f, a.slug || slugDe(a.titulo)) }); } catch (x) { error((x as Error).message); }
    setOcupado(false);
  };
  const c = COVERS[a.ilustracion % COVERS.length];

  return (
    <section className="gcard md__det bed" aria-labelledby="bet">
      <button type="button" className="back-m" onClick={volver}><span className="ms" aria-hidden="true">arrow_back</span>Blog</button>
      <div className="bed__top">
        <span className={`chip ${ESTADOS[e].cls}`}>{ESTADOS[e].txt}</span>
        <span className="hint">{n} palabras · {min} min de lectura{cambios ? ' · cambios sin guardar' : ''}</span>
      </div>

      <div className="bed__cover" style={{ background: c.bg }}>
        {a.portada ? <img src={a.portada} alt="" /> : <img className="bed__ilu" src={c.img.src} alt="" style={{ width: `${Math.round(c.w * 60)}%` }} />}
        {puede && (
          <div className="bed__cover-acts">
            <label className="gbtn out sm"><span className="ms" aria-hidden="true">image</span>{a.portada ? 'Cambiar foto' : 'Subir foto'}
              <input type="file" accept="image/*" className="sr-only" onChange={(x) => portada(x.target.files?.[0])} /></label>
            {a.portada ? <button type="button" className="gbtn out sm" onClick={() => set({ portada: null })}>Usar ilustración</button>
              : <button type="button" className="gbtn out sm" onClick={() => set({ ilustracion: (a.ilustracion + 1) % COVERS.length })}><span className="ms" aria-hidden="true">autorenew</span>Otra ilustración</button>}
          </div>
        )}
      </div>
      <p className="hint">Si no subes foto, se usa una ilustración de la marca. La foto también sale cuando compartes el enlace.</p>

      <div className="sfld"><label htmlFor="bet">Título</label>
        <textarea id="bet" className="cell bed__title" rows={2} disabled={!puede} value={a.titulo} placeholder="Ej: ¿Cada cuánto bañar a tu perro?" onChange={(x) => set({ titulo: x.target.value.replace(/\n/g, ' ') })} /></div>
      <div className="sfld"><span className="sfld__lbl">Categoría</span>
        <Seg label="Categoría" value={a.categoria} opts={BLOG_CATS.map((x) => [x, x] as [typeof x, string])} onChange={(v) => puede && set({ categoria: v })} /></div>
      <div className="sfld"><label htmlFor="ber">Resumen <span className="sfld__sub"><span>· sale en la tarjeta del Inicio y en Google</span></span><small className="cnt" data-mal={a.resumen.length > 155 || undefined}>{a.resumen.length} de 155 letras</small></label>
        <textarea id="ber" className="cell" rows={2} disabled={!puede} value={a.resumen} onChange={(x) => set({ resumen: x.target.value.replace(/\n/g, ' ') })} /></div>

      <div className="bcuerpo">
        <h3 className="ch2"><span className="ms" aria-hidden="true">article</span>El artículo<small>en los textos, **así** va en negrita</small></h3>
        {a.cuerpo.map((b, i) => {
          const tipo = TIPOS.find((x) => x.t === b.t);
          return (
            <div key={i} className="bblk" data-t={b.t}>
              <div className="bblk__h">
                <span className="ms" aria-hidden="true">{tipo?.icon ?? 'view_agenda'}</span><b>{tipo?.txt ?? 'Guía por tipo de pelo'}</b>
                {puede && <span className="bblk__acts">
                  <button type="button" className="vrow__x" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><span className="ms">arrow_upward</span></button>
                  <button type="button" className="vrow__x" aria-label="Bajar" disabled={i === a.cuerpo.length - 1} onClick={() => mover(i, 1)}><span className="ms">arrow_downward</span></button>
                  <button type="button" className="vrow__x" aria-label="Quitar" onClick={() => set({ cuerpo: a.cuerpo.filter((_, n) => n !== i) })}><span className="ms">close</span></button>
                </span>}
              </div>
              {(b.t === 'p' || b.t === 'tip') && <textarea className="cell" rows={b.t === 'p' ? 4 : 2} aria-label={tipo?.txt} disabled={!puede} value={b.text} placeholder={b.t === 'tip' ? 'Ej: Si notas la piel roja, escríbenos antes de cambiar de shampoo.' : 'Escribe aquí…'} onChange={(x) => setB(i, { ...b, text: x.target.value })} />}
              {b.t === 'h2' && <input className="cell bblk__h2" aria-label="Subtítulo" disabled={!puede} value={b.text} placeholder="Ej: Una guía rápida" onChange={(x) => setB(i, { ...b, text: x.target.value })} />}
              {b.t === 'ul' && <><textarea className="cell" rows={Math.max(3, b.items.length + 1)} aria-label="Lista" disabled={!puede} value={b.items.join('\n')} onChange={(x) => setB(i, { ...b, items: x.target.value.split('\n') })} /><small className="sfld__help">Un punto por línea.</small></>}
              {b.t === 'product' && (prods.length
                ? <select className="cell" aria-label="Producto" disabled={!puede} value={b.id} onChange={(x) => setB(i, { ...b, id: x.target.value })}>{prods.map((p) => <option key={p.slug} value={p.slug}>{p.nombre}</option>)}</select>
                : <p className="hint">Primero agrega productos en <a href={link('/gestor/productos')}>Productos e inventario</a>.</p>)}
              {b.t === 'spa' && <p className="hint">Tarjeta con el botón «Agenda un baño en el spa».</p>}
              {b.t === 'ask' && <p className="hint">Tarjeta con el botón para escribirle a la doctora por WhatsApp.</p>}
              {b.t === 'guide' && <p className="hint">{b.items.map((x) => x.title).join(' · ')}</p>}
            </div>
          );
        })}
        {puede && <div className="badd" role="group" aria-label="Agregar al artículo">
          {TIPOS.map((t) => <button key={t.t} type="button" className="filt" onClick={() => set({ cuerpo: [...a.cuerpo, vacio(t.t, prods)] })}><span className="ms" aria-hidden="true">{t.icon}</span>{t.txt}</button>)}
        </div>}
      </div>

      <div className="sgo">
        <span>{DOMINIO} › blog › {a.slug || slugDe(a.titulo || 'nuevo-articulo')}</span>
        <b>{(a.titulo || 'Título del artículo') + ' · Blog Alma Animal'}</b>
        <p>{a.resumen || 'El resumen sale aquí.'}</p>
      </div>

      {puede && (
        <div className="bpub">
          <h3 className="ch2"><span className="ms" aria-hidden="true">send</span>Publicar</h3>
          <Seg label="Cuándo" value={modo} opts={[['ahora', 'Ahora'], ['programar', 'Programar']]} onChange={setModo} />
          {modo === 'programar' && <div className="bpub__f">
            <div className="sfld"><label htmlFor="bpd">Día</label><input id="bpd" type="date" className="cell" value={dia} onChange={(x) => setDia(x.target.value)} /></div>
            <div className="sfld"><label htmlFor="bph">Hora</label><input id="bph" type="time" className="cell" step={900} value={hora} onChange={(x) => setHora(x.target.value)} /></div>
          </div>}
          <div className="dacts">
            <button type="button" className="gbtn" disabled={ocupado} onClick={() => guardar('publicado')}><span className="ms" aria-hidden="true">{modo === 'programar' ? 'schedule_send' : 'publish'}</span>{publicadoYa && modo === 'ahora' ? 'Guardar y publicar' : modo === 'programar' ? 'Programar' : 'Publicar'}</button>
            <button type="button" className="gbtn out" disabled={ocupado} onClick={() => guardar('borrador')}>{publicadoYa ? 'Pasar a borrador' : 'Guardar borrador'}</button>
            {a.id && <button type="button" className="gbtn ghost" disabled={ocupado} onClick={async () => { if (!confirm(`¿Borrar «${a.titulo}»? No se puede deshacer.`)) return; try { await borrarArticulo(a); borrado(a); } catch (x) { error((x as Error).message); } }}><span className="ms" aria-hidden="true">delete</span>Borrar</button>}
          </div>
          {listo && <p className="bpub__ok"><span className="ms" aria-hidden="true">check_circle</span>{listo}
            <button type="button" className="link-add" onClick={() => navigator.clipboard?.writeText(url).then(() => error('Enlace copiado'))}><span className="ms" aria-hidden="true">content_copy</span>Copiar enlace</button></p>}
          <p className="hint">Al publicar o corregir, la página del blog se actualiza sola en unos 10 minutos. Para compartirlo en Instagram o en tus estados de WhatsApp, usa «Copiar enlace».</p>
        </div>
      )}
    </section>
  );
}
