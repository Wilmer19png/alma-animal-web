// Textos editables de la página (gestor → Textos e imágenes).
// Aquí están los textos de siempre: las páginas los pintan al publicar y, al cargar, el script
// src/scripts/contenido.ts aplica encima lo que se haya cambiado en el gestor (tabla ajustes, clave "sitio").
// Títulos: el "destacado" va con el degradado de la marca; un salto de línea (\n) parte el título.

export type TipoCampo = 'texto' | 'largo' | 'titulo';
export interface Campo { k: string; label: string; tipo: TipoCampo; def: string; dest?: string; ayuda?: string }
export interface Bloque { id: string; nombre: string; ocultable?: boolean; auto?: { txt: string; btn: string; href: string }; campos: Campo[] }
export interface Pagina { id: string; nombre: string; icon: string; ruta: string; seo: { title: string; desc: string }; bloques: Bloque[] }
export interface Sitio {
  textos: Record<string, string>; // clave → texto; el destacado de un título va en "clave#d"
  ocultos: Record<string, boolean>; // "pagina.bloque" → oculto
  seo: Record<string, { title?: string; desc?: string }>;
  anuncio: { activo: boolean; texto: string; enlace: string };
}
export const SITIO_VACIO: Sitio = { textos: {}, ocultos: {}, seo: {}, anuncio: { activo: false, texto: '', enlace: '' } };

const tit = (k: string, def: string, dest: string, label = 'Título'): Campo => ({ k, label, tipo: 'titulo', def, dest });
const txt = (k: string, def: string, label = 'Texto', ayuda?: string): Campo => ({ k, label, tipo: 'largo', def, ayuda });
const lin = (k: string, def: string, label: string, ayuda?: string): Campo => ({ k, label, tipo: 'texto', def, ayuda });

