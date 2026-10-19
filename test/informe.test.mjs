// Lector del informe antropométrico, analogías de peso y controles en la base.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { leerInforme } = await import('../src/data/informe.js');
const { analogia } = await import('../src/lib/analogias.js');
const { crearStoreNube } = await import('../src/data/store.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

// líneas con el mismo formato que el PDF del informe (datos inventados)
const L = `INFORME DE EVALUACION ANTROPOMETRICA
Nombre y apellido  Carla Prueba
Período evaluado  03/07/2026 a 02/10/2026
Peso corporal (kg)  70.4  67.9  -2.5  Descenso
Grasa corporal (%)  30.2  27.5  -2.7  Mejora
Masa grasa (kg)  21.3  18.7  -2.6  Mejora
Masa libre de grasa (kg)  49.1  49.2  +0.1  Mejora
Masa muscular esquelética (kg)  22.0  22.6  +0.6  Mejora
Índice de masa corporal  25.9  25.0  -0.9  Descenso
Índice cintura-talla  0.47  0.45  -0.02  Mejora
03/07  02/10
Peso · kg  70.40  67.90
Cintura  78.0  75.5
% GRASA ADOPTADO  30.2  27.5
Masa grasa  21.26  18.67
Masa libre de grasa  49.14  49.23
Masa muscular esquelética (Lee 2000)  22.01  22.63
% de masa muscular  31.3  33.3
Grasa visceral  6  5
Edad metabólica  34  31
Tasa metabólica basal de referencia  1450  1432`.split('\n');
await t('lee el resumen del informe', async () => {
  const r = leerInforme(L);
  assert.equal(r.nombre, 'Carla Prueba'); assert.equal(r.fecha, '2026-10-02'); assert.equal(r.datos.inicio, '2026-07-03');
  assert.equal(r.datos.peso, 67.9); assert.equal(r.datos.grasa, 27.5); assert.equal(r.datos.masaGrasa, 18.67); assert.equal(r.datos.musculo, 22.63);
  assert.equal(r.datos.musculoPct, 33.3); assert.equal(r.datos.visceral, 5); assert.equal(r.datos.edadMet, 31); assert.equal(r.datos.cintura, 75.5); assert.equal(r.datos.imc, 25);
  assert.equal(r.datos.inicial.peso, 70.4); assert.equal(r.datos.inicial.grasa, 30.2);
});
await t('sin grasa visceral ni edad metabólica no inventa nada', async () => {
  const r = leerInforme(L.filter((l) => !/visceral|metab[oó]lica \d|Edad metab/i.test(l)));
  assert.equal(r.datos.visceral, undefined); assert.equal(r.datos.edadMet, undefined); assert.equal(r.datos.peso, 67.9);
});
await t('un PDF que no es informe se rechaza', async () => { assert.throws(() => leerInforme(['Factura', 'Total 120.00']), /no parece/); });
await t('analogías de peso', async () => {
  assert.equal(analogia(2), null);
  for (const kg of [50, 600, 3000, 12000, 45000, 200000]) { const a = analogia(kg, 'x' + kg); assert.ok(a && /levantar/.test(a), `${kg}: ${a}`); }
  assert.equal(analogia(12000, 's1'), analogia(12000, 's1'));
  const set = new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g'].map((s) => analogia(12000, s))); assert.ok(set.size > 1, 'debía variar');
});
await t('controles en la nube: el coach guarda y el asesorado lo ve', async () => {
  const db = await crearDB(); await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','c@bt.com')`);
  const nube = crearStoreNube({ url: 'x', key: 'y' }, fakeSupabase(db)); await nube.auth.entrar('c@bt.com', 'x');
  const a = await nube.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Carla Prueba', token: 'c'.repeat(32) });
  const r = leerInforme(L); await nube.guardarControl({ id: crypto.randomUUID(), asesoradoId: a.id, fecha: r.fecha, datos: r.datos });
  const d = await nube.cargarTodo(); assert.equal(d.controles.length, 1); assert.equal(d.controles[0].datos.grasa, 27.5); assert.equal(d.faltaTablas, false);
  await nube.auth.salir(); const at = await nube.atletaCargar(a.token); assert.equal(at.controles.length, 1); assert.equal(at.controles[0].fecha, '2026-10-02'); assert.equal(at.controles[0].datos.peso, 67.9);
});
console.log(`\n${ok} pruebas OK`);
