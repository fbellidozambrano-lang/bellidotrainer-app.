// Función de servidor (Vercel): consulta fuentes externas sin exponer claves en el teléfono.
//   /api/alimentos?fuente=off&codigo=7591002002893   producto por código de barras (Open Food Facts)
//   /api/alimentos?fuente=off&q=harina pan             búsqueda de productos (Open Food Facts)
//   /api/alimentos?fuente=usda&q=granola               búsqueda en USDA Branded Foods (necesita FDC_API_KEY)
//   /api/alimentos?fuente=usda&id=1106281              ficha completa de USDA por fdcId (necesita FDC_API_KEY)
// La clave de USDA (api.data.gov) va en Vercel → Settings → Environment Variables → FDC_API_KEY.
import { normalizarOFF, CAMPOS_OFF, ATRIBUCION_OFF } from '../src/lib/nutricion/off.js';
import { normalizarUSDA, paraGuardar } from '../src/lib/nutricion/usda.js';

const UA = 'BellidoTrainer/9.12 (+https://github.com/fbellidozambrano-lang/bellidotrainer-app.)';
const LIMITE = 12000;
async function traer(url, opciones = {}, f = fetch) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), LIMITE);
  try { return await f(url, { ...opciones, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opciones.headers || {}) }, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}
const enviar = (res, status, cuerpo, cache) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); if (cache) res.setHeader('Cache-Control', cache); res.end(JSON.stringify(cuerpo)); };

export async function consultar(params, { f = fetch, clave = process.env.FDC_API_KEY } = {}) {
  const fuente = params.fuente || 'off'; const q = String(params.q || '').trim().slice(0, 80);
  const codigo = String(params.codigo || '').replace(/\D/g, ''); const id = String(params.id || '').replace(/\D/g, '');
  if (fuente === 'off') {
    if (codigo) {
      if (!/^\d{6,14}$/.test(codigo)) return [400, { error: 'Código de barras no válido' }];
      const r = await traer(`https://world.openfoodfacts.org/api/v2/product/${codigo}.json?fields=${CAMPOS_OFF}`, {}, f);
      if (r.status === 404) return [404, { error: 'Ese código no está en Open Food Facts', productos: [] }];
      if (!r.ok) return [502, { error: `Open Food Facts respondió ${r.status}` }];
      const d = await r.json(); if (d.status === 0 || !d.product) return [404, { error: 'Ese código no está en Open Food Facts', productos: [] }];
      const n = normalizarOFF(d.product); if (n.error) return [422, { error: n.error, productos: [] }];
      return [200, { fuente: 'off', atribucion: ATRIBUCION_OFF, productos: [n.alimento] }, 'public, s-maxage=86400'];
    }
    if (q.length < 2) return [400, { error: 'Escribe al menos 2 letras' }];
    const r = await traer(`https://search.openfoodfacts.org/search?q=${encodeURIComponent(q)}&page_size=24&fields=${CAMPOS_OFF}`, {}, f);
    if (!r.ok) return [502, { error: `Open Food Facts respondió ${r.status}` }];
    const d = await r.json(); const productos = []; const descartados = [];
    (d.hits || []).forEach((p) => { const n = normalizarOFF(p); if (n.error) descartados.push(n.error); else productos.push(n.alimento); });
    return [200, { fuente: 'off', atribucion: ATRIBUCION_OFF, total: d.count ?? null, productos, descartados: descartados.length }, 'public, s-maxage=3600'];
  }
  if (fuente === 'usda') {
    if (!clave) return [501, { error: 'Falta configurar FDC_API_KEY (clave gratuita de api.data.gov) en Vercel para buscar productos de marca de USDA.' }];
    if (id) {
      const r = await traer(`https://api.nal.usda.gov/fdc/v1/food/${id}?api_key=${encodeURIComponent(clave)}`, {}, f);
      if (r.status === 404) return [404, { error: 'Ese fdcId no existe en USDA', productos: [] }];
      if (!r.ok) return [502, { error: `USDA respondió ${r.status}` }];
      const n = normalizarUSDA(await r.json(), {}); if (n.error) return [422, { error: n.error, productos: [] }];
      return [200, { fuente: 'usda', productos: [paraGuardar(n.alimento)] }, 'public, s-maxage=86400'];
    }
    if (q.length < 2) return [400, { error: 'Escribe al menos 2 letras' }];
    const r = await traer(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(clave)}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query: q, dataType: ['Branded'], pageSize: 25 }) }, f);
    if (!r.ok) return [502, { error: `USDA respondió ${r.status}` }];
    const d = await r.json();
    const val = (x, ids) => { const n = (x.foodNutrients || []).find((v) => ids.includes(v.nutrientId)); return n ? n.value : null; };
    const resultados = (d.foods || []).map((x) => ({ fdcId: x.fdcId, nombre_original: x.description, marca: [x.brandName, x.brandOwner].filter(Boolean)[0] || null, codigo_barras: x.gtinUpc || null,
      por100: { kcal: val(x, [1008]), proteina: val(x, [1003]), carbohidratos: val(x, [1005]), grasa: val(x, [1004]) } }));
    return [200, { fuente: 'usda', total: d.totalHits ?? null, resultados }, 'public, s-maxage=3600'];
  }
  return [400, { error: 'Fuente no válida' }];
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x'); const [st, cuerpo, cache] = await consultar(Object.fromEntries(url.searchParams));
    enviar(res, st, cuerpo, cache);
  } catch (e) {
    enviar(res, e?.name === 'AbortError' ? 504 : 502, { error: e?.name === 'AbortError' ? 'La fuente externa no respondió a tiempo' : `No se pudo consultar la fuente externa: ${e?.message || e}` });
  }
}
