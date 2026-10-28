// Base de alimentos: importación de registros REALES de USDA, procedencia, ceros vs. desconocidos,
// crudo vs. cocido, duplicados, versiones, reintentos, búsqueda, cálculo y separación oficial/personalizado.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { crearDB, como } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { crearStoreNube, crearStoreLocal } = await import('../src/data/store.js');
const { normalizarUSDA, estadoUSDA, paraGuardar } = await import('../src/lib/nutricion/usda.js');
const { armarLotes } = await import('../src/lib/nutricion/lotes.js');
const { importarConjunto, leerLote, idImportacion } = await import('../src/data/nutricion.js');
const { nutrientesDe, sumar, receta, totalesDia, principalesPor100, salAnadida, FACTOR_SAL } = await import('../src/lib/nutricion/calculo.js');
const { POR_CODIGO, NUTRIENTES } = await import('../src/lib/nutricion/catalogo.js');
const { normalizarOFF } = await import('../src/lib/nutricion/off.js');
const { consultar } = await import('../api/alimentos.js');
const { uuidDe } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

const M = JSON.parse(fs.readFileSync(new URL('./fixtures/usda_muestra.json', import.meta.url)));
const B = JSON.parse(fs.readFileSync(new URL('./fixtures/usda_branded_muestra.json', import.meta.url)));
const OFF1 = JSON.parse(fs.readFileSync(new URL('./fixtures/off_7591002002893.json', import.meta.url))).product;
const OFF2 = JSON.parse(fs.readFileSync(new URL('./fixtures/off_0078000000047.json', import.meta.url))).product;
const porFdc = (raiz, id) => M[raiz].find((x) => x && x.fdcId === id);
const norm = (x, version) => normalizarUSDA(x, { version }).alimento;
const valor = (a, codigo) => a.valores.find((v) => v.nutriente === POR_CODIGO.get(codigo).id);
const ficha = (a) => ({ id: a.id, energia_ref: a.energia_ref, valores: Object.fromEntries(a.valores.map((v) => [NUTRIENTES.find((n) => n.id === v.nutriente).codigo, { c: v.cantidad, e: v.estado }])) });

await t('USDA Foundation real: pechuga cruda con procedencia, valores analíticos y energía de la fuente', async () => {
  const a = norm(porFdc('FoundationFoods', 2646170), '2026-04-30');
  assert.equal(a.id, uuidDe('usda:2646170')); assert.equal(a.fuente, 'usda_foundation'); assert.equal(a.id_externo, '2646170'); assert.equal(a.version, '2026-04-30');
  assert.equal(a.nombre_original, 'Chicken, breast, boneless, skinless, raw'); assert.equal(a.nombre, 'Pollo, pechuga, sin hueso, sin piel, crudo'); assert.ok(a.sinonimos.includes('pechuga de pollo'));
  assert.equal(a.preparacion, 'crudo'); assert.equal(a.calidad, 'oficial_analitico'); assert.equal(a.base, '100 g de parte comestible'); assert.match(a.ref_url, /food-details\/2646170/);
  const p = valor(a, 'proteina'); assert.equal(p.cantidad, 22.5); assert.equal(p.estado, 'calculado', 'USDA la calcula desde el nitrógeno (NC)'); assert.equal(p.id_externo, '1003'); assert.match(p.metodo, /^NC ·/);
  const g = valor(a, 'grasa_total'); assert.equal(g.cantidad, 1.93); assert.equal(g.estado, 'analitico'); assert.equal(g.n, 8); assert.equal(g.min, 1.31); assert.equal(g.max, 3.1);
  assert.equal(a.energia_ref, 'energia_atwater_especifica_kcal', 'sin el 1008, usa los factores específicos (112 kcal), no los generales (106)');
  assert.equal(valor(a, 'energia_kcal'), undefined, 'este registro no publica el nutriente 1008');
  assert.ok(['energia_atwater_especifica_kcal', 'energia_atwater_general_kcal'].includes(a.energia_ref), 'usa la energía que sí publica USDA');
  const raw = porFdc('FoundationFoods', 2646170).foodNutrients.find((n) => n.nutrient.id === (a.energia_ref === 'energia_atwater_especifica_kcal' ? 2048 : 2047));
  assert.equal(valor(a, a.energia_ref).cantidad, raw.amount, 'el valor energético original se conserva sin tocar');
});

