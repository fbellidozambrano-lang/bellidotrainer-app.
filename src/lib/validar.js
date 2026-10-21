// Revisa una serie mientras se registra y avisa si algo no cuadra
// (un cero de más, reps imposibles, RPE fuera de escala…). Nunca bloquea: solo avisa.
import { e1rm, fmt, nSeg } from './util.js';

const esNum = (v) => v === '' || v == null || /^\s*\d+([.,]\d+)?\s*$/.test(String(v));

// hist: { maxPeso, maxE1, maxSeg } del historial de ese ejercicio
export function revisarSerie(s, ej = {}, hist = {}) {
  const T = (ej.tipo || '') === 'tiempo';
  if (!esNum(s.peso)) return { nivel: 'error', texto: 'El peso va solo en números (ej: 22,5).' };
  if (!esNum(T ? s.seg : s.reps)) return { nivel: 'error', texto: T ? 'Los segundos van solo en números.' : 'Las repeticiones van solo en números.' };
  if (!esNum(s.rpe)) return { nivel: 'error', texto: 'El RPE va en números del 1 al 10.' };
  const p = nSeg(s.peso), r = nSeg(s.reps), g = nSeg(s.seg), rpe = nSeg(s.rpe);
  if (s.rpe !== '' && s.rpe != null && (rpe < 1 || rpe > 10)) return { nivel: 'error', texto: `RPE ${fmt(rpe, 1)}: la escala va de 1 a 10.` };
  if (p > 500) return { nivel: 'error', texto: `${fmt(p, 1)} kg no es realista. ¿Sobra un número?` };
  if (T) {
    if (g > 900) return { nivel: 'error', texto: `${fmt(g)} segundos son más de 15 minutos. Revisa el número.` };
    if (hist.maxSeg > 0 && g > hist.maxSeg * 2 && g - hist.maxSeg >= 30) return { nivel: 'aviso', texto: `¿${fmt(g)} s? Tu mejor tiempo es ${fmt(hist.maxSeg)} s.` };
    return null;
  }
  if (r > 60) return { nivel: 'error', texto: `${fmt(r)} repeticiones es demasiado. Revisa el número.` };
  if (r && !Number.isInteger(r)) return { nivel: 'aviso', texto: 'Las repeticiones van en números enteros.' };
  if (p > 0 && s.hecha && !(r > 0)) return { nivel: 'aviso', texto: 'Falta cuántas repeticiones hiciste.' };
  const max = hist.maxPeso || 0;
  if (max > 0 && p > max * 1.35 && p - max >= 10) return { nivel: 'aviso', texto: `¿${fmt(p, 1)} kg? Tu máximo aquí es ${fmt(max, 1)} kg (+${Math.round((p / max - 1) * 100)} %). Revisa que no sobre un cero.` };
  if (max >= 20 && p > 0 && p < max * 0.2) return { nivel: 'aviso', texto: `${fmt(p, 1)} kg es muy poco comparado con tu máximo (${fmt(max, 1)} kg). ¿Falta un número?` };
  const top = Math.max(nSeg(ej.repMax), nSeg(ej.repMin));
  if (top > 0 && r > Math.max(20, top * 2.5)) return { nivel: 'aviso', texto: `${fmt(r)} reps está muy por encima del rango (${ej.repMin}–${ej.repMax}). ¿Es correcto?` };
  if (hist.maxE1 > 0 && p > 0 && r > 0 && e1rm(p, r) > hist.maxE1 * 1.3) return { nivel: 'aviso', texto: `Esta serie supera tu 1RM estimado en ${Math.round((e1rm(p, r) / hist.maxE1 - 1) * 100)} %. Si es real, es récord; si no, revisa peso y reps.` };
  return null;
}
