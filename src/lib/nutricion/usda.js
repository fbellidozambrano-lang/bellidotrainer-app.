// USDA FoodData Central → registros normalizados de la app, sin perder la procedencia.
// Entrada: un objeto de los JSON oficiales de descarga (Foundation, SR Legacy o FNDDS/Survey).
// Salida: { alimento, error } con los valores por 100 g, el estado de cada valor y las porciones.
import { DESDE_USDA, POR_ID, NUCLEO } from './catalogo.js';
import { traducirDescripcion, sinonimosDe } from './traducir.js';
import { preparacionDe, categoriaDe, sospechosos, textoBusqueda } from './clasificar.js';
import { uuidDe } from '../util.js';

export const FUENTES_USDA = {
  Foundation: { fuente: 'usda_foundation', calidad: 'oficial_analitico', base: '100 g de parte comestible' },
  'SR Legacy': { fuente: 'usda_sr_legacy', calidad: 'referencia', base: '100 g de parte comestible' },
  'Survey (FNDDS)': { fuente: 'usda_fndds', calidad: 'referencia', base: '100 g del alimento tal como se consume' },
  Branded: { fuente: 'usda_branded', calidad: 'etiqueta', base: '100 g del producto (calculado por USDA a partir de la etiqueta)' },
};
export const RAIZ_JSON = { FoundationFoods: 'Foundation', SRLegacyFoods: 'SR Legacy', SurveyFoods: 'Survey (FNDDS)', BrandedFoods: 'Branded' };

const UNIDAD = (u) => ({ UG: 'µg', 'µG': 'µg', MCG: 'µg', MG: 'mg', G: 'g', KCAL: 'kcal', KJ: 'kJ', IU: 'UI' }[String(u || '').toUpperCase()] || u);

// Estado del valor según el código de derivación de USDA (foodNutrientDerivation.code)
export function estadoUSDA({ amount, code, fuente }) {
  if (amount == null || !Number.isFinite(Number(amount))) return 'sin_valor';
  const cero = Number(amount) === 0;
  if (fuente === 'usda_fndds') return cero ? 'cero_calculado' : 'calculado';
  if (code === 'Z') return 'cero_asumido';
  if (cero) return 'cero_publicado';
  if (!code) return 'sin_codigo';
  if (['A', 'AR', 'AI'].includes(code)) return 'analitico';
  if (['AS', 'NC', 'NR', 'DA'].includes(code)) return 'calculado';
  if (/^LC/.test(code) || fuente === 'usda_branded') return 'etiqueta'; // LC, LCCS, LCCD, LCSL: calculado de la etiqueta
  if (['MC', 'MA', 'FLM'].includes(code)) return 'fabricante';
  return 'imputado'; // B*, C*, P*, F*, R*, J*, O, T…: estimado a partir de otro alimento, receta o fórmula
}

const PORCION_ES = [[/\bcups?\b/gi, 'taza'], [/\btbsp\b|\btablespoons?\b/gi, 'cucharada'], [/\btsp\b|\bteaspoons?\b/gi, 'cucharadita'], [/\bfl oz\b/gi, 'onza líquida'], [/\boz\b/gi, 'onza'],
  [/\bslices?\b/gi, 'rebanada'], [/\bpieces?\b/gi, 'pieza'], [/\bmedium\b/gi, 'mediano'], [/\blarge\b/gi, 'grande'], [/\bsmall\b/gi, 'pequeño'], [/\bextra large\b/gi, 'extra grande'],
  [/\bchopped\b/gi, 'picado'], [/\bsliced\b/gi, 'rebanado'], [/\bdiced\b/gi, 'en cubos'], [/\bwhole\b/gi, 'entero'], [/\bserving\b/gi, 'porción'], [/\bpackage\b/gi, 'paquete'],
  [/\bcontainer\b/gi, 'envase'], [/\bfruit\b/gi, 'fruta'], [/\bbreast\b/gi, 'pechuga'], [/\bthigh\b/gi, 'muslo'], [/\bdrumstick\b/gi, 'muslito'], [/\bwing\b/gi, 'ala'], [/\begg\b/gi, 'huevo'],
  [/\bstalks?\b/gi, 'tallo'], [/\bleaf\b|\bleaves\b/gi, 'hoja'], [/\bspears?\b/gi, 'lanza'], [/\bunits?\b/gi, 'unidad'], [/\bquantity not specified\b/gi, 'cantidad no especificada']];
