// Renombrar sin perder historial, tipo de serie, lados, músculos trabajados y periodización sugerida.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { crearStoreNube, crearStoreLocal } = await import('../src/data/store.js');
const { seriesPrevias, records, normEj, aFecha, fechaLocal } = await import('../src/lib/util.js');
const { renombrarEnSesiones, renombrarEnProgramas, sesionesCon } = await import('../src/lib/renombrar.js');
const { esUnilateral, filasUnilaterales, filasBilaterales, numeroFila, balanceLados, TECNICAS } = await import('../src/lib/series.js');
const { cargaMuscular, nivelDe } = await import('../src/lib/musculos.js');
const { analizar, programaDescarga, aplicarCargas, semanasSinDescarga, tendencia } = await import('../src/lib/periodizacion.js');
const { CUERPOS } = await import('../src/data/cuerpo.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const S = (ej, peso, reps, extra = {}) => ({ ejercicio: ej, grupo: 'Cuádriceps', serie: 1, peso, reps, rpe: 8, ...extra });

await t('corregir el nombre pasa el historial, las observaciones y las otras rutinas al nombre nuevo', async () => {
  const ses = [
    { id: 'a', fecha: '2026-10-01', series: [S('Sentadila hack', 100, 10), S('Prensa', 150, 10)], notas: { 'Sentadila hack': 'Rodilla bien' } },
    { id: 'b', fecha: '2026-10-08', series: [S('Prensa', 160, 10)], notas: {} },
    { id: 'c', fecha: '2026-10-15', series: [S('sentadila HACK', 105, 10)], notas: {} },
  ];
  assert.equal(sesionesCon(ses, 'Sentadila hack').length, 2, 'cuenta también la escrita distinto');
  const r = renombrarEnSesiones(ses, 'Sentadila hack', 'Hack squat', 'Cuádriceps / Glúteo');
  assert.deepEqual(r.map((s) => s.id), ['a', 'c'], 'solo cambian las sesiones que lo tienen');
  assert.equal(r[0].series[0].ejercicio, 'Hack squat'); assert.equal(r[0].series[0].grupo, 'Cuádriceps / Glúteo'); assert.equal(r[0].series[1].ejercicio, 'Prensa');
  assert.deepEqual(r[0].notas, { 'Hack squat': 'Rodilla bien' });
  // el historial se encuentra con el nombre nuevo: mismo récord y misma "vez pasada"
  const despues = ses.map((s) => r.find((x) => x.id === s.id) || s);
  assert.equal(records(despues, 'Hack squat').maxPeso, 105); assert.equal(seriesPrevias(despues, 'Hack squat').fecha, '2026-10-15');
  assert.equal(records(ses, 'Hack squat').maxPeso, 0, 'antes de corregir, el nombre nuevo no tenía historial');
  const ps = [{ id: 'p1', dias: [{ id: 'd', ejercicios: [{ id: 'e', ejercicio: 'Sentadila hack', grupo: 'Cuádriceps' }, { id: 'f', ejercicio: 'Prensa' }] }] }, { id: 'p2', dias: [{ id: 'd', ejercicios: [{ id: 'g', ejercicio: 'Prensa' }] }] }, { id: 'p3', dias: [{ id: 'd', ejercicios: [{ id: 'h', ejercicio: 'Sentadila hack' }] }] }];
  const rp = renombrarEnProgramas(ps, 'Sentadila hack', 'Hack squat', null, 'p3');
  assert.deepEqual(rp.map((p) => p.id), ['p1']); assert.equal(rp[0].dias[0].ejercicios[0].ejercicio, 'Hack squat'); assert.equal(rp[0].dias[0].ejercicios[0].grupo, 'Cuádriceps');
});

for (const modo of ['nube', 'local']) {
  await t(`${modo}: guardarSesiones actualiza varias sesiones de una vez (con lado y tipo de serie)`, async () => {
    let st;
    if (modo === 'nube') { const db = await crearDB(); await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','c@bt.com')`); st = crearStoreNube({ url: 'x', key: 'y' }, fakeSupabase(db)); await st.auth.entrar('c@bt.com', 'x'); }
    else { localStorage._ = {}; st = crearStoreLocal(); }
    const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Ana', token: 'a'.repeat(32), datos: { sexo: 'F' } });
    const s1 = await st.guardarSesion({ id: crypto.randomUUID(), asesoradoId: a.id, fecha: '2026-10-01', dia: 'Pierna', series: [S('Sentadila', 80, 8)], notas: {} });
    const s2 = await st.guardarSesion({ id: crypto.randomUUID(), asesoradoId: a.id, fecha: '2026-10-08', dia: 'Pierna', series: [S('Sentadila', 82, 8, { lado: 'D', tecnica: 'dropset' })], notas: {} });
    const g = await st.guardarSesiones(renombrarEnSesiones([s1, s2], 'Sentadila', 'Sentadilla búlgara'));
    assert.equal(g.length, 2);
    const todo = await st.cargarTodo();
    assert.deepEqual(todo.sesiones.map((s) => s.series[0].ejercicio).sort(), ['Sentadilla búlgara', 'Sentadilla búlgara']);
    const x = todo.sesiones.find((s) => s.id === s2.id).series[0]; assert.equal(x.lado, 'D'); assert.equal(x.tecnica, 'dropset');
    // el asesorado recibe su sexo para la silueta
    const d = await st.atletaCargar(a.token, { coach: true });
    assert.equal(d.asesorado.sexo, 'F');
  });
}

await t('tipo de serie y lados: filas, numeración y "la vez pasada" por lado', async () => {
  assert.deepEqual(TECNICAS.map((x) => x.k), ['rest-pause', 'dropset', 'superserie', 'ascendente', 'descendente']);
  assert.ok(esUnilateral({ ejercicio: 'Sentadilla búlgara' })); assert.ok(esUnilateral({ ejercicio: 'Remo a una mano' })); assert.ok(esUnilateral({ ejercicio: 'Single leg RDL' }));
  assert.ok(!esUnilateral({ ejercicio: 'Sentadilla' })); assert.ok(!esUnilateral({ ejercicio: 'Sentadilla búlgara', unilateral: false }), 'el coach manda');
  assert.ok(esUnilateral({ ejercicio: 'Curl', unilateral: true }));
  assert.equal(normEj({ ejercicio: 'Curl', unilateral: true }).unilateral, true); assert.equal('unilateral' in normEj({ ejercicio: 'Curl' }), false);
  const f = filasUnilaterales([{ peso: 20, reps: 10 }, { peso: 22, reps: 8 }]);
  assert.deepEqual(f.map((x) => x.lado), ['D', 'I', 'D', 'I']); assert.deepEqual(f.map((_, i) => numeroFila(f, i)), [1, 1, 2, 2]);
  assert.deepEqual(filasBilaterales(f), [{ peso: 20, reps: 10 }, { peso: 22, reps: 8 }]);
  const hist = [{ fecha: '2026-10-20', series: [S('Búlgara', 20, 10, { lado: 'D', tecnica: 'rest-pause' }), S('Búlgara', 20, 8, { lado: 'I' })] }];
  const prev = seriesPrevias(hist, 'Búlgara');
  assert.deepEqual(prev.series.map((x) => [x.lado, x.reps, x.tecnica || '']), [['D', 10, 'rest-pause'], ['I', 8, '']]);
  const b = balanceLados(hist, 'Búlgara'); assert.equal(b.fuerte, 'D'); assert.equal(b.dif, 20);
});

await t('músculos trabajados: reparte las series por zona y la escala de color', async () => {
  const c = cargaMuscular([S('Hip thrust', 100, 10, { grupo: 'Glúteo' }), S('Hip thrust', 100, 10, { grupo: 'Glúteo' }), S('Búlgara', 20, 10, { grupo: 'Cuádriceps / Glúteo', lado: 'D' }), S('Búlgara', 20, 10, { grupo: 'Cuádriceps / Glúteo', lado: 'I' }), S('Press', 60, 8, { grupo: 'Pecho' })]);
  assert.equal(c.vistas.espalda.gluteal, 3, '2 de glúteo + 1 de búlgara (media por lado)');
  assert.equal(c.vistas.frente.quadriceps, 1); assert.equal(c.vistas.frente.chest, 1); assert.ok(c.vistas.frente.triceps > 0 && c.vistas.frente.triceps < 1, 'el tríceps ayuda en el press');
  assert.deepEqual(c.grupos.map((g) => [g.grupo, g.series]), [['Glúteo', 2], ['Pecho', 1], ['Cuádriceps / Glúteo', 1]], 'empate de series: primero el de más kilos');
  assert.deepEqual([0, 1, 3, 5, 9].map(nivelDe), [0, 1, 2, 3, 4]);
  // todas las zonas que se pintan existen en las cuatro siluetas
  for (const sexo of ['masculino', 'femenino']) for (const v of ['frente', 'espalda']) {
    const slugs = new Set(CUERPOS[sexo][v].partes.map((p) => p.slug));
    Object.keys(c.vistas[v]).forEach((k) => assert.ok(slugs.has(k), `${sexo} ${v} sin ${k}`));
  }
});

// ---------- periodización ----------
const REF = '2026-10-27';
const menos = (d) => { const x = aFecha(REF); x.setDate(x.getDate() - d); return fechaLocal(x); };
const PROG = { id: 'p1', asesoradoId: 'x', nombre: 'Fuerza · 3 días', visible: true, orden: 0, dias: [{ id: 'd1', nombre: 'Pierna', ejercicios: [
  { id: 'e1', ejercicio: 'Sentadilla', grupo: 'Cuádriceps', tipo: 'reps', series: 4, repMin: 6, repMax: 8, rpe: 8, pesoSugerido: '100 kg' },
  { id: 'e2', ejercicio: 'Press banca', grupo: 'Pecho', tipo: 'reps', series: 3, repMin: 8, repMax: 10, rpe: 8, pesoSugerido: '' },
  { id: 'e3', ejercicio: 'Remo', grupo: 'Espalda alta', tipo: 'reps', series: 3, repMin: 8, repMax: 12, rpe: 8, pesoSugerido: '60' }] }, { id: 'd2', nombre: 'Torso', ejercicios: [] }, { id: 'd3', nombre: 'Full', ejercicios: [] }] };
// semanas de entreno: 3 sesiones por semana; f(semana) da [sentadilla, banca, remo] kg y RPE
function historial(semanas, f, hasta = 0) {
  const out = [];
  for (let w = semanas - 1; w >= 0; w--) for (const d of [5, 3, 1]) {
    const dias = hasta + w * 7 + d; const i = semanas - 1 - w; const [sq, bp, rw, rpe, reps = 8] = f(i);
    out.push({ id: `s${dias}`, asesoradoId: 'x', programaId: 'p1', dia: 'Pierna', fecha: menos(dias), series: [
      ...[1, 2, 3, 4].map((n) => ({ ejercicio: 'Sentadilla', grupo: 'Cuádriceps', serie: n, peso: sq, reps, rpe })),
      ...[1, 2, 3].map((n) => ({ ejercicio: 'Press banca', grupo: 'Pecho', serie: n, peso: bp, reps, rpe })),
      ...[1, 2, 3].map((n) => ({ ejercicio: 'Remo', grupo: 'Espalda alta', serie: n, peso: rw, reps: 12, rpe: Math.min(rpe, 8) }))] });
  }
  return out;
}
const A = { id: 'x', nombre: 'Leo Prueba', nivel: 'Intermedio' };

await t('periodización: progresando → seguir y subir cargas donde llegó al tope', async () => {
  const ses = historial(4, (i) => [100 + i * 2.5, 60 + i * 1.25, 60 + i * 1.25, 8]);
  const r = analizar(A, ses, [PROG], REF);
  assert.equal(r.estado, 'progresando', r.resumen); assert.ok(r.metricas.tendencia > 1); assert.equal(r.metricas.porSem, 3); assert.equal(r.metricas.meta, 3);
  assert.equal(r.accion, 'cargas'); assert.deepEqual(r.subidas.map((x) => [x.ejercicio, x.de, x.a]), [['Sentadilla', 107.5, 112.5], ['Remo', 63.75, 66.5]], 'remo a 12 (tope) y sentadilla a 8 (tope)');
  const p2 = aplicarCargas(PROG, r.subidas);
  assert.equal(p2.dias[0].ejercicios[0].pesoSugerido, '112,5 kg'); assert.equal(p2.dias[0].ejercicios[1].pesoSugerido, '', 'banca no llegó al tope (8 de 10)');
  assert.ok(r.plan.pasos.length >= 4);
});

await t('periodización: muchas semanas sin descargar, fuerza plana y RPE subiendo → descarga', async () => {
  const ses = historial(7, (i) => [110, 70, 60, i < 5 ? 8 : 9.5]);
  assert.equal(semanasSinDescarga(ses, REF), 7);
  const r = analizar(A, ses, [PROG], REF);
  assert.equal(r.estado, 'descarga', r.resumen); assert.match(r.resumen, /7 semanas/); assert.equal(r.accion, 'descarga');
  const d = programaDescarga(PROG);
  assert.equal(d.visible, false); assert.match(d.nombre, /^Descarga/); assert.notEqual(d.id, PROG.id);
  assert.deepEqual(d.dias[0].ejercicios.map((e) => e.series), [2, 2, 2]); assert.ok(d.dias[0].ejercicios.every((e) => e.rpe <= 7));
  assert.equal(d.dias[0].ejercicios[0].pesoSugerido, '88 kg'); assert.equal(d.dias[0].ejercicios[2].pesoSugerido, '53 kg');
  assert.notEqual(d.dias[0].ejercicios[0].id, PROG.dias[0].ejercicios[0].id);
});

await t('periodización: una semana suave cuenta como descarga', async () => {
  const ses = historial(7, () => [110, 70, 60, 8]).filter((s) => !(s.fecha < menos(14) && s.fecha >= menos(21)) || s.id.endsWith('5'));
  assert.equal(semanasSinDescarga(ses, REF), 2);
});

await t('periodización: 4 semanas sin progreso → estancado con bloque y pasos', async () => {
  const r = analizar(A, historial(4, () => [110, 70, 60, 8, 6]), [PROG], REF);
  assert.equal(r.estado, 'estancado', r.resumen); assert.match(r.plan.nombre, /acumulación/); assert.equal(r.plan.semanas.length, 4);
  const r2 = analizar(A, historial(4, () => [110, 70, 60, 8, 10]), [PROG], REF);
  assert.match(r2.plan.nombre, /intensificación/, 'si ya entrena en rangos altos, toca más carga');
});

await t('periodización: retomar, recién empieza y sin datos', async () => {
  assert.equal(analizar(A, historial(4, () => [110, 70, 60, 8]), [PROG], REF).estado !== 'retomar', true);
  assert.equal(analizar(A, historial(4, () => [110, 70, 60, 8], 20), [PROG], REF).estado, 'retomar');
  assert.equal(analizar(A, historial(1, () => [110, 70, 60, 8]), [PROG], REF).estado, 'adaptacion');
  const v = analizar(A, [], [PROG], REF); assert.equal(v.estado, 'sin-datos'); assert.ok(v.plan.pasos.length);
  assert.equal(tendencia([{ fecha: '2026-10-01', v: 100 }, { fecha: '2026-10-03', v: 110 }, { fecha: '2026-10-05', v: 120 }]), null, 'menos de 10 días no alcanza');
});

await t('periodización: avisa constancia baja y músculos con poco volumen', async () => {
  const ses = historial(4, (i) => [100 + i * 2.5, 60 + i * 1.25, 60 + i, 8]).filter((_, i) => i % 3 === 0);
  const r = analizar(A, ses, [PROG], REF);
  assert.ok(r.notas.some((n) => /días por semana de 3/.test(n)), r.notas.join('\n'));
  assert.ok(r.notas.some((n) => /Pocas series semanales/.test(n)));
});
console.log(`\n${ok} pruebas OK`);
