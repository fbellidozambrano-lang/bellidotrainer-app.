// Lector de etiquetas: del texto leído (o de la IA) a un producto por 100 g con su procedencia,
// la función del servidor (IA simulada, clave solo en el servidor, límite diario) y las reglas de la base.
import assert from 'node:assert/strict';
import { crearDB, como } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const E = await import('../src/lib/nutricion/etiqueta.js');
const { leerEtiqueta, configSupabase } = await import('../api/etiqueta.js');
const { crearStoreNube, crearStoreLocal } = await import('../src/data/store.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const val = (p, c) => p.valores.find((v) => v.codigo === c);

// texto tal como lo devuelve el lector del teléfono (con sus errores: "24 y", "59", "Og")
const VE = `INFORMACIÓN NUTRICIONAL\nTamaño de la porción: 1 taza (30 g)\nPorciones por envase: aprox. 15\nCantidad por porción\nCalorías 120 Calorías de grasa 15\n% Valor Diario*\nGrasa total 1,5 g 2%\nGrasa saturada 0 g 0%\nGrasa trans 0 g\nColesterol 0 mg 0%\nSodio 140 mg 6%\nCarbohidratos totales 24 y 8%\nFibra dietética 3 g 12%\nAzúcares 6 g\nProteínas 3 g\nHierro 25% - Calcio 10%`;
const US = `Nutrition Facts\n8 servings per container\nServing size 1 cup (240mL)\nCalories 130\nTotal Fat 59 6%\nSaturated Fat 39 15%\nTrans Fat Og\nCholesterol 20mg 7%\nSodium 120mg 5%\nTotal Carbohydrate 12g 4%\nDietary Fiber Og\nTotal Sugars 129\nIncludes 0g Added Sugars\nProtein 89\nVitamin D 2.5mcg 10%\nCalcium 300mg 25%\nPotassium 380mg 8%`;
const EU = `Información nutricional\nPor 100 g Por porción (40 g)\nValor energético 1580 kJ / 375 kcal 632 kJ / 150 kcal\nGrasas 7,0 g 2,8 g\nde las cuales saturadas 1,2 g 0,5 g\nHidratos de carbono 60 g 24 g\nde los cuales azúcares 12 g 4,8 g\nFibra alimentaria 8,5 g 3,4 g\nProteínas 11 g 4,4 g\nSal 0,50 g 0,20 g`;

await t('texto de una etiqueta venezolana: porción, valores por porción y conversión a 100 g', () => {
  const l = E.leerTextoEtiqueta(VE);
  assert.deepEqual(l.porcion, { cantidad: 30, unidad: 'g', texto: '1 taza (30 g)' }); assert.equal(l.porciones_envase, 15);
  const f = Object.fromEntries(l.filas.map((x) => [x.codigo, x]));
  assert.equal(f.energia_kcal.porPorcion, 120, '"Calorías de grasa" no se confunde con las calorías');
  assert.equal(f.carbohidratos_etiqueta.porPorcion, 24); assert.ok(f.carbohidratos_etiqueta.dudoso, '"24 y" se toma como 24 g, en ámbar');
  assert.equal(f.sodio.porPorcion, 140); assert.equal(f.sodio.unidad, 'mg'); assert.equal(f.proteina.porPorcion, 3);
  assert.ok(l.avisos.some((a) => /Hierro: .*% del valor diario/.test(a)) && l.avisos.some((a) => /Calcio: .*% del valor diario/.test(a)), 'solo % VD: no se inventa la cantidad');
  const p = E.productoDesdeLectura({ ...l, nombre: 'Avena en hojuelas', marca: 'Marca X' }, { quien: 'el coach' });
  assert.equal(p.fuente, 'foto_etiqueta'); assert.equal(p.base, '100 g del producto tal como se vende (etiqueta)'); assert.equal(p.categoria, 'Productos comerciales');
  assert.equal(val(p, 'energia_kcal').cantidad, 400); assert.equal(val(p, 'carbohidratos_etiqueta').cantidad, 80); assert.equal(val(p, 'sodio').cantidad, 466.67);
  assert.match(val(p, 'proteina').metodo, /^Etiqueta: 3 g por porción de 30 g → por 100 g · leído de las fotos en el teléfono y revisado por el coach$/);
  assert.equal(val(p, 'hierro'), undefined); assert.deepEqual(p.porciones, [{ descripcion: '1 porción: 1 taza (30 g)', original: '1 taza (30 g)', gramos: 30 }]);
  assert.deepEqual(p.sospechosos, [], 'las kcal cuadran con los macros');
});

await t('texto en inglés con "g" leída como "9" y líquido por 100 ml', () => {
  const l = E.leerTextoEtiqueta(US); const f = Object.fromEntries(l.filas.map((x) => [x.codigo, x]));
  assert.deepEqual([f.grasa_total.porPorcion, f.grasa_saturada.porPorcion, f.azucares_totales.porPorcion, f.proteina.porPorcion], [5, 3, 12, 8]);
  assert.ok(f.grasa_total.dudoso && f.proteina.dudoso && !f.sodio.dudoso);
  assert.equal(f.grasa_trans.porPorcion, 0, '"Og" es 0 g'); assert.equal(f.azucares_anadidos.porPorcion, 0); assert.equal(f.vitamina_d.porPorcion, 2.5); assert.equal(f.vitamina_d.unidad, 'µg');
  assert.deepEqual(l.porcion, { cantidad: 240, unidad: 'ml', texto: '1 cup (240mL)' }); assert.equal(l.porciones_envase, 8);
  const p = E.productoDesdeLectura({ ...l, nombre: 'Leche' });
  assert.equal(p.base, '100 ml del producto tal como se vende (etiqueta)'); assert.ok(p.sospechosos.some((s) => /100 ml/.test(s)));
  assert.equal(val(p, 'calcio').cantidad, 125); assert.equal(val(p, 'energia_kcal').cantidad, 54.17);
});

await t('tabla europea con columnas por 100 g y por porción: kJ y sal; el sodio se calcula y lo dice', () => {
  const l = E.leerTextoEtiqueta(EU); const f = Object.fromEntries(l.filas.map((x) => [x.codigo, x]));
  assert.deepEqual([f.energia_kcal.por100, f.energia_kcal.porPorcion, f.energia_kj.por100, f.grasa_total.por100, f.sal.por100, f.sal.porPorcion], [375, 150, 1580, 7, 0.5, 0.2]);
  const p = E.productoDesdeLectura({ ...l, nombre: 'Galletas' });
  assert.equal(val(p, 'energia_kcal').cantidad, 375, 'usa la columna por 100 g tal cual'); assert.equal(val(p, 'sal').cantidad, 0.5);
  assert.equal(val(p, 'sodio').cantidad, 200); assert.equal(val(p, 'sodio').estado, 'calculado'); assert.match(val(p, 'sodio').metodo, /sodio = sal ÷ 2,5/);
  const solo = E.calcularPor100({ porcion: { cantidad: 40, unidad: 'g' }, filas: [{ codigo: 'energia_kj', porPorcion: 632, por100: null, unidad: 'kJ' }] });
  assert.deepEqual(solo.map((v) => [v.codigo, v.cantidad, v.estado]), [['energia_kj', 1580, 'etiqueta'], ['energia_kcal', 377.63, 'calculado']]);
  assert.ok(E.faltaPorcion({ porcion: { cantidad: null }, filas: [{ codigo: 'proteina', porPorcion: 3, por100: null }] }), 'sin tamaño de porción no se puede pasar a 100 g');
  assert.equal(E.calcularPor100({ porcion: {}, filas: [{ codigo: 'proteina', porPorcion: 3, por100: null, unidad: 'g' }] }).length, 0, 'no se inventa');
});

await t('lo que devuelve la IA se normaliza: claves, unidades, % VD, dígitos del código y avisos', () => {
  const l = E.desdeIA({ nombre: '  Hojuelas de avena ', marca: 'Avena Dorada', codigo_barras: '7 591234 567890', contenido_neto: '450 g', porcion: { cantidad: 30, unidad: 'g', texto: '1 taza (30 g)' }, porciones_envase: 15,
    nutrientes: [{ nombre_en_etiqueta: 'Calorías', clave: 'energia_kcal', por_porcion: 120, por_100: null, unidad: 'kcal' }, { nombre_en_etiqueta: 'Carbohidratos totales', clave: 'carbohidratos', por_porcion: 24, unidad: 'g' },
      { nombre_en_etiqueta: 'Proteínas', clave: 'proteina', por_porcion: 3, unidad: 'g', legible: false }, { nombre_en_etiqueta: 'Hierro', clave: 'hierro', solo_vd: true, unidad: 'mg' },
      { nombre_en_etiqueta: 'Vitamina D', clave: 'vitamina_d', por_porcion: 1, unidad: 'mcg' }, { nombre_en_etiqueta: 'Taurina', clave: 'otro', por_porcion: 1, unidad: 'g' }, { nombre_en_etiqueta: 'Proteínas', clave: 'proteina', por_porcion: 99, unidad: 'g' }],
    avisos: ['La sal dice "<0,1 g"'] });
  assert.equal(l.origen, 'ia'); assert.equal(l.nombre, 'Hojuelas de avena'); assert.equal(l.codigo_barras, '7591234567890'); assert.equal(l.contenido, '450 g');
  assert.deepEqual(l.filas.map((f) => [f.codigo, f.porPorcion, f.unidad, !!f.dudoso]), [['energia_kcal', 120, 'kcal', false], ['carbohidratos_etiqueta', 24, 'g', false], ['proteina', 3, 'g', true], ['vitamina_d', 1, 'µg', false]], 'sin repetidos ni claves inventadas');
  assert.ok(l.avisos.some((a) => /Hierro: .*valor diario/.test(a)) && l.avisos.some((a) => /Taurina/.test(a)) && l.avisos.includes('La sal dice "<0,1 g"'));
  assert.equal(E.desdeIA({ codigo_barras: '123' }).codigo_barras, '', 'un código incompleto no se guarda');
  assert.equal(E.convertirUnidad(250, 'mg', 'proteina'), 0.25); assert.equal(E.convertirUnidad(5, 'g', 'sodio'), 5000); assert.equal(E.convertirUnidad(10, 'kcal', 'proteina'), null);
});

// ---------- servidor ----------
const IA_OK = { model: 'claude-sonnet-5-5', content: [{ type: 'tool_use', name: 'registrar_etiqueta', input: { nombre: 'Avena', marca: 'X', porcion: { cantidad: 30, unidad: 'g' }, nutrientes: [{ nombre_en_etiqueta: 'Proteínas', clave: 'proteina', por_porcion: 3, unidad: 'g' }] } }] };
function simulado({ rpc = { status: 200, body: { ok: true, restantes: 59 } }, ia = { status: 200, body: IA_OK } } = {}) {
  const llamadas = [];
  const f = async (url, o) => { llamadas.push({ url, o, cuerpo: o?.body ? JSON.parse(o.body) : null });
    const r = url.includes('/rest/v1/rpc/') ? rpc : ia; return { ok: r.status < 300, status: r.status, json: async () => r.body }; };
  return { f, llamadas };
}
const ENV = { ANTHROPIC_API_KEY: 'sk-prueba', VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'anon' };
const IMG = [{ tipo: 'frente', media_type: 'image/jpeg', data: 'AAAA' }, { tipo: 'tabla', media_type: 'image/jpeg', data: 'BBBB' }];

await t('servidor: sin clave no llama a nadie y el teléfono lee por su cuenta', async () => {
  const s = simulado(); const [st, r] = await leerEtiqueta({ imagenes: IMG }, { f: s.f, env: { ...ENV, ANTHROPIC_API_KEY: '' }, autorizacion: 'Bearer jwt' });
  assert.equal(st, 501); assert.equal(r.sinClave, true); assert.equal(s.llamadas.length, 0);
});

await t('servidor: valida fotos y sesión antes de gastar una lectura', async () => {
  const s = simulado();
  assert.equal((await leerEtiqueta({ imagenes: [] }, { f: s.f, env: ENV, autorizacion: 'Bearer j' }))[0], 400);
  assert.equal((await leerEtiqueta({ imagenes: [IMG[0]] }, { f: s.f, env: ENV, autorizacion: 'Bearer j' }))[1].error, 'Falta la foto de la tabla nutricional');
  assert.equal((await leerEtiqueta({ imagenes: [{ ...IMG[1], media_type: 'text/html' }] }, { f: s.f, env: ENV, autorizacion: 'Bearer j' }))[0], 400);
  assert.equal((await leerEtiqueta({ imagenes: [{ ...IMG[1], data: 'A'.repeat(5 * 1024 * 1024 + 1) }] }, { f: s.f, env: ENV, autorizacion: 'Bearer j' }))[0], 413);
  assert.equal((await leerEtiqueta({ imagenes: IMG }, { f: s.f, env: ENV }))[0], 401, 'sin sesión ni enlace');
  assert.equal(s.llamadas.length, 0);
});

await t('servidor: coach con sesión → anota la lectura en Supabase y llama a la IA con la clave del servidor', async () => {
  const s = simulado(); const [st, r] = await leerEtiqueta({ imagenes: IMG }, { f: s.f, env: ENV, autorizacion: 'Bearer jwt-del-coach' });
  assert.equal(st, 200); assert.equal(r.lectura.nombre, 'Avena'); assert.equal(r.lectura.filas[0].codigo, 'proteina'); assert.equal(r.restantes, 59);
  const [a, b] = s.llamadas;
  assert.equal(a.url, 'https://x.supabase.co/rest/v1/rpc/nutri_lectura_etiqueta'); assert.equal(a.o.headers.Authorization, 'Bearer jwt-del-coach'); assert.deepEqual(a.cuerpo, { p_token: null, p_limite: 60 });
  assert.equal(b.url, 'https://api.anthropic.com/v1/messages'); assert.equal(b.o.headers['x-api-key'], 'sk-prueba'); assert.equal(b.o.headers['anthropic-version'], '2023-06-01');
  assert.equal(b.cuerpo.model, 'claude-sonnet-5-5'); assert.deepEqual(b.cuerpo.tool_choice, { type: 'tool', name: 'registrar_etiqueta' });
  assert.deepEqual(b.cuerpo.messages[0].content.filter((c) => c.type === 'image').map((c) => c.source.data), ['AAAA', 'BBBB'], 'frente y luego tabla');
  assert.ok(!JSON.stringify(r).includes('sk-prueba'), 'la clave nunca vuelve al teléfono');
});

await t('servidor: asesorado con su enlace, límite diario y errores de la IA', async () => {
  const s = simulado(); await leerEtiqueta({ imagenes: IMG, token: 't'.repeat(32) }, { f: s.f, env: { ...ENV, ETIQUETAS_POR_DIA: '20', ANTHROPIC_MODEL: 'claude-haiku-5-5' } });
  assert.deepEqual(s.llamadas[0].cuerpo, { p_token: 't'.repeat(32), p_limite: 20 }); assert.equal(s.llamadas[0].o.headers.Authorization, 'Bearer anon'); assert.equal(s.llamadas[1].cuerpo.model, 'claude-haiku-5-5');
  const lim = simulado({ rpc: { status: 400, body: { message: 'se llego al limite de 60 lecturas de etiquetas en 24 horas' } } });
  const [st, r] = await leerEtiqueta({ imagenes: IMG }, { f: lim.f, env: ENV, autorizacion: 'Bearer j' }); assert.equal(st, 429); assert.match(r.error, /límite de 60 lecturas/); assert.equal(lim.llamadas.length, 1, 'no llega a la IA');
  assert.equal((await leerEtiqueta({ imagenes: IMG }, { f: simulado({ rpc: { status: 401, body: { message: 'JWT expired' } } }).f, env: ENV, autorizacion: 'Bearer j' }))[1].error, 'Tu sesión venció: vuelve a entrar');
  assert.match((await leerEtiqueta({ imagenes: IMG }, { f: simulado({ ia: { status: 401, body: {} } }).f, env: ENV, autorizacion: 'Bearer j' }))[1].error, /ANTHROPIC_API_KEY/);
  assert.equal((await leerEtiqueta({ imagenes: IMG }, { f: simulado({ ia: { status: 529, body: {} } }).f, env: ENV, autorizacion: 'Bearer j' }))[0], 503);
  assert.equal((await leerEtiqueta({ imagenes: IMG }, { f: simulado({ ia: { status: 200, body: { content: [{ type: 'text', text: 'hola' }] } } }).f, env: ENV, autorizacion: 'Bearer j' }))[0], 502);
  assert.deepEqual(configSupabase({ SUPABASE_URL: 'https://y.supabase.co/', SUPABASE_ANON_KEY: 'k' }), { url: 'https://y.supabase.co', key: 'k' });
  assert.match(configSupabase({}).url, /^https:\/\/.+supabase\.co$/, 'sin variables usa public/config.js');
});

// ---------- base de datos ----------
const COACH = '00000000-0000-0000-0000-0000000000c1';
await t('base: el producto leído de la foto es etiqueta (no oficial), el asesorado puede guardarlo y el sodio calculado lo dice', async () => {
  const db = await crearDB(); await db.exec(`insert into auth.users values ('${COACH}','c@bt.com')`);
  const sb = fakeSupabase(db); const st = crearStoreNube({ url: 'x', key: 'y' }, sb); await st.auth.entrar('c@bt.com', 'x');
  const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Lía', token: 'l'.repeat(32), datos: {} });
  const p = E.productoDesdeLectura({ ...E.leerTextoEtiqueta(EU), nombre: 'Galletas María', marca: 'Marca X', codigo_barras: '7591234567890' }, { quien: 'el asesorado' });
  const f = await st.nutri.guardarAlimento(p, a.token);
  assert.equal(f.fuente, 'foto_etiqueta'); assert.equal(f.calidad, 'etiqueta'); assert.equal(f.tipo, 'comercial');
  assert.equal(f.valores.sodio.e, 'calculado'); assert.equal(f.valores.proteina.e, 'etiqueta'); assert.equal(f.valores.proteina.c, 11);
  const f2 = await st.nutri.guardarAlimento(p, a.token); assert.equal(f2.id, f.id, 'con el mismo código de barras se actualiza, no se duplica');
  const sin = await st.nutri.guardarAlimento({ ...p, codigo_barras: null, id_externo: null }); assert.notEqual(sin.id, f.id, 'sin código, es otro producto');
  const ficha = await st.nutri.ficha(f.id); assert.match(ficha.valores.find((v) => v.codigo === 'proteina').metodo, /leído de las fotos en el teléfono y revisado por el asesorado/);
  assert.equal(ficha.fuente.nombre, 'Etiqueta del producto (foto)');
  assert.ok((await st.nutri.buscar('galletas maria', {}, a.token)).some((x) => x.id === f.id));
  // el límite de lecturas: cuenta por coach (sus asesorados incluidos) y no se puede leer la tabla desde afuera
  const r1 = await como(db, null, (tx) => tx.query(`select public.nutri_lectura_etiqueta($1, 2) as r`, [a.token])); assert.equal(r1.rows[0].r.restantes, 1);
  await como(db, COACH, (tx) => tx.query(`select public.nutri_lectura_etiqueta(null, 2)`));
  await assert.rejects(como(db, COACH, (tx) => tx.query(`select public.nutri_lectura_etiqueta(null, 2)`)), /limite de 2 lecturas/);
  await assert.rejects(como(db, null, (tx) => tx.query(`select public.nutri_lectura_etiqueta(null, 2)`)), /iniciar sesion/);
  await assert.rejects(como(db, null, (tx) => tx.query(`select public.nutri_lectura_etiqueta('xxxxxxxxxxxxxxxxxxxx', 2)`)), /enlace no valido/);
  await assert.rejects(como(db, COACH, (tx) => tx.query(`select * from public.nutri_lecturas`)), /permission denied/);
});

await t('modo local: el asesorado también guarda el producto de la foto; sin servidor se lee en el teléfono', async () => {
  const st = crearStoreLocal(); const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Ana', token: 'a'.repeat(32), datos: {} });
  assert.equal(st.nutri.leerEtiqueta, null);
  const p = E.productoDesdeLectura({ ...E.leerTextoEtiqueta(VE), nombre: 'Avena' });
  const f = await st.nutri.guardarAlimento(p, a.token); assert.equal(f.calidad, 'etiqueta'); assert.equal(f.fuente, 'foto_etiqueta');
  await assert.rejects(st.nutri.guardarAlimento({ nombre: 'Trampa', valores: [{ codigo: 'proteina', cantidad: 1 }] }, a.token), /solo puede agregar productos comerciales/);
});

console.log(`\n${ok} pruebas del lector de etiquetas OK`);
