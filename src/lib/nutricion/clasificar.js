// Estado de preparación, categoría en español, calidad documentada y valores sospechosos.
// Nada de esto inventa datos: solo describe lo que la fuente dice del alimento.
import { normalizarBusqueda } from './texto.js';

// ---------- preparación ----------
// Se lee de la descripción original. Si no dice nada, queda "no_indicado" (no se asume crudo).
const REGLAS_PREP = [
  ['frito', /\b(deep[- ]?fried|pan[- ]fried|fried|frying)\b/i],
  ['asado', /\b(roasted|grilled|broiled|barbecued|rotisserie|pan[- ]broiled)\b/i],
  ['horneado', /\b(baked|toasted)\b/i],
  ['guisado', /\b(braised|stewed)\b/i],
  ['al_vapor', /\b(steamed)\b/i],
  ['hervido', /\b(boiled|poached|simmered)\b/i],
  ['cocido', /\b(cooked|heated|microwaved|sauteed|scrambled|prepared)\b/i],
  ['enlatado', /\b(canned)\b/i],
  ['deshidratado', /\b(dehydrated|freeze-dried|sulfured|dried)\b/i],
  ['seco', /\b(dry|uncooked)\b/i],
  ['congelado', /\b(frozen)\b/i],
  ['crudo', /\b(raw|unheated|unprepared)\b/i],
];
export const PREPARACIONES = {
  crudo: 'Crudo', cocido: 'Cocido', hervido: 'Hervido', asado: 'Asado o a la parrilla', horneado: 'Horneado', frito: 'Frito', guisado: 'Guisado', al_vapor: 'Al vapor',
  seco: 'Seco (sin cocer)', deshidratado: 'Deshidratado', enlatado: 'Enlatado', congelado: 'Congelado', listo: 'Listo para consumir', no_indicado: 'Preparación no indicada',
};
const DETALLES = [
  ['escurrido', /\bdrained\b/i], ['con_liquido', /\bsolids and liquids\b|\bwith liquid\b/i], ['en_agua', /\b(in water|water pack|packed in water)\b/i], ['en_aceite', /\b(in oil|oil pack)\b/i],
  ['sin_grasa_anadida', /\bno added fat\b|\bwithout (added )?fat\b/i], ['con_grasa_anadida', /\b(fat added|with oil|with butter|made with oil|made with butter|made with margarine)\b/i],
  ['con_sal', /\bwith salt\b|\bsalted\b/i], ['sin_sal', /\bwithout salt\b|\bunsalted\b|\bno salt added\b/i], ['con_piel', /\bskin eaten\b|\bmeat and skin\b|\bwith skin\b/i],
  ['sin_piel', /\bskin not eaten\b|\bskinless\b|\bmeat only\b/i], ['con_hueso', /\bbone-in\b/i], ['desde_crudo', /\bfrom raw\b/i], ['desde_precocido', /\bfrom pre-cooked\b/i],
  ['listo_para_comer', /\bready-to-eat\b|\bready-to-serve\b|\bready-to-drink\b/i], ['reconstituido', /\breconstituted\b/i],
];
export function preparacionDe(desc) {
  const d = String(desc || '');
  // "Chicken breast, baked, ... from raw": manda el método de cocción, no el "raw" de "from raw"
  const sinDesde = d.replace(/\bfrom (raw|pre-cooked|frozen|concentrate)\b/gi, ' ');
  const regla = REGLAS_PREP.find(([, re]) => re.test(sinDesde));
  const detalle = DETALLES.filter(([, re]) => re.test(d)).map(([k]) => k);
  return { preparacion: regla ? regla[0] : (detalle.includes('listo_para_comer') ? 'listo' : 'no_indicado'), detalle };
}
export const esCrudo = (p) => p === 'crudo' || p === 'seco';

