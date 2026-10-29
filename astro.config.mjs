// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// VISTA=1 (npm run vista): HTML y CSS sin comprimir, para leerlos con calma.
// La versión que se publica en Netlify sí va comprimida para que cargue más rápido.
const legible = process.env.VISTA === '1';

// La dirección final se ajusta cuando se conecte el sitio en Netlify.
export default defineConfig({
  // React solo se usa en el gestor (/gestor); el sitio público no lo carga
  integrations: [react()],
  site: 'https://almaanimal.netlify.app',
  trailingSlash: 'never',
  compressHTML: !legible,
  build: { format: 'file', inlineStylesheets: legible ? 'never' : 'auto' },
  vite: { build: { cssMinify: !legible, minify: !legible } }
});
