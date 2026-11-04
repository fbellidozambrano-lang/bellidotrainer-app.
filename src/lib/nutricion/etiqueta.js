// Lector de etiquetas: de las fotos del frente y de la tabla nutricional a un producto de la base.
// La lectura (de la IA en el servidor o del lector de texto del teléfono) se normaliza a una forma común,
// la persona la revisa y recién entonces se arma el producto: valores por 100 g (o 100 ml) con su procedencia.
// No se inventan números: lo que no se lee queda vacío (no es cero) y lo que se calcula dice cómo.
import { NUTRIENTES } from './catalogo.js';
import { sospechosos } from './clasificar.js';
import { normalizarBusqueda } from './texto.js';

const POR_CODIGO = Object.fromEntries(NUTRIENTES.map((n) => [n.codigo, n]));
// lo que suele traer una etiqueta, en el orden en que se muestra
export const CLAVES_ETIQUETA = ['energia_kcal', 'energia_kj', 'grasa_total', 'grasa_saturada', 'grasa_trans', 'grasa_monoinsaturada', 'grasa_poliinsaturada', 'colesterol', 'sodio', 'sal',
  'carbohidratos_etiqueta', 'fibra_total', 'azucares_totales', 'azucares_anadidos', 'almidon', 'proteina', 'potasio', 'calcio', 'hierro', 'magnesio', 'zinc', 'fosforo',
  'vitamina_a_rae', 'vitamina_c', 'vitamina_d', 'vitamina_e', 'tiamina', 'riboflavina', 'niacina', 'vitamina_b6', 'vitamina_b12', 'acido_folico', 'cafeina'];
export const nombreNutriente = (c) => ({ carbohidratos_etiqueta: 'Carbohidratos', energia_kcal: 'Energía (kcal)', energia_kj: 'Energía (kJ)' })[c] || POR_CODIGO[c]?.nombre || c;
export const unidadDe = (c) => POR_CODIGO[c]?.unidad || 'g';

// unidades de masa → la del catálogo
const A_GRAMOS = { g: 1, mg: 1e-3, 'µg': 1e-6 };
const unidadLimpia = (u) => { const s = String(u || '').trim().toLowerCase().replace('mcg', 'µg').replace(/^ug$/, 'µg').replace('μg', 'µg'); return ['g', 'mg', 'µg', 'kcal', 'kj'].includes(s) ? (s === 'kj' ? 'kJ' : s) : ''; };
export function convertirUnidad(cantidad, de, codigo) {
  const a = unidadDe(codigo); const u = unidadLimpia(de) || a; const v = Number(cantidad);
  if (!Number.isFinite(v)) return null;
  if (u === a) return v;
  if (A_GRAMOS[u] && A_GRAMOS[a]) return (v * A_GRAMOS[u]) / A_GRAMOS[a];
  return null; // kcal ↔ g no se convierte
}
const numero = (t) => { const s = String(t ?? '').trim().replace(/\s/g, '').replace(',', '.'); if (!/^\d+(\.\d+)?$/.test(s)) return null; return Number(s); };
const r2 = (v) => Math.round(v * 100) / 100;

// ---------- lectura normalizada ----------
// { nombre, marca, codigo_barras, contenido, porcion: { cantidad, unidad: 'g'|'ml', texto }, porciones_envase,
//   filas: [{ codigo, porPorcion, por100, unidad, etiqueta, dudoso }], avisos: [], lineas_frente: [], origen: 'ia'|'telefono' }
export function lecturaVacia(origen = 'telefono') { return { nombre: '', marca: '', codigo_barras: '', contenido: '', porcion: { cantidad: null, unidad: 'g', texto: '' }, porciones_envase: null, filas: [], avisos: [], lineas_frente: [], origen }; }

