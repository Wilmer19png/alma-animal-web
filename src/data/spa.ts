// Contenido del spa. Más adelante saldrá del gestor (Servicios y tarifas → Cada baño incluye).
import maquina from '../assets/fotos/spa-maquina.webp';
import tijeras from '../assets/fotos/spa-tijeras.webp';
import tijerasCara from '../assets/fotos/spa-tijeras-cara.webp';
import patas from '../assets/fotos/spa-patas.webp';
import p1 from '../assets/spa/IMG_1330.jpg';
import p2 from '../assets/spa/IMG_1337.jpg';
import p3 from '../assets/spa/IMG_1491.jpg';
import p4 from '../assets/spa/IMG_0657.jpg';
import p5 from '../assets/spa/IMG_1923.jpg';
import p6 from '../assets/spa/IMG_1932.jpg';

export const SPA_INCLUDES = [
  { icon: 'pest_control', title: 'Baño antipulgas', text: 'Con shampoo hipoalergénico libre de parabenos.', bg: 'linear-gradient(160deg,#FBCFAF,#E8C6CF)' },
  { icon: 'hearing', title: 'Limpieza de oídos', text: 'Retiramos cera y suciedad, y revisamos que no haya infección.', bg: 'linear-gradient(160deg,#EADDFF,#D1C1DD)' },
  { icon: 'dentistry', title: 'Limpieza dental', text: 'Higiene de dientes y encías durante el baño.', bg: 'linear-gradient(160deg,#FFDCC3,#FBCFAF)' },
  { icon: 'waves', title: 'Hidromasaje', text: 'Relaja los músculos y limpia a fondo el manto.', bg: 'linear-gradient(160deg,#D1C1DD,#B4A3D6)' },
  { icon: 'spa', title: 'Aromaterapia', text: 'Aromas suaves para un baño tranquilo.', bg: 'linear-gradient(160deg,#E8C6CF,#D1C1DD)' },
  { icon: 'brush', title: 'Cepillado y deslanado', text: 'Retiramos el pelo muerto y dejamos el manto suelto.', bg: 'linear-gradient(160deg,#FBCFAF,#FFDCC3)' },
  { icon: 'content_cut', title: 'Mantenimiento de uñas', text: 'Corte y limado a la medida de cada patita.', bg: 'linear-gradient(160deg,#EADDFF,#E8C6CF)' },
  { icon: 'redeem', title: 'El cierre', text: 'Sale con perfume, un accesorio y un snack.', bg: 'linear-gradient(160deg,#FBCFAF,#D1C1DD)' }
];

export const SPA_COAT = [
  { title: 'Mantos largos', text: 'Desenredantes y acondicionador para que el pelo quede suelto y brillante.' },
  { title: 'Corte según la raza', text: 'De acuerdo con la raza y las características de su manto.' },
  { title: 'Nudos o enredos severos', text: 'Tienen un valor adicional que depende del estado del manto. Te lo decimos antes de empezar.' },
  { title: 'Piel sensible', text: 'Baño medicado: +$5.000 para mascotas de hasta 10 kg.' }
];

// la portada: Albert trabajando
export const SPA_HERO = [
  { src: tijerasCara, alt: 'Albert, el peluquero, recortando con tijeras el pelo de la cara de un perrito blanco', cap: 'Corte según la raza' },
  { src: maquina, alt: 'Retoque con máquina alrededor de los ojos de un perrito blanco', cap: 'Retoque de la carita' },
  { src: tijeras, alt: 'Albert recortando con tijeras a un perrito blanco en la mesa de peluquería', cap: 'Con paciencia y cuidado' },
  { src: patas, alt: 'Corte de pelo en las patitas con máquina', cap: 'Patitas y uñas' }
];
// así salen del spa (fotos reales de las mascotas al terminar)
export const SPA_PHOTOS = [
  { src: p1, alt: 'Perrita criolla atigrada con su pañoleta después del baño', cap: 'Recién bañada' },
  { src: p2, alt: 'Husky blanco con su pañoleta después del baño', cap: 'Con su pañoleta' },
  { src: p3, alt: 'Shih tzu con su pañoleta y su obsequio en la mesa de peluquería', cap: 'Sale con su obsequio' },
  { src: p4, alt: 'Shih tzu recién bañado, en brazos', cap: 'Listo para volver a casa' },
  { src: p5, alt: 'Perrito de pelo dorado con su pañoleta de colores después del baño', cap: 'Con su pañoleta nueva' },
  { src: p6, alt: 'Perrito blanco con su pañoleta, sentado en una silla después del spa', cap: 'Listo y perfumado' }
];
