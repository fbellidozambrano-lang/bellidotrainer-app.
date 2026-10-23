// Datos de la tarjeta para compartir el entreno en redes (estilo Strava).
import { e1rm, fmt, records, seriesPrevias, nSeg, fLarga } from './util.js';

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
    volumen: Math.round(volumen), fuerza, prs, minutos: p.minutos || 0, series: (p.series || []).length, ejercicios: ejercicios.length,
  };
}

// Las líneas que se dibujan: nombre de la sesión, volumen, mejora de fuerza, PR nuevo
// (si falta fuerza o PR, se completa con el tiempo para que la tarjeta no quede vacía)
export function lineasCompartir(r) {
  const o = [{ k: 'sesion', l: 'Sesión', v: r.titulo }];
  o.push({ k: 'volumen', l: 'Volumen', v: `${fmt(r.volumen)} kg` });
  if (r.fuerza != null && r.fuerza >= 0.5) o.push({ k: 'fuerza', l: 'Mejora de fuerza', v: `+${String(r.fuerza).replace('.', ',')} %` });
  if (r.prs.length) o.push({ k: 'pr', l: r.prs.length > 1 ? `PR nuevos · ${r.prs.length}` : 'PR nuevo', v: `${r.prs[0].ejercicio} ${fmt(r.prs[0].peso, 1)} kg`, oro: true });
  if (o.length < 4 && r.minutos) o.push({ k: 'tiempo', l: 'Tiempo', v: `${r.minutos} min` });
  if (o.length < 4 && r.series) o.push({ k: 'series', l: 'Series', v: String(r.series) });
  return o;
}
export const pieCompartir = (r) => [r.programa, r.fecha ? fLarga(r.fecha) : ''].filter(Boolean).join(' · ');
