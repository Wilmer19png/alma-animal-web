// Convierte el Excel de contabilidad (una hoja por mes: OCT, NOV… OCT26, NOV26) en el SQL que se pega en
// Supabase para llenar Contabilidad del gestor.
//   node scripts/contabilidad-excel.mjs "contabilidad/Contabilidad ACTUALIZADA.xlsx" --hasta=2026-10
// Escribe contabilidad/importar-excel.sql e imprime los totales por mes y categoría para revisarlos.
// Columnas de cada hoja: B/C consultorio · E/F peluquería · H/I petshop · K/L salidas.
// El consultorio se reparte según el nombre: consulta, medicamento, examen, procedimiento, vacuna o tienda.
import { readFileSync, writeFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// --hasta=2026-10: último mes que se importa. Desde que se usa el gestor, los baños entregados, las citas
// atendidas y los pedidos pagados ya suman solos en Contabilidad; importar esos meses del Excel los cuenta dos veces.
const HASTA = (process.argv.find((a) => a.startsWith('--hasta=')) ?? '--hasta=2026-10').slice(8);
const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const archivo = args[0] ?? 'contabilidad/Contabilidad ACTUALIZADA.xlsx';
const salida = args[1] ?? 'contabilidad/importar-excel.sql';
const POR = 'Excel Contabilidad vet'; // marca para poder borrar e importar de nuevo

/* ---------- leer el .xlsx (es un zip) sin dependencias ---------- */
function unzip(buf) {
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = buf.readUInt32LE(fin + 16);
  const n = buf.readUInt16LE(fin + 10), out = {};
  for (let i = 0; i < n; i++) {
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20);
    const ln = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + ln);
    const ini = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const datos = buf.subarray(ini, ini + tam);
    out[nombre] = (metodo === 8 ? inflateRawSync(datos) : datos).toString('utf8');
    p += 46 + ln + lx + lc;
  }
  return out;
}
const xml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const z = unzip(readFileSync(archivo));
const ss = [...(z['xl/sharedStrings.xml'] ?? '').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((s) => [...s[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => xml(t[1])).join(''));
const rels = Object.fromEntries([...z['xl/_rels/workbook.xml.rels'].matchAll(/<Relationship [^>]*>/g)].map((r) => [/Id="([^"]+)"/.exec(r[0])[1], /Target="([^"]+)"/.exec(r[0])[1]]));
const hojas = [...z['xl/workbook.xml'].matchAll(/<sheet [^>]*name="([^"]+)"[^>]*r:id="([^"]+)"/g)].map((m) => ({ nombre: m[1], ruta: 'xl/' + rels[m[2]].replace(/^\/?xl\//, '') }));

// celdas con valor escrito (las fórmulas de totales no se importan)
function celdas(ruta) {
  const filas = {};
  for (const r of z[ruta].matchAll(/<row [^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)) {
    const f = (filas[r[1]] = {});
    for (const c of r[2].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const cuerpo = c[3] ?? '';
      if (/<f[ >]/.test(cuerpo)) continue;
      const v = /<v>([\s\S]*?)<\/v>/.exec(cuerpo), is = /<t[^>]*>([\s\S]*?)<\/t>/.exec(cuerpo);
      let val = v ? xml(v[1]) : is ? xml(is[1]) : '';
      if (/t="s"/.test(c[2])) val = ss[+val];
      if (val !== '') f[c[1]] = val;
    }
  }
  return filas;
}

/* ---------- mes de cada hoja ---------- */
const MESES = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
// el libro empieza en octubre de 2025; las hojas con «26» son de 2026
const mesDe = (nombre) => {
  const m = MESES.indexOf(nombre.slice(0, 3).toUpperCase());
  if (m < 0) return null;
  const anio = /\d{2}$/.test(nombre) ? 2000 + +nombre.slice(-2) : m >= 9 ? 2025 : 2026;
  return `${anio}-${String(m + 1).padStart(2, '0')}`;
};

/* ---------- clasificación ---------- */
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
// ingresos del consultorio: el primer grupo que coincide gana; lo que no coincide es medicamento
const CONSULTORIO = [
  ['vacuna', /vacun|sextup|quintup|qupintup|quintip|triple|rabia|tos perrera|leu\b/],
  ['examen', /\beco\b|ecogra|ecigra|\brx\b|prequi|pre1ui|hemograma|quimica|\btest\b|coprosc|urian|uroan|citolog|histopat|snap|\bbun\b|examen|ex\+amen/],
  ['procedimiento', /cirug|\bcx\b|exodon|profi|hidrat|nebuliz|hospi|sedaci|gotero|oxi iv|procedim/],
  ['consulta', /consult|cnsult|conssult|\bdomi|certificado/],
  ['tienda', /\blatas?\b|galleta|renal balance|calabaza|guacal|morral|^jabon/]
];
const catConsultorio = (t) => CONSULTORIO.find(([, re]) => re.test(norm(t)))?.[0] ?? 'medicamento';
// salidas: el primer grupo que coincide gana; lo que no coincide es medicamentos y vacunas (droguería, laboratorio…)
const SALIDAS = [
  ['arriendo', /arriendo/],
  ['servicios', /\bluz\b|tigo|servicios|energia|\bagua\b|internet/],
  ['meta', /\bmeta\b|pauta|facebook|instagram/],
  ['insumos', /panolet|shampoo|jabon|orejer|corta unas|spray est|monos|temu spa|maquina|tijera/],
  ['merc', /majo|snack|llavero|calabaza|\blatas?\b|crema|cepillo|femur|hueso|deshid|cremos|arnes|italcol|creamy/],
  ['medic', /droguer|drogu/],
  ['otro', /peluquero|\bjuan\b|\bcris\b|contador|don wil|volante|\bdomi|feria|industr|idustria|\bgas\b|acarreo|tubo|nudos|transport|trasnport|lamina|aviso|^temu|camara|mutacion/]
];
const catSalida = (t) => SALIDAS.find(([, re]) => re.test(norm(t)))?.[0] ?? 'medic';

/* ---------- recorrer las hojas ---------- */
const COLS = [['B', 'C', 'consultorio'], ['E', 'F', 'spa'], ['H', 'I', 'tienda'], ['K', 'L', 'gasto']];
const movs = [];
const avisos = [];
for (const h of hojas) {
  const mes = mesDe(h.nombre);
  if (!mes) { avisos.push(`Hoja «${h.nombre}» ignorada: no sé de qué mes es.`); continue; }
  if (mes > HASTA) { avisos.push(`Hoja «${h.nombre}» no se importa: ese mes ya lo lleva el gestor (--hasta=${HASTA}).`); continue; }
  for (const [fila, f] of Object.entries(celdas(h.ruta))) {
    for (const [ct, cv, col] of COLS) {
      const valor = Number(f[cv]);
      if (!f[cv] || !Number.isFinite(valor) || valor <= 0) continue;
      const concepto = (f[ct] ?? '').toString().trim().replace(/\s+/g, ' ') || 'Sin nombre';
      if (/^(item|precio|valor)$/i.test(norm(concepto))) continue;
      const n = norm(concepto), donde = `${h.nombre} fila ${fila}: «${concepto}» ${valor}`;
      // «Libres» / «Utilidad» es plata que se sacan los socios: va en Reparto, no es ingreso ni gasto del negocio
      if (/^libres?$|utilidad/.test(n)) { avisos.push(`${donde} no se importa (es reparto entre socios).`); continue; }
      if (!f[ct]) avisos.push(`${h.nombre} fila ${fila}: valor ${valor} sin nombre.`);
      let tipo = col === 'gasto' ? 'gasto' : 'ingreso';
      let categoria = col === 'gasto' ? catSalida(concepto) : col === 'consultorio' ? catConsultorio(concepto) : col;
      // gastos fijos anotados por error en una columna de ingresos
      if (tipo === 'ingreso' && /^(arriendo|servicios|luz|agua|tigo|internet)\b|camara (y|de) comercio|industria y comercio/.test(n)) {
        tipo = 'gasto'; categoria = catSalida(concepto); avisos.push(`${donde} estaba en ingresos (${col}); se importa como gasto.`);
      }
      // en la columna del petshop: baños y medicamentos que se anotaron ahí
      if (col === 'tienda' && /^(perr[oa]|gat[oa]|bano)\b|^transporte/.test(n)) { categoria = 'spa'; avisos.push(`${donde} estaba en petshop; se importa como baño/spa.`); }
      if (col === 'tienda' && /meloxi|aciflux|credelio|nexgard|rondel|atrevia/.test(n)) { categoria = 'medicamento'; avisos.push(`${donde} estaba en petshop; se importa como medicamento.`); }
      movs.push({ fecha: `${mes}-01`, tipo, categoria, concepto: concepto.slice(0, 120), valor: Math.round(valor), hoja: h.nombre });
    }
  }
}

/* ---------- SQL ---------- */
const q = (s) => `'${s.replace(/'/g, "''")}'`;
const sql = `-- Ingresos y gastos de «${archivo.split(/[\\/]/).pop()}» para Contabilidad (generado con scripts/contabilidad-excel.mjs).
-- Sin fechas en el Excel: cada movimiento queda el día 1 de su mes. Antes, una sola vez: supabase/24-contabilidad-categorias.sql.
-- Se pega en Supabase → SQL Editor → Run. Se puede correr más de una vez: primero borra lo importado antes (por_nombre = '${POR}').
begin;
delete from public.libro_contable where por_nombre = ${q(POR)};
insert into public.libro_contable (fecha, tipo, categoria, concepto, valor, medio, pagado, por_nombre) values
${movs.map((m) => `  (${q(m.fecha)}, ${q(m.tipo)}, ${q(m.categoria)}, ${q(m.concepto)}, ${m.valor}, null, true, ${q(POR)})`).join(',\n')};
commit;
`;
writeFileSync(salida, sql);

/* ---------- resumen para revisar ---------- */
const meses = [...new Set(movs.map((m) => m.fecha.slice(0, 7)))];
const fmt = (n) => '$' + n.toLocaleString('es-CO');
for (const mes of meses) {
  const del = movs.filter((m) => m.fecha.startsWith(mes));
  const suma = (fn) => del.filter(fn).reduce((a, m) => a + m.valor, 0);
  const cats = [...new Set(del.map((m) => m.tipo + '/' + m.categoria))].map((k) => `${k.split('/')[1]} ${fmt(suma((m) => m.tipo + '/' + m.categoria === k))} (${del.filter((m) => m.tipo + '/' + m.categoria === k).length})`);
  const ing = suma((m) => m.tipo === 'ingreso'), gas = suma((m) => m.tipo === 'gasto');
  console.log(`${mes}: entra ${fmt(ing)} · sale ${fmt(gas)} · queda ${fmt(ing - gas)}\n   ${cats.join(' · ')}`);
}
if (process.argv.includes('--detalle')) for (const m of movs) console.log(`${m.hoja}\t${m.tipo}\t${m.categoria}\t${m.valor}\t${m.concepto}`);
for (const a of avisos) console.log('Ojo: ' + a);
console.log(`\n${movs.length} movimientos → ${salida}`);
