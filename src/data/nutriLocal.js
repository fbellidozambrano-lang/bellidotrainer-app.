// Base de alimentos en el teléfono (modo local, sin Supabase): IndexedDB.
// Sigue las mismas reglas que las funciones nutri_* de supabase/schema.sql:
// importación idempotente por partes, historial de cambios, referencia de solo lectura,
// alimentos personalizados separados y búsqueda con las mismas puntuaciones.
// En Node (pruebas) no hay IndexedDB: usa memoria.
import { buscarEn } from '../lib/nutricion/buscar.js';
import { POR_ID, POR_CODIGO } from '../lib/nutricion/catalogo.js';
import { normalizarBusqueda } from '../lib/nutricion/texto.js';
import { parecido, MISMO_ALIMENTO } from '../lib/nutricion/clasificar.js';
import { principalesPor100 } from '../lib/nutricion/calculo.js';
import { FUENTES } from '../lib/nutricion/fuentes.js';
import { uuid } from '../lib/util.js';

const PRIORIDAD_CAL = { oficial_analitico: 5, referencia: 4, personalizado: 3, etiqueta: 2, colaborativo: 1 };
const memoria = () => { const m = new Map(); return { get: async (k) => m.get(k), put: async (k, v) => { m.set(k, v); }, del: async (k) => { m.delete(k); }, todos: async () => [...m.values()], claves: async () => [...m.keys()] }; };
function idb(nombre) {
  if (typeof indexedDB === 'undefined') return memoria();
  const abrir = new Promise((ok, mal) => { const r = indexedDB.open('bt-nutricion', 1); r.onupgradeneeded = () => { ['alimentos', 'meta'].forEach((s) => r.result.objectStoreNames.contains(s) || r.result.createObjectStore(s)); }; r.onsuccess = () => ok(r.result); r.onerror = () => mal(r.error); });
  const tx = async (modo, fn) => { const db = await abrir; return new Promise((ok, mal) => { const t = db.transaction(nombre, modo); const st = t.objectStore(nombre); const r = fn(st); t.oncomplete = () => ok(r?.result); t.onerror = () => mal(t.error); }); };
  return { get: (k) => tx('readonly', (s) => s.get(k)), put: (k, v) => tx('readwrite', (s) => { s.put(v, k); }), del: (k) => tx('readwrite', (s) => { s.delete(k); }), todos: () => tx('readonly', (s) => s.getAll()), claves: () => tx('readonly', (s) => s.getAllKeys()) };
}

// registro del lote → registro guardado (valores como objetos)
function desdeLote(a, metodos, importacionId) {
  const valores = (a.valores || []).map((v) => ({ nutriente: v[0], cantidad: v[1] ?? null, estado: v[2], metodo: v[3] != null ? metodos[v[3]] : null, id_externo: v[4] != null ? String(v[4]) : null,
    unidad_original: v[5] ?? null, n: v[6] ?? null, minimo: v[7] ?? null, maximo: v[8] ?? null, mediana: v[9] ?? null, nota: v[10] ?? null }));
  const { avisos, ...resto } = a;
  return { ...resto, valores, porciones: (a.porciones || []).map((p) => (Array.isArray(p) ? { descripcion: p[0], original: p[1], gramos: p[2] } : p)), coach_id: null, revision: 'importado', importacion_id: importacionId, actualizado: new Date().toISOString() };
}
export const compacta = (a) => ({
  id: a.id, nombre: a.nombre, nombre_original: a.nombre_original, fuente: a.fuente, calidad: a.calidad, tipo: a.tipo, preparacion: a.preparacion, base: a.base, energia_ref: a.energia_ref,
  historico: !!a.historico, publicado: a.publicado || null, version: a.version || null, marca: a.marca || null,
  valores: Object.fromEntries((a.valores || []).map((v) => [POR_ID.get(v.nutriente)?.codigo, { c: v.cantidad, e: v.estado }]).filter(([k]) => k)),
  porciones: (a.porciones || []).map((p) => ({ d: p.descripcion, g: p.gramos })),
});
const indice = (a) => ({ id: a.id, id_externo: a.id_externo, nombre: a.nombre, nombre_original: a.nombre_original, sinonimos: a.sinonimos || [], busqueda: a.busqueda, fuente: a.fuente, calidad: a.calidad, tipo: a.tipo,
  preparacion: a.preparacion, categoria: a.categoria, marca: a.marca, codigo_barras: a.codigo_barras, historico: !!a.historico, publicado: a.publicado, version: a.version, base: a.base,
  sospechosos: a.sospechosos || [], propio: !!a.coach_id, por100: principalesPor100(compacta(a)).valores });

