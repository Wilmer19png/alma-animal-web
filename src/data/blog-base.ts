// Blog: tipos, ilustraciones de portada, artículos de EJEMPLO y ayudas de texto.
// Lo usan la página (src/data/blog.ts) y el gestor (módulo Blog).
import heart from '../assets/identidad/logo.webp';
import heartPaper from '../assets/papel-corazon-v2.png';
import lobo from '../assets/identidad/lobo.webp';
import paw from '../assets/pata-perro-h.png';


export const BLOG_CATS = ['Cuidado', 'Vacunas', 'Gatos', 'Nutrición', 'Spa'] as const;
export type BlogCat = (typeof BLOG_CATS)[number];

export const COVERS = [
  { bg: 'linear-gradient(160deg,#FBCFAF,#E8C6CF)', img: heart, w: 0.34 },
  { bg: 'linear-gradient(160deg,#EADDFF,#D1C1DD)', img: heartPaper, w: 0.34 },
  { bg: 'linear-gradient(160deg,#FFDCC3,#D1C1DD)', img: lobo, w: 0.3 },
  { bg: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)', img: paw, w: 0.4 }
];

// Bloques con los que se arma un artículo (los mismos que tendrá el editor del gestor).
// En los textos, **así** va en negrita.
export type Block =
  | { t: 'p'; text: string }
  | { t: 'h2'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'tip'; text: string } // "Consejo de la doctora"
  | { t: 'guide'; items: { icon: string; title: string; big: string; text: string }[] }
  | { t: 'product'; id: string } // producto de la tienda recomendado
  | { t: 'spa' } // invitación a agendar baño
  | { t: 'ask' }; // pregúntale a la doctora por WhatsApp

// cover.foto: foto subida desde el gestor; si no hay, la ilustración de la marca
export interface Post { slug: string; cat: BlogCat; title: string; excerpt: string; min: number; date: string; body: Block[]; cover: (typeof COVERS)[number] & { foto?: string } }

