// Intérprete de la tabla nutricional a partir de lo que lee el OCR (PaddleOCR en el teléfono):
// cada trozo de texto con su caja. Reconstruye filas aunque la foto esté torcida, reconoce los nombres
// de nutrientes en español e inglés aunque el OCR los lea con errores ("GrasaTotal", "Protelnas"),
// separa las columnas (por porción, por 100 g, % del valor diario) y revisa que los números tengan sentido.
// No inventa: lo que no se lee queda vacío y lo dudoso se marca para revisarlo.
import { CLAVES_ETIQUETA, lecturaVacia, nombreNutriente, unidadDe } from './etiqueta.js';

// ---------- texto ----------
export const plano = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const junto = (t) => plano(t).replace(/[^a-z0-9%]/g, '');
function lev(a, b) {
  if (a === b) return 0; if (!a.length) return b.length; if (!b.length) return a.length;
  let p = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; }
  return p[b.length];
}
// ¿el rótulo empieza por (o es) esta palabra, tolerando errores del OCR?
function empieza(l, s) {
  if (l.startsWith(s)) return 0;
  if (s.length < 5) return 99; // palabras cortas: solo exactas
  const corte = l.slice(0, s.length); const max = Math.floor(s.length * 0.2);
  const d = lev(corte, s); return d <= max ? d : 99;
}

// ---------- nutrientes ----------
// de lo más específico a lo más general; cada sinónimo sin espacios ni tildes
const SIN = [
  ['azucares_anadidos', ['azucaresanadidos', 'azucaresagregados', 'azucaresadicionados', 'addedsugars', 'addedsugar', 'incluye', 'includes']],
  ['grasa_saturada', ['grasasaturada', 'grasassaturadas', 'grasasat', 'acidosgrasossaturados', 'delascualessaturadas', 'delascualesacidosgrasossaturados', 'saturadas', 'saturada', 'saturatedfat', 'saturated', 'satfat']],
  ['grasa_trans', ['grasatrans', 'grasastrans', 'acidosgrasostrans', 'transfat', 'trans']],
  ['grasa_monoinsaturada', ['grasamonoinsaturada', 'grasasmonoinsaturadas', 'acidosgrasosmonoinsaturados', 'monoinsaturadas', 'monoinsaturada', 'monounsaturatedfat', 'monounsaturated']],
  ['grasa_poliinsaturada', ['grasapoliinsaturada', 'grasaspoliinsaturadas', 'acidosgrasospoliinsaturados', 'poliinsaturadas', 'poliinsaturada', 'polyunsaturatedfat', 'polyunsaturated']],
  ['grasa_total', ['grasatotal', 'grasastotales', 'grasatotales', 'totalfat', 'lipidostotales', 'lipidos', 'grasas', 'grasa', 'materiagrasa', 'fat']],
  ['colesterol', ['colesterol', 'cholesterol']],
  ['sodio', ['sodio', 'sodium']],
  ['sal', ['sal', 'salt']],
  ['fibra_total', ['fibradietetica', 'fibradietaria', 'fibraalimentaria', 'fibratotal', 'fibra', 'dietaryfiber', 'dietaryfibre', 'fiber', 'fibre']],
  ['azucares_totales', ['azucarestotales', 'delascualesazucares', 'deloscualesazucares', 'azucares', 'azucar', 'totalsugars', 'sugars', 'sugar']],
  ['almidon', ['almidon', 'starch']],
  ['carbohidratos_etiqueta', ['carbohidratostotales', 'carbohidratototal', 'carbohidratostotal', 'totalcarbohydrates', 'totalcarbohydrate', 'hidratosdecarbono', 'carbohidratos', 'carbohidrato', 'carbohydrates', 'carbohydrate', 'glucidostotales', 'glucidos', 'totalcarbs', 'totalcarb', 'carbtotal', 'carbohtotal']],
  ['proteina', ['proteinas', 'proteina', 'proteins', 'protein']],
  ['potasio', ['potasio', 'potassium']], ['calcio', ['calcio', 'calcium']], ['hierro', ['hierro', 'iron']], ['magnesio', ['magnesio', 'magnesium']],
  ['zinc', ['zinc', 'cinc']], ['fosforo', ['fosforo', 'phosphorus']],
  ['vitamina_c', ['vitaminac', 'vitaminc', 'vitc']], ['vitamina_d', ['vitaminad', 'vitamind', 'vitd']], ['vitamina_e', ['vitaminae', 'vitamine', 'vite']], ['vitamina_a_rae', ['vitaminaa', 'vitamina', 'vita']],
  ['vitamina_b12', ['vitaminab12', 'b12']], ['vitamina_b6', ['vitaminab6', 'b6']], ['tiamina', ['tiamina', 'thiamin', 'thiamine', 'vitaminab1']], ['riboflavina', ['riboflavina', 'riboflavin', 'vitaminab2']],
  ['niacina', ['niacina', 'niacin', 'vitaminab3']], ['acido_folico', ['acidofolico', 'folicacid', 'folato', 'folate']], ['cafeina', ['cafeina', 'caffeine']],
];
const ENERGIA = ['valorenergetico', 'contenidoenergetico', 'aporteenergetico', 'energiatotal', 'energia', 'energy', 'kilocalorias', 'calorias', 'caloria', 'calories', 'calorie', 'kcal', 'kj'];
// rótulos que tienen números pero no son un nutriente de la tabla
const NO = ['apartirdelagrasa', 'aportadasporlagrasa', 'aportadaporlagrasa', 'provenientesdelagrasa', 'caloriasdegrasa', 'caloriasdelagrasa', 'caloriesfromfat', 'fromfat', 'delagrasa', 'humedad', 'cenizas',
  'valordiario', 'valoresdiarios', 'dailyvalue', 'requerimiento', 'ingestadiaria', 'porcentaje', 'basados', 'basadoen', 'dietade', 'caloriasporgramo', 'caloriespergram', 'porgramo', 'pergram', 'ingrediente', 'contenidoneto', 'pesoneto', 'netwt', 'lote', 'vence', 'consumir'];
const DISPONIBLES = ['carbohidratosdisponibles', 'hidratosdecarbonodisponibles', 'carbohidratosasimilables'];

