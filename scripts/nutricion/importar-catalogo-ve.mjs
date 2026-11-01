#!/usr/bin/env node
// Catálogo venezolano de 1.000 alimentos (scripts/nutricion/catalogo_ve/catalogo_1000_alimentos_venezuela.md)
// → lotes que la app importa (Base de alimentos) + lista de pendientes.
//
//   node scripts/nutricion/importar-catalogo-ve.mjs [--salida public/datos/nutricion]
//
// El catálogo no trae valores. Para cada registro, la tabla catalogo_ve/equivalencias.mjs dice qué alimento
// genérico de USDA es comparable (y en qué difiere) o por qué queda pendiente. Los valores se copian de los lotes
// de USDA ya publicados en public/datos/nutricion, marcados uno por uno como "imputado" (estimados a partir de
// otro alimento) con el fdcId de origen; nunca se presentan como análisis del alimento venezolano.
// Es idempotente: mismos archivos de entrada → mismos lotes (ids estables derivados de VE-xxxx).
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { armarLotes } from '../../src/lib/nutricion/lotes.js';
import { huella } from '../../src/lib/nutricion/usda.js';
import { POR_ID, NUCLEO } from '../../src/lib/nutricion/catalogo.js';
import { textoBusqueda } from '../../src/lib/nutricion/clasificar.js';
import { FUENTES } from '../../src/lib/nutricion/fuentes.js';
import { uuidDe } from '../../src/lib/util.js';
import { BASES, PREPS, MOTIVOS } from './catalogo_ve/equivalencias.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const SALIDA = opt('salida', 'public/datos/nutricion');
const FUENTE = 'catalogo_ve';
const ARCHIVO = new URL('./catalogo_ve/catalogo_1000_alimentos_venezuela.md', import.meta.url);
const texto = fs.readFileSync(ARCHIVO, 'utf8');
const tabla = fs.readFileSync(new URL('./catalogo_ve/equivalencias.mjs', import.meta.url), 'utf8');
const sha256_catalogo = createHash('sha256').update(texto).digest('hex');
// la importación cambia si cambia el catálogo o la tabla de equivalencias
const sha256 = createHash('sha256').update(texto).update('\n--equivalencias--\n').update(tabla).digest('hex');
const version = (texto.match(/\*\*Versión:\*\*\s*([\d.]+)/) || [])[1] || '1.0';

// 1) registros del catálogo: ### N. Categoría  /  -   **VE-0001** --- Base --- preparación.
// (el markdown parte las líneas largas: se lee por registro, no por línea)
const registros = []; let categoria = null; const sp = (s) => s.replace(/\s+/g, ' ').trim();
for (const m of texto.matchAll(/^###\s+\d+\.\s+(.+?)\s*$|\*\*(VE-\d{4})\*\*\s+---\s+([\s\S]+?)\s+---\s+([\s\S]+?)\.\s*`estado/gm)) {
  if (m[1]) { categoria = m[1]; continue; }
  registros.push({ id: m[2], categoria_ve: categoria, base: sp(m[3]), preparacion_ve: sp(m[4]) });
}
const fallar = (msg) => { console.error(msg); process.exit(1); };
if (registros.length !== 1000) fallar(`Esperaba 1000 registros y leí ${registros.length}`);
if (new Set(registros.map((r) => r.id)).size !== registros.length) fallar('IDs repetidos en el catálogo');

// 2) alimentos de USDA ya publicados (los mismos que importa la app)
const man = JSON.parse(fs.readFileSync(path.join(SALIDA, 'manifest.json'), 'utf8'));
const usda = new Map(); const porNombre = new Map(); const usados = new Map();
for (const c of man.conjuntos.filter((x) => x.fuente.startsWith('usda_'))) {
  const dir = path.join(SALIDA, c.ruta);
  for (const f of fs.readdirSync(dir).sort()) {
    const l = JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir, f))));
    for (const a of l.alimentos) { const x = { ...a, metodos: l.metodos, conjunto: c }; usda.set(String(a.id_externo), x); if (!porNombre.has(a.nombre_original)) porNombre.set(a.nombre_original, x); }
  }
}
const CORTO = { usda_foundation: 'Foundation', usda_sr_legacy: 'SR Legacy', usda_fndds: 'FNDDS' };
const ESTADO_CORTO = { analitico: 'analítico', calculado: 'calculado', imputado: 'estimado', fabricante: 'dato del fabricante', cero_asumido: 'cero asumido', cero_publicado: 'publicado como cero (puede estar bajo el límite de cuantificación)', cero_calculado: 'cero calculado', sin_codigo: 'sin método documentado', sin_valor: 'sin valor', etiqueta: 'etiqueta' };

