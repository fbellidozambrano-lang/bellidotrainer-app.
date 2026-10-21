// Rutina en casa generada desde la rutina de cada asesorado.
import assert from 'node:assert/strict';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { CASA, diaCasa, programaCasa, gruposDelDia } = await import('../src/data/casa.js');
const { GRUPOS } = await import('../src/data/constants.js');
const { crearStoreLocal } = await import('../src/data/store.js');
const { hoy, nuevoPrograma } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const ej = (ejercicio, grupo) => ({ id: ejercicio, ejercicio, grupo });

await t('cada grupo muscular de la app tiene su ejercicio casero', async () => { GRUPOS.forEach((g) => assert.ok(CASA[g], g)); });
await t('día de pierna → estímulo para cada grupo de ese día, sin repetir y corto', async () => {
  const d = { id: 'd1', nombre: 'Pierna', ejercicios: [ej('Sentadilla', 'Cuádriceps'), ej('Prensa', 'Cuádriceps'), ej('Extensión', 'Cuádriceps'), ej('Curl femoral', 'Isquiotibiales'), ej('Hip thrust', 'Glúteo'), ej('Gemelos', 'Gemelos')] };
  const c = diaCasa(d);
  assert.deepEqual(c.grupos, ['Cuádriceps', 'Isquiotibiales', 'Glúteo', 'Gemelos']);
  assert.equal(c.ejercicios.length, 4); assert.equal(c.ejercicios[0].ejercicio, 'Sentadilla búlgara con el pie en el sofá');
  assert.ok(c.minutos >= 10 && c.minutos <= 30, `${c.minutos} min`); assert.ok(c.ejercicios.every((e) => e.pesoSugerido && e.nota));
  assert.equal(new Set(c.ejercicios.map((e) => e.ejercicio)).size, c.ejercicios.length);
});
await t('día con muchos grupos se queda en máximo 6 ejercicios; día con pocos suma core', async () => {
  const todos = { id: 'x', nombre: 'Full', ejercicios: GRUPOS.map((g) => ej(g, g)) }; assert.equal(diaCasa(todos).ejercicios.length, 6);
  const brazos = diaCasa({ id: 'b', nombre: 'Brazos', ejercicios: [ej('Curl', 'Bíceps'), ej('Press francés', 'Tríceps')] });
  assert.deepEqual(brazos.grupos, ['Bíceps', 'Tríceps', 'Core']);
});
await t('con la rutina bloqueada usa los grupos que manda el servidor; sin nada, el nombre del día', async () => {
  assert.deepEqual(gruposDelDia({ nombre: 'Día 1', grupos: ['Pecho', 'Tríceps', 'Pecho'] }), ['Pecho', 'Tríceps']);
  assert.ok(gruposDelDia({ nombre: 'Torso A', grupos: [] }).includes('Espalda alta'));
  assert.ok(gruposDelDia({ nombre: 'Día X' }).includes('Glúteo'));
  const p = programaCasa({ id: 'p', nombre: 'Plan 3 días', dias: [{ id: 'a', nombre: 'Pierna' }, { id: 'b', nombre: 'Empuje' }, { id: 'c', nombre: 'Tracción' }] });
  assert.equal(p.dias.length, 3); assert.equal(p.dias[1].ejercicios[0].ejercicio, 'Flexiones de pecho'); assert.equal(p.dias[2].nombre, 'Tracción en casa');
});
await t('el entreno en casa se guarda sin código y no bloquea la rutina', async () => {
  const st = crearStoreLocal(); const a = await st.guardarAsesorado({ id: 'a1', nombre: 'Eva Casa', token: 'e'.repeat(32), datos: {} });
  const pr = nuevoPrograma(a.id, 2); pr.dias[0].ejercicios = [{ id: 'e1', ejercicio: 'Sentadilla', grupo: 'Cuádriceps' }]; await st.guardarPrograma(pr);
  const d = await st.atletaCargar(a.token); assert.equal(d.acceso.abierto, false); assert.deepEqual(d.programas[0].dias[0].grupos, ['Cuádriceps']);
  const c = diaCasa(d.programas[0].dias[0]);
  await st.atletaGuardarCasa(a.token, { id: crypto.randomUUID(), fecha: hoy(), dia: c.nombre, programaNombre: 'En casa', series: [{ ejercicio: c.ejercicios[0].ejercicio, serie: 1, peso: 0, reps: 12 }] });
  const all = await st.cargarTodo(); assert.equal(all.sesiones[0].origen, 'casa');
});
console.log(`\n${ok} pruebas OK`);