export const porcionEs = (t) => PORCION_ES.reduce((s, [re, es]) => s.replace(re, es), String(t || '')).trim();

function porcionesDe(x) {
  const out = []; const vistos = new Set();
  (x.foodPortions || []).forEach((p) => {
    const g = Number(p.gramWeight); if (!(g > 0)) return;
    let desc = p.portionDescription && p.portionDescription !== 'Quantity not specified' ? p.portionDescription
      : [p.amount ?? p.value, p.measureUnit?.name && p.measureUnit.name !== 'undetermined' ? p.measureUnit.name : '', p.modifier && !/^\d+$/.test(p.modifier) ? p.modifier : ''].filter((v) => v !== '' && v != null).join(' ');
    if (!desc || /RACC/i.test(desc)) desc = /RACC/i.test(p.measureUnit?.name || '') ? 'Porción de referencia (RACC)' : desc;
    if (!desc) return; const k = `${desc}|${g}`; if (vistos.has(k)) return; vistos.add(k);
    out.push({ descripcion: porcionEs(desc), original: desc, gramos: g });
  });
  return out.slice(0, 12);
}

// FNV-1a de 53 bits: huella para saber si un registro cambió entre importaciones (no es seguridad)
export function huella(texto) {
  let h1 = 0x811c9dc5, h2 = 0x01000193; const s = String(texto);
  for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); h1 = Math.imul(h1 ^ c, 0x01000193); h2 = Math.imul(h2 ^ c, 0x5bd1e995); }
  return (h1 >>> 0).toString(16).padStart(8, '0') + (h2 >>> 0).toString(16).padStart(8, '0');
}

