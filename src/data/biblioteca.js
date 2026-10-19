// Biblioteca de ejercicios y plantillas.
// Regla de oro: nunca se tocan las sesiones (el historial de cada asesorado).
// En los programas solo se agrega bibId y se completa el video si faltaba;
// el nombre que cada asesorado ya tenía se respeta, así sus métricas siguen igual.
import { normEj, uuid, uuidDe, clonarDias } from '../lib/util.js';
import { PLANTILLAS_BASE } from './constants.js';

import { claveEj, corregirNombre } from '../lib/nombres.js';
export { claveEj, corregirNombre };
const sinAcento = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '');
export const clavesDe = (b) => [...new Set([b.nombre, ...(b.alias || [])].map(claveEj).filter(Boolean))];
export function indice(biblioteca) { const m = new Map(); biblioteca.forEach((b) => clavesDe(b).forEach((k) => { if (!m.has(k)) m.set(k, b); })); return m; }
export const buscarEnBib = (biblioteca, nombre) => indice(biblioteca).get(claveEj(nombre)) || null;

const masComun = (arr) => { const c = new Map(); arr.filter((x) => x != null && x !== '').forEach((x) => c.set(x, (c.get(x) || 0) + 1)); let best = null, n = 0; c.forEach((v, k) => { if (v > n) { best = k; n = v; } }); return best; };
const BASE_DEF = { series: 3, repMin: 8, repMax: 12, segundos: 40, descanso: 90, rpe: 8 };
const firma = (e) => `${e.series}|${e.repMin}|${e.repMax}|${e.segundos}|${e.descanso}|${e.rpe}`;

// Un ejercicio de rutina a partir de un item de la biblioteca
export function ejDesdeBib(b) {
  return normEj({ id: uuid(), ejercicio: b.nombre, grupo: b.grupo, tipo: b.tipo, video: b.video, nota: b.tecnica || '', ...BASE_DEF, ...(b.base || {}), bibId: b.id });
}
export const nuevoItem = (x = {}) => ({ id: uuid(), nombre: '', grupo: 'Core', tipo: 'reps', video: '', tecnica: '', alias: [], base: { ...BASE_DEF }, ...x });

// ---------- armar / actualizar la biblioteca con lo que ya existe ----------
// Junta los ejercicios de todos los programas, del historial y de las plantillas
// base. Devuelve qué crear/actualizar en la biblioteca y qué programas cambian.
export function armarBiblioteca({ programas = [], sesiones = [], biblioteca = [] }, salt = '') {
  const grupos = new Map(); // clave → ocurrencias
  const add = (k, o) => { if (!k) return; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(o); };
  programas.forEach((p) => (p.dias || []).forEach((d) => (d.ejercicios || []).forEach((e) => add(claveEj(e.ejercicio), { nombre: e.ejercicio, grupo: e.grupo, tipo: e.tipo, video: e.video, base: normEj(e), peso: 3, asesorado: p.asesoradoId }))));
  sesiones.forEach((s) => (s.series || []).forEach((x) => add(claveEj(x.ejercicio), { nombre: x.ejercicio, grupo: x.grupo, tipo: x.seg ? 'tiempo' : 'reps', peso: 1 })));
  PLANTILLAS_BASE.forEach((pl) => pl.ejercicios.forEach((e) => add(claveEj(e.ejercicio), { nombre: e.ejercicio, grupo: e.grupo, tipo: e.tipo, video: e.video, base: normEj(e), peso: 1 })));

  const items = biblioteca.map((b) => ({ ...b, alias: [...(b.alias || [])] }));
  const idx = indice(items); const cambiados = new Set(); const nuevos = [];
  grupos.forEach((occ, k) => {
    const nombres = new Map(); occ.forEach((o) => { const n = String(o.nombre || '').trim(); if (n) nombres.set(n, (nombres.get(n) || 0) + o.peso); });
    const video = masComun(occ.map((o) => o.video));
    let b = idx.get(k);
    if (!b) {
      // nombre: el mejor escrito (tildes, mayúscula); luego el más usado; luego el más corto
      const cal = (n) => (sinAcento(n) !== n ? 2 : 0) + (/^[A-ZÁÉÍÓÚÑ]/.test(n) ? 1 : 0);
      let nombre = [...nombres.entries()].sort((x, y) => cal(y[0]) - cal(x[0]) || y[1] - x[1] || x[0].length - y[0].length)[0]?.[0];
      if (!nombre) return; nombre = corregirNombre(nombre);
      const conBase = occ.filter((o) => o.base); const f = masComun(conBase.map((o) => firma(o.base))); const bb = conBase.find((o) => firma(o.base) === f)?.base;
      b = { id: uuidDe(`${salt}bib:${k}`), nombre, grupo: masComun(occ.map((o) => o.grupo)) || 'Core', tipo: masComun(occ.map((o) => o.tipo)) || 'reps', video: video || '', tecnica: '', alias: [],
        base: bb ? { series: bb.series, repMin: bb.repMin, repMax: bb.repMax, segundos: bb.segundos, descanso: bb.descanso, rpe: bb.rpe } : { ...BASE_DEF } };
      items.push(b); nuevos.push(b.id); idx.set(k, b);
    } else if (!b.video && video) { b.video = video; cambiados.add(b.id); }
    const ya = new Set([b.nombre, ...b.alias].map((x) => x.toLowerCase()));
    nombres.forEach((_, n) => { if (!ya.has(n.toLowerCase())) { b.alias.push(n); ya.add(n.toLowerCase()); if (!nuevos.includes(b.id)) cambiados.add(b.id); } });
  });
  const guardar = items.filter((b) => nuevos.includes(b.id) || cambiados.has(b.id));
  const r = enlazarProgramas(programas, items);
  return { biblioteca: items, guardar, nuevos: nuevos.length, actualizados: cambiados.size, ...r };
}