await t('ceros: asumido, publicado (posible bajo el límite de cuantificación) y calculado; lo que falta queda desconocido', async () => {
  assert.equal(estadoUSDA({ amount: 0, code: 'Z', fuente: 'usda_sr_legacy' }), 'cero_asumido');
  assert.equal(estadoUSDA({ amount: 0, code: 'A', fuente: 'usda_foundation' }), 'cero_publicado');
  assert.equal(estadoUSDA({ amount: 0, code: null, fuente: 'usda_fndds' }), 'cero_calculado');
  assert.equal(estadoUSDA({ amount: null, code: 'A', fuente: 'usda_foundation' }), 'sin_valor');
  assert.equal(estadoUSDA({ amount: 3, code: 'LCCS', fuente: 'usda_branded' }), 'etiqueta');
  const clara = norm(porFdc('SRLegacyFoods', 172183), '2018-04');
  const z = clara.valores.filter((v) => v.estado === 'cero_asumido'); assert.ok(z.length > 0 && z.every((v) => v.cantidad === 0 && /^Z ·/.test(v.metodo)));
  const pollo = norm(porFdc('FoundationFoods', 2646170), '2026-04-30');
  assert.equal(valor(pollo, 'vitamina_c'), undefined, 'no analizado: no aparece (no es cero)');
  const r = nutrientesDe(ficha(pollo), 100); assert.equal(r.valores.vitamina_c, undefined); assert.ok(!('vitamina_c' in r.principales));
  const s = sumar([{ nutrientes: { fibra: 2 }, desconocidos: [] }, { nutrientes: {}, desconocidos: ['fibra'] }]);
  assert.equal(s.nutrientes.fibra, 2); assert.equal(s.faltan.fibra, 1, 'el total avisa que a un alimento le falta el dato');
});

await t('crudo y cocido son registros distintos (arroz) y no se mezclan', async () => {
  const crudo = norm(porFdc('SRLegacyFoods', 168877), '2018-04'); const cocido = norm(porFdc('SRLegacyFoods', 168878), '2018-04');
  assert.equal(crudo.preparacion, 'crudo'); assert.equal(cocido.preparacion, 'cocido'); assert.notEqual(crudo.id, cocido.id);
  assert.ok(valor(crudo, 'energia_kcal').cantidad > 3 * valor(cocido, 'energia_kcal').cantidad - 60);
  const fn = norm(M.SurveyFoods.find((x) => x.description === 'Rice, white, cooked, no added fat'), '2024-10-31');
  assert.equal(fn.preparacion, 'cocido'); assert.ok(fn.preparacion_detalle.includes('sin_grasa_anadida')); assert.equal(fn.base, '100 g del alimento tal como se consume');
  const atun = norm(porFdc('SRLegacyFoods', 173709), '2018-04'); assert.equal(atun.preparacion, 'enlatado'); assert.ok(atun.preparacion_detalle.includes('escurrido'));
});

await t('rechazos, valores sospechosos y unidades originales', async () => {
  assert.match(normalizarUSDA(null).error, /vacío/);
  assert.match(normalizarUSDA(M.SurveyFoods.find((x) => x.description === 'Milk, human')).error, /sin valores/);
  const panceta = norm(porFdc('FoundationFoods', 2727576), '2026-04-30');
  assert.ok(panceta.sospechosos.some((s) => /negativos/.test(s)), 'USDA publica carbohidrato negativo: se marca, no se corrige'); assert.equal(valor(panceta, 'carbohidratos_diferencia').cantidad, -0.705);
  const banana = norm(porFdc('SRLegacyFoods', 173944), '2018-04');
  assert.equal(valor(banana, 'vitamina_a_ui').unidad_original, 'IU', 'UI se guarda como el original, sin convertir'); assert.equal(valor(banana, 'selenio').unidad_original, 'µg');
  assert.ok(banana.sinonimos.includes('cambur'));
  const aceite = norm(porFdc('FoundationFoods', 748608), '2026-04-30');
  assert.equal(valor(aceite, 'grasa_total'), undefined); assert.ok(valor(aceite, 'grasa_nlea'), 'Foundation da la grasa como NLEA');
  assert.equal(principalesPor100(ficha(aceite)).definiciones.grasa, 'grasa_nlea');
});

await t('cálculo: gramos × valor / 100 sin redondear, sal desde sodio, recetas y día', async () => {
  const pollo = ficha(norm(porFdc('FoundationFoods', 2646170), '2026-04-30'));
  const r = nutrientesDe(pollo, 137); assert.equal(r.principales.proteina, (137 * 22.5) / 100); assert.equal(r.valores.proteina, (137 * 22.5) / 100);
  const sodio = pollo.valores.sodio.c; assert.equal(r.principales.sal, (137 * ((sodio * FACTOR_SAL) / 1000)) / 100); assert.equal(r.definiciones.sal, 'calculada_de_sodio');
  const arroz = ficha(norm(porFdc('SRLegacyFoods', 168877), '2018-04'));
  const rec = receta({ porciones: 2, ingredientes: [{ alimento_id: pollo.id, gramos: 200 }, { alimento_id: arroz.id, gramos: 150 }, { alimento_id: 'x', nombre: 'Sal', gramos: 2 }] }, { [pollo.id]: pollo, [arroz.id]: arroz });
  assert.equal(rec.porPorcion.proteina, ((200 * 22.5) / 100 + (150 * arroz.valores.proteina.c) / 100) / 2); assert.deepEqual(rec.ingredientesSinFicha, ['Sal']); assert.equal(rec.gramosPorPorcion, 176);
  const dia = totalesDia([{ tipo: 'alimento', nutrientes: { kcal: 100, proteina: 10 } }, { tipo: 'agua', ml: 500 }, { tipo: 'sal', ...salAnadida(1) }]);
  assert.equal(dia.agua_ml, 500); assert.equal(dia.nutrientes.sal, 1); assert.equal(dia.nutrientes.sodio, 400); assert.equal(dia.nutrientes.kcal, 100);
  assert.throws(() => nutrientesDe(pollo, -5));
});

