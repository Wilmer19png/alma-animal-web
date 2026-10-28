// @ts-check
import { defineConfig } from 'astro/config';

// La dirección final se ajusta cuando se conecte el sitio en Netlify.
export default defineConfig({
  site: 'https://almaanimal.netlify.app',
  trailingSlash: 'never',
  build: { format: 'file' }
});