// Enlaza cada ejercicio de rutina con su item (bibId) y le pone el video si no tenía
export function enlazarProgramas(programas, biblioteca) {
  const idx = indice(biblioteca); const porId = new Map(biblioteca.map((b) => [b.id, b]));
  let videos = 0, enlaces = 0; const cambiados = [];
  programas.forEach((p) => {
    let tocado = false;
    const dias = (p.dias || []).map((d) => ({ ...d, ejercicios: (d.ejercicios || []).map((e) => {
      const b = (e.bibId && porId.get(e.bibId)) || idx.get(claveEj(e.ejercicio)); if (!b) return e;
      const n = { ...e };
      if (n.bibId !== b.id) { n.bibId = b.id; enlaces++; tocado = true; }
      if (!n.video && b.video) { n.video = b.video; videos++; tocado = true; }
      return n;
    }) }));
    if (tocado) cambiados.push({ ...p, dias });
  });
  return { programas: cambiados, videos, enlaces };
}

// Cambió el video de un item: se pasa a las rutinas que no tenían o tenían el anterior
export function propagarVideo(programas, b, anterior = '') {
  const cambiados = []; let n = 0;
  programas.forEach((p) => { let t = false;
    const dias = (p.dias || []).map((d) => ({ ...d, ejercicios: (d.ejercicios || []).map((e) => {
      if (e.bibId !== b.id || e.video === b.video || (e.video && e.video !== anterior)) return e; t = true; n++; return { ...e, video: b.video }; }) }));
    if (t) cambiados.push({ ...p, dias }); });
  return { programas: cambiados, n };
}

// Fusiona "origen" dentro de "destino": nombres, video y enlaces de rutinas
export function fusionar(destino, origen, programas) {
  const d = { ...destino, alias: [...new Set([...(destino.alias || []), origen.nombre, ...(origen.alias || [])].filter((x) => x && x.toLowerCase() !== destino.nombre.toLowerCase()))], video: destino.video || origen.video || '', tecnica: destino.tecnica || origen.tecnica || '' };
  const cambiados = [];
  programas.forEach((p) => { let t = false;
    const dias = (p.dias || []).map((x) => ({ ...x, ejercicios: (x.ejercicios || []).map((e) => { if (e.bibId !== origen.id) return e; t = true; return { ...e, bibId: d.id, video: e.video || d.video }; }) }));
    if (t) cambiados.push({ ...p, dias }); });
  return { destino: d, programas: cambiados };
}

// Parejas que parecen el mismo ejercicio (mismo grupo y nombre contenido en el otro)
export function posiblesDuplicados(biblioteca, ignorados = []) {
  const ign = new Set(ignorados); const out = [];
  const toks = biblioteca.map((b) => ({ b, t: new Set(claveEj(b.nombre).split(' ').filter(Boolean)) }));
  for (let i = 0; i < toks.length; i++) for (let j = i + 1; j < toks.length; j++) {
    const A = toks[i], B = toks[j]; if (A.b.grupo !== B.b.grupo) continue;
    const [m, M] = A.t.size <= B.t.size ? [A, B] : [B, A]; if (!m.t.size || M.t.size - m.t.size > 2) continue;
    if ([...m.t].every((w) => M.t.has(w)) && !ign.has([A.b.id, B.b.id].sort().join(':'))) out.push([m.b, M.b]);
  }
  return out;
}

