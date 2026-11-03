// Genera las versiones en negativo, de un solo color, del logo, el gato y el lobo (src/assets/identidad).
// El relleno queda del color elegido y los detalles (ojos, rayas, garras, huellas) quedan recortados
// (transparentes), como papel recortado. Uso: node scripts/negativos.mjs
//
// - gato: sus rayas son grandes y de color plano, así que se recorta todo lo oscuro.
// - logo y lobo: tienen sombras en degradado; ahí solo se recortan los detalles PEQUEÑOS (ojos, nariz,
//   huellas) y lo blanco puro (las huellitas de la M). Las sombras grandes quedan rellenas.
import sharp from 'sharp';

const DIR = 'src/assets/identidad/';
const PIEZAS = [
  { de: 'gato', umbral: 0.70, soloPequenos: false },
  { de: 'logo', umbral: 0.74, soloPequenos: true, maxArea: 0.004 },
  { de: 'lobo', umbral: 0.74, soloPequenos: true, maxArea: 0.004 }
];
const COLORES = { blanco: [255, 255, 255], tinta: [43, 30, 72] }; // tinta = #2B1E48

for (const p of PIEZAS) {
  const { data, info } = await sharp(DIR + p.de + '.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, N = W * H;
  const luz = new Float32Array(N), oscuro = new Uint8Array(N);
  for (let j = 0; j < N; j++) {
    const i = j * 4;
    luz[j] = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) / 255;
    oscuro[j] = data[i + 3] > 40 && luz[j] < p.umbral ? 1 : 0;
  }
  // detalles pequeños: manchas oscuras conectadas que ocupan menos de maxArea de la imagen
  const recortar = new Uint8Array(N);
  if (p.soloPequenos) {
    const visto = new Uint8Array(N), pila = new Int32Array(N);
    for (let s = 0; s < N; s++) {
      if (!oscuro[s] || visto[s]) continue;
      let top = 0, n = 0; const comp = [];
      pila[top++] = s; visto[s] = 1;
      while (top) {
        const q = pila[--top]; comp.push(q); n++;
        const x = q % W, y = (q / W) | 0;
        for (const v of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, y > 0 ? q - W : -1, y < H - 1 ? q + W : -1]) {
          if (v >= 0 && oscuro[v] && !visto[v]) { visto[v] = 1; pila[top++] = v; }
        }
      }
      if (n < p.maxArea * N) for (const q of comp) recortar[q] = 1;
    }
  } else recortar.set(oscuro);

  for (const [nombre, [r, g, b]] of Object.entries(COLORES)) {
    const out = Buffer.alloc(data.length);
    for (let j = 0; j < N; j++) {
      const i = j * 4, a = data[i + 3];
      let k = 1;
      if (luz[j] > 0.97 && a > 200) k = 0; // blanco puro del original: recorte
      else if (recortar[j]) k = 0;
      else if (p.soloPequenos && luz[j] < p.umbral + 0.03) {
        // borde suave alrededor de los recortes pequeños
        const x = j % W, y = (j / W) | 0;
        let cerca = 0;
        for (const v of [x > 0 ? j - 1 : -1, x < W - 1 ? j + 1 : -1, y > 0 ? j - W : -1, y < H - 1 ? j + W : -1]) if (v >= 0 && recortar[v]) cerca++;
        if (cerca) k = Math.max(0, Math.min(1, (luz[j] - p.umbral) / 0.03));
      } else if (!p.soloPequenos) k = Math.max(0, Math.min(1, (luz[j] - (p.umbral - 0.03)) / 0.06));
      out[i] = r; out[i + 1] = g; out[i + 2] = b; out[i + 3] = Math.round(a * k);
    }
    await sharp(out, { raw: { width: W, height: H, channels: 4 } })
      .trim({ threshold: 1 })
      .webp({ quality: 90, alphaQuality: 100 })
      .toFile(`${DIR}${p.de}-negativo-${nombre}.webp`);
  }
}
console.log('listo');