function referencia(spec) {
  const [ref, dif] = Array.isArray(spec) ? spec : [spec, null];
  const a = typeof ref === 'number' ? usda.get(String(ref)) : porNombre.get(String(ref).slice(2));
  if (!a) return { error: `no encuentro el alimento de USDA ${ref}` };
  return { a, dif };
}

// 3) clasificar cada registro
const salida = []; const pendientes = []; const problemas = []; const porClave = new Map();
for (const r of registros) {
  const b = BASES[r.base]; const preps = PREPS[r.categoria_ve];
  if (!b) { problemas.push(`${r.id}: base sin tabla (${r.base})`); continue; }
  if (!preps) { problemas.push(`${r.id}: categoría desconocida (${r.categoria_ve})`); continue; }
  const k = preps.indexOf(r.preparacion_ve);
  if (k < 0) { problemas.push(`${r.id}: preparación desconocida (${r.preparacion_ve})`); continue; }
  if (b.refs.length !== preps.length) { problemas.push(`${r.base}: ${b.refs.length} entradas para ${preps.length} preparaciones`); continue; }
  porClave.set(`${r.base}|${k}`, r); r.k = k; r.spec = b.refs[k]; r.b = b;
}
if (problemas.length) fallar(problemas.join('\n'));

const nombreDe = (r) => `${r.base}, ${r.preparacion_ve}`;
function prepApp(r, ref) {
  const p = r.preparacion_ve.toLowerCase();
  if (/reconstituid/.test(p)) return 'listo';
  if (r.b.categoria === 'Panes y horneados') return 'horneado';
  if (/^(grano seco|seco)$|harina|hojuela/.test(p)) return 'seco';
  if (/inflado/.test(p)) return 'listo';
  if (/^crud/.test(p) || p === 'pulpa fresca' || p.startsWith('sin piel')) return 'crudo';
  if (/vapor/.test(p)) return 'al_vapor';
  if (/hervid|cocid|en trozos/.test(p)) return 'hervido';
  if (/horne|al horno/.test(p)) return 'horneado';
  if (/plancha|parrilla|asad/.test(p)) return 'asado';
  if (/frit/.test(p)) return 'frito';
  if (/guisad/.test(p)) return 'guisado';
  if (/deshidratad/.test(p)) return 'deshidratado';
  if (/congelad/.test(p)) return 'congelado';
  if (/conserva/.test(p)) return 'enlatado';
  return ref?.preparacion || 'no_indicado';
}
function detalles(r) {
  const p = r.preparacion_ve.toLowerCase(); const d = [];
  if (/sin sal/.test(p)) d.push('sin_sal'); if (/con sal\b/.test(p)) d.push('con_sal');
  if (/escurrid/.test(p)) d.push('escurrido'); if (/al natural/.test(p)) d.push('en_agua'); if (/en aceite/.test(p)) d.push('en_aceite');
  if (/sin piel/.test(p)) d.push('sin_piel'); if (/con aceite/.test(p)) d.push('con_grasa_anadida'); if (/sin aceite/.test(p)) d.push('sin_grasa_anadida');
  if (/reconstituid/.test(p)) d.push('reconstituido');
  return d;
}