export const EJEMPLOS: Omit<Post, 'cover'>[] = [
  { slug: 'cada-cuanto-banar-a-tu-perro', cat: 'Cuidado', title: '¿Cada cuánto bañar a tu perro según su tipo de pelo?', excerpt: 'No todos los perros necesitan el mismo ritmo. Te contamos cómo saberlo según el pelo y la piel de tu mascota.', min: 5, date: '2026-10-12',
    body: [
      { t: 'p', text: 'Bañar a tu perro muy seguido puede resecarle la piel, y hacerlo muy poco deja que se acumulen grasa, mugre y malos olores. El ritmo ideal depende sobre todo de **su tipo de pelo** y de cómo está **su piel**.' },
      { t: 'h2', text: 'Una guía rápida según el pelo' },
      { t: 'guide', items: [
        { icon: 'pets', title: 'Pelo corto', big: 'Cada 4 a 6 semanas', text: 'Labrador, beagle, pinscher. Con un cepillado semanal basta entre baños.' },
        { icon: 'waves', title: 'Pelo largo o rizado', big: 'Cada 3 a 4 semanas', text: 'Poodle, shih tzu, schnauzer. Necesitan corte y cepillado frecuente para evitar nudos.' },
        { icon: 'air', title: 'Doble capa', big: 'Cada 6 a 8 semanas', text: 'Golden, husky, pastor. Más que bañarlos, hay que deslanarlos bien.' }
      ] },
      { t: 'h2', text: 'Cuando la piel es sensible' },
      { t: 'p', text: 'Si tu perro se rasca mucho, tiene caspa o la piel roja, no lo bañes más seguido para «limpiarlo»: puede empeorar. En esos casos lo mejor es un **baño medicado** con la frecuencia que indique la doctora.' },
      { t: 'tip', text: 'Si al bañarlo notas la piel roja o mucha caspa, escríbenos antes de cambiar de shampoo.' },
      { t: 'h2', text: 'Entre baño y baño' },
      { t: 'ul', items: ['**Cepíllalo** dos o tres veces por semana: quita el pelo muerto y reparte la grasa natural.', '**Límpiale las patas** al volver del paseo, sobre todo si llovió.', '**Revisa sus oídos**: si huelen mal o tienen cera oscura, es momento de consulta.'] },
      { t: 'product', id: 'shampoo-hipoalergenico' },
      { t: 'h2', text: '¿Y si prefieres que lo bañemos nosotros?' },
      { t: 'p', text: 'En el spa ajustamos el baño a su pelo y su piel, y si vemos algo raro se lo contamos a la doctora, que está al lado. Sale con perfume, un accesorio y un snack.' },
      { t: 'spa' }
    ] },
  { slug: 'calendario-de-vacunas-cachorro', cat: 'Vacunas', title: 'El calendario de vacunas de un cachorro, paso a paso', excerpt: 'Qué vacunas necesita tu cachorro, a qué edad y por qué no hay que saltarse ninguna.', min: 4, date: '2026-09-28',
    body: [
      { t: 'p', text: 'Las vacunas protegen a tu cachorro de enfermedades graves y muy contagiosas, como el **parvovirus** y el **moquillo**. Por eso se aplican en varias dosis durante sus primeros meses.' },
      { t: 'h2', text: 'Cómo funciona el calendario' },
      { t: 'p', text: 'La primera vacuna suele ponerse entre las **6 y 8 semanas** de vida, y se repite cada pocas semanas hasta completar el esquema. Después viene un refuerzo cada año.' },
      { t: 'tip', text: 'Cada cachorro es distinto: en la primera consulta te damos su calendario exacto y queda guardado en tu portal.' },
      { t: 'h2', text: 'Mientras completa sus vacunas' },
      { t: 'ul', items: ['**No lo saques a parques** ni a lugares con muchos perros.', '**Desparasítalo** según te indique la doctora.', '**No te saltes ninguna dosis**: si se pasa la fecha, escríbenos y la reprogramamos.'] },
      { t: 'ask' }
    ] },
  { slug: 'senales-dolor-de-dientes-gato', cat: 'Gatos', title: 'Señales de que tu gato tiene dolor de dientes', excerpt: 'Los gatos esconden el dolor. Estas son las señales que debes mirar.', min: 4, date: '2026-09-15',
    body: [
      { t: 'p', text: 'Los gatos son expertos en disimular el dolor, así que los problemas de dientes suelen notarse tarde. Fíjate en **cómo come** y en **cómo se comporta**.' },
      { t: 'h2', text: 'Señales para estar pendiente' },
      { t: 'ul', items: ['**Mastica de un solo lado** o deja caer comida.', '**Mal aliento** fuerte y persistente.', '**Babea** o se toca la boca con la pata.', '**Come menos** o prefiere la comida blanda.'] },
      { t: 'tip', text: 'Si notas alguna de estas señales, no esperes: una revisión a tiempo evita extracciones.' },
      { t: 'ask' }
    ] },
  { slug: 'bano-medicado', cat: 'Spa', title: 'Baño medicado: qué es y cuándo lo necesita tu mascota', excerpt: 'Para pieles sensibles, con caspa o alergias. Te explicamos en qué se diferencia de un baño normal.', min: 3, date: '2026-09-02',
    body: [
      { t: 'p', text: 'El baño medicado usa productos pensados para **tratar la piel**, no solo para limpiar. Ayuda cuando hay picazón, caspa, enrojecimiento o alergias.' },
      { t: 'h2', text: '¿Cuándo lo recomendamos?' },
      { t: 'ul', items: ['Cuando se **rasca mucho** o se lame las patas.', 'Si tiene **caspa** o la piel grasosa.', 'Como parte de un **tratamiento** que indicó la doctora.'] },
      { t: 'p', text: 'En el spa cuesta **$5.000 más** que el baño normal para mascotas de hasta 10 kg.' },
      { t: 'spa' }
    ] },
  { slug: 'alimentos-prohibidos', cat: 'Nutrición', title: 'Alimentos de tu cocina que no debe comer tu mascota', excerpt: 'Uvas, cebolla, chocolate y otros que parecen inofensivos pero no lo son.', min: 5, date: '2026-08-20',
    body: [
      { t: 'p', text: 'Algunos alimentos que comemos todos los días pueden ser **tóxicos** para perros y gatos, incluso en poca cantidad.' },
      { t: 'h2', text: 'Los más peligrosos' },
      { t: 'ul', items: ['**Chocolate y café.**', '**Uvas y uvas pasas.**', '**Cebolla, ajo y cebollín**, también cocinados.', '**Chicles y dulces sin azúcar** (con xilitol).', '**Huesos cocinados**, que se astillan.'] },
      { t: 'tip', text: 'Si crees que tu mascota comió algo de esta lista, escríbenos de inmediato: no esperes a que aparezcan síntomas.' },
      { t: 'ask' }
    ] },
  { slug: 'preparar-mascota-cirugia', cat: 'Cuidado', title: 'Cómo preparar a tu mascota para una cirugía', excerpt: 'Ayuno, qué llevar el día de la cirugía y cómo cuidarla al volver a casa.', min: 6, date: '2026-08-05',
    body: [
      { t: 'p', text: 'Una buena preparación hace que la cirugía y la recuperación sean más tranquilas. Antes del día, la doctora te explica todo según el procedimiento.' },
      { t: 'h2', text: 'Antes de la cirugía' },
      { t: 'ul', items: ['**Ayuno** de comida según te indiquemos (normalmente desde la noche anterior).', '**Agua** hasta la hora que te digamos.', 'Trae su **carnet** y cuéntanos qué medicamentos toma.'] },
      { t: 'h2', text: 'Al volver a casa' },
      { t: 'ul', items: ['Un lugar **tranquilo y tibio** para descansar.', 'Que **no se lama la herida**: usa el collar si se lo dejamos.', 'Dale los **medicamentos** a la hora indicada.'] },
      { t: 'tip', text: 'Si la herida se pone roja, sale líquido o la notas decaída, escríbenos.' },
      { t: 'ask' }
    ] },
  { slug: 'gato-y-transportador', cat: 'Gatos', title: 'Tu gato y el transportador: cómo hacer que no sea un drama', excerpt: 'Trucos para que llegar a la consulta sea más tranquilo para los dos.', min: 3, date: '2026-07-22',
    body: [
      { t: 'p', text: 'Muchos gatos relacionan el transportador con el veterinario. La clave es que lo vea como **un lugar seguro** y no solo como el camino a la consulta.' },
      { t: 'h2', text: 'Trucos que funcionan' },
      { t: 'ul', items: ['**Déjalo abierto en casa** con una manta que huela a él.', 'Pon **premios** adentro de vez en cuando.', 'Cúbrelo con una **toalla** durante el viaje.', 'Llévalo **agarrado de abajo**, no solo de la manija.'] },
      { t: 'ask' }
    ] }
];



