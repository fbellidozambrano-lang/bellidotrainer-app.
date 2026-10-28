// Alimentos de los planes de selección flexible → fichas reales de USDA (por su fdcId).
// Cada nombre tiene varios candidatos: al leer el plan se elige el que más se parece a los macros
// que declara el plan para esa cantidad. El coach puede cambiar el vínculo en la app.
// Los ids internos son estables: uuidDe('usda:<fdcId>').
import { uuidDe } from '../util.js';

const V = [
  // proteínas (en crudo)
  [/claras?( de huevo)?$/, [747997, 172183, 323697]],
  [/pechuga( de pollo)?/, [2646170, 171077]],
  [/at[uú]n en agua|at[uú]n/, [334194, 173709, 171986]],
  [/res magra|carne de res magra|carne magra/, [171790, 746761, 2646173, 171757]],
  [/res con grasa|carne de res con grasa/, [2514744, 2646174, 174030]],
  [/cerdo magro|lomo de cerdo|lomo/, [2646169, 2646168]],
  [/cerdo con grasa/, [2514745, 168372, 167843]],
  [/^huevos?( entero)?$|huevo entero/, [748967, 171287]],
  [/queso blanco/, [172224, 2647442, 172223]],
  [/pescado blanco/, [175176, 2684442, 171955, 2684444, 173725]],
  [/muslo( de pollo)?/, [2646171]],
  [/salm[oó]n/, [175167, 173686]],
  [/whey|prote[ií]na en polvo/, [173180, 173177, 173167]],
  [/yogur(t)? griego/, [330137, 170894, 170903]],
  // carbohidratos (en crudo / seco)
  [/tortilla.*integral/, [174081, 2707825]],
  [/tortilla/, [175037, 167535]],
  [/arepa.*integral|harina integral/, [169748, 170290, 169697]],
  [/arepa|harina (de ma[ií]z|precocida|pan)/, [169694, 169749, 168922]],
  [/pan.*integral/, [172688, 174091]],
  [/masa madre/, [172675]],
  [/pan blanco/, [174924, 2707598]],
  [/pl[aá]tano maduro/, [2710817, 169130]],
  [/pl[aá]tano verde/, [2710818, 168215]],
  [/^papa|papas?$/, [170026, 2346401, 170028]],
  [/avena/, [2346396, 169705, 2708489]],
  [/galletas? de arroz/, [170250, 168107]],
  [/salmas/, [167942, 172746]],
  [/galletas? de soda|soda/, [172746, 175056]],
  [/^arroz|arroz blanco/, [168877, 2512381]],
  [/^pasta/, [169736, 168927]],
  [/quinoa/, [168874]],
  [/batata|camote/, [168482, 2346404]],
  [/yuca/, [169985]],
  [/zanahoria/, [170393]],
  [/lentejas?/, [172420]],
  [/caraotas?|frijoles?/, [173734]],
  [/garbanzos?/, [173756]],
  [/nachos/, [168116, 167558]],
  // frutas
  [/cambur|banana/, [173944]], [/lechosa|papaya/, [169926]], [/mango/, [169910]], [/pi[nñ]a/, [2346398, 169124]], [/patilla|sand[ií]a/, [167765]],
  [/fresas?/, [2346409, 167762]], [/manzana/, [171688, 1750341]], [/naranja/, [169097, 746771]], [/uvas?/, [174683, 2346412]], [/mel[oó]n/, [746770, 169092]],
  [/peras?/, [169118, 746773]], [/kiwi/, [327046, 168153]],
  // grasas
  [/aceite( de oliva)?/, [171413, 748608]], [/aguacate/, [171705, 2710824]], [/mantequilla de man[ií]/, [172470, 2262072]], [/mantequilla de almendras?/, [168588, 2262074]],
  [/mantequilla de (man[ií] o almendras|frutos secos)/, [172470, 168588]], [/^mantequilla$/, [173410, 790508]], [/mayonesa/, [171009]],
  [/queso amarillo|queso graso/, [171241, 328637]], [/parmesano/, [170848, 171247]], [/yemas?( de huevo)?/, [172184]], [/almendras?/, [170567, 2346393]],
  [/man[ií]$|^man[ií]/, [172430]], [/nuec(es)?/, [2346394]],
];

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
// candidatos (ids internos) para un nombre del plan, en orden de preferencia
export function candidatos(nombre) {
  const n = norm(nombre); const r = V.find(([re]) => re.test(n));
  return r ? r[1].map((f) => ({ fdc: f, id: uuidDe(`usda:${f}`) })) : [];
}
export const idUSDA = (fdc) => uuidDe(`usda:${fdc}`);