export function nutrienteDe(rotulo) {
  const l = junto(rotulo).replace(/^(de)?(las|los)?cuales/, '').replace(/^(total|totales)/, (m) => m);
  if (!l || l.length < 2) return null;
  if (NO.some((x) => l.includes(x))) return null;
  if (DISPONIBLES.some((x) => empieza(l, x) < 99)) return { codigo: 'carbohidratos_etiqueta', disponibles: true };
  if (/kj/.test(l) && ENERGIA.some((x) => l.includes(x) || empieza(l, x) < 99)) return { codigo: 'energia_kj' };
  if (ENERGIA.some((x) => empieza(l, x) < 99) || /^(valor)?energ/.test(l) || /(energetic|energia|calorias|calories)/.test(l)) return { codigo: 'energia_kcal' };
  let mejor = null;
  for (const [codigo, ss] of SIN) for (const s of ss) { const d = empieza(l, s); if (d < 99 && (!mejor || d < mejor.d || (d === mejor.d && s.length > mejor.s.length))) mejor = { codigo, d, s }; if (d === 0) break; }
  if (!mejor) { // "Total Fat", "Grasa total" con el total adelante o atrás; "de las cuales saturadas"
    for (const [codigo, ss] of SIN) for (const s of ss) if (s.length >= 5 && l.includes(s)) return { codigo };
    return null;
  }
  return { codigo: mejor.codigo };
}

// ---------- números ----------
const UNI = { g: 'g', gr: 'g', grs: 'g', gramos: 'g', mg: 'mg', mcg: 'µg', 'µg': 'µg', 'μg': 'µg', ug: 'µg', kcal: 'kcal', kcai: 'kcal', kca: 'kcal', kcl: 'kcal', kal: 'kcal', kj: 'kJ', kl: 'kJ', cal: 'kcal', ml: 'ml', ui: 'UI', iu: 'UI' };
// arregla letras que el OCR confunde con números cuando están pegadas a dígitos ("O g" → "0 g", "l5" → "15")
export function limpiarNumeros(t) {
  return String(t || '')
    .replace(/(?<=\d)[oO](?=[\s.,]?\d|\s?[gm%])/g, '0').replace(/(?<![a-z])[oO](?=[.,]\d|\s?(g|mg)\b)/gi, '0')
    .replace(/(?<=\d)[lI](?=\d)/g, '1').replace(/(?<![a-zA-Z])[lI](?=\d|[.,]\d)/g, '1')
    .replace(/([a-záéíóúñ])O(?=\s?(mg|mcg|g)\b)/g, '$1 0') // "CholesterolOmg" → "Cholesterol 0mg"
    .replace(/(^|[\s<(/])([Il|]{1,3})(?=\s?(g|mg|mcg|%)(?![a-z]))/g, (m, a, b) => a + '1'.repeat(b.length)) // "Fiber lg", "Ilg" → 1 g, 11 g
    .replace(/(\d)\s*[,.]\s*(\d)/g, '$1,$2')
    .replace(/(\d)\s+(mg|g|kcal|kj|mcg|ug|µg|gr)\b/gi, '$1 $2');
}
const RE_VAL = /(<|menos de|less than)?\s*(\d+(?:,\d+)?)\s*(kcal|kcai|kca|kcl|kal|kj|kl|mg|mcg|µg|μg|ug|grs|gr|g|ml|ui|iu|cal)?(?![a-z])\s*(%)?/gi;
const num = (s) => Number(String(s).replace(',', '.'));

// valores de un texto con la posición de cada uno dentro del trozo
function valoresDe(texto) {
  const t = limpiarNumeros(texto); const out = [];
  for (const m of t.matchAll(RE_VAL)) {
    if (!m[2]) continue; const ini = m.index + m[0].indexOf(m[2]);
    const antes = t.slice(Math.max(0, ini - 1), ini);
    if (/[a-z]/i.test(antes)) { const pal = (t.slice(0, ini).match(/[a-záéíóúñ]+$/i) || [''])[0]; if (pal.length <= 2 || /(omega|vitamina|vit)$/i.test(pal)) continue; } // "B12", "Omega3": parte del nombre
    out.push({ v: num(m[2]), u: m[3] ? UNI[m[3].toLowerCase()] || '' : '', pct: !!m[4], menor: !!m[1], pos: ini / Math.max(1, t.length), largo: m[2].length, crudo: m[0].trim() });
  }
  return out;
}

// ---------- geometría ----------
// trozos: [{ text, box: { x, y, width, height }, confidence }] (o ya planos {t, x0, y0, x1, y1, conf})
export function normalizarTrozos(lineas) {
  const grupos = Array.isArray(lineas?.[0]) ? lineas : [lineas || []];
  const out = []; grupos.forEach((g, gi) => (g || []).forEach((s) => {
    const b = s.box || s; const t = String(s.text ?? s.t ?? '').trim(); if (!t) return;
    const x0 = b.x ?? b.x0, y0 = b.y ?? b.y0, x1 = b.width != null ? b.x + b.width : b.x1, y1 = b.height != null ? b.y + b.height : b.y1;
    out.push({ t, x0, y0, x1, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h: y1 - y0, w: x1 - x0, conf: s.confidence ?? s.conf ?? 1, g: gi });
  }));
  return out;
}
const mediana = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
// inclinación de la foto: con los trozos que el OCR puso en la misma línea
export function inclinacion(tr) {
  const pend = [];
  const porG = new Map(); tr.forEach((s) => { if (!porG.has(s.g)) porG.set(s.g, []); porG.get(s.g).push(s); });
  for (const g of porG.values()) { const s = [...g].sort((a, b) => a.cx - b.cx); for (let i = 1; i < s.length; i++) { const dx = s[i].cx - s[i - 1].cx; if (dx > s[i].h) { const m = (s[i].cy - s[i - 1].cy) / dx; if (Math.abs(m) < 0.25) pend.push(m); } } }
  return pend.length >= 2 ? mediana(pend) : 0;
}
// filas: trozos agrupados por altura una vez corregida la inclinación
export function filas(tr) {
  const m = inclinacion(tr); const hm = mediana(tr.map((s) => s.h)) || 10;
  const xs = tr.map((s) => ({ ...s, yr: s.cy - m * s.cx })).sort((a, b) => a.yr - b.yr);
  const out = [];
  for (const s of xs) {
    const f = out.find((r) => Math.abs(r.yr - s.yr) < 0.5 * Math.min(Math.max(s.h, hm * 0.6), Math.max(r.h, hm * 0.6)) && !r.trozos.some((o) => Math.min(o.x1, s.x1) - Math.max(o.x0, s.x0) > 0.3 * Math.min(o.w, s.w)));
    if (f) { f.trozos.push(s); f.yr = (f.yr * (f.trozos.length - 1) + s.yr) / f.trozos.length; f.h = Math.max(f.h, s.h); }
    else out.push({ yr: s.yr, h: s.h, trozos: [s] });
  }
  out.forEach((r) => { r.trozos.sort((a, b) => a.x0 - b.x0); r.texto = r.trozos.map((s) => s.t).join(' '); });
  return out.sort((a, b) => a.yr - b.yr);
}

// ---------- tabla ----------
const ES_100 = /(por|per|cada|en)\s*100\s*(g|gr|grs|gramos|ml|cc)\b|100\s*(g|gr|ml)\s*(de\s*producto|del\s*producto)?/i;
const RE_KEY_PORCION = /(tama[ñn]o\s*(de\s*(la|una)?|por|de)?\s*(porci[oó]n|raci[oó]n)\b|\bt?ama[ñn]?n?o\s*(de\s*(la|una)\s*|por\s*)[a-zñóíj]{4,9}\b|\bt?ama[ñn]?n?o\s*de\s*la\s*[a-zñóíj]{2,5}\s[a-zñóíj]{2,5}:|\bporc[iíl1][oóòd06]n\s*:|una\s*porci[oó]n\s*(es|de|equivale)\b|t?ama[ñn]?o\s*por\s*porci[oó]n\b|serving\s*size|serv\.?\s*size|^\s*porci[oó]n\b|^\s*raci[oó]n\b|(?<!(cantidad|aporte|valores?|amount|contenido)\s*)por\s*porci[oó]n\b(?!\s*\/|\s*$)|porci[oó]n\s*(de\b|:)|raci[oó]n\s*(de\b|:)|1\s*porci[oó]n\b)/i;
// "30 g", "30g", "(30 9)" o "30 q" (la g leída como 9 o q), "240 mL", "(400 m)"
const RE_CANT = /(\d+(?:,\d+)?)\s*(gramos|grs|gr|g|ml|cc|q(?=\b|\))|9(?=\s*\))|m(?=\s*\)))(?![a-z])/i;
const cantDe = (m) => ({ cantidad: num(m[1]), unidad: /^(ml|cc|m)$/i.test(m[2]) ? 'ml' : 'g' });
// texto de una sola línea (para pruebas): "Tamaño por porción: 1 taza (30 g)"
function porcionDe(texto, siguientes = '') {
  const t = limpiarNumeros(texto); const k = t.search(RE_KEY_PORCION);
  if (k < 0) return null;
  let resto = t.slice(k, k + 90); let m = resto.match(RE_CANT);
  if (!m && siguientes) { const par = limpiarNumeros(siguientes).match(/\(\s*(\d+(?:,\d+)?)\s*(gramos|grs|gr|g|ml|cc|q|9|m)\s*\)/i); if (par) { resto = `${resto} ${par[0]}`; m = par; } }
  if (!m || num(m[1]) <= 0 || num(m[1]) > 2000) return null;
  return { ...cantDe(m), texto: resto.replace(/^(tama[ñn]o\s*(de\s*(la|una)?|por)?\s*(porci[oó]n|raci[oó]n)|serving\s*size|por\s*porci[oó]n|porci[oó]n|raci[oó]n)\s*:?\s*/i, '').slice(0, 50).trim() };
}
// con la geometría: el número va en el mismo trozo que "Tamaño de la porción", en el trozo de al lado
// o en la misma columna de las dos filas siguientes (entre paréntesis, como "(56 g)")
function porcionEnFilas(fs) {
  for (let i = 0; i < fs.length; i++) {
    for (const s of fs[i].trozos) {
      const t = limpiarNumeros(s.t); const k = t.search(RE_KEY_PORCION); if (k < 0) continue;
      const cola = t.slice(k); let m = cola.match(RE_CANT); let txt = cola;
      if (!m) { const vec = fs[i].trozos.find((o) => o.x0 >= s.x1 - 2 && o.x0 - s.x1 < s.h * 4); if (vec) { const mm = limpiarNumeros(vec.t).match(RE_CANT); if (mm && limpiarNumeros(vec.t).search(mm[0]) < 25) { m = mm; txt = `${cola} ${vec.t}`; } } }
      if (!m) for (const f2 of fs.slice(i + 1, i + 3)) { const o = f2.trozos.find((x) => Math.min(x.x1, s.x1 + s.w) - Math.max(x.x0, s.x0 - s.w * 0.3) > 0 && /\(\s*\d+(?:,\d+)?\s*(gramos|grs|gr|g|ml|cc|q|9|m)\s*\)|^\s*\d+(?:,\d+)?\s*(g|gr|ml)\b/i.test(limpiarNumeros(x.t))); if (o) { const mm = limpiarNumeros(o.t).match(/\(?\s*(\d+(?:,\d+)?)\s*(gramos|grs|gr|g|ml|cc|q|9|m)\s*\)?/i); if (mm) { m = mm; txt = `${cola} ${o.t}`; break; } } }
      if (m && num(m[1]) > 0 && num(m[1]) <= 2000) return { ...cantDe(m), texto: txt.replace(/^(tama[ñn]o\s*(de\s*(la|una)?|por)?\s*(porci[oó]n|raci[oó]n)|serving\s*size|serv\.?\s*size|por\s*porci[oó]n|porci[oó]n|raci[oó]n)\s*[:/]?\s*/i, '').slice(0, 50).trim() };
    }
  }
  return null;
}

