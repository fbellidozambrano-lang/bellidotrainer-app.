// Carga y reps sugeridas con % de su 1RM, sub-series (drop set, rest-pause, superserie, pirámides) y progreso en vivo.
import assert from 'node:assert/strict';
const P = await import('../src/lib/progreso.js');
const { records, mejorSerie, volumen, seriesPrevias, normEj, textoSugerencia } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

const hist = [
  { fecha: '2026-10-13', series: [{ ejercicio: 'Press banca', serie: 1, peso: 72.5, reps: 8 }] },
  { fecha: '2026-10-20', series: [{ ejercicio: 'Press banca', serie: 1, peso: 76, reps: 8 }, { ejercicio: 'Press banca', serie: 2, peso: 70, reps: 10, tecnica: 'dropset', subs: [{ peso: 60, reps: 6, pct: -14 }] },
    { ejercicio: 'Press banca', serie: 3, peso: 60, reps: 12, tecnica: 'superserie', subs: [{ ejercicio: 'Fondos', peso: 0, reps: 15 }] }] },
];

await t('reps sugeridas: se guardan en el ejercicio y se muestran con la carga', () => {
  const e = normEj({ ejercicio: 'Press banca', pesoSugerido: '80', repsSugeridas: ' 8 ' });
  assert.equal(e.repsSugeridas, '8'); assert.equal(textoSugerencia(e), '80 kg × 8 reps');
  assert.equal(textoSugerencia({ pesoSugerido: 'banda verde', repsSugeridas: '12-15' }), 'banda verde × 12–15 reps');
  assert.equal(textoSugerencia({ repsSugeridas: '10' }), '10 reps'); assert.equal(normEj({}).repsSugeridas, '');
});

await t('carga sugerida: % de su 100 % (1RM) y cambio desde la vez pasada', () => {
  const a = P.ajusteSugerido({ ejercicio: 'Press banca', pesoSugerido: '80 kg', repsSugeridas: '8' }, hist);
  const e1 = 76 * (1 + 8 / 30); assert.ok(Math.abs(a.e1 - e1) < 1e-9, 'el 1RM sale de su mejor serie');
  assert.ok(Math.abs(a.pct1RM - (80 / e1) * 100) < 1e-9); assert.ok(Math.abs(a.pct1RMantes - (76 / e1) * 100) < 1e-9);
  assert.equal(a.cambioKg, 4); assert.ok(Math.abs(a.cambioPct - (4 / 76) * 100) < 1e-9); assert.equal(a.top.peso, 76);
  assert.ok(a.exigencia > 100, '80 × 8 supera su mejor marca');
  assert.equal(P.ajusteSugerido({ ejercicio: 'Press banca', pesoSugerido: 'máquina 3' }, hist).carga, 0, 'un texto no se compara');
  assert.equal(P.ajusteSugerido({ ejercicio: 'Press banca', pesoSugerido: '100 lb' }, hist).carga, 45.4);
  assert.equal(P.ajusteSugerido({ ejercicio: 'Nuevo', pesoSugerido: '20' }, hist).pct1RM, undefined, 'sin historial no hay %');
});

await t('sub-series: drop set baja 15 % desde el tramo anterior, rest-pause mismo peso, superserie otro ejercicio', () => {
  assert.deepEqual(P.nuevasSubs('dropset', 2), [{ pct: -15, peso: '', reps: '' }, { pct: -15, peso: '', reps: '' }]);
  assert.deepEqual(P.nuevasSubs('ascendente', 1, 5), [{ pct: 5, peso: '', reps: '' }]);
  assert.deepEqual(P.nuevasSubs('rest-pause'), [{ pct: 0, peso: '', reps: '' }]);
  assert.deepEqual(P.nuevasSubs('superserie'), [{ ejercicio: '', peso: '', reps: '' }]);
  assert.deepEqual(P.nuevasSubs(''), []);
  const ps = P.pesosSubs('20', [{ pct: -15 }, { pct: -15 }]); assert.deepEqual(ps.map((x) => x.peso), [17, 14.5]); assert.ok(ps.every((x) => x.calculado));
  const ps2 = P.pesosSubs('20', [{ pct: -15, peso: '16' }, { pct: -15 }]); assert.equal(ps2[0].peso, 16); assert.equal(ps2[0].cambio, -20, 'lo escrito manda'); assert.equal(ps2[1].peso, 13.5, 'el siguiente baja desde 16');
  // se guarda solo lo que tiene reps, con el % real
  assert.deepEqual(P.subsParaGuardar(20, [{ pct: -15, peso: '', reps: '6' }, { pct: -15, peso: '', reps: '' }]), [{ peso: 17, reps: 6, pct: -15 }]);
  assert.deepEqual(P.subsParaGuardar(20, [{ ejercicio: ' Fondos ', peso: '', reps: '12' }]), [{ peso: 0, reps: 12, ejercicio: 'Fondos' }]);
});

await t('sub-series en marcas y volumen: cuentan las del mismo ejercicio; la superserie suma volumen pero no marcas', () => {
  assert.equal(volumen(hist[1]), 76 * 8 + 70 * 10 + 60 * 6 + 60 * 12 + 0);
  const r = records(hist, 'Press banca'); assert.equal(r.maxPeso, 76); assert.equal(r.maxVol, 76 * 8 + 70 * 10 + 60 * 6 + 60 * 12);
  const h2 = [...hist, { fecha: '2026-10-27', series: [{ ejercicio: 'Press banca', serie: 1, peso: 80, reps: 3, tecnica: 'ascendente', subs: [{ peso: 85, reps: 2, pct: 6 }] }] }];
  assert.equal(records(h2, 'Press banca').maxPeso, 85, 'la subida de la pirámide es su mayor peso'); assert.equal(mejorSerie(h2, 'Press banca').peso, 76);
  assert.deepEqual(seriesPrevias(hist, 'Press banca').series[1].subs, [{ peso: 60, reps: 6, pct: -14 }], 'la vez pasada trae sus sub-series');
});

