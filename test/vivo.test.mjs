// En vivo, avisos de valores raros y mensajes de mérito.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { crearStoreNube, crearStoreLocal } = await import('../src/data/store.js');
const { revisarSerie } = await import('../src/lib/validar.js');
const { merito } = await import('../src/lib/merito.js');
const { hoy } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

await t('avisa valores incongruentes y deja pasar los normales', async () => {
  const ej = { repMin: 8, repMax: 12 }; const h = { maxPeso: 60, maxE1: 76 };
  assert.equal(revisarSerie({ peso: '60', reps: '10', rpe: '8' }, ej, h), null);
  assert.equal(revisarSerie({ peso: '62,5', reps: '8', rpe: '' }, ej, h), null);
  assert.match(revisarSerie({ peso: '600', reps: '10' }, ej, h).texto, /no es realista/);
  assert.match(revisarSerie({ peso: '95', reps: '8' }, ej, h).texto, /máximo aquí es 60/);
  assert.match(revisarSerie({ peso: '6', reps: '10' }, ej, h).texto, /muy poco/);
  assert.match(revisarSerie({ peso: '60', reps: '100' }, ej, h).texto, /demasiado/);
  assert.match(revisarSerie({ peso: '60', reps: '40' }, ej, h).texto, /rango/);
  assert.match(revisarSerie({ peso: '60', reps: '10', rpe: '15' }, ej, h).texto, /1 a 10/);
  assert.match(revisarSerie({ peso: '6o', reps: '10' }, ej, h).texto, /números/);
  assert.match(revisarSerie({ peso: '60', reps: '', hecha: true }, ej, h).texto, /Falta/);
  assert.equal(revisarSerie({ peso: '20', reps: '10' }, ej, {}), null); // sin historial no molesta
  assert.match(revisarSerie({ seg: '2000' }, { tipo: 'tiempo' }, {}).texto, /15 minutos/);
});
await t('mensajes de mérito: técnicos, variados y estables', async () => {
  for (const k of ['record', 'volumen', 'fuerza', 'constancia', 'composicion']) { const m = merito(k, 'x'); assert.ok(m.length > 40, k); assert.equal(m, merito(k, 'x')); }
  assert.ok(new Set(['a', 'b', 'c', 'd', 'e'].map((s) => merito('record', s))).size > 1); assert.equal(merito('otro'), '');
});
for (const modo of ['nube', 'local']) {
  await t(`${modo}: el coach ve en vivo lo que registra el asesorado`, async () => {
    let st, entrar = async () => {}, salir = async () => {};
    if (modo === 'nube') { const db = await crearDB(); await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','c@bt.com')`); st = crearStoreNube({ url: 'x', key: 'y' }, fakeSupabase(db)); entrar = () => st.auth.entrar('c@bt.com', 'x'); salir = () => st.auth.salir(); await entrar(); }
    else { localStorage._ = {}; st = crearStoreLocal(); }
    const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Leo Vivo', token: 'v'.repeat(32), datos: {} });
    const c = await st.nuevoCodigo(a.id); await salir();
    assert.equal(await st.atletaProgreso(a.token, { dia: 'Pierna' }), false); // sin abrir no manda nada
    await st.atletaAbrir(a.token, c.codigo);
    assert.equal(await st.atletaProgreso(a.token, { dia: 'Pierna', hechas: 3, total: 12, ejercicios: [{ ejercicio: 'Sentadilla', series: [{ peso: '80', reps: '8', hecha: true }] }] }), true);
    await entrar(); let v = await st.entrenandoAhora();
    assert.equal(v.length, 1); assert.equal(v[0].asesoradoId, a.id); assert.equal(v[0].progreso.hechas, 3); assert.ok(v[0].progresoAt); assert.equal(v[0].usado, null);
    await salir(); const d = await st.atletaCargar(a.token);
    await st.atletaGuardarSesion(a.token, { id: crypto.randomUUID(), fecha: hoy(), dia: 'Pierna', series: [{ ejercicio: 'Sentadilla', serie: 1, peso: 80, reps: 8 }], permiso: d.acceso.permiso });
    await entrar(); v = await st.entrenandoAhora(); assert.ok(v[0].usado, 'debía quedar como terminado');
    // editar a mano una sesión ya guardada
    const ses = (await st.cargarTodo()).sesiones[0];
    await st.guardarSesion({ ...ses, fecha: ses.fecha, series: [{ ejercicio: 'Sentadilla', serie: 1, peso: 82.5, reps: 8 }, { ejercicio: 'Sentadilla', serie: 2, peso: 82.5, reps: 7 }] });
    const e = (await st.cargarTodo()).sesiones.find((x) => x.id === ses.id); assert.equal(e.series.length, 2); assert.equal(e.series[0].peso, 82.5); assert.equal(e.origen, 'asesorado');
  });
}
console.log(`\n${ok} pruebas OK`);
