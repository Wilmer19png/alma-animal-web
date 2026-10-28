// Tienda. Más adelante los productos, precios, existencias y ventas saldrán del gestor (Supabase).
// Mientras tanto el catálogo es de EJEMPLO: la página lo dice y no se publica así.
export const DEMO = true;

// Reglas de envío y obsequio (confirmadas con la Dra.)
export const SHIPPING = {
  localCities: ['Pereira', 'Dosquebradas'], // siempre gratis
  freeFrom: 70000, // gratis a toda Colombia desde este subtotal
  flat: 20000, // valor fijo si no aplica lo anterior
  priority: 5000 // envío prioritario
};
export const GIFT = { from: 85000, name: 'snack dental' };

export const CATEGORIES = [
  { id: 'alimento', label: 'Alimento' },
  { id: 'higiene', label: 'Higiene' },
  { id: 'accesorios', label: 'Accesorios' },
  { id: 'snacks', label: 'Snacks' },
  { id: 'juguetes', label: 'Juguetes' }
] as const;
export type Category = (typeof CATEGORIES)[number]['id'];

// etiquetas que se asignan desde el gestor
export const TAGS = {
  top: { label: '🔥 Más vendido', tone: '' },
  dra: { label: '🩺 Lo recomienda la Dra.', tone: '' },
  nuevo: { label: '✨ Nuevo', tone: '' },
  oferta: { label: '🏷️ Oferta', tone: 'sale' }
} as const;
export type Tag = keyof typeof TAGS;

export interface Variant { id: string; label: string; price: number; was?: number; stock: number }
export interface Product {
  id: string;
  name: string;
  cat: Category;
  for: ('perro' | 'gato')[];
  sizes: ('pequeno' | 'mediano' | 'grande')[];
  variantKind?: string; // "Presentación", "Talla", "Sabor", "Color"
  variants: Variant[];
  tag?: Tag;
  icon: string; // mientras no haya foto
  tone: string;
  sold: number; // para "Más vendidos"
  added: string; // para "Nuevos"
  text: string;
  specs?: [string, string][]; // características que se muestran en la ficha (sin marcadores: si no hay dato, no sale)
}

const T = {
  lav: 'linear-gradient(160deg,#EADDFF,#D1C1DD)',
  peach: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)',
  rose: 'linear-gradient(160deg,#FBCFAF,#E8C6CF)',
  mix: 'linear-gradient(160deg,#E8C6CF,#D1C1DD)'
};

