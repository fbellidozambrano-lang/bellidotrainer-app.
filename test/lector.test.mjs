// Lector gratuito del teléfono: de las cajas de texto del OCR (PaddleOCR) a la tabla nutricional, sin OCR real:
// las cajas se arman a mano como las devuelve el lector (con sus errores típicos), y también se prueban
// las cajas del detector, el enderezado de la foto y el recorte de la tabla en la foto original.
import assert from 'node:assert/strict';
const T = await import('../src/lib/nutricion/tabla.js');
const L = await import('../src/lib/nutricion/lector.js');
const I = await import('../src/lib/nutricion/imagen.js');
const C = await import('../src/lib/nutricion/cajas.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };

// una caja como las del OCR; `m` inclina la foto (y sube con x)
const caja = (text, x, y, { w = text.length * 11, h = 22, m = 0, conf = 0.95 } = {}) => ({ text, box: { x, y: y + m * x, width: w, height: h }, confidence: conf });
const por = (l) => Object.fromEntries(l.filas.map((f) => [f.codigo, f]));

await t('tabla venezolana torcida: filas, % VD en su columna, porción y revisión con las calorías', () => {
  const m = 0.04; const fila = (y, ...cs) => cs.map(([tx, x]) => caja(tx, x, y, { m }));
  const lineas = [
    fila(20, ['INFORMACIÓN NUTRICIONAL', 20]), fila(55, ['Tamaño de la porción: 1 taza (30 g)', 20]), fila(85, ['Porciones por envase: aprox. 15', 20]),
    fila(130, ['Calorías', 20], ['120', 230]), fila(165, ['% Valor Diario*', 330]),
    fila(200, ['Grasa total', 20], ['1,5 g', 160], ['2%', 380]), fila(235, ['Grasa saturada', 40], ['0 g', 200], ['0%', 380]),
    fila(270, ['Sodio', 20], ['140 mg', 100], ['6%', 380]), fila(305, ['Carbohidratos totales', 20], ['24 g', 260], ['8%', 380]),
    fila(340, ['Fibra dietética', 40], ['3 g', 200], ['12%', 380]), fila(375, ['Azúcares', 40], ['6 g', 140]), fila(410, ['Proteínas', 20], ['3 g', 140]),
  ];
  const l = T.leerTabla(lineas); const f = por(l);
  assert.deepEqual(l.porcion.cantidad, 30); assert.equal(l.porciones_envase, 15);
  assert.deepEqual(['energia_kcal', 'grasa_total', 'sodio', 'carbohidratos_etiqueta', 'proteina'].map((c) => f[c].porPorcion), [120, 1.5, 140, 24, 3]);
  assert.ok(f.sodio.confirmado && f.carbohidratos_etiqueta.confirmado && f.fibra_total.confirmado, 'el % VD confirma los números');
  assert.equal(l.cuadra, true, '120 kcal cuadra con 3 g P, 24 g C y 1,5 g G');
  assert.ok(l.filas.every((x) => !x.dudoso));
});

await t('tabla europea: columnas por 100 g y por porción, kJ y kcal en la misma celda', () => {
  const lineas = [[caja('Información nutricional', 10, 10)], [caja('Por 100 g', 250, 50), caja('Por porción (40 g)', 400, 50)],
    [caja('Valor energético', 10, 90), caja('1580 kJ / 375 kcal', 250, 90), caja('632 kJ / 150 kcal', 400, 90)],
    [caja('Grasas', 10, 125), caja('7,0 g', 250, 125), caja('2,8 g', 400, 125)], [caja('de las cuales saturadas', 10, 160), caja('1,2 g', 250, 160), caja('0,5 g', 400, 160)],
    [caja('Hidratos de carbono', 10, 195), caja('60 g', 250, 195), caja('24 g', 400, 195)], [caja('Proteínas', 10, 230), caja('11 g', 250, 230), caja('4,4 g', 400, 230)],
    [caja('Sal', 10, 265), caja('0,50 g', 250, 265), caja('0,20 g', 400, 265)]];
  const l = T.leerTabla(lineas); const f = por(l);
  assert.deepEqual([f.energia_kcal.por100, f.energia_kcal.porPorcion, f.energia_kj.por100, f.grasa_total.por100, f.grasa_saturada.porPorcion, f.proteina.por100, f.sal.por100], [375, 150, 1580, 7, 0.5, 11, 0.5]);
  assert.equal(l.porcion.cantidad, 40);
});

await t('celdas de dos líneas: encabezado partido, "kcal" debajo del número y rótulo arriba y abajo de los números', () => {
  const lineas = [[caja('Por porción', 700, 200)], [caja('Por 100 g', 450, 222)], [caja('(40 g)', 705, 244)],
    [caja('1580 kJ/ 375', 480, 300), caja('632 kJ / 150', 775, 300)], [caja('Valor energético', 128, 322)], [caja('kcal', 620, 341), caja('kcal', 894, 341)],
    [caja('Grasas', 128, 400), caja('7,0g', 605, 400), caja('2,8g', 880, 400)],
    [caja('de las cuales', 128, 457)], [caja('1,2 g', 607, 479), caja('0,5 g', 880, 479)], [caja('saturadas', 127, 498)],
    [caja('Hidratos de carbono', 128, 556), caja('60 g', 615, 556), caja('24 g', 886, 556)],
    [caja('Azúcares 0g', 128, 600), caja('0%', 800, 600)], [caja('Proteínas', 127, 640), caja('11 g', 620, 640), caja('4,4g', 880, 640)]];
  const l = T.leerTabla(lineas); const f = por(l);
  assert.equal(l.porcion.cantidad, 40); assert.deepEqual(l.avisos.filter((a) => /dedujo/.test(a)), [], 'la porción sale del encabezado');
  assert.deepEqual(['energia_kcal', 'energia_kj', 'grasa_total', 'grasa_saturada', 'carbohidratos_etiqueta', 'azucares_totales', 'proteina'].map((c) => [f[c]?.por100, f[c]?.porPorcion]),
    [[375, 150], [1580, 632], [7, 2.8], [1.2, 0.5], [60, 24], [0, null], [11, 4.4]]);
});

await t('errores típicos del OCR: "Ilg", "CholesterolOmg", "Carb. Total", ruido a la izquierda y un rótulo en dos líneas', () => {
  const lineas = [[caja('Serving size 1 cup (28g)', 10, 10)], [caja('Calories', 10, 45), caja('110', 300, 45)],
    [caja('Total Fat Og', 10, 80), caja('0%', 330, 80)], [caja('CholesterolOmg', 10, 115), caja('0%', 330, 115)],
    [caja('0', 0, 150, { w: 8 }), caja('Total Carbohydrate24g', 14, 150), caja('9%', 330, 150)],
    [caja('Carb. Total / Total Carb. Ilg', 10, 185)],
    [caja('Hidratos de carbono', 10, 220)], [caja('disponibles (g)', 10, 248), caja('55', 300, 248)],
    [caja('Fibra Diet./ Diet. Fiber lg', 10, 285), caja('4%', 330, 285)], [caja('Protein 3g', 10, 320)]];
  const l = T.leerTabla(lineas); const f = por(l);
  assert.equal(f.grasa_total.porPorcion, 0); assert.equal(f.colesterol?.porPorcion, 0, '"CholesterolOmg" es 0 mg');
  assert.equal(f.carbohidratos_etiqueta.porPorcion, 24, 'un número suelto a la izquierda no se come el rótulo');
  assert.equal(f.fibra_total.porPorcion, 1, '"lg" es 1 g'); assert.equal(f.proteina.porPorcion, 3);
  const dos = T.leerTabla([[caja('Porción: 25 g', 10, 10)], [caja('Hidratos de carbono', 10, 50)], [caja('disponibles (g)', 10, 78), caja('14', 300, 78)], [caja('Proteínas (g)', 10, 115), caja('2,1', 300, 115)]]);
  assert.equal(por(dos).carbohidratos_etiqueta?.porPorcion, 14, 'el rótulo partido en dos líneas se une');
  assert.equal(T.leerTabla([[caja('Carb. Total / Total Carb. Ilg', 10, 10)]]).filas[0]?.porPorcion, 11, '"Carb. Total" y "Ilg" = 11 g');
});

await t('frente: el nombre partido en dos líneas del mismo tamaño se ofrece junto; contenido neto', () => {
  const r = T.leerFrente([[caja('AVENA DORADA', 30, 20, { h: 22 })], [caja('Hojuelas de', 30, 90, { h: 60, w: 330 })], [caja('avena', 30, 150, { h: 60, w: 170 })],
    [caja('Integral · sin azúcar añadido', 30, 230, { h: 26 })], [caja('Contenido neto 450 g', 30, 330, { h: 30 })]]);
  assert.equal(r.lineas[0], 'Hojuelas de avena'); assert.ok(r.lineas.includes('AVENA DORADA')); assert.equal(r.contenido, '450 g');
});

await t('cajas del detector: umbral, puntaje, expansión y escala a la foto original', () => {
  const W = 64, H = 32; const p = new Float32Array(W * H);
  const pinta = (x0, y0, x1, y1, v) => { for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) p[y * W + x] = v; };
  pinta(4, 4, 40, 8, 0.9); pinta(4, 14, 30, 18, 0.9); pinta(50, 24, 60, 28, 0.45); for (let i = 0; i < p.length; i += 7) p[i] = Math.max(p[i], 0.05);
  const cs = C.cajasDB(p, W, H, { resizeRatio: 0.5, originalWidth: 128, originalHeight: 64 });
  assert.equal(cs.length, 2, 'dos líneas separadas; la mancha con puntaje bajo no cuenta; el ruido < 0,3 no une nada');
  const [a] = cs.sort((x, y) => x.y - y.y); assert.ok(a.x <= 8 && a.width >= 72 && a.height >= 8 && a.height < 20, JSON.stringify(a));
});

