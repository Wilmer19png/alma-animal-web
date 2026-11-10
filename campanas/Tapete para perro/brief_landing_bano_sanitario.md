# Encargo para Claude Code: landing del Baño Sanitario para Perros (Alma Animal)

Pega todo este documento en Claude Code, abierto dentro del repositorio `alma-animal-web`.

---

## 1. Qué hay que construir

Una **landing de un solo producto** para los anuncios de Meta, dentro del sitio de Alma Animal (Astro 5 + Supabase + Netlify).

- Ruta nueva: **`/bano-sanitario-perros`** (archivo `src/pages/bano-sanitario-perros.astro`).
- Pensada **primero para celular**: casi todo el tráfico llega desde Instagram y Facebook.
- La venta se cierra **en la misma página**, con un formulario de pedido contraentrega. Sin carrito y sin pasos extra.
- Antes de tocar nada, lee `README.md` y `PRODUCT.md` y sigue sus convenciones:
  - datos entre `---`;
  - secciones marcadas con `<!-- ==== NOMBRE ==== -->`;
  - estilos de celular primero;
  - tokens de `src/styles/global.css`;
  - español de Colombia;
  - accesibilidad WCAG 2.2 AA.
- Trabaja en una **rama nueva** (`landing-bano-sanitario`), corre `npm run build` sin errores y abre un **pull request** con capturas en celular. No subas nada directo a `main`.

## 2. Datos del producto

| Campo | Valor |
|---|---|
| Nombre | **Baño Sanitario para Perros con Pasto** |
| Nombre corto (botones, títulos pequeños) | Baño Sanitario con Pasto |
| Slug | `bano-sanitario-perros` |
| Precio | **$119.900** (incluye envío) |
| Envío | **Gratis a toda Colombia**. No se suma nada en el pedido |
| Pago | **Contraentrega**: "Pagas al recibir" |
| Medidas | 70 × 45 cm |
| Para | Perros pequeños y medianos. **No** decir "perro grande" |
| Capas | 1) Pasto sintético suave, 2) rejilla, 3) bandeja que recoge el orín |
| Cuidado | Lavable y reutilizable: se levanta el pasto con la rejilla, se vacía la bandeja, se enjuaga |
| Proveedor | Dropi, producto 2282266. Es interno: no mostrarlo en la página |

**El nombre:** en Colombia la competencia lo anuncia como "baño sanitario para mascotas" (Animalia Store), "baño de pasto" (Puppybox) y "sanitario ecológico". Así lo busca la gente, así que el título principal dice **Baño Sanitario**. No usar nombres de marcas ajenas, como PipiGrass o Potty Patch.

## 3. Identidad (ya está en el repositorio)

- Colores:
  - tinta `#2B1E48`;
  - morado `#655785` (fuerte `#4D3F6C`, suave `#8F7FB0`);
  - durazno `#FBCFAF`, lavanda `#D1C1DD`, fondo `#FEF7FE`;
  - degradado de marca `#FBCFAF → #E8C6CF → #D1C1DD`;
  - verde WhatsApp `#00BC39`, **solo** para el botón de WhatsApp.
- Letras: **Gowun Batang** para títulos y **Alan Sans** para textos.
- Tono cálido y cercano. Nunca regañar al perro ni hacer promesas de salud.
- Logo e ilustraciones: `src/assets/identidad/`.

## 4. Imágenes y videos (paquete exclusivo de la landing)

Todo el material es **exclusivo para esta página**: fotos cenitales y videos de producto **sin texto encima**. Títulos, precios y medidas van en HTML, así se leen nítidos en celular. Ya viene optimizado para celular: fotos WebP de 80 a 250 KB y videos de 0,3 a 0,8 MB.

**Descarga el paquete y descomprímelo en `public/landing/bano-sanitario/`:**
https://d2ol7oe51mr4n9.cloudfront.net/user_32ZUb06fC9M5zNpFLXhSEGvwxK5/e578ae5d-860a-4a0a-a13a-dca99d4ca9c7.zip

Contenido del paquete (trae un `LEEME.txt`):

