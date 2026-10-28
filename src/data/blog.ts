// Blog. Más adelante la doctora publica desde el gestor (módulo Blog) y los artículos salen de Supabase.
// Mientras tanto son artículos de EJEMPLO: la página lo dice y no se publica así.
import heart from '../assets/corazon.png';
import heartPaper from '../assets/papel-corazon-v2.png';
import tigerDog from '../assets/papel-tigre-perro-v3.png';
import paw from '../assets/pata-perro-h.png';

export const BLOG_DEMO = true;

export const BLOG_CATS = ['Cuidado', 'Vacunas', 'Gatos', 'Nutrición', 'Spa'] as const;
export type BlogCat = (typeof BLOG_CATS)[number];

const COVERS = [
  { bg: 'linear-gradient(160deg,#FBCFAF,#E8C6CF)', img: heart, w: 0.34 },
  { bg: 'linear-gradient(160deg,#EADDFF,#D1C1DD)', img: heartPaper, w: 0.34 },
  { bg: 'linear-gradient(160deg,#D1C1DD,#B4A3D6)', img: tigerDog, w: 0.5 },
  { bg: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)', img: paw, w: 0.4 }
];

export interface Post { slug: string; cat: BlogCat; title: string; excerpt: string; min: number; date: string; cover: (typeof COVERS)[number] }

const RAW: Omit<Post, 'cover'>[] = [
  { slug: 'cada-cuanto-banar-a-tu-perro', cat: 'Cuidado', title: '¿Cada cuánto bañar a tu perro según su tipo de pelo?', excerpt: 'No todos los perros necesitan el mismo ritmo. Te contamos cómo saberlo según el pelo y la piel de tu mascota.', min: 5, date: '2026-10-12' },
  { slug: 'calendario-de-vacunas-cachorro', cat: 'Vacunas', title: 'El calendario de vacunas de un cachorro, paso a paso', excerpt: 'Qué vacunas necesita tu cachorro, a qué edad y por qué no hay que saltarse ninguna.', min: 4, date: '2026-09-28' },
  { slug: 'senales-dolor-de-dientes-gato', cat: 'Gatos', title: 'Señales de que tu gato tiene dolor de dientes', excerpt: 'Los gatos esconden el dolor. Estas son las señales que debes mirar.', min: 4, date: '2026-09-15' },
  { slug: 'bano-medicado', cat: 'Spa', title: 'Baño medicado: qué es y cuándo lo necesita tu mascota', excerpt: 'Para pieles sensibles, con caspa o alergias. Te explicamos en qué se diferencia de un baño normal.', min: 3, date: '2026-09-02' },
  { slug: 'alimentos-prohibidos', cat: 'Nutrición', title: 'Alimentos de tu cocina que no debe comer tu mascota', excerpt: 'Uvas, cebolla, chocolate y otros que parecen inofensivos pero no lo son.', min: 5, date: '2026-08-20' },
  { slug: 'preparar-mascota-cirugia', cat: 'Cuidado', title: 'Cómo preparar a tu mascota para una cirugía', excerpt: 'Ayuno, qué llevar el día de la cirugía y cómo cuidarla al volver a casa.', min: 6, date: '2026-08-05' },
  { slug: 'gato-y-transportador', cat: 'Gatos', title: 'Tu gato y el transportador: cómo hacer que no sea un drama', excerpt: 'Trucos para que llegar a la consulta sea más tranquilo para los dos.', min: 3, date: '2026-07-22' }
];

// del más reciente al más antiguo; cada uno con su portada
export const POSTS: Post[] = RAW.sort((a, b) => b.date.localeCompare(a.date)).map((p, i) => ({ ...p, cover: COVERS[i % COVERS.length] }));

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const shortDate = (iso: string) => { const [y, m, d] = iso.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; };
export const postUrl = (p: Post) => `/blog/${p.slug}`;