await t('progreso en vivo: cada serie contra la misma de la vez pasada y el ejercicio contra su récord', () => {
  const p = P.progresoSerie({ peso: '80', reps: '8' }, { peso: 76, reps: 8 }); assert.ok(Math.abs(p.pct - (80 / 76 - 1) * 100) < 1e-9); assert.equal(p.antes, '76 × 8');
  assert.equal(P.progresoSerie({ peso: '76', reps: '8' }, { peso: 76, reps: 8 }).pct, 0);
  assert.ok(P.progresoSerie({ peso: '70', reps: '8' }, { peso: 76, reps: 8 }).pct < 0);
  assert.equal(P.progresoSerie({ seg: '50' }, { seg: 40 }, true).pct, 25); assert.equal(P.progresoSerie({ peso: 1, reps: 1 }, null), null);
  const e = P.progresoEjercicio([{ peso: '80', reps: '8', hecha: true }, { peso: '90', reps: '1', hecha: false }], hist, 'Press banca');
  assert.ok(e.vsAntes > 5 && e.vsRecord > 5, 'solo cuentan las series hechas o escritas');
  assert.equal(P.progresoEjercicio([{ peso: '80', reps: '8' }], hist, 'Press banca'), null);
  assert.equal(P.textoPct(5.26), '+5 %'); assert.equal(P.textoPct(-3.24, 1), '−3,2 %'); assert.equal(P.textoPct(0), '±0 %');
});
await t('reps sugeridas por rango: se guarda 8-10, se muestra 8–10 y dice qué tan exigente es cada punta', async () => {
  const { rangoReps, normRepsSug } = await import('../src/lib/util.js');
  assert.deepEqual(['8', '8-10', ' 8 a 10 ', '10–8', '8 reps', 'al fallo', ''].map(normRepsSug), ['8', '8-10', '8-10', '8-10', '8', 'al fallo', '']);
  assert.deepEqual(rangoReps('8-10'), { min: 8, max: 10 }); assert.deepEqual(rangoReps('8'), { min: 8, max: 8 }); assert.equal(rangoReps('al fallo'), null);
  assert.equal(textoSugerencia(normEj({ pesoSugerido: '52', repsSugeridas: '8 a 10' })), '52 kg × 8–10 reps');
  assert.equal(textoSugerencia({ pesoSugerido: '20', repsSugeridas: 'al fallo' }), '20 kg × al fallo');
  const a = P.ajusteSugerido({ ejercicio: 'Press banca', pesoSugerido: '80', repsSugeridas: '8-10' }, hist);
  assert.equal(a.reps, 8); assert.equal(a.repsMax, 10); assert.ok(a.exigenciaMax > a.exigencia && a.exigenciaMax > 100);
});

await t('peso que no existe en la máquina: el de abajo con más reps y el de arriba con menos', () => {
  assert.equal(P.pasoEquipo('Jalón al pecho'), 5); assert.equal(P.pasoEquipo('Press con mancuernas'), 2); assert.equal(P.pasoEquipo('Sentadilla con barra'), 2.5);
  const x = P.aproximarPeso(52, { min: 8, max: 10 }, 5);
  assert.deepEqual([x.abajo, x.arriba, x.cerca], [{ peso: 50, min: 10, max: 12 }, { peso: 55, min: 6, max: 8 }, 'abajo']);
  assert.ok(Math.abs(50 * (1 + 10 / 30) - 52 * (1 + 8 / 30)) < 1.5, 'mismo esfuerzo (1RM estimado parecido)');
  assert.deepEqual(P.aproximarPeso(52, { min: 8, max: 8 }, 2), { exacto: true, peso: 52 });
  assert.equal(P.aproximarPeso(53.5, { min: 6, max: 6 }, 2.5).arriba.peso, 55);
  assert.equal(P.aproximarPeso(0, null, 5), null);
});

await t('progreso en vivo con rango: en el rango, tope o lo pasó', async () => {
  const E = await import('../src/lib/esquemas.js');
  const ej = { ejercicio: 'Jalón al pecho', repsSugeridas: '8-10' };
  assert.equal(E.notaRango(9, ej), ' · en el rango 8–10 ✓'); assert.equal(E.notaRango(10, ej), ' · tope del rango 8–10 ✓');
  assert.match(E.notaRango(11, ej), /pasaste el rango 8–10: la próxima sube el peso/); assert.match(E.notaRango(7, ej), /debajo del rango/);
  assert.equal(E.notaRango(9, { repsSugeridas: '8' }), '');
});

await t('con el salto del equipo conocido, los back off quedan en pesos que existen', async () => {
  const E = await import('../src/lib/esquemas.js');
  const ej = { ejercicio: 'Jalón al pecho', tipo: 'reps', series: 3, repMin: 8, repMax: 12, pesoSugerido: '50', repsSugeridas: '10', esquema: 'backoff' };
  assert.deepEqual(E.armarFilas(ej, [], E.esquemaDe(ej)).map((x) => x.peso), [50, 45, 40.5]);
  assert.deepEqual(E.armarFilas({ ...ej, pasoPeso: 5 }, [], E.esquemaDe(ej)).map((x) => x.peso), [50, 45, 40]);
  assert.equal(E.redondear(3, { pasoPeso: 5 }), 5, 'nunca baja de un salto');
});
console.log(`\n${ok} pruebas OK`);