await t('enderezar y recortar: el ángulo del texto y la zona de la tabla vuelven a la foto original', () => {
  // foto de 400 × 300 con "renglones" oscuros inclinados 4°
  const im = I.nueva(400, 300); im.data.fill(255);
  for (let r = 0; r < 8; r++) for (let x = 40; x < 360; x++) { const y = Math.round(40 + r * 28 + Math.tan((4 * Math.PI) / 180) * (x - 200)); for (let k = 0; k < 6; k++) { const i = ((y + k) * 400 + x) * 4; im.data[i] = im.data[i + 1] = im.data[i + 2] = 20; } }
  assert.ok(Math.abs(I.inclinacionTexto(im).angulo - 4) <= 0.5, `ángulo ${I.inclinacionTexto(im).angulo}`);
  // cuadrado rojo en la original; se busca en la imagen escalada y girada 90° y se recorta de la original
  const o = I.nueva(400, 300); o.data.fill(255); for (let y = 200; y < 260; y++) for (let x = 300; x < 380; x++) { const i = (y * 400 + x) * 4; o.data[i + 1] = o.data[i + 2] = 0; }
  const chica = I.escalar(o, 200, 150); const girada = I.rotar(chica, 90); // 150 × 200
  // en la girada (horario 90°): x' = 149 - y, y' = x → el cuadrado (150..190, 100..130 en la chica) queda en x' 19..49, y' 150..190
  const rec = L.recorteOriginal(o, [{ k: 0.5 }, { g: 90, w: 200, h: 150 }], { x: 19, y: 150, w: 31, h: 41 }, 400);
  assert.ok(rec && rec.height > rec.width, 'el recorte sale girado como la imagen leída');
  let rojos = 0; for (let i = 0; i < rec.data.length; i += 4) if (rec.data[i] > 200 && rec.data[i + 1] < 60) rojos++;
  assert.ok(rojos / (rec.width * rec.height) > 0.8, `casi todo el recorte es el cuadrado (${Math.round((rojos / (rec.width * rec.height)) * 100)} %)`);
});

