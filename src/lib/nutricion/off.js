// Open Food Facts → alimento comercial de la app, identificado como dato colaborativo.
// OFF normaliza los nutrientes por 100 g en GRAMOS (también sodio, vitaminas y minerales):
// aquí se pasan a la unidad del catálogo (mg, µg) con un factor exacto de unidades de masa.
import { NUTRIENTES } from './catalogo.js';
import { sospechosos } from './clasificar.js';
import { normalizarBusqueda } from './texto.js';

const FACTOR_DESDE_G = { g: 1, mg: 1000, 'µg': 1e6 };
export const ATRIBUCION_OFF = 'Datos de Open Food Facts (openfoodfacts.org), bajo licencia ODbL. Datos colaborativos de etiquetas, sin verificar.';
export const CAMPOS_OFF = 'code,product_name,product_name_es,generic_name,brands,quantity,serving_size,serving_quantity,nutriments,nutrition_data_per,categories_tags,countries_tags,allergens_tags,ingredients_text_es,ingredients_text,last_modified_t,data_quality_errors_tags,lang';

export function normalizarOFF(p) {
  if (!p || typeof p !== 'object') return { error: 'producto vacío' };
  const codigo = String(p.code || '').replace(/\D/g, '');
  if (!/^\d{6,14}$/.test(codigo)) return { error: 'código de barras no válido' };
  const nombre = String(p.product_name_es || p.product_name || p.generic_name || '').replace(/\s+/g, ' ').trim();
  if (!nombre) return { error: `${codigo}: sin nombre` };
  const n = p.nutriments || {}; const valores = []; const porCodigo = {};
  NUTRIENTES.filter((c) => c.off).forEach((c) => {
    const v = n[`${c.off}_100g`]; if (v == null || v === '' || !Number.isFinite(Number(v))) return;
    let cantidad = Number(v);
    if (c.grupo !== 'energia' && c.off !== 'alcohol') { const f = FACTOR_DESDE_G[c.unidad]; if (!f) return; cantidad *= f; }
    if (c.off === 'alcohol') return; // OFF da el alcohol en % vol: no hay conversión válida a gramos sin la densidad
    valores.push({ codigo: c.codigo, cantidad, id_externo: `${c.off}_100g`, unidad_original: c.grupo === 'energia' ? c.unidad : 'g' });
    porCodigo[c.codigo] = cantidad;
  });
  if (!valores.length) return { error: `${codigo}: sin valores por 100 g` };
  const avisos = [...sospechosos(porCodigo), ...(p.data_quality_errors_tags || []).map((t) => `Open Food Facts marca: ${t.replace(/^en:/, '')}`)];
  const marca = String(p.brands || '').split(',')[0].trim() || null;
  const serv = Number(p.serving_quantity);
  return {
    alimento: {
      fuente: 'off', codigo_barras: codigo, id_externo: codigo, nombre, nombre_original: p.product_name || nombre, idioma_original: p.lang || null, marca,
      categoria: 'Productos comerciales', base: '100 g del producto tal como se vende (etiqueta)', preparacion: 'listo',
      version: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString().slice(0, 10) : null,
      publicado: p.last_modified_t ? new Date(p.last_modified_t * 1000).toISOString().slice(0, 10) : null,
      energia_ref: porCodigo.energia_kcal != null ? 'energia_kcal' : null, ref_url: `https://world.openfoodfacts.org/product/${codigo}`,
      sinonimos: [], sospechosos: avisos, valores,
      porciones: serv > 0 && /\bg\b/i.test(String(p.serving_size || '')) ? [{ descripcion: `1 porción (${p.serving_size})`, original: p.serving_size, gramos: serv }] : [],
      ingredientes: p.ingredients_text_es || p.ingredients_text || null, alergenos: (p.allergens_tags || []).map((t) => t.replace(/^\w+:/, '')),
      busqueda: normalizarBusqueda([nombre, p.product_name, marca, codigo].filter(Boolean).join(' ')),
    },
  };
}
