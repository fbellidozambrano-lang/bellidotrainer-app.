// Carga sugerida con % de su 1RM, sub-series (drop set, rest-pause, superserie, pirámides)
// y el % de progreso de cada serie y de cada ejercicio mientras entrena.
import { cargaNumero, e1rm, nSeg, r05, records, seriesPrevias } from './util.js';

// primer número de un texto ("8–10 reps" → 8, "22,5 kg" → 22.5)
export const primerNumero = (t) => { const m = String(t ?? '').replace(',', '.').match(/\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
const pct = (a, b) => (a > 0 && b > 0 ? ((a - b) / b) * 100 : null);
export const textoPct = (p, d = 0) => (p == null ? '' : `${p > 0 ? '+' : p < 0 ? '−' : '±'}${Math.abs(Number(p.toFixed(d))).toLocaleString('es-VE', { maximumFractionDigits: d })} %`);

// ---------- sub-series ----------
// cómo se arma la sub-serie de cada técnica: baja o sube un % desde el tramo anterior, el mismo peso, u otro ejercicio
export const SUBS = {
  dropset: { modo: 'baja', pct: 15, nombre: 'Bajada', mas: 'Otra bajada' },
  descendente: { modo: 'baja', pct: 10, nombre: 'Bajada', mas: 'Otro tramo' },
  ascendente: { modo: 'sube', pct: 10, nombre: 'Subida', mas: 'Otro tramo' },
  'rest-pause': { modo: 'mismo', pct: 0, nombre: 'Tras la pausa', mas: 'Otra pausa' },
  superserie: { modo: 'otro', pct: 0, nombre: 'Ejercicio pareado', mas: 'Otro ejercicio' },
};
export const subDe = (tecnica) => SUBS[tecnica] || null;
// % con signo de un tramo según la técnica (bajar 15 → −15)
export const pasoDe = (tecnica, magnitud) => { const s = subDe(tecnica); if (!s) return 0; const m = magnitud ?? s.pct; return s.modo === 'baja' ? -Math.abs(m) : s.modo === 'sube' ? Math.abs(m) : 0; };
export function nuevasSubs(tecnica, n = 1, magnitud) {
  const s = subDe(tecnica); if (!s) return [];
  return Array.from({ length: Math.max(1, Math.min(4, n)) }, () => (s.modo === 'otro' ? { ejercicio: '', peso: '', reps: '' } : { pct: pasoDe(tecnica, magnitud), peso: '', reps: '' }));
}
// peso de cada tramo: el escrito o, si no, el calculado desde el tramo anterior con su %
export function pesosSubs(pesoBase, subs = []) {
  let base = nSeg(pesoBase); const out = [];
  subs.forEach((s) => {
    if (s.ejercicio != null) { out.push({ peso: nSeg(s.peso), calculado: false, cambio: null }); return; }
    const escrito = nSeg(s.peso); const calc = base > 0 ? r05(base * (1 + (Number(s.pct) || 0) / 100)) : 0;
    const peso = escrito > 0 ? escrito : calc; out.push({ peso, calculado: !(escrito > 0) && calc > 0, cambio: pct(peso, base) });
    if (peso > 0) base = peso;
  });
  return out;
}
// las sub-series que se guardan: solo las que tienen repeticiones, con su peso real
export function subsParaGuardar(pesoBase, subs = []) {
  const ps = pesosSubs(pesoBase, subs);
  return subs.map((s, i) => ({ s, p: ps[i] })).filter(({ s }) => Math.round(nSeg(s.reps)) > 0)
    .map(({ s, p }) => ({ peso: p.peso, reps: Math.round(nSeg(s.reps)), ...(s.ejercicio != null ? { ejercicio: String(s.ejercicio).trim() } : { pct: p.cambio != null ? Math.round(p.cambio) : Number(s.pct) || 0 }) }));
}
// volumen de una serie con sus sub-series
export { volSerie } from './util.js';

// ---------- carga sugerida ----------
// lo que el coach sugiere, comparado con su 100 % (1RM estimado) y con la vez pasada
export function ajusteSugerido(ej, historial) {
  // solo si es un peso ("80", "80 kg", "45 lb"); "banda verde" o "máquina 3" no se comparan
  const carga = /^\s*\d+([.,]\d+)?\s*(kg|kgs|lb|lbs)?\s*$/i.test(String(ej.pesoSugerido || '')) ? cargaNumero(ej.pesoSugerido) : 0;
  const reps = Math.round(primerNumero(ej.repsSugeridas)) || 0;
  const rec = records(historial, ej.ejercicio); const prev = seriesPrevias(historial, ej.ejercicio);
  const top = (prev?.series || []).filter((x) => x.peso > 0).sort((a, b) => b.peso - a.peso || b.reps - a.reps)[0] || null;
  const e1 = rec.maxE1 || 0;
  const r = { carga, reps, e1, top, fecha: prev?.fecha || null };
  if (carga && e1) { r.pct1RM = (carga / e1) * 100; if (top) r.pct1RMantes = (top.peso / e1) * 100; }
  if (carga && top) { r.cambioKg = carga - top.peso; r.cambioPct = pct(carga, top.peso); }
  if (carga && reps && e1) { r.e1Hoy = e1rm(carga, reps); r.exigencia = (r.e1Hoy / e1) * 100; } // 100 % = igualar su mejor marca
  return r;
}

// ---------- progreso en vivo ----------
// una serie contra la misma serie de la vez pasada (1RM estimado; en ejercicios de tiempo, segundos)
export function progresoSerie(actual, previa, tiempo = false) {
  if (!previa) return null;
  if (tiempo) { const a = nSeg(actual.seg), b = nSeg(previa.seg); return a > 0 && b > 0 ? { pct: pct(a, b), antes: `${b} s` } : null; }
  const a = e1rm(nSeg(actual.peso), nSeg(actual.reps)), b = e1rm(nSeg(previa.peso), nSeg(previa.reps));
  return a > 0 && b > 0 ? { pct: pct(a, b), antes: `${String(previa.peso).replace('.', ',')} × ${previa.reps}` } : null;
}
// el ejercicio completo: la mejor serie de hoy contra la mejor de la vez pasada y contra su récord
export function progresoEjercicio(filas, historial, ejercicio, tiempo = false) {
  const hechas = filas.filter((x) => x.hecha || x.tocada);
  if (tiempo) {
    const hoyM = Math.max(0, ...hechas.map((x) => nSeg(x.seg))); if (!hoyM) return null;
    const prev = seriesPrevias(historial, ejercicio); const antes = Math.max(0, ...(prev?.series || []).map((x) => nSeg(x.seg))); const rec = records(historial, ejercicio).maxSeg;
    return { vsAntes: antes ? pct(hoyM, antes) : null, vsRecord: rec ? pct(hoyM, rec) : null };
  }
  const hoyM = Math.max(0, ...hechas.map((x) => e1rm(nSeg(x.peso), nSeg(x.reps)))); if (!hoyM) return null;
  const prev = seriesPrevias(historial, ejercicio); const antes = Math.max(0, ...(prev?.series || []).map((x) => e1rm(x.peso, x.reps)));
  const rec = records(historial, ejercicio).maxE1;
  return { vsAntes: antes ? pct(hoyM, antes) : null, vsRecord: rec ? pct(hoyM, rec) : null, e1: hoyM };
}
