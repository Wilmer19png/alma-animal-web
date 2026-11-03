// Prepara la identidad para la web: recorta el aire transparente del logo y los personajes,
// y genera el ícono de la pestaña, el del celular y el logo de los correos.
// uso: node scripts/identidad.mjs (se puede correr varias veces)
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'node:fs';

const DIR = 'src/assets/identidad/';
for (const f of ['logo', 'gato', 'lobo', 'gato-miniatura', 'lobo-miniatura']) {
  const ruta = `${DIR}${f}.webp`;
  const datos = await sharp(readFileSync(ruta)).trim().webp({ quality: 90, alphaQuality: 100 }).toBuffer();
  writeFileSync(ruta, datos);
}

const logo = readFileSync(`${DIR}logo.webp`);
// cuadrado, con el logo centrado
const cuadrado = (lado, margen, fondo) => sharp(logo)
  .resize(lado - margen * 2, lado - margen * 2, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .extend({ top: margen, bottom: margen, left: margen, right: margen, background: fondo ?? { r: 0, g: 0, b: 0, alpha: 0 } })
  .flatten(fondo ? { background: fondo } : false)
  .png();

await cuadrado(64, 2).toFile('public/favicon.png');
await cuadrado(180, 22, '#FFFFFF').toFile('public/apple-touch-icon.png');
// correos: 128 px de ancho (se muestra a 64)
await sharp(logo).resize({ width: 128 }).png().toFile('public/correo/logo.png');
console.log('identidad lista');