export const PRODUCTS: Product[] = [
  { id: 'shampoo-hipoalergenico', name: 'Shampoo hipoalergénico', cat: 'higiene', for: ['perro', 'gato'], sizes: ['pequeno', 'mediano', 'grande'], variantKind: 'Presentación', tag: 'top', icon: 'soap', tone: T.lav, sold: 140, added: '2026-03-01',
    text: 'Libre de parabenos, para pieles sensibles. El mismo que usamos en el spa.',
    variants: [{ id: '250', label: '250 ml', price: 28000, stock: 12 }, { id: '500', label: '500 ml', price: 42000, stock: 8 }, { id: '1000', label: '1 litro', price: 68000, stock: 0 }],
    specs: [['Tipo de piel', 'Sensible'], ['Libre de', 'Parabenos'], ['Modo de uso', 'Aplicar sobre el pelo húmedo, masajear y enjuagar bien.']] },
  { id: 'concentrado-adulto-pequena', name: 'Concentrado adulto raza pequeña', cat: 'alimento', for: ['perro'], sizes: ['pequeno'], variantKind: 'Presentación', tag: 'dra', icon: 'set_meal', tone: T.peach, sold: 120, added: '2026-02-10',
    text: 'Croqueta pequeña, alta en proteína y fácil de digerir.',
    variants: [{ id: '2kg', label: '2 kg', price: 45000, stock: 10 }, { id: '4kg', label: '4 kg', price: 82000, stock: 6 }, { id: '8kg', label: '8 kg', price: 150000, stock: 3 }],
    specs: [['Etapa', 'Adulto (desde 1 año)'], ['Proteína', 'Pollo y arroz']] },
  { id: 'pechera-ajustable', name: 'Pechera ajustable', cat: 'accesorios', for: ['perro'], sizes: ['pequeno', 'mediano', 'grande'], variantKind: 'Talla', tag: 'nuevo', icon: 'pets', tone: T.mix, sold: 35, added: '2026-10-01',
    text: 'Acolchada y con broche de seguridad. No aprieta el cuello.',
    variants: [{ id: 'xs', label: 'XS', price: 35000, stock: 3 }, { id: 's', label: 'S', price: 35000, stock: 5 }, { id: 'm', label: 'M', price: 38000, stock: 5 }, { id: 'l', label: 'L', price: 42000, stock: 2 }],
    specs: [['Material', 'Malla acolchada'], ['Cómo medir', 'Mide el pecho detrás de las patas delanteras.']] },
  { id: 'galletas-entrenamiento', name: 'Galletas para entrenamiento', cat: 'snacks', for: ['perro'], sizes: ['pequeno', 'mediano', 'grande'], tag: 'top', icon: 'cookie', tone: T.rose, sold: 160, added: '2026-01-15',
    text: 'Bocados pequeños para premiar sin pasarse de calorías.',
    variants: [{ id: 'u', label: '200 g', price: 12000, stock: 25 }] },
  { id: 'cepillo-deslanador', name: 'Cepillo deslanador', cat: 'higiene', for: ['perro', 'gato'], sizes: ['mediano', 'grande'], icon: 'brush', tone: T.lav, sold: 48, added: '2026-04-20',
    text: 'Retira el pelo muerto sin maltratar el manto.',
    variants: [{ id: 'u', label: 'Único', price: 32000, stock: 7 }] },
  { id: 'pelota-caucho', name: 'Pelota de caucho resistente', cat: 'juguetes', for: ['perro'], sizes: ['pequeno', 'mediano', 'grande'], tag: 'oferta', icon: 'sports_baseball', tone: T.peach, sold: 70, added: '2026-05-05',
    text: 'Rebota y flota. Aguanta mordidas fuertes.',
    variants: [{ id: 'u', label: 'Única', price: 9000, was: 12000, stock: 18 }] },
  { id: 'alimento-humedo-gato', name: 'Alimento húmedo para gato', cat: 'alimento', for: ['gato'], sizes: ['pequeno', 'mediano'], variantKind: 'Sabor', icon: 'set_meal', tone: T.mix, sold: 90, added: '2026-06-12',
    text: 'Sobre de 85 g con trozos en salsa.',
    variants: [{ id: 'pollo', label: 'Pollo', price: 6500, stock: 30 }, { id: 'salmon', label: 'Salmón', price: 6500, stock: 22 }] },
  { id: 'collar-placa', name: 'Collar con placa de nombre', cat: 'accesorios', for: ['perro', 'gato'], sizes: ['pequeno', 'mediano'], variantKind: 'Color', tag: 'nuevo', icon: 'loyalty', tone: T.rose, sold: 28, added: '2026-09-20',
    text: 'Te grabamos el nombre y tu celular en la placa.',
    variants: [{ id: 'lila', label: 'Lila', price: 25000, stock: 6 }, { id: 'durazno', label: 'Durazno', price: 25000, stock: 4 }, { id: 'negro', label: 'Morado oscuro', price: 25000, stock: 5 }] },
  { id: 'toallitas-patas', name: 'Toallitas húmedas para patas', cat: 'higiene', for: ['perro', 'gato'], sizes: ['pequeno', 'mediano', 'grande'], icon: 'clean_hands', tone: T.lav, sold: 55, added: '2026-07-01',
    text: 'Para limpiar las patitas después del paseo.',
    variants: [{ id: 'u', label: '50 unidades', price: 15000, stock: 3 }] }
];

// Compras recientes para el aviso "🔥 Laura, de Pereira, compró…".
// En el sitio real solo salen pedidos confirmados de clientes que dieron permiso (nombre sin apellido + ciudad).
export const RECENT_SALES = DEMO
  ? [
      { who: 'Laura', city: 'Pereira', product: 'shampoo-hipoalergenico', variant: '250 ml', minutesAgo: 12 },
      { who: 'Andrés', city: 'Dosquebradas', product: 'concentrado-adulto-pequena', variant: '4 kg', minutesAgo: 60 },
      { who: 'Valentina', city: 'Manizales', product: 'pechera-ajustable', variant: 'talla M', minutesAgo: 180 },
      { who: 'Camilo', city: 'Pereira', product: 'galletas-entrenamiento', variant: '', minutesAgo: 1440 }
    ]
  : [];

export const BUY_STEPS = [
  { title: 'Agrega al carrito', text: 'Envío gratis en Pereira y Dosquebradas, y en toda Colombia desde $70.000.' },
  { title: 'Llena tus datos de envío', text: 'Nombre, celular y dirección. Sin crear cuenta.' },
  { title: 'Te escribimos por WhatsApp', text: 'Confirmamos el pago y te avisamos cuándo llega.' }
];

export const money = (n: number) => '$' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
export const minPrice = (p: Product) => Math.min(...p.variants.map((v) => v.price));
export const stockOf = (p: Product) => p.variants.reduce((s, v) => s + v.stock, 0);
export const productUrl = (p: Product) => `/producto/${p.id}`;
export const catLabel = (id: string) => CATEGORIES.find((c) => c.id === id)!.label;
export const forLabel = (p: Product) => (p.for.length > 1 ? 'Perros y gatos' : p.for[0] === 'perro' ? 'Perros' : 'Gatos');
// lo que guarda el carrito de cada producto/variante (data-add)
export const cartPayload = (p: Product, v: Variant) => ({ id: p.id, name: p.name, variant: v.label, price: v.price, icon: p.icon, tone: p.tone, max: v.stock });
// "250 ml, 500 ml, 1 litro" o "4 tallas"
export const variantSummary = (p: Product) =>
  p.variants.length < 2 ? '' : p.variants.length > 3 ? `${p.variants.length} ${p.variantKind === 'Talla' ? 'tallas' : 'opciones'}` : p.variants.map((v) => v.label).join(', ');
