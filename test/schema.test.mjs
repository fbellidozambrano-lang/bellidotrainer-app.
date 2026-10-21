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
const cargar = async (uid = null) => (await como(db, uid, (tx) => tx.query(`select atleta_cargar($1) as d`, [token]))).rows[0].d;
const abrir = async (c) => (await como(db, null, (tx) => tx.query(`select atleta_abrir($1,$2) as r`, [token, c]))).rows[0].r;
const codigo = async (uid = A) => (await como(db, uid, (tx) => tx.query(`select nuevo_codigo($1) as r`, [ana.id]))).rows[0].r;
const guardar = (x) => como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, [token, JSON.stringify(x)]));
await t('sin código: ve nombres de programas y días, nunca los ejercicios', async () => {
  const d = await cargar();
  assert.equal(d.asesorado.nombre, 'Ana'); assert.equal(d.programas.length, 1);
  assert.equal(d.acceso.abierto, false); assert.equal(d.programas[0].dias[0].nombre, 'Pierna');
  assert.equal(d.programas[0].dias[0].ejercicios, undefined);
  assert.ok(!JSON.stringify(d).includes('Sentadilla')); assert.equal(d.asesorado.token, undefined);
});
await t('el coach en vista previa sí ve todo', async () => {
  const d = await cargar(A); assert.equal(d.acceso.abierto, true); assert.equal(d.programas[0].dias[0].ejercicios[0].ejercicio, 'Sentadilla');
});
await t('otro coach no puede generar códigos de mis asesorados', async () => { await falla(codigo(B)); });
await t('anónimo no puede generar códigos ni leer permisos', async () => {
  await falla(como(db, null, (tx) => tx.query(`select nuevo_codigo($1)`, [ana.id])));
  await falla(como(db, null, (tx) => tx.query(`select * from permisos`)));
});
await t('sin código pedido: abrir dice sin_codigo', async () => { assert.equal((await abrir('123456')).motivo, 'sin_codigo'); });
let cod;
await t('código incorrecto no abre; el correcto sí', async () => {
  cod = await codigo(); assert.match(cod.codigo, /^\d{6}$/);
  const malo = cod.codigo === '000000' ? '111111' : '000000';
  assert.equal((await abrir(malo)).motivo, 'incorrecto'); assert.equal((await cargar()).acceso.abierto, false);
  assert.equal((await abrir(cod.codigo.slice(0, 3) + ' ' + cod.codigo.slice(3))).ok, true);
  const d = await cargar(); assert.equal(d.acceso.abierto, true); assert.equal(d.programas[0].dias[0].ejercicios[0].ejercicio, 'Sentadilla');
  assert.equal(d.acceso.permiso, cod.id);
});
await t('en vivo: el asesorado manda su avance solo con la rutina abierta', async () => {
  const prog = (x) => como(db, null, (tx) => tx.query(`select atleta_progreso($1,$2) as r`, [token, JSON.stringify(x)]));
  assert.equal((await prog({ dia: 'Pierna', hechas: 2 })).rows[0].r, true);
  const r = await como(db, A, (tx) => tx.query(`select progreso, progreso_at from permisos where id=$1`, [cod.id]));
  assert.equal(r.rows[0].progreso.hechas, 2); assert.ok(r.rows[0].progreso_at);
  assert.equal((await como(db, null, (tx) => tx.query(`select atleta_progreso($1,$2) as r`, ['z'.repeat(32), '{}']))).rows[0].r, false);
  assert.equal((await como(db, B, (tx) => tx.query(`select * from permisos`))).rows.length, 0);
});
await t('el mismo código no se puede ingresar dos veces', async () => { assert.equal((await abrir(cod.codigo)).motivo, 'sin_codigo'); });
const ses = { id: '33333333-3333-3333-3333-333333333333', fecha: new Date().toISOString().slice(0, 10), dia: 'Pierna', programa_nombre: 'Plan 3 días',
  minutos: 55, series: [{ ejercicio: 'Sentadilla', serie: 1, peso: 60, reps: 8, rpe: 8 }], notas: { Sentadilla: 'bien' } };