await t('Open Food Facts real: colaborativo, unidades convertidas de g a mg, sal declarada y avisos', async () => {
  const n = normalizarOFF(OFF2).alimento;
  assert.equal(n.fuente, 'off'); assert.equal(n.codigo_barras, '0078000000047'); assert.match(n.base, /etiqueta/);
  const v = Object.fromEntries(n.valores.map((x) => [x.codigo, x.cantidad]));
  assert.equal(v.energia_kcal, 350); assert.equal(v.carbohidratos_etiqueta, 73.5); assert.equal(v.carbohidratos_diferencia, undefined, 'la etiqueta no se hace pasar por la definición de USDA');
  const n1 = normalizarOFF(OFF1).alimento; const v1 = Object.fromEntries(n1.valores.map((x) => [x.codigo, x]));
  if (OFF1.nutriments.sodium_100g != null) assert.equal(v1.sodio.cantidad, OFF1.nutriments.sodium_100g * 1000);
  assert.equal(n1.marca, 'P.A.N'); assert.match(normalizarOFF({ code: 'abc' }).error, /código/);
});

await t('USDA Branded real (etiqueta): marca, código de barras, porción de la etiqueta', async () => {
  const a = normalizarUSDA(B.BrandedFoods[1], {}).alimento;
  assert.equal(a.fuente, 'usda_branded'); assert.equal(a.calidad, 'etiqueta'); assert.equal(a.tipo, 'comercial'); assert.equal(a.marca, B.BrandedFoods[1].brandOwner);
  assert.equal(a.codigo_barras, B.BrandedFoods[1].gtinUpc); assert.ok(a.valores.every((v) => ['etiqueta', 'cero_publicado', 'sin_valor'].includes(v.estado)));
  assert.match(a.nombre, /arroz/i); assert.equal(a.porciones[0].gramos, 45);
});

// ---------- base de datos (Postgres en memoria) ----------
const COACH = '11111111-1111-1111-1111-111111111111', OTRO = '22222222-2222-2222-2222-222222222222';
async function montar() {
  const db = await crearDB(); await db.exec(`insert into auth.users values ('${COACH}','c@bt.com'),('${OTRO}','o@bt.com')`);
  const sb = fakeSupabase(db); const st = crearStoreNube({ url: 'x', key: 'y' }, sb); await st.auth.entrar('c@bt.com', 'x'); return { db, sb, st };
}
const conjuntoDe = (raiz, version, alimentos, tamano = 3) => {
  const lotes = armarLotes(alimentos, { fuente: alimentos[0].fuente, version, tamano });
  const archivos = Object.fromEntries(lotes.map((l) => [`${l.parte}`, zlib.gzipSync(JSON.stringify(l))]));
  return { conjunto: { fuente: alimentos[0].fuente, version, sha256: `prueba-${raiz}-${version}`, partes: lotes.length, ruta: `${alimentos[0].fuente}/${version}`, archivo: `${raiz}.zip`, estadisticas: { recibidos: alimentos.length } }, archivos };
};
const servir = (archivos, fallos = {}) => async (url) => {
  const p = Number((url.match(/parte-(\d+)/) || [])[1]);
  if (fallos[p] > 0) { fallos[p]--; throw new Error('red caída'); }
  const b = archivos[String(p)]; return b ? { ok: true, status: 200, arrayBuffer: async () => b } : { ok: false, status: 404 };
};
const foundation = M.FoundationFoods.filter(Boolean).map((x) => norm(x, '2026-04-30'));
const sr = M.SRLegacyFoods.map((x) => norm(x, '2018-04'));