export function crearNutriLocal() {
  const alim = idb('alimentos'); const meta = idb('meta');
  let cache = null; // índice liviano en memoria para buscar
  const cargarIndice = async () => { if (!cache) cache = (await alim.todos()).map(indice); return cache; };
  const tocarIndice = (a) => { if (!cache) return; const i = cache.findIndex((x) => x.id === a.id); const x = indice(a); if (i >= 0) cache[i] = x; else cache.push(x); };
  const importaciones = async () => (await meta.get('importaciones')) || [];
  const guardarImp = async (lista) => meta.put('importaciones', lista);
  const historial = async (id, motivo, antes, despues) => { const h = (await meta.get(`h:${id}`)) || []; h.push({ fecha: new Date().toISOString(), motivo, antes, despues }); await meta.put(`h:${id}`, h); };

  return {
    async estado() {
      const idx = await cargarIndice(); const imps = await importaciones();
      return { es_admin: true, hay_admin: true, propios: idx.filter((a) => a.propio).length, importaciones: [...imps].reverse().slice(0, 12),
        fuentes: Object.entries(FUENTES).map(([id, f]) => ({ id, nombre: f.nombre, estado: f.estado, evidencia: f.evidencia, licencia: f.licencia, historico: !!f.historico,
          alimentos: idx.filter((a) => a.fuente === id && !a.propio).length, version: idx.filter((a) => a.fuente === id && !a.propio).map((a) => a.version).sort().pop() || null })) };
    },
    async buscar(q, filtros = {}) { return buscarEn(await cargarIndice(), q, filtros).map(({ sinonimos, busqueda, ...x }) => ({ ...x, sospechosos: (x.sospechosos || []).length })); },
    async fichas(ids) { const out = {}; for (const id of ids) { const a = await alim.get(id); if (a) out[id] = compacta(a); } return out; },
    async ficha(id) {
      const a = await alim.get(id); if (!a) return null; const imp = (await importaciones()).find((i) => i.id === a.importacion_id);
      return { ...a, busqueda: undefined, propio: !!a.coach_id, fuente_id: a.fuente, fuente: { id: a.fuente, ...FUENTES[a.fuente] }, importacion: imp ? { version: imp.version, archivo: imp.archivo, sha256: imp.sha256, terminado: imp.terminado } : null,
        cambios: ((await meta.get(`h:${id}`)) || []).length,
        valores: a.valores.map((v) => { const n = POR_ID.get(v.nutriente); return { ...v, codigo: n.codigo, nombre: n.nombre, unidad: n.unidad, grupo: n.grupo, definicion: n.definicion }; }).sort((x, y) => POR_CODIGO.get(x.codigo).orden - POR_CODIGO.get(y.codigo).orden),
        alternativas: (await cargarIndice()).filter((x) => x.id !== a.id && x.categoria === a.categoria && x.preparacion !== a.preparacion && normalizarBusqueda(String(x.nombre_original).split(',')[0]) === normalizarBusqueda(String(a.nombre_original).split(',')[0]))
          .map((x) => ({ x, p: parecido(a.nombre_original, x.nombre_original) })).filter((y) => y.p >= MISMO_ALIMENTO)
          .sort((y, z) => z.p - y.p || (PRIORIDAD_CAL[z.x.calidad] || 0) - (PRIORIDAD_CAL[y.x.calidad] || 0)).slice(0, 8)
          .map(({ x }) => ({ id: x.id, nombre: x.nombre, preparacion: x.preparacion, fuente: x.fuente })) };
    },
    async importacionIniciar(p) {
      const imps = await importaciones(); let i = imps.find((x) => x.id === p.id);
      if (!i) { i = { id: p.id, fuente_id: p.fuente, version: p.version, archivo: p.archivo, sha256: p.sha256, origen: p.origen, partes: p.partes, recibidos: p.recibidos || 0, iniciado: new Date().toISOString(), estado: 'en_curso', insertados: 0, actualizados: 0, omitidos: 0, rechazados: 0, errores: [], partes_det: {} }; imps.push(i); await guardarImp(imps); }
      return { ...i, partes_hechas: Object.keys(i.partes_det).map(Number).sort((a, b) => a - b) };
    },
    async importarLote(impId, parte, lote, forzar = false) {
      const imps = await importaciones(); const imp = imps.find((x) => x.id === impId); if (!imp) throw new Error('importacion no encontrada');
      if (lote.fuente !== imp.fuente_id || lote.version !== imp.version) throw new Error('el lote no corresponde a la importacion');
      if (!forzar && imp.partes_det[parte]) return { ...imp.partes_det[parte], repetida: true };
      let ins = 0, upd = 0, omi = 0, rec = 0; const errores = [];
      for (const a of lote.alimentos || []) {
        try {
          if (!a.nombre || !a.nombre_original) throw new Error('sin nombre'); if (a.fuente !== imp.fuente_id) throw new Error('fuente distinta a la de la importacion');
          if (!Array.isArray(a.valores) || !a.valores.length) throw new Error('sin valores');
          if (a.valores.some((v) => !POR_ID.has(v[0]) || (v[1] != null && !(Number(v[1]) >= 0) && ![11, 12].includes(v[0])))) throw new Error('valor no valido');
          const ex = await alim.get(a.id);
          if (ex && ex.coach_id) throw new Error('el id es de un alimento personalizado');
          if (ex && ex.huella === a.huella && ex.version === a.version) { omi++; continue; }
          const nuevo = desdeLote(a, lote.metodos || [], imp.id);
          if (ex) { await historial(a.id, `actualización ${ex.version || '?'} → ${a.version}`, ex, { version: a.version, huella: a.huella }); upd++; } else ins++;
          await alim.put(a.id, nuevo); tocarIndice(nuevo);
        } catch (e) { rec++; if (errores.length < 50) errores.push(`${a.id_externo || a.id || '?'}: ${e.message}`); }
      }
      imp.partes_det[parte] = { parte, recibidos: (lote.alimentos || []).length, insertados: ins, actualizados: upd, omitidos: omi, rechazados: rec, errores };
      const s = Object.values(imp.partes_det); ['insertados', 'actualizados', 'omitidos', 'rechazados'].forEach((k) => { imp[k] = s.reduce((t, x) => t + x[k], 0); });
      imp.errores = s.flatMap((x) => x.errores).slice(0, 100); await guardarImp(imps);
      return { parte, recibidos: (lote.alimentos || []).length, insertados: ins, actualizados: upd, omitidos: omi, rechazados: rec, errores };
    },
    async importacionCerrar(impId, estado) {
      const imps = await importaciones(); const imp = imps.find((x) => x.id === impId); if (!imp) return null;
      imp.terminado = new Date().toISOString(); imp.estado = estado || (imp.rechazados ? 'con_errores' : 'completa'); await guardarImp(imps); return imp;
    },
    async guardarAlimento(p, { asesorado = false } = {}) {
      if (!String(p.nombre || '').trim()) throw new Error('falta el nombre');
      if (!Array.isArray(p.valores) || !p.valores.length) throw new Error('faltan los valores nutricionales');
      const fte = ['off', 'usda_branded'].includes(p.fuente) ? p.fuente : 'coach'; const externo = fte !== 'coach';
      if (asesorado && !externo) throw new Error('el asesorado solo puede agregar productos comerciales (Open Food Facts o USDA)');
      if (p.valores.some((v) => v.cantidad != null && !(Number(v.cantidad) >= 0 && Number(v.cantidad) <= 100000))) throw new Error('hay valores fuera de rango');
      const ext = fte === 'off' ? p.codigo_barras : fte === 'usda_branded' ? p.id_externo : null;
      if (fte === 'off' && !/^\d{6,14}$/.test(String(ext || ''))) throw new Error('codigo de barras no valido');
      if (fte === 'usda_branded' && !/^\d{1,12}$/.test(String(ext || ''))) throw new Error('fdcId no valido');
      let ex = null;
      if (externo) { const i = (await cargarIndice()).find((x) => x.fuente === fte && x.id_externo === ext && x.propio); if (i) ex = await alim.get(i.id); }
      else if (p.id) { ex = await alim.get(p.id); if (ex && !ex.coach_id) throw new Error('no se puede modificar un registro de referencia: crea uno personalizado'); }
      const id = ex?.id || (!externo && p.id) || uuid();
      const estado = fte === 'off' ? 'colaborativo' : fte === 'usda_branded' ? 'etiqueta' : 'personalizado';
      const a = { id, fuente: fte, id_externo: ext, version: p.version || null, coach_id: 'local', nombre: p.nombre, nombre_original: p.nombre_original || p.nombre,
        idioma_original: p.idioma_original || null, nombre_traducido: !!p.nombre_traducido, sinonimos: p.sinonimos || [], categoria: p.categoria || null, marca: p.marca || null, codigo_barras: p.codigo_barras || null,
        tipo: externo ? 'comercial' : 'personalizado', tipo_registro: fte === 'off' ? 'Open Food Facts' : fte === 'usda_branded' ? 'Branded' : 'Personalizado', preparacion: p.preparacion || 'no_indicado', base: p.base || '100 g',
        publicado: p.publicado || null, calidad: fte === 'off' ? 'colaborativo' : fte === 'usda_branded' ? 'etiqueta' : 'personalizado', sospechosos: p.sospechosos || [], energia_ref: p.energia_ref || null, ref_url: p.ref_url || null,
        autor: asesorado ? 'asesorado' : p.autor || 'coach', busqueda: normalizarBusqueda([p.nombre, p.nombre_original, p.marca, p.codigo_barras, ...(p.sinonimos || [])].filter(Boolean).join(' ')),
        valores: p.valores.filter((v) => POR_CODIGO.has(v.codigo)).map((v) => ({ nutriente: POR_CODIGO.get(v.codigo).id, cantidad: v.cantidad == null ? null : Number(v.cantidad), estado, metodo: v.metodo || null, id_externo: v.id_externo || null, unidad_original: v.unidad_original || null })),
        porciones: (p.porciones || []).filter((x) => x.gramos > 0), creado: ex?.creado || new Date().toISOString(), actualizado: new Date().toISOString() };
      await historial(id, `${ex ? 'editado' : 'creado'}${asesorado ? ' por el asesorado' : ''}`, ex, p);
      await alim.put(id, a); tocarIndice(a); return compacta(a);
    },
    async _todos() { return alim.todos(); },
  };
}
