// Lee planes del "Sistema de selección flexible" de BELLIDOTRAINER (líneas de texto de pdf.js)
// y los convierte en datos: objetivos del día, cada comida con sus opciones de proteína y
// carbohidrato y sus cantidades, frutas, opciones o recetas fijas, equivalencias de grasa, agua y libres.
//
// No depende de un diseño exacto: busca el CONTENIDO (títulos de comida seguidos de sus kcal,
// encabezados de tabla con "proteína"/"carbohidrato"/"fruta"/"ingrediente", filas que terminan en
// gramos de macros) y arma cada fila de derecha a izquierda, así sirve para formatos distintos
// con el mismo contenido. Lo que no entiende lo deja en `avisos` para que el coach lo revise.
// Las cantidades son las del plan; los nutrientes se calculan después con la ficha real de cada alimento.

const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const bajo = (s) => sinAcento(s).toLowerCase().replace(/\s+/g, ' ').trim();
// "2.300" → 2300 · "21,6" → 21.6 · "4½" → 4.5
export function numES(t) {
  let s = String(t ?? '').trim().replace('½', '.5').replace('¼', '.25').replace('¾', '.75');
  s = s.replace(/(\d)\.(5|25|75)$/, '$1.$2');
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : null;
}
const NUM = '(\\d{1,3}(?:\\.\\d{3})+|\\d+(?:[.,]\\d+)?)';
const gramosTxt = (t) => { const m = String(t).match(/(\d+(?:[.,]\d+)?)\s*g\b/); return m ? numES(m[1]) : null; };
const partes = (l) => String(l || '').split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
const esG = (t) => /^-?\d+(?:[.,]\d+)?\s*g$/.test(String(t).trim());
const esPorc = (t) => /^\d+\s*\*?$/.test(String(t).trim());
const NO_S1 = /^NO EN SEM\.? ?1$/i;
const balance = (s) => (String(s).match(/\(/g) || []).length - (String(s).match(/\)/g) || []).length;
const empiezaCantidad = (t) => /^(\d|½|¼|¾)/.test(String(t).trim());
const esPie = (l) => /^BELLIDOTRAINER ·/.test(l) || /\bP[aá]g\. \d+\s*$/.test(l);