for (const modo of ['nube', 'local']) {
  await t(`${modo}: importación idempotente, reanudable y con estadísticas`, async () => {
    let nutri;
    if (modo === 'nube') nutri = (await montar()).st.nutri; else { localStorage._ = {}; nutri = crearStoreLocal().nutri; }
    const { conjunto, archivos } = conjuntoDe('sr', '2018-04', sr);
    // la parte 2 falla todas las veces: se detiene ahí con un mensaje claro
    const r1 = await importarConjunto({ nutri, conjunto, fetcher: servir(archivos, { 2: 9 }), pausa: 1 });
    assert.match(r1.error, /parte 2/); assert.equal(r1.insertados, 3);
    // al volver a importar sigue desde la parte 2, y un fallo pasajero se reintenta solo
    const r2 = await importarConjunto({ nutri, conjunto, fetcher: servir(archivos, { 3: 1 }), pausa: 1 });
    assert.ok(!r2.error, r2.error); assert.equal(r2.saltadas, 1); assert.equal(r2.insertados, sr.length - 3);
    // repetir no duplica: todo saltado; forzado: todo omitido por huella igual
    const r3 = await importarConjunto({ nutri, conjunto, fetcher: servir(archivos), pausa: 1 }); assert.equal(r3.insertados, 0); assert.equal(r3.saltadas, conjunto.partes);
    const r4 = await importarConjunto({ nutri, conjunto, fetcher: servir(archivos), forzar: true, pausa: 1 }); assert.equal(r4.omitidos, sr.length); assert.equal(r4.insertados + r4.actualizados, 0);
    const e = await nutri.estado(); const f = e.fuentes.find((x) => x.id === 'usda_sr_legacy'); assert.equal(f.alimentos, sr.length); assert.equal(f.version, '2018-04');
    const imp = e.importaciones.find((x) => x.id === idImportacion(conjunto)); assert.equal(imp.estado, 'completa');
    assert.equal(imp.omitidos, sr.length, 'las estadísticas reflejan el último procesamiento de cada parte (el forzado no insertó nada)'); assert.equal(imp.insertados, 0);
    // registro rechazado: queda en el registro de errores y no frena al resto
    const malo = { ...sr[0], id: uuidDe('usda:999999999'), id_externo: '999999999', nombre: '' };
    const c2 = conjuntoDe('sr-malo', '2018-04', [malo, sr[1]]); c2.conjunto.sha256 = 'otro';
    const r5 = await importarConjunto({ nutri, conjunto: c2.conjunto, fetcher: servir(c2.archivos), pausa: 1 }); assert.equal(r5.rechazados, 1); assert.match(r5.errores[0], /999999999.*sin nombre/);
    // Foundation al lado: no borra nada de SR
    const cf = conjuntoDe('fo', '2026-04-30', foundation);
    await importarConjunto({ nutri, conjunto: cf.conjunto, fetcher: servir(cf.archivos), pausa: 1 });
    const e2 = await nutri.estado(); assert.equal(e2.fuentes.find((x) => x.id === 'usda_sr_legacy').alimentos, sr.length); assert.equal(e2.fuentes.find((x) => x.id === 'usda_foundation').alimentos, foundation.length);
  });

  await t(`${modo}: nueva versión actualiza con historial; búsqueda por nombre, sinónimo, tildes, preparación y código`, async () => {
    let nutri, db;
    if (modo === 'nube') { const m = await montar(); nutri = m.st.nutri; db = m.db; } else { localStorage._ = {}; nutri = crearStoreLocal().nutri; }
    const c1 = conjuntoDe('sr', '2018-04', sr); await importarConjunto({ nutri, conjunto: c1.conjunto, fetcher: servir(c1.archivos), pausa: 1 });
    const cf = conjuntoDe('fo', '2026-04-30', foundation); await importarConjunto({ nutri, conjunto: cf.conjunto, fetcher: servir(cf.archivos), pausa: 1 });
    // versión nueva de un registro (datos de prueba: se cambia la versión y un valor para simular una publicación nueva)
    const nuevo = { ...sr.find((a) => a.id_externo === '173944'), version: '2099-01' }; nuevo.valores = nuevo.valores.map((v) => (v.nutriente === POR_CODIGO.get('proteina').id ? { ...v, cantidad: 1.2 } : v)); nuevo.huella = 'cambiada';
    const c2 = conjuntoDe('sr', '2099-01', [nuevo]); c2.conjunto.sha256 = 'v2'; const r = await importarConjunto({ nutri, conjunto: c2.conjunto, fetcher: servir(c2.archivos), pausa: 1 });
    assert.equal(r.actualizados, 1);
    const fb = await nutri.ficha(uuidDe('usda:173944')); assert.equal(fb.version, '2099-01'); assert.equal(fb.cambios, 1); assert.equal(fb.valores.find((v) => v.codigo === 'proteina').cantidad, 1.2);
    if (db) { const h = await db.query(`select motivo, antes from nutri_historial where alimento_id = $1`, [uuidDe('usda:173944')]); assert.match(h.rows[0].motivo, /2018-04 → 2099-01/); assert.equal(h.rows[0].antes.alimento.version, '2018-04'); }
    // búsqueda
    const b1 = await nutri.buscar('pechuga de pollo'); assert.equal(b1[0].id, uuidDe('usda:2646170'), 'Foundation primero (análisis de laboratorio)'); assert.ok(b1.some((x) => x.id === uuidDe('usda:171077')));
    assert.ok(b1[0].por100.proteina === 22.5 && b1[0].por100.kcal > 0);
    const b2 = await nutri.buscar('ATUN en agua'); assert.equal(b2[0].id, uuidDe('usda:173709'));
    const b3 = await nutri.buscar('arroz cocido'); assert.equal(b3[0].id, uuidDe('usda:168878'));
    const b4 = await nutri.buscar('arroz crudo'); assert.ok([uuidDe('usda:168877'), uuidDe('usda:169756'), uuidDe('usda:2512381')].includes(b4[0].id)); assert.notEqual(b4[0].id, uuidDe('usda:168878'));
    const b5 = await nutri.buscar('cambur'); assert.equal(b5[0].id, uuidDe('usda:173944'));
    const b6 = await nutri.buscar('huevos'); assert.ok(b6.some((x) => x.id === uuidDe('usda:747997')), 'plural → singular');
    const b7 = await nutri.buscar('arroz', { preparacion: 'cocido' }); assert.ok(b7.length && b7.every((x) => x.preparacion === 'cocido'));
    const b8 = await nutri.buscar('arroz', { fuente: 'usda_foundation' }); assert.ok(b8.every((x) => x.fuente === 'usda_foundation') && b8.length === 1);
    const b9 = await nutri.buscar('pechuga de pollo cruda'); assert.equal(b9[0]?.id, uuidDe('usda:2646170'), '"cruda" encuentra "crudo"');
    assert.deepEqual(await nutri.buscar('zzzzqqq'), []);
    // ficha con procedencia
    const f = await nutri.ficha(uuidDe('usda:2646170'));
    assert.equal(f.fuente.licencia, 'CC0 1.0 (dominio público)'); assert.equal(f.importacion.version, '2026-04-30'); assert.equal(f.importacion.sha256, cf.conjunto.sha256);
    const pv = f.valores.find((v) => v.codigo === 'grasa_total'); assert.equal(pv.estado, 'analitico'); assert.match(pv.metodo, /^A ·/); assert.equal(pv.id_externo, '1004'); assert.equal(pv.n, 8);
    const fr = await nutri.ficha(uuidDe('usda:168877')); assert.ok(fr.alternativas.some((x) => x.id === uuidDe('usda:168878') && x.preparacion === 'cocido'), 'muestra la variante cocida como alternativa');
    const fichas = await nutri.fichas([uuidDe('usda:2646170'), uuidDe('usda:168877')]); assert.equal(Object.keys(fichas).length, 2); assert.equal(fichas[uuidDe('usda:2646170')].valores.proteina.c, 22.5);
  });
}

