// Productos e inventario: lectura y guardado en Supabase (tablas productos, variantes, movimientos, ajustes).
// El stock solo cambia con movimientos (entrada, ajuste, venta en consultorio); las ventas web las descuenta
// Supabase solo al confirmar el pedido. Sin Supabase se trabaja con los productos de ejemplo en memoria.
import { sb, DEMO, store } from './lib';
import { PRODUCTS } from '../data/shop';
import { TONOS } from '../scripts/catalogo';

export interface Var { id?: string; nombre: string; codigo: string | null; precio: number; costo: number; stock: number; orden: number; activo: boolean }
export interface Prod {
  id?: string; slug: string; nombre: string; categoria: string; para: string[]; tamanos: string[]; marca: string | null;
  descripcion: string; tipo_variante: string | null; etiquetas: string[]; icono: string; tono: string;
  caracteristicas: [string, string][]; fotos: string[]; precio_antes: number | null; codigo: string | null;
  aviso_stock: number; pauta_mes: number; envio_unidad: number; visible: boolean; orden: number; creado?: string;
  variantes: Var[];
}
export interface Venta { variante_id: string; cantidad: number; precio: number | null; motivo: string; creado: string }
export type Motivo = 'ingreso' | 'ajuste' | 'venta_consultorio';

export const CATEGORIAS = [['alimento', 'Alimento'], ['higiene', 'Higiene'], ['accesorios', 'Accesorios'], ['snacks', 'Snacks'], ['juguetes', 'Juguetes']] as const;
export const TIPOS_VARIANTE = ['Presentación', 'Talla', 'Sabor', 'Color', 'Peso'];
export const ICONOS = ['pets', 'soap', 'set_meal', 'cookie', 'brush', 'sports_baseball', 'loyalty', 'clean_hands', 'medication', 'checkroom'];
export const ETIQUETAS_MANUALES = [['top', '🔥', 'Más vendido'], ['dra', '🩺', 'Lo recomienda la Dra.'], ['nuevo', '✨', 'Nuevo']] as const;

export const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'producto';
export const nuevoProducto = (): Prod => ({
  slug: '', nombre: '', categoria: 'higiene', para: ['perro', 'gato'], tamanos: [], marca: null, descripcion: '', tipo_variante: null,
  etiquetas: ['nuevo'], icono: 'pets', tono: 'lav', caracteristicas: [], fotos: [], precio_antes: null, codigo: null,
  aviso_stock: 3, pauta_mes: 0, envio_unidad: 0, visible: true, orden: 0,
  variantes: [{ nombre: 'Único', codigo: null, precio: 0, costo: 0, stock: 0, orden: 0, activo: true }]
});
export const stockTotal = (p: Prod) => p.variantes.filter((v) => v.activo).reduce((s, v) => s + Math.max(0, v.stock), 0);
export const pocoStock = (p: Prod) => p.variantes.some((v) => v.activo && v.stock <= p.aviso_stock);

const CAMPOS = 'id,slug,nombre,categoria,para,tamanos,marca,descripcion,tipo_variante,etiquetas,icono,tono,caracteristicas,fotos,precio_antes,codigo,aviso_stock,pauta_mes,envio_unidad,visible,orden,creado,variantes(id,nombre,codigo,precio,costo,stock,orden,activo)';
const ordenar = (p: Prod): Prod => ({ ...p, variantes: [...p.variantes].sort((a, b) => a.orden - b.orden) });