// primero los que tienen equivalente o motivo; después los alias ('=k'), que siguen a su registro
const estado = new Map();
for (const r of registros) {
  const s = r.spec;
  if (typeof s === 'string' && s.startsWith('=')) continue;
  if (typeof s === 'string' && !s.startsWith('n:')) {
    const [cod, det] = [s[0], s.slice(2)]; if (!MOTIVOS[cod]) fallar(`${r.id}: código desconocido ${s}`);
    estado.set(r.id, { tipo: 'pendiente', motivo: cod, detalle: det || null }); continue;
  }
  const x = referencia(s); if (x.error) fallar(`${r.id} (${nombreDe(r)}): ${x.error}`);
  estado.set(r.id, { tipo: 'equivalente', ...x });
}
for (const r of registros) {
  const s = r.spec; if (!(typeof s === 'string' && s.startsWith('='))) continue;
  const t = porClave.get(`${r.base}|${Number(s.slice(1))}`); const e = t && estado.get(t.id);
  if (!e || t.id === r.id) fallar(`${r.id}: alias a una entrada inexistente (${s})`);
  estado.set(r.id, { tipo: 'alias', de: t.id, objetivo: e });
}

// 4) fichas
const alias = new Map(); // id del registro importado → nombres que lo repiten
for (const r of registros) { const e = estado.get(r.id); if (e.tipo === 'alias') (alias.get(e.de) || alias.set(e.de, []).get(e.de)).push(r); }
for (const r of registros) {
  const e = estado.get(r.id);
  if (e.tipo === 'pendiente' || (e.tipo === 'alias' && e.objetivo.tipo === 'pendiente')) {
    let m = e.tipo === 'alias' ? { motivo: 'D', detalle: `mismo alimento que ${e.de} (${nombreDe(registros.find((x) => x.id === e.de))}), también pendiente` } : e;
    if (m.motivo === 'R') { const b0 = porClave.get(`${r.base}|0`); const e0 = estado.get(b0.id); m = { ...m, detalle: e0?.tipo === 'equivalente' ? `la composición por 100 g es la de ${b0.id} (${nombreDe(b0)})` : null }; }
    pendientes.push({ id: r.id, nombre: nombreDe(r), base: r.base, preparacion: r.preparacion_ve, categoria: r.b.categoria, categoria_ve: r.categoria_ve, prep: prepApp(r), motivo: m.motivo, detalle: m.detalle || null, nota: r.b.nota || null });
    continue;
  }
  if (e.tipo === 'alias') continue; // va como sinónimo de su registro
  const { a: ref, dif } = e; const conj = ref.conjunto;
  usados.set(ref.id_externo, (usados.get(ref.id_externo) || 0) + 1);
  const metodo = `Equivalente: USDA ${CORTO[ref.fuente]} ${ref.id_externo}`;
  const valores = ref.valores.map((v) => {
    const [nutriente, cantidad, est, mi, idExt, unidad, n] = v; const mOrig = mi != null ? ref.metodos[mi] : null;
    return { nutriente, cantidad, estado: cantidad == null ? est : 'imputado', metodo, id_externo: idExt != null ? String(idExt) : null, unidad_original: unidad || POR_ID.get(nutriente).unidad,
      n: null, min: null, max: null, mediana: null, nota: `En USDA: ${ESTADO_CORTO[est] || est}${n > 1 ? `, ${n} muestras` : ''}${mOrig ? ` (${mOrig})` : ''}` };
  });
  const presentes = NUCLEO.filter((c) => valores.some((v) => POR_ID.get(v.nutriente).codigo === c && v.cantidad != null)).length;
  const otros = (alias.get(r.id) || []).map(nombreDe);
  const diferencia = [r.b.nota, dif].filter(Boolean).join('. ');
  const sinonimos = [...new Set([r.id, ...(r.b.sin || []), ...otros])];
  const nombre = nombreDe(r);
  const alimento = {
    id: uuidDe(`ve:${r.id}`), fuente: FUENTE, id_externo: r.id, version,
    ids: { ve: r.id, usda: ref.id_externo, usda_fuente: ref.fuente, usda_version: conj.version, usda_nombre: ref.nombre_original, ...(diferencia ? { diferencia } : {}), ...(otros.length ? { tambien: (alias.get(r.id) || []).map((x) => x.id) } : {}) },
    nombre, nombre_original: nombre, idioma_original: 'es', nombre_traducido: false, sinonimos, categoria: r.b.categoria, categoria_original: r.categoria_ve,
    marca: null, codigo_barras: null, tipo: 'generico', tipo_registro: 'Equivalente USDA', preparacion: prepApp(r, ref), preparacion_detalle: detalles(r), base: ref.base || '100 g de parte comestible',
    publicado: null, historico: false, calidad: 'equivalente', completitud: presentes, completitud_de: NUCLEO.length, sospechosos: ref.sospechosos || [], energia_ref: ref.energia_ref, ref_url: ref.ref_url,
    busqueda: textoBusqueda(nombre, sinonimos, otros, ref.nombre_original, ref.nombre), valores,
    porciones: (ref.porciones || []).map(([descripcion, original, gramos]) => ({ descripcion, original, gramos })), avisos: [],
  };
  alimento.huella = huella(JSON.stringify([alimento.nombre, alimento.sinonimos, alimento.categoria, alimento.preparacion, alimento.ids, alimento.valores, alimento.porciones]));
  salida.push(alimento);
}