| Archivo | Formato | Dónde va |
|---|---|---|
| `img/hero-pomerania-cenital.webp` | 3:4 | **Portada**. Vista cenital con el tercio de arriba libre: el título va encima, sobre la foto |
| `img/producto-cenital-durazno.webp` | 1:1 | Galería: producto solo |
| `img/boston-terrier-encima.webp` | 1:1 | Galería: perro sentado encima |
| `img/tres-capas-flatlay.webp` | 3:4 | "Así funciona": las 3 capas separadas |
| `img/pasto-gotas-macro.webp` | 1:1 | "Patas secas": macro del pasto con gotas |
| `img/producto-medidas-base.webp` | 1:1 | **Medidas**: dibujar con CSS o SVG las cotas "70 cm" (ancho) y "45 cm" (alto) alrededor del tapete |
| `img/balcon-beagle.webp` | 3:4 | "¿Sin patio?" |
| `img/cachorro-maltes-dormido.webp` | 1:1 | "Cachorro nuevo" |
| `img/lavado-bandeja.webp` | 3:4 | "Cómo se limpia" |
| `img/entrega-pagas-al-recibir.webp` | 3:4 | "Pides hoy, pagas cuando te llega" |
| `video/agua-pasto-seco.mp4` (+ `-poster.webp`) | 3:4, 6 s | **Video principal**: se echa agua y el pasto queda seco |
| `video/capas-se-levantan.mp4` (+ póster) | 3:4, 6 s | Se levantan pasto y rejilla y se ve la bandeja con el agua |
| `video/armado-3-capas.mp4` (+ póster) | 3:4, 5 s | Las 3 capas encajan una sobre otra |
| `video/lavado-facil.mp4` (+ póster) | 3:4, 6 s | Se lava en el lavaplatos o lavadero |
| `video/perro-va-al-tapete.mp4` (+ póster) | 3:4, 6 s | Caniche camina al tapete y se sienta |

**Cómo usar los videos:**
- Son **bucles sin sonido** al estilo de una tienda moderna: `autoplay muted loop playsinline` con su `poster`.
- Que solo se reproduzcan cuando están en pantalla (IntersectionObserver) y que se pausen al salir.
- Si el usuario tiene "reducir movimiento" activado (`prefers-reduced-motion`), muestra solo el póster con un botón de reproducir.

**Dinamismo (sin recargar la página):**
- Alterna secciones de foto a la izquierda y texto a la derecha. En celular van una debajo de la otra, foto primero.
- Usa fondos de bloque con los colores de marca: durazno, lavanda y fondo claro.
- Esquinas redondeadas de 20 a 24 px y aparición suave al hacer scroll (fade y subida de 12 px). Nada de animaciones pesadas.
- La galería de arriba se desliza con el dedo, con puntos indicadores.

## 5. Estructura y textos de la página (en este orden)

### 5.1 Barra superior (fija, delgada)
"🚚 Envío GRATIS a toda Colombia · 💵 Pagas al recibir"

### 5.2 Primera pantalla (lo que se ve sin bajar)
- Portada: `hero-pomerania-cenital.webp` a lo ancho, con el título encima del tercio de arriba.
- Debajo, galería deslizable: video `agua-pasto-seco` → `producto-cenital-durazno` → `boston-terrier-encima` → video `perro-va-al-tapete`.
- Título (Gowun Batang): **Baño Sanitario para Perros con Pasto**
- Subtítulo: *Su propio "patio" dentro de casa: el orín baja a la bandeja y el pasto queda seco.*
- Precio grande: **$119.900**. Al lado, dos sellos: **Envío gratis** y **Pagas al recibir**. Sin precio tachado: no hay un precio anterior real.
- Tres líneas con íconos:
  - 🌿 3 capas: pasto, rejilla y bandeja que recoge el orín
  - 📏 70 × 45 cm, para perros pequeños y medianos
  - 🧼 Lavable y reutilizable, sin desechables