// ---------- categoría ----------
export const CATEGORIAS = ['Verduras', 'Frutas', 'Carnes', 'Aves', 'Pescados y mariscos', 'Huevos', 'Lácteos', 'Cereales y granos', 'Panes y horneados', 'Legumbres', 'Frutos secos y semillas',
  'Grasas y aceites', 'Bebidas', 'Dulces y postres', 'Comidas preparadas', 'Snacks', 'Salsas y condimentos', 'Suplementos y fórmulas', 'Otros'];
const POR_CATEGORIA_USDA = [
  [/vegetable/i, 'Verduras'], [/fruit/i, 'Frutas'], [/beef|pork|lamb|veal|game|sausage|luncheon/i, 'Carnes'], [/poultry/i, 'Aves'], [/finfish|shellfish|fish/i, 'Pescados y mariscos'],
  [/dairy and egg/i, 'Lácteos'], [/cereal grains|breakfast cereals|pasta/i, 'Cereales y granos'], [/baked/i, 'Panes y horneados'], [/legume/i, 'Legumbres'], [/nut and seed/i, 'Frutos secos y semillas'],
  [/fats and oils/i, 'Grasas y aceites'], [/beverage/i, 'Bebidas'], [/sweets/i, 'Dulces y postres'], [/snacks/i, 'Snacks'], [/soups|sauces|gravies|spices|herbs/i, 'Salsas y condimentos'],
  [/fast foods|restaurant|meals|entrees|side dishes/i, 'Comidas preparadas'], [/baby foods|infant/i, 'Suplementos y fórmulas'], [/american indian/i, 'Otros'],
];
// FNDDS usa las categorías WWEIA ("Chicken, whole pieces", "Rice", "Tropical fruits"...)
const POR_WWEIA = [
  [/egg/i, 'Huevos'], [/milk|yogurt|cheese|cream|dairy/i, 'Lácteos'], [/chicken|turkey|poultry/i, 'Aves'], [/beef|pork|lamb|meat|sausage|frankfurter|bacon|cold cuts|cured/i, 'Carnes'],
  [/fish|shellfish|seafood/i, 'Pescados y mariscos'], [/beans|peas|legume/i, 'Legumbres'], [/nuts|seeds/i, 'Frutos secos y semillas'], [/rice|pasta|cereal|grain|oatmeal|grits/i, 'Cereales y granos'],
  [/bread|rolls|tortilla|bagel|biscuit|muffin|pancake|waffle|cake|cookie|pie|pastr|doughnut|crackers/i, 'Panes y horneados'], [/fruit|juice/i, 'Frutas'],
  [/vegetable|potato|tomato|lettuce|greens|carrot|onion|corn|squash/i, 'Verduras'], [/butter|margarine|oil|fat|dressing|mayonnaise/i, 'Grasas y aceites'],
  [/water|coffee|tea|soft drink|beverage|beer|wine|liquor|drink|smoothie/i, 'Bebidas'], [/candy|sugar|sweet|ice cream|pudding|gelatin|dessert/i, 'Dulces y postres'],
  [/chips|snack|popcorn|pretzel/i, 'Snacks'], [/sauce|condiment|gravy|salsa|soup/i, 'Salsas y condimentos'], [/formula|baby|protein and nutritional|nutrition/i, 'Suplementos y fórmulas'],
  [/pizza|sandwich|burrito|taco|mixed|dish|burger|meals/i, 'Comidas preparadas'],
];
export function categoriaDe(catOriginal, desc, esWweia = false) {
  const c = String(catOriginal || '');
  if (/^egg/i.test(desc) || /\begg(s)?\b.*(whole|white|yolk)/i.test(desc)) return 'Huevos';
  const r = (esWweia ? POR_WWEIA : POR_CATEGORIA_USDA).find(([re]) => re.test(c));
  return r ? r[1] : 'Otros';
}

