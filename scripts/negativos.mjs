// Genera las versiones en negativo, de un solo color, del gato y el lobo (src/assets/identidad).
// El relleno queda del color elegido y los detalles (ojos, rayas, garras, huellas) se dibujan con un
// reborde: la línea del contorno queda y el centro se recorta, como papel. Así las garras del borde no se
// pierden: quedan como una línea. El logo NO se usa en negativo (va siempre con sus colores).
// Uso: node scripts/negativos.mjs
import sharp from 'sharp';
import { unlinkSync, existsSync, copyFileSync } from 'node:fs';

const DIR = 'src/assets/identidad/';
// umbral: qué tan oscuro es un detalle (0–1). maxPx: en el lobo solo se tratan los detalles pequeños
// (ojo, nariz, huellas; menos de maxPx píxeles); sus sombras grandes en degradado quedan rellenas. linea: grosor del reborde (px).
const PIEZAS = [
  { de: 'gato', umbral: 0.70, linea: 5 },
  { de: 'lobo', umbral: 0.72, maxPx: 2100, linea: 4 }
];
const COLORES = { blanco: [255, 255, 255], tinta: [43, 30, 72], morado: [101, 87, 133] }; // tinta = #2B1E48 · morado = #655785 (--primary)

for (const p of PIEZAS) {
  const { data, info } = await sharp(DIR + p.de + '.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const vec = (q) => { const x = q % W, y = (q / W) | 0; return [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]; };
  const luz = new Float32Array(N);
  const detalle = new Uint8Array(N);
  for (let j = 0; j < N; j++) {
    const i = j * 4;
    luz[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    detalle[j] = data[i + 3] > 40 && luz[j] < p.umbral ? 1 : 0;
  }
  // cada detalle (mancha oscura conectada): si toca el borde del dibujo (como las garras) se dibuja con
  // reborde; si está adentro (ojos, rayas, huellas) se recorta completo. En el lobo solo cuentan los pequeños.
  const hueco = new Uint8Array(N);
  {
    const visto = new Uint8Array(N), pila = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!detalle[s] || visto[s]) continue;
      let top = 0, tocaFondo = false; const comp = [];
      pila[top++] = s; visto[s] = 1;
      while (top) {
        const q = pila[--top]; comp.push(q);
        for (const v of vec(q)) { if (v < 0 || data[v * 4 + 3] <= 40) tocaFondo = true; else if (detalle[v] && !visto[v]) { visto[v] = 1; pila[top++] = v; } }
      }
      if (p.maxPx && comp.length >= p.maxPx) continue; // sombra grande del lobo: queda rellena
      if (!tocaFondo) { for (const q of comp) hueco[q] = 1; continue; }
      // reborde: se come el detalle desde su borde; lo que queda adentro se recorta
      let dentro = new Set(comp);
      for (let k = 0; k < p.linea; k++) { const sig = new Set(); for (const q of dentro) { let ok = true; for (const v of vec(q)) if (v < 0 || !dentro.has(v)) { ok = false; break; } if (ok) sig.add(q); } dentro = sig; }
      for (const q of dentro) hueco[q] = 1;
    }
  }
  // cierra las uniones internas del dibujo (líneas finas casi transparentes entre piezas)
  const alfa = new Uint8Array(N);
  for (let j = 0; j < N; j++) { let m = data[j * 4 + 3]; for (const v of vec(j)) if (v >= 0) m = Math.max(m, data[v * 4 + 3]); alfa[j] = m; }
  const alfa2 = new Uint8Array(N);
  for (let j = 0; j < N; j++) { let m = alfa[j]; for (const v of vec(j)) if (v >= 0) m = Math.min(m, alfa[v]); alfa2[j] = m; }
  for (const [nombre, [r, g, b]] of Object.entries(COLORES)) {
    const out = Buffer.alloc(data.length);
    for (let j = 0; j < N; j++) {
      const i = j * 4;
      out[i] = r; out[i + 1] = g; out[i + 2] = b;
      out[i + 3] = hueco[j] ? 0 : alfa2[j];
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .blur(0.6) // suaviza el borde de los recortes
      .trim({ threshold: 1 })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(`${DIR}${p.de}-negativo-${nombre}.webp`);
  }
}
// el logo va siempre con sus colores: se quitan los negativos que hubiera
for (const c of ['blanco', 'tinta']) { const f = `${DIR}logo-negativo-${c}.webp`; if (existsSync(f)) unlinkSync(f); }
console.log('listo');
// los negativos en blanco que pide el CSS (tarjetas del equipo) van en public para que tengan ruta fija
for (const f of ['gato', 'lobo']) copyFileSync(`${DIR}${f}-negativo-blanco.webp`, `public/identidad/${f}-negativo-blanco.webp`);
