// Tipo de serie (técnica) y lado (derecha / izquierda) de cada serie registrada.
import { mismoEj } from './nombres.js';
import { nSeg } from './util.js';

export const TECNICAS = [
  { k: 'rest-pause', n: 'Rest-pause', c: 'RP', d: 'Llegas cerca del fallo, descansas 10–20 s y sacas unas reps más con el mismo peso.' },
  { k: 'dropset', n: 'Drop set', c: 'DS', d: 'Al llegar al fallo bajas el peso y sigues sin descansar.' },
  { k: 'superserie', n: 'Superserie', c: 'SS', d: 'La haces seguida de otro ejercicio, sin descanso entre los dos.' },
  { k: 'ascendente', n: 'Ascendente', c: '↑', d: 'Pirámide: subes el peso en cada serie (y bajan las reps).' },
  { k: 'descendente', n: 'Descendente', c: '↓', d: 'Pirámide inversa: empiezas pesado y bajas el peso en cada serie.' },
];
export const tecnicaDe = (k) => TECNICAS.find((t) => t.k === k) || null;

export const LADOS = { D: 'Derecha', I: 'Izquierda' };

// ¿Se trabaja un lado a la vez? (si el coach no lo marcó, se deduce del nombre)
const RE_UNI = /\bunilateral\b|\b(a|con) una (mano|pierna)\b|\b(un|a un) brazo\b|\buna pierna\b|\bsingle[ -]?(arm|leg)\b|\bone[ -]?(arm|leg)\b|\bb[uú]lgar|\bbulgarian\b|\bpistol\b|\bsplit squat\b/i;
export const esUnilateral = (ej) => (ej && typeof ej === 'object' ? (ej.unilateral ?? RE_UNI.test(ej.ejercicio || '')) : RE_UNI.test(String(ej || '')));

// Filas de registro para un ejercicio: si es unilateral, cada serie tiene su fila derecha y su fila izquierda
export function filasUnilaterales(filas) {
  return filas.flatMap((f) => [{ ...f, lado: 'D' }, { ...f, lado: 'I', hecha: false, tocada: false }]);
}
export function filasBilaterales(filas) {
  return filas.filter((f) => f.lado !== 'I').map(({ lado, ...f }) => f);
}
// número de serie de cada fila (1, 1, 2, 2… cuando hay lados)
export const numeroFila = (filas, i) => (filas[i]?.lado ? filas.slice(0, i + 1).filter((x) => x.lado === 'D' || !x.lado).length || 1 : i + 1);

// texto corto de una serie guardada: "1D", "2I"…
export const etiquetaLado = (x) => (x?.lado === 'D' ? 'D' : x?.lado === 'I' ? 'I' : '');

// Diferencia entre lados en la última sesión con lados (para avisar desbalances)
export function balanceLados(sesiones, ej) {
  const s = [...sesiones].filter((x) => (x.series || []).some((y) => mismoEj(y.ejercicio, ej) && y.lado)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
  if (!s) return null;
  const suma = (l) => s.series.filter((y) => mismoEj(y.ejercicio, ej) && y.lado === l).reduce((t, y) => t + (nSeg(y.peso) || 1) * (nSeg(y.reps) || nSeg(y.seg)), 0);
  const d = suma('D'), i = suma('I'); if (!d || !i) return null;
  const dif = Math.round((Math.abs(d - i) / Math.max(d, i)) * 100);
  return { fecha: s.fecha, d, i, dif, fuerte: d > i ? 'D' : i > d ? 'I' : '' };
}