/* ---------- modo de ejemplo ---------- */
const KEY = 'alma-gestor-productos-ejemplo';
const MOV_KEY = 'alma-gestor-movimientos-ejemplo';
const TONO_DE: Record<string, string> = Object.fromEntries(Object.entries(TONOS).map(([k, v]) => [v, k]));
function ejemplo(): Prod[] {
  return store.get<Prod[]>(KEY) ?? PRODUCTS.map((p, i) => ({
    id: 'ej-' + p.id, slug: p.id, nombre: p.name, categoria: p.cat, para: p.for, tamanos: p.sizes, marca: null, descripcion: p.text,
    tipo_variante: p.variants.length > 1 ? p.variantKind ?? 'Presentación' : null, etiquetas: p.tag && p.tag !== 'oferta' ? [p.tag] : [],
    icono: p.icon, tono: TONO_DE[p.tone] ?? 'lav', caracteristicas: p.specs ?? [], fotos: [], precio_antes: p.variants.find((v) => v.was)?.was ?? null,
    codigo: null, aviso_stock: 3, pauta_mes: 0, envio_unidad: 0, visible: true, orden: i, creado: p.added,
    variantes: p.variants.map((v, k) => ({ id: `ej-${p.id}-${v.id}`, nombre: v.label, codigo: null, precio: v.price, costo: Math.round(v.price * 0.55 / 100) * 100, stock: v.stock, orden: k, activo: true }))
  }));
}

/* ---------- lectura ---------- */
export async function listar(): Promise<Prod[]> {
  if (DEMO) return ejemplo();
  const { data, error } = await sb!.from('productos').select(CAMPOS).order('orden').order('creado', { ascending: false });
  if (error) throw new Error('No pudimos cargar los productos. Revisa tu conexión.');
  return (data as unknown as Prod[]).map(ordenar);
}

// ventas del mes (web y consultorio), para el resumen y el inventario
export async function ventasMes(): Promise<Venta[]> {
  const desde = new Date(); desde.setDate(1); desde.setHours(0, 0, 0, 0);
  if (DEMO) return (store.get<Venta[]>(MOV_KEY) ?? []).filter((m) => m.creado >= desde.toISOString());
  const { data, error } = await sb!.from('movimientos').select('variante_id,cantidad,precio,motivo,creado')
    .in('motivo', ['venta_web', 'venta_consultorio', 'devolucion']).gte('creado', desde.toISOString());
  if (error) return [];
  return data as Venta[];
}

/* ---------- guardado ---------- */
// guarda el producto y sus variantes; las variantes quitadas se desactivan (se conserva su historial)
export async function guardar(p: Prod, quitadas: string[]): Promise<Prod> {
  const limpio = { ...p, slug: p.slug || slugify(p.nombre), nombre: p.nombre.trim(), marca: p.marca?.trim() || null, codigo: p.codigo?.trim() || null };
  if (DEMO) {
    const lista = ejemplo();
    const id = limpio.id ?? 'ej-' + Date.now();
    const variantes = limpio.variantes.map((v, k) => ({ ...v, id: v.id ?? `${id}-v${Date.now()}${k}`, orden: k }))
      .concat(lista.find((x) => x.id === id)?.variantes.filter((v) => quitadas.includes(v.id!)).map((v) => ({ ...v, activo: false })) ?? []);
    const nuevo = { ...limpio, id, creado: limpio.creado ?? new Date().toISOString(), variantes };
    store.set(KEY, lista.some((x) => x.id === id) ? lista.map((x) => (x.id === id ? nuevo : x)) : [nuevo, ...lista]);
    return nuevo;
  }
  const { variantes, id, creado, ...fila } = limpio; // eslint-disable-line @typescript-eslint/no-unused-vars
  // dirección única: si ya existe, se le agrega un número
  let slug = fila.slug;
  for (let n = 2; ; n++) {
    const { data } = await sb!.from('productos').select('id').eq('slug', slug).maybeSingle();
    if (!data || data.id === id) break;
    slug = `${fila.slug}-${n}`;
  }
  const res = id
    ? await sb!.from('productos').update({ ...fila, slug }).eq('id', id).select('id').single()
    : await sb!.from('productos').insert({ ...fila, slug }).select('id').single();
  if (res.error) throw new Error('No se guardó el producto. Revisa los datos e inténtalo de nuevo.');
  const pid = res.data.id as string;
  for (const [k, v] of variantes.entries()) {
    const datos = { nombre: v.nombre.trim() || 'Único', codigo: v.codigo?.trim() || null, precio: v.precio, costo: v.costo, orden: k, activo: true };
    const r = v.id
      ? await sb!.from('variantes').update(datos).eq('id', v.id)
      : await sb!.from('variantes').insert({ ...datos, producto_id: pid, stock: Math.max(0, v.stock) });
    if (r.error) throw new Error('El producto se guardó, pero falló una variante. Revísala e inténtalo de nuevo.');
  }
  if (quitadas.length) await sb!.from('variantes').update({ activo: false }).in('id', quitadas);
  const { data } = await sb!.from('productos').select(CAMPOS).eq('id', pid).single();
  return ordenar(data as unknown as Prod);
}