const fechaUSDA = (f) => { const m = String(f || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : null; };

export function normalizarUSDA(x, { version } = {}) {
  if (!x || typeof x !== 'object') return { error: 'registro vacío' };
  const tipo = FUENTES_USDA[x.dataType]; if (!tipo) return { error: `tipo de dato desconocido: ${x.dataType}` };
  if (!x.fdcId) return { error: 'sin fdcId' };
  const original = String(x.description || '').trim(); if (!original) return { error: `fdcId ${x.fdcId}: sin descripción` };
  const comercial = x.dataType === 'Branded';
  // las etiquetas vienen EN MAYÚSCULAS: se pasan a minúsculas solo para traducir (el original queda igual)
  const paraTraducir = original === original.toUpperCase() ? original.toLowerCase() : original;
  const avisos = []; const valores = []; const vistos = new Set();
  (x.foodNutrients || []).forEach((fn) => {
    const nid = DESDE_USDA.get(fn.nutrient?.id); if (!nid) return; // fuera del catálogo: se omite (no es un error)
    const cat = POR_ID.get(nid); const u = UNIDAD(fn.nutrient.unitName);
    if (u !== cat.unidad) { avisos.push(`${cat.codigo}: unidad ${fn.nutrient.unitName} distinta de ${cat.unidad}, valor descartado`); return; }
    if (vistos.has(nid)) { avisos.push(`${cat.codigo}: repetido, se usa el primero`); return; } vistos.add(nid);
    const d = fn.foodNutrientDerivation || {};
    const amount = fn.amount ?? null;
    valores.push({
      nutriente: nid, cantidad: amount == null ? null : Number(amount), estado: estadoUSDA({ amount, code: d.code, fuente: tipo.fuente }),
      metodo: d.code ? `${d.code} · ${d.description || ''}`.trim() : (tipo.fuente === 'usda_fndds' ? 'FNDDS: calculado a partir de los ingredientes' : null),
      id_externo: String(fn.nutrient.id), unidad_original: fn.nutrient.unitName, n: fn.dataPoints ?? null, min: fn.min ?? null, max: fn.max ?? null, mediana: fn.median ?? null, nota: fn.footnote || null,
    });
  });
  if (!valores.some((v) => v.cantidad != null)) return { error: `fdcId ${x.fdcId}: sin valores de nutrientes del catálogo` };
  const porCodigo = Object.fromEntries(valores.filter((v) => v.cantidad != null).map((v) => [POR_ID.get(v.nutriente).codigo, v.cantidad]));
  const energia = ['energia_kcal', 'energia_atwater_especifica_kcal', 'energia_atwater_general_kcal'].find((k) => porCodigo[k] != null) || null;
  const { preparacion, detalle } = preparacionDe(original);
  const catOrig = x.foodCategory?.description || x.wweiaFoodCategory?.wweiaFoodCategoryDescription || x.brandedFoodCategory || '';
  const nombre = traducirDescripcion(paraTraducir); const sinonimos = sinonimosDe(paraTraducir);
  const marca = comercial ? [x.brandName, x.brandOwner].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(' · ') || null : null;
  const presentes = NUCLEO.filter((k) => porCodigo[k] != null).length;
  const alimento = {
    id: uuidDe(`usda:${x.fdcId}`), fuente: tipo.fuente, id_externo: String(x.fdcId), version: version || null,
    ids: { ...(x.ndbNumber ? { ndb: String(x.ndbNumber) } : {}), ...(x.foodCode ? { fndds: String(x.foodCode) } : {}) },
    nombre, nombre_original: original, idioma_original: 'en', nombre_traducido: true, sinonimos, categoria: categoriaDe(catOrig, original, tipo.fuente === 'usda_fndds' || comercial), categoria_original: catOrig || null,
    marca, codigo_barras: comercial && x.gtinUpc ? String(x.gtinUpc).replace(/\D/g, '') : null, tipo: comercial ? 'comercial' : 'generico', tipo_registro: x.dataType, preparacion, preparacion_detalle: detalle, base: tipo.base,
    publicado: fechaUSDA(x.publicationDate), historico: x.dataType === 'SR Legacy', calidad: tipo.calidad, completitud: presentes, completitud_de: NUCLEO.length,
    sospechosos: sospechosos(porCodigo), energia_ref: energia, ref_url: `https://fdc.nal.usda.gov/food-details/${x.fdcId}/nutrients`,
    busqueda: textoBusqueda(nombre, original, sinonimos, marca, comercial ? x.gtinUpc : null), valores,
    porciones: comercial && x.servingSize > 0 && /^(g|grm)$/i.test(x.servingSizeUnit || '') ? [{ descripcion: `1 porción de la etiqueta${x.householdServingFullText ? ` (${porcionEs(x.householdServingFullText)})` : ''}`, original: `${x.servingSize} ${x.servingSizeUnit}${x.householdServingFullText ? ` · ${x.householdServingFullText}` : ''}`, gramos: Number(x.servingSize) }] : porcionesDe(x),
    avisos,
  };
  alimento.huella = huella(JSON.stringify([alimento.nombre, alimento.nombre_original, alimento.sinonimos, alimento.categoria, alimento.preparacion, alimento.publicado, alimento.valores, alimento.porciones]));
  return { alimento };
}

// registro normalizado → lo que recibe nutri_guardar_alimento (productos de marca elegidos por el coach)
export function paraGuardar(a) {
  return {
    fuente: a.fuente, id_externo: a.id_externo, codigo_barras: a.codigo_barras, nombre: a.nombre, nombre_original: a.nombre_original, idioma_original: a.idioma_original,
    nombre_traducido: !!a.nombre_traducido, marca: a.marca, categoria: a.categoria, base: a.base, preparacion: a.preparacion, version: a.version || a.publicado, publicado: a.publicado,
    energia_ref: a.energia_ref, ref_url: a.ref_url, sinonimos: a.sinonimos, sospechosos: a.sospechosos,
    valores: a.valores.map((v) => ({ codigo: POR_ID.get(v.nutriente).codigo, cantidad: v.cantidad, metodo: v.metodo, id_externo: v.id_externo, unidad_original: v.unidad_original })),
    porciones: a.porciones,
  };
}
