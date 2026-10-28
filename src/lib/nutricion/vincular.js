// Une cada alimento del plan con una ficha real de la base de alimentos.
// Entre los candidatos de vinculos.js elige el que más se parece a los macros que declara el plan
// para esa cantidad (proteína y grasa en las proteínas; carbohidrato y proteína en los carbohidratos).
// Si el coach ya eligió una ficha a mano, se respeta.
import { candidatos } from './vinculos.js';
import { nutrientesDe } from './calculo.js';

const items = (plan) => {
  const out = [];
  (plan.comidas || []).forEach((c) => {
    (c.proteinas || []).forEach((o) => o.items?.length === 1 && out.push({ o, it: o.items[0], ref: { proteina: o.proteina, grasa: o.grasa } }));
    (c.proteinas || []).forEach((o) => o.items?.length > 1 && o.items.forEach((it) => out.push({ o, it })));
    (c.carbohidratos || []).forEach((o) => (o.items || []).forEach((it) => out.push({ o, it, ref: { carbohidratos: o.carbohidratos, proteina: o.proteina } })));
    (c.carbohidratos || []).forEach((o) => (o.semana1?.items || []).forEach((it) => out.push({ o, it })));
    (c.frutas || []).forEach((o) => (o.items || []).forEach((it) => out.push({ o, it })));
  });
  (plan.grasas || []).forEach((o) => (o.items || []).forEach((it) => out.push({ o, it })));
  return out;
};

export function idsCandidatos(plan) {
  const s = new Set(); items(plan).forEach(({ it }) => candidatos(it.nombre).forEach((c) => s.add(c.id))); return [...s];
}

// distancia relativa entre lo que dice el plan y lo que da la ficha para esos gramos
function distancia(ficha, gramos, ref) {
  if (!ref || !gramos) return 0;
  // gramos de diferencia sobre los gramos que declara el plan: un gramo de grasa pesa lo mismo que uno de proteína
  const r = nutrientesDe(ficha, gramos).principales; let d = 0, tot = 0;
  Object.entries(ref).forEach(([k, v]) => { if (v == null || r[k] == null) return; d += Math.abs(r[k] - v); tot += v; });
  return tot ? d / tot : 0;
}

export function vincularPlan(plan, fichas) {
  const copia = JSON.parse(JSON.stringify(plan)); const resumen = { vinculados: 0, sin_ficha: [] };
  items(copia).forEach(({ it, ref }) => {
    const gramos = it.gramos ?? (it.ml ? it.ml * 0.92 : null);
    if (it.vinculo === 'coach' && it.alimento_id && fichas[it.alimento_id]) { resumen.vinculados++; return; }
    const cands = candidatos(it.nombre).filter((c) => fichas[c.id]);
    it.alternativas = cands.map((c) => c.id);
    if (!cands.length) { delete it.alimento_id; it.vinculo = 'sin_ficha'; if (!resumen.sin_ficha.includes(it.nombre)) resumen.sin_ficha.push(it.nombre); return; }
    const mejor = cands.map((c, i) => ({ c, d: distancia(fichas[c.id], gramos, ref) + i * 0.01 })).sort((a, b) => a.d - b.d)[0];
    it.alimento_id = mejor.c.id; it.alimento_nombre = fichas[mejor.c.id].nombre; it.vinculo = 'auto'; it.diferencia = Math.round(mejor.d * 100);
    if (it.ml && !it.gramos) it.gramos = Math.round(it.ml * 0.92 * 10) / 10; // aceite: 5 ml ≈ 4,6 g (densidad 0,92)
    resumen.vinculados++;
  });
  return { plan: copia, resumen };
}

// lo que suma una opción del plan con las fichas (para comparar con lo que dice el PDF)
export function totalOpcion(opcion, fichas, semana1 = false) {
  const its = semana1 && opcion.semana1 ? opcion.semana1.items : opcion.items;
  const out = { kcal: 0, proteina: 0, carbohidratos: 0, grasa: 0 }; let completo = true;
  (its || []).forEach((it) => {
    const f = fichas[it.alimento_id]; if (!f || !it.gramos) { completo = false; return; }
    const r = nutrientesDe(f, it.gramos).principales; Object.keys(out).forEach((k) => { if (r[k] != null) out[k] += r[k]; else completo = false; });
  });
  return { ...out, completo };
}
