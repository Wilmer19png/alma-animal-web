// Pedidos de la tienda: lectura, cambios de estado y textos. Los datos vienen de la tabla "pedidos"
// (los crea el carrito del sitio). Sin Supabase se usan pedidos de ejemplo + los que se hagan en la vista previa.
import { sb, DEMO, store, money } from './lib';

export type Estado = 'nuevo' | 'confirmado' | 'pagado' | 'enviado' | 'entregado' | 'cancelado';
export type Pago = 'pendiente' | 'transferencia' | 'contraentrega' | 'consultorio' | 'en_linea';
export interface Item { id: string; nombre: string; variante: string; precio: number; cantidad: number }
export interface Pedido {
  id: string; numero: number; codigo: string; creado: string; estado: Estado; pago: Pago;
  nombre: string; apellido: string; celular: string; correo: string | null;
  departamento: string; ciudad: string; direccion: string; barrio: string; indicaciones: string | null;
  items: Item[]; subtotal: number; envio: number; prioritario: boolean; total: number; obsequio: boolean;
  nota_interna: string | null;
}
export type Cambio = Partial<Pick<Pedido, 'estado' | 'pago' | 'nota_interna'>>;

export const ESTADOS: Record<Estado, { txt: string; bg: string; fg: string }> = {
  nuevo: { txt: 'Nuevo', bg: '#FFDCC3', fg: '#623F21' },
  confirmado: { txt: 'Cliente confirmó', bg: '#EADDFF', fg: '#4D3F6C' },
  pagado: { txt: 'Pago recibido', bg: '#D1C1DD', fg: '#372C42' },
  enviado: { txt: 'Enviado', bg: '#F2ECF2', fg: '#2B1E48' },
  entregado: { txt: 'Entregado', bg: '#B8F1B9', fg: '#1D5128' },
  cancelado: { txt: 'Cancelado', bg: '#FFDAD5', fg: '#910809' }
};
export const PAGOS: { id: Pago; txt: string; icon: string }[] = [
  { id: 'pendiente', txt: 'Por definir', icon: 'help' },
  { id: 'transferencia', txt: 'Transferencia o Nequi', icon: 'account_balance' },
  { id: 'contraentrega', txt: 'Contraentrega', icon: 'local_atm' },
  { id: 'consultorio', txt: 'En el consultorio', icon: 'storefront' }
];
export const pagoTxt = (p: Pago) => PAGOS.find((x) => x.id === p)?.txt ?? 'En línea';

// Pasos del pedido. Si paga contra entrega (o al recoger), el pago llega con la entrega.
export const pagaAlRecibir = (p: Pedido) => p.pago === 'contraentrega' || p.pago === 'consultorio';
export const pasos = (p: Pedido) => {
  const alRecibir = pagaAlRecibir(p);
  const orden: Estado[] = ['nuevo', 'confirmado', 'pagado', 'enviado', 'entregado'];
  const i = orden.indexOf(p.estado);
  return [
    { id: 'nuevo', txt: 'Nuevo', icon: 'inbox' },
    { id: 'confirmado', txt: 'Cliente confirmó', icon: 'chat' },
    { id: 'pagado', txt: alRecibir ? 'Paga al recibir' : 'Pago recibido', icon: alRecibir ? 'local_atm' : 'account_balance' },
    { id: 'enviado', txt: p.pago === 'consultorio' ? 'Listo para recoger' : 'Enviado', icon: p.pago === 'consultorio' ? 'storefront' : 'local_shipping' },
    { id: 'entregado', txt: 'Entregado', icon: 'done_all' }
  ].map((s, k) => ({
    ...s,
    // con pago al recibir, el paso de pago se marca hecho cuando se entrega
    hecho: p.estado !== 'cancelado' && (s.id === 'pagado' && alRecibir ? p.estado === 'entregado' : k <= i),
    ahora: p.estado !== 'cancelado' && k === i
  }));
};