await t('sesión sin código se rechaza', async () => { await falla(guardar({ ...ses, id: '55555555-5555-5555-5555-555555555555' })); });
await t('asesorado guarda sesión con su código y reenviarla no duplica', async () => {
  await guardar({ ...ses, permiso: cod.id }); await guardar({ ...ses, permiso: cod.id });
  const r = await como(db, A, (tx) => tx.query(`select * from sesiones`));
  assert.equal(r.rows.length, 1); assert.equal(r.rows[0].origen, 'asesorado'); assert.equal(r.rows[0].coach_id, A);
  assert.equal(r.rows[0].notas.Sentadilla, 'bien');
});
await t('sesión con enlace falso o vacía se rechaza', async () => {
  await falla(como(db, null, (tx) => tx.query(`select atleta_guardar_sesion($1,$2)`, ['y'.repeat(32), JSON.stringify(ses)])));
  await falla(guardar({ ...ses, id: null, series: [] }));
});
await t('al enviar la sesión la rutina se bloquea y el código no sirve para otra', async () => {
  assert.equal((await como(db, null, (tx) => tx.query(`select atleta_progreso($1,'{"x":1}') as r`, [token]))).rows[0].r, false);
  const d = await cargar(); assert.equal(d.acceso.abierto, false); assert.ok(!JSON.stringify(d.programas).includes('Sentadilla'));
  await falla(guardar({ ...ses, id: '44444444-4444-4444-4444-444444444444', permiso: cod.id }));
});
await t('5 intentos fallidos queman el código', async () => {
  const c = await codigo(); const malo = c.codigo === '000000' ? '111111' : '000000';
  for (let i = 0; i < 4; i++) assert.equal((await abrir(malo)).motivo, 'incorrecto');
  assert.equal((await abrir(malo)).motivo, 'agotado');
  assert.equal((await abrir(c.codigo)).motivo, 'sin_codigo');
});
await t('código nuevo anula el anterior sin usar', async () => {
  const c1 = await codigo(); const c2 = await codigo();
  const r = await como(db, A, (tx) => tx.query(`select count(*) n from permisos where abierto is null`)); assert.equal(Number(r.rows[0].n), 1);
  if (c1.codigo !== c2.codigo) assert.equal((await abrir(c1.codigo)).motivo, 'incorrecto');
  assert.equal((await abrir(c2.codigo)).ok, true);
});
await t('rutina abierta hace más de 4 horas se bloquea sola', async () => {
  await db.exec(`update permisos set abierto = now() - interval '5 hours' where abierto is not null and usado is null`);
  assert.equal((await cargar()).acceso.abierto, false);
});
await t('controles: el coach los sube, el asesorado ve los suyos, nadie más', async () => {
  await como(db, A, (tx) => tx.query(`insert into controles (asesorado_id, fecha, datos) values ($1,'2026-08-18','{"peso":91.7}'),($1,'2026-10-16','{"peso":90.2,"grasa":22.8}')`, [ana.id]));
  const d = await cargar(); assert.equal(d.controles.length, 2); assert.equal(d.controles[0].datos.peso, 90.2); assert.equal(d.controles[0].fecha, '2026-10-16');
  assert.equal((await como(db, B, (tx) => tx.query(`select * from controles`))).rows.length, 0);
  await falla(como(db, B, (tx) => tx.query(`insert into controles (asesorado_id, fecha) values ($1,'2026-10-01')`, [ana.id])));
  await falla(como(db, null, (tx) => tx.query(`select * from controles`)));
});
await t('vencimiento de pago llega al asesorado', async () => {
  await como(db, A, (tx) => tx.query(`update asesorados set vence='2026-11-05' where id=$1`, [ana.id]));
  assert.equal((await cargar()).asesorado.vence, '2026-11-05');
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
await t('biblioteca y plantillas: cada coach ve solo las suyas, anónimo nada', async () => {
  await como(db, A, (tx) => tx.query(`insert into biblioteca (nombre, grupo, video, alias) values ('Extensión de cuádriceps','Cuádriceps','https://youtu.be/abc123xyz','["extensiones de cuadriceps"]')`));
  await como(db, A, (tx) => tx.query(`insert into plantillas (nombre, dias) values ('Pierna 3 días','[]')`));
  assert.equal((await como(db, A, (tx) => tx.query(`select * from biblioteca`))).rows.length, 1);
  assert.equal((await como(db, B, (tx) => tx.query(`select * from biblioteca`))).rows.length, 0);
  assert.equal((await como(db, B, (tx) => tx.query(`select * from plantillas`))).rows.length, 0);
  await falla(como(db, B, (tx) => tx.query(`insert into biblioteca (coach_id, nombre) values ($1,'x')`, [A])));
  await falla(como(db, null, (tx) => tx.query(`select * from biblioteca`)));
  await falla(como(db, null, (tx) => tx.query(`select * from plantillas`)));
});
await t('borrar asesorado borra en cascada', async () => {
  await como(db, A, (tx) => tx.query(`delete from asesorados where id=$1`, [ana.id]));
  const r = await db.query(`select (select count(*) from programas) p, (select count(*) from sesiones) s`);
  assert.equal(Number(r.rows[0].p), 0); assert.equal(Number(r.rows[0].s), 0);
});
console.log(`\n${ok} pruebas OK`);
