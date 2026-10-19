// Importa respaldos de las versiones anteriores (v1–v8), sesiones sueltas (.json),
// exportaciones de esta versión y el historial de Hevy (.csv).
import { analizarHevy } from './hevy.js';
import { normEj, nSeg, uuidDe, uuid, fechaLocal } from '../lib/util.js';

const GRUPOS_VIEJOS = { Espalda: 'Espalda alta', Hombros: 'Hombro lateral', 'Femoral/Glúteo': 'Isquiotibiales' };
const grupo = (g) => GRUPOS_VIEJOS[g] || g || 'Core';
const limpiaDia = (d) => String(d ?? '').replace(/\s+/g, ' ').trim();
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const fechaOk = (f) => { const s = String(f || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };

function serieLimpia(x, i) {
  const o = { ejercicio: String(x.ejercicio || '').trim(), grupo: grupo(x.grupo), serie: x.serie || i + 1, peso: nSeg(x.peso), reps: Math.round(nSeg(x.reps)), rpe: nSeg(x.rpe) || 8 };
  const seg = Math.round(nSeg(x.seg)); if (seg > 0) o.seg = seg;
  return o;
}
const seriesValidas = (arr) => (arr || []).map(serieLimpia).filter((x) => x.ejercicio && (x.reps > 0 || x.seg > 0));

// busca en lo que ya existe un asesorado equivalente (mismo id viejo o mismo nombre)
function emparejar(existentes, viejo) {
  return existentes.find((a) => a.id === viejo.id) ||
    existentes.find((a) => a.datos?.legacyId && a.datos.legacyId === viejo.id) ||
    existentes.find((a) => norm(a.nombre) === norm(viejo.nombre)) || null;
}
const firmaSesion = (s) => `${s.asesoradoId}|${s.fecha}|${norm(s.dia)}|${(s.series || []).length}`;

export function desdeRespaldoViejo(raw, actual, salt = '') {
  const asesorados = [], programas = [], sesiones = [];
  const mapa = new Map(); let emparejados = 0;
  const firmas = new Set(actual.sesiones.map(firmaSesion));
  (raw.asesorados || []).forEach((v, i) => {
    if (!v || !v.nombre) return;
    const ex = emparejar(actual.asesorados, v);
    let id;
    if (ex) { id = ex.id; emparejados++; }
    else {
      id = uuidDe(`${salt}a:${v.id || v.nombre + i}`);
      const { id: _i, nombre, objetivo, nivel, notas, codigo, ...resto } = v;
      asesorados.push({ id, nombre: String(nombre).trim(), objetivo: objetivo || '', nivel: nivel || '', notas: notas || '',
        datos: { ...resto, legacyId: v.id || null }, archivado: false });
    }
    mapa.set(v.id, id);
  });
  const rutinas = raw.rutinas && typeof raw.rutinas === 'object' ? raw.rutinas : {};
  Object.keys(rutinas).forEach((viejoId) => {
    const aid = mapa.get(viejoId); const lista = Array.isArray(rutinas[viejoId]) ? rutinas[viejoId] : [];
    if (!aid || !lista.length) return;
    const orden = []; const porDia = new Map();
    lista.forEach((e) => { const d = limpiaDia(e.dia) || 'Día 1'; if (!porDia.has(d)) { porDia.set(d, []); orden.push(d); } porDia.get(d).push(e); });
    const pid = uuidDe(`${salt}p:${aid}:anterior`);
    if ((actual.programas || []).some((x) => x.id === pid)) return; // ya importada: no pisar lo que el coach editó
    programas.push({ id: pid, asesoradoId: aid, nombre: `Rutina anterior · ${orden.length} ${orden.length === 1 ? 'día' : 'días'}`, nota: 'Importada de la app anterior', orden: 99, visible: true,
      dias: orden.map((d, k) => ({ id: uuidDe(`${pid}:d${k}`), nombre: d, ejercicios: porDia.get(d).map((e, j) => normEj({ ...e, grupo: grupo(e.grupo), id: uuidDe(`${pid}:d${k}:e${j}`) })) })) });
  });
  (raw.sesiones || []).forEach((s, i) => {
    const aid = mapa.get(s.asesoradoId) || (raw.asesorados?.length === 1 ? mapa.get(raw.asesorados[0].id) : null);
    const fecha = fechaOk(s.fecha); const series = seriesValidas(s.series);
    if (!aid || !fecha || !series.length) return;
    const ns = { id: uuidDe(`${salt}s:${s.id || `${s.asesoradoId}|${fecha}|${s.dia}|${i}`}`), asesoradoId: aid, programaId: null, programaNombre: '', dia: limpiaDia(s.dia) || 'Entrenamiento', fecha,
      minutos: s.minutos || null, series, notas: s.notas && typeof s.notas === 'object' ? s.notas : {}, origen: 'importado' };
    if (firmas.has(firmaSesion(ns))) return; firmas.add(firmaSesion(ns));
    sesiones.push(ns);
  });
  return { asesorados, programas, sesiones, emparejados };
}

export function desdeSesionSuelta(raw, actual, salt = '') {
  const ases = actual.asesorados.find((a) => a.id === raw.asesoradoId) || actual.asesorados.find((a) => a.datos?.legacyId === raw.asesoradoId) ||
    actual.asesorados.find((a) => norm(a.nombre) === norm(raw.nombre));
  if (!ases) throw new Error(`No encuentro a "${raw.nombre || 'ese asesorado'}" en tu equipo. Créalo primero o importa tu respaldo.`);
  const series = seriesValidas(raw.series); const fecha = fechaOk(raw.fecha) || fechaLocal();
  if (!series.length) throw new Error('El archivo no trae series con peso y repeticiones.');
  const s = { id: uuidDe(`${salt}sf:${ases.id}|${fecha}|${raw.dia}|${JSON.stringify(series)}`), asesoradoId: ases.id, programaId: null, programaNombre: '', dia: limpiaDia(raw.dia) || 'Entrenamiento', fecha,
    minutos: raw.minutos || null, series, notas: raw.notas && typeof raw.notas === 'object' ? raw.notas : {}, origen: 'asesorado' };
  const dup = actual.sesiones.some((x) => firmaSesion(x) === firmaSesion(s));
  return { asesorados: [], programas: [], sesiones: dup ? [] : [s], emparejados: 1, nombre: ases.nombre };
}

export function desdeHevy(texto, asesoradoId, conPrograma, salt = '') {
  const r = analizarHevy(texto);
  const sesiones = r.sesiones.map((s) => ({ id: uuidDe(`${salt}h:${asesoradoId}|${s.fecha}|${s.dia}`), asesoradoId, programaId: null, programaNombre: '', dia: s.dia, fecha: s.fecha, minutos: null,
    series: seriesValidas(s.series), notas: {}, origen: 'importado' }));
  const programas = [];
  if (conPrograma && r.rutina.length) {
    const orden = [...new Set(r.rutina.map((e) => e.dia))];
    programas.push({ id: uuid(), asesoradoId, nombre: `De Hevy · ${orden.length} días`, nota: 'Armado a partir del historial de Hevy', orden: 50, visible: true,
      dias: orden.map((d) => ({ id: uuid(), nombre: d, ejercicios: r.rutina.filter((e) => e.dia === d).map((e) => normEj({ ...e, id: uuid() })) })) });
  }
  return { asesorados: [], programas, sesiones, resumen: r.resumen };
}

export function desdeExportV9(raw, actual) {
  const ids = new Set(actual.sesiones.map((s) => s.id));
  return { asesorados: raw.asesorados || [], programas: raw.programas || [], sesiones: (raw.sesiones || []).filter((s) => !ids.has(s.id)), biblioteca: raw.biblioteca || [], plantillas: raw.plantillas || [], controles: raw.controles || [], emparejados: 0 };
}

// Lee cualquier archivo y dice qué es
export function interpretar(texto, nombreArchivo = '') {
  const t = String(texto || '').trim();
  if (/\.csv$/i.test(nombreArchivo) || (/exercise_title/.test(t.slice(0, 2000)) && !t.startsWith('{'))) return { tipo: 'hevy', texto: t };
  let raw; try { raw = JSON.parse(t); } catch { throw new Error('No reconozco el archivo. Usa un respaldo .json de la app o un .csv de Hevy.'); }
  if (raw && raw.formato === 'bellidotrainer-v9') return { tipo: 'v9', raw };
  if (raw && raw.tipo === 'sesion-bellidotrainer') return { tipo: 'sesion', raw };
  if (raw && Array.isArray(raw.asesorados)) return { tipo: 'viejo', raw };
  throw new Error('El archivo no tiene el formato de un respaldo de BELLIDO TRAINER.');
}

export function exportar({ asesorados, programas, sesiones, biblioteca = [], plantillas = [], controles = [] }) {
  return JSON.stringify({ formato: 'bellidotrainer-v9', exportado: new Date().toISOString(), asesorados, programas, sesiones, biblioteca, plantillas, controles });
}