// qué tan coherente es una lectura (para elegir entre dos formas de leer las filas)
export function coherencia(l) {
  let s = 0; for (const f of l.filas) { s += 1; if (f.confirmado) s += 0.6; if (f.dudoso) s -= 0.5; }
  if (l.cuadra === true) s += 2; if (l.cuadra === false) s -= 1.5;
  return s;
}
// en fotos en perspectiva la columna de la derecha baja y sus números quedan en una fila propia, sin rótulo:
// esos números sueltos se suben a la fila anterior si allí falta un número en esa columna
function subirDerecha(fs, ancho) {
  const out = fs.map((f) => ({ ...f, trozos: [...f.trozos] }));
  for (let i = 1; i < out.length; i++) {
    if (out[i].trozos.some((s) => /[a-z]{2,}/i.test(s.t))) continue; // la fila tiene su rótulo: no es un número suelto
    const sueltos = out[i].trozos.filter((s) => s.cx > ancho * 0.55 && /\d/.test(s.t));
    if (!sueltos.length) continue;
    const prev = out[i - 1]; if (!/[a-z]{3,}/i.test(prev.texto)) continue;
    if (sueltos.some((s) => prev.trozos.some((o) => /\d/.test(o.t) && Math.abs(o.cx - s.cx) < Math.max(s.w, o.w)))) continue;
    prev.trozos.push(...sueltos); out[i].trozos = out[i].trozos.filter((s) => !sueltos.includes(s));
  }
  return out.filter((f) => f.trozos.length).map((f) => ({ ...f, trozos: f.trozos.sort((a, b) => a.x0 - b.x0), texto: f.trozos.sort((a, b) => a.x0 - b.x0).map((s) => s.t).join(' ') }));
}
// Celdas de varias líneas (tablas europeas): "de las cuales" / "1,2 g   0,5 g" / "saturadas", o "1580 kJ / 375" con
// "kcal" debajo. Se juntan en una sola fila: el rótulo partido arriba y abajo de los números, y las unidades sueltas
// con el número de encima. Solo cuando los renglones están pegados (dentro de la misma celda).
const RE_SOLO_UNI = /^\(?(g|mg|kcal|kj|ui|µg|μg|mcg|ug|ml)\.?\)?$/i;
export function unirCeldas(fs0) {
  const fs = fs0.map((f) => ({ ...f, trozos: [...f.trozos] }));
  const hm = mediana(fs.flatMap((f) => f.trozos.map((s) => s.h))) || 10;
  const conRot = (f) => f.trozos.some((s) => /[a-záéíóúñ]{3,}/i.test(s.t) && !/\d/.test(limpiarNumeros(s.t)) && !RE_SOLO_UNI.test(s.t.trim()));
  const conVal = (f) => f.trozos.some((s) => /\d/.test(limpiarNumeros(s.t)));
  // renglón de solo números (con sus unidades): "1,2 g   0,5 g", "1580 kJ / 375"
  const soloNumeros = (f) => f.trozos.every((s) => !/[a-záéíóúñ]{2,}/i.test(limpiarNumeros(s.t).replace(/\d+(?:,\d+)?\s*(kcal|kj|mg|mcg|µg|μg|ug|g|ml|ui|iu)\b/gi, ' ').replace(/\b(kcal|kj)\b/gi, ' ')));
  const soloUni = (f) => f.trozos.length && f.trozos.every((s) => RE_SOLO_UNI.test(s.t.trim()));
  const pareceEncabezado = (f) => ES_100.test(limpiarNumeros(f.texto)) || RE_KEY_PORCION.test(limpiarNumeros(f.texto)) || /^\s*\(\s*\d+(?:[.,]\d+)?\s*(g|ml)\s*\)\s*$/i.test(f.texto);
  const usados = new Set();
  // 1) unidades solas debajo de un número: "375" + "kcal"
  fs.forEach((f, i) => {
    if (!soloUni(f)) return;
    for (let j = i - 1; j >= 0 && f.yr - fs[j].yr <= 2.2 * hm; j--) {
      if (!conVal(fs[j]) || usados.has(j)) continue;
      f.trozos.forEach((u) => {
        const cerca = fs[j].trozos.filter((s) => /\d/.test(s.t)).map((s) => ({ s, d: Math.abs(u.x0 - s.x1) })).sort((a, b) => a.d - b.d)[0];
        if (cerca && cerca.d < Math.max(u.w, u.h) * 3) cerca.s.t = `${cerca.s.t} ${u.t}`;
      });
      usados.add(i); break;
    }
  });
  // 2) números sin rótulo entre (o junto a) renglones con solo rótulo y pegados: el rótulo de la celda
  fs.forEach((v, i) => {
    if (usados.has(i) || !conVal(v) || !soloNumeros(v) || pareceEncabezado(v)) return;
    const cerca = (j) => j >= 0 && j < fs.length && !usados.has(j) && conRot(fs[j]) && !conVal(fs[j]) && Math.abs(fs[j].yr - v.yr) <= 1.35 * hm;
    const P = cerca(i - 1) ? fs[i - 1] : null, N = cerca(i + 1) ? fs[i + 1] : null;
    const opciones = [[P, N], [P], [N]].filter((o) => o.every(Boolean));
    const elegida = opciones.find((o) => nutrienteDe(o.map((f) => f.texto).join(' ')));
    if (!elegida) return;
    const tr = elegida.flatMap((f) => f.trozos);
    const rot = { ...tr[0], t: elegida.map((f) => f.texto).join(' '), x0: Math.min(...tr.map((s) => s.x0)), x1: Math.max(...tr.map((s) => s.x1)) };
    rot.w = rot.x1 - rot.x0; rot.cx = (rot.x0 + rot.x1) / 2;
    v.trozos = [rot, ...v.trozos.filter((s) => s.x0 >= rot.x1 - 2 || /\d/.test(s.t))];
    elegida.forEach((f) => usados.add(fs.indexOf(f)));
  });
  return fs.filter((_, i) => !usados.has(i)).map((f) => { f.trozos.sort((a, b) => a.x0 - b.x0); f.texto = f.trozos.map((s) => s.t).join(' '); return f; });
}
export function leerTabla(lineasOCR) {
  const tr = normalizarTrozos(lineasOCR);
  if (!tr.length) { const l = lecturaVacia('telefono'); l.avisos.push('No se leyó texto en la foto de la tabla. Prueba otra foto: de frente, con buena luz y sin reflejos.'); return l; }
  const fs = filas(tr); const a = leerFilas(fs);
  const ancho = Math.max(...tr.map((s) => s.x1)); const fs2 = subirDerecha(fs, ancho);
  if (fs2.some((f, i) => f.texto !== fs[i]?.texto)) { const b = leerFilas(fs2); if (coherencia(b) >= coherencia(a) + 2) return b; }
  return a;
}
function leerFilas(fs) {
  const l = lecturaVacia('telefono'); const todo = fs.map((f) => f.texto).join('\n');
  // porción, porciones por envase y si la tabla es por 100 g
  const pf = porcionEnFilas(fs); if (pf) l.porcion = pf;
  if (!l.porcion.cantidad) { const m = limpiarNumeros(todo).match(/(porci[oó]n|raci[oó]n|serving)[^\n]{0,30}?\((\d+(?:,\d+)?)\s*(g|gr|ml)\)/i); if (m) l.porcion = { cantidad: num(m[2]), unidad: /ml/i.test(m[3]) ? 'ml' : 'g', texto: m[0] }; }
  const me = limpiarNumeros(todo).match(/(porciones|raciones|servings)[^\n\d]{0,40}(\d+(?:,\d+)?)|(\d+(?:,\d+)?)\s*(servings|porciones|raciones)\s*(per|por)/i);
  if (me) l.porciones_envase = num(me[2] || me[3]);
  // columnas: el encabezado con "100 g" y "porción" dice dónde está cada una
  let col100 = null, colPorcion = null; let hay100 = false; let colPct = null;
  const hmF = mediana(fs.flatMap((f) => f.trozos.map((s) => s.h))) || 10; const cands100 = [], candsPor = [];
  for (const f of fs) {
    const aPct = f.trozos.find((s) => /(%|\b)\s*(v\.?\s*d|d\.?\s*r|r\.?d\.?a|i\.?d\.?r|d\.?v|vdr|valor(es)?\s*diario|daily\s*value|ingesta\s*diaria|requerimiento)/i.test(s.t) && /%|vd|dr|rda|idr|dv/i.test(s.t));
    if (aPct && colPct == null) colPct = aPct.cx;
    const a100 = f.trozos.find((s) => ES_100.test(limpiarNumeros(s.t)) || /^\s*100\s*(g|ml|gr)\s*$/i.test(s.t));
    const aPor = f.trozos.find((s) => /(porci[oó]n|raci[oó]n|serving|envase)/i.test(s.t) && !ES_100.test(s.t));
    if (a100) { hay100 = true; cands100.push(a100); }
    if (aPor) candsPor.push(aPor);
  }
  // el encabezado "Por 100 g" y "Por porción" puede estar en dos renglones (celdas de dos líneas): basta que estén cerca
  const RE_PAR = /\((\d+(?:[.,]\d+)?)\s*(g|ml)\)/i;
  for (const a100 of cands100) {
    const aPor = candsPor.find((s) => s !== a100 && Math.abs(s.cy - a100.cy) <= 2.5 * hmF && Math.abs(s.cx - a100.cx) > Math.max(s.w, a100.w) * 0.5);
    if (!aPor) continue;
    col100 = a100.cx; colPorcion = aPor.cx;
    // "(40 g)" en el mismo trozo o justo debajo, en la misma columna
    const debajo = fs.flatMap((f) => f.trozos).find((s) => s !== aPor && s.cy > aPor.cy && s.cy - aPor.cy <= 2.5 * hmF && Math.abs(s.cx - aPor.cx) < Math.max(s.w, aPor.w) && RE_PAR.test(s.t));
    const pt = RE_PAR.test(aPor.t) ? aPor.t : debajo?.t; const m = pt && pt.match(RE_PAR);
    const pp = porcionDe(aPor.t) || (m && { cantidad: num(m[1]), unidad: /ml/i.test(m[2]) ? 'ml' : 'g', texto: m[0] });
    if (pp && !l.porcion.cantidad) l.porcion = pp;
    break;
  }
  // la nota al pie con los valores diarios de referencia (2.000 y 2.500 kcal) no es parte de la tabla
  const pie = fs.findIndex((f, i) => i > 2 && /(2[.,]?000)\D{1,25}2[.,]?500|less\s*than|menos\s*de\s*\d+\s*(g|mg)\D+\d+\s*(g|mg)/i.test(limpiarNumeros(f.texto)));
  const fsTabla = unirCeldas(pie > 0 ? fs.slice(0, pie) : fs);
  // columna de unidades ("g", "mg", "UI" en su propia columna): ahí un "9" es una "g" leída mal, no un número
  const RE_UNI = /^\(?(g|mg|kcal|kj|ui|µg|μg|mcg|ug)\.?\)?$/i;
  const candUni = fsTabla.flatMap((f) => f.trozos.filter((s) => RE_UNI.test(s.t.trim()) || /^9$/.test(s.t.trim())));
  let colUni = null;
  if (candUni.length >= 4 && candUni.filter((s) => RE_UNI.test(s.t.trim())).length >= 2) {
    const m = mediana(candUni.map((s) => s.cx)); if (candUni.filter((s) => Math.abs(s.cx - m) < Math.max(s.w, s.h)).length >= candUni.length * 0.7) colUni = m;
  }
  const esUnidad = (s) => colUni != null && Math.abs(s.cx - colUni) < Math.max(s.w, s.h) && (RE_UNI.test(s.t.trim()) || /^9$/.test(s.t.trim()));
  // filas de nutrientes
  const crudas = []; const soloPct = new Set(); let colgado = null; // rótulo sin números esperando su segunda línea
  fsTabla.forEach((f) => {
    if (porcionDe(f.texto) && !/(kcal|calor|energ|grasa|prote|carbo)/i.test(plano(f.texto).replace(/tama.o|porcion|racion/g, ''))) { colgado = null; return; }
    // separa rótulo y valores con su posición horizontal en la foto
    let rot = ''; let vals = [];
    let uniCol = '';
    f.trozos.forEach((s) => {
      if (esUnidad(s)) { uniCol = /^9$/.test(s.t.trim()) ? 'g' : s.t.trim().replace(/[().]/g, ''); return; }
      const vs = valoresDe(s.t);
      if (!vs.length) {
        if (vals.length && !/[a-z]{3,}/i.test(rot) && /[a-z]{3,}/i.test(s.t)) vals = []; // números sueltos a la izquierda del rótulo: ruido
        if (!vals.length || !rot) rot += ` ${s.t}`; return;
      }
      const primero = vs[0]; const pre = limpiarNumeros(s.t).slice(0, Math.round(primero.pos * limpiarNumeros(s.t).length));
      if (vals.length && !/[a-z]{3,}/i.test(rot) && /[a-z]{3,}/i.test(pre)) vals = [];
      if (!vals.length && /[a-z]{2,}/i.test(pre)) rot += ` ${pre}`;
      vs.forEach((v) => { const x = s.x0 + v.pos * s.w; vals.push({ ...v, x, conf: s.conf }); });
      // "Includes 0g Added Sugars": el nombre va después del número
      const post = limpiarNumeros(s.t).slice(Math.round(vs[vs.length - 1].pos * limpiarNumeros(s.t).length) + vs[vs.length - 1].crudo.length);
      if (/[a-z]{3,}/i.test(post) && /(added|anadid|agregad)/i.test(plano(post))) rot += ` ${post}`;
    });
    if (!vals.length) { colgado = /[a-z]{3,}/i.test(rot) && nutrienteDe(rot) ? rot : null; return; }
    // "Hidratos de carbono" / "disponibles (g) 55": el rótulo partido en dos líneas
    if (colgado && !nutrienteDe(rot)) rot = `${colgado} ${rot}`;
    colgado = null;
    const unidadRot = (rot.match(/\(\s*(kcal|kj|mg|mcg|µg|ug|g|gr|ui)\.?\s*\)/i) || [])[1] || uniCol;
    // fila sin nombre reconocible pero con "kcal": es la energía, salvo la nota de la dieta de referencia ("dieta de 2.000 kcal")
    const notaDieta = /(diet|basad|based|porcent|percent|requer|referen)/i.test(plano(rot)) || vals.some((v) => (v.u === 'kcal' || v.u === 'kJ') && [2000, 2500, 8400, 10500].includes(v.v));
    const nut = nutrienteDe(rot) || (vals.some((v) => v.u === 'kcal' || v.u === 'kJ') && /[a-z]{3,}/i.test(rot) && !notaDieta ? { codigo: 'energia_kcal' } : null); if (!nut) return;
    // un número sin "%" que cae en la columna del % VD es un porcentaje ("Calorías 110 6" con "%DR" arriba)
    if (colPct != null) vals.forEach((v) => { if (!v.pct && !v.u && Math.abs(v.x - colPct) < Math.abs(v.x - (col100 ?? colPorcion ?? -1e9)) && vals.some((o) => o !== v && !o.pct && o.x < v.x)) v.pct = true; });
    const vs = vals.filter((v) => !v.pct); const pcts = vals.filter((v) => v.pct);
    if (!vs.length) { if (pcts.length) soloPct.add(nut.codigo); return; }
    crudas.push({ ...nut, rot: rot.trim(), vs, pcts, unidadRot: unidadRot ? UNI[unidadRot.toLowerCase()] : '', conf: Math.min(...f.trozos.map((s) => s.conf)), y: f.yr });
  });
  // energía: separar kcal y kJ cuando vienen en la misma fila ("1580 kJ / 375 kcal")
  const filasN = [];
  crudas.forEach((c) => {
    if (c.codigo === 'energia_kcal' || c.codigo === 'energia_kj') {
      const kj = c.vs.filter((v) => v.u === 'kJ'); const kc = c.vs.filter((v) => v.u === 'kcal');
      if (kj.length && kc.length) { filasN.push({ ...c, codigo: 'energia_kj', vs: kj }); filasN.push({ ...c, codigo: 'energia_kcal', vs: kc }); return; }
      if (c.codigo === 'energia_kcal' && (kj.length || /kj/i.test(c.unidadRot))) { filasN.push({ ...c, codigo: 'energia_kj', vs: kj.length ? kj : c.vs }); return; }
    }
    filasN.push(c);
  });
  // ¿dos columnas de valores sin encabezado claro? se decide con la proporción entre ellas
  const dosCol = filasN.filter((c) => c.vs.length >= 2);
  let orden = null; // 'porcion100' | '100porcion'
  if (col100 != null && colPorcion != null) orden = col100 < colPorcion ? '100porcion' : 'porcion100';
  else if (dosCol.length >= 3) {
    const r = mediana(dosCol.map((c) => (c.vs[0].v > 0 ? c.vs[1].v / c.vs[0].v : null)).filter((x) => x != null && x > 0));
    const S = l.porcion.cantidad;
    if (S && Math.abs(r - S / 100) / (S / 100) < 0.2) orden = '100porcion';
    else if (S && Math.abs(r - 100 / S) / (100 / S) < 0.2) orden = 'porcion100';
    else if (r > 0 && r < 1) orden = '100porcion'; else if (r > 1) orden = 'porcion100';
    if (orden && !S && r > 0) { const s = orden === '100porcion' ? r * 100 : 100 / r; if (s >= 5 && s <= 1000) { l.porcion = { cantidad: Math.round(s * 10) / 10, unidad: 'g', texto: '' }; l.avisos.push(`El tamaño de la porción (${String(Math.round(s * 10) / 10).replace('.', ',')} g) se dedujo de las dos columnas: confírmalo con la etiqueta.`); } }
  }
  const soloPor100 = hay100 && orden == null && !l.porcion.cantidad;
  const vistos = new Map();
  filasN.forEach((c) => {
    if (c.disponibles && filasN.some((o) => o.codigo === 'carbohidratos_etiqueta' && !o.disponibles)) return; // "disponibles" solo si no hay totales
    if (vistos.has(c.codigo)) return;
    const [a, b] = c.vs; let porPorcion = null, por100 = null;
    if (orden && b) { if (orden === '100porcion') { por100 = a.v; porPorcion = b.v; } else { porPorcion = a.v; por100 = b.v; } }
    else if (orden && col100 != null) { const d100 = Math.abs(a.x - col100), dP = Math.abs(a.x - colPorcion); if (d100 < dP) por100 = a.v; else porPorcion = a.v; }
    else if (soloPor100 || (hay100 && !l.porcion.cantidad)) por100 = a.v; else porPorcion = a.v;
    let unidad = a.u || c.unidadRot || unidadDe(c.codigo); let dudoso = c.conf < 0.85 || c.vs.some((v) => v.menor);
    const nota = [];
    if (unidad === 'kcal' && !['energia_kcal'].includes(c.codigo)) unidad = unidadDe(c.codigo);
    if (c.codigo === 'energia_kcal' && unidad === 'g') unidad = 'kcal';
    // "Calcio (g) 58": el rótulo dice g pero el número solo tiene sentido en mg
    if (unidad === 'g' && ['mg', 'µg'].includes(unidadDe(c.codigo)) && (porPorcion ?? por100) >= 5) { unidad = unidadDe(c.codigo); dudoso = true; nota.push('unidad'); }
    if (c.vs.some((v) => v.menor)) l.avisos.push(`${nombreNutriente(c.codigo)}: la etiqueta dice "menos de ${String(a.v).replace('.', ',')}". Se puso ese número; corrígelo si prefieres 0.`);
    vistos.set(c.codigo, true);
    l.filas.push({ codigo: c.codigo, porPorcion, por100, unidad, etiqueta: c.rot.slice(0, 50), dudoso, pct: c.pcts[0]?.v ?? null, y: c.y, conf: c.conf, ...(nota.length ? { nota: nota.join(',') } : {}) });
  });
  // si por porción da algo imposible (aceite: 862 kcal en 15 g), los números eran por 100 g
  const S = Number(l.porcion?.cantidad);
  if (S > 0 && l.filas.length && l.filas.every((f) => f.por100 == null)) {
    const k = l.filas.find((f) => f.codigo === 'energia_kcal'); const gm = l.filas.filter((f) => ['grasa_total', 'carbohidratos_etiqueta', 'proteina'].includes(f.codigo));
    if ((k && (k.porPorcion * 100) / S > 950) || gm.some((f) => (f.porPorcion * 100) / S > 105)) {
      l.filas.forEach((f) => { f.por100 = f.porPorcion; f.porPorcion = null; });
      l.avisos.push(`Con una porción de ${String(S).replace('.', ',')} ${l.porcion.unidad} los números no tienen sentido: se tomaron como valores por 100 ${l.porcion.unidad}. Confírmalo con la etiqueta.`);
    }
  }
  soloPct.forEach((c) => { if (!vistos.has(c)) l.avisos.push(`${nombreNutriente(c)}: la etiqueta solo da el % del valor diario; no se convierte a cantidad.`); });
  revisar(l);
  l.filas.sort((a, b) => CLAVES_ETIQUETA.indexOf(a.codigo) - CLAVES_ETIQUETA.indexOf(b.codigo));
  if (!l.filas.length) l.avisos.push('No se reconoció la tabla. Prueba otra foto: de frente, con buena luz, sin reflejos y que la tabla ocupe casi toda la foto.');
  else if (l.filas.some((f) => f.dudoso)) l.avisos.push('Los números en ámbar se leyeron con dudas: compáralos con la foto.');
  return l;
}