await t('revisión: kJ puestos como kcal, porción imposible, columnas que no guardan proporción y columna de unidades', () => {
  // "Energía 770" sin kJ aparte y 6,3 g P, 39 g C y 0,5 g G: 770 ÷ 4,184 ≈ 184 kcal cuadra → eran kJ
  const kj = T.leerTabla([[caja('Porción: 50 g', 10, 10)], [caja('Energía', 10, 50), caja('770', 300, 50)], [caja('Proteínas', 10, 85), caja('6,3 g', 300, 85)],
    [caja('Carbohidratos', 10, 120), caja('39 g', 300, 120)], [caja('Grasa total', 10, 155), caja('0,5 g', 300, 155)]]);
  assert.ok(por(kj).energia_kj && !por(kj).energia_kcal && por(kj).energia_kj.dudoso && kj.avisos.some((x) => /kJ/.test(x)));
  // con 25 g de porción, 2,6 + 23 + 10 g por porción serían 142 g en 100 g: la porción está mal leída
  const imp = T.leerTabla([[caja('Porción 25 g', 10, 10)], [caja('Calorías', 10, 50), caja('195', 300, 50)], [caja('Proteína', 10, 85), caja('2,6 g', 300, 85)],
    [caja('Carbohidratos', 10, 120), caja('23 g', 300, 120)], [caja('Grasa total', 10, 155), caja('10 g', 300, 155)]]);
  assert.ok(imp.porcion.dudosa && imp.avisos.some((x) => /sumarían 142 g/.test(x)), imp.avisos.join(' | '));
  // por porción 140 mg y por 100 g 240 mg con porción de 30 g: no cuadra (sería 467) → en ámbar
  const prop = T.leerTabla([[caja('Por porción (30 g)', 130, 10), caja('Por 100 g', 360, 10)], [caja('Sodio', 10, 50), caja('140 mg', 200, 50), caja('240 mg', 380, 50)],
    [caja('Proteínas', 10, 85), caja('3 g', 200, 85), caja('10 g', 380, 85)]]);
  assert.ok(por(prop).sodio.dudoso && !por(prop).proteina.dudoso);
  // la columna de unidades: "g" leída como "9" no es un número
  const uni = T.leerTabla([[caja('Información nutricional', 10, 10), caja('Por 100 g', 340, 10), caja('Por porción', 470, 10)],
    [caja('Energía', 10, 50), caja('Kcal', 260, 50), caja('380', 360, 50), caja('190', 500, 50)], [caja('Proteínas', 10, 90), caja('9', 280, 90), caja('6', 370, 90), caja('3', 505, 90)],
    [caja('Grasas totales', 10, 130), caja('9', 280, 130), caja('1', 370, 130), caja('0,5', 505, 130)], [caja('Carbohidratos totales', 10, 170), caja('9', 280, 170), caja('85', 370, 170), caja('42', 505, 170)], [caja('Sodio', 10, 210), caja('mg', 275, 210), caja('240', 370, 210), caja('120', 505, 210)]]);
  assert.deepEqual(['energia_kcal', 'proteina', 'grasa_total', 'carbohidratos_etiqueta'].map((c) => [por(uni)[c]?.por100, por(uni)[c]?.porPorcion]), [[380, 190], [6, 3], [1, 0.5], [85, 42]]);
});

