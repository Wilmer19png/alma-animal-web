// Contenido del spa. Más adelante saldrá del gestor (Servicios y tarifas → Cada baño incluye).
import p1 from '../assets/spa/IMG_1330.jpg';
import p2 from '../assets/spa/IMG_1337.jpg';
import p3 from '../assets/spa/IMG_1491.jpg';
import p4 from '../assets/spa/IMG_0657.jpg';

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

// fotos reales de cómo salen del spa
export const SPA_PHOTOS = [
  { src: p1, alt: 'Perrita criolla atigrada con su pañoleta después del baño', cap: 'Recién bañada' },
  { src: p2, alt: 'Husky blanco con su pañoleta después del baño', cap: 'Con su pañoleta' },
  { src: p3, alt: 'Shih tzu con su pañoleta y su obsequio en la mesa de peluquería', cap: 'Sale con su obsequio' },
  { src: p4, alt: 'Shih tzu recién bañado, en brazos', cap: 'Listo para volver a casa' }
];