- Botón principal (morado `#655785`, texto blanco): **"Pedir ahora · Pagas al recibir"**. Lleva al formulario (5.9).
- Botón secundario de WhatsApp (verde `#00BC39`): "Tengo una pregunta". Abre el WhatsApp del petshop **301 792 5910** con este mensaje: "Hola, quiero información del Baño Sanitario para perros con pasto".

### 5.3 El problema
- Título: **¿Otra vez charcos en la sala?**
- Texto: "Llegas del trabajo y está el charco. Trapeas todos los días y aún huele. No es que tu perro no quiera hacerlo bien: muchas veces no alcanza a salir a tiempo, sobre todo en apartamento, de noche o cuando llueve."
- Sin foto de charco (no queremos asco en la página): usa un fondo lavanda con el texto y el ícono de una gota tachada. Debajo, el video `capas-se-levantan` como respuesta.

### 5.4 La solución: cómo funciona
- Título: **Así funciona: 3 capas**
- Imagen: `tres-capas-flatlay.webp`, con los 3 pasos numerados al lado. En celular van debajo.
- Pasos:
  1. **Pasto suave**: se siente como afuera y lo reconoce como "su lugar".
  2. **Rejilla**: deja pasar el líquido y mantiene las patas secas.
  3. **Bandeja**: recoge el orín para que no toque tu piso.
- Video `armado-3-capas` y, debajo, `pasto-gotas-macro.webp` con el texto "Patas secas, piso limpio".
- Bloque de **medidas**: `producto-medidas-base.webp` con las cotas 70 cm × 45 cm dibujadas en CSS y el texto "Para perros pequeños y medianos".

### 5.5 Para quién es (tarjetas deslizables con imagen)
- **Apartamento sin patio**: "¿Sin patio? Su patio en tu balcón." (`balcon-beagle.webp`)
- **Cachorro nuevo**: "Un solo lugar para aprender." (`cachorro-maltes-dormido.webp`)
- **Perro mayor**: "Para el perrito que ya no alcanza a salir a tiempo." (`boston-terrier-encima.webp` o, si se repite mucho, una tarjeta de color con ícono)
- **Noches de lluvia**: "Sin salir a mojarse a las 11 p. m." (video `perro-va-al-tapete`)

### 5.6 Ahorro
- Título: **Deja de comprar empapadores cada semana**
- Texto: "Los desechables se acaban y se botan. Este se lava y se vuelve a usar."
- Sin imagen: tarjeta de color con la comparación "Empapadores: se compran cada semana" frente a "Baño Sanitario: se lava y se reutiliza".

### 5.7 Cómo limpiarlo (3 pasos con íconos + video `lavado-facil` + foto `lavado-bandeja.webp`)
1. Levantas el pasto con la rejilla.
2. Vacías la bandeja.
3. Enjuagas y listo.

### 5.8 Cómo compras (confianza)
- Título: **Pides hoy, pagas cuando te llega**
- Imagen: `entrega-pagas-al-recibir.webp`.
- Pasos:
  1. Llenas el formulario (1 minuto).
  2. Te confirmamos por WhatsApp.
  3. Lo recibes en tu casa y pagas en efectivo al mensajero.
- Línea de confianza: "Alma Animal · Consultorio, spa y petshop en Pereira". Enlace a la página de inicio y al Instagram, si existe.
- **No** poner reseñas, testimonios ni cifras de clientes inventadas. **No** presentar a la Dra. Mariana recomendando el producto.

### 5.9 Formulario de pedido (el corazón de la página)
- Título: **Pide el tuyo · Envío gratis · Pagas al recibir**
- Resumen arriba: foto pequeña (`producto-cenital-durazno.webp`), "Baño Sanitario para Perros con Pasto · 1 unidad · **$119.900** · Envío gratis".
- Cantidad: 1 o 2 (2 unidades = $239.800, envío gratis).
- Campos, todos obligatorios y con validación clara:
  - Nombre
  - Apellido
  - Celular (10 dígitos, empieza por 3)
  - Departamento (lista)
  - Ciudad o municipio
  - Dirección completa
  - Barrio
  - Indicaciones (opcional: torre, apto, punto de referencia)
