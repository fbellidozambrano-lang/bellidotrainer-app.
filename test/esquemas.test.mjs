// Forma de hacer las series: top set + back off, rectas, rampa, pirámides, por RPE y aproximación;
// el análisis en vivo según el tipo de serie y la migración que deja a los asesorados en back off.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import fs from 'node:fs';
const E = await import('../src/lib/esquemas.js');
const { normEj, volumen, records } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const txt = (f) => f.map((x) => `${x.pl.t === 'a' ? 'A' : ''}${x.peso}x${x.reps}${x.rol ? `·${x.rol}` : ''}`).join(' ');

const ej = { id: 'e1', ejercicio: 'Sentadilla', grupo: 'Cuádriceps', tipo: 'reps', series: 4, repMin: 6, repMax: 10, rpe: 8, pesoSugerido: '100', repsSugeridas: '6' };
const hist = [{ fecha: '2026-10-20', series: [
  { ejercicio: 'Sentadilla', serie: 1, peso: 100, reps: 6, rol: 'top', aprox: [{ peso: 50, reps: 8 }] },
  { ejercicio: 'Sentadilla', serie: 2, peso: 90, reps: 6, rol: 'bo' }, { ejercicio: 'Sentadilla', serie: 3, peso: 81, reps: 6, rol: 'bo' }] }];

await t('sin esquema el ejercicio queda en series rectas; tiempo no lleva esquema', () => {
  assert.equal(E.esquemaDe(ej).k, 'recto'); assert.equal(E.esquemaDe({ ...ej, esquema: 'recto' }).k, 'recto');
  assert.equal(E.esquemaDe(ej, { esquema: 'rampa' }).k, 'rampa', 'el del asesorado manda si el ejercicio no tiene');
  assert.equal(E.esquemaDe({ ...ej, tipo: 'tiempo' }), null);
  const n = normEj({ ...ej, esquema: 'backoff', esq: { paso: 7.5, aprox: 2, raro: 1 } });
  assert.deepEqual([n.esquema, n.esq], ['backoff', { paso: 7.5, aprox: 2 }]);
  assert.equal(normEj({ ...ej, esquema: 'inventado' }).esquema, undefined); assert.equal(normEj({ ...ej, tipo: 'tiempo', esquema: 'recto' }).esquema, undefined);
  assert.deepEqual(E.guardarEsquema(E.esquemaDe(ej)), { esquema: 'recto' });
});

await t('plan de cada esquema: pesos y reps de cada serie', () => {
  const c = (k, esq) => E.esquemaDe({ ...ej, esquema: k, esq });
  assert.equal(txt(E.armarFilas(ej, [], c('backoff', { aprox: 2 }))), 'A50x8 A75x4 100x6·top 90x6·bo 81x6·bo 73x6·bo');
  assert.equal(txt(E.armarFilas(ej, [], c('backoff', { modo: 'reps', dReps: 2 }))), '100x6·top 100x4·bo 100x2·bo 100x1·bo');
  assert.equal(txt(E.armarFilas(ej, [], c('recto'))), '100x6 100x6 100x6 100x6');
  const e5 = { ...ej, series: 5 };
  assert.equal(txt(E.armarFilas(e5, [], c('rampa'))), '65.5x10 73x9 81x8 90x7 100x6·max');
  assert.equal(txt(E.armarFilas(e5, [], c('inversa'))), '100x6·max 90x7 81x8 73x9 65.5x10');
  assert.equal(txt(E.armarFilas(e5, [], c('piramide'))), '81x8 90x7 100x6·max 90x7 81x8');
  assert.equal(txt(E.armarFilas({ ...ej, pesoSugerido: '', repsSugeridas: '', series: 3 }, hist, c('backoff'))), '100x6·top 90x6·bo 81x6·bo', 'sin sugerido parte de su top set anterior');
  const uni = E.armarFilas({ ...ej, series: 2, unilateral: true }, [], c('backoff', { aprox: 1 }));
  assert.deepEqual(uni.map((x) => `${x.pl.t}${x.pl.i}${x.lado}`), ['a0D', 'a0I', 'e0D', 'e0I', 'e1D', 'e1I']);
});

