// Entrenamiento en casa: un sustituto corto de cada día de la rutina, para no perder el día.
// No copia cada patrón de movimiento: da un estímulo a cada grupo muscular que tocaba ese día,
// con pesos caseros (botellas, galones, mochila con libros, silla, escalón).
import { normEj } from '../lib/util.js';

// grupo → ejercicio casero (nombre, tipo, series, reps o segundos, con qué cargarlo, cómo hacerlo)
const C = (ejercicio, extra) => ({ ejercicio, tipo: 'reps', series: 3, repMin: 10, repMax: 15, descanso: 60, rpe: 9, ...extra });
export const CASA = {
  'Pecho': C('Flexiones de pecho', { repMin: 8, repMax: 15, carga: 'Tu peso · con mochila en la espalda si te quedan fáciles', nota: 'Si no llegas a 8, apoya las rodillas. Baja en 3 segundos hasta casi tocar el piso.' }),
  'Espalda amplitud': C('Remo invertido bajo una mesa', { repMin: 8, repMax: 12, carga: 'Tu peso · una mesa firme', nota: 'Acuéstate bajo la mesa, agárrate del borde y lleva el pecho hacia ella. Cuerpo recto. Prueba antes que la mesa no se mueva.' }),
  'Espalda alta': C('Remo con mochila a una mano', { repMin: 10, repMax: 15, carga: 'Mochila con libros o galón de agua', nota: 'Apoya una mano en una silla, espalda recta. Lleva el codo hacia la cadera y aprieta 1 segundo arriba. Cada lado.' }),
  'Hombro anterior': C('Flexión en V (pike push-up)', { repMin: 6, repMax: 12, carga: 'Tu peso', nota: 'Cadera bien alta, cabeza baja entre las manos. Si cuesta mucho, pies más cerca de las manos.' }),
  'Hombro lateral': C('Elevaciones laterales con botellas', { repMin: 15, repMax: 20, descanso: 45, carga: 'Botellas de 1,5 L o galones', nota: 'Sube hasta la altura de los hombros sin balancearte. Baja lento, 3 segundos.' }),
  'Hombro posterior': C('Pájaros con botellas', { repMin: 15, repMax: 20, descanso: 45, carga: 'Botellas de 1,5 L', nota: 'Inclinado hacia adelante, espalda recta. Abre los brazos como alas y aprieta atrás.' }),
  'Bíceps': C('Curl con mochila o galón', { repMin: 12, repMax: 15, descanso: 45, carga: 'Mochila con libros o galón de agua', nota: 'Codos pegados al cuerpo. Sube en 1 segundo, baja en 3.' }),
  'Tríceps': C('Fondos en silla', { repMin: 10, repMax: 15, carga: 'Una silla firme', nota: 'Manos en el borde de la silla, baja hasta que el codo quede a 90°. Piernas dobladas si cuesta.' }),
  'Cuádriceps': C('Sentadilla búlgara con el pie en el sofá', { repMin: 10, repMax: 12, carga: 'Mochila con libros', nota: 'Pie de atrás apoyado en el sofá. Baja en 3 segundos, rodilla de adelante en línea con el pie. Cada pierna.' }),
  'Isquiotibiales': C('Curl femoral deslizando una toalla', { repMin: 8, repMax: 12, carga: 'Una toalla en piso liso', nota: 'Boca arriba, talones sobre la toalla y cadera arriba. Arrastra los talones hacia ti sin bajar la cadera.' }),
  'Glúteo': C('Hip thrust con la espalda en el sofá', { repMin: 15, repMax: 20, carga: 'Mochila con libros sobre la cadera', nota: 'Espalda alta apoyada en el sofá. Sube la cadera y aprieta 2 segundos arriba.' }),
  'Isquios / Glúteo': C('Peso muerto rumano con mochila', { repMin: 12, repMax: 15, carga: 'Mochila con libros o dos galones', nota: 'Rodillas un poco dobladas, lleva la cadera hacia atrás con la espalda recta hasta sentir el estiramiento.' }),
  'Cuádriceps / Glúteo': C('Zancadas hacia atrás con mochila', { repMin: 10, repMax: 12, carga: 'Mochila con libros', nota: 'Paso largo hacia atrás, baja hasta casi tocar el piso con la rodilla. Cada pierna.' }),
  'Aductores': C('Plancha de Copenhague en el sofá', { tipo: 'tiempo', segundos: 20, descanso: 45, carga: 'El sofá', nota: 'De lado, la pierna de arriba apoyada en el sofá. Sube la cadera y aguanta. Cada lado.' }),
  'Abductores': C('Abducción de cadera acostado de lado', { repMin: 15, repMax: 25, descanso: 45, carga: 'Tu peso · botella sobre el muslo si es fácil', nota: 'Sube la pierna de arriba sin girar la cadera. Cada lado.' }),
  'Gemelos': C('Elevación de talones en un escalón', { repMin: 15, repMax: 20, descanso: 45, carga: 'Un escalón · mochila si te queda fácil', nota: 'Baja el talón por debajo del escalón y sube lo más alto que puedas. Pausa arriba.' }),
  'Core': C('Plancha', { tipo: 'tiempo', segundos: 40, descanso: 45, carga: 'Tu peso', nota: 'Codos debajo de los hombros, abdomen y glúteos apretados. Cuerpo recto de cabeza a talones.' }),
  'Antebrazo': C('Agarre con galones (farmer hold)', { tipo: 'tiempo', segundos: 40, descanso: 45, carga: 'Dos galones o bolsas pesadas', nota: 'De pie, brazos estirados, aprieta fuerte. Puedes caminar mientras aguantas.' }),
  'Trapecio': C('Encogimientos con mochila', { repMin: 15, repMax: 20, descanso: 45, carga: 'Mochila con libros o galones', nota: 'Sube los hombros hacia las orejas y aguanta 1 segundo arriba.' }),
  'Lumbares': C('Superman en el piso', { repMin: 12, repMax: 15, descanso: 45, carga: 'Tu peso', nota: 'Boca abajo, sube brazos y piernas a la vez y aguanta 2 segundos.' }),
};

