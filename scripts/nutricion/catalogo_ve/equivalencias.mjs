// Equivalencias del catálogo venezolano (VE-0001 … VE-1000) con alimentos genéricos de USDA FoodData Central.
//
// El catálogo no trae ningún valor nutricional (lo dice él mismo: 0 valores verificados). Su regla de prioridad
// es: 1) Tabla de Composición de Alimentos de Venezuela (INN) cuando haya un archivo verificable; 2) "USDA
// FoodData Central para alimentos genéricos comparables, documentando el alimento de referencia y las
// diferencias". Esta tabla es ese paso 2, revisada a mano entrada por entrada: solo se asigna un alimento de USDA
// cuando es el mismo alimento (o la especie o el corte equivalente) en la misma preparación. Lo demás queda
// pendiente con su motivo; nunca se rellena con cero ni con un valor parecido.
//
// Cada base tiene 10 entradas, en el orden de preparaciones de su categoría (PREPS). Cada entrada es:
//   número                 → fdcId de USDA (Foundation, SR Legacy o FNDDS ya publicados en public/datos/nutricion)
//   'n:Nombre exacto'      → el alimento de USDA con ese nombre (se resuelve al generar; si no existe, falla)
//   [ref, 'diferencia']    → igual, con la diferencia documentada respecto del alimento venezolano
//   '=k'                   → el mismo alimento que la entrada k de esa base (nombre redundante): se agrega
//                            como sinónimo de aquella, no como ficha repetida
//   'S' / 'S:detalle'      → sin equivalente defendible en USDA (hace falta la tabla venezolana o un análisis)
//   'C' / 'C:detalle'      → depende de la receta (cantidad de azúcar, aceite, relleno…): hay que calcularla
//   'A' / 'A:detalle'      → nombre ambiguo: no define una composición
//   'I' / 'I:detalle'      → combinación que no corresponde a ese alimento
//   'R'                    → variante de porción: la composición por 100 g es la de la receta; falta el peso
//   'E'                    → producto comercial: hace falta la etiqueta del producto exacto

export const MOTIVOS = {
  S: 'Sin equivalente en USDA: hace falta la Tabla de Composición de Alimentos de Venezuela o un análisis',
  C: 'Depende de la receta: hay que calcularla con sus ingredientes y pesos',
  A: 'Nombre ambiguo: no define una composición',
  I: 'Combinación que no corresponde a este alimento',
  R: 'Variante de porción: la composición por 100 g es la de la receta; falta el peso de la porción',
  E: 'Producto comercial: hace falta la etiqueta del producto exacto',
};

export const PREPS = {
  'Cereales, harinas y derivados': ['grano seco', 'grano cocido en agua', 'harina', 'harina precocida', 'hojuela', 'masa hidratada', 'tostado', 'inflado', 'panificado simple', 'sin sal añadida'],
  'Tubérculos, raíces y plátanos': ['crudo', 'hervido', 'al vapor', 'horneado', 'asado', 'frito', 'puré simple', 'en trozos cocidos', 'deshidratado', 'sin sal añadida'],
  'Legumbres, granos y semillas': ['seco', 'remojado', 'hervido sin sal', 'hervido con sal', 'guisado sencillo', 'en puré', 'tostado', 'germinado', 'en conserva escurrido', 'harina'],
  'Frutas venezolanas y de consumo habitual': ['cruda', 'pulpa fresca', 'jugo natural sin azúcar', 'jugo natural con azúcar', 'puré sin azúcar', 'deshidratada', 'congelada', 'en conserva escurrida', 'horneada', 'batido sin azúcar'],
  'Hortalizas, verduras y aromáticas': ['crudo', 'hervido', 'al vapor', 'salteado sin aceite', 'salteado con aceite', 'horneado', 'asado', 'en puré', 'en conserva escurrido', 'deshidratado'],
  'Carnes, aves y huevos': ['crudo', 'hervido', 'a la plancha', 'asado', 'horneado', 'guisado', 'al vapor', 'frito', 'a la parrilla', 'sin piel / sin grasa visible'],
  'Pescados y mariscos': ['crudo', 'hervido', 'al vapor', 'a la plancha', 'asado', 'horneado', 'guisado', 'frito', 'en conserva al natural escurrido', 'en conserva en aceite escurrido'],
  'Leche, yogures y quesos': ['natural sin azúcar', 'natural con azúcar', 'fortificado', 'reconstituido', 'bajo en grasa', 'entero', 'descremado', 'sin lactosa', 'fermentado natural', 'porción estándar (composición por verificar)'],
  'Platos y preparaciones tradicionales venezolanas': ['receta casera estándar', 'versión al horno', 'versión frita', 'versión a la plancha', 'con relleno de carne', 'con relleno de pollo', 'con queso', 'sin queso', 'porción pequeña', 'porción mediana'],
  'Panes, dulces, bebidas y otros preparados': ['receta tradicional', 'versión sin azúcar añadida', 'versión con azúcar', 'horneado', 'porción pequeña', 'porción mediana', 'porción grande', 'preparación casera', 'producto envasado (marca por verificar)', 'formulación comercial (etiqueta por verificar)'],
};