// lo que devuelve la IA (herramienta registrar_etiqueta) → lectura
export function desdeIA(x = {}) {
  const l = lecturaVacia('ia');
  const txt = (v, n = 120) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
  l.nombre = txt(x.nombre); l.marca = txt(x.marca, 60); l.contenido = txt(x.contenido_neto, 40);
  const cb = String(x.codigo_barras ?? '').replace(/\D/g, ''); l.codigo_barras = /^\d{8,14}$/.test(cb) ? cb : '';
  const p = x.porcion || {}; const pc = numero(p.cantidad); const pu = String(p.unidad || '').toLowerCase();
  l.porcion = { cantidad: pc > 0 ? pc : null, unidad: pu === 'ml' ? 'ml' : 'g', texto: txt(p.texto, 60) };
  l.porciones_envase = numero(x.porciones_envase);
  const vistos = new Set();
  (Array.isArray(x.nutrientes) ? x.nutrientes : []).forEach((n) => {
    const codigo = n?.clave === 'carbohidratos' ? 'carbohidratos_etiqueta' : n?.clave;
    if (!CLAVES_ETIQUETA.includes(codigo) || vistos.has(codigo)) { if (n?.nombre_en_etiqueta && codigo === 'otro') l.avisos.push(`No se guarda "${txt(n.nombre_en_etiqueta, 40)}": no está en el catálogo de nutrientes.`); return; }
    const unidad = unidadLimpia(n.unidad) || unidadDe(codigo);
    const pp = numero(n.por_porcion), p100 = numero(n.por_100);
    if (pp == null && p100 == null) { if (n.solo_vd) l.avisos.push(`${txt(n.nombre_en_etiqueta, 40) || nombreNutriente(codigo)}: la etiqueta solo da el % del valor diario; no se convierte a cantidad.`); return; }
    vistos.add(codigo);
    l.filas.push({ codigo, porPorcion: pp, por100: p100, unidad, etiqueta: txt(n.nombre_en_etiqueta, 50), dudoso: n.legible === false });
  });
  (Array.isArray(x.avisos) ? x.avisos : []).slice(0, 12).forEach((a) => { const t = txt(a, 160); if (t) l.avisos.push(t); });
  l.filas.sort((a, b) => CLAVES_ETIQUETA.indexOf(a.codigo) - CLAVES_ETIQUETA.indexOf(b.codigo));
  return l;
}

// ---------- lector de texto del teléfono (sin IA) ----------
// palabras de cada fila en español e inglés; el orden importa (lo más específico primero)
const PATRONES = [
  ['grasa_saturada', /(grasa|grasas|[aá]cidos grasos)\s+saturad|de las cuales saturad|saturated fat|\bsaturad/i],
  ['grasa_trans', /(grasa|grasas|[aá]cidos grasos)\s+trans|trans fat|\btrans\b/i],
  ['grasa_monoinsaturada', /mono[ -]?insaturad|monounsaturated/i],
  ['grasa_poliinsaturada', /poli[ -]?insaturad|polyunsaturated/i],
  ['grasa_total', /grasa total|grasas totales|total fat|^\s*grasas?\b|\bl[ií]pidos\b|^\s*fat\b/i],
  ['colesterol', /colesterol|cholesterol/i],
  ['sodio', /sodio|sodium/i],
  ['sal', /^\s*sal\b|\bsalt\b/i],
  ['fibra_total', /fibra|fiber|fibre/i],
  ['azucares_anadidos', /az[uú]cares a[ñn]adidos|added sugars|incluye.*az[uú]car/i],
  ['azucares_totales', /az[uú]car|sugars?/i],
  ['almidon', /almid[oó]n|starch/i],
  ['carbohidratos_etiqueta', /carbohidrato|hidratos de carbono|carbohydrate|glúcidos|glucidos/i],
  ['proteina', /prote[ií]na|protein/i],
  ['potasio', /potasio|potassium/i], ['calcio', /calcio|calcium/i], ['hierro', /hierro|\biron\b/i], ['magnesio', /magnesio|magnesium/i], ['zinc', /\bzinc\b|\bcinc\b/i], ['fosforo', /f[oó]sforo|phosphorus/i],
  ['vitamina_c', /vitamina c|vitamin c/i], ['vitamina_d', /vitamina d|vitamin d/i], ['vitamina_e', /vitamina e\b|vitamin e\b/i], ['vitamina_a_rae', /vitamina a\b|vitamin a\b/i],
  ['vitamina_b12', /b12/i], ['vitamina_b6', /\bb6\b/i], ['tiamina', /tiamina|thiamin/i], ['riboflavina', /riboflavina|riboflavin/i], ['niacina', /niacina|niacin/i], ['acido_folico', /[aá]cido f[oó]lico|folic acid|folato|folate/i],
  ['cafeina', /cafe[ií]na|caffeine/i],
];
const ES_ENERGIA = /calor[ií]as|valor energ[eé]tico|energ[ií]a|calories|energy|kcal|\bkj\b/i;
// número con unidad; la "g" a veces sale como "9", "y" o "q"
const NUM_U = /(<\s*)?(\d+(?:[.,]\d+)?)\s*(kcal|kj|mg|mcg|µg|μg|ug|g)\b/gi;
const NUM_G_MAL = /(\d+(?:[.,]\d+)?)\s+(y|q)\b/i;

