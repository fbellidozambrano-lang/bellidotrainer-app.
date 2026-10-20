// Biblioteca: unificar ejercicios, repartir videos, no tocar historial, plantillas sin repetir.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const B = await import('../src/data/biblioteca.js');
const { normEj } = await import('../src/lib/util.js');
const { crearStoreNube } = await import('../src/data/store.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

const VID = 'https://youtu.be/QUADvideo1';
const ej = (ejercicio, extra = {}) => normEj({ ejercicio, grupo: 'Cuádriceps', series: 4, repMin: 10, repMax: 15, ...extra });
const programas = [
  { id: 'p1', asesoradoId: 'ana', nombre: 'Pierna 3 días', dias: [{ id: 'd1', nombre: 'Pierna', ejercicios: [ej('Extensión de cuádriceps', { video: VID }), ej('Sentadilla búlgara')] }] },
  { id: 'p2', asesoradoId: 'luis', nombre: 'Rutina anterior', dias: [{ id: 'd2', nombre: 'Pierna', ejercicios: [ej('extensiones cuadriceps'), ej('Sentadilla')] }] },
  { id: 'p3', asesoradoId: 'eva', nombre: 'Pierna 3 días', dias: [{ id: 'd3', nombre: 'Pierna', ejercicios: [ej('Extension de cuadriceps en maquina'), ej('Sentadilla bulgara')] }] },
];
const sesiones = [{ id: 's1', asesoradoId: 'luis', fecha: '2026-10-01', series: [{ ejercicio: 'extensiones cuadriceps', grupo: 'Cuádriceps', serie: 1, peso: 30, reps: 12 }] }];
const copiaSes = JSON.stringify(sesiones);
let plan;
await t('todas las extensiones de cuádriceps quedan en un solo item', async () => {
  plan = B.armarBiblioteca({ programas, sesiones, biblioteca: [] }, 'u:');
  const ext = plan.biblioteca.filter((b) => /xtensi/i.test(b.nombre) && /cu[aá]driceps/i.test(b.nombre));
  assert.equal(ext.length, 1); assert.equal(ext[0].nombre, 'Extensión de cuádriceps');
  assert.ok(ext[0].alias.includes('extensiones cuadriceps') && ext[0].alias.includes('Extension de cuadriceps en maquina'));
  assert.equal(ext[0].video, VID); assert.equal(ext[0].base.series, 4);
  assert.equal(plan.biblioteca.filter((b) => /b[uú]lgara/i.test(b.nombre)).length, 1);
  assert.notEqual(B.claveEj('Sentadilla'), B.claveEj('Sentadilla búlgara'));
});
await t('el video llega a las rutinas de los demás; nombres e historial intactos', async () => {
  assert.equal(plan.videos, 2);
  const luis = plan.programas.find((p) => p.id === 'p2').dias[0].ejercicios[0];
  assert.equal(luis.video, VID); assert.equal(luis.ejercicio, 'extensiones cuadriceps'); assert.ok(luis.bibId);
  assert.equal(JSON.stringify(sesiones), copiaSes);
  assert.equal(programas[1].dias[0].ejercicios[0].video, ''); // no muta el original
});
await t('volver a armar no crea nada nuevo', async () => {
  const progs2 = programas.map((p) => plan.programas.find((x) => x.id === p.id) || p);
  const r = B.armarBiblioteca({ programas: progs2, sesiones, biblioteca: plan.biblioteca }, 'u:');
  assert.equal(r.nuevos, 0); assert.equal(r.videos, 0); assert.equal(r.enlaces, 0); assert.equal(r.guardar.length, 0);
});
await t('cambiar el video de un item lo propaga solo donde faltaba o era el anterior', async () => {
  const progs2 = programas.map((p) => plan.programas.find((x) => x.id === p.id) || p);
  const b = plan.biblioteca.find((x) => x.video === VID);
  const r = B.propagarVideo(progs2, { ...b, video: 'https://youtu.be/NUEVO12345' }, VID);
  assert.equal(r.n, 3);
});
await t('posibles duplicados y fusionar', async () => {
  const bib = [{ id: 'a', nombre: 'Elevaciones laterales', grupo: 'Hombro lateral', alias: [] }, { id: 'b', nombre: 'Elevación lateral con mancuernas', grupo: 'Hombro lateral', alias: [], video: 'https://youtu.be/latlatlat1' }, { id: 'c', nombre: 'Press militar', grupo: 'Hombro anterior', alias: [] }];
  const pares = B.posiblesDuplicados(bib); assert.equal(pares.length, 1);
  const progs = [{ id: 'x', dias: [{ ejercicios: [{ id: 'e', ejercicio: 'Elevación lateral con mancuernas', bibId: 'b', video: '' }] }] }];
  const r = B.fusionar(bib[0], bib[1], progs);
  assert.ok(r.destino.alias.includes('Elevación lateral con mancuernas')); assert.equal(r.destino.video, 'https://youtu.be/latlatlat1');
  assert.equal(r.programas[0].dias[0].ejercicios[0].bibId, 'a'); assert.equal(r.programas[0].dias[0].ejercicios[0].ejercicio, 'Elevación lateral con mancuernas');
  assert.equal(B.posiblesDuplicados(bib, ['a:b']).length, 0);
});
await t('plantillas: una por cada rutina distinta', async () => {
  const pls = B.plantillasDesdeProgramas(programas, [], [{ id: 'luis', nombre: 'Luis Perez' }], 'u:');
  assert.equal(pls.length, 2); // p1 y p3 son la misma rutina (mismos ejercicios escritos distinto)
  assert.deepEqual(pls.map((x) => x.nombre).sort(), ['Pierna 3 días', 'Rutina de Luis']);
  assert.notEqual(pls[0].dias[0].ejercicios[0].id, programas[0].dias[0].ejercicios[0].id);
  assert.equal(B.plantillasDesdeProgramas(programas, pls, [], 'u:').length, 0);
  const base = B.plantillasBase()[0]; assert.equal(B.plantillasDesdeProgramas([{ id: 'b', asesoradoId: 'x', nombre: 'Copia', dias: base.dias }], [], [], '').length, 0);
  const vacio = B.plantillasDesdeProgramas([{ id: 'v', nombre: 'Vacío', dias: [{ id: 'd', nombre: 'x', ejercicios: [] }] }], [], [], '');
  assert.equal(vacio.length, 0);
});
await t('ejercicio desde la biblioteca trae valores, video, nota y bibId', async () => {
  const e = B.ejDesdeBib({ id: 'b1', nombre: 'Hip thrust', grupo: 'Glúteo', tipo: 'reps', video: VID, tecnica: 'Pausa arriba', base: { series: 4, repMin: 8, repMax: 10, descanso: 120, rpe: 9 } });
  assert.equal(e.bibId, 'b1'); assert.equal(e.series, 4); assert.equal(e.descanso, 120); assert.equal(e.nota, 'Pausa arriba'); assert.equal(e.video, VID);
});
await t('en Supabase: guardar biblioteca y plantillas', async () => {
  const db = await crearDB(); await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','c@bt.com')`);
  const nube = crearStoreNube({ url: 'x', key: 'y' }, fakeSupabase(db)); await nube.auth.entrar('c@bt.com', 'x');
  await nube.guardarEjercicios(plan.biblioteca);
  const pls = B.plantillasDesdeProgramas(programas, [], [], 'u:'); await nube.guardarPlantillas(pls);
  const d = await nube.cargarTodo(); assert.equal(d.biblioteca.length, plan.biblioteca.length); assert.equal(d.plantillas.length, 2); assert.equal(d.faltaTablas, false);
  assert.ok(d.biblioteca.find((b) => b.video === VID).alias.length >= 2);
  await nube.guardarEjercicios(plan.biblioteca); assert.equal((await nube.cargarTodo()).biblioteca.length, plan.biblioteca.length);
});
const U = await import('../src/lib/util.js');
await t('corrige ortografía en español e inglés sin inventar', async () => {
  const c = B.corregirNombre;
  assert.equal(c('Extencion de cuadriceps'), 'Extensión de cuádriceps'); assert.equal(c('Hip trust'), 'Hip thrust');
  assert.equal(c('Curl de biceps con mancuerda'), 'Curl de bíceps con mancuerna'); assert.equal(c('Peck deck'), 'Pec deck');
  assert.equal(c('Sentadila bulgara'), 'Sentadilla búlgara'); assert.equal(c('PESO MUERTO RUMANO'), 'Peso muerto rumano');
  assert.equal(c('Dia 1 · Pierna'), 'Día 1 · Pierna'); assert.equal(c('Rutina de adaptacion'), 'Rutina de adaptación');
  assert.equal(c('Leg extension'), 'Leg extension'); assert.equal(c('Romanian deadlift'), 'Romanian deadlift'); assert.equal(c('Lat pull down'), 'Lat pulldown');
  assert.equal(c('RDL con mancuernas'), 'RDL con mancuernas'); assert.equal(c('Full Body A'), 'Full Body A'); assert.equal(c('Hip thrust'), 'Hip thrust');
  assert.equal(c('Kettelbell swing'), 'Kettlebell swing'); assert.equal(c('Remo en TRX'), 'Remo en TRX');
});
await t('corregir nombres no toca el historial y el progreso sigue enlazado', async () => {
  const progs = [{ id: 'p', asesoradoId: 'ana', nombre: 'Rutina de hipertofia', dias: [{ id: 'd', nombre: 'Dia 1', ejercicios: [normEj({ ejercicio: 'Hip trust', grupo: 'Glúteo' })] }] }];
  const ses = [{ id: 's', fecha: '2026-10-01', dia: 'Dia 1', programaId: 'p', series: [{ ejercicio: 'Hip trust', serie: 1, peso: 80, reps: 10 }], notas: { 'Hip trust': 'bien' } }];
  const antes = JSON.stringify(ses);
  const r = B.correcciones({ programas: progs, asesorados: [{ id: 'ana', nombre: 'Ana Chacon' }] });
  assert.equal(r.cambios.length, 3); assert.equal(r.programas[0].nombre, 'Rutina de hipertrofia'); assert.equal(r.programas[0].dias[0].nombre, 'Día 1');
  const e = r.programas[0].dias[0].ejercicios[0]; assert.equal(e.ejercicio, 'Hip thrust'); assert.equal(e.id, progs[0].dias[0].ejercicios[0].id);
  assert.equal(JSON.stringify(ses), antes);
  const prev = U.seriesPrevias(ses, 'Hip thrust'); assert.equal(prev.series[0].peso, 80); assert.equal(prev.nota, 'bien');
  assert.equal(U.records(ses, 'Hip thrust').maxPeso, 80);
  const ses2 = [...ses, { id: 's2', fecha: '2026-10-08', series: [{ ejercicio: 'Hip thrust', serie: 1, peso: 85, reps: 10 }] }];
  assert.deepEqual(U.ejerciciosDe(ses2), ['Hip thrust']); assert.equal(U.progresion(ses2, 'Hip thrust').length, 2);
  assert.equal(B.correcciones({ programas: r.programas }).cambios.length, 0);
});
await t('la biblioteca se arma con nombres bien escritos y guarda los mal escritos como variantes', async () => {
  const progs = [{ id: 'p', asesoradoId: 'a', dias: [{ id: 'd', ejercicios: [normEj({ ejercicio: 'hip trust' }), normEj({ ejercicio: 'Hip Thrust' })] }] }];
  const r = B.armarBiblioteca({ programas: progs, sesiones: [], biblioteca: [] }, '');
  const h = r.biblioteca.find((b) => /thrust/i.test(b.nombre)); assert.ok(/^Hip thrust$/i.test(h.nombre)); assert.ok(h.alias.includes('hip trust'));
});
await t('mejor serie y % de intensidad', async () => {
  const ses = [{ fecha: '2026-10-01', series: [{ ejercicio: 'Sentadilla', peso: 80, reps: 8 }, { ejercicio: 'Sentadilla', peso: 90, reps: 3 }] }, { fecha: '2026-10-08', series: [{ ejercicio: 'sentadillas', peso: 85, reps: 6 }] }];
  const m = U.mejorSerie(ses, 'Sentadilla'); assert.equal(m.peso, 85); assert.equal(m.reps, 6); assert.equal(m.fecha, '2026-10-08'); assert.equal(Math.round(m.e1), 102);
  assert.equal(U.records(ses, 'Sentadilla').maxPeso, 90); assert.equal(U.repsAlPct(100), 1); assert.equal(U.repsAlPct(75), 10); assert.equal(U.mejorSerie([], 'x'), null);
});
console.log(`\n${ok} pruebas OK`);
