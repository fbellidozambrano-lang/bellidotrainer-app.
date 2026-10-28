import { claveEj, mismoEj } from './nombres.js';
import { COLOR_GRUPO } from '../data/constants.js';

// ---------- números y fechas ----------
export const nSeg = (v) => { const t = parseFloat(String(v ?? '').replace(',', '.').replace(/[^0-9.\-]/g, '')); return Number.isFinite(t) ? t : 0; };
export const r05 = (v) => Math.round(v * 2) / 2;
export const e1rm = (p, r) => (p > 0 && r > 0 ? p * (1 + r / 30) : 0);
export const fmt = (v, d = 0) => (v == null || isNaN(v) ? '—' : Number(v).toLocaleString('es-VE', { maximumFractionDigits: d }));
export const fechaLocal = (d = new Date()) => { const t = d instanceof Date ? d : new Date(d); return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`; };
export const hoy = () => fechaLocal(new Date());
export const aFecha = (f) => new Date(String(f).slice(0, 10) + 'T12:00:00');
export const diasEntre = (a, b) => Math.round((aFecha(b) - aFecha(a)) / 864e5);
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
export const fCorta = (f) => { if (!f) return '—'; const d = aFecha(f); return `${d.getDate()} ${MES[d.getMonth()]}`; };
export const fLarga = (f) => { if (!f) return '—'; const d = aFecha(f); return `${d.getDate()} ${MES[d.getMonth()]} ${d.getFullYear()}`; };
export function haceCuanto(f) {
  if (!f) return 'sin registro';
  const n = diasEntre(f, hoy());
  if (n <= 0) return 'hoy'; if (n === 1) return 'ayer'; if (n < 7) return `hace ${n} días`;
  if (n < 14) return 'hace 1 semana'; if (n < 60) return `hace ${Math.floor(n / 7)} semanas`;
  return `hace ${Math.floor(n / 30)} meses`;
}
export const lunesDe = (f) => { const d = aFecha(f); const w = (d.getDay() + 6) % 7; d.setDate(d.getDate() - w); return fechaLocal(d); };
export const saludo = () => { const h = new Date().getHours(); return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'; };

// ---------- identificadores ----------
export const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => { const r = (Math.random() * 16) | 0; return (c === 'x' ? r : (r & 3) | 8).toString(16); }));
export const tokenNuevo = () => { const a = new Uint8Array(16); crypto.getRandomValues(a); return [...a].map((b) => b.toString(16).padStart(2, '0')).join(''); };
// uuid estable a partir de un texto: importar dos veces el mismo respaldo no duplica nada
export function uuidDe(texto) {
  const h = (seed) => { let a = 0x811c9dc5 ^ seed; for (let i = 0; i < texto.length; i++) { a ^= texto.charCodeAt(i); a = Math.imul(a, 0x01000193); } a ^= a >>> 15; a = Math.imul(a, 0x2c1b3c6d); a ^= a >>> 12; return (a >>> 0).toString(16).padStart(8, '0'); };
  const s = h(1) + h(2) + h(3) + h(4);
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-5${s.slice(13, 16)}-${'89ab'[parseInt(s[16], 16) & 3]}${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

// ---------- ejercicios ----------
export const colorGrupo = (g) => COLOR_GRUPO[g] || '#8C8A84';
export const esTiempo = (e) => (e && e.tipo) === 'tiempo';
export function ytId(v) { if (!v) return null; const m = String(v).match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([A-Za-z0-9_-]{6,})/); return m ? m[1] : null; }
export const iniciales = (n) => String(n || '?').trim().split(/\s+/).slice(0, 2).map((x) => x[0]).join('').toUpperCase();
export const primerNombre = (n) => String(n || '').trim().split(/\s+/)[0] || '';
export function textoCarga(v) { const s = String(v ?? '').trim(); return /^\d+([.,]\d+)?$/.test(s) ? `${s} kg` : s; }
export function cargaNumero(t) { const s = String(t || '').toLowerCase().replace(',', '.'); const m = s.match(/[0-9]+(?:\.[0-9]+)?/); if (!m) return 0; let v = parseFloat(m[0]); if (/lb/.test(s)) v = Math.round(v * 0.45359237 * 10) / 10; return v > 0 && v < 1000 ? v : 0; }

export function normEj(e = {}) {
  const tipo = esTiempo(e) ? 'tiempo' : 'reps';
  const n = (v, def, min, max) => { const x = Math.round(nSeg(v)); return Math.min(max, Math.max(min, x || def)); };
  return {
    id: e.id || uuid(), ejercicio: String(e.ejercicio || '').trim(), grupo: e.grupo || 'Core', tipo,
    series: n(e.series, 3, 1, 12), repMin: n(e.repMin, 8, 1, 100), repMax: Math.max(n(e.repMin, 8, 1, 100), n(e.repMax, 12, 1, 100)),
    segundos: n(e.segundos, 40, 5, 3600), descanso: e.descanso === '' || e.descanso == null ? 90 : Math.max(0, Math.round(nSeg(e.descanso))),
    rpe: Math.min(10, Math.max(5, nSeg(e.rpe) || 8)), pesoSugerido: String(e.pesoSugerido || ''), nota: String(e.nota || ''), video: String(e.video || ''),
    ...(e.bibId ? { bibId: e.bibId } : {}), ...(typeof e.unilateral === 'boolean' ? { unilateral: e.unilateral } : {}),
  };
}
export const copiaEj = (e) => normEj({ ...e, id: uuid() });
export const resumenEj = (e) => `${e.series} × ${esTiempo(e) ? `${e.segundos} s` : `${e.repMin}–${e.repMax}`}`;

// ---------- historial ----------
// El mismo ejercicio escrito distinto o corregido ("Extencion de cuadriceps" → "Extensión de cuádriceps")
// sigue siendo el mismo para el historial.
export const seriesDe = (s, ej) => (s.series || []).filter((x) => mismoEj(x.ejercicio, ej)).sort((a, b) => (a.serie || 0) - (b.serie || 0));
const notaDe = (s, ej) => { const n = s.notas || {}; if (n[ej]) return n[ej]; const k = Object.keys(n).find((x) => mismoEj(x, ej)); return k ? n[k] : ''; };
export function seriesPrevias(sesiones, ej, antesDe) {
  const s = sesiones.filter((x) => (!antesDe || x.fecha <= antesDe) && (x.series || []).some((y) => mismoEj(y.ejercicio, ej)))
    .sort((a, b) => (a.fecha === b.fecha ? String(b.creado || '').localeCompare(String(a.creado || '')) : a.fecha < b.fecha ? 1 : -1))[0];
  if (!s) return null;
  return { fecha: s.fecha, series: seriesDe(s, ej).map((x) => ({ peso: nSeg(x.peso), reps: Math.round(nSeg(x.reps)), rpe: nSeg(x.rpe) || null, seg: Math.round(nSeg(x.seg)) || null, ...(x.lado ? { lado: x.lado } : {}), ...(x.tecnica ? { tecnica: x.tecnica } : {}) })), nota: notaDe(s, ej) };
}
export function records(sesiones, ej) {
  let maxPeso = 0, maxE1 = 0, maxVol = 0, maxSeg = 0;
  sesiones.forEach((s) => { const r = seriesDe(s, ej); let vol = 0; r.forEach((x) => { const p = nSeg(x.peso), n = nSeg(x.reps); maxPeso = Math.max(maxPeso, p); maxE1 = Math.max(maxE1, e1rm(p, n)); maxSeg = Math.max(maxSeg, nSeg(x.seg)); vol += p * n; }); maxVol = Math.max(maxVol, vol); });
  return { maxPeso, maxE1, maxVol, maxSeg };
}
// la serie con el mejor 1RM estimado (peso × reps)
export function mejorSerie(sesiones, ej) {
  let m = null;
  sesiones.forEach((s) => seriesDe(s, ej).forEach((x) => { const p = nSeg(x.peso), r = nSeg(x.reps), e = e1rm(p, r); if (e > 0 && (!m || e > m.e1)) m = { peso: p, reps: Math.round(r), rpe: nSeg(x.rpe) || null, fecha: s.fecha, e1: e }; }));
  return m;
}
// repeticiones que se aguantan a un % del 1RM (Epley al revés)
export const repsAlPct = (pct) => (pct >= 100 ? 1 : Math.max(1, Math.round(30 * (100 / pct - 1))));
export const PCTS = [100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50];
export const volumen = (s) => (s.series || []).reduce((t, x) => t + nSeg(x.peso) * nSeg(x.reps), 0);
export function semanasSeguidas(sesiones) {
  const semanas = new Set(sesiones.map((s) => lunesDe(s.fecha)));
  let n = 0; let l = lunesDe(hoy());
  if (!semanas.has(l)) { const d = aFecha(l); d.setDate(d.getDate() - 7); l = fechaLocal(d); }
  while (semanas.has(l)) { n++; const d = aFecha(l); d.setDate(d.getDate() - 7); l = fechaLocal(d); }
  return n;
}
export const sesionesSemana = (sesiones, ref = hoy()) => { const l = lunesDe(ref); return sesiones.filter((s) => lunesDe(s.fecha) === l); };
export function progresion(sesiones, ej) {
  return sesiones.filter((s) => seriesDe(s, ej).length).sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).map((s) => {
    const r = seriesDe(s, ej);
    return { fecha: s.fecha, e1rm: Math.round(Math.max(...r.map((x) => e1rm(nSeg(x.peso), nSeg(x.reps))) ) * 10) / 10, carga: Math.max(...r.map((x) => nSeg(x.peso))), seg: Math.max(...r.map((x) => nSeg(x.seg))) };
  });
}
export function seriesPorGrupo(sesiones, semanas = 8) {
  const l0 = aFecha(lunesDe(hoy())); const out = [];
  for (let i = semanas - 1; i >= 0; i--) {
    const d = new Date(l0); d.setDate(d.getDate() - 7 * i); const l = fechaLocal(d);
    const fila = { semana: l, grupos: {} };
    sesiones.filter((s) => lunesDe(s.fecha) === l).forEach((s) => (s.series || []).forEach((x) => { const g = x.grupo || 'Core'; fila.grupos[g] = (fila.grupos[g] || 0) + 1; }));
    out.push(fila);
  }
  return out;
}
// un nombre por ejercicio (el más reciente), aunque se haya escrito de varias formas
export const ejerciciosDe = (sesiones) => {
  const m = new Map();
  [...sesiones].sort((a, b) => (a.fecha < b.fecha ? -1 : 1)).forEach((s) => (s.series || []).forEach((x) => { const k = claveEj(x.ejercicio) || x.ejercicio; const v = m.get(k) || { n: 0 }; m.set(k, { nombre: x.ejercicio, n: v.n + 1 }); }));
  return [...m.values()].sort((a, b) => b.n - a.n).map((x) => x.nombre);
};

// ---------- programas ----------
export const nDias = (p) => (p?.dias || []).length;
export const totalEjercicios = (p) => (p?.dias || []).reduce((t, d) => t + (d.ejercicios || []).length, 0);
export function nuevoPrograma(asesoradoId, dias, nombre) {
  return { id: uuid(), asesoradoId, nombre: nombre || `Plan ${dias} días`, nota: '', orden: 0, visible: true,
    dias: Array.from({ length: dias }, (_, i) => ({ id: uuid(), nombre: `Día ${i + 1}`, ejercicios: [] })) };
}
export const clonarDias = (dias) => dias.map((d) => ({ id: uuid(), nombre: d.nombre, ejercicios: (d.ejercicios || []).map(copiaEj) }));

// ---------- pagos ----------
export function sumarMes(f) {
  const d = aFecha(f || hoy()); const dia = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + 1);
  const ult = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(); d.setDate(Math.min(dia, ult)); return fechaLocal(d);
}
export const diasParaVencer = (f) => (f ? diasEntre(hoy(), f) : null);
export function textoVence(f) {
  const n = diasParaVencer(f); if (n == null) return 'sin fecha';
  if (n < 0) return `venció hace ${-n} ${n === -1 ? 'día' : 'días'}`;
  if (n === 0) return 'vence hoy'; if (n === 1) return 'vence mañana';
  return n <= 7 ? `vence en ${n} días` : `vence el ${fCorta(f)}`;
}
// número de WhatsApp: solo dígitos; 0412… venezolano → 58412…
export function telWa(t) { let d = String(t || '').replace(/\D/g, ''); if (/^0\d{10}$/.test(d)) d = '58' + d.slice(1); return d.length >= 10 ? d : ''; }
export const abrirWa = (tel, texto) => { const u = `https://wa.me/${telWa(tel)}?text=${encodeURIComponent(texto)}`; if (!window.open(u, '_blank')) location.href = u; };
