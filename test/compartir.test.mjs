// Tarjeta para compartir el entreno: métricas correctas y sin inventar nada.
import assert from 'node:assert/strict';
const { resumenCompartir, lineasCompartir, pieCompartir } = await import('../src/lib/compartir.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const S = (ej, peso, reps, extra = {}) => ({ ejercicio: ej, grupo: 'x', peso, reps, ...extra });

const antes = [
  { id: 'a', fecha: '2026-10-10', dia: 'Pierna', series: [S('Sentadilla', 80, 8), S('Sentadilla', 80, 8), S('Prensa', 140, 10)] },
  { id: 'b', fecha: '2026-10-16', dia: 'Pierna', series: [S('Sentadilla', 82.5, 8), S('Prensa', 150, 10), S('Plancha', 0, 0, { seg: 40 })] },
];
await t('volumen, mejora de fuerza frente a la última vez y PR nuevo', async () => {
  const hoy = { id: 'h', fecha: '2026-10-23', dia: 'Pierna', minutos: 61, series: [S('Sentadilla', 85, 8), S('Sentadilla', 85, 7), S('Prensa', 150, 10), S('Plancha', 0, 0, { seg: 45 })] };
  const r = resumenCompartir(hoy, antes, { dia: 'Pierna', programa: 'Fuerza · 3 días' });
  assert.equal(r.volumen, 85 * 8 + 85 * 7 + 150 * 10);
  // sentadilla: 85x8 vs 82,5x8 → +3,0 %; prensa igual → 0 %; promedio 1,5 %
  assert.equal(r.fuerza, 1.5);
  assert.equal(r.prs.length, 1); assert.equal(r.prs[0].ejercicio, 'Sentadilla'); assert.equal(r.prs[0].peso, 85);
  const l = lineasCompartir(r);
  assert.deepEqual(l.map((x) => x.k), ['sesion', 'volumen', 'fuerza', 'pr']);
  assert.equal(l[1].v, '2.775 kg'); assert.equal(l[2].v, '+1,5 %'); assert.equal(l[3].v, 'Sentadilla 85 kg'); assert.equal(l[3].l, 'PR nuevo');
  assert.equal(pieCompartir(r), 'Fuerza · 3 días · 23 oct 2026');
});
await t('primer entreno: sin historial no inventa fuerza ni PR y completa con el tiempo', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Torso', minutos: 48, series: [S('Press banca', 60, 10)] }, [], { dia: 'Torso' });
  assert.equal(r.fuerza, null); assert.equal(r.prs.length, 0);
  assert.deepEqual(lineasCompartir(r).map((x) => x.k), ['sesion', 'volumen', 'tiempo', 'series']);
});
await t('si bajó la fuerza no se muestra como mejora', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Pierna', minutos: 40, series: [S('Sentadilla', 70, 8)] }, antes, { dia: 'Pierna' });
  assert.ok(r.fuerza < 0); assert.ok(!lineasCompartir(r).some((x) => x.k === 'fuerza'));
});
await t('varios PR: muestra el mayor y cuántos son', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Pierna', minutos: 50, series: [S('Sentadilla', 83, 8), S('Prensa', 180, 8)] }, antes, { dia: 'Pierna' });
  const pr = lineasCompartir(r).find((x) => x.k === 'pr');
  assert.equal(pr.l, 'PR nuevos · 2'); assert.match(pr.v, /^Prensa 180 kg$/);
});
console.log(`\n${ok} pruebas OK`);