export async function borrar(p: Prod): Promise<void> {
  if (DEMO) { store.set(KEY, ejemplo().filter((x) => x.id !== p.id)); return; }
  const { error } = await sb!.from('productos').delete().eq('id', p.id!);
  if (error) throw new Error('No se pudo eliminar. Puedes ocultarlo de la tienda en su lugar.');
}

// entrada, ajuste o venta en consultorio: el stock se suma o resta solo
export async function mover(v: Var, cantidad: number, motivo: Motivo): Promise<void> {
  if (DEMO) {
    store.set(KEY, ejemplo().map((p) => ({ ...p, variantes: p.variantes.map((x) => (x.id === v.id ? { ...x, stock: x.stock + cantidad } : x)) })));
    if (motivo === 'venta_consultorio') store.set(MOV_KEY, [...(store.get<Venta[]>(MOV_KEY) ?? []), { variante_id: v.id!, cantidad, precio: v.precio, motivo, creado: new Date().toISOString() }]);
    return;
  }
  const { error } = await sb!.from('movimientos').insert({ variante_id: v.id, cantidad, motivo, precio: motivo === 'venta_consultorio' ? v.precio : null });
  if (error) throw new Error('No se guardó el movimiento de inventario. Inténtalo de nuevo.');
}

/* ---------- fotos ---------- */
// se reduce a 1200 px y se guarda como WebP (pesa poco y se ve bien)
export async function comprimir(file: File, max = 1200): Promise<Blob> {
  const img = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
  c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('foto'))), 'image/webp', 0.82));
}
export async function subirFoto(file: File, slug: string): Promise<string> {
  const blob = await comprimir(file);
  if (DEMO) return URL.createObjectURL(blob);
  const ruta = `${slug || 'producto'}/${Date.now()}.webp`;
  const { error } = await sb!.storage.from('productos').upload(ruta, blob, { contentType: 'image/webp', cacheControl: '31536000' });
  if (error) throw new Error('No se pudo subir la foto. Revisa tu conexión.');
  return sb!.storage.from('productos').getPublicUrl(ruta).data.publicUrl;
}
export async function borrarFoto(url: string): Promise<void> {
  if (DEMO || !url.includes('/storage/v1/object/public/productos/')) return;
  await sb!.storage.from('productos').remove([url.split('/productos/')[1]]);
}

/* ---------- avisos de compra ---------- */
export interface Avisos { activo: boolean; cada: number }
export async function leerAvisos(): Promise<Avisos> {
  if (DEMO) return store.get<Avisos>('alma-gestor-avisos-ejemplo') ?? { activo: true, cada: 20 };
  const { data } = await sb!.from('ajustes').select('valor').eq('clave', 'avisos_compra').maybeSingle();
  return (data?.valor as Avisos) ?? { activo: true, cada: 20 };
}
export async function guardarAvisos(a: Avisos): Promise<void> {
  if (DEMO) { store.set('alma-gestor-avisos-ejemplo', a); return; }
  const { error } = await sb!.from('ajustes').update({ valor: a }).eq('clave', 'avisos_compra');
  if (error) throw new Error('Solo la administradora puede cambiar los avisos.');
}
