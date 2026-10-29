// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { loadEnv } from 'vite';

// VISTA=1 (npm run vista): HTML y CSS sin comprimir, para leerlos con calma.
// La versión que se publica en Netlify sí va comprimida para que cargue más rápido.
const legible = process.env.VISTA === '1';

// Envíos y obsequio: se leen de Supabase (gestor → Envíos y obsequio) al publicar el sitio y quedan en el código
// como import.meta.env.PUBLIC_ENVIOS. Si no hay conexión, se usan las reglas de src/data/shop.ts.
const env = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'PUBLIC_'), ...process.env };
async function leerEnvios() {
  if (!env.PUBLIC_SUPABASE_URL || !env.PUBLIC_SUPABASE_ANON_KEY) return null;
  try {
    const r = await fetch(`${env.PUBLIC_SUPABASE_URL}/rest/v1/ajustes?clave=eq.envios&select=valor`, {
      headers: { apikey: env.PUBLIC_SUPABASE_ANON_KEY, Authorization: `Bearer ${env.PUBLIC_SUPABASE_ANON_KEY}` }, signal: AbortSignal.timeout(8000)
    });
    return r.ok ? ((await r.json())[0]?.valor ?? null) : null;
  } catch { return null; }
}
const envios = await leerEnvios();

// La dirección final se ajusta cuando se conecte el sitio en Netlify.
export default defineConfig({
  // React solo se usa en el gestor (/gestor); el sitio público no lo carga
  integrations: [react()],
  site: 'https://almaanimalvet.netlify.app',
  trailingSlash: 'never',
  compressHTML: !legible,
  build: { format: 'file', inlineStylesheets: legible ? 'never' : 'auto' },
  vite: {
    build: { cssMinify: !legible, minify: !legible },
    define: { 'import.meta.env.PUBLIC_ENVIOS': JSON.stringify(envios ? JSON.stringify(envios) : '') }
  }
});
