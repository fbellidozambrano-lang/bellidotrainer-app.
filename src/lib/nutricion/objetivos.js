// Objetivos de un día concreto: los de base, los de la semana 1 del plan o los de un "tipo de día"
// (entreno, descanso, día alto…) que el coach asigna a días de la semana. El asesorado puede cambiar
// el tipo de un día puntual (por ejemplo si entrenó un día distinto): queda anotado como registro 'dia'.
import { aFecha, diasEntre } from '../util.js';

export const DIAS_SEMANA = [[1, 'L', 'Lunes'], [2, 'M', 'Martes'], [3, 'X', 'Miércoles'], [4, 'J', 'Jueves'], [5, 'V', 'Viernes'], [6, 'S', 'Sábado'], [0, 'D', 'Domingo']];
export const PRESETS_DIA = ['Día de entreno', 'Día de descanso', 'Día alto en carbohidratos', 'Día bajo en carbohidratos', 'Fin de semana'];
const MACROS = ['kcal', 'proteina', 'carbohidratos', 'grasa'];
const num = (v) => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

// días de la semana repetidos entre tipos (el coach lo ve como aviso)
export function diasRepetidos(tipos = []) {
  const vistos = new Map(); const rep = new Set();
  tipos.forEach((t) => (t.dias || []).forEach((d) => { if (vistos.has(d)) rep.add(d); vistos.set(d, t.id); }));
  return [...rep];
}

// tipo de día que corresponde a una fecha: el elegido a mano ese día, o el de su día de la semana
export function tipoDelDia(obj, fecha, registros = []) {
  const tipos = (obj?.dias_tipo || []).filter((t) => t && t.id);
  if (!tipos.length) return { tipo: null, elegido: false, tipos };
  const r = [...registros].reverse().find((x) => x.fecha === fecha && x.tipo === 'dia');
  if (r) { const id = r.detalle?.perfil; return { tipo: id === 'base' ? null : tipos.find((t) => t.id === id) || null, elegido: true, registro: r, tipos }; }
  const wd = aFecha(fecha).getDay();
  return { tipo: tipos.find((t) => (t.dias || []).includes(wd)) || null, elegido: false, tipos };
}

// metas del día y de cada comida para esa fecha
export function objetivosDelDia(obj = {}, fecha, { plan = null, registros = [] } = {}) {
  const { tipo, elegido, tipos, registro } = tipoDelDia(obj, fecha, registros);
  const s1 = !tipo && obj.semana1 && plan?.emitido && diasEntre(plan.emitido, fecha) >= 0 && diasEntre(plan.emitido, fecha) < 7 ? obj.semana1 : null;
  const base = Object.fromEntries(MACROS.map((k) => [k, num(obj[k])]));
  const dia = { ...base };
  if (s1) MACROS.forEach((k) => { if (num(s1[k]) != null) dia[k] = num(s1[k]); });
  if (tipo) MACROS.forEach((k) => { if (num(tipo[k]) != null) dia[k] = num(tipo[k]); });
  const agua_ml = num(tipo?.agua_ml) ?? num(obj.agua_ml);
  // comidas: las del plan (semana 1) o las de base, escaladas a los macros del tipo de día
  const comidas = (Array.isArray(obj.comidas) ? obj.comidas : []).map((c, i) => {
    if (!c) return c; let m = { ...c };
    const s1c = s1 ? plan?.comidas?.[i]?.semana1 : null;
    if (s1c && typeof s1c === 'object') m = { ...m, kcal: s1c.kcal ?? m.kcal, carbohidratos: s1c.carbohidratos ?? m.carbohidratos };
    if (tipo) MACROS.forEach((k) => { const b = base[k], d = dia[k]; if (num(m[k]) != null && b && d) m[k] = Math.round((num(m[k]) * d) / b); });
    return m;
  });
  return { ...obj, ...dia, agua_ml, comidas: Array.isArray(obj.comidas) ? comidas : obj.comidas, semana1Activa: s1, tipo, elegido, tipos, registroTipo: registro || null };
}