const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const shortDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const postUrl = (p: Post) => `/blog/${p.slug}`;
const MONTHS_LONG = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const longDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} de ${MONTHS_LONG[m - 1]} de ${y}`; };

// texto con **negritas** → HTML seguro
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br>');
// Un bloque «Párrafo» con varios renglones (escrito o pegado de Word/WhatsApp) se parte en bloques:
// cada renglón es un párrafo, los que empiezan con «-», «•» o «1.» forman una lista y los que empiezan
// con «#» son subtítulos. Así el artículo no sale todo de corrido.
const VINETA = /^\s*(?:[-•–·]|\*(?!\*)|\d+[.)])\s+/;
export const ordenar = (body: Block[]): Block[] => body.flatMap((b): Block[] => {
  if (b.t !== 'p' || !b.text.includes('\n')) return [b];
  const out: Block[] = [];
  for (const linea of b.text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean)) {
    const ult = out[out.length - 1];
    if (VINETA.test(linea)) {
      const item = linea.replace(VINETA, '');
      if (ult?.t === 'ul') ult.items.push(item); else out.push({ t: 'ul', items: [item] });
    } else if (/^#+\s*/.test(linea)) out.push({ t: 'h2', text: linea.replace(/^#+\s*/, '').replace(/\*\*/g, '') });
    else out.push({ t: 'p', text: linea });
  }
  return out;
});
// id para el índice a partir del subtítulo
export const anchor = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