export function leerTextoEtiqueta(texto = '') {
  const l = lecturaVacia('telefono');
  const lineas = String(texto).split(/\r?\n/).map((x) => x.replace(/[|]/g, ' ').replace(/\bO(?=\s?(g|mg)\b)/g, '0').replace(/\s+/g, ' ').trim()).filter(Boolean);
  const todo = lineas.join('\n');
  // porción
  const mp = todo.match(/(tama[ñn]o de (la )?porci[oó]n|porci[oó]n|serving size|por porci[oó]n)[^\n]*?(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  if (mp) { const ln = lineas.find((x) => x.includes(mp[0].split('\n')[0])) || mp[0];
    l.porcion = { cantidad: numero(mp[3]), unidad: mp[4].toLowerCase() === 'ml' ? 'ml' : 'g', texto: ln.replace(/^.*?(porci[oó]n|serving size)\s*:?\s*/i, '').slice(0, 60) }; }
  const me = todo.match(/(porciones por envase|servings per container)[^\d]*(\d+(?:[.,]\d+)?)|(\d+(?:[.,]\d+)?)\s*(servings per container|porciones por envase)/i);
  if (me) l.porciones_envase = numero(me[2] || me[3]);
  // ¿hay columna por 100 g? ¿cuál va primero?
  const cab = lineas.find((x) => /100\s*(g|ml)/i.test(x) && /(porci[oó]n|serving)/i.test(x)) || '';
  const hay100 = !!cab || lineas.some((x) => /^\s*(valores? )?(nutricionales? )?por 100\s*(g|ml)/i.test(x));
  const primero100 = cab ? cab.search(/100\s*(g|ml)/i) < cab.search(/(porci[oó]n|serving)/i) : hay100;
  const vistos = new Set();
  const poner = (codigo, vals, dudoso, linea) => {
    if (vistos.has(codigo) || !vals.length) return; vistos.add(codigo);
    const [a, b] = vals; let porPorcion = null, por100 = null;
    if (cab && vals.length >= 2) { if (primero100) { por100 = a.v; porPorcion = b.v; } else { porPorcion = a.v; por100 = b.v; } }
    else if (hay100 && !cab) por100 = a.v; else porPorcion = a.v;
    l.filas.push({ codigo, porPorcion, por100, unidad: a.u || unidadDe(codigo), etiqueta: linea.slice(0, 50), dudoso: dudoso || vals.some((x) => x.menor) });
  };
  lineas.forEach((ln) => {
    if (/^(calor[ií]as de grasa|calories from fat)|valor diario|daily value|^\*|tama[ñn]o de|serving size|porciones por|servings per/i.test(ln)) return;
    const unidadNums = [...ln.matchAll(NUM_U)].map((m) => ({ v: numero(m[2]), u: unidadLimpia(m[3]), menor: !!m[1] }));
    if (ES_ENERGIA.test(ln)) {
      const kcal = unidadNums.filter((x) => x.u === 'kcal'); const kj = unidadNums.filter((x) => x.u === 'kJ');
      if (kj.length) poner('energia_kj', kj, false, ln);
      if (kcal.length) poner('energia_kcal', kcal, false, ln);
      else if (!kj.length) { const m = ln.match(/(calor[ií]as|calories)\s*:?\s*(\d+(?:[.,]\d+)?)/i); if (m) poner('energia_kcal', [{ v: numero(m[2]), u: 'kcal' }], false, ln); }
      return;
    }
    const pat = PATRONES.find(([, re]) => re.test(ln)); if (!pat) return;
    const [codigo] = pat; const esperado = unidadDe(codigo);
    let vals = unidadNums.filter((x) => x.u && x.u !== 'kcal' && x.u !== 'kJ'); let dudoso = false;
    if (!vals.length) {
      const g = ln.match(NUM_G_MAL); // "24 y" → 24 g
      const sinPct = ln.replace(/\d+(?:[.,]\d+)?\s*%/g, ''); const m = sinPct.match(/(\d+(?:[.,]\d+)?)/);
      if (g && esperado === 'g') vals = [{ v: numero(g[1]), u: 'g' }];
      else if (m && esperado === 'g' && /\d9$/.test(m[1]) && !/[.,]/.test(m[1])) vals = [{ v: numero(m[1].slice(0, -1)), u: 'g' }]; // "Total Fat 59 6%": el 9 final suele ser una "g"
      else if (m) vals = [{ v: numero(m[1]), u: esperado }]; // número sin unidad: se asume la de siempre
      else { if (/\d\s*%/.test(ln)) PATRONES.filter(([, re]) => re.test(ln)).forEach(([c]) => l.avisos.push(`${nombreNutriente(c)}: la etiqueta solo da el % del valor diario; no se convierte a cantidad.`)); return; }
      dudoso = true;
    }
    poner(codigo, vals, dudoso, ln);
  });
  l.filas.sort((a, b) => CLAVES_ETIQUETA.indexOf(a.codigo) - CLAVES_ETIQUETA.indexOf(b.codigo));
  if (l.filas.some((f) => f.dudoso)) l.avisos.push('Algunos números se leyeron con dudas (marcados en ámbar): compáralos con la foto.');
  if (!l.filas.length) l.avisos.push('No se reconoció la tabla. Prueba otra foto: de frente, con buena luz y que la tabla ocupe toda la foto.');
  return l;
}
// el frente: líneas de texto para elegir nombre y marca, y el contenido neto
export function leerTextoFrente(texto = '') {
  const lineas = String(texto).split(/\r?\n/).map((x) => x.replace(/\s+/g, ' ').trim()).filter((x) => /[a-záéíóúñ]{3,}/i.test(x) && x.length <= 60);
  const cont = lineas.find((x) => /(contenido neto|peso neto|net wt|cont\. neto|\bcontenido\b)/i.test(x) || /\b\d+(?:[.,]\d+)?\s*(g|kg|ml|l)\b/i.test(x));
  const m = cont && cont.match(/(\d+(?:[.,]\d+)?)\s*(g|kg|ml|l)\b/i);
  return { lineas: lineas.filter((x) => x !== cont).slice(0, 8), contenido: m ? `${m[1]} ${m[2].toLowerCase()}` : '' };
}

// ---------- de la lectura revisada al producto ----------
// valores por 100 g (o 100 ml): la columna por 100 si la hay; si no, por porción × 100 / porción
export function calcularPor100(lectura) {
  const pc = Number(lectura.porcion?.cantidad) > 0 ? Number(lectura.porcion.cantidad) : null; const u = lectura.porcion?.unidad === 'ml' ? 'ml' : 'g';
  const out = [];
  (lectura.filas || []).forEach((f) => {
    const p100 = numero(f.por100), pp = numero(f.porPorcion);
    let v = null, metodo = '';
    if (p100 != null) { v = p100; metodo = `Etiqueta: ${String(p100).replace('.', ',')} ${f.unidad} por 100 ${u}`; }
    else if (pp != null && pc) { v = (pp * 100) / pc; metodo = `Etiqueta: ${String(pp).replace('.', ',')} ${f.unidad} por porción de ${String(pc).replace('.', ',')} ${u} → por 100 ${u}`; }
    if (v == null) return;
    const c = convertirUnidad(v, f.unidad, f.codigo); if (c == null) return;
    out.push({ codigo: f.codigo, cantidad: r2(c), metodo, estado: 'etiqueta', unidad_original: unidadLimpia(f.unidad) && unidadLimpia(f.unidad) !== unidadDe(f.codigo) ? unidadLimpia(f.unidad) : null });
  });
  const tiene = (c) => out.some((x) => x.codigo === c);
  // derivados con su fórmula a la vista
  if (!tiene('energia_kcal') && tiene('energia_kj')) { const kj = out.find((x) => x.codigo === 'energia_kj').cantidad; out.push({ codigo: 'energia_kcal', cantidad: r2(kj / 4.184), metodo: 'Calculado de los kJ de la etiqueta (kcal = kJ ÷ 4,184)', estado: 'calculado' }); }
  if (!tiene('sodio') && tiene('sal')) { const sal = out.find((x) => x.codigo === 'sal').cantidad; out.push({ codigo: 'sodio', cantidad: r2((sal / 2.5) * 1000), metodo: 'Calculado de la sal de la etiqueta (sodio = sal ÷ 2,5)', estado: 'calculado' }); }
  return out;
}
export function faltaPorcion(lectura) { return (lectura.filas || []).some((f) => numero(f.por100) == null && numero(f.porPorcion) != null) && !(Number(lectura.porcion?.cantidad) > 0); }

export function productoDesdeLectura(lectura, { quien = '' } = {}) {
  const valores = calcularPor100(lectura); const u = lectura.porcion?.unidad === 'ml' ? 'ml' : 'g';
  const porCodigo = Object.fromEntries(valores.map((v) => [v.codigo, v.cantidad]));
  const avisos = [...sospechosos(porCodigo)];
  if (u === 'ml') avisos.push('Líquido: valores por 100 ml; al anotarlo, 1 ml se cuenta como 1 g.');
  const nombre = String(lectura.nombre || '').replace(/\s+/g, ' ').trim(); const marca = String(lectura.marca || '').trim() || null;
  const cb = String(lectura.codigo_barras || '').replace(/\D/g, '');
  const pc = Number(lectura.porcion?.cantidad);
  const origen = lectura.origen === 'ia' ? 'leído de las fotos con IA' : 'leído de las fotos en el teléfono';
  return {
    fuente: 'foto_etiqueta', nombre, nombre_original: nombre, marca, codigo_barras: /^\d{8,14}$/.test(cb) ? cb : null, id_externo: /^\d{8,14}$/.test(cb) ? cb : null,
    categoria: 'Productos comerciales', preparacion: 'listo', base: `100 ${u} del producto tal como se vende (etiqueta)`,
    energia_ref: porCodigo.energia_kcal != null ? 'energia_kcal' : null, sinonimos: [], sospechosos: avisos,
    valores: valores.map((v) => ({ ...v, metodo: `${v.metodo} · ${origen} y revisado${quien ? ` por ${quien}` : ''}` })),
    porciones: pc > 0 ? [{ descripcion: /[a-záéíóúñ]{3,}/i.test(lectura.porcion?.texto || '') ? `1 porción: ${lectura.porcion.texto}` : `1 porción (${String(pc).replace('.', ',')} ${u})`, original: lectura.porcion?.texto || `${pc} ${u}`, gramos: pc }] : [],
    contenido: lectura.contenido || null,
    busqueda: normalizarBusqueda([nombre, marca, cb].filter(Boolean).join(' ')),
  };
}

// ---------- instrucción y herramienta para la IA (servidor) ----------
export const HERRAMIENTA_IA = {
  name: 'registrar_etiqueta',
  description: 'Registra lo que dice la etiqueta del producto en las fotos: frente del envase y tabla de información nutricional.',
  input_schema: {
    type: 'object',
    properties: {
      nombre: { type: ['string', 'null'], description: 'Nombre del producto tal como aparece en el frente, sin la marca (p. ej. "Hojuelas de avena integral").' },
      marca: { type: ['string', 'null'] },
      contenido_neto: { type: ['string', 'null'], description: 'Contenido neto como aparece (p. ej. "450 g").' },
      codigo_barras: { type: ['string', 'null'], description: 'Solo los dígitos impresos debajo del código de barras, si se ven completos.' },
      porcion: { type: 'object', properties: { cantidad: { type: ['number', 'null'], description: 'Tamaño de la porción en g o ml (el número entre paréntesis si dice "1 taza (30 g)").' }, unidad: { type: ['string', 'null'], enum: ['g', 'ml', null] }, texto: { type: ['string', 'null'], description: 'Cómo la describe la etiqueta, p. ej. "1 taza (30 g)".' } } },
      porciones_envase: { type: ['number', 'null'] },
      nutrientes: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            nombre_en_etiqueta: { type: 'string' },
            clave: { type: 'string', enum: [...CLAVES_ETIQUETA.map((c) => (c === 'carbohidratos_etiqueta' ? 'carbohidratos' : c)), 'otro'] },
            por_porcion: { type: ['number', 'null'], description: 'Cantidad por porción tal como está impresa. null si la etiqueta no la da.' },
            por_100: { type: ['number', 'null'], description: 'Cantidad por 100 g o 100 ml tal como está impresa. null si la etiqueta no tiene esa columna.' },
            unidad: { type: 'string', enum: ['g', 'mg', 'µg', 'kcal', 'kJ'] },
            solo_vd: { type: 'boolean', description: 'true si para este nutriente la etiqueta solo da el % del valor diario, sin cantidad.' },
            legible: { type: 'boolean', description: 'false si el número no se lee con seguridad.' },
          },
          required: ['nombre_en_etiqueta', 'clave', 'unidad'],
        },
      },
      avisos: { type: 'array', items: { type: 'string' }, description: 'En español: lo que no se pudo leer, valores con "<" o "menos de", fotos borrosas o cortadas.' },
    },
    required: ['nutrientes'],
  },
};
export const INSTRUCCION_IA = `Eres un lector de etiquetas de alimentos. Recibes la foto del frente del envase y la foto de la tabla de información nutricional (pueden estar en español o en inglés).
Copia exactamente lo que está impreso; no calcules, no redondees y no completes valores que no aparecen.
- Energía: si dice kcal y kJ, registra las dos filas (energia_kcal y energia_kj). "Calorías 120" es energia_kcal.
- "Carbohidratos totales", "Hidratos de carbono" o "Total Carbohydrate" van como carbohidratos. "Calorías de grasa" no se registra.
- "Sal" va como sal (no la conviertas a sodio). Sodio en mg tal como está.
- Si la tabla tiene columna por 100 g/ml y por porción, llena las dos. Si solo tiene una, deja la otra en null.
- Un valor "<1 g" o "menos de 1 g": pon null y anótalo en avisos. Un nutriente que solo tiene % del valor diario: solo_vd = true y cantidades null.
- Si un número no se lee con seguridad, ponlo igual y marca legible = false; si no se lee nada, null.
- Nombre y marca salen del frente. El tamaño de la porción en gramos o ml es el número entre paréntesis si lo hay.
Responde solo llamando a la herramienta registrar_etiqueta.`;
