# Alma Animal · sitio web

Sitio de Alma Animal (consultorio veterinario, spa y petshop de la Dra. Mariana Hoyos Giraldo, Pereira).
Hecho con [Astro](https://astro.build) y publicado en Netlify. Todo el proyecto vive en esta carpeta:
el código, el diseño y la información del producto.

## Cómo está organizado

```
PRODUCT.md                 Qué es Alma Animal: público, decisiones y datos del negocio
diseno/                    Todo lo de diseño (no se publica en la página)
├── canvas/project/        Copia local del canvas (mockups de sitio, gestor y portal, escritorio y celular)
├── assets/                Ilustraciones y fotos originales (incluye las fotos reales en HEIC)
├── referencias/           Logo vertical y referencias que envió el cliente
└── 00-…, 01-….html        Primeras hojas de tokens e Inicio

src/                       Código del sitio
├── data/                  Datos que se cambian en un solo lugar
│   ├── site.ts            Teléfonos, WhatsApp, dirección, horario, redes, menú y datos legales
│   ├── services.ts        Servicios del consultorio y visita a domicilio
│   ├── spa.ts             Lo que incluye el baño y las fotos del spa
│   ├── shop.ts            Productos, etiquetas, envíos y obsequio (de ejemplo hasta tener el gestor)
│   └── blog.ts            Artículos del blog (de ejemplo hasta tener el gestor)
├── styles/global.css      Colores, letras, tamaños y botones de la marca
├── layouts/Base.astro     Molde de cada página: <head>, fuentes, pie y botón de WhatsApp
├── components/            Piezas que se repiten (barra superior, pie, tarjeta de producto, boletín…)
├── pages/                 Cada archivo es una página: index, consultorio, spa, agendar-spa, petshop,
│                          producto/[id], carrito, blog, blog/[slug], privacidad, terminos
├── scripts/               Código del navegador: carrito, confeti, botones de agregar, Supabase
└── assets/                Fotos e ilustraciones que usa la página (Astro las optimiza solas)

supabase/                  Tablas y reglas de la base de datos (se pegan en el SQL Editor de Supabase)
public/                    Archivos que se copian tal cual (favicon)
scripts/vista-previa.mjs   Genera la copia que se abre con doble clic
vista-previa/              Esa copia (se genera; no va a GitHub)
```

Cada página tiene tres partes, en este orden:
1. **Arriba (entre `---`)**: los datos de esa página.
2. **El HTML**, dividido por secciones con comentarios `<!-- ======== NOMBRE ======== -->`.
3. **`<style>`**: los estilos de esa página, primero para celular y luego para pantallas más grandes (`@media (min-width: …)`).

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Abre el sitio en http://localhost:4321 y se actualiza solo al guardar |
| `npm run build` | Genera la versión para publicar en `dist/` (comprimida) |
| `npm run vista` | Genera `vista-previa/` en esta carpeta: abre `vista-previa/index.html` con doble clic |

## Cambiar datos del negocio

Teléfonos, mensajes de WhatsApp, dirección, horario y datos legales están en `src/data/site.ts`.
Se cambian ahí una sola vez y se actualizan en todas las páginas.

## Gestor interno (/gestor)

Lo usa el equipo: entra en `/gestor/ingresar` con su correo y contraseña. Está hecho con React (solo esa parte)
y lee y guarda en Supabase. Código en `src/gestor/`; cada pantalla se monta desde `src/pages/gestor/`.
Sin Supabase conectado funciona con **datos de ejemplo** (botón «Entrar con datos de ejemplo»), también en la vista previa:
abre `vista-previa/gestor/ingresar.html`.

Módulos listos: Hoy, Agenda, Horarios, Pedidos, Productos e inventario, Propietarios, Pacientes (ficha e historia clínica) y Registrar paciente. Los demás aparecen en el menú como «Pronto».

La tienda (Petshop, ficha `/producto?p=…`, sugerencias del carrito, producto recomendado del blog y avisos de compra)
lee el catálogo de Supabase en el navegador: lo que se cambia en el gestor se ve al instante, sin volver a publicar.

## Supabase (pedidos, boletín y gestor)

1. Crear el proyecto en supabase.com (plan gratis; se pausa tras 7 días sin uso).
2. SQL Editor → pegar y ejecutar, en orden, los archivos de `supabase/`.
3. Project Settings → API: copiar la URL y la clave `anon`.
4. Local: copiar `.env.example` como `.env` y llenarlo. Netlify: mismas variables en Environment variables.

5. Crear la primera administradora: instrucciones al final de `supabase/03-equipo.sql`.

Sin estas variables, en local el pedido se simula (sale "¡Listo!") y en el sitio publicado se ofrece enviarlo por WhatsApp.

## Antes de publicar (legal)

- [ ] Llenar `LEGAL` en `src/data/site.ts`: NIT o cédula y correo para solicitudes (la compilación avisa si faltan).
- [ ] Que la doctora o un abogado revise `/privacidad` y `/terminos`.
- [ ] Revisar si el negocio debe inscribir sus bases de datos en el Registro Nacional de Bases de Datos (RNBD) de la SIC
      (obligatorio para sociedades con activos totales mayores a 100.000 UVT).
- [ ] Guardar en el consultorio el formato físico de autorización de datos para los clientes que se registren allá.
- [ ] Quitar los datos de ejemplo (`DEMO` en `src/data/shop.ts` y `BLOG_DEMO` en `src/data/blog.ts`).