// ---------- plantillas precargadas desde los programas actuales ----------
// Una por cada rutina distinta (mismos días y ejercicios = la misma, aunque esté en varios asesorados).
const firmaPrograma = (p) => (p.dias || []).map((d) => (d.ejercicios || []).map((e) => claveEj(e.ejercicio)).join(',')).join('|');
export function plantillasDesdeProgramas(programas, plantillas = [], asesorados = [], salt = '') {
  const ya = new Set([...plantillas, ...plantillasBase()].map((pl) => firmaPrograma(pl))); // tampoco repetir las incluidas
  const nombres = new Set(plantillas.map((pl) => pl.nombre.toLowerCase()));
  const vistos = new Map(); const out = [];
  [...programas].sort((a, b) => String(a.creado || '').localeCompare(String(b.creado || ''))).forEach((p) => {
    const ejs = (p.dias || []).reduce((t, d) => t + (d.ejercicios || []).length, 0); if (!ejs) return;
    const f = firmaPrograma(p); if (ya.has(f) || vistos.has(f)) return;
    const quien = asesorados.find((a) => a.id === p.asesoradoId);
    let nombre = String(p.nombre || '').trim() || `Rutina ${(p.dias || []).length} días`;
    if (/^rutina anterior/i.test(nombre) && quien) nombre = nombre.replace(/^rutina anterior/i, `Rutina de ${quien.nombre.split(' ')[0]}`);
    let n = nombre, i = 2; while (nombres.has(n.toLowerCase())) n = `${nombre} (${i++})`; nombres.add(n.toLowerCase());
    const pl = { id: uuidDe(`${salt}pl:${f}`), nombre: n, nota: quien ? `Basada en la rutina de ${quien.nombre}` : '', orden: plantillas.length + out.length + 1, dias: clonarDias(p.dias) };
    vistos.set(f, pl); out.push(pl);
  });
  return out;
}
export const plantillasBase = () => PLANTILLAS_BASE.map((pl) => { const orden = [...new Set(pl.ejercicios.map((e) => e.dia))];
  return { id: pl.id, base: true, nombre: pl.nombre, nota: pl.nota, dias: orden.map((d) => ({ id: d, nombre: d, ejercicios: pl.ejercicios.filter((e) => e.dia === d).map((e) => normEj({ ...e, id: uuid() })) })) }; });

// ---------- ortografía: nombres de rutinas, días y ejercicios ----------
// Devuelve la lista de cambios (antes → después) y los objetos ya corregidos.
// Las sesiones no se tocan: el historial se sigue enlazando porque la clave
// del ejercicio corregido es la misma que la del mal escrito.
export function correcciones({ programas = [], plantillas = [], biblioteca = [], asesorados = [] }) {
  const cambios = []; const out = { programas: [], plantillas: [], biblioteca: [] };
  const fix = (v, donde, tipo) => { const c = corregirNombre(v); if (c && c !== String(v || '').trim()) { cambios.push({ donde, tipo, antes: v, despues: c }); return c; } return v; };
  const quien = (id) => asesorados.find((a) => a.id === id)?.nombre.split(' ')[0] || '';
  const enDias = (dias, donde) => { let t = false; const d2 = (dias || []).map((d) => {
    const nd = fix(d.nombre, donde, 'día'); if (nd !== d.nombre) t = true;
    const ejs = (d.ejercicios || []).map((e) => { const n = fix(e.ejercicio, donde, 'ejercicio'); if (n === e.ejercicio) return e; t = true; return { ...e, ejercicio: n }; });
    return { ...d, nombre: nd, ejercicios: ejs }; }); return t ? d2 : null; };
  programas.forEach((p) => { const donde = quien(p.asesoradoId) || 'Rutina'; const n = fix(p.nombre, donde, 'rutina'); const d = enDias(p.dias, donde); if (n !== p.nombre || d) out.programas.push({ ...p, nombre: n, dias: d || p.dias }); });
  plantillas.forEach((p) => { const n = fix(p.nombre, 'Plantilla', 'rutina'); const d = enDias(p.dias, 'Plantilla'); if (n !== p.nombre || d) out.plantillas.push({ ...p, nombre: n, dias: d || p.dias }); });
  biblioteca.forEach((b) => { const n = fix(b.nombre, 'Biblioteca', 'ejercicio'); if (n !== b.nombre) out.biblioteca.push({ ...b, nombre: n, alias: [...new Set([...(b.alias || []), b.nombre])] }); });
  return { cambios, ...out };
}
