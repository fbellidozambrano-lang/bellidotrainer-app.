// Corregir el nombre de un ejercicio sin perder su historial: el nombre nuevo pasa a las
// sesiones ya registradas (series y observaciones) y a las demás rutinas del mismo asesorado.
import { mismoEj } from './nombres.js';

const usa = (s, de) => (s.series || []).some((x) => mismoEj(x.ejercicio, de));
export const sesionesCon = (sesiones, de) => sesiones.filter((s) => usa(s, de));

export function renombrarEnSesiones(sesiones, de, a, grupo) {
  return sesionesCon(sesiones, de).map((s) => {
    const series = s.series.map((x) => (mismoEj(x.ejercicio, de) ? { ...x, ejercicio: a, ...(grupo ? { grupo } : {}) } : x));
    const notas = {};
    Object.entries(s.notas || {}).forEach(([k, v]) => { const k2 = mismoEj(k, de) ? a : k; notas[k2] = notas[k2] && notas[k2] !== v ? `${notas[k2]} · ${v}` : v; });
    return { ...s, series, notas };
  });
}

// otras rutinas del asesorado con el mismo ejercicio (la que se está editando se maneja aparte)
export function renombrarEnProgramas(programas, de, a, grupo, excluirId) {
  const out = [];
  programas.forEach((p) => {
    if (p.id === excluirId) return; let cambio = false;
    const dias = (p.dias || []).map((d) => ({ ...d, ejercicios: (d.ejercicios || []).map((e) => { if (!mismoEj(e.ejercicio, de)) return e; cambio = true; return { ...e, ejercicio: a, ...(grupo ? { grupo } : {}) }; }) }));
    if (cambio) out.push({ ...p, dias });
  });
  return out;
}
