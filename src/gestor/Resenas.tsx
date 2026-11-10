// Reseñas que dejan los clientes en las páginas de producto (tabla resenas, supabase/28-resenas.sql).
// Llegan «pendientes» y solo salen en la página cuando alguien del equipo las publica.
// Aquí no se edita lo que escribió el cliente: solo se publica, se oculta o se borra.
import { useEffect, useState } from 'react';
import Shell from './Shell';
import { sb, DEMO, store, when } from './lib';

type Estado = 'pendiente' | 'publicada' | 'oculta';
interface Resena { id: string; creado: string; producto: string; nombre: string; ciudad: string | null; estrellas: number; comentario: string; foto: string | null; estado: Estado }

const K = 'alma-ej-resenas';
const ej = (): Resena[] => store.get<Resena[]>(K) ?? [
  { id: 'ej1', creado: new Date(Date.now() - 3600e3).toISOString(), producto: 'bano-sanitario-perros', nombre: 'Ejemplo', ciudad: 'Pereira', estrellas: 5, comentario: 'Reseña de ejemplo para revisar el diseño.', foto: null, estado: 'pendiente' }
];
async function listar(): Promise<Resena[]> {
  if (DEMO) return ej();
  const { data, error } = await sb!.from('resenas').select('*').order('creado', { ascending: false }).limit(300);
  if (error) throw new Error('No pudimos cargar las reseñas. ¿Ya se corrió supabase/28-resenas.sql?');
  return data as Resena[];
}
async function cambiar(r: Resena, estado: Estado) {
  if (DEMO) { store.set(K, ej().map((x) => (x.id === r.id ? { ...x, estado } : x))); return; }
  const { error } = await sb!.from('resenas').update({ estado }).eq('id', r.id);
  if (error) throw new Error('No se guardó el cambio.');
}
async function borrar(r: Resena) {
  if (DEMO) { store.set(K, ej().filter((x) => x.id !== r.id)); return; }
  if (r.foto?.includes('/storage/v1/object/public/resenas/')) await sb!.storage.from('resenas').remove([r.foto.split('/resenas/')[1]]);
  const { error } = await sb!.from('resenas').delete().eq('id', r.id);
  if (error) throw new Error('No se borró.');
}

const TABS: { id: Estado; txt: string; icon: string }[] = [
  { id: 'pendiente', txt: 'Por revisar', icon: 'hourglass_top' },
  { id: 'publicada', txt: 'Publicadas', icon: 'visibility' },
  { id: 'oculta', txt: 'Ocultas', icon: 'visibility_off' }
];
const PRODUCTO: Record<string, string> = { 'bano-sanitario-perros': 'Baño Sanitario para Perros' };

export default function ResenasPagina() {
  const [lista, setLista] = useState<Resena[] | null>(null);
  const [tab, setTab] = useState<Estado>('pendiente');
  const [aviso, setAviso] = useState('');
  const [ocupado, setOcupado] = useState('');
  const cargar = () => listar().then(setLista).catch((e) => { setLista([]); setAviso((e as Error).message); });
  useEffect(() => { cargar(); }, []);
  useEffect(() => { if (!aviso) return; const t = window.setTimeout(() => setAviso(''), 4000); return () => window.clearTimeout(t); }, [aviso]);

  const accion = async (r: Resena, que: Estado | 'borrar') => {
    if (que === 'borrar' && !window.confirm(`¿Borrar la reseña de ${r.nombre}? No se puede deshacer.`)) return;
    setOcupado(r.id);
    try {
      if (que === 'borrar') await borrar(r); else await cambiar(r, que);
      setAviso(que === 'publicada' ? 'Publicada. Ya se ve en la página.' : que === 'oculta' ? 'Oculta. Ya no se ve en la página.' : que === 'borrar' ? 'Borrada.' : 'Devuelta a «Por revisar».');
      await cargar();
    } catch (e) { setAviso((e as Error).message); }
    setOcupado('');
  };

  return (
    <Shell activo="resenas">
      {() => {
        if (!lista) return <p className="vacio">Cargando…</p>;
        const cuenta = (e: Estado) => lista.filter((r) => r.estado === e).length;
        const ver = lista.filter((r) => r.estado === tab);
        return (
          <div className="res">
            <div className="mhead">
              <div className="mhead__txt"><h1>Reseñas</h1><p>Lo que escriben los clientes en las páginas de producto. Solo se ven en la página las que publiques.</p></div>
              {DEMO && <span className="ex">Datos de ejemplo</span>}
            </div>
            <div className="tabs" role="tablist" aria-label="Estado de las reseñas">
              {TABS.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}><span className="ms" aria-hidden="true">{t.icon}</span>{t.txt}<span>{cuenta(t.id)}</span></button>)}
            </div>
            {!ver.length && <p className="vacio">{tab === 'pendiente' ? 'No hay reseñas por revisar.' : tab === 'publicada' ? 'Aún no hay reseñas publicadas.' : 'No hay reseñas ocultas.'}</p>}
            <ul className="res__lista">
              {ver.map((r) => (
                <li key={r.id} className="gcard res__item">
                  <div className="res__top">
                    <span className="res__stars" role="img" aria-label={`${r.estrellas} de 5 estrellas`}>{'★'.repeat(r.estrellas)}{'☆'.repeat(5 - r.estrellas)}</span>
                    <span className="res__meta">{when(r.creado)} · {PRODUCTO[r.producto] ?? r.producto}</span>
                  </div>
                  <p className="res__txt">{r.comentario}</p>
                  {r.foto && <a href={r.foto} target="_blank" rel="noopener"><img className="res__foto" src={r.foto} alt={`Foto de ${r.nombre}`} loading="lazy" /></a>}
                  <p className="res__autor"><b>{r.nombre}</b>{r.ciudad ? ` · ${r.ciudad}` : ''}</p>
                  <div className="res__acts">
                    {r.estado !== 'publicada' && <button type="button" className="gbtn sm" disabled={ocupado === r.id} onClick={() => accion(r, 'publicada')}><span className="ms" aria-hidden="true">publish</span>Publicar</button>}
                    {r.estado === 'publicada' && <button type="button" className="gbtn sm out" disabled={ocupado === r.id} onClick={() => accion(r, 'oculta')}><span className="ms" aria-hidden="true">visibility_off</span>Ocultar</button>}
                    {r.estado === 'pendiente' && <button type="button" className="gbtn sm out" disabled={ocupado === r.id} onClick={() => accion(r, 'oculta')}><span className="ms" aria-hidden="true">visibility_off</span>No publicar</button>}
                    {r.estado === 'oculta' && <button type="button" className="gbtn sm out" disabled={ocupado === r.id} onClick={() => accion(r, 'pendiente')}><span className="ms" aria-hidden="true">undo</span>Volver a revisar</button>}
                    <button type="button" className="gbtn sm ghost" disabled={ocupado === r.id} onClick={() => accion(r, 'borrar')}><span className="ms" aria-hidden="true">delete</span>Borrar</button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="gtoast" role="status" aria-live="polite">{aviso}</p>
          </div>
        );
      }}
    </Shell>
  );
}
