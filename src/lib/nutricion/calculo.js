// Motor de cálculo nutricional. Un solo lugar para todas las cuentas de la app.
//   cantidad consumida = gramos consumidos × valor por 100 g / 100
// Sin redondeos intermedios (se redondea solo al mostrar). Un valor desconocido no es cero:
// si un alimento no tiene el dato, el total lo dice ("faltan datos de 2 alimentos").
import { NUTRIENTES, POR_CODIGO } from './catalogo.js';

// factor de la sal: Reglamento (UE) 1169/2011, anexo I: sal = sodio × 2,5
export const FACTOR_SAL = 2.5;

// Ficha compacta (la que manda el servidor): { id, nombre, fuente, calidad, energia_ref, base, valores: { codigo: { c, e } } }
const num = (x) => (x != null && Number.isFinite(Number(x)) ? Number(x) : null);
const val = (f, k) => num(f?.valores?.[k]?.c);

// Los "principales" del contador: cada uno dice de qué definición salió
export const PRINCIPALES = ['kcal', 'proteina', 'carbohidratos', 'grasa', 'fibra', 'azucares', 'grasa_saturada', 'sodio', 'sal'];
export const ETIQUETAS = { kcal: 'Calorías', proteina: 'Proteína', carbohidratos: 'Carbohidratos', grasa: 'Grasa', fibra: 'Fibra', azucares: 'Azúcares', grasa_saturada: 'Grasa saturada', sodio: 'Sodio', sal: 'Sal' };
export const UNIDADES = { kcal: 'kcal', proteina: 'g', carbohidratos: 'g', grasa: 'g', fibra: 'g', azucares: 'g', grasa_saturada: 'g', sodio: 'mg', sal: 'g' };

// valores por 100 g de los principales y la definición usada
export function principalesPor100(f) {
  const out = {}; const def = {};
  const elegir = (k, codigos) => { for (const c of codigos) { const v = val(f, c); if (v != null) { out[k] = v; def[k] = c; return; } } };
  // energía: la que publicó la fuente (energia_ref). Si solo hay kJ, se convierte y se marca como derivada.
  if (f?.energia_ref && val(f, f.energia_ref) != null) { out.kcal = val(f, f.energia_ref); def.kcal = f.energia_ref; }
  else elegir('kcal', ['energia_kcal', 'energia_atwater_especifica_kcal', 'energia_atwater_general_kcal']);
  if (out.kcal == null && val(f, 'energia_kj') != null) { out.kcal = val(f, 'energia_kj') / 4.184; def.kcal = 'derivada_de_kj'; }
  elegir('proteina', ['proteina']);
  elegir('carbohidratos', ['carbohidratos_diferencia', 'carbohidratos_etiqueta', 'carbohidratos_suma']);
  elegir('grasa', ['grasa_total', 'grasa_nlea']);
  elegir('fibra', ['fibra_total', 'fibra_aoac_2011_25']);
  elegir('azucares', ['azucares_totales', 'azucares_totales_nlea']);
  elegir('grasa_saturada', ['grasa_saturada']);
  elegir('sodio', ['sodio']);
  if (val(f, 'sal') != null) { out.sal = val(f, 'sal'); def.sal = 'sal'; }
  else if (out.sodio != null) { out.sal = (out.sodio * FACTOR_SAL) / 1000; def.sal = 'calculada_de_sodio'; }
  return { valores: out, definiciones: def };
}

// Nutrientes de una cantidad en gramos. Devuelve también qué principales no se conocen.
export function nutrientesDe(f, gramos) {
  const g = num(gramos); if (g == null || g < 0) throw new Error('Cantidad no válida');
  const cuenta = (v) => (g * v) / 100; // exactamente la fórmula: gramos × valor por 100 g / 100
  const valores = {};
  NUTRIENTES.forEach((n) => { const v = val(f, n.codigo); if (v != null) valores[n.codigo] = cuenta(v); });
  const p = principalesPor100(f); const principales = {};
  Object.entries(p.valores).forEach(([c, v]) => { principales[c] = cuenta(v); });
  const desconocidos = PRINCIPALES.filter((c) => principales[c] == null);
  return { gramos: g, valores, principales, desconocidos, definiciones: p.definiciones };
}

// Lo que se guarda en el diario: principales + todos los nutrientes del catálogo que se conocen
export function instantanea(r) {
  return { nutrientes: { ...r.valores, ...r.principales }, desconocidos: r.desconocidos, definiciones: r.definiciones };
}

// Suma de varios resultados (ingredientes de una receta, alimentos de una comida o del día)
export function sumar(lista) {
  const tot = {}; const faltan = {}; let n = 0;
  lista.forEach((r) => {
    if (!r) return; n++;
    const nut = r.nutrientes || { ...r.valores, ...r.principales };
    Object.entries(nut).forEach(([c, v]) => { if (num(v) != null) tot[c] = (tot[c] || 0) + Number(v); });
    (r.desconocidos || []).forEach((c) => { faltan[c] = (faltan[c] || 0) + 1; });
  });
  return { nutrientes: tot, faltan, n };
}

// Receta: suma de los ingredientes dividida entre las porciones. Los ingredientes sin ficha se informan.
export function receta(rec, fichas) {
  const porc = num(rec.porciones) > 0 ? Number(rec.porciones) : 1;
  const faltantes = []; const partes = [];
  (rec.ingredientes || []).forEach((i) => {
    const f = fichas[i.alimento_id];
    if (!f) { faltantes.push(i.nombre || i.alimento_id); return; }
    const r = nutrientesDe(f, i.gramos); partes.push({ nutrientes: { ...r.valores, ...r.principales }, desconocidos: r.desconocidos });
  });
  const s = sumar(partes); const porPorcion = {};
  Object.entries(s.nutrientes).forEach(([c, v]) => { porPorcion[c] = v / porc; });
  const gramosTotal = (rec.ingredientes || []).reduce((t, i) => t + (num(i.gramos) || 0), 0);
  return { porPorcion, gramosPorPorcion: gramosTotal / porc, faltan: s.faltan, ingredientesSinFicha: faltantes, desconocidos: Object.keys(s.faltan) };
}

// Agua y sal añadida (registros que no son alimentos)
export function salAnadida(gramos) {
  const g = num(gramos) || 0;
  return { nutrientes: { sal: g, sodio: (g * 1000) / FACTOR_SAL }, desconocidos: [], definiciones: { sal: 'sal_de_mesa', sodio: 'calculado_de_sal' } };
}

// Totales del día a partir de los registros guardados (instantáneas)
export function totalesDia(registros) {
  const comida = registros.filter((r) => r.tipo !== 'agua');
  const s = sumar(comida.map((r) => ({ nutrientes: r.nutrientes || {}, desconocidos: r.desconocidos || [] })));
  const agua = registros.filter((r) => r.tipo === 'agua').reduce((t, r) => t + (num(r.ml) || 0), 0);
  return { ...s, agua_ml: agua };
}

// para mostrar: redondeo al final
export const redondear = (v, d = 0) => (num(v) == null ? null : Math.round(Number(v) * 10 ** d) / 10 ** d);
export const unidadDe = (codigo) => UNIDADES[codigo] || POR_CODIGO.get(codigo)?.unidad || '';
export const nombreDe = (codigo) => ETIQUETAS[codigo] || POR_CODIGO.get(codigo)?.nombre || codigo;