await t('al escribir el top set, los back off y la aproximación se reajustan; lo marcado no se toca', () => {
  const cfg = E.esquemaDe({ ...ej, esquema: 'backoff', esq: { aprox: 1 } });
  let f = E.armarFilas(ej, [], cfg); f[2] = { ...f[2], hecha: true };
  f = f.map((x, i) => (i === 1 ? { ...x, peso: '110', ap: false, tocada: true } : x)); f = E.recalcular(f, cfg, ej);
  assert.equal(txt(f), 'A66x5 110x6·top 90x6·bo 81x6·bo 73x6·bo', 'cada serie sigue a la más cercana que ya hizo o escribió');
  f = f.map((x, i) => (i === 3 ? { ...x, peso: '85', ap: false, tocada: true } : x)); f = E.recalcular(f, cfg, ej);
  assert.equal(f[4].peso, 76.5, 'desde un back off escrito a mano, el siguiente sigue bajando 10 %');
  assert.equal(E.filasMasSerie(f, cfg, ej).at(-1).peso, 69, 'una serie más continúa el back off');
  assert.equal(E.filasMasSerie(f, cfg, ej)[4].peso, 76.5, 'y no deshace lo que siguió al back off escrito');
  assert.equal(E.filasMenosSerie(E.armarFilas({ ...ej, series: 1 }, [], cfg), cfg, ej).length, 2, 'no se queda sin series efectivas');
});

await t('por RPE: la siguiente serie sube o baja según cómo costó', () => {
  const e = { ...ej, esquema: 'rpe' }; const cfg = E.esquemaDe(e);
  let f = E.armarFilas(e, [], cfg); f[0] = { ...f[0], rpe: '9,5', hecha: true }; f = E.ajustarPorRpe(f, e);
  assert.deepEqual(f.map((x) => x.peso), [100, 95.5, 95.5, 95.5]);
  assert.match(E.analizarFila({ cfg, filas: f, k: 0, prev: null, ej: e }).texto, /RPE 9,5 sobre el objetivo \(8\): la siguiente baja a 95,5 kg/);
  f[1] = { ...f[1], rpe: '6', hecha: true }; f = E.ajustarPorRpe(f, e); assert.equal(f[2].peso, 101);
  assert.match(E.analizarFila({ cfg, filas: f, k: 1, prev: null, ej: e }).texto, /sobró margen, la siguiente sube a 101 kg/);
});

await t('análisis en vivo de top set + back off', () => {
  const e = { ...ej, esquema: 'backoff', pesoSugerido: '', repsSugeridas: '', series: 3 }; const cfg = E.esquemaDe(e); const prev = { series: hist[0].series };
  let f = E.armarFilas(e, hist, cfg).map((x, i) => ({ ...x, hecha: true, peso: i === 0 ? 102.5 : x.peso, reps: i === 2 ? 4 : x.reps }));
  const a = f.map((_, k) => E.analizarFila({ cfg, filas: f, k, prev, ej: e }).texto);
  assert.equal(a[0], '▲ +2,5 % de fuerza vs. tu top set anterior (100 × 6 kg)');
  assert.match(a[1], /^−12 % del top · 6 de 6 reps ✓ · ±0 % vs\. este back off la vez pasada$/);
  assert.match(a[2], /4 de 6 reps \(faltaron 2\)/); assert.equal(E.analizarFila({ cfg, filas: f, k: 2, prev, ej: e }).clase, 'baja');
  f = f.map((x, i) => (i === 1 ? { ...x, peso: 105 } : x));
  assert.match(E.analizarFila({ cfg, filas: f, k: 1, prev, ej: e }).texto, /Pesa más que tu top set/);
  const r = E.analizarEjercicio({ cfg, filas: E.armarFilas(e, hist, cfg).map((x, i) => ({ ...x, hecha: true, reps: i ? 7 : 6 })), prev, rec: records(hist, 'Sentadilla'), ej: e });
  assert.deepEqual(r.partes.map((x) => `${x.t} ${x.txt}`), ['Top set ±0 %', 'back off +16,7 % de volumen']); assert.equal(r.clase, '');
});