// ---------- cantidades → gramos ----------
// Convenciones del plan (SKILL de selección flexible): clara 33 g, huevo 50 g, yema 17 g, whey 30 g = 1 medida.
export const PESOS = { clara: 33, huevo: 50, yema: 17, medida: 30 };
const FRAC = { media: 0.5, medio: 0.5, 'un tercio': 1 / 3, 'dos tercios': 2 / 3, 'un cuarto': 0.25, 'tres cuartos': 0.75 };
// "3 y media" → 3.5 · "1 y un tercio" → 1.333
function cuantas(txt) {
  const m = bajo(txt).match(/^(\d+(?:[.,]\d+)?|½)(?:\s+y\s+(media|medio|un tercio|dos tercios|un cuarto|tres cuartos))?/);
  return m ? numES(m[1]) + (m[2] ? FRAC[m[2]] : 0) : null;
}
const UNIDAD = /(huevos?|claras?|yemas?|rebanadas?|unidad(?:es)?|tortitas?|medidas?|lonjas?|cucharaditas?|cucharadas?|tazas?|galletas?)/;
export function itemsDeCantidad(nombre, cantidad) {
  const c = bajo(cantidad); if (!c) return [];
  // "2 huevos + 6 claras" · "1 huevo + 5 claras"
  const hc = c.match(/(\d+)\s*huevos?(?:\s*enteros?)?\s*\+\s*(\d+)\s*claras?/);
  if (hc) return [{ nombre: 'Huevo entero', gramos: Number(hc[1]) * PESOS.huevo, unidades: Number(hc[1]) }, { nombre: 'Claras de huevo', gramos: Number(hc[2]) * PESOS.clara, unidades: Number(hc[2]) }];
  // "250 g + 10 g de whey" (yogur + whey)
  const dos = c.match(/^(\d+(?:[.,]\d+)?)\s*g\s*\+\s*(\d+(?:[.,]\d+)?)\s*g\s*de\s+(.+)$/);
  if (dos) return [{ nombre: String(nombre).split('+')[0].trim(), gramos: numES(dos[1]) }, { nombre: dos[3].trim(), gramos: numES(dos[2]) }];
  // gramos o mililitros escritos ("135 g", "40 g (1 medida y un tercio)", "2 unidades medianas (200 g)", "1 cucharadita rasa (5 ml)")
  // "130 g de plátano verde para la masa": el alimento que se pesa es el que dice la cantidad (salvo la harina de la arepa)
  const de = String(cantidad).match(/\d\s*g\s+de\s+([A-Za-zÁÉÍÓÚÑáéíóúñ ]+?)(?:\s+para\b|\s*\(|,|$)/);
  // gramos fuera del paréntesis o, si no, dentro; nunca los de una nota ("1 yema (suma 3 g de proteína)")
  const dentro = (c.match(/\(([^)]*)\)/g) || []).filter((x) => !/suma|aporta|prote|carbo|grasa|kcal/.test(x)).join(' ');
  const g = gramosTxt(c.replace(/\([^)]*\)/g, ' ')) ?? gramosTxt(dentro); if (g != null) return [{ nombre: de && !/harina|whey/i.test(de[1]) && de[1].trim().length > 2 ? de[1].trim() : nombre, gramos: g }];
  const ml = c.replace(/\([^)]*(suma|aporta)[^)]*\)/g, ' ').match(/(\d+(?:[.,]\d+)?)\s*ml\b/); if (ml) return [{ nombre, ml: numES(ml[1]) }];
  // unidades: huevos, claras, yemas y medidas tienen peso fijo del plan; rebanadas y unidades se resuelven con la porción de la ficha
  const u = c.match(UNIDAD); let n = cuantas(c);
  const yFrac = c.match(/^\d+(?:[.,]\d+)?\s+[a-z]+\s+y\s+(media|medio|un tercio|dos tercios|un cuarto|tres cuartos)\b/); // "3 rebanadas y media"
  if (n && yFrac) n += FRAC[yFrac[1]];
  if (n && u) {
    let un = u[1].replace(/es$|s$/, '').replace(/^unidade?$/, 'unidad');
    if (un === 'unidad') { const nb = bajo(nombre); un = /clara/.test(nb) ? 'clara' : /yema/.test(nb) ? 'yema' : /huevo/.test(nb) ? 'huevo' : un; } // "Huevos enteros · 2 unidades"
    if (/^huevo/.test(un)) return [{ nombre: /^huevos?$/.test(bajo(nombre)) || /entero|huevo/.test(bajo(nombre)) ? nombre : 'Huevo entero', gramos: n * PESOS.huevo, unidades: n }];
    if (/^clara/.test(un)) return [{ nombre, gramos: n * PESOS.clara, unidades: n }];
    if (/^yema/.test(un)) return [{ nombre, gramos: n * PESOS.yema, unidades: n }];
    if (/^medida/.test(un)) return [{ nombre, gramos: n * PESOS.medida, unidades: n }];
    return [{ nombre, unidades: n, unidad: un }];
  }
  return [];
}
// semáforo por la grasa de la porción de proteína (≤ 4,4 verde · 4,5–10,4 amarilla · ≥ 10,5 roja)
export const colorProteina = (grasa) => (grasa == null ? null : grasa <= 4.4 ? 'verde' : grasa < 10.5 ? 'amarilla' : 'roja');

