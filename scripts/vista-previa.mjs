// Copia la página construida a una carpeta que se abre con doble clic (sin servidor):
// construye sin comprimir, cambia las rutas absolutas por relativas
// y apunta los enlaces entre páginas a sus archivos .html.
// uso: npm run vista
import { cpSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';

execSync('npx astro build', { stdio: 'inherit', env: { ...process.env, VISTA: '1' } });

const OUT = 'C:/Users/wburi/OneDrive/Escritorio/Página web_Alma animal/vista-previa';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('dist', OUT, { recursive: true });

const files = readdirSync(OUT).filter((f) => f.endsWith('.html'));
const pages = new Set(files.map((f) => f.replace('.html', '')));

// /consultorio#x -> ./consultorio.html#x ; / -> ./index.html ; páginas que aún no existen se dejan igual
const pageLink = (match, name, hash = '') => {
  if (name === '') return `href="./index.html${hash}"`;
  if (pages.has(name)) return `href="./${name}.html${hash}"`;
  return match;
};

for (const f of files) {
  const p = join(OUT, f);
  const html = readFileSync(p, 'utf8')
    .replace(/href="\/([a-z-]*)(#[^"]*)?"/g, pageLink)
    .replace(/(src|href|srcset)="\/(?!\/)/g, '$1="./')
    .replace(/, \/_astro\//g, ', ./_astro/');
  writeFileSync(p, html);
}
console.log('Listo: abre ' + OUT + '/index.html');