await t('nube: oficial vs. personalizado, permisos del asesorado y del otro coach', async () => {
  const { db, sb, st } = await montar();
  const cf = conjuntoDe('fo', '2026-04-30', foundation); await importarConjunto({ nutri: st.nutri, conjunto: cf.conjunto, fetcher: servir(cf.archivos), pausa: 1 });
  const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Lía', token: 'l'.repeat(32), datos: {} });
  // personalizado del coach
  const mio = await st.nutri.guardarAlimento({ nombre: 'Arepa de la casa', categoria: 'Panes y horneados', valores: [{ codigo: 'energia_kcal', cantidad: 210 }, { codigo: 'proteina', cantidad: 5 }, { codigo: 'carbohidratos_diferencia', cantidad: 40 }, { codigo: 'grasa_total', cantidad: 3 }], energia_ref: 'energia_kcal' });
  assert.equal(mio.calidad, 'personalizado'); assert.equal(mio.fuente, 'coach'); assert.equal(mio.valores.proteina.e, 'personalizado');
  assert.ok((await st.nutri.buscar('arepa casa')).some((x) => x.id === mio.id && x.propio));
  // no puede modificar uno oficial
  await assert.rejects(st.nutri.guardarAlimento({ id: uuidDe('usda:2646170'), nombre: 'Pollo cambiado', valores: [{ codigo: 'proteina', cantidad: 99 }] }), /referencia/);
  assert.equal((await st.nutri.ficha(uuidDe('usda:2646170'))).valores.find((v) => v.codigo === 'proteina').cantidad, 22.5);
  // edición queda en el historial
  await st.nutri.guardarAlimento({ id: mio.id, nombre: 'Arepa de la casa', valores: [{ codigo: 'proteina', cantidad: 6 }] });
  assert.equal((await st.nutri.ficha(mio.id)).cambios, 2);
  // producto de USDA Branded elegido por el coach: etiqueta, nunca "oficial analítico"
  const br = await st.nutri.guardarAlimento(paraGuardar(normalizarUSDA(B.BrandedFoods[1], {}).alimento));
  assert.equal(br.calidad, 'etiqueta'); assert.equal(br.fuente, 'usda_branded');
  // el asesorado (por su enlace) ve el personalizado de su coach, puede guardar productos de OFF, no puede crear personalizados
  assert.ok((await st.nutri.buscar('arepa casa', {}, a.token)).some((x) => x.id === mio.id));
  const off = await st.nutri.guardarAlimento(normalizarOFF(OFF2).alimento, a.token); assert.equal(off.calidad, 'colaborativo'); assert.equal(off.fuente, 'off'); assert.equal(off.tipo, 'comercial');
  const off2 = await st.nutri.guardarAlimento(normalizarOFF(OFF2).alimento, a.token); assert.equal(off2.id, off.id, 'el mismo código no se duplica');
  assert.equal((await st.nutri.buscar('0078000000047'))[0].id, off.id, 'búsqueda por código de barras');
  await assert.rejects(st.nutri.guardarAlimento({ nombre: 'Trampa', valores: [{ codigo: 'proteina', cantidad: 1 }] }, a.token), /solo puede agregar productos comerciales/);
  await assert.rejects(st.nutri.guardarAlimento({ fuente: 'off', codigo_barras: '12345678', nombre: 'Malo', valores: [{ codigo: 'proteina', cantidad: -1 }] }, a.token), /fuera de rango/);
  // otro coach no ve lo personal y no puede importar (ya hay administrador)
  await st.auth.salir(); await st.auth.entrar('o@bt.com', 'x');
  assert.ok(!(await st.nutri.buscar('arepa casa')).some((x) => x.id === mio.id)); assert.equal(await st.nutri.ficha(mio.id), null);
  assert.ok((await st.nutri.buscar('pechuga de pollo')).length > 0, 'la referencia compartida sí');
  await assert.rejects(st.nutri.importacionIniciar({ id: crypto.randomUUID(), fuente: 'usda_foundation', version: 'x', partes: 1 }), /administrador/);
  // nadie escribe directo en la referencia, ni anónimo ni coach
  await assert.rejects(como(db, OTRO, (tx) => tx.query(`update nutri_valores set cantidad = 0 where alimento_id = $1`, [uuidDe('usda:2646170')])), /permission|denied/i);
  await assert.rejects(como(db, null, (tx) => tx.query(`insert into nutri_alimentos (id, fuente_id, nombre, nombre_original, tipo, calidad, busqueda) values (gen_random_uuid(), 'coach', 'x', 'x', 'personalizado', 'personalizado', 'x')`)), /permission|denied/i);
  sb._anon(); assert.equal(await st.nutri.ficha(mio.id), null, 'anónimo sin enlace no ve personalizados');
});