// ---------- filas ----------
// Una fila de tabla se lee de derecha a izquierda: [nota] [(resta N…)] [porciones] macro macro cantidad(es) nombre.
// tipo 'proteina': macros = proteína, grasa (+ porciones que quedan) · 'carbo': macros = carbohidrato, proteína (+ nota)
function fila(l, tipo, conS1) {
  const p = partes(l); if (p.length < 3) return null;
  if (empiezaCantidad(p[0]) || NO_S1.test(p[0])) return null; // sin nombre: la fila viene partida
  let i = p.length - 1; const notas = []; let resta = 0; let porciones = null;
  while (i > 0 && !esG(p[i])) {
    const t = p[i]; const r = t.match(/resta\s+(\d+)/i);
    if (r) resta = Number(r[1]);
    else if (tipo === 'proteina' && porciones == null && esPorc(t)) { porciones = numES(t.replace('*', '')); if (/\*/.test(t)) resta = resta || 1; } // "0 *" sin decir cuánto: al menos 1
    else if (t === '*') resta = resta || 1;
    else if (tipo === 'proteina' && porciones != null && /\*$/.test(t)) resta = resta || 1;
    else notas.unshift(t);
    i--;
  }
  if (i < 2 || !esG(p[i]) || !esG(p[i - 1])) return null;
  const m2 = numES(p[i]), m1 = numES(p[i - 1]);
  const medio = p.slice(1, i - 1); let noS1 = false;
  const cant = medio.filter((x) => { if (NO_S1.test(x)) { noS1 = true; return false; } return true; });
  if (tipo === 'proteina' && porciones == null && notas.length) { const k = notas.findIndex((x) => esPorc(x)); if (k >= 0) porciones = numES(notas.splice(k, 1)[0].replace('*', '')); }
  const r = { nombre: p[0], nota: notas.join(' ').trim(), no_semana1: noS1 };
  if (conS1 && cant.length >= 2) { r.cantidad = cant[cant.length - 1]; r.cantidad_s1 = cant[cant.length - 2]; }
  else r.cantidad = cant.length ? cant.join(' ') : null;
  if (tipo === 'proteina') Object.assign(r, { proteina: m1, grasa: m2, porciones_quedan: porciones, resta_otra: resta, color: colorProteina(m2) });
  else Object.assign(r, { carbohidratos: m1, proteina: m2 });
  return r;
}
// Junta las filas de una tabla, con nombres, cantidades y notas partidas en varias líneas.
function leerTabla(L, desde, hasta, tipo, conS1) {
  const out = []; let pend = [];
  const cerrar = (r) => {
    if (pend.length) {
      const pp = partes(pend.join('  '));
      // "55 g de harina (1 arepa" / fila sin cantidad / "mediana)": la cantidad venía arriba (y a veces con su nota al lado)
      if (!r.cantidad && empiezaCantidad(pp[0])) { r.cantidad = pp[0]; if (pp.length > 1) r.nota = `${pp.slice(1).join(' ')} ${r.nota || ''}`.trim(); }
      else r.nota = `${pp.join(' ')} ${r.nota || ''}`.trim();
      pend = [];
    }
    out.push(r);
  };
  for (let k = desde; k < hasta; k++) {
    const l = L[k]; if (!l || esPie(l)) continue;
    let r = fila(l, tipo, conS1);
    if (!r && pend.length) { // fila sin nombre: el nombre (y a veces la nota) venía en la línea anterior
      const pp = partes(pend.join('  ')); const unida = fila(`${pp[0]}  ${l}`, tipo, conS1);
      if (unida) { pend = []; if (pp.length > 1) unida.nota = `${pp.slice(1).join(' ')} ${unida.nota}`.trim(); r = unida; }
    }
    if (r) { cerrar(r); continue; }
    const t = l.trim(); const prev = out[out.length - 1]; const pt = partes(t);
    // continuación de la fila anterior: un paréntesis abierto o texto que sigue en minúscula
    if (prev && (balance(prev.nombre) > 0 || balance(prev.cantidad || '') > 0 || /^[a-záéíóúñ(]/.test(t)) && !empiezaCantidad(t)) {
      if (balance(prev.nombre) > 0) prev.nombre = `${prev.nombre} ${pt.shift()}`.trim();
      else if (balance(prev.cantidad || '') > 0) prev.cantidad = `${prev.cantidad} ${pt.shift()}`.trim();
      if (pt.length) prev.nota = `${prev.nota || ''} ${pt.join(' ')}`.trim();
      continue;
    }
    if (prev && !prev.cantidad && pend.length === 0 && balance(t) < 0) { prev.cantidad = t; continue; }
    pend.push(t);
  }
  if (pend.length && out.length) out[out.length - 1].nota = `${out[out.length - 1].nota || ''} ${pend.join(' ')}`.trim();
  out.forEach((r) => {
    r.nombre = r.nombre.replace(/\s+/g, ' ').trim();
    if (/solo ½|½ porci|media porci/i.test(r.nombre)) r.media = true;
    r.items = itemsDeCantidad(r.nombre, r.cantidad);
    if (tipo === 'carbo') r.semana1 = r.no_semana1 ? null : { cantidad: r.cantidad_s1 || r.cantidad, items: itemsDeCantidad(r.nombre, r.cantidad_s1 || r.cantidad) };
    delete r.cantidad_s1;
  });
  return out;
}
// frutas en bloques de tres: nombre, cantidad, medida casera (una o dos frutas por línea)
function leerFrutas(L, desde, hasta, media) {
  const out = [];
  for (let i = desde; i < hasta; i++) {
    if (esPie(L[i])) continue; const p = partes(L[i]); let n = 0;
    for (let j = 0; j + 1 < p.length; j += 3) { const g = gramosTxt(p[j + 1]); if (g && !empiezaCantidad(p[j])) { out.push({ nombre: p[j], gramos: g, medida: p[j + 2] || '', media, items: [{ nombre: p[j], gramos: g }] }); n++; } }
    if (!n) break;
  }
  return out;
}
// opción o receta fija: viñetas "• 30 g de whey protein (1 medida)" o tabla "INGREDIENTE  CANTIDAD  NOTA"
function itemDeTexto(t) {
  const s = String(t).replace(/^[•·\-–]\s*/, '').trim();
  const m = s.match(/^(?:base:|encima:)?\s*(\d+(?:[.,]\d+)?)\s*(g|ml)\s+de\s+([^(,]+?)(?:\s+o\s+.*)?(?:\(|,|$)/i);
  if (m) return { nombre: m[3].trim(), ...(m[2].toLowerCase() === 'g' ? { gramos: numES(m[1]) } : { ml: numES(m[1]) }), texto: s };
  const u = s.match(/^(?:base:|encima:)?\s*(\d+)\s+(galletas?|unidades?|huevos?|claras?)\s+(?:de\s+)?([^(,]+)/i);
  if (u) { const it = itemsDeCantidad(u[3].trim(), `${u[1]} ${u[2]}`)[0]; if (it) return { ...it, nombre: /huevo|clara/.test(u[2]) ? it.nombre : u[3].trim(), texto: s }; }
  return { nombre: s, texto: s };
}

// ---------- números con etiquetas ----------
// "2.350  180 g  240 g  75 g  4" + "KCAL AL DÍA  PROTEÍNA  CARBOHIDRATO  GRASA  COMIDAS"
function etiquetados(numeros, etiquetas) {
  const n = partes(numeros); const e = partes(etiquetas).map(bajo); if (n.length < 3 || n.length !== e.length) return null;
  const o = {}; e.forEach((k, i) => {
    const v = numES(n[i].replace(/\s*g$/, '')); if (v == null) return;
    if (/^kcal/.test(k) && !/semana/.test(k)) o.kcal = v; else if (/^prote/.test(k)) o.proteina = v; else if (/^carbo/.test(k)) o.carbohidratos = v;
    else if (/^grasa/.test(k)) o.grasa = v; else if (/^comidas/.test(k)) o.comidas = v; else if (/porc/.test(k)) o.porciones_grasa = v; else if (/kcal semana 1/.test(k)) o.kcal_semana1 = v;
  });
  return o.kcal ? o : null;
}
// "500 kcal · 40 g prot. · 45 g carb. · 18 g grasa (3 porciones)" en cualquier orden
function macrosDeLinea(l) {
  const t = bajo(l); const o = {};
  const k = t.match(new RegExp(`${NUM}\\s*kcal`)); if (k) o.kcal = numES(k[1]);
  const p = t.match(new RegExp(`${NUM}\\s*g\\s*(?:de\\s*)?prot`)); if (p) o.proteina = numES(p[1]);
  const c = t.match(new RegExp(`${NUM}\\s*g\\s*(?:de\\s*)?carb`)); if (c) o.carbohidratos = numES(c[1]);
  const g = t.match(new RegExp(`${NUM}\\s*g\\s*(?:de\\s*)?grasa`)); if (g) o.grasa = numES(g[1]);
  const pg = t.match(/\((\d+)\s*porci/); if (pg) o.porciones_grasa = Number(pg[1]);
  return o;
}

const COMIDAS = /^(desayuno|almuerzo|merienda(?: \d| post-?entreno| pre-?entreno)?|cena|pre-?entreno|post-?entreno|colacion|media manana|snack|refrigerio)$/;
const FIN_COMIDAS = /^(tres dias armados|dias armados|lista de compras|meal prep|suplementacion|lo que rodea al plan|como medimos|ultima pagina|semana modelo)/;
const oracion = (s) => { const t = String(s || '').trim().toLowerCase(); return t ? t[0].toUpperCase() + t.slice(1) : t; };
const titulo = (s) => String(s || '').trim().toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());

// ---------- el plan ----------
export function leerPlan(lineas) {
  const L = lineas.map((l) => String(l || '').replace(/\s+$/, ''));
  const B = L.map(bajo); const todo = B.join('\n');
  if (!/seleccion flexible|elige (una|tu) proteina|opcion de proteina/.test(todo)) throw new Error('Este PDF no parece un plan de alimentación con opciones por comida (Sistema de selección flexible).');
  const plan = { tipo: 'seleccion_flexible', formato: 2, comidas: [], grasas: [], crudo_cocido: [], avisos: [] };
  const buscarB = (re, desde = 0, hasta = B.length) => { for (let i = desde; i < hasta; i++) if (re.test(B[i])) return i; return -1; };

  // quién y cuándo
  const ip = buscarB(/^preparado para$/); if (ip >= 0) plan.nombre = titulo(L[ip + 1]);
  if (!plan.nombre) { const pie = L.find((l) => /Plan de (.+?)\s+P[aá]g\./.test(l)); if (pie) plan.nombre = titulo(pie.match(/Plan de (.+?)\s+P[aá]g\./)[1]); }
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const em = L.join(' ').match(/Emitido el (\d{1,2}) de (\w+) de (\d{4})/i); const em2 = L.join(' ').match(/Emitido el (\d{1,2})\/(\d{1,2})\/(\d{4})/i);
  if (em && MES.includes(bajo(em[2]))) plan.emitido = `${em[3]}-${String(MES.indexOf(bajo(em[2])) + 1).padStart(2, '0')}-${em[1].padStart(2, '0')}`;
  else if (em2) plan.emitido = `${em2[3]}-${em2[2].padStart(2, '0')}-${em2[1].padStart(2, '0')}`;

  // números del día: una línea de números y debajo sus etiquetas (KCAL · PROTEÍNA · CARBOHIDRATO · GRASA · COMIDAS)
  for (let i = 1; i < L.length && !plan.objetivos; i++) if (/kcal/.test(B[i]) && /prote/.test(B[i]) && /(carbo|grasa)/.test(B[i]) && !/kcal \d/.test(B[i])) { const o = etiquetados(L[i - 1], L[i]); if (o && o.carbohidratos) plan.objetivos = o; }
  if (!plan.objetivos) { const t = todo.match(new RegExp(`${NUM}\\s*kcal\\s*·\\s*${NUM}\\s*g de proteina(?:\\s*·\\s*(\\d+)\\s*comidas)?`)); if (t) plan.objetivos = { kcal: numES(t[1]), proteina: numES(t[2]), ...(t[3] ? { comidas: Number(t[3]) } : {}) }; }
  const s1 = L.join(' ').match(/semana 1[^:]*:\s*([\d.]+)\s*kcal\s*·\s*([\d.,]+)\s*g de prote[ií]na\s*·\s*([\d.,]+)\s*g de carbohidrato\s*·\s*([\d.,]+)\s*g de grasa/i);
  if (s1) plan.semana1 = { kcal: numES(s1[1]), proteina: numES(s1[2]), carbohidratos: numES(s1[3]), grasa: numES(s1[4]) };
  const ag = todo.match(/(?:agua:?\s*)?(?:de\s+)?(\d+(?:,\d+)?)\s*a\s*(\d+(?:,\d+)?)\s*litros/);
  if (ag) plan.agua = { min_ml: Math.round(numES(ag[1]) * 1000), max_ml: Math.round(numES(ag[2]) * 1000) };

  // reparto por comida en la página de números (dos formatos)
  const reparto = {};
  L.forEach((l) => {
    const a = l.match(/^\s*(\S[^·]*?)\s{2,}([\d.]+)\s*kcal\s+P\s*([\d,]+)\s*·\s*C\s*([\d,]+)\s*·\s*G\s*([\d,]+)\s*·\s*(\d+)\s*porc/i);
    if (a) { reparto[bajo(a[1])] = { kcal: numES(a[2]), proteina: numES(a[3]), carbohidratos: numES(a[4]), grasa: numES(a[5]), porciones_grasa: Number(a[6]) }; return; }
    const b = l.match(/^\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ .\-]+?)\s{2,}(?:[\d.]+\s{2,}){0,3}([\d.]+)\s*kcal\s+(\d+)P\s*\/\s*(\d+)C\s*\/\s*(\d+)G/);
    if (b) reparto[bajo(b[1])] = { kcal: numES(b[2]), proteina: Number(b[3]), carbohidratos: Number(b[4]), grasa: Number(b[5]) };
  });

  // dónde termina la parte de comidas
  const finTodo = (() => { const i = buscarB(FIN_COMIDAS); return i >= 0 ? i : L.length; })();
  // inicios de comida: "COMIDA 1 DE 4" + título, o el nombre de la comida solo en su línea con sus kcal cerca
  const inicios = [];
  for (let i = 0; i < finTodo; i++) {
    let nombre = null;
    if (/^comida \d+ de \d+$/.test(B[i])) nombre = (L[i + 1] || '').split('·')[0].trim();
    else if (COMIDAS.test(B[i]) && B.slice(i + 1, i + 5).some((x) => /kcal/.test(x) && /(prot|carbo)/.test(x)) && !/^comida \d+ de \d+$/.test(B[i - 1] || '')) nombre = titulo(L[i]);
    if (!nombre) continue;
    const ult = inicios[inicios.length - 1];
    if (ult && bajo(ult.nombre) === bajo(nombre) && i - ult.i < 8) continue; // el mismo título repetido en el recuadro del objetivo
    inicios.push({ i, nombre: titulo(nombre) });
  }

  inicios.forEach((ini, k) => {
    const fin = k + 1 < inicios.length ? inicios[k + 1].i : finTodo;
    const c = { nombre: ini.nombre, proteinas: [], carbohidratos: [], frutas: [], opciones_fijas: [] };
    // objetivo de la comida: la línea con más datos (kcal, proteína, carbo, grasa, porciones)
    let mejor = {}; for (let i = ini.i; i < Math.min(fin, ini.i + 8); i++) { const m = macrosDeLinea(L[i]); if (Object.keys(m).length > Object.keys(mejor).length) mejor = m; }
    // formato con números arriba y etiquetas abajo ("CENA  615  30 g  90 g  15 g  2" / "KCAL  PROTEÍNA  CARBO  GRASA  PORC. GRASA")
    for (let i = ini.i; i < Math.min(fin, ini.i + 8); i++) if (/^kcal\s+prote/.test(B[i])) { const o = etiquetados(partes(L[i - 1]).slice(1).join('  '), L[i]); if (o) mejor = { ...mejor, ...o }; }
    if (!mejor.kcal && reparto[bajo(c.nombre)]) mejor = { ...reparto[bajo(c.nombre)], ...mejor };
    Object.assign(c, { kcal: mejor.kcal ?? null, proteina: mejor.proteina ?? null, carbohidratos_meta: mejor.carbohidratos ?? null, grasa: mejor.grasa ?? null, porciones_grasa: mejor.porciones_grasa ?? null });
    const is1 = buscarB(/^semana 1:/, ini.i, fin);
    if (is1 >= 0) { const t = L[is1]; c.semana1 = /igual/i.test(t) ? 'igual' : { kcal: numES((t.match(/([\d.]+)\s*kcal/) || [])[1]), carbohidratos: numES((t.match(/C\s*([\d,]+)\s*g/) || [])[1]) }; }
    // introducción
    const io = buscarB(/^objetivo de la comida$/, ini.i, fin);
    const primeraTabla = buscarB(/elige una? (proteina|carbohidrato)|^paso 1|^opcion de proteina|^1 ingredientes|^opcion 1 ·|^ingrediente\s+cantidad/, ini.i, fin);
    if (io >= 0 && primeraTabla > io) c.intro = L.slice(io + 1, primeraTabla).filter((x, j) => !/^semana 1:/i.test(x.trim()) && !(j <= 1 && (COMIDAS.test(bajo(x)) || Object.keys(macrosDeLinea(x)).length >= 2))).join(' ').replace(/\s+/g, ' ').trim();

    // bloques dentro de la comida: cada encabezado de tabla abre uno que termina en el siguiente
    const marcas = [];
    for (let i = ini.i; i < fin; i++) {
      const b = B[i];
      if (/^opcion de proteina/.test(b)) marcas.push({ i, t: 'proteina' });
      else if (/^opcion de carbohidrato/.test(b)) marcas.push({ i, t: 'carbo', s1: /semana 1/.test(b) });
      else if (/^fruta\s+(cantidad|½|1\/2)/.test(b)) marcas.push({ i, t: 'fruta' });
      else if (/^ingrediente\s+cantidad/.test(b)) marcas.push({ i, t: 'ingredientes' });
      else if (/^opcion \d+\s*·/.test(b)) marcas.push({ i, t: 'fija' });
      else if (/^(paso 3|3 · grasa|3\s+grasa:)/.test(b) || /^(paso 4|4 · vegetales)/.test(b) || /^nota:/.test(b) || /^\d\s+preparacion$/.test(b) || /^(elige un carbohidrato|2\s+elige)/.test(b)) marcas.push({ i, t: 'fin' });
      else if (/^otros carbohidratos/.test(b)) { const media = /media porci|½/.test(b) && !/porcion completa/.test(b); marcas.push(partes(L[i]).length >= 3 && /carbo/.test(b.replace(/^otros carbohidratos/, '')) ? { i, t: 'carbo', media } : { i, t: 'otros', media }); }
      else if (/^frutas?\b.*(media porci|½ porci|1 porcion =|porcion =)/.test(b) || /^frutas para/.test(b)) marcas.push({ i, t: 'fruta-titulo', media: /media porci|½ porci/.test(b) });
    }
    let mediaFruta = true; let mediaOtros = false;
    marcas.forEach((m, j) => {
      const hasta = j + 1 < marcas.length ? marcas[j + 1].i : fin;
      if (m.t === 'proteina') { const h = /^(que te quedan|a\s+que te quedan)$/.test(B[m.i + 1]) ? m.i + 2 : m.i + 1; c.proteinas.push(...leerTabla(L, h, hasta, 'proteina')); }
      else if (m.t === 'carbo') { const filas = leerTabla(L, m.i + 1, hasta, 'carbo', m.s1); if (m.media || mediaOtros) filas.forEach((x) => { x.media = true; }); c.carbohidratos.push(...filas); }
      else if (m.t === 'fruta-titulo') mediaFruta = m.media;
      else if (m.t === 'otros') mediaOtros = m.media;
      else if (m.t === 'fruta') { c.frutas.push(...leerFrutas(L, m.i + 1, hasta, mediaFruta)); c.dos_medias = c.dos_medias || mediaFruta; }
      else if (m.t === 'fija') {
        const cab = partes(L[m.i]); const nom = cab[0].replace(/^opci[oó]n \d+\s*·\s*/i, ''); const mm = macrosDeLinea(L[m.i]);
        const vin = []; const extra = [];
        for (let i = m.i + 1; i < hasta; i++) { if (esPie(L[i])) continue; const t = L[i].trim(); if (/^[•·]/.test(t)) vin.push(t); else if (vin.length && !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ ]+:/.test(t) && !extra.length && /^[a-záéíóúñ]/.test(t)) vin[vin.length - 1] += ` ${t}`; else extra.push(t); }
        c.opciones_fijas.push({ nombre: oracion(nom), kcal: mm.kcal ?? null, proteina: mm.proteina ?? null, carbohidratos: mm.carbohidratos ?? null, grasa: mm.grasa ?? null,
          items: vin.map(itemDeTexto), nota: extra.join(' ').replace(/\s+/g, ' ').trim() });
      } else if (m.t === 'ingredientes') {
        const items = [];
        for (let i = m.i + 1; i < hasta; i++) { if (esPie(L[i])) continue; const p = partes(L[i]); if (p.length < 2) { if (items.length) items[items.length - 1].nota = `${items[items.length - 1].nota || ''} ${L[i].trim()}`.trim(); continue; }
          const it = itemsDeCantidad(p[0], p[1])[0]; items.push({ nombre: p[0], cantidad: p[1], ...(it ? { gramos: it.gramos, ml: it.ml, unidades: it.unidades, unidad: it.unidad } : {}), nota: p.slice(2).join(' ') }); }
        const prep = buscarB(/^\d?\s*preparacion$/, m.i, fin);
        c.opciones_fijas.push({ nombre: 'Receta fija', kcal: c.kcal, proteina: c.proteina, carbohidratos: c.carbohidratos_meta, grasa: c.grasa, fija: true,
          items, nota: prep >= 0 ? L.slice(prep + 1, fin).filter((x) => !esPie(x) && !/^\d$/.test(x.trim())).join(' ').replace(/\s+/g, ' ').trim().slice(0, 1200) : '' });
      }
    });
    // pasos de grasa y vegetales, y la nota de la comida
    const textoHasta = (i) => { const out = [L[i].replace(/^\s*(paso \d\s*·\s*[^:]+|\d\s*·\s*[^:]+|nota):\s*/i, '')]; for (let q = i + 1; q < fin; q++) { if (/^\s*(paso \d|\d · |nota:)/i.test(L[q]) || esPie(L[q]) || /:\s/.test(partes(L[q])[0] || '') && /^[A-ZÁÉÍÓÚÑ]/.test(L[q])) break; out.push(L[q]); } return out.join(' ').replace(/\s+/g, ' ').trim(); };
    const p3 = buscarB(/^(paso 3|3 · grasa)/, ini.i, fin); if (p3 >= 0) c.paso_grasa = textoHasta(p3);
    const p4 = buscarB(/^(paso 4|4 · vegetales)/, ini.i, fin); if (p4 >= 0) c.paso_vegetales = textoHasta(p4);
    const pn = buscarB(/^nota:/, ini.i, fin); if (pn >= 0) c.nota = textoHasta(pn);
    const hasta = (c.paso_grasa || '').match(/(?:hasta )?(\d+) porci/i); if (hasta && c.porciones_grasa == null) c.porciones_grasa = Number(hasta[1]);
    if (!c.proteinas.length && !c.carbohidratos.length && !c.frutas.length && !c.opciones_fijas.length) plan.avisos.push(`${c.nombre}: no encontré las opciones de esta comida.`);
    plan.comidas.push(c);
  });

  // equivalencias de 1 porción de grasa
  const ig = buscarB(/^(grasa|alimento)\s+(1 porcion|cantidad de 1 porcion)/);
  if (ig >= 0) {
    const s1col = /semana 1/.test(B[ig]);
    for (let i = ig + 1; i < L.length; i++) {
      if (esPie(L[i])) break; let p = partes(L[i]);
      // fila partida: "15 g (una lonja… suma 4 g de" / "Quesos grasos (amarillo, …)" / "proteína)"
      if (p.length === 1 && empiezaCantidad(p[0]) && L[i + 1] && partes(L[i + 1]).length === 1 && !/\d/.test(L[i + 1])) {
        let cant = p[0]; const nom = L[i + 1].trim(); i++;
        if (balance(cant) > 0 && L[i + 1] && /^[a-záéíóúñ]/.test(L[i + 1].trim())) { cant = `${cant} ${L[i + 1].trim()}`; i++; }
        p = [nom, cant];
      }
      if (p.length < 2 || !/\d|^1 yema/.test(p[1])) break;
      let items = itemsDeCantidad(p[0], p[1]); if (!items.length && p[2]) items = itemsDeCantidad(p[0], p[2]);
      if (!items.length && /yema/i.test(p[0])) items = [{ nombre: p[0], gramos: PESOS.yema, unidades: 1 }];
      const ml = items[0]?.ml; const ultima = p[p.length - 1];
      plan.grasas.push({ nombre: p[0], cantidad: p[1], medida: s1col ? p.slice(2, -1).join(' ') : (p[1].match(/\((.*)\)/) || [])[1] || p[2] || '',
        semana1: s1col ? !/^no$/i.test(ultima) : true, items: ml ? [{ nombre: p[0], ml, gramos: Math.round(ml * 0.92 * 10) / 10 }] : items });
    }
  }
  // libres
  const iv = buscarB(/^vegetales libres/);
  if (iv >= 0) {
    const v = [];
    for (let i = iv + 1; i < Math.min(L.length, iv + 12); i++) {
      if (esPie(L[i])) break; const t = L[i].trim(); const p0 = partes(t)[0] || '';
      if (/^(con tope|ojo|en la semana|alinos|aliños)/i.test(t) || /^[A-ZÁÉÍÓÚÑ ,]{8,}$/.test(t)) break;
      if (/·/.test(t)) { v.push(t.replace(/\s*·\s*/g, ', ')); continue; } // "Lechuga · Repollo · …"
      if (/^no los cuentas/i.test(t)) continue;
      if (/^(aliños|bebidas)/i.test(p0)) continue; v.push(p0); if (/\.$/.test(p0)) break; // dos columnas: la izquierda son los vegetales
    }
    plan.vegetales_libres = v.join(' ').replace(/,\s*,/g, ',').replace(/\s+/g, ' ').replace(/,?\s*$/, '').trim();
  }
  const al = L.join(' ').match(/Aliños:\s*(.*?\.)\s/); if (al) plan.alinos = al[1].replace(/\s+/g, ' ');
  const be = L.join(' ').match(/Bebidas:\s*(.*?\.)\s/); if (be) plan.bebidas = be[1].replace(/\s+/g, ' ');
  const ic = buscarB(/^alimento\s+factor\s+ejemplo/);
  if (ic >= 0) for (let i = ic + 1; i < L.length; i++) { const p = partes(L[i]); const f = (p[1] || '').match(/(?:x|×)\s*([\d,]+)/i); if (p.length < 3 || !f) break; plan.crudo_cocido.push({ alimento: p[0], factor: numES(f[1]) }); }

  if (!plan.comidas.length) throw new Error('No encontré las comidas en el plan (títulos como DESAYUNO o ALMUERZO con sus calorías).');
  if (!plan.objetivos) { plan.objetivos = {}; plan.avisos.push('No encontré los números del día: los sumé de las comidas.'); }
  // si faltan números del día, se suman de las comidas
  ['kcal', 'proteina', 'carbohidratos', 'grasa'].forEach((k) => {
    if (plan.objetivos[k] != null) return; const v = plan.comidas.map((c) => (k === 'carbohidratos' ? c.carbohidratos_meta : c[k]));
    if (v.every((x) => x != null)) plan.objetivos[k] = v.reduce((t, x) => t + x, 0);
  });
  if (!plan.objetivos.comidas) plan.objetivos.comidas = plan.comidas.length;
  plan.comidas.forEach((c) => [...c.proteinas, ...c.carbohidratos].forEach((o) => { if (!o.items?.length) plan.avisos.push(`${c.nombre} · ${o.nombre}: no entendí la cantidad “${o.cantidad || '—'}”.`); }));
  return plan;
}

// objetivos de la app a partir del plan (el coach los puede corregir)
export function objetivosDePlan(plan) {
  const o = plan.objetivos || {};
  return {
    kcal: o.kcal ?? null, proteina: o.proteina ?? null, carbohidratos: o.carbohidratos ?? null, grasa: o.grasa ?? null,
    comidas: plan.comidas.map((c) => ({ nombre: c.nombre, kcal: c.kcal ?? null, proteina: c.proteina ?? null, carbohidratos: c.carbohidratos_meta ?? null, grasa: c.grasa ?? null })),
    agua_ml: plan.agua ? plan.agua.min_ml : null, semana1: plan.semana1 || null,
  };
}
