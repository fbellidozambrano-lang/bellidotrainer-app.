import { crearDB, como } from './pg.mjs';
import assert from 'node:assert/strict';

const A = '11111111-1111-1111-1111-111111111111';
const B = '22222222-2222-2222-2222-222222222222';
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const falla = async (p) => { let e = null; try { await p; } catch (x) { e = x; } assert.ok(e, 'debía fallar'); return e; };

const db = await crearDB();
await db.exec(`insert into auth.users values ('${A}','a@x'),('${B}','b@x')`);

let ana, token;
await t('coach crea asesorado con token automático', async () => {
  const r = await como(db, A, (tx) => tx.query(`insert into asesorados (nombre) values ('Ana') returning *`));
  ana = r.rows[0]; token = ana.token;
  assert.equal(ana.coach_id, A); assert.ok(token.length >= 32);
});
await t('coach crea programa', async () => {
  await como(db, A, (tx) => tx.query(`insert into programas (asesorado_id, nombre, dias) values ($1,'Plan 3 días',$2)`,
    [ana.id, JSON.stringify([{ id: 'd1', nombre: 'Pierna', ejercicios: [{ id: 'e1', ejercicio: 'Sentadilla' }] }])]));
  await como(db, A, (tx) => tx.query(`insert into programas (asesorado_id, nombre, visible) values ($1,'Oculto',false)`, [ana.id]));
});
await t('otro coach no ve nada', async () => {
  const r = await como(db, B, (tx) => tx.query(`select * from asesorados`));
  assert.equal(r.rows.length, 0);
  const p = await como(db, B, (tx) => tx.query(`select * from programas`));
  assert.equal(p.rows.length, 0);
});
await t('otro coach no puede colgar programas en asesorados ajenos', async () => {
  await falla(como(db, B, (tx) => tx.query(`insert into programas (asesorado_id, nombre) values ($1,'x')`, [ana.id])));
});
await t('otro coach no puede modificar ni borrar', async () => {
  const u = await como(db, B, (tx) => tx.query(`update asesorados set nombre='X' where id=$1`, [ana.id]));
  assert.equal(u.affectedRows, 0);
});
await t('anónimo no lee tablas', async () => {
  await falla(como(db, null, (tx) => tx.query(`select * from asesorados`)));
  await falla(como(db, null, (tx) => tx.query(`select * from sesiones`)));
});
await t('asesorado carga con su enlace (solo programas visibles)', async () => {
  const r = await como(db, null, (tx) => tx.query(`select atleta_cargar($1) as d`, [token]));
  const d = r.rows[0].d;
  assert.equal(d.asesorado.nombre, 'Ana'); assert.equal(d.programas.length, 1);
  assert.equal(d.programas[0].dias[0].ejercicios[0].ejercicio, 'Sentadilla');
  assert.equal(d.asesorado.token, undefined);
});
await t('enlace falso devuelve null', async () => {
  const r = await como(db, null, (tx) => tx.query(`select atleta_cargar($1) as d`, ['x'.repeat(32)]));
  assert.equal(r.rows[0].d, null);
});
const ses = { id: '33333333-3333-3333-3333-333333333333', fecha: new Date().toISOString().slice(0, 10), dia: 'Pierna', programa_nombre: 'Plan 3 días',
  minutos: 55, series: [{ ejercicio: 'Sentadilla', serie: 1, peso: 60, reps: 8, rpe: 8 }], notas: { Sentadilla: 'bien' } };
await t('asesorado guarda sesión y reenviarla no duplica', async () => {
  await como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, [token, JSON.stringify(ses)]));
  await como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, [token, JSON.stringify(ses)]));
  const r = await como(db, A, (tx) => tx.query(`select * from sesiones`));
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].origen, 'asesorado'); assert.equal(r.rows[0].coach_id, A);
  assert.equal(r.rows[0].notas.Sentadilla, 'bien');
});
await t('sesión con enlace falso o vacía se rechaza', async () => {
  await falla(como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, ['y'.repeat(32), JSON.stringify(ses)])));
  await falla(como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, [token, JSON.stringify({ ...ses, id: null, series: [] })])));
});
await t('la carga del asesorado trae su historial', async () => {
  const r = await como(db, null, (tx) => tx.query(`select atleta_cargar($1) as d`, [token]));
  assert.equal(r.rows[0].d.sesiones.length, 1);
});
await t('archivado corta el acceso; nuevo token invalida el viejo', async () => {
  await como(db, A, (tx) => tx.query(`update asesorados set token='nuevotoken1234567890abcdef' where id=$1`, [ana.id]));
  const r = await como(db, null, (tx) => tx.query(`select atleta_cargar($1) as d`, [token]));
  assert.equal(r.rows[0].d, null);
});
await t('borrar asesorado borra en cascada', async () => {
  await como(db, A, (tx) => tx.query(`delete from asesorados where id=$1`, [ana.id]));
  const r = await db.query(`select (select count(*) from programas) p, (select count(*) from sesiones) s`);
  assert.equal(Number(r.rows[0].p), 0); assert.equal(Number(r.rows[0].s), 0);
});
console.log(`\n${ok} pruebas OK`);
