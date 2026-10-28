// Copia la página construida a una carpeta que se abre con doble clic (sin servidor):
// cambia las rutas absolutas (/_astro/...) por relativas.
// uso: npm run vista  (construye sin comprimir y copia)
import { cpSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

// construye en modo legible (sin comprimir)
execSync('npx astro build', { stdio: 'inherit', env: { ...process.env, VISTA: '1' } });

const OUT = 'C:/Users/wburi/OneDrive/Escritorio/Página web_Alma animal/vista-previa';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('dist', OUT, { recursive: true });

for (const f of readdirSync(OUT).filter((f) => f.endsWith('.html'))) {
  const p = join(OUT, f);
  const pages = new Set(readdirSync(OUT).filter((x) => x.endsWith('.html')).map((x) => x.replace('.html', '')));
  const html = readFileSync(p, 'utf8')
    // enlaces entre páginas: /consultorio -> ./consultorio.html, / -> ./index.html
    .replace(/href="/([a-z-]*)(#[^"]*)?"/g, (m, name, hash = '') => (name === '' ? 'href="./index.html' + hash + '"' : pages.has(name) ? 'href="./' + name + '.html' + hash + '"' : m))
    .replace(/(src|href|srcset)="\/(?!\/)/g, '$1="./')
    .replace(/, \/_astro\//g, ', ./_astro/');
  writeFileSync(p, html);
}
console.log('Listo: abre ' + OUT + '/index.html');