- Botón: **"Confirmar pedido · Pago contraentrega"**.
- Al enviar:
  1. Guarda el pedido en Supabase (tabla `pedidos`, la que ya usa el gestor). Campos: producto `bano-sanitario-perros`, proveedor `dropi`, id Dropi `2282266`, precio cobrado, `modo_envio = gratis`, origen `landing-meta` y los `utm_*` o `fbclid` de la dirección.
  2. Muestra una pantalla de gracias: "¡Pedido recibido! Te escribimos por WhatsApp para confirmar. Recuerda: pagas al recibir."
  3. En la pantalla de gracias va un botón "Confirmar por WhatsApp", con el pedido ya escrito en el mensaje, al **301 792 5910**.
- Si Supabase falla, abre WhatsApp con el pedido escrito, para no perder la venta.

### 5.10 Preguntas frecuentes (acordeón)
- **¿Cuánto tarda en llegar?** De 2 a 5 días hábiles según tu ciudad.
- **¿Tengo que pagar el envío?** No, el envío es gratis a toda Colombia.
- **¿Cómo pago?** En efectivo cuando el mensajero te lo entregue.
- **¿Le sirve a mi perro?** Mide 70 × 45 cm. Es ideal para perros pequeños y medianos.
- **¿Y si no lo usa al principio?** Ponlo donde ya suele ir y llévalo allí después de comer o al despertar. Felicítalo cuando lo use. Cada perro tiene su ritmo.
- **¿Cómo se limpia? ¿Huele?** Vacías la bandeja y enjuagas. Recomendamos limpiarlo a diario para que no queden olores.
- **¿Puedo cambiarlo?** Escríbenos por WhatsApp si llega con algún defecto.

### 5.11 Botón fijo en celular
Barra fija abajo con "Pedir ahora · $119.900" que baja al formulario. Se oculta cuando el formulario está en pantalla.

## 6. Píxel de Meta (obligatorio, la campaña es de Ventas)

El píxel del portafolio es **MarianaPixel, ID `843169261930833`**. Revisa si ya está instalado en el sitio (en Meta registró actividad el 9 de noviembre). Si no está, instálalo en el layout. Eventos en esta página:
- `ViewContent` al cargar: `content_name: "Baño Sanitario para Perros con Pasto"`, `content_ids: ["bano-sanitario-perros"]`, `value: 119900`, `currency: "COP"`.
- `InitiateCheckout` cuando la persona toca un botón de pedir o empieza a llenar el formulario.
- **`Purchase`** cuando el pedido queda guardado: `value` = total, `currency: "COP"`, `content_ids` y `num_items`. Usa el id del pedido como `eventID` para no duplicar.
- `Contact` al tocar WhatsApp.

## 7. Reglas

- Nada de contadores falsos ("quedan 3", "15 personas viendo") ni descuentos inventados.
- Sin promesas médicas ni de resultados garantizados ("aprende en 3 días").
- Velocidad: la primera imagen con `fetchpriority="high"` y el resto en carga diferida. Revisa que la página cargue rápido en 4G.
- Datos estructurados `Product` (JSON-LD) con precio, moneda COP y disponibilidad.
- Título SEO: "Baño Sanitario para Perros con Pasto · Envío gratis · Alma Animal". Descripción: "Tapete sanitario de 3 capas, 70 × 45 cm. El orín baja a la bandeja y el pasto queda seco. Envío gratis a toda Colombia y pagas al recibir."
- Al final, entrega la URL de vista previa de Netlify y capturas en celular de cada sección.

## 8. Lo que debo responder al terminar

1. URL final de la landing, que va en los anuncios: `https://almaanimalvet.netlify.app/bano-sanitario-perros`
2. Confirmación de que el píxel dispara `ViewContent`, `InitiateCheckout` y `Purchase`: probar con la extensión Meta Pixel Helper o en Administrador de eventos → Probar eventos.
3. Si hizo falta una migración de Supabase para los campos nuevos del pedido (proveedor, id de Dropi, modo de envío, utm), muéstramela antes de correrla.