// ---------- revisión con lo que se sabe de nutrición ----------
// valores diarios de referencia (etiquetas de Venezuela, Colombia y EE. UU., antiguas y nuevas)
const VD = { grasa_total: [65, 78, 70], grasa_saturada: [20, 22], colesterol: [300], sodio: [2400, 2300, 2000], carbohidratos_etiqueta: [300, 275, 260], fibra_total: [25, 28], proteina: [50, 60], azucares_anadidos: [50], potasio: [3500, 4700], calcio: [1000, 1300, 800], hierro: [18, 14] };
const MAX100 = { energia_kcal: 902, energia_kj: 3800, grasa_total: 100, grasa_saturada: 100, grasa_trans: 100, carbohidratos_etiqueta: 100, azucares_totales: 100, azucares_anadidos: 100, fibra_total: 100, proteina: 100, sal: 100, sodio: 40000, colesterol: 3000, almidon: 100 };
export function revisar(l) {
  const S = Number(l.porcion?.cantidad) || null;
  const p100 = (f) => (f.por100 != null ? f.por100 : f.porPorcion != null && S ? (f.porPorcion * 100) / S : null);
  const de = (c) => l.filas.find((f) => f.codigo === c);
  // % del valor diario: confirma el número o lo marca
  l.filas.forEach((f) => {
    const refs = VD[f.codigo]; const v = f.porPorcion ?? f.por100; if (!refs || f.pct == null || v == null || f.pct <= 0) return;
    const vMg = f.unidad === 'g' && ['sodio', 'colesterol', 'potasio', 'calcio', 'hierro'].includes(f.codigo) ? v * 1000 : v;
    const ok = refs.some((r) => Math.abs((vMg / r) * 100 - f.pct) <= Math.max(1.5, f.pct * 0.25));
    if (ok) f.confirmado = true;
    else if (!f.dudoso) {
      // "59" leído en lugar de "5g": si quitando el último dígito cuadra con el %, es eso
      const s = String(v); const alt = /9$/.test(s) && !/[.,]/.test(s) && s.length >= 2 ? Number(s.slice(0, -1)) : null;
      if (alt != null && refs.some((r) => Math.abs((alt / r) * 100 - f.pct) <= Math.max(1.5, f.pct * 0.25))) { if (f.porPorcion != null) f.porPorcion = alt; else f.por100 = alt; f.dudoso = true; }
      else f.dudoso = f.pct > 3; // con % chicos el redondeo no permite comparar
    }
  });
  // límites físicos por 100 g
  l.filas.forEach((f) => { const v = p100(f); const max = MAX100[f.codigo]; if (v != null && max != null && v > max) f.dudoso = true; });
  // partes que no pueden ser más que el todo
  const par = [['grasa_saturada', 'grasa_total'], ['grasa_trans', 'grasa_total'], ['azucares_totales', 'carbohidratos_etiqueta'], ['azucares_anadidos', 'azucares_totales'], ['fibra_total', 'carbohidratos_etiqueta']];
  par.forEach(([a, b]) => { const A = de(a), B = de(b); if (A && B) { const va = A.porPorcion ?? A.por100, vb = B.porPorcion ?? B.por100; if (va != null && vb != null && va > vb + 0.5 && !(a === 'fibra_total')) { A.dudoso = true; B.dudoso = true; } } });
  // las dos columnas tienen que guardar la proporción de la porción (por 100 = por porción × 100 / porción)
  if (S) {
    const malas = l.filas.filter((f) => f.porPorcion != null && f.por100 != null && Math.max(f.porPorcion, f.por100) >= 1 && Math.abs((f.porPorcion * 100) / S - f.por100) > Math.max(1, 0.15 * f.por100));
    malas.forEach((f) => { f.dudoso = true; f.nota = 'proporcion'; });
    if (malas.length >= 2 && malas.length >= l.filas.filter((f) => f.porPorcion != null && f.por100 != null).length / 2) l.avisos.push(`Las columnas por porción y por 100 ${l.porcion.unidad} no guardan la proporción de una porción de ${String(S).replace('.', ',')} ${l.porcion.unidad}: revisa la porción y los números en ámbar.`);
  }
  // proteína + carbohidratos + grasa no pueden pasar de 100 g en 100 g: si pasa, la porción está mal leída
  const macros = ['proteina', 'carbohidratos_etiqueta', 'grasa_total'].map(de).filter(Boolean);
  const suma100 = macros.reduce((a, f) => a + (p100(f) ?? 0), 0);
  if (macros.length >= 2 && suma100 > 105) {
    macros.forEach((f) => { f.dudoso = true; f.nota = 'suma'; }); if (S && macros.some((f) => f.por100 == null)) l.porcion.dudosa = true;
    l.avisos.push(S && macros.some((f) => f.por100 == null) ? `Con una porción de ${String(S).replace('.', ',')} ${l.porcion.unidad}, proteína, carbohidratos y grasa sumarían ${Math.round(suma100)} g en 100 ${l.porcion.unidad}: el tamaño de la porción o esos números están mal leídos.` : `Proteína, carbohidratos y grasa suman ${Math.round(suma100)} g en 100 g: algún número está mal leído.`);
  }
  // energía contra macros: si no cuadra y hay un candidato claro, se marca
  let k = de('energia_kcal'); const P = de('proteina'), C = de('carbohidratos_etiqueta'), F = de('grasa_total');
  // "770" en la fila de energía sin kJ aparte: si 770 ÷ 4,184 cuadra con los macros, el número era en kJ
  if (k && P && C && F && !de('energia_kj')) {
    const v = (f) => f.porPorcion ?? f.por100; const est = 4 * (v(P) ?? 0) + 4 * (v(C) ?? 0) + 9 * (v(F) ?? 0);
    if (v(k) != null && est > 20 && Math.abs(v(k) - est) > Math.max(15, 0.25 * est) && Math.abs(v(k) / 4.184 - est) <= Math.max(10, 0.12 * est)) {
      Object.assign(k, { codigo: 'energia_kj', unidad: 'kJ', dudoso: true, nota: 'kj' });
      l.avisos.push(`La energía (${String(v(k)).replace('.', ',')}) cuadra con los macros si está en kJ (≈ ${Math.round(v(k) / 4.184)} kcal): se tomó como kJ. Confírmalo con la etiqueta.`);
      k = null;
    }
  }
  if (k && P && C && F) {
    const v = (f) => f.porPorcion ?? f.por100; if ([k, P, C, F].every((f) => v(f) != null) && [k, P, C, F].every((f) => (f.porPorcion != null) === (k.porPorcion != null))) {
      const est = 4 * v(P) + 4 * v(C) + 9 * v(F); const dif = Math.abs(v(k) - est);
      l.cuadra = !(dif > Math.max(15, 0.25 * Math.max(v(k), est)));
      if (dif > Math.max(15, 0.25 * Math.max(v(k), est))) { [k, P, C, F].filter((f) => !f.confirmado).forEach((f) => { f.dudoso = true; }); l.avisos.push(`Las calorías (${Math.round(v(k))}) no cuadran con proteína, carbohidratos y grasa (~${Math.round(est)}). Revisa esos cuatro números con la foto.`); }
      else [k, P, C, F].forEach((f) => { if (f.dudoso && !f.nota) f.dudoso = (f.conf ?? 1) < 0.6; }); // cuadran: solo queda en duda lo que se leyó muy borroso
    }
  }
  return l;
}

