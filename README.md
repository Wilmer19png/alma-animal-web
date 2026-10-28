# Alma Animal · sitio web

Sitio de Alma Animal (consultorio veterinario, spa y petshop de la Dra. Mariana Hoyos Giraldo, Pereira).
Hecho con [Astro](https://astro.build) y publicado en Netlify.

## Cómo está organizado

```
src/
├── data/
│   └── site.ts            Datos del negocio: teléfonos, WhatsApp, dirección, horario, redes, menú
├── styles/
│   └── global.css         Colores, letras, tamaños y botones de la marca (se usan en todo el sitio)
├── layouts/
│   └── Base.astro         Molde de cada página: <head>, fuentes, pie de página y botón de WhatsApp
├── components/            Piezas que se repiten
│   ├── Lockup.astro       Logo (corazón + "Alma Animal")
│   ├── MobileMenu.astro   Menú ☰ del celular
│   ├── Footer.astro       Pie de página
│   └── WaIcon.astro       Ícono de WhatsApp
├── pages/                 Cada archivo es una página del sitio
│   └── index.astro        Inicio
└── assets/                Fotos e ilustraciones (Astro las optimiza solas)

public/                    Archivos que se copian tal cual (favicon)
scripts/vista-previa.mjs   Genera la copia que se abre con doble clic
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
| `npm run vista` | Genera una copia legible en `Página web_Alma animal/vista-previa` que se abre con doble clic |

## Cambiar datos del negocio

Teléfonos, mensajes de WhatsApp, dirección y horario están en `src/data/site.ts`.
Se cambian ahí una sola vez y se actualizan en todas las páginas.

## Supabase (pedidos de la tienda)

1. Crear el proyecto en supabase.com (plan gratis; se pausa tras 7 días sin uso).
2. SQL Editor → pegar y ejecutar `supabase/01-pedidos.sql`.
3. Project Settings → API: copiar la URL y la clave `anon`.
4. Local: copiar `.env.example` como `.env` y llenarlo. Netlify: mismas variables en Environment variables.

Sin estas variables, en local el pedido se simula (sale "¡Listo!") y en el sitio publicado se ofrece enviarlo por WhatsApp.
