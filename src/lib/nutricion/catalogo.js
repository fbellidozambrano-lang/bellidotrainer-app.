// Catálogo de nutrientes de la app. Cada nutriente tiene un id numérico ESTABLE (no se reutiliza ni
// se renumera) y un código legible. Las unidades son las de USDA FoodData Central, que es la fuente
// principal: así el valor normalizado coincide con el original y no hace falta convertir.
// Los nutrientes que miden lo mismo con definiciones distintas (energía general vs. específica,
// carbohidrato por diferencia vs. disponible) van por separado: nunca se mezclan.
//
// usda: ids del catálogo de nutrientes de FoodData Central (nutrient.id), en orden de preferencia.
// off:  clave en Open Food Facts (nutriments.<clave>_100g).

export const NUTRIENTES = [
  // ---------- energía ----------
  { id: 1, codigo: 'energia_kcal', nombre: 'Energía', unidad: 'kcal', grupo: 'energia', usda: [1008], off: 'energy-kcal', orden: 1,
    definicion: 'Energía publicada por la fuente. En SR Legacy y FNDDS se calculó con los factores de Atwater que USDA asignó a cada alimento.' },
  { id: 2, codigo: 'energia_atwater_especifica_kcal', nombre: 'Energía (Atwater específicos)', unidad: 'kcal', grupo: 'energia', usda: [2048], orden: 2,
    definicion: 'USDA FDC: energía metabolizable con factores de Atwater específicos del alimento (Handbook 74).' },
  { id: 3, codigo: 'energia_atwater_general_kcal', nombre: 'Energía (Atwater generales)', unidad: 'kcal', grupo: 'energia', usda: [2047], orden: 3,
    definicion: 'USDA FDC: energía metabolizable con factores generales 4 (proteína), 9 (grasa) y 4 (carbohidrato).' },
  { id: 4, codigo: 'energia_kj', nombre: 'Energía (kJ)', unidad: 'kJ', grupo: 'energia', usda: [1062], off: 'energy-kj', orden: 4, definicion: 'Energía en kilojulios publicada por la fuente.' },
  // ---------- macronutrientes ----------
  { id: 10, codigo: 'proteina', nombre: 'Proteína', unidad: 'g', grupo: 'macro', usda: [1003], off: 'proteins', orden: 10, definicion: 'Proteína (nitrógeno × factor de conversión del alimento).' },
  { id: 11, codigo: 'carbohidratos_diferencia', nombre: 'Carbohidratos (por diferencia)', unidad: 'g', grupo: 'macro', usda: [1005], orden: 11,
    definicion: 'Convención de EE. UU.: 100 − (agua + proteína + grasa + cenizas + alcohol). INCLUYE la fibra.' },
  { id: 12, codigo: 'carbohidratos_suma', nombre: 'Carbohidratos (por suma)', unidad: 'g', grupo: 'macro', usda: [1050], orden: 12, definicion: 'USDA Foundation: suma de azúcares, almidón y fibra analizados.' },
  { id: 13, codigo: 'carbohidratos_etiqueta', nombre: 'Carbohidratos (etiqueta)', unidad: 'g', grupo: 'macro', off: 'carbohydrates', orden: 13,
    definicion: 'Lo que declara la etiqueta. En la Unión Europea excluye la fibra; en EE. UU. la incluye. Open Food Facts no siempre indica cuál.' },
  { id: 14, codigo: 'grasa_total', nombre: 'Grasa total', unidad: 'g', grupo: 'macro', usda: [1004], off: 'fat', orden: 14, definicion: 'Lípidos totales.' },
  { id: 15, codigo: 'grasa_nlea', nombre: 'Grasa total (NLEA)', unidad: 'g', grupo: 'macro', usda: [1085], orden: 15, definicion: 'USDA Foundation: grasa como suma de ácidos grasos expresados como triglicéridos (definición de etiquetado NLEA).' },
  { id: 16, codigo: 'fibra_total', nombre: 'Fibra alimentaria', unidad: 'g', grupo: 'macro', usda: [1079], off: 'fiber', orden: 16, definicion: 'Fibra dietética total.' },
  { id: 17, codigo: 'fibra_aoac_2011_25', nombre: 'Fibra (AOAC 2011.25)', unidad: 'g', grupo: 'macro', usda: [2033], orden: 17, definicion: 'USDA Foundation: fibra total por el método AOAC 2011.25 (incluye fibra de bajo peso molecular).' },
  { id: 18, codigo: 'agua', nombre: 'Agua', unidad: 'g', grupo: 'macro', usda: [1051], orden: 18 },
  { id: 19, codigo: 'alcohol', nombre: 'Alcohol', unidad: 'g', grupo: 'macro', usda: [1018], off: 'alcohol', orden: 19, definicion: 'Alcohol etílico (OFF lo declara en % vol: no se convierte).' },
  // ---------- componentes ----------
  { id: 30, codigo: 'azucares_totales', nombre: 'Azúcares totales', unidad: 'g', grupo: 'componente', usda: [2000], off: 'sugars', orden: 30 },
  { id: 31, codigo: 'azucares_totales_nlea', nombre: 'Azúcares totales (NLEA)', unidad: 'g', grupo: 'componente', usda: [1063], orden: 31, definicion: 'USDA Foundation: suma de mono y disacáridos analizados (definición NLEA).' },
  { id: 32, codigo: 'azucares_anadidos', nombre: 'Azúcares añadidos', unidad: 'g', grupo: 'componente', usda: [1235], off: 'added-sugars', orden: 32 },
  { id: 33, codigo: 'almidon', nombre: 'Almidón', unidad: 'g', grupo: 'componente', usda: [1009], off: 'starch', orden: 33 },
  { id: 34, codigo: 'grasa_saturada', nombre: 'Grasa saturada', unidad: 'g', grupo: 'componente', usda: [1258], off: 'saturated-fat', orden: 34 },
  { id: 35, codigo: 'grasa_monoinsaturada', nombre: 'Grasa monoinsaturada', unidad: 'g', grupo: 'componente', usda: [1292], off: 'monounsaturated-fat', orden: 35 },
  { id: 36, codigo: 'grasa_poliinsaturada', nombre: 'Grasa poliinsaturada', unidad: 'g', grupo: 'componente', usda: [1293], off: 'polyunsaturated-fat', orden: 36 },
  { id: 37, codigo: 'grasa_trans', nombre: 'Grasa trans', unidad: 'g', grupo: 'componente', usda: [1257], off: 'trans-fat', orden: 37 },
  { id: 38, codigo: 'colesterol', nombre: 'Colesterol', unidad: 'mg', grupo: 'componente', usda: [1253], off: 'cholesterol', orden: 38 },
  { id: 39, codigo: 'sodio', nombre: 'Sodio', unidad: 'mg', grupo: 'componente', usda: [1093], off: 'sodium', orden: 39 },
  { id: 40, codigo: 'sal', nombre: 'Sal', unidad: 'g', grupo: 'componente', off: 'salt', orden: 40,
    definicion: 'Sal declarada por la fuente. Si no la declara, la app la calcula como sodio × 2,5 (Reglamento UE 1169/2011, anexo I) y lo indica.' },
  { id: 41, codigo: 'epa', nombre: 'Omega 3 EPA', unidad: 'g', grupo: 'componente', usda: [1278], orden: 41, definicion: 'PUFA 20:5 n-3 (EPA).' },
  { id: 42, codigo: 'dha', nombre: 'Omega 3 DHA', unidad: 'g', grupo: 'componente', usda: [1272], orden: 42, definicion: 'PUFA 22:6 n-3 (DHA).' },
  { id: 43, codigo: 'ala', nombre: 'Omega 3 ALA', unidad: 'g', grupo: 'componente', usda: [1404], orden: 43, definicion: 'PUFA 18:3 n-3 c,c,c (ácido alfa-linolénico).' },
  { id: 44, codigo: 'cafeina', nombre: 'Cafeína', unidad: 'mg', grupo: 'componente', usda: [1057], off: 'caffeine', orden: 44 },
  // ---------- minerales ----------
  { id: 60, codigo: 'calcio', nombre: 'Calcio', unidad: 'mg', grupo: 'mineral', usda: [1087], off: 'calcium', orden: 60 },
  { id: 61, codigo: 'hierro', nombre: 'Hierro', unidad: 'mg', grupo: 'mineral', usda: [1089], off: 'iron', orden: 61 },
  { id: 62, codigo: 'magnesio', nombre: 'Magnesio', unidad: 'mg', grupo: 'mineral', usda: [1090], off: 'magnesium', orden: 62 },
  { id: 63, codigo: 'fosforo', nombre: 'Fósforo', unidad: 'mg', grupo: 'mineral', usda: [1091], off: 'phosphorus', orden: 63 },
  { id: 64, codigo: 'potasio', nombre: 'Potasio', unidad: 'mg', grupo: 'mineral', usda: [1092], off: 'potassium', orden: 64 },
  { id: 65, codigo: 'zinc', nombre: 'Zinc', unidad: 'mg', grupo: 'mineral', usda: [1095], off: 'zinc', orden: 65 },
  { id: 66, codigo: 'cobre', nombre: 'Cobre', unidad: 'mg', grupo: 'mineral', usda: [1098], off: 'copper', orden: 66 },
  { id: 67, codigo: 'manganeso', nombre: 'Manganeso', unidad: 'mg', grupo: 'mineral', usda: [1101], off: 'manganese', orden: 67 },
  { id: 68, codigo: 'selenio', nombre: 'Selenio', unidad: 'µg', grupo: 'mineral', usda: [1103], off: 'selenium', orden: 68 },
  { id: 69, codigo: 'yodo', nombre: 'Yodo', unidad: 'µg', grupo: 'mineral', usda: [1100], off: 'iodine', orden: 69 },
  // ---------- vitaminas ----------
  { id: 80, codigo: 'vitamina_a_rae', nombre: 'Vitamina A (RAE)', unidad: 'µg', grupo: 'vitamina', usda: [1106], orden: 80, definicion: 'Equivalentes de actividad de retinol.' },
  { id: 81, codigo: 'retinol', nombre: 'Retinol', unidad: 'µg', grupo: 'vitamina', usda: [1105], orden: 81 },
  { id: 82, codigo: 'beta_caroteno', nombre: 'Betacaroteno', unidad: 'µg', grupo: 'vitamina', usda: [1107], orden: 82 },
  { id: 83, codigo: 'vitamina_a_ui', nombre: 'Vitamina A (UI)', unidad: 'UI', grupo: 'vitamina', usda: [1104], orden: 83, definicion: 'Unidades internacionales. No se convierten a µg: el factor depende de la forma (retinol o carotenoides).' },
  { id: 84, codigo: 'vitamina_c', nombre: 'Vitamina C', unidad: 'mg', grupo: 'vitamina', usda: [1162], off: 'vitamin-c', orden: 84 },
  { id: 85, codigo: 'vitamina_d', nombre: 'Vitamina D (D2 + D3)', unidad: 'µg', grupo: 'vitamina', usda: [1114], off: 'vitamin-d', orden: 85 },
  { id: 86, codigo: 'vitamina_d_ui', nombre: 'Vitamina D (UI)', unidad: 'UI', grupo: 'vitamina', usda: [1110], orden: 86, definicion: 'Unidades internacionales tal como las publica la fuente (1 UI = 0,025 µg).' },
  { id: 87, codigo: 'vitamina_e', nombre: 'Vitamina E (alfa-tocoferol)', unidad: 'mg', grupo: 'vitamina', usda: [1109], off: 'vitamin-e', orden: 87 },
  { id: 88, codigo: 'vitamina_k1', nombre: 'Vitamina K (filoquinona)', unidad: 'µg', grupo: 'vitamina', usda: [1185], off: 'vitamin-k', orden: 88 },
  { id: 89, codigo: 'vitamina_k2_mk4', nombre: 'Vitamina K2 (menaquinona-4)', unidad: 'µg', grupo: 'vitamina', usda: [1183], orden: 89 },
  { id: 90, codigo: 'tiamina', nombre: 'Tiamina (B1)', unidad: 'mg', grupo: 'vitamina', usda: [1165], off: 'vitamin-b1', orden: 90 },
  { id: 91, codigo: 'riboflavina', nombre: 'Riboflavina (B2)', unidad: 'mg', grupo: 'vitamina', usda: [1166], off: 'vitamin-b2', orden: 91 },
  { id: 92, codigo: 'niacina', nombre: 'Niacina (B3)', unidad: 'mg', grupo: 'vitamina', usda: [1167], off: 'vitamin-pp', orden: 92 },
  { id: 93, codigo: 'acido_pantotenico', nombre: 'Ácido pantoténico (B5)', unidad: 'mg', grupo: 'vitamina', usda: [1170], off: 'pantothenic-acid', orden: 93 },
  { id: 94, codigo: 'vitamina_b6', nombre: 'Vitamina B6', unidad: 'mg', grupo: 'vitamina', usda: [1175], off: 'vitamin-b6', orden: 94 },
  { id: 95, codigo: 'biotina', nombre: 'Biotina (B7)', unidad: 'µg', grupo: 'vitamina', usda: [1176], off: 'biotin', orden: 95 },
  { id: 96, codigo: 'folato_total', nombre: 'Folato total', unidad: 'µg', grupo: 'vitamina', usda: [1177], orden: 96, definicion: 'Folato de los alimentos + ácido fólico, en masa (sin ajustar por biodisponibilidad).' },
  { id: 97, codigo: 'folato_dfe', nombre: 'Folato (DFE)', unidad: 'µg', grupo: 'vitamina', usda: [1190], orden: 97, definicion: 'Equivalentes dietéticos de folato: corrige por la mayor absorción del ácido fólico.' },
  { id: 98, codigo: 'folato_alimentario', nombre: 'Folato de los alimentos', unidad: 'µg', grupo: 'vitamina', usda: [1187], orden: 98 },
  { id: 99, codigo: 'acido_folico', nombre: 'Ácido fólico (añadido)', unidad: 'µg', grupo: 'vitamina', usda: [1186], off: 'folates', orden: 99 },
  { id: 100, codigo: 'folato_5mthf', nombre: '5-metiltetrahidrofolato', unidad: 'µg', grupo: 'vitamina', usda: [1188], orden: 100 },
  { id: 101, codigo: 'vitamina_b12', nombre: 'Vitamina B12', unidad: 'µg', grupo: 'vitamina', usda: [1178], off: 'vitamin-b12', orden: 101 },
  { id: 102, codigo: 'colina', nombre: 'Colina', unidad: 'mg', grupo: 'vitamina', usda: [1180], orden: 102 },
];

