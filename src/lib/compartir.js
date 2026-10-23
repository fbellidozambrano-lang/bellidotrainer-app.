// Datos de la tarjeta para compartir el entreno en redes (estilo Strava).
import { e1rm, fmt, records, seriesPrevias, nSeg } from './util.js';

const esTiempoS = (x) => nSeg(x.seg) > 0 && !(nSeg(x.reps) > 0);

// p: la sesión recién guardada (series del día). historial: sesiones ANTERIORES.
export function resumenCompartir(p, historial = [], { dia = '', programa = '' } = {}) {
  const series = (p.series || []).filter((x) => !esTiempoS(x));
  const volumen = series.reduce((t, x) => t + nSeg(x.peso) * nSeg(x.reps), 0);
  const ejercicios = [...new Set(series.map((x) => x.ejercicio))];

  // Fuerza: 1RM estimado de hoy frente a la última vez que hizo cada ejercicio (promedio)
  const cambios = [];
  const prs = [];
  ejercicios.forEach((ej) => {
    const hoyS = series.filter((x) => x.ejercicio === ej);
    const e1Hoy = Math.max(0, ...hoyS.map((x) => e1rm(nSeg(x.peso), nSeg(x.reps))));
    const pesoHoy = Math.max(0, ...hoyS.map((x) => nSeg(x.peso)));
    const prev = seriesPrevias(historial, ej);
    if (prev && e1Hoy > 0) {
      const e1Antes = Math.max(0, ...prev.series.map((x) => e1rm(x.peso, x.reps)));
      if (e1Antes > 0) cambios.push((e1Hoy / e1Antes - 1) * 100);
    }
    const r = records(historial, ej);
    if (r.maxPeso > 0 && pesoHoy > r.maxPeso) prs.push({ ejercicio: ej, peso: pesoHoy, antes: r.maxPeso, sube: pesoHoy / r.maxPeso - 1 });
  });
  const fuerza = cambios.length ? Math.round((cambios.reduce((a, b) => a + b, 0) / cambios.length) * 10) / 10 : null;
  prs.sort((a, b) => b.sube - a.sube);
  return {
    titulo: dia || p.dia || 'Entreno', programa: programa || p.programaNombre || '', fecha: p.fecha,
    volumen: Math.round(volumen), fuerza, prs, minutos: p.minutos || 0, series: (p.series || []).length, ejercicios: ejercicios.length, mejores: mejoresSeries(p),
  };
}

// Mejor serie de cada ejercicio, en el orden en que los hizo:
// con peso, la de mayor 1RM estimado; sin peso, la de más reps; por tiempo, la más larga.
export function mejoresSeries(p) {
  const orden = []; const por = new Map();
  (p.series || []).forEach((x) => { if (!por.has(x.ejercicio)) { por.set(x.ejercicio, []); orden.push(x.ejercicio); } por.get(x.ejercicio).push(x); });
  return orden.map((ej) => {
    const ss = por.get(ej); const t = ss.filter(esTiempoS);
    if (t.length === ss.length) { const m = t.reduce((a, b) => (nSeg(b.seg) > nSeg(a.seg) ? b : a)); return { ejercicio: ej, peso: nSeg(m.peso), reps: 0, seg: nSeg(m.seg) }; }
    const r = ss.filter((x) => !esTiempoS(x));
    const m = r.reduce((a, b) => { const ea = e1rm(nSeg(a.peso), nSeg(a.reps)), eb = e1rm(nSeg(b.peso), nSeg(b.reps));
      return eb > ea || (eb === ea && (nSeg(b.reps) > nSeg(a.reps) || (nSeg(b.reps) === nSeg(a.reps) && nSeg(b.peso) > nSeg(a.peso)))) ? b : a; });
    return { ejercicio: ej, peso: nSeg(m.peso), reps: Math.round(nSeg(m.reps)), seg: 0 };
  });
}
export const textoSerie = (m) => (m.seg ? (m.peso > 0 ? `${fmt(m.peso, 1)} kg · ${m.seg} s` : `${m.seg} s`) : m.peso > 0 ? `${fmt(m.peso, 1)} kg × ${m.reps}` : `${m.reps} reps`);

// Lo que va en la tarjeta: nombre de la sesión y la mejor serie de cada ejercicio (el logo se dibuja aparte)
export function lineasCompartir(r) {
  return [{ k: 'sesion', v: r.titulo }, ...(r.mejores || []).map((m) => ({ k: 'ej', l: m.ejercicio, v: textoSerie(m) }))];
}