const SIN_SAL = 'A:no dice si es el grano, la harina o el cocido';
const VAPOR = 'USDA no publica la versión al vapor: se usa la hervida (cocción en agua, sin grasa)';
const PULPA = '=0';

// categoria: la de la app (src/lib/nutricion/clasificar.js); sin: sinónimos de búsqueda; nota: diferencia general
export const BASES = {
  // ---------- 1. Cereales ----------
  'Maíz amarillo': { categoria: 'Cereales y granos', sin: ['maiz'], refs: [170288, 'A:jojoto hervido o maíz seco cocido (pilado) son alimentos distintos', 169697,
    [168867, 'USDA: harina de maíz amarillo desgerminada y enriquecida; no hay análisis de la versión precocida'], [2708453, 'USDA: hojuelas de maíz de desayuno (con azúcar y sal añadidas)'],
    'A:la cantidad de agua varía', 'S', [2708219, 'USDA: cotufas (maíz reventón) sin mantequilla'], 'C', SIN_SAL] },
  'Maíz blanco': { categoria: 'Cereales y granos', sin: ['maiz'], refs: [168920, 'A:jojoto hervido o maíz seco cocido (pilado) son alimentos distintos', 169750,
    [168922, 'USDA: harina de maíz blanco desgerminada y enriquecida (tipo harina para arepas); no hay análisis de la versión precocida'], 'S', 'A:la cantidad de agua varía', 'S', 'S', 'C', SIN_SAL] },
  'Arroz blanco': { categoria: 'Cereales y granos', refs: [169756, 169757, 169714, 'S', 'S', 'I', 'S', [173912, 'USDA: arroz inflado de desayuno, fortificado'], 'C', '=1'] },
  'Arroz integral': { categoria: 'Cereales y granos', refs: [2512380, 169704, 1104812, 'S', 'S', 'I', 'S', 'S', 'C', 'S:USDA no indica la sal del arroz integral cocido'] },
  'Avena': { categoria: 'Cereales y granos', refs: [[2346397, 'USDA: avena en grano cortado (steel cut)'], 173905, 2261421, [173904, 'USDA: avena regular o rápida, sin fortificar'], 2346396, 'I', 'S', 'I', 'C', '=1'] },
  'Trigo': { categoria: 'Cereales y granos', refs: [[168890, 'USDA: trigo duro rojo de invierno'], 'S', [168894, 'USDA: harina de trigo blanca todo uso, enriquecida'], 'I', 'S', 'A:la cantidad de agua varía', 'S', [173913, 'USDA: trigo inflado de desayuno, fortificado'], 'C', SIN_SAL] },
  'Cebada': { categoria: 'Cereales y granos', refs: [[170284, 'USDA: cebada perlada'], [170285, 'USDA: cebada perlada cocida'], 2512376, 'I', 'S', 'I', 'S', 'I', 'C', SIN_SAL] },
  'Centeno': { categoria: 'Cereales y granos', refs: [168884, 'S', [168886, 'USDA: harina de centeno media'], 'I', 'S', 'I', 'I', 'I', [2707755, 'USDA: pan de centeno comercial de EE. UU. (suele llevar harina de trigo)'], SIN_SAL] },
  'Quinoa': { categoria: 'Cereales y granos', sin: ['quinua'], refs: [168874, 168917, 2512372, 'I', 'S', 'I', 'S', 'S', 'C', 'S:USDA no indica la sal de la quinoa cocida'] },
  'Sorgo': { categoria: 'Cereales y granos', refs: [169716, 'S', 168943, 'I', 'I', 'I', 'S', 'S', 'C', SIN_SAL] },

  // ---------- 2. Tubérculos, raíces y plátanos (orden: crudo, hervido, vapor, horneado, asado, frito, puré, trozos, deshidratado, sin sal) ----------
  'Papa': { categoria: 'Verduras', sin: ['patata'], refs: [170026, [170440, 'USDA: hervida sin piel, sin sal'], [170440, VAPOR], [170093, 'USDA: horneada con piel, sin sal'], '=3',
    [2709458, 'USDA: papas fritas caseras (desde papa fresca)'], [170493, 'USDA: puré casero con leche entera, sin mantequilla'], '=1', [170445, 'USDA: copos de papa deshidratada, sin leche'], '=1'] },
  'Batata': { categoria: 'Verduras', sin: ['boniato', 'camote'], nota: 'USDA analiza la batata de pulpa anaranjada; la venezolana suele ser de pulpa blanca o morada (mucha menos vitamina A)',
    refs: [168482, 168484, [168484, VAPOR], 168483, '=3', [2709712, 'USDA: batata frita casera'], 'C', '=1', 'S', '=1'] },
  'Yuca': { categoria: 'Verduras', sin: ['mandioca'], refs: [169985, 'S:USDA solo tiene “yuca cocida” de FNDDS con grasa añadida', 'S', 'S', 'S', 'C', 'C', 'S', 'S', 'S'] },
  'Ñame': { categoria: 'Verduras', nota: 'USDA: ñame (Dioscorea spp.)', refs: [170071, [170072, 'USDA: hervido o horneado, sin sal'], [170072, VAPOR], 170072, '=3', 'C', 'C', '=1', 'S', '=1'] },
  'Ocumo blanco': { categoria: 'Verduras', sin: ['yautia', 'malanga', 'tannia'], nota: 'USDA: yautía (Xanthosoma sagittifolium)', refs: [169401, 'S', 'S', 'S', 'S', 'C', 'C', 'S', 'S', 'S'] },
  'Ocumo chino': { categoria: 'Verduras', sin: ['taro', 'malanga isleña'], nota: 'USDA: taro (Colocasia esculenta)', refs: [169308, [168486, 'USDA: taro cocido sin sal (método no indicado)'], [168486, VAPOR], 168486, '=3', 'C', 'C', '=1', 'S', '=1'] },
  'Apio criollo': { categoria: 'Verduras', sin: ['arracacha', 'apio de pais'], nota: 'Arracacia xanthorrhiza (el mismo alimento que la arracacha): USDA no la tiene; el “celeriac” es otra planta', refs: ['S', 'S', 'S', 'S', 'S', 'C', 'C', 'S', 'S', 'S'] },
  'Mapuey': { categoria: 'Verduras', nota: 'USDA: ñame (Dioscorea spp.); el mapuey es Dioscorea trifida', refs: [170071, [170072, 'USDA: hervido o horneado, sin sal'], [170072, VAPOR], 170072, '=3', 'C', 'C', '=1', 'S', '=1'] },
  'Arracacha': { categoria: 'Verduras', sin: ['apio criollo'], nota: 'Arracacia xanthorrhiza: USDA no la tiene', refs: ['S', 'S', 'S', 'S', 'S', 'C', 'C', 'S', 'S', 'S'] },
  'Plátano': { categoria: 'Verduras', sin: ['platano verde'], nota: 'Se toma como plátano verde (el maduro está en frutas)', refs: [168215, [168216, 'USDA: plátano verde hervido'], [168216, VAPOR], 'S', 'S', [168199, 'USDA: plátano verde frito (tostón)'], 'C', '=1', 'S', 'S:USDA no indica la sal del plátano hervido'] },

  // ---------- 3. Legumbres (orden: seco, remojado, hervido sin sal, con sal, guisado, puré, tostado, germinado, conserva, harina) ----------
  'Caraota negra': { categoria: 'Legumbres', sin: ['frijol negro', 'poroto negro'], refs: [173734, 'A:el agua absorbida varía', 173735, 175237, [2707360, 'USDA: caraotas de grano seco cocidas con grasa añadida (sin el sofrito del guiso venezolano)'], 'C', 'I', 'S', [2644285, 'USDA: en lata, escurridas y enjuagadas'], 'S'] },
  'Caraota roja': { categoria: 'Legumbres', sin: ['frijol rojo', 'frijol riñon'], nota: 'USDA: frijol rojo riñón', refs: [173744, 'A:el agua absorbida varía', 175194, 175242, [2707380, 'USDA: cocidas con grasa añadida'], 'C', 'I', 'S', 174285, 'S'] },
  'Frijol bayo': { categoria: 'Legumbres', sin: ['caraota bayo'], nota: 'USDA: frijol pinto (variedad cercana al bayo)', refs: [175199, 'A:el agua absorbida varía', 175200, 173796, [2707372, 'USDA: cocidos con grasa añadida'], 'C', 'I', 170086, [2644292, 'USDA: en lata, escurridos y enjuagados'], 'S'] },
  'Frijol blanco': { categoria: 'Legumbres', sin: ['caraota blanca', 'alubia'], refs: [175202, 'A:el agua absorbida varía', 175203, 175249, [2707354, 'USDA: cocidos con grasa añadida'], 'C', 'I', [169139, 'USDA: frijol blanco pequeño (navy) germinado'], [2644286, 'USDA: frijol blanco pequeño (navy) en lata, escurrido y enjuagado'], 'S'] },
  'Frijol rojo': { categoria: 'Legumbres', nota: 'USDA: frijol rojo riñón (no publica el frijol rojo pequeño)', refs: [173744, 'A:el agua absorbida varía', 175194, 175242, [2707380, 'USDA: cocidos con grasa añadida'], 'C', 'I', 'S', 174285, 'S'] },
  'Lenteja': { categoria: 'Legumbres', refs: [172420, 'A:el agua absorbida varía', 172421, 175254, [2707424, 'USDA: cocidas con grasa añadida'], 'C', 'I', 168427, 'S', 'S'] },
  'Arveja seca': { categoria: 'Legumbres', sin: ['arveja partida', 'guisante seco', 'chicharo'], nota: 'USDA: arveja partida (split peas)', refs: [172428, 'A:el agua absorbida varía', 172429, 175257, [2707421, 'USDA: cocidas con grasa añadida'], 'C', 'I', [170422, 'USDA: arveja seca entera germinada'], 'S', 'S'] },
  'Garbanzo': { categoria: 'Legumbres', refs: [173756, 'A:el agua absorbida varía', 173757, 173799, [2707415, 'USDA: cocidos con grasa añadida'], 'C', 'S', 'S', 173800, 174288] },
  'Soya': { categoria: 'Legumbres', sin: ['soja'], refs: [174270, 'A:el agua absorbida varía', 'S', 174299, 'C', 'C', 172441, 169284, 'S', [174273, 'USDA: harina de soya entera, cruda']] },
  'Quinchoncho': { categoria: 'Legumbres', sin: ['guandu', 'gandul', 'frijol de palo'], nota: 'USDA: guandú en grano seco', refs: [172436, 'A:el agua absorbida varía', 172437, 172472, 'C', 'C', 'I', 'S', 'S', 'S'] },

  // ---------- 4. Frutas (orden: cruda, pulpa, jugo sin azúcar, jugo con azúcar, puré, deshidratada, congelada, conserva, horneada, batido) ----------
  'Cambur': { categoria: 'Frutas', sin: ['banana', 'banano', 'guineo'], refs: [173944, PULPA, 'I', 'I', 'S', 173945, 'S', 'I', 'C', 'A:no dice si es con leche o con agua'] },
  'Plátano maduro': { categoria: 'Frutas', sin: ['amarillo'], refs: [[2710817, 'USDA: plátano maduro crudo'], PULPA, 'I', 'I', 'S', 'S', 'S', 'I', [169131, 'USDA: plátano amarillo horneado'], 'I'] },
  'Lechosa': { categoria: 'Frutas', sin: ['papaya'], refs: [169926, PULPA, [2709327, 'USDA: jugo 100 % de papaya (FNDDS)'], 'C', 'S', [2709206, 'USDA: papaya deshidratada (FNDDS)'], 'S', [169927, 'USDA: en almíbar espeso, escurrida'], 'I', 'A:no dice si es con leche o con agua'] },
  'Mango': { categoria: 'Frutas', refs: [169910, PULPA, 'S:USDA solo publica néctar (con azúcar)', 'C', 'S', [2709205, 'USDA: mango deshidratado (los valores coinciden con el azucarado)'], [2709244, 'USDA: mango congelado (FNDDS)'], 'S', 'I', 'A:no dice si es con leche o con agua'] },
  'Guayaba': { categoria: 'Frutas', refs: [173044, PULPA, 'S:USDA solo publica néctar (con azúcar)', 'C', 'S', 'S', 'S', 'S', 'I', 'A:no dice si es con leche o con agua'] },
  'Guanábana': { categoria: 'Frutas', refs: [167761, PULPA, 'S:USDA solo publica néctar (con azúcar)', 'C', 'S', 'S', 'S', 'S', 'I', 'A:no dice si es con leche o con agua'] },
  'Parchita': { categoria: 'Frutas', sin: ['maracuya', 'fruta de la pasion'], refs: [[169108, 'USDA: parchita morada (granadilla); la venezolana suele ser amarilla'], PULPA, [169110, 'USDA: jugo de parchita amarilla, crudo'], 'C', 'S', 'S', 'S', 'S', 'I', 'A:no dice si es con leche o con agua'] },
  'Lechosa verde': { categoria: 'Frutas', sin: ['papaya verde'], refs: ['S', 'S', 'I', 'I', 'S', 'S', 'S', 'S', 'S', 'I'] },
  'Piña': { categoria: 'Frutas', sin: ['ananas'], refs: [169124, PULPA, [168205, 'USDA: jugo de piña envasado sin azúcar, con vitaminas A, C y E añadidas'], 'C', 'S', [2709210, 'USDA: piña deshidratada (FNDDS)'], [2709264, 'USDA: piña congelada (FNDDS)'], [167767, 'USDA: en lata en su jugo, escurrida'], 'S', 'A:no dice si es con leche o con agua'] },
  'Patilla': { categoria: 'Frutas', sin: ['sandia'], refs: [167765, PULPA, [2709333, 'USDA: jugo 100 % de patilla (FNDDS)'], 'C', 'I', 'S', 'S', 'I', 'I', 'A:no dice si es con leche o con agua'] },

  // ---------- 5. Hortalizas (orden: crudo, hervido, vapor, salteado sin aceite, con aceite, horneado, asado, puré, conserva, deshidratado) ----------
  'Tomate': { categoria: 'Verduras', refs: [170457, [170050, 'USDA: tomate cocido (método no indicado)'], [170050, VAPOR], [170050, 'USDA: tomate cocido sin grasa'], 'C', 'S', 'S', [170460, 'USDA: puré de tomate envasado, sin sal añadida'], 'S:USDA no publica el tomate en lata escurrido', 168567] },
  'Cebolla': { categoria: 'Verduras', refs: [170000, 170001, [170001, VAPOR], [170001, 'USDA: cebolla cocida sin grasa (hervida)'], [170004, 'USDA: cebolla amarilla salteada'], 'S', 'S', 'I', 'S:USDA no publica la cebolla en lata escurrida', 170002] },
  'Pimentón': { categoria: 'Verduras', sin: ['pimiento', 'aji dulce grande', 'chile morron'], nota: 'USDA: pimentón rojo', refs: [170108, 170110, [170110, VAPOR], [170110, 'USDA: pimentón cocido sin grasa (hervido)'], [168550, 'USDA: pimentón rojo salteado'], 'S', 'S', 'I', 'S:USDA no publica el pimentón en lata escurrido', [169373, 'USDA: pimentón rojo liofilizado']] },
  'Ají dulce': { categoria: 'Verduras', nota: 'Capsicum chinense de variedad dulce: USDA no lo tiene', refs: ['S', 'S', 'S', 'S', 'C', 'S', 'S', 'I', 'S', 'S'] },
  'Ajo': { categoria: 'Verduras', refs: [1104647, 'S', 'S', 'S', 'C', 'S', 'S', 'S', 'S', [171325, 'USDA: ajo en polvo']] },
  'Zanahoria': { categoria: 'Verduras', refs: [170393, 170394, [170394, VAPOR], [170394, 'USDA: zanahoria cocida sin grasa (hervida)'], 'C', 'S', 'S', 'S', 170396, 170500] },
  'Auyama': { categoria: 'Verduras', sin: ['calabaza', 'zapallo'], nota: 'USDA: auyama tipo butternut (Cucurbita moschata, la misma especie)', refs: [169295, [168474, 'USDA: cocida hervida, desde congelada'], [168474, VAPOR], [168474, 'USDA: cocida sin grasa (hervida)'], 'C', 169296, '=5', [168450, 'USDA: calabaza en lata sin sal (puré)'], 'I', 'S'] },
  'Berenjena': { categoria: 'Verduras', refs: [169228, 169229, [169229, VAPOR], [2709929, 'USDA: berenjena cocida sin grasa añadida (FNDDS)'], [2709930, 'USDA: berenjena cocida con grasa añadida (FNDDS)'], 'S', 'S', 'C', 'S', 'S'] },
  'Calabacín': { categoria: 'Verduras', sin: ['zucchini', 'calabacita'], refs: [169291, 169292, [169292, VAPOR], [169292, 'USDA: calabacín cocido sin grasa (hervido)'], 'C', 'S', 'S', 'I', 'S', 'S'] },
  'Repollo': { categoria: 'Verduras', sin: ['col'], refs: [169975, 169976, [169976, VAPOR], [2709889, 'USDA: repollo cocido sin grasa añadida (FNDDS)'], [2709891, 'USDA: repollo cocido con aceite (FNDDS)'], 'S', 'S', 'I', 'S', 'S'] },

  // ---------- 6. Carnes, aves y huevos (orden: crudo, hervido, plancha, asado, horneado, guisado, vapor, frito, parrilla, sin piel / sin grasa visible) ----------
  'Carne de res magra': { categoria: 'Carnes', sin: ['res', 'carne magra'], nota: 'USDA: compuesto de cortes magros de res, sin grasa de cobertura', refs: [174760,
    [170208, 'USDA “cocido”: promedio de los métodos de cocción habituales de cada corte, sin grasa añadida; solo la carne, sin caldo'], [170208, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], [170208, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], [170208, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'],
    [170208, 'USDA “cocido”: solo la carne, sin la salsa del guiso'], [170208, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], 'C:depende del aceite que absorbe', [170208, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], '=0'] },
  'Carne de res semigrasa': { categoria: 'Carnes', sin: ['res'], nota: 'USDA: compuesto de cortes de res con su grasa (recortada a 3 mm)', refs: [169483,
    [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida; solo la carne'], [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'],
    [169484, 'USDA “cocido”: solo la carne, sin la salsa del guiso'], [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'], 'C:depende del aceite que absorbe', [169484, 'USDA “cocido”: promedio de métodos de cocción sin grasa añadida'],
    [174758, 'Sin la grasa visible queda la parte magra: USDA “solo magro”']] },
  'Solomo de res': { categoria: 'Carnes', sin: ['solomo', 'sirloin'], nota: 'USDA: top sirloin, solo la parte magra', refs: [174055, 'S', [174054, 'USDA: a la parrilla (broiled)'], [174054, 'USDA: a la parrilla (broiled)'], [174054, 'USDA solo publica el solomo a la parrilla (calor seco)'], 'S', 'S', 'C:depende del aceite que absorbe', 174054, '=0'] },
  'Muchacho redondo': { categoria: 'Carnes', sin: ['muchacho', 'peceto', 'eye of round'], nota: 'USDA: eye of round, solo la parte magra', refs: [173998, 'S', [171772, 'USDA: bistec de muchacho a la parrilla (grilled)'], [170633, 'USDA: asado al horno'], 170633, 'S:el asado negro es una receta (ver platos)', 'S', 'C:depende del aceite que absorbe', 171772, '=0'] },
  'Falda de res': { categoria: 'Carnes', sin: ['falda', 'flank'], nota: 'USDA: flank steak', refs: [169563, [169434, 'USDA: falda guisada (braised), magro y grasa, grado choice'], [168733, 'USDA: a la parrilla (broiled)'], [168733, 'USDA: a la parrilla (broiled)'], 'S', [169434, 'USDA: falda guisada (braised), solo la carne'], 'S', 'C:depende del aceite que absorbe', 168733, [174776, 'USDA: solo la parte magra']] },
  'Pechuga de pollo': { categoria: 'Aves', sin: ['pollo', 'pechuga'], nota: 'Crudo: con piel. Cocidos: USDA “solo carne” (sin piel)', refs: [171474, [171478, 'USDA: guisada/hervida (stewed), sin piel'], [171477, 'USDA: asada (roasted), sin piel'], [171477, 'USDA: asada (roasted), sin piel'], [171477, 'USDA: asada (roasted), sin piel'],
    [171478, 'USDA: guisada (stewed), sin piel; sin la salsa'], [171478, 'USDA no publica la versión al vapor: se usa la guisada en agua (stewed)'], [171078, 'USDA: frita, sin piel'], [171477, 'USDA: asada (roasted), sin piel'], 2646170] },
  'Muslo de pollo': { categoria: 'Aves', sin: ['pollo', 'muslo', 'contramuslo'], nota: 'Crudo: con piel. Cocidos: USDA “solo carne” (sin piel)', refs: [172385, [172389, 'USDA: guisado/hervido (stewed), sin piel'], [172388, 'USDA: asado (roasted), sin piel'], [172388, 'USDA: asado (roasted), sin piel'], [172388, 'USDA: asado (roasted), sin piel'],
    [172389, 'USDA: guisado (stewed), sin piel; sin la salsa'], [172389, 'USDA no publica la versión al vapor: se usa la guisada en agua (stewed)'], [172387, 'USDA: frito, sin piel'], [172388, 'USDA: asado (roasted), sin piel'], 2646171] },
  'Pavo': { categoria: 'Aves', nota: 'USDA: pavo entero', refs: [[171081, 'USDA: carne y piel'], 'S', [171481, 'USDA: asado (roasted), solo carne'], [171481, 'USDA: asado (roasted), solo carne'], [171481, 'USDA: asado (roasted), solo carne'], 'S', 'S', 'C:depende del aceite que absorbe', [171481, 'USDA: asado (roasted), solo carne'], [171480, 'USDA: solo carne, crudo']] },
  'Huevo de gallina': { categoria: 'Huevos', sin: ['huevo', 'huevo entero'], refs: [171287, [173424, 'USDA: huevo duro'], [2707156, 'USDA: huevo a la plancha sin grasa añadida (FNDDS)'], 'I', [2707165, 'USDA: huevo horneado sin grasa añadida (FNDDS)'], 'C:perico y otros guisos llevan más ingredientes', 'S', [173423, 'USDA: huevo frito'], 'I', 'I'] },
  'Huevo de codorniz': { categoria: 'Huevos', refs: [172191, 'S', 'S', 'I', 'S', 'C', 'S', 'S', 'I', 'I'] },

  // ---------- 7. Pescados (orden: crudo, hervido, vapor, plancha, asado, horneado, guisado, frito, conserva al natural, conserva en aceite) ----------
  'Atún': { categoria: 'Pescados y mariscos', refs: [[175159, 'USDA: atún aleta amarilla'], 'S', 'S', [172006, 'USDA: atún aleta amarilla cocido a calor seco'], [172006, 'USDA: cocido a calor seco'], [172006, 'USDA: cocido a calor seco'], 'C', 'C', [173709, 'USDA: atún claro en agua, escurrido'], [173708, 'USDA: atún claro en aceite, escurrido']] },
  'Sardina': { categoria: 'Pescados y mariscos', refs: ['S', 'S', 'S', 'S', 'S', 'S', 'C', 'C', 'S', [175139, 'USDA: sardina del Atlántico en aceite, escurrida, con espinas']] },
  'Carite': { categoria: 'Pescados y mariscos', sin: ['sierra', 'macarela'], nota: 'USDA: sierra española (Scomberomorus maculatus), pariente del carite', refs: [173673, 'S', 'S', [173674, 'USDA: cocido a calor seco'], [173674, 'USDA: cocido a calor seco'], [173674, 'USDA: cocido a calor seco'], 'C', 'C', 'S', 'S'] },
  'Pargo': { categoria: 'Pescados y mariscos', nota: 'USDA: pargo, varias especies', refs: [173698, 'S', 'S', [173699, 'USDA: cocido a calor seco'], [173699, 'USDA: cocido a calor seco'], [173699, 'USDA: cocido a calor seco'], 'C', 'C', 'S', 'S'] },
  'Mero': { categoria: 'Pescados y mariscos', nota: 'USDA: mero, varias especies', refs: [171962, 'S', 'S', [171963, 'USDA: cocido a calor seco'], [171963, 'USDA: cocido a calor seco'], [171963, 'USDA: cocido a calor seco'], 'C', 'C', 'S', 'S'] },
  'Corvina': { categoria: 'Pescados y mariscos', nota: 'USDA: corvinas del género Cynoscion (seatrout), varias especies', refs: [173695, 'S', 'S', [174242, 'USDA: cocida a calor seco'], [174242, 'USDA: cocida a calor seco'], [174242, 'USDA: cocida a calor seco'], 'C', 'C', 'S', 'S'] },
  'Cazón': { categoria: 'Pescados y mariscos', sin: ['tiburon'], nota: 'USDA: tiburón, varias especies', refs: [173697, 'S', 'S', 'S', 'S', 'S', 'C:el cazón guisado es una receta', 'C', 'S', 'S'] },
  'Merluza': { categoria: 'Pescados y mariscos', nota: 'USDA: whiting, varias especies (incluye la merluza plateada, Merluccius bilinearis)', refs: [173713, 'S', [2706317, 'USDA: al vapor (FNDDS)'], [175161, 'USDA: cocida a calor seco'], [175161, 'USDA: cocida a calor seco'], [175161, 'USDA: cocida a calor seco'], 'C', 'C', 'S', 'S'] },
  'Camarón': { categoria: 'Pescados y mariscos', sin: ['camarones', 'gamba'], refs: [175179, [175180, 'USDA: camarón cocido (calor húmedo)'], [175180, 'USDA: camarón cocido (calor húmedo)'], 'C', 'C', 'C', 'C', 'C', [171972, 'USDA: camarón en lata'], 'S'] },
  'Calamar': { categoria: 'Pescados y mariscos', refs: [174223, 'S', 'S', 'S', 'S', 'S', 'C', [171982, 'USDA: calamar frito (enharinado)'], 'S', 'S'] },

  // ---------- 8. Lácteos (orden: natural sin azúcar, con azúcar, fortificado, reconstituido, bajo en grasa, entero, descremado, sin lactosa, fermentado, porción) ----------
  'Leche entera de vaca': { categoria: 'Lácteos', sin: ['leche entera', 'leche'], refs: ['n:Milk, whole, 3.25% milkfat, without added vitamin A and vitamin D', 'C', [171265, 'USDA: con vitamina D añadida'], [2705397, 'USDA: leche en polvo entera reconstituida (FNDDS)'], 'I', '=0', 'I', [2705392, 'USDA: leche entera sin lactosa (FNDDS)'], 'A:no dice qué fermentado es', 'R'] },
  'Leche semidescremada': { categoria: 'Lácteos', sin: ['leche semidescremada', 'leche 2%'], nota: 'USDA: leche reducida en grasa (2 %)', refs: [172205, 'C', [171267, 'USDA: con vitaminas A y D añadidas'], 'S', 'A:“bajo en grasa” en USDA es la leche al 1 %', 'I', 'I', [2705391, 'USDA: leche 2 % sin lactosa (FNDDS)'], 'A:no dice qué fermentado es', 'R'] },
  'Leche descremada': { categoria: 'Lácteos', sin: ['leche descremada', 'leche desnatada'], refs: ['n:Milk, nonfat, fluid, without added vitamin A and vitamin D (fat free or skim)', 'C', [171269, 'USDA: con vitaminas A y D añadidas'], [2705396, 'USDA: leche en polvo descremada reconstituida (FNDDS)'], '=0', 'I', '=0', [2705390, 'USDA: leche descremada sin lactosa (FNDDS)'], 'A:no dice qué fermentado es', 'R'] },
  'Leche en polvo entera': { categoria: 'Lácteos', sin: ['leche en polvo'], refs: ['n:Milk, dry, whole, without added vitamin D', 'C', [170876, 'USDA: con vitamina D añadida'], [2705397, 'USDA: reconstituida (FNDDS)'], 'I', '=0', 'I', 'S', 'I', 'R'] },
  'Leche en polvo descremada': { categoria: 'Lácteos', sin: ['leche en polvo'], refs: [170877, 'C', 'n:Milk, dry, nonfat, regular, with added vitamin A and vitamin D', [2705396, 'USDA: reconstituida (FNDDS)'], '=0', 'I', '=0', 'S', 'I', 'R'] },
  'Yogur natural': { categoria: 'Lácteos', sin: ['yogurt'], refs: [[2259793, 'USDA: yogur natural de leche entera'], 'C', 'S', 'I', [170886, 'USDA: yogur natural bajo en grasa'], '=0', [2647437, 'USDA: yogur natural descremado'], 'S', '=0', 'R'] },
  'Yogur griego natural': { categoria: 'Lácteos', sin: ['yogurt griego'], refs: [[2259794, 'USDA: yogur griego natural de leche entera'], 'C', 'S', 'I', 'n:Yogurt, Greek, plain, lowfat', '=0', [330137, 'USDA: yogur griego natural descremado'], 'S', '=0', 'R'] },
  'Queso blanco fresco': { categoria: 'Lácteos', sin: ['queso blanco', 'queso fresco'], nota: 'USDA: queso blanco estilo latino; la sal y la humedad del queso venezolano varían mucho', refs: [172224, 'I', 'I', 'I', 'S', '=0', 'S', 'S', 'I', 'R'] },
  'Queso guayanés': { categoria: 'Lácteos', nota: 'Queso fresco blando de Guayana: USDA no lo tiene', refs: ['S', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'I', 'R'] },
  'Queso de mano': { categoria: 'Lácteos', nota: 'Queso de pasta hilada venezolano: USDA no lo tiene', refs: ['S', 'I', 'I', 'I', 'S', 'S', 'S', 'S', 'I', 'R'] },

  // ---------- 9. Platos (orden: receta, al horno, frita, a la plancha, relleno carne, relleno pollo, con queso, sin queso, porción pequeña, porción mediana) ----------
  'Arepa de maíz': { categoria: 'Comidas preparadas', sin: ['arepa'], refs: [[168070, 'USDA: arepa de restaurante latino en EE. UU., sola (sin relleno)'], 'S', 'C', '=0', 'C', 'C', 'C', '=0', 'R', 'R'] },
  'Cachapa': { categoria: 'Comidas preparadas', refs: ['C', 'C', 'C', 'C', 'C', 'C', 'C', 'C', 'R', 'R'] },
  'Hallaca': { categoria: 'Comidas preparadas', sin: ['hayaca'], refs: ['C', 'I', 'I', 'I', 'C', 'C', 'I', 'I', 'R', 'R'] },
  'Pabellón criollo': { categoria: 'Comidas preparadas', sin: ['pabellon'], refs: ['C', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },
  'Asado negro': { categoria: 'Comidas preparadas', refs: ['C', 'C', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },
  'Mondongo': { categoria: 'Comidas preparadas', refs: ['C', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },
  'Sancocho de res': { categoria: 'Comidas preparadas', sin: ['sopa de res', 'hervido de res'], refs: ['C', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },
  'Sancocho de gallina': { categoria: 'Comidas preparadas', sin: ['sopa de gallina', 'hervido de gallina'], refs: ['C', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },
  'Empanada de maíz': { categoria: 'Comidas preparadas', sin: ['empanada'], refs: ['C', 'C', 'C', 'I', 'C', 'C', 'C', 'I', 'R', 'R'] },
  'Hervido de pescado': { categoria: 'Comidas preparadas', sin: ['sopa de pescado'], refs: ['C', 'I', 'I', 'I', 'I', 'I', 'I', 'I', 'R', 'R'] },

  // ---------- 10. Panes y dulces (orden: receta, sin azúcar, con azúcar, horneado, porción pequeña, mediana, grande, casera, envasado, comercial) ----------
  'Pan francés': { categoria: 'Panes y horneados', sin: ['pan frances', 'canilla'], refs: [[172675, 'USDA: pan francés o de Viena comercial (incluye masa madre)'], 'A', 'C', '=0', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Pan campesino': { categoria: 'Panes y horneados', refs: ['S', 'A', 'C', 'S', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Pan integral': { categoria: 'Panes y horneados', sin: ['pan de trigo integral'], refs: [[172688, 'USDA: pan integral comercial'], 'A', 'C', '=0', 'R', 'R', 'R', [172690, 'USDA: pan integral hecho en casa (receta USDA)'], 'E', 'E'] },
  'Casabe': { categoria: 'Panes y horneados', sin: ['cazabe', 'pan de yuca'], refs: [[2709566, 'USDA: casabe (pan de yuca), FNDDS'], '=0', 'C:el casabe dulce lleva papelón', '=0', 'R', 'R', 'R', 'S', 'E', 'E'] },
  'Golfeado': { categoria: 'Panes y horneados', refs: ['C', 'I', 'C', 'C', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Quesillo': { categoria: 'Dulces y postres', sin: ['flan'], nota: 'El flan de USDA no lleva leche condensada: no es equivalente', refs: ['C', 'C', 'C', 'C', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Bienmesabe': { categoria: 'Dulces y postres', refs: ['C', 'I', 'C', 'I', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Torta de pan': { categoria: 'Dulces y postres', sin: ['pudin de pan'], refs: ['C', 'C', 'C', 'C', 'R', 'R', 'R', 'C', 'E', 'E'] },
  'Papelón': { categoria: 'Dulces y postres', sin: ['panela', 'piloncillo', 'raspadura'], nota: 'USDA no tiene panela; el azúcar morena es otro producto', refs: ['S', 'I', 'I', 'I', 'R', 'R', 'R', 'S', 'E', 'E'] },
  'Chicha de arroz': { categoria: 'Bebidas', sin: ['chicha'], nota: 'La horchata de USDA es otra bebida', refs: ['C', 'C', 'C', 'I', 'R', 'R', 'R', 'C', 'E', 'E'] },
};
