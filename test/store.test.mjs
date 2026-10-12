// Prueba la capa de datos en línea + importación de respaldos viejos.
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { crearStoreNube, crearStoreLocal } = await import('../src/data/store.js');
const { interpretar, desdeRespaldoViejo, desdeSesionSuelta, desdeHevy, exportar, desdeExportV9 } = await import('../src/data/legacy.js');
const { hoy } = await import('../src/lib/util.js');

let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const db = await crearDB();
await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','coach@bt.com')`);
const sb = fakeSupabase(db);
const nube = crearStoreNube({ url: 'x', key: 'y' }, sb);

// respaldo con el formato real de la v8 (tbt:data:v1)
const v8 = JSON.parse(fs.readFileSync(new URL('./fixtures/respaldo-v8.json', import.meta.url)));

await t('login', async () => { await nube.auth.entrar('coach@bt.com', 'x'); assert.ok(await nube.auth.usuario()); });
await t('login con correo inexistente da mensaje claro', async () => {
  await assert.rejects(nube.auth.entrar('no@bt.com', 'x'), /incorrectos/);
});
let imp;
await t('interpreta y convierte el respaldo v8', async () => {
  const f = interpretar(JSON.stringify(v8), 'team-bellidotrainer.json'); assert.equal(f.tipo, 'viejo');
  imp = desdeRespaldoViejo(f.raw, await nube.cargarTodo(), 'u1');
  assert.equal(imp.asesorados.length, 2); assert.equal(imp.programas.length, 1);
  assert.equal(imp.programas[0].dias.length, 2); assert.equal(imp.programas[0].dias[0].nombre, 'Piernas 1');
  assert.equal(imp.sesiones.length, 3);
  assert.equal(imp.asesorados[0].datos.legacyId, 'ana1');
  assert.equal(imp.programas[0].dias[0].ejercicios.find((e) => e.ejercicio === 'Plancha').tipo, 'tiempo');
  assert.equal(imp.programas[0].dias[1].ejercicios[0].grupo, 'Espalda alta'); // "Espalda" viejo → nuevo
});
await t('sube el respaldo a la nube', async () => {
  let p = 0; await nube.importar(imp, (x) => (p = x)); assert.equal(p, 1);
  const d = await nube.cargarTodo(); assert.equal(d.asesorados.length, 2); assert.equal(d.sesiones.length, 3); assert.equal(d.programas.length, 1);
  assert.ok(d.asesorados.every((a) => a.token && a.token.length >= 32));
});
await t('importar el mismo respaldo dos veces no duplica', async () => {
  const again = desdeRespaldoViejo(v8, await nube.cargarTodo(), 'u1');
  assert.equal(again.asesorados.length, 0); assert.equal(again.emparejados, 2); assert.equal(again.sesiones.length, 0); assert.equal(again.programas.length, 0);
  await nube.importar(again); const d = await nube.cargarTodo();
  assert.equal(d.sesiones.length, 3); assert.equal(d.programas.length, 1);
});
await t('sesión suelta (.json que mandaba el asesorado en v8)', async () => {
  const f = interpretar(JSON.stringify({ v: 1, tipo: 'sesion-bellidotrainer', asesoradoId: 'ana1', nombre: 'Ana Chacon', dia: 'Piernas 1', fecha: '2026-10-01', minutos: 50, notas: {}, series: [{ ejercicio: 'Curl femoral acostado', grupo: 'Isquiotibiales', serie: 1, peso: 22.5, reps: 12, rpe: 9 }] }));
  const r = desdeSesionSuelta(f.raw, await nube.cargarTodo(), 'u1'); assert.equal(r.sesiones.length, 1); assert.equal(r.nombre, 'Ana Chacon');
  await nube.importar(r); const r2 = desdeSesionSuelta(f.raw, await nube.cargarTodo(), 'u1'); assert.equal(r2.sesiones.length, 0);
});
let ana;
await t('programa nuevo, editar y borrar', async () => {
  const d = await nube.cargarTodo(); ana = d.asesorados.find((a) => a.nombre === 'Ana Chacon');
  const { nuevoPrograma } = await import('../src/lib/util.js');
  const p = nuevoPrograma(ana.id, 3); p.dias[0].ejercicios.push({ id: 'e', ejercicio: 'Hip thrust', grupo: 'Glúteo', series: 4 });
  const g = await nube.guardarPrograma(p); assert.equal(g.dias.length, 3);
  g.nombre = 'Plan 3 días glúteo'; await nube.guardarPrograma(g);
  const p2 = nuevoPrograma(ana.id, 2); await nube.guardarPrograma(p2); await nube.borrarPrograma(p2.id);
  const d2 = await nube.cargarTodo(); assert.equal(d2.programas.filter((x) => x.asesoradoId === ana.id).length, 2);
  assert.ok(d2.programas.some((x) => x.nombre === 'Plan 3 días glúteo'));
});
await t('el asesorado entra con su enlace y guarda (sin sesión de coach)', async () => {
  await nube.auth.salir();
  const d = await nube.atletaCargar(ana.token); assert.equal(d.asesorado.nombre, 'Ana Chacon'); assert.equal(d.programas.length, 2);
  assert.ok(d.sesiones.length >= 3); assert.equal(d.sesiones[0].asesoradoId, ana.id);
  const s = { id: crypto.randomUUID(), asesoradoId: ana.id, programaId: d.programas[0].id, programaNombre: 'x', dia: 'Día 1', fecha: hoy(), minutos: 40, series: [{ ejercicio: 'Hip thrust', grupo: 'Glúteo', serie: 1, peso: 80, reps: 10, rpe: 8 }], notas: {} };
  await nube.atletaGuardarSesion(ana.token, s); await nube.atletaGuardarSesion(ana.token, s);
  assert.equal(await nube.atletaCargar('falso'.repeat(8)), null);
  await nube.auth.entrar('coach@bt.com', 'x');
  const all = await nube.cargarTodo(); assert.equal(all.sesiones.filter((x) => x.origen === 'asesorado').length, 2); // la suelta + esta
});
await t('Hevy .csv', async () => {
  const csv = fs.readFileSync(new URL('./fixtures/hevy.csv', import.meta.url), 'utf8');
  assert.equal(interpretar(csv, 'workouts.csv').tipo, 'hevy');
  const r = desdeHevy(csv, ana.id, true, 'u1'); assert.ok(r.sesiones.length >= 2); assert.equal(r.programas.length, 1);
  await nube.importar(r);
});
await t('exportar v9 y llevarlo a modo local', async () => {
  const d = await nube.cargarTodo(); const txt = exportar(d);
  const loc = crearStoreLocal(); const f = interpretar(txt, 'x.json'); assert.equal(f.tipo, 'v9');
  await loc.importar(desdeExportV9(f.raw, await loc.cargarTodo())); const dl = await loc.cargarTodo();
  assert.equal(dl.sesiones.length, d.sesiones.length); assert.equal(dl.programas.length, d.programas.length);
  const at = await loc.atletaCargar(ana.token); assert.equal(at.asesorado.nombre, 'Ana Chacon');
});
await t('borrar asesorado', async () => {
  const luis = (await nube.cargarTodo()).asesorados.find((a) => a.nombre === 'Luis Perez'); await nube.borrarAsesorado(luis.id);
  assert.equal((await nube.cargarTodo()).asesorados.length, 1);
});
console.log(`\n${ok} pruebas OK`);