await t('análisis en vivo de series rectas, rampa y aproximación', () => {
  const e = { ...ej, esquema: 'recto', series: 3, esq: { aprox: 1 } }; const cfg = E.esquemaDe(e);
  const prev = { series: [{ peso: 100, reps: 8 }, { peso: 100, reps: 8 }, { peso: 100, reps: 7 }] };
  const f = E.armarFilas(e, [], cfg).map((x, i) => ({ ...x, hecha: true, reps: [5, 8, 8, 5][i] }));
  assert.match(E.analizarFila({ cfg, filas: f, k: 0, prev, ej: e }).texto, /^Aproximación al 60 % de tu serie principal/);
  assert.match(E.analizarFila({ cfg, filas: f, k: 3, prev, ej: e }).texto, /3 reps menos que la serie 1: alarga el descanso/);
  const r = E.analizarEjercicio({ cfg, filas: f, prev, ej: e });
  assert.equal(r.partes[0].t, 'Volumen'); assert.equal(r.partes[0].txt, '−8,7 % en las mismas series', 'la aproximación no cuenta');
  const er = { ...ej, esquema: 'rampa', series: 3 }; const cr = E.esquemaDe(er);
  const fr = E.armarFilas(er, [], cr).map((x) => ({ ...x, hecha: true }));
  assert.match(E.analizarFila({ cfg: cr, filas: fr, k: 0, prev: null, ej: er }).texto, /^−19 % de la serie más pesada/);
  assert.match(E.analizarFila({ cfg: cr, filas: fr, k: 2, prev: null, ej: er }).texto, /^Serie más pesada de hoy/);
});

await t('la aproximación se guarda dentro de la primera serie y no suma volumen', () => {
  const s = { series: hist[0].series };
  assert.equal(volumen(s), 100 * 6 + 90 * 6 + 81 * 6);
  assert.equal(records(hist, 'Sentadilla').maxPeso, 100);
  assert.deepEqual(E.clavePrevia(hist[0].series), hist[0].series[0]);
  const ps = E.aplicarEsquemaProgramas([{ id: 'p', dias: [{ id: 'd', ejercicios: [{ ...ej, esquema: 'backoff', esq: { paso: 15 } }, { ...ej, id: 'pl', tipo: 'tiempo' }] }] }], E.esquemaDe({ esquema: 'recto' }));
  assert.deepEqual(ps[0].dias[0].ejercicios.map((x) => [x.esquema, x.esq]), [['recto', undefined], [undefined, undefined]]);
  const casa = fs.readFileSync(new URL('../src/data/casa.js', import.meta.url), 'utf8'); assert.match(casa, /esquema: 'recto'/, 'en casa: series rectas');
});