// ---------- frente del envase ----------
// textos grandes primero (nombre y marca suelen ser lo más grande), sin pesos, códigos ni frases legales
export function leerFrente(lineasOCR) {
  const tr = normalizarTrozos(lineasOCR); const fs = filas(tr);
  const base = fs.map((f) => ({ t: f.texto.replace(/\s+/g, ' ').trim(), h: f.h, y: f.yr, x0: Math.min(...f.trozos.map((s) => s.x0)), x1: Math.max(...f.trozos.map((s) => s.x1)) }));
  // el nombre suele ir en dos o tres líneas seguidas con letras del mismo tamaño: se ofrece junto, primero
  const juntas = [];
  for (let i = 0; i < base.length; i++) {
    let j = i; const g = [base[i]];
    while (j + 1 < base.length) {
      const a = base[j], b = base[j + 1];
      if (b.h / a.h < 0.8 || b.h / a.h > 1.25 || b.y - a.y > Math.max(a.h, b.h) * 1.6 || Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) < 0) break;
      g.push(b); j++;
    }
    if (g.length > 1 && g.length <= 3) { const t = g.map((x) => x.t).join(' '); if (t.length <= 50) juntas.push({ t, h: Math.max(...g.map((x) => x.h)) + 0.5 }); }
  }
  const cand = [...juntas, ...base].filter((x) => /[a-záéíóúñ]{3,}/i.test(x.t) && x.t.length <= 50);
  const cont = cand.find((x) => /(contenido neto|peso neto|net wt|cont\.?\s*neto|\bneto\b)/i.test(x.t)) || cand.find((x) => /^\s*\d+(?:[.,]\d+)?\s*(g|kg|ml|l|lt|cc)\b/i.test(x.t));
  const m = cont && limpiarNumeros(cont.t).match(/(\d+(?:,\d+)?)\s*(g|kg|ml|l|lt|cc)\b/i);
  const fuera = /(contenido|neto|net wt|registro|sanitario|hecho en|elaborado|lote|vence|ingredientes|www\.|\.com|información nutricional|^\d)/i;
  const lineas = [...new Set(cand.filter((x) => x !== cont && !fuera.test(x.t)).sort((a, b) => b.h - a.h).map((x) => x.t))].slice(0, 10);
  return { lineas, contenido: m ? `${m[1]} ${m[2].toLowerCase()}` : '' };
}