await t('código de barras: dígito de control y número impreso debajo de las barras', () => {
  assert.ok(T.gtinValido('7591234567894') && T.gtinValido('036000291452') && T.gtinValido('96385074'));
  assert.ok(!T.gtinValido('7591234567895') && !T.gtinValido('12345'));
  const lin = [[caja('7 591234 567894', 10, 10)], [caja('Lote 12345678 · Reg. 2024', 10, 40)]];
  assert.deepEqual(T.codigosEnTexto(lin), ['7591234567894']);
  assert.deepEqual(T.resolverCodigo('7591234567894', lin), { codigo: '7591234567894', codigoEstado: 'confirmado' });
  assert.deepEqual(T.resolverCodigo('7591234567887', lin), { codigo: '7591234567887', codigoEstado: 'distinto' }, 'las barras dicen otra cosa que el número');
  assert.deepEqual(T.resolverCodigo('', lin), { codigo: '7591234567894', codigoEstado: 'impreso' });
  assert.deepEqual(T.resolverCodigo('7591234567894', []), { codigo: '7591234567894', codigoEstado: 'barras' });
  assert.deepEqual(T.resolverCodigo('', [[caja('Lote 96385074', 0, 0)]]), { codigo: '', codigoEstado: '' }, 'un número de 8 cifras suelto no se toma como código');
});

await t('foto oscura: el contraste se estira; una foto normal queda igual', () => {
  const os = I.nueva(50, 50); for (let i = 0; i < os.data.length; i += 4) { const v = i % 40 < 20 ? 30 : 90; os.data[i] = os.data[i + 1] = os.data[i + 2] = v; os.data[i + 3] = 255; }
  const c = I.contraste(os); assert.notEqual(c, os); assert.ok(c.data[0] <= 5 && Math.max(...c.data.filter((_, i) => i % 4 === 0)) >= 250);
  const bien = I.nueva(50, 50); for (let i = 0; i < bien.data.length; i += 4) { const v = i % 40 < 20 ? 0 : 255; bien.data[i] = bien.data[i + 1] = bien.data[i + 2] = v; bien.data[i + 3] = 255; }
  assert.equal(I.contraste(bien), bien);
});

console.log(`\n${ok} pruebas del lector del teléfono OK`);