await t('migración: todos los asesorados, rutinas y plantillas vuelven a series rectas una sola vez', async () => {
  const db = await crearDB();
  const coach = '00000000-0000-0000-0000-0000000000c1';
  await db.query(`insert into auth.users (id) values ($1)`, [coach]);
  await db.query(`delete from public.migraciones`); // una base de antes del cambio
  const ins = await db.query(`insert into public.asesorados (coach_id, nombre, datos) values ($1, 'Ana', '{"sexo":"F","esquema":"backoff","esq":{"aprox":2}}'), ($1, 'Luis', '{}') returning id, nombre`, [coach]);
  const ana = ins.rows.find((x) => x.nombre === 'Ana').id;
  const dias = [{ id: 'd1', nombre: 'Pierna', ejercicios: [{ id: 'a', ejercicio: 'Sentadilla', tipo: 'reps', esquema: 'backoff', esq: { paso: 15 } }, { id: 'b', ejercicio: 'Plancha', tipo: 'tiempo' }, { id: 'c', ejercicio: 'Prensa', esquema: 'piramide' }, { id: 'd', ejercicio: 'Curl' }] }, { id: 'd2', nombre: 'Vacío', ejercicios: [] }];
  await db.query(`insert into public.programas (coach_id, asesorado_id, nombre, dias) values ($1, $2, 'Plan', $3)`, [coach, ana, JSON.stringify(dias)]);
  await db.query(`insert into public.plantillas (coach_id, nombre, dias) values ($1, 'Base', $2)`, [coach, JSON.stringify(dias)]);
  const sql = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8'); await db.exec(sql);
  for (const tabla of ['programas', 'plantillas']) {
    const p = (await db.query(`select dias from public.${tabla}`)).rows[0].dias;
    assert.deepEqual(p[0].ejercicios.map((x) => [x.id, x.esquema ?? null, x.esq ?? null]), [['a', 'recto', null], ['b', null, null], ['c', 'recto', null], ['d', 'recto', null]], tabla);
    assert.deepEqual(p.map((d) => d.id), ['d1', 'd2'], 'el orden y los días vacíos se conservan');
  }
  const as = (await db.query(`select nombre, datos from public.asesorados order by nombre`)).rows;
  assert.deepEqual(as.map((x) => [x.nombre, x.datos.esquema, x.datos.esq ?? null, x.datos.sexo ?? null]), [['Ana', 'recto', null, 'F'], ['Luis', 'recto', null, null]]);
  const tok = (await db.query(`select token from public.asesorados where nombre = 'Ana'`)).rows[0].token;
  assert.equal((await db.query(`select public.atleta_cargar($1) as r`, [tok])).rows[0].r.asesorado.esquema, 'recto', 'la app del asesorado recibe su esquema');
  // después el coach elige back off para Ana: volver a correr el archivo no lo deshace
  await db.query(`update public.programas set dias = public._dias_con_esquema(dias, 'backoff')`);
  await db.exec(sql);
  assert.equal((await db.query(`select dias from public.programas`)).rows[0].dias[0].ejercicios[0].esquema, 'backoff');
  assert.equal(E.ESQUEMA_DEF, 'recto'); assert.equal(E.esquemaDe({ tipo: 'reps' }).k, 'recto', 'lo nuevo empieza en series rectas');
});

await t('el asesorado solo ve progreso positivo; el coach ve todo', () => {
  assert.equal(E.filaPositiva({ texto: '▼ −3 % vs. la vez pasada', clase: 'baja' }), null);
  assert.equal(E.filaPositiva({ texto: '= ±0 % vs. la vez pasada', clase: '' }), null);
  assert.equal(E.filaPositiva({ texto: '▲ +2 % de fuerza · debajo del rango 8–10', clase: 'sube' }).texto, '▲ +2 % de fuerza');
  assert.equal(E.filaPositiva({ texto: '−10 % del top · 6 de 6 reps ✓ · ±0 % vs. este back off la vez pasada', clase: 'sube' }).texto, '−10 % del top · 6 de 6 reps ✓');
  assert.ok(E.filaPositiva({ texto: 'Aproximación al 50 %', clase: 'aprox' }));
  const r = { partes: [{ t: 'Top set', v: 2, txt: '+2 %' }, { t: 'back off', v: -4, txt: '−4 % de volumen' }], record: null, clase: 'sube' };
  assert.deepEqual(E.ejercicioPositivo(r).partes.map((x) => x.t), ['Top set']);
  assert.equal(E.ejercicioPositivo({ partes: [{ t: 'Volumen', v: -3, txt: '−3 %' }], record: null, clase: 'baja' }), null);
  assert.equal(E.ejercicioPositivo({ partes: [{ t: 'Volumen', v: -3, txt: '−3 %' }], record: 1.5, clase: 'record' }).partes.length, 0);
});

console.log(`\n${ok} pruebas de esquemas de series OK`);