// ---------- código de barras impreso ----------
// dígito de control de un GTIN (EAN-13, EAN-8, UPC-A): pesos 3 y 1 alternados desde la derecha
export function gtinValido(c) {
  if (!/^(\d{8}|\d{12}|\d{13}|\d{14})$/.test(c)) return false;
  const d = [...c].map(Number); const control = d.pop(); let s = 0;
  d.reverse().forEach((x, i) => { s += x * (i % 2 === 0 ? 3 : 1); });
  return (10 - (s % 10)) % 10 === control;
}
// los números de 8 a 14 dígitos con dígito de control válido que el OCR leyó (debajo de las barras van impresos)
export function codigosEnTexto(lineasOCR) {
  const out = new Set();
  normalizarTrozos(lineasOCR).forEach((s) => {
    const t = s.t.replace(/[oO]/g, '0').replace(/[lI|]/g, '1');
    for (const m of t.matchAll(/\d[\d\s-]{6,20}\d/g)) { const c = m[0].replace(/\D/g, ''); if (gtinValido(c)) out.add(c); }
  });
  return [...out];
}
// el código de las barras se compara con el número impreso debajo (si el OCR lo leyó): las barras de una foto
// borrosa a veces dan un código válido pero equivocado. Sin barras legibles, sirve el número impreso (12 o 13 dígitos).
export function resolverCodigo(barras, lineasOCR) {
  const impresos = codigosEnTexto(lineasOCR || []); const largos = impresos.filter((c) => c.length >= 12);
  if (barras) return { codigo: barras, codigoEstado: impresos.includes(barras) ? 'confirmado' : largos.length ? 'distinto' : 'barras' };
  if (largos.length === 1) return { codigo: largos[0], codigoEstado: 'impreso' };
  return { codigo: '', codigoEstado: '' };
}
