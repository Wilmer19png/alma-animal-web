// Copia la página construida a una carpeta que se abre con doble clic (sin servidor):
// construye sin comprimir, cambia las rutas absolutas por relativas
// y apunta los enlaces entre páginas a sus archivos .html (también las de subcarpetas, como producto/).
// uso: npm run vista
import { cpSync, readdirSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { buildSync } from 'esbuild';

execSync('npx astro build', { stdio: 'inherit', env: { ...process.env, VISTA: '1' } });

const OUT = 'C:/Users/wburi/OneDrive/Escritorio/Página web_Alma animal/vista-previa';
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync('dist', OUT, { recursive: true });

const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) =>
  d.isDirectory() ? (d.name === '_astro' ? [] : walk(join(dir, d.name))) : d.name.endsWith('.html') ? [join(dir, d.name)] : []);
const files = walk(OUT);
// "producto/shampoo" para dist/producto/shampoo.html
const pages = new Set(files.map((f) => relative(OUT, f).replace(/\\/g, '/').replace(/\.html$/, '')));

// Abriendo con doble clic (file://) el navegador bloquea los scripts tipo módulo que se cargan
// desde un archivo. Cada uno se empaqueta como script clásico (con sus importaciones adentro).
const done = new Map();
const classic = (name) => {
  if (!done.has(name)) {
    const out = `${name}.vista.js`;
    buildSync({ entryPoints: [join(OUT, '_astro', `${name}.js`)], bundle: true, format: 'iife', outfile: join(OUT, '_astro', out), logLevel: 'error' });
    done.set(name, out);
  }
  return done.get(name);
};

for (const f of files) {
  const depth = relative(OUT, f).split(/[\\/]/).length - 1;
  const up = depth ? '../'.repeat(depth) : './';
  // /consultorio#x -> consultorio.html#x ; / -> index.html ; páginas que aún no existen se dejan igual
  const pageLink = (match, name, hash = '') => {
    if (name === '') return `href="${up}index.html${hash}"`;
    if (pages.has(name)) return `href="${up}${name}.html${hash}"`;
    return match;
  };
  const html = readFileSync(f, 'utf8')
    .replace(/<script type="module" src="\/_astro\/([^"]+)\.js"><\/script>/g, (m, name) => `<script defer src="/_astro/${classic(name)}"></script>`)
    .replace(/href="\/([a-z0-9/-]*)(#[^"]*)?"/g, pageLink)
    .replace(/(src|href|srcset)="\/(?!\/)/g, `$1="${up}`)
    .replace(/, \/_astro\//g, `, ${up}_astro/`);
  writeFileSync(f, html);
}
console.log('Listo: abre ' + OUT + '/index.html');