await t('nube: plan, recetas y diario del asesorado', async () => {
  const { st } = await montar();
  const cf = conjuntoDe('fo', '2026-04-30', foundation); await importarConjunto({ nutri: st.nutri, conjunto: cf.conjunto, fetcher: servir(cf.archivos), pausa: 1 });
  const a = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Lía', token: 'l'.repeat(32), datos: {} });
  const b = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Beto', token: 'b'.repeat(32), datos: {} });
  const pollo = uuidDe('usda:2646170'), clara = uuidDe('usda:747997');
  await st.nutri.guardarPlan(a.id, { objetivos: { kcal: 2000, proteina: 120, comidas: [{ nombre: 'Desayuno' }] }, plan: { comidas: [{ nombre: 'Desayuno', proteinas: [{ nombre: 'Pechuga', items: [{ alimento_id: pollo, gramos: 90 }] }] }] } });
  await st.nutri.guardarReceta({ id: crypto.randomUUID(), asesorado_id: a.id, nombre: 'Revoltillo', porciones: 1, ingredientes: [{ alimento_id: clara, nombre: 'Claras', gramos: 198 }] });
  const hoy = new Date().toISOString().slice(0, 10);
  const d = await st.nutri.atletaCargar(a.token, hoy, hoy);
  assert.equal(d.objetivos.kcal, 2000); assert.equal(d.recetas[0].nombre, 'Revoltillo'); assert.ok(d.fichas[pollo] && d.fichas[clara], 'trae las fichas del plan y de las recetas');
  const r = nutrientesDe(d.fichas[pollo], 90); const id = crypto.randomUUID();
  await st.nutri.atletaGuardar(a.token, { id, fecha: hoy, comida: 0, tipo: 'plan', nombre: 'Pechuga', alimento_id: pollo, gramos: 90, nutrientes: { ...r.valores, ...r.principales }, desconocidos: r.desconocidos });
  await st.nutri.atletaGuardar(a.token, { id: crypto.randomUUID(), fecha: hoy, comida: 0, tipo: 'agua', nombre: 'Agua', ml: 500, nutrientes: {} });
  assert.equal((await st.nutri.atletaCargar(a.token, hoy, hoy)).registros.length, 2);
  assert.equal((await st.nutri.registros(a.id, hoy, hoy)).length, 2, 'el coach ve el diario');
  await assert.rejects(st.nutri.atletaGuardar(b.token, { id, fecha: hoy, tipo: 'alimento', nombre: 'robo', nutrientes: {} }), /ajeno/);
  await assert.rejects(st.nutri.atletaGuardar(a.token, { id: crypto.randomUUID(), fecha: '2001-01-01', tipo: 'alimento', nombre: 'viejo', nutrientes: {} }), /fecha/);
  await assert.rejects(st.nutri.atletaGuardar(a.token, { id: crypto.randomUUID(), fecha: hoy, tipo: 'alimento', nombre: 'x', nutrientes: { kcal: -3 } }), /nutrientes/);
  assert.equal(await st.nutri.atletaBorrar(b.token, id), false); assert.equal(await st.nutri.atletaBorrar(a.token, id), true);
});