// ---------- calidad ----------
// Categorías descriptivas: dicen de dónde sale el dato. No son un porcentaje de exactitud.
export const CALIDADES = {
  oficial_analitico: { n: 'Fuente oficial · datos analíticos', d: 'USDA Foundation Foods: análisis de laboratorio de muestras identificadas, con su variabilidad.', prioridad: 5 },
  referencia: { n: 'Composición de referencia', d: 'USDA SR Legacy (2018, ya no se actualiza) o FNDDS: datos de referencia compilados y calculados por USDA.', prioridad: 4 },
  etiqueta: { n: 'Etiqueta comercial', d: 'Valores declarados por el fabricante en la etiqueta. No es un análisis de laboratorio.', prioridad: 2 },
  colaborativo: { n: 'Colaborativo sin verificar', d: 'Open Food Facts: datos de etiquetas cargados por la comunidad. Pueden tener errores.', prioridad: 1 },
  personalizado: { n: 'Personalizado por el coach', d: 'Escrito a mano por el coach. No viene de una fuente oficial.', prioridad: 3 },
};

// Revisa coherencia básica de una ficha por 100 g. Devuelve avisos, nunca corrige.
export function sospechosos(v) {
  const g = (k) => (v[k] != null && Number.isFinite(Number(v[k])) ? Number(v[k]) : null);
  const out = [];
  const negativos = Object.entries(v).filter(([, x]) => x != null && Number(x) < 0).map(([k]) => k);
  if (negativos.length) out.push(`Valores negativos: ${negativos.join(', ')}`);
  const p = g('proteina'), f = g('grasa_total'), c = g('carbohidratos_diferencia') ?? g('carbohidratos_etiqueta') ?? g('carbohidratos_suma'), a = g('agua'), al = g('alcohol');
  const masa = [p, f, c, a, al].filter((x) => x != null).reduce((s, x) => s + x, 0);
  if (masa > 105) out.push(`Los componentes suman ${Math.round(masa)} g en 100 g`);
  const kcal = g('energia_kcal') ?? g('energia_atwater_especifica_kcal') ?? g('energia_atwater_general_kcal');
  if (kcal != null && p != null && f != null && c != null) {
    const est = 4 * p + 9 * f + 4 * c + 7 * (al || 0); const dif = Math.abs(kcal - est);
    if (dif > 25 && dif / Math.max(kcal, est, 1) > 0.3) out.push(`La energía (${Math.round(kcal)} kcal) no cuadra con los macros (~${Math.round(est)} kcal)`);
  }
  if (kcal != null && kcal > 902) out.push('Más de 900 kcal por 100 g');
  if (g('sodio') != null && g('sodio') > 40000) out.push('Sodio imposible para 100 g');
  return out;
}

export const textoBusqueda = (...partes) => normalizarBusqueda(partes.flat().filter(Boolean).join(' '));

// ---------- el mismo alimento en otra preparación ----------
// Palabras que describen cómo se preparó (no qué alimento es). Se quitan para comparar.
// La misma lista está en nutri_claves (supabase/schema.sql).
export const DE_PREPARACION = ('raw cooked boiled roasted braised fried grilled baked steamed stewed broiled microwaved heated sauteed scrambled poached simmered toasted '
  + 'canned frozen dried dehydrated drained solids liquids with without salt salted unsalted added fat oil butter margarine from and the not only ready eat heat serve prepared '
  + 'unprepared uncooked dry pan deep reconstituted water pack packed nfs boneless broiler broilers fryer fryers meat').split(' ');
const QUITAR = new Set(DE_PREPARACION);
export function clavesAlimento(orig) {
  const t = normalizarBusqueda(orig).replace(/\b(meat only|skinless|skin not eaten|without skin)\b/g, ' sinpiel ').replace(/\b(meat and skin|with skin|skin eaten)\b/g, ' conpiel ');
  return [...new Set(t.split(' ').filter((w) => w.length > 2 && !QUITAR.has(w)))];
}
// cuánto de lo que dice el nombre más corto aparece en el otro (1 = todo)
export function parecido(a, b) {
  const ka = clavesAlimento(a); const kb = new Set(clavesAlimento(b)); if (!ka.length || !kb.size) return 0;
  return ka.filter((w) => kb.has(w)).length / Math.min(ka.length, kb.size);
}
export const MISMO_ALIMENTO = 0.75;