// 5) escribir: lotes, pendientes y manifiesto
const dir = path.join(SALIDA, FUENTE, version);
fs.rmSync(path.join(SALIDA, FUENTE), { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
const lotes = armarLotes(salida, { fuente: FUENTE, version, tamano: 250 });
lotes.forEach((l) => fs.writeFileSync(path.join(dir, `parte-${String(l.parte).padStart(3, '0')}.json.gz`), zlib.gzipSync(JSON.stringify(l), { level: 9, mtime: 0 })));
const cuenta = (m) => pendientes.filter((p) => p.motivo === m).length;
const nAlias = registros.filter((r) => estado.get(r.id).tipo === 'alias' && estado.get(r.id).objetivo.tipo === 'equivalente').length;
fs.writeFileSync(path.join(dir, 'pendientes.json'), JSON.stringify({ formato: 1, fuente: FUENTE, version, motivos: { ...MOTIVOS, D: 'Mismo alimento que otro registro pendiente' }, pendientes }, null, 1));
const est = {
  recibidos: registros.length, validos: salida.length, rechazados: 0, duplicados: nAlias, valores: salida.reduce((t, a) => t + a.valores.length, 0), valores_sin_numero: 0, avisos: 0,
  pendientes: pendientes.length, por_motivo: Object.fromEntries(['S', 'C', 'A', 'I', 'R', 'E', 'D'].map((m) => [m, cuenta(m)])), referencias_usda: usados.size,
};
const conj = {
  fuente: FUENTE, nombre: FUENTES[FUENTE].nombre, version, archivo: 'catalogo_1000_alimentos_venezuela.md', origen: 'scripts/nutricion/catalogo_ve/catalogo_1000_alimentos_venezuela.md', sha256, sha256_catalogo,
  procesado: new Date().toISOString().slice(0, 10), partes: lotes.length, ruta: `${FUENTE}/${version}`, pendientes: `${FUENTE}/${version}/pendientes.json`, estadisticas: est, errores: [], licencia: FUENTES[FUENTE].licencia,
  referencias: man.conjuntos.filter((c) => c.fuente.startsWith('usda_')).map((c) => ({ fuente: c.fuente, version: c.version, sha256: c.sha256 })),
};
man.conjuntos = [...man.conjuntos.filter((c) => c.fuente !== FUENTE), conj].sort((a, b) => a.fuente.localeCompare(b.fuente));
fs.writeFileSync(path.join(SALIDA, 'manifest.json'), JSON.stringify(man, null, 2));
console.log(JSON.stringify({ fuente: FUENTE, version, sha256, partes: lotes.length, ...est }, null, 1));