// siguiente acción del botón principal
export const siguiente = (p: Pedido): { a: Estado; txt: string } | null => {
  switch (p.estado) {
    case 'nuevo': return { a: 'confirmado', txt: 'Marcar: cliente confirmó' };
    case 'confirmado': return pagaAlRecibir(p)
      ? { a: 'enviado', txt: p.pago === 'consultorio' ? 'Marcar: listo para recoger' : 'Marcar: enviado' }
      : { a: 'pagado', txt: 'Marcar: pago recibido' };
    case 'pagado': return { a: 'enviado', txt: 'Marcar: enviado' };
    case 'enviado': return { a: 'entregado', txt: pagaAlRecibir(p) ? 'Marcar: entregado y pagado' : 'Marcar: entregado' };
    default: return null;
  }
};

// mensaje de confirmación para WhatsApp, armado con los datos del pedido
export const mensaje = (p: Pedido) => [
  `Hola, ${p.nombre} 👋 Te escribimos de Alma Animal para confirmar tu pedido ${p.codigo}:`,
  ...p.items.map((it) => `• ${it.cantidad} × ${it.nombre}${it.variante && !/^(único|única)$/i.test(it.variante) ? ` (${it.variante})` : ''} — ${money(it.precio * it.cantidad)}`),
  `Envío: ${p.envio === 0 ? 'gratis' : money(p.envio)}${p.prioritario ? ' + prioritario' : ''}`,
  `Total: ${money(p.total)}`,
  p.obsequio ? '🎁 Va con un snack dental de obsequio.' : '',
  '',
  p.pago === 'consultorio' ? 'Lo recoges en el consultorio: Calle 1 # 9-02, Alfonso López.' : `Lo enviamos a: ${p.direccion}, barrio ${p.barrio}, ${p.ciudad}.`,
  p.pago === 'pendiente' ? '¿Nos confirmas que los datos están bien y cómo prefieres pagar: transferencia, Nequi o contra entrega?' : '¿Nos confirmas que los datos están bien?'
].filter((x, i, a) => x !== '' || a[i - 1] !== '').join('\n');

/* ---------------- datos ---------------- */

