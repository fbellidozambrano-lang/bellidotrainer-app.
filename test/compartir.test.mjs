// Tarjeta para compartir el entreno: métricas correctas y sin inventar nada.
import assert from 'node:assert/strict';
const { resumenCompartir, lineasCompartir, mejoresSeries, textoSerie, seriePorDefecto } = await import('../src/lib/compartir.js');
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
  assert.equal(seriePorDefecto(r), 'Sentadilla', 'por defecto, la serie del PR');
  assert.deepEqual(lineasCompartir(r, 'Sentadilla').map((x) => x.v), ['Pierna', '85 kg × 8']);
  assert.deepEqual(lineasCompartir(r, 'Plancha').map((x) => `${x.l || ''}${x.v}`), ['Pierna', 'Plancha45 s']);
  assert.deepEqual(lineasCompartir(r, '').map((x) => x.v), ['Pierna'], 'sin elegir: solo la sesión');
});
await t('primer entreno: sin historial no inventa fuerza ni PR y completa con el tiempo', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Torso', minutos: 48, series: [S('Press banca', 60, 10)] }, [], { dia: 'Torso' });
  assert.equal(r.fuerza, null); assert.equal(r.prs.length, 0);
  assert.equal(seriePorDefecto(r), 'Press banca'); assert.deepEqual(lineasCompartir(r, seriePorDefecto(r)).map((x) => x.v), ['Torso', '60 kg × 10']);
});
await t('si bajó la fuerza no se muestra como mejora', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Pierna', minutos: 40, series: [S('Sentadilla', 70, 8)] }, antes, { dia: 'Pierna' });
  assert.ok(r.fuerza < 0);
});
await t('varios PR: muestra el mayor y cuántos son', async () => {
  const r = resumenCompartir({ fecha: '2026-10-23', dia: 'Pierna', minutos: 50, series: [S('Sentadilla', 83, 8), S('Prensa', 180, 8)] }, antes, { dia: 'Pierna' });
  assert.equal(r.prs.length, 2); assert.equal(r.prs[0].ejercicio, 'Prensa');
});
await t('mejor serie: mayor 1RM estimado; sin peso, más reps; por tiempo, la más larga', async () => {
  const m = mejoresSeries({ series: [S('Press', 60, 12), S('Press', 70, 6), S('Press', 65, 10), S('Dominadas', 0, 8), S('Dominadas', 0, 11), S('Plancha', 0, 0, { seg: 30 }), S('Plancha', 0, 0, { seg: 50 })] });
  assert.deepEqual(m.map(textoSerie), ['65 kg × 10', '11 reps', '50 s']);
  assert.deepEqual(m.map((x) => x.ejercicio), ['Press', 'Dominadas', 'Plancha']);
  assert.equal(textoSerie({ peso: 22.5, reps: 8, seg: 0 }), '22,5 kg × 8');
});
console.log(`\n${ok} pruebas OK`);