// Guía para armar los pesos en casa
export const PESOS_CASEROS = [
  ['Botella de agua de 1,5 L', '≈ 1,5 kg'], ['Galón de agua', '≈ 3,8 kg'], ['Botellón de 5 L', '≈ 5 kg'],
  ['Bolsa de arroz o azúcar', '1 a 5 kg'], ['Mochila con libros', '5 a 15 kg'], ['Mochila con botellas', 'cada una ≈ 1,5 kg'],
];

const POR_NOMBRE = [
  [/pierna|inferior|lower|cuad/i, ['Cuádriceps', 'Glúteo', 'Isquiotibiales', 'Gemelos', 'Core']],
  [/gl[uú]te/i, ['Glúteo', 'Isquios / Glúteo', 'Cuádriceps / Glúteo', 'Abductores', 'Core']],
  [/empuje|push|pecho/i, ['Pecho', 'Hombro anterior', 'Hombro lateral', 'Tríceps', 'Core']],
  [/tracci[oó]n|pull|espalda/i, ['Espalda amplitud', 'Espalda alta', 'Hombro posterior', 'Bíceps', 'Core']],
  [/torso|superior|upper/i, ['Pecho', 'Espalda alta', 'Hombro lateral', 'Bíceps', 'Tríceps']],
];
const FULL = ['Cuádriceps', 'Glúteo', 'Pecho', 'Espalda alta', 'Hombro lateral', 'Core'];

// grupos que se entrenan ese día, del que más trabajo tiene al que menos
export function gruposDelDia(dia) {
  const lista = dia.ejercicios?.length ? dia.ejercicios.map((e) => e.grupo) : dia.grupos || [];
  const n = new Map(); lista.filter(Boolean).forEach((g) => n.set(g, (n.get(g) || 0) + 1));
  if (n.size) return [...n.entries()].sort((a, b) => b[1] - a[1]).map((x) => x[0]);
  const m = POR_NOMBRE.find(([re]) => re.test(dia.nombre || '')); return m ? m[1] : FULL;
}

const MAX = 6;
// Rutina en casa para un día de la rutina
export function diaCasa(dia) {
  const grupos = gruposDelDia(dia).filter((g) => CASA[g]);
  const elegidos = []; const vistos = new Set();
  grupos.forEach((g) => { const c = CASA[g]; if (elegidos.length < MAX && !vistos.has(c.ejercicio)) { vistos.add(c.ejercicio); elegidos.push([g, c]); } });
  if (elegidos.length < 4 && !vistos.has(CASA.Core.ejercicio)) elegidos.push(['Core', CASA.Core]); // que valga la pena
  const ejercicios = elegidos.map(([g, c], i) => normEj({ id: `casa-${dia.id}-${i}`, ejercicio: c.ejercicio, grupo: g, tipo: c.tipo, series: c.series, repMin: c.repMin, repMax: c.repMax, segundos: c.segundos, descanso: c.descanso, rpe: c.rpe, pesoSugerido: c.carga, nota: c.nota }));
  const seg = ejercicios.reduce((t, e) => t + e.series * ((e.tipo === 'tiempo' ? e.segundos : 40) + e.descanso), 0);
  return { id: `casa-${dia.id}`, nombre: `${dia.nombre} en casa`, base: dia.nombre, grupos: elegidos.map((x) => x[0]), minutos: Math.max(10, Math.round(seg / 60 / 5) * 5), ejercicios };
}

// Versión en casa de un programa (mismo número de días)
export function programaCasa(p) {
  return { id: `casa-${p.id}`, programaBase: p.id, nombre: `${p.nombre} · en casa`, nota: '', dias: (p.dias || []).map(diaCasa) };
}