await t('servidor externo: OFF por código y texto, USDA sin clave y con clave (respuestas reales simuladas)', async () => {
  const resp = (status, body) => ({ ok: status < 400, status, json: async () => body });
  let [st, d] = await consultar({ fuente: 'off', codigo: '0078000000047' }, { f: async (u) => (assert.match(u, /api\/v2\/product\/0078000000047/), resp(200, { status: 1, product: OFF2 })) });
  assert.equal(st, 200); assert.equal(d.productos[0].codigo_barras, '0078000000047'); assert.match(d.atribucion, /ODbL/);
  [st, d] = await consultar({ fuente: 'off', q: 'harina pan' }, { f: async () => resp(200, { count: 2, hits: [OFF1, { code: 'x' }] }) }); assert.equal(d.productos.length, 1); assert.equal(d.descartados, 1);
  [st, d] = await consultar({ fuente: 'off', codigo: '1234567890123' }, { f: async () => resp(404, {}) }); assert.equal(st, 404); assert.deepEqual(d.productos, []);
  [st, d] = await consultar({ fuente: 'usda', q: 'granola' }, { clave: '' }); assert.equal(st, 501); assert.match(d.error, /FDC_API_KEY/);
  [st, d] = await consultar({ fuente: 'usda', id: '1106304' }, { clave: 'k', f: async (u) => (assert.match(u, /fdc\/v1\/food\/1106304\?api_key=k/), resp(200, B.BrandedFoods[1])) });
  assert.equal(st, 200); assert.equal(d.productos[0].fuente, 'usda_branded');
});

