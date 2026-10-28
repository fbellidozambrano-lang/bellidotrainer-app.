// Cuánto trabajó cada músculo en una sesión, para pintarlo en la silueta.
// Cada grupo de la app reparte sus series entre las zonas del dibujo: 1 = músculo principal,
// menos de 1 = ayuda (el tríceps en un press de pecho). Las vistas son 'frente' y 'espalda'.
import { nSeg } from './util.js';

const F = 'frente', E = 'espalda';
export const ZONAS_DE = {
  'Pecho': [[F, 'chest', 1], [F, 'deltoids', 0.4], [F, 'triceps', 0.4], [E, 'triceps', 0.4]],
  'Espalda amplitud': [[E, 'upper-back', 1], [F, 'biceps', 0.4], [E, 'deltoids', 0.3]],
  'Espalda alta': [[E, 'upper-back', 1], [E, 'trapezius', 0.6], [E, 'deltoids', 0.5], [F, 'biceps', 0.3]],
  'Hombro anterior': [[F, 'deltoids', 1], [F, 'triceps', 0.3], [E, 'triceps', 0.3]],
  'Hombro lateral': [[F, 'deltoids', 1], [E, 'deltoids', 1], [E, 'trapezius', 0.3], [F, 'trapezius', 0.3]],
  'Hombro posterior': [[E, 'deltoids', 1], [E, 'upper-back', 0.3]],
  'Bíceps': [[F, 'biceps', 1], [F, 'forearm', 0.3], [E, 'forearm', 0.3]],
  'Tríceps': [[F, 'triceps', 1], [E, 'triceps', 1]],
  'Cuádriceps': [[F, 'quadriceps', 1]],
  'Isquiotibiales': [[E, 'hamstring', 1], [E, 'gluteal', 0.3]],
  'Glúteo': [[E, 'gluteal', 1], [E, 'hamstring', 0.3]],
  'Isquios / Glúteo': [[E, 'hamstring', 1], [E, 'gluteal', 1], [E, 'lower-back', 0.4]],
  'Cuádriceps / Glúteo': [[F, 'quadriceps', 1], [E, 'gluteal', 1], [F, 'adductors', 0.4], [E, 'adductors', 0.4]],
  'Aductores': [[F, 'adductors', 1], [E, 'adductors', 1]],
  'Abductores': [[E, 'gluteal', 0.8]],
  'Gemelos': [[F, 'calves', 1], [E, 'calves', 1]],
  'Core': [[F, 'abs', 1], [F, 'obliques', 1]],
  'Antebrazo': [[F, 'forearm', 1], [E, 'forearm', 1]],
  'Trapecio': [[E, 'trapezius', 1], [F, 'trapezius', 1], [F, 'neck', 0.3]],
  'Lumbares': [[E, 'lower-back', 1], [E, 'gluteal', 0.3]],
};
const zonas = (g) => ZONAS_DE[g] || ZONAS_DE[String(g || '').split('/')[0].trim()] || [];

// series: las de la sesión. Una serie por lado (derecha o izquierda) cuenta como media serie por músculo.
export function cargaMuscular(series = []) {
  const vistas = { [F]: {}, [E]: {} }; const grupos = new Map();
  series.forEach((x) => {
    const peso = x.lado ? 0.5 : 1; const g = x.grupo || 'Core';
    const v = grupos.get(g) || { grupo: g, series: 0, kg: 0 };
    v.series += peso; v.kg += nSeg(x.peso) * nSeg(x.reps); grupos.set(g, v);
    zonas(g).forEach(([vista, slug, w]) => { vistas[vista][slug] = (vistas[vista][slug] || 0) + peso * w; });
  });
  return { vistas, grupos: [...grupos.values()].sort((a, b) => b.series - a.series || b.kg - a.kg) };
}

// Escala por series efectivas en la sesión
export const NIVELES = [
  { n: 'Poco', r: '1–2 series', c: '#FFE08A' },
  { n: 'Moderado', r: '3–4', c: '#FFC400' },
  { n: 'Alto', r: '5–7', c: '#FF7A1A' },
  { n: 'Muy alto', r: '8 o más', c: '#E5262B' },
];
export const nivelDe = (v) => (!(v > 0.2) ? 0 : v < 2.5 ? 1 : v < 4.5 ? 2 : v < 7.5 ? 3 : 4);
export const colorNivel = (v) => (nivelDe(v) ? NIVELES[nivelDe(v) - 1].c : null);
