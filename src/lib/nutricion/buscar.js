// Búsqueda de alimentos en el teléfono (modo local). Sigue las mismas reglas que nutri_buscar en
// supabase/schema.sql: todas las palabras deben aparecer; puntúan el nombre exacto, los sinónimos,
// el estado de preparación pedido y la calidad documentada de la fuente.
import { normalizarBusqueda } from './texto.js';

const VACIAS = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'y', 'en', 'a', 'al', 'un', 'una', 'con', 'para', 'por']);
export function palabras(q) {
  return normalizarBusqueda(q).split(' ').filter((w) => w && !VACIAS.has(w))
    .map((w) => (w.length > 5 && /[^aeiou]es$/.test(w) ? w.slice(0, -2) : w.length > 3 && /s$/.test(w) ? w.slice(0, -1) : w));
}
// "cruda" encuentra "crudo" y "cocida" encuentra "cocido": las fichas están escritas en masculino
export const otroGenero = (w) => (w.length >= 4 && /a$/.test(w) ? `${w.slice(0, -1)}o` : w.length >= 4 && /o$/.test(w) ? `${w.slice(0, -1)}a` : w);
export const contiene = (texto, w) => texto.includes(w) || texto.includes(otroGenero(w));
const PRIORIDAD = { oficial_analitico: 6, personalizado: 5, referencia: 4, etiqueta: 2, colaborativo: 0 };
export function puntuar(a, qRaw) {
  const q = normalizarBusqueda(qRaw); const cod = String(qRaw || '').replace(/\D/g, '');
  const n = normalizarBusqueda(a.nombre); const o = normalizarBusqueda(a.nombre_original); const sin = (a.sinonimos || []).map(normalizarBusqueda);
  let p = 0;
  if (cod.length >= 8 && a.codigo_barras === cod) p += 100;
  p += n === q ? 30 : n.startsWith(q) ? 18 : 0;
  p += sin.includes(q) ? 28 : sin.some((s) => s.startsWith(q)) ? 12 : 0;
  if (o.startsWith(q)) p += 3; // el nombre en inglés pesa poco: casi siempre se busca en español
  p += PRIORIDAD[a.calidad] ?? 0;
  const t = ` ${q} `; const prep = a.preparacion;
  if (/ (crud[oa]s?|raw) /.test(t) && prep === 'crudo') p += 10;
  else if (/ (cocid[oa]s?|hervid[oa]s?|cooked|boiled) /.test(t) && ['cocido', 'hervido', 'al_vapor', 'guisado'].includes(prep)) p += 10;
  else if (/ (asad[oa]s?|parrilla|plancha|hornead[oa]s?) /.test(t) && ['asado', 'horneado'].includes(prep)) p += 10;
  else if (/ (frit[oa]s?|fried) /.test(t) && prep === 'frito') p += 10;
  else if (/ (sec[oa]s?) /.test(t) && ['seco', 'deshidratado'].includes(prep)) p += 10;
  else if (['crudo', 'seco', 'no_indicado'].includes(prep)) p += 2;
  if (a.historico) p -= 1;
  if (a.categoria === 'Comidas preparadas' && palabras(qRaw).length <= 2) p -= 4; // platos mixtos después de los alimentos sueltos
  if ((a.sospechosos || []).length) p -= 3;
  return p;
}
export function buscarEn(lista, q, filtros = {}, limite = 40) {
  const toks = palabras(q); const cod = String(q || '').replace(/\D/g, '');
  if (!toks.length && cod.length < 8) return [];
  return lista
    .filter((a) => ((cod.length >= 8 && a.codigo_barras === cod) || (toks.length && toks.every((t) => contiene(a.busqueda || '', t))))
      && (!filtros.categoria || a.categoria === filtros.categoria) && (!filtros.fuente || a.fuente === filtros.fuente)
      && (!filtros.tipo || a.tipo === filtros.tipo) && (!filtros.preparacion || a.preparacion === filtros.preparacion))
    .map((a) => ({ a, p: puntuar(a, q) }))
    .sort((x, y) => y.p - x.p || x.a.nombre.length - y.a.nombre.length || x.a.nombre.localeCompare(y.a.nombre))
    .slice(0, limite).map((x) => x.a);
}