await t('lotes publicados: el manifiesto y una parte real se leen y validan', async () => {
  const man = JSON.parse(fs.readFileSync(new URL('../public/datos/nutricion/manifest.json', import.meta.url)));
  const fo = man.conjuntos.find((c) => c.fuente === 'usda_foundation'); assert.ok(fo && fo.partes >= 1 && /^[0-9a-f]{64}$/.test(fo.sha256));
  const l = await leerLote(fs.readFileSync(new URL(`../public/datos/nutricion/${fo.ruta}/parte-001.json.gz`, import.meta.url)));
  assert.equal(l.fuente, 'usda_foundation'); assert.equal(l.version, fo.version); assert.ok(l.alimentos.every((a) => a.id === uuidDe(`usda:${a.id_externo}`)));
  const total = man.conjuntos.reduce((t2, c) => t2 + c.estadisticas.validos, 0); assert.ok(total > 13000, `alimentos publicados: ${total}`);
});
await t('plan de selección flexible: lee objetivos, comidas, opciones con cantidades, semana 1, grasas y agua', async () => {
  const { leerPlan, objetivosDePlan, itemsDeCantidad, numES } = await import('../src/lib/nutricion/plan.js');
  const { idsCandidatos, vincularPlan } = await import('../src/lib/nutricion/vincular.js');
  const { lineas } = JSON.parse(fs.readFileSync(new URL('./fixtures/plan_seleccion_flexible.json', import.meta.url)));
  assert.equal(numES('2.300'), 2300); assert.equal(numES('21,6'), 21.6); assert.equal(numES('5½'), 5.5);
  assert.deepEqual(itemsDeCantidad('Huevo entero', '3 huevos + 1 clara'), [{ nombre: 'Huevo entero', gramos: 150, unidades: 3 }, { nombre: 'Claras de huevo', gramos: 33, unidades: 1 }]);
  const plan = leerPlan(lineas);
  assert.equal(plan.nombre, 'Asesorada Ejemplo'); assert.equal(plan.emitido, '2026-10-26');
  assert.deepEqual(plan.objetivos, { kcal: 2300, proteina: 115, carbohidratos: 325, grasa: 60, comidas: 4 });
  assert.deepEqual(plan.semana1, { kcal: 2100, proteina: 115, carbohidratos: 275, grasa: 60 });
  assert.deepEqual(plan.agua, { min_ml: 2500, max_ml: 3000 });
  assert.deepEqual(plan.comidas.map((c) => c.nombre), ['Desayuno', 'Almuerzo', 'Merienda', 'Cena']);
  const cena = plan.comidas[3];
  assert.equal(cena.kcal, 615); assert.equal(cena.porciones_grasa, 2); assert.deepEqual(cena.semana1, { kcal: 555, carbohidratos: 75 });
  const pollo = cena.proteinas.find((p) => p.nombre === 'Pechuga de pollo'); assert.deepEqual(pollo.items, [{ nombre: 'Pechuga de pollo', gramos: 90 }]); assert.equal(pollo.color, 'verde');
  const cerdo = cena.proteinas.find((p) => p.nombre === 'Cerdo con grasa'); assert.equal(cerdo.color, 'roja'); assert.equal(cerdo.resta_otra, 1);
  const pan = cena.carbohidratos.find((c) => c.nombre === 'Pan 100 % integral'); assert.equal(pan.items[0].gramos, 195); assert.equal(pan.semana1.items[0].gramos, 165); assert.match(pan.nota, /1 porción de grasa/);
  const salmas = cena.carbohidratos.find((c) => c.nombre === 'Galletas Salmas'); assert.equal(salmas.no_semana1, true); assert.equal(salmas.semana1, null);
  const nachos = cena.carbohidratos.find((c) => /^Nachos/.test(c.nombre)); assert.equal(nachos.nombre, 'Nachos naturales (solo ½ porción)'); assert.equal(nachos.media, true); assert.equal(nachos.items[0].gramos, 65);
  const merienda = plan.comidas[2]; assert.equal(merienda.dos_medias, true); assert.ok(merienda.frutas.length >= 8, 'frutas de la merienda'); assert.ok(merienda.frutas.every((f) => f.gramos > 0));
  assert.ok(plan.grasas.find((g) => g.nombre === 'Aceite de oliva' && g.items[0].ml === 5));
  const o = objetivosDePlan(plan); assert.equal(o.agua_ml, 2500); assert.equal(o.comidas.length, 4); assert.equal(o.comidas[0].kcal, 575);
  // cada alimento del plan tiene candidatos en USDA; sin fichas cargadas, quedan marcados "sin ficha" (no se inventan números)
  assert.ok(idsCandidatos(plan).length > 20);
  const v = vincularPlan(plan, {}); const todos = v.plan.comidas.flatMap((c) => [...c.proteinas, ...c.carbohidratos, ...c.frutas]).flatMap((x) => x.items);
  assert.equal(v.resumen.vinculados, 0); assert.ok(todos.length > 50 && todos.every((i) => i.vinculo === 'sin_ficha' && !i.alimento_id));
  // con la ficha real de la pechuga cruda (USDA Foundation), la pechuga del plan se vincula y suma con los gramos del plan
  const pech = norm(porFdc('FoundationFoods', 2646170), '2026-04-30'); const fichas = { [pech.id]: { ...ficha(pech), nombre: pech.nombre } };
  const w = vincularPlan(plan, fichas); const op = w.plan.comidas[3].proteinas.find((p) => p.nombre === 'Pechuga de pollo');
  assert.equal(op.items[0].alimento_id, pech.id); assert.equal(op.items[0].vinculo, 'auto');
  const { totalOpcion } = await import('../src/lib/nutricion/vincular.js'); const tot = totalOpcion(op, fichas);
  assert.equal(tot.proteina, (90 * 22.5) / 100, '90 g × 22,5 g/100 g'); assert.ok(Math.abs(tot.proteina - op.proteina) < 0.5, 'coincide con lo que dice el PDF (20,3 g)');
});
await t('otras preparaciones: el mismo corte, con las mismas reglas en el teléfono y en Supabase', async () => {
  const { parecido, MISMO_ALIMENTO } = await import('../src/lib/nutricion/clasificar.js');
  const { db } = await montar(); const a = 'Chicken, breast, boneless, skinless, raw';
  const pares = [['Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised', true], ['Chicken, broilers or fryers, breast, meat only, cooked, roasted', true],
    ['Chicken, thigh, meat only, fried', false], ['Chicken, ground, raw', false], ['Chicken, broilers or fryers, breast, meat and skin, cooked, fried, batter', false]];
  for (const [b, mismo] of pares) {
    const js = parecido(a, b); const sql = Number((await db.query('select public.nutri_parecido($1, $2) p', [a, b])).rows[0].p);
    assert.ok(Math.abs(js - sql) < 1e-9, `${b}: ${js} vs ${sql}`); assert.equal(js >= MISMO_ALIMENTO, mismo, b);
  }
});
console.log(`\n${ok} pruebas OK`);