const EJEMPLO_KEY = 'alma-gestor-pedidos-ejemplo';
const hace = (min: number) => new Date(Date.now() - min * 60000).toISOString();
const ej = (o: Partial<Pedido> & Pick<Pedido, 'numero' | 'nombre' | 'apellido' | 'items'>): Pedido => {
  const subtotal = o.items.reduce((s, it) => s + it.precio * it.cantidad, 0);
  const ciudad = o.ciudad ?? 'Pereira';
  const local = ciudad === 'Pereira' || ciudad === 'Dosquebradas';
  const envio = local || subtotal >= 70000 ? 0 : 20000;
  const prioritario = o.prioritario ?? false;
  return {
    id: 'ej-' + o.numero, codigo: 'AA-EJ' + o.numero, creado: hace(60), estado: 'nuevo', pago: 'pendiente',
    celular: '300 123 4567', correo: null, departamento: 'Risaralda', direccion: 'Calle 19 # 8-34', barrio: 'Álamos',
    indicaciones: null, nota_interna: null, ...o, ciudad, subtotal, envio, prioritario,
    total: subtotal + envio + (prioritario ? 5000 : 0), obsequio: subtotal >= 85000
  } as Pedido;
};
const EJEMPLOS: Pedido[] = [
  ej({ numero: 1043, nombre: 'Laura', apellido: 'Gómez Restrepo', celular: '300 123 4567', correo: 'laura@correo.com', direccion: 'Calle 19 # 8-34, apto 302', barrio: 'Álamos', indicaciones: 'Dejar en portería, torre 2.', prioritario: true, creado: hace(35),
    items: [{ id: 'shampoo-hipoalergenico', nombre: 'Shampoo hipoalergénico', variante: '250 ml', precio: 28000, cantidad: 1 }, { id: 'galletas-entrenamiento', nombre: 'Galletas para entrenamiento', variante: '200 g', precio: 12000, cantidad: 2 }] }),
  ej({ numero: 1042, nombre: 'Andrés', apellido: 'Ospina', celular: '312 456 7890', correo: 'andres.ospina@correo.com', departamento: 'Caldas', ciudad: 'Manizales', direccion: 'Carrera 23 # 45-10', barrio: 'Palermo', indicaciones: 'Llamar antes de llegar.', creado: hace(150),
    items: [{ id: 'concentrado-adulto-pequena', nombre: 'Concentrado adulto raza pequeña', variante: '2 kg', precio: 45000, cantidad: 1 }, { id: 'toallitas-patas', nombre: 'Toallitas húmedas para patas', variante: '50 unidades', precio: 15000, cantidad: 1 }] }),
  ej({ numero: 1041, nombre: 'Valentina', apellido: 'Ríos', celular: '311 222 0099', ciudad: 'Dosquebradas', direccion: 'Manzana 4, casa 12', barrio: 'La Pradera', estado: 'confirmado', pago: 'contraentrega', creado: hace(60 * 20),
    items: [{ id: 'collar-placa', nombre: 'Collar con placa de nombre', variante: 'Lila', precio: 25000, cantidad: 1 }, { id: 'pelota-caucho', nombre: 'Pelota de caucho resistente', variante: 'Única', precio: 9000, cantidad: 1 }] }),
  ej({ numero: 1040, nombre: 'Camilo', apellido: 'Herrera', celular: '301 987 6543', correo: 'camilo.h@correo.com', departamento: 'Valle del Cauca', ciudad: 'Cali', direccion: 'Avenida 6N # 28-15, apto 501', barrio: 'Granada', prioritario: true, estado: 'enviado', pago: 'transferencia', creado: hace(60 * 50), nota_interna: 'Salió con Interrapidísimo, guía 7001234.',
    items: [{ id: 'cepillo-deslanador', nombre: 'Cepillo deslanador', variante: 'Único', precio: 32000, cantidad: 1 }, { id: 'galletas-entrenamiento', nombre: 'Galletas para entrenamiento', variante: '200 g', precio: 12000, cantidad: 5 }] }),
  ej({ numero: 1039, nombre: 'Sofía', apellido: 'Arango', celular: '310 555 1212', correo: 'sofia.arango@correo.com', direccion: 'Calle 1 # 12-40', barrio: 'Alfonso López', estado: 'entregado', pago: 'contraentrega', creado: hace(60 * 75),
    items: [{ id: 'alimento-humedo-gato', nombre: 'Alimento húmedo para gato', variante: 'Salmón', precio: 6500, cantidad: 6 }] })
];

// pedidos de ejemplo + los que se hicieron en la vista previa del carrito (que no tiene Supabase)
function ejemplos(): Pedido[] {
  const guardados = store.get<Pedido[]>(EJEMPLO_KEY);
  const base = guardados ?? EJEMPLOS;
  const delCarrito = store.get<Pedido[]>('alma-pedidos-vista-previa', globalThis.localStorage) ?? [];
  const nuevos = delCarrito.filter((c) => !base.some((b) => b.codigo === c.codigo));
  return [...nuevos, ...base].sort((a, b) => b.creado.localeCompare(a.creado));
}

export async function listar(): Promise<Pedido[]> {
  if (DEMO) return ejemplos();
  const { data, error } = await sb!.from('pedidos').select('*').order('creado', { ascending: false }).limit(300);
  if (error) throw new Error('No pudimos cargar los pedidos. Revisa tu conexión.');
  return data as Pedido[];
}

export async function cambiar(id: string, cambio: Cambio): Promise<void> {
  if (DEMO) {
    store.set(EJEMPLO_KEY, ejemplos().map((p) => (p.id === id ? { ...p, ...cambio } : p)));
    return;
  }
  const { error } = await sb!.from('pedidos').update(cambio).eq('id', id);
  if (error) throw new Error('No se guardó el cambio. Revisa tu conexión e inténtalo de nuevo.');
}
