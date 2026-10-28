// Fuentes de datos nutricionales: qué son, qué tan fuerte es su evidencia y su licencia.
// "estado" dice si la app ya la usa de verdad: 'integrada' (datos importados), 'en_linea'
// (consulta en vivo, sin descarga masiva) o 'preparada' (estructura lista, falta descargar y verificar).
export const FUENTES = {
  usda_foundation: {
    nombre: 'USDA FoodData Central · Foundation Foods', organizacion: 'U.S. Department of Agriculture, Agricultural Research Service', evidencia: 'analitico', estado: 'integrada',
    url: 'https://fdc.nal.usda.gov/', licencia: 'CC0 1.0 (dominio público)', licencia_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    atribucion: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov.',
    nota: 'Análisis de laboratorio de muestras identificadas, con número de muestras, mínimo, máximo y mediana. Pocos alimentos, los mejor documentados.',
  },
  usda_sr_legacy: {
    nombre: 'USDA FoodData Central · SR Legacy (abril 2018)', organizacion: 'U.S. Department of Agriculture, Agricultural Research Service', evidencia: 'referencia', estado: 'integrada', historico: true,
    url: 'https://fdc.nal.usda.gov/', licencia: 'CC0 1.0 (dominio público)', licencia_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    atribucion: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, 2018. fdc.nal.usda.gov.',
    nota: 'Colección histórica: la última versión es de 2018 y ya no se actualiza. Mezcla datos analíticos, calculados e imputados; cada valor dice cuál es.',
  },
  usda_fndds: {
    nombre: 'USDA FoodData Central · FNDDS 2021-2023', organizacion: 'U.S. Department of Agriculture, Agricultural Research Service', evidencia: 'referencia', estado: 'integrada',
    url: 'https://fdc.nal.usda.gov/', licencia: 'CC0 1.0 (dominio público)', licencia_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    atribucion: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: Food and Nutrient Database for Dietary Studies 2021-2023. fdc.nal.usda.gov.',
    nota: 'Alimentos y bebidas tal como se consumen (encuesta WWEIA/NHANES) con pesos de porciones. Valores calculados por USDA a partir de los ingredientes.',
  },
  usda_branded: {
    nombre: 'USDA FoodData Central · Branded Foods', organizacion: 'USDA / Global Branded Food Products Database', evidencia: 'etiqueta', estado: 'preparada',
    url: 'https://fdc.nal.usda.gov/', licencia: 'CC0 1.0 (dominio público)', licencia_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
    atribucion: 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: Branded Foods. fdc.nal.usda.gov.',
    nota: 'Datos de etiquetas de productos de EE. UU. Pesa varios GB: no se importa completo. Se puede consultar por la API con una clave de api.data.gov guardada en el servidor (FDC_API_KEY).',
  },
  off: {
    nombre: 'Open Food Facts', organizacion: 'Open Food Facts (asociación sin fines de lucro, Francia)', evidencia: 'colaborativo', estado: 'en_linea',
    url: 'https://world.openfoodfacts.org/', licencia: 'ODbL 1.0 (base de datos) · DbCL 1.0 (contenido) · imágenes CC BY-SA', licencia_url: 'https://world.openfoodfacts.org/terms-of-use',
    atribucion: 'Datos de Open Food Facts (openfoodfacts.org), disponibles bajo la Open Database License (ODbL).',
    nota: 'Datos colaborativos de etiquetas, sin verificar. Solo se guardan los productos que alguien elige; si se redistribuye una extracción sustancial, la base derivada debe compartirse bajo ODbL.',
  },
  ciqual: {
    nombre: 'CIQUAL (ANSES, Francia)', organizacion: 'Agence nationale de sécurité sanitaire (ANSES)', evidencia: 'referencia', estado: 'preparada',
    url: 'https://ciqual.anses.fr/', licencia: 'Por verificar antes de importar (licencia abierta Etalab según ANSES)', licencia_url: 'https://ciqual.anses.fr/',
    nota: 'Carbohidratos "disponibles" (sin fibra, convención europea) y energía con factores de la UE: no se mezclan con los de USDA.',
  },
  bedca: {
    nombre: 'BEDCA (España)', organizacion: 'Red BEDCA / AESAN', evidencia: 'referencia', estado: 'preparada',
    url: 'https://www.bedca.net/', licencia: 'Por verificar antes de importar (condiciones de uso propias de BEDCA)', licencia_url: 'https://www.bedca.net/',
    nota: 'Nombres en español. Revisar condiciones de reutilización comercial antes de importar.',
  },
  bls: {
    nombre: 'BLS · Bundeslebensmittelschlüssel (Alemania)', organizacion: 'Max Rubner-Institut', evidencia: 'referencia', estado: 'preparada',
    url: 'https://blsdb.de/download', licencia: 'Por verificar antes de importar', licencia_url: 'https://blsdb.de/download',
    nota: 'Convenciones europeas de carbohidratos y energía.',
  },
  coach: {
    nombre: 'Alimento personalizado', organizacion: 'El coach', evidencia: 'personalizado', estado: 'integrada', licencia: 'Datos propios del coach', nota: 'Escrito a mano. No está verificado por ninguna fuente oficial.',
  },
};
export const nombreFuente = (f) => FUENTES[f]?.nombre || f;