export const PAGINAS: Pagina[] = [
  {
    id: 'inicio', nombre: 'Inicio', icon: 'home', ruta: '/',
    seo: { title: 'Alma Animal · Veterinaria, spa y petshop en Pereira', desc: 'Veterinaria en Pereira: consulta, vacunas, cirugía y atención a domicilio con la Dra. Mariana Hoyos. Spa con baño antipulgas y petshop con envío gratis.' },
    bloques: [
      { id: 'heroe', nombre: 'Portada', campos: [txt('inicio.heroe.texto', '**Consultorio, spa y petshop** en un mismo lugar. Te atiende la Dra. Mariana Hoyos, médica veterinaria y zootecnista.', 'Texto bajo «Cuidado con alma»')] },
      { id: 'lado', nombre: 'Tarjeta de la portada', campos: [
        tit('inicio.lado.titulo', 'Consultorio, spa y petshop en un mismo lugar', 'en un mismo lugar'),
        txt('inicio.lado.texto', 'Consulta, vacunas, radiografía y cirugía. Y cuando toca baño, **la misma doctora** revisa piel, oídos y dientes.')] },
      { id: 'decl', nombre: 'Declaración', campos: [txt('inicio.decl.texto', 'Alma Animal reúne en un solo lugar la consulta veterinaria, el spa y la tienda. Así, la persona que baña a tu mascota trabaja al lado de la médica que la conoce.')] },
      { id: 'espacios', nombre: 'Tres espacios', campos: [
        tit('inicio.espacios.titulo', 'Elige a qué\nvienes hoy', 'vienes hoy'),
        txt('inicio.espacios.texto', 'Cada espacio tiene su página con todos los detalles. Agenda o escríbenos desde cualquiera.'),
        txt('inicio.espacios.consultorio', 'Consulta general, vacunación, desparasitación, radiografía y cirugía. También atendemos a domicilio.', 'Consultorio'),
        txt('inicio.espacios.spa', 'Baño antipulgas, hidromasaje y aromaterapia, con shampoo hipoalergénico libre de parabenos. Sale con perfume, accesorio y snack.', 'Spa'),
        txt('inicio.espacios.petshop', 'Alimento, higiene y accesorios. Arma tu pedido en la web y te lo llevamos: envío gratis en Pereira y Dosquebradas.', 'Petshop')] },
      { id: 'domicilio', nombre: 'A domicilio', ocultable: true, campos: [
        tit('inicio.domicilio.titulo', 'La doctora va a tu casa', 'a tu casa'),
        txt('inicio.domicilio.texto', 'Consulta veterinaria en tu hogar, en Pereira. Para mascotas que se estresan al salir, o cuando a ti se te complica llegar.'),
        lin('inicio.domicilio.cobertura', 'Cobertura: toda Pereira y Dosquebradas', 'Cobertura')] },
      { id: 'nosotros', nombre: 'Nosotros', ocultable: true, auto: { txt: 'Las personas, sus fotos y presentaciones salen de Equipo.', btn: 'Ir a Equipo', href: '/gestor/equipo' }, campos: [
        tit('inicio.nosotros.titulo', 'Quiénes cuidan\na tu mascota', 'a tu mascota'),
        txt('inicio.nosotros.texto', 'Trabajamos en el mismo lugar: la persona que baña a tu mascota está al lado de la médica que la conoce.')] },
      { id: 'porque', nombre: '¿Por qué Alma Animal?', ocultable: true, campos: [tit('inicio.porque.titulo', '¿Por qué Alma Animal?', 'Alma Animal?')] },
      { id: 'blog', nombre: 'Blog veterinario', ocultable: true, auto: { txt: 'Se llena sola con los artículos publicados más recientes.', btn: 'Ir al blog', href: '/gestor/blog' }, campos: [tit('inicio.blog.titulo', 'Blog veterinario', 'veterinario')] }
    ]
  },
  {
    id: 'consultorio', nombre: 'Consultorio', icon: 'stethoscope', ruta: '/consultorio',
    seo: { title: 'Consultorio veterinario en Pereira · Alma Animal', desc: 'Consulta general, vacunación, desparasitación, radiografía y cirugía con la Dra. Mariana Hoyos. También a domicilio en Pereira y Dosquebradas.' },
    bloques: [
      { id: 'heroe', nombre: 'Portada', campos: [txt('consultorio.heroe.texto', 'Prevención, diagnóstico y tratamiento con la Dra. Mariana Hoyos. Cada visita queda en la historia clínica de tu mascota.')] },
      { id: 'servicios', nombre: 'Servicios', campos: [
        tit('consultorio.servicios.titulo', 'Servicios del\nconsultorio', 'consultorio'),
        txt('consultorio.servicios.texto', 'Escríbenos por WhatsApp para agendar cualquiera de ellos. Te confirmamos el día y la hora.')] },
      { id: 'domicilio', nombre: 'A domicilio', ocultable: true, campos: [
        tit('consultorio.domicilio.titulo', 'Consulta veterinaria en tu casa', 'en tu casa'),
        txt('consultorio.domicilio.texto', 'La Dra. Mariana va hasta tu hogar en Pereira y Dosquebradas. La visita queda en la misma historia clínica y el mismo carnet que en el consultorio.')] },
      { id: 'como', nombre: 'Así funciona tu cita', ocultable: true, campos: [
        tit('consultorio.como.titulo', 'Así funciona tu cita', 'tu cita'),
        txt('consultorio.como.texto', 'Después de la consulta, todo queda en tu portal: tus mascotas, citas y carnet.')] },
      { id: 'wa', nombre: 'WhatsApp', campos: [txt('consultorio.wa.texto', 'Cuéntanos qué tiene tu mascota y te decimos si necesita consulta o puede esperar.')] }
    ]
  },
  {
    id: 'spa', nombre: 'Spa', icon: 'shower', ruta: '/spa',
    seo: { title: 'Spa para perros y gatos en Pereira · Alma Animal', desc: 'Baño antipulgas, hidromasaje, aromaterapia y corte según la raza, con shampoo hipoalergénico. Agenda en línea y te confirmamos por WhatsApp.' },
    bloques: [
      { id: 'heroe', nombre: 'Portada', campos: [
        lin('spa.heroe.lema', 'Un animalito limpio es un animalito sano.', 'Frase'),
        txt('spa.heroe.texto', 'Baño completo con shampoo hipoalergénico libre de parabenos, en el mismo lugar donde atiende la veterinaria.')] },
      { id: 'incluye', nombre: 'Cada baño incluye', campos: [
        tit('spa.incluye.titulo', 'Cada baño\nincluye', 'incluye'),
        txt('spa.incluye.texto', 'Siempre con agua caliente, secado y protección de oídos.')] },
      { id: 'manto', nombre: 'Según su pelo y su piel', ocultable: true, campos: [
        tit('spa.manto.titulo', 'Según su pelo y su piel', 'pelo y su piel'),
        txt('spa.manto.texto', 'No necesitas saber qué tipo de manto tiene tu mascota: lo revisamos al recibirla y te contamos qué le hace falta.')] },
      { id: 'precio', nombre: 'Precio', auto: { txt: 'Los precios se muestran según lo que elijas en Servicios y tarifas.', btn: 'Ir a tarifas', href: '/gestor/tarifas' }, campos: [
        tit('spa.precio.titulo', '¿Cuánto cuesta?', 'cuesta?'),
        txt('spa.precio.texto', 'Depende de la raza, el tamaño y el estado del manto. Escríbenos con una foto de tu mascota y te damos el valor antes de agendar.', 'Texto (cuando no se muestran precios)')] },
      { id: 'salen', nombre: 'Así salen', ocultable: true, campos: [tit('spa.salen.titulo', 'Así salen', 'salen')] },
      { id: 'wa', nombre: 'WhatsApp', campos: [txt('spa.wa.texto', 'Mándanos una foto de tu mascota y te decimos el precio del baño.')] }
    ]
  },
  {
    id: 'petshop', nombre: 'Petshop', icon: 'storefront', ruta: '/petshop',
    seo: { title: 'Petshop · Alma Animal', desc: 'Alimento, higiene y accesorios recomendados por la doctora. Envío gratis en Pereira y Dosquebradas, y a toda Colombia desde $70.000.' },
    bloques: [
      { id: 'heroe', nombre: 'Cabecera de la tienda', campos: [txt('petshop.heroe.texto', 'Alimento, higiene y accesorios recomendados por la doctora. Agrégalos al carrito y te los llevamos a casa.')] },
      { id: 'productos', nombre: 'Productos', auto: { txt: 'Los productos, precios y etiquetas salen de Productos e inventario.', btn: 'Ir a productos', href: '/gestor/productos' }, campos: [] },
      { id: 'compras', nombre: 'Así compras', ocultable: true, campos: [tit('petshop.compras.titulo', 'Así compras', 'compras')] },
      { id: 'wa', nombre: 'WhatsApp', campos: [
        lin('petshop.wa.titulo', '¿No sabes cuál elegir?', 'Pregunta'),
        txt('petshop.wa.texto', 'Cuéntanos de tu mascota y la doctora te recomienda el producto.')] }
    ]
  }
];

export const CAMPOS: Record<string, Campo> = Object.fromEntries(PAGINAS.flatMap((p) => p.bloques.flatMap((b) => b.campos.map((c) => [c.k, c]))));

export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
export const rich = (s: string) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br />');
// "Elige a qué\nvienes hoy" + "vienes hoy" → Elige a qué<br /><b class="gt">vienes hoy</b>
export function tituloHtml(texto: string, dest = '') {
  const i = dest ? texto.indexOf(dest) : -1;
  const parte = (s: string) => esc(s).replace(/\n/g, '<br />');
  return i < 0 ? parte(texto) : parte(texto.slice(0, i)) + `<b class="gt">${parte(dest)}</b>` + parte(texto.slice(i + dest.length));
}
// al publicar: el texto de siempre, ya en HTML
export const TX = (k: string) => rich(CAMPOS[k].def);
export const TT = (k: string) => tituloHtml(CAMPOS[k].def, CAMPOS[k].dest);