export const POR_ID = new Map(NUTRIENTES.map((n) => [n.id, n]));
export const POR_CODIGO = new Map(NUTRIENTES.map((n) => [n.codigo, n]));
export const id = (codigo) => POR_CODIGO.get(codigo)?.id;
// usda nutrient.id → nuestro id
export const DESDE_USDA = new Map(NUTRIENTES.flatMap((n) => (n.usda || []).map((u) => [u, n.id])));
export const DESDE_OFF = new Map(NUTRIENTES.filter((n) => n.off).map((n) => [n.off, n.id]));
export const GRUPOS = { energia: 'Energía', macro: 'Macronutrientes', componente: 'Otros componentes', mineral: 'Minerales', vitamina: 'Vitaminas' };

// Los que mira la completitud de una ficha (núcleo para el contador y los micronutrientes pedidos)
export const NUCLEO = ['proteina', 'grasa_total', 'fibra_total', 'agua', 'azucares_totales', 'grasa_saturada', 'colesterol', 'sodio', 'calcio', 'hierro', 'magnesio', 'fosforo', 'potasio', 'zinc', 'vitamina_a_rae', 'vitamina_c', 'vitamina_d', 'vitamina_e', 'vitamina_k1', 'vitamina_b6', 'vitamina_b12', 'folato_total'];

// Micronutrientes que el coach puede ponerle de meta al asesorado
export const MICROS_META = ['fibra_total', 'sodio', 'potasio', 'calcio', 'hierro', 'magnesio', 'zinc', 'vitamina_d', 'vitamina_c', 'vitamina_b12', 'folato_dfe', 'epa', 'dha', 'azucares_totales', 'grasa_saturada', 'colesterol'];

// Estado de cada valor: de dónde sale el número y si un cero es un cero de verdad
export const ESTADOS = {
  analitico: 'Analizado en laboratorio',
  calculado: 'Calculado por la fuente',
  imputado: 'Estimado por la fuente a partir de otro alimento o receta',
  etiqueta: 'Declarado en la etiqueta',
  fabricante: 'Dato del fabricante',
  cero_asumido: 'Cero asumido por la fuente (no presente de forma natural)',
  cero_publicado: 'Publicado como cero (USDA advierte que puede estar bajo el límite de cuantificación)',
  cero_calculado: 'Cero calculado a partir de los ingredientes',
  sin_codigo: 'La fuente no documenta cómo se obtuvo',
  sin_valor: 'La fuente lista el nutriente sin valor',
  colaborativo: 'Dato colaborativo de la etiqueta (sin verificar)',
  personalizado: 'Escrito por el coach',
};
// estados con valor numérico usable en cálculos (sin_valor no tiene número)
export const conValor = (v) => v && v.cantidad != null && Number.isFinite(Number(v.cantidad));
