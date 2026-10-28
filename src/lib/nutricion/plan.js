// Lee el PDF del "Sistema de selección flexible" de BELLIDOTRAINER (líneas de texto de pdf.js)
// y lo convierte en datos: objetivos del día, cada comida con sus opciones de proteína y
// carbohidrato y sus cantidades, las frutas, las equivalencias de grasa, el agua y los alimentos libres.
// Las cantidades son las del plan; los nutrientes se calculan después con la ficha real de cada alimento.

const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '');
const bajo = (s) => sinAcento(s).toLowerCase();
// "2.300" → 2300 · "21,6" → 21.6 · "4½" → 4.5
export function numES(t) {
  let s = String(t || '').trim().replace('½', '.5').replace('¼', '.25').replace('¾', '.75');
  s = s.replace(/(\d)\.(5|25|75)$/, '$1.$2');
  if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, '');
  const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : null;
}
const gramosTxt = (t) => { const m = String(t).match(/(\d+(?:[.,]\d+)?)\s*g\b/); return m ? numES(m[1]) : null; };
const partes = (l) => l.split(/\s{2,}/).map((x) => x.trim()).filter(Boolean);
const esG = (t) => /^-?\d+(?:[.,]\d+)?\s*g$/.test(String(t).trim());
const NO_S1 = /^NO EN SEM\.? ?1$/i;

// Convenciones del plan (SKILL de selección flexible): clara 33 g, huevo 50 g, whey 30 g = 1 medida
export const PESOS = { clara: 33, huevo: 50 };
export function itemsDeCantidad(nombre, cantidad) {
  const c = bajo(cantidad);
  const hc = c.match(/(\d+)\s*huevos?\s*\+\s*(\d+)\s*claras?/);
  if (hc) return [{ nombre: 'Huevo entero', gramos: Number(hc[1]) * PESOS.huevo, unidades: Number(hc[1]) }, { nombre: 'Claras de huevo', gramos: Number(hc[2]) * PESOS.clara, unidades: Number(hc[2]) }];
  const g = gramosTxt(cantidad);
  const h = c.match(/^(\d+)\s*huevos?$/); if (h && g == null) return [{ nombre: 'Huevo entero', gramos: Number(h[1]) * PESOS.huevo, unidades: Number(h[1]) }];
  const cl = c.match(/^(\d+)\s*claras?/); if (cl && g == null) return [{ nombre: 'Claras de huevo', gramos: Number(cl[1]) * PESOS.clara, unidades: Number(cl[1]) }];
  const ml = c.match(/(\d+(?:[.,]\d+)?)\s*ml\b/); if (ml && g == null) return [{ nombre, ml: numES(ml[1]) }];
  return g != null ? [{ nombre, gramos: g }] : [];
}
// semáforo por la grasa de la porción de proteína (≤ 4,4 verde · 4,5–10,4 amarilla · ≥ 10,5 roja)
export const colorProteina = (grasa) => (grasa == null ? null : grasa <= 4.4 ? 'verde' : grasa < 10.5 ? 'amarilla' : 'roja');

function filaProteina(l) {
  const p = partes(l); if (p.length < 5) return null;
  let i = 0; const nombre = p[i++]; const cantidad = p[i++]; let noS1 = false;
  if (NO_S1.test(p[i])) { noS1 = true; i++; }
  if (!esG(p[i]) || !esG(p[i + 1])) return null;
  const proteina = numES(p[i]); const grasa = numES(p[i + 1]); const porc = p[i + 2] || '';
  const resta = (p.slice(i + 3).join(' ').match(/resta\s+(\d+)/i) || [])[1];
  return { nombre, cantidad, items: itemsDeCantidad(nombre, cantidad), proteina, grasa, porciones_quedan: numES(porc.replace('*', '')), resta_otra: resta ? Number(resta) : 0, no_semana1: noS1, color: colorProteina(grasa) };
}
function filaCarbo(l) {
  const p = partes(l); if (p.length < 5) return null;
  const nombre = p[0]; const s1 = p[1]; const s2 = p[2];
  if (!esG(p[3]) || !esG(p[4])) return null;
  const noS1 = NO_S1.test(s1);
  return { nombre, cantidad: s2, items: itemsDeCantidad(nombre, s2), semana1: noS1 ? null : { cantidad: s1, items: itemsDeCantidad(nombre, s1) }, no_semana1: noS1,
    carbohidratos: numES(p[3]), proteina: numES(p[4]), nota: p.slice(5).join(' ') };
}
function filaOtroCarbo(l) { // merienda: "Avena en hojuelas  45 g  28 g  6 g" (con "NO EN SEM. 1" opcional)
  const p = partes(l); if (p.length < 4) return null;
  let i = 0; const nombre = p[i++]; let noS1 = false; if (NO_S1.test(p[i])) { noS1 = true; i++; }
  const cantidad = p[i++]; if (!esG(p[i]) || !esG(p[i + 1])) return null;
  return { nombre, cantidad, items: itemsDeCantidad(nombre, cantidad), semana1: noS1 ? null : { cantidad, items: itemsDeCantidad(nombre, cantidad) }, no_semana1: noS1,
    carbohidratos: numES(p[i]), proteina: numES(p[i + 1]), nota: p.slice(i + 2).join(' '), media: true };
}
// notas de tabla partidas en dos líneas ("Trae 2 porciones de grasa (1 en sem. 1):" / fila / "descuéntalas")
function leerTabla(lineas, desde, hasta, fila) {
  const out = []; let pend = '';
  for (let k = desde; k < hasta; k++) {
    const l = lineas[k]; const r = fila(l);
    if (r) {
      if (pend && !r.nota) { r.nota = pend; pend = ''; } else if (pend && out.length) { out[out.length - 1].nota = `${out[out.length - 1].nota || ''} ${pend}`.trim(); pend = ''; }
      out.push(r); continue;
    }
    const t = l.trim(); if (!t) continue;
    // nombre partido en dos líneas: "Nachos naturales (solo ½  <nota>" / "NO EN SEM. 1  65 g  42 g  5 g" / "porción)  <resto de la nota>"
    const sig = lineas[k + 1]; const pp = partes(l);
    const unida = sig != null && k + 1 < hasta && !fila(sig) ? fila(`${pp[0]}  ${sig}`) : null;
    if (unida) {
      let nota = pp.slice(1).join(' '); const tras = lineas[k + 2];
      if (tras != null && k + 2 < hasta && !fila(tras) && !/^\s*(paso|nota:)/i.test(tras)) {
        const pt = partes(tras); if ((unida.nombre.match(/\(/g) || []).length > (unida.nombre.match(/\)/g) || []).length) unida.nombre = `${unida.nombre} ${pt.shift()}`;
        nota = `${nota} ${pt.join(' ')}`.trim(); k++;
      }
      unida.nota = `${unida.nota || ''} ${nota}`.trim(); unida.items = itemsDeCantidad(unida.nombre, unida.cantidad); if (pend) { if (out.length) out[out.length - 1].nota = `${out[out.length - 1].nota || ''} ${pend}`.trim(); pend = ''; }
      out.push(unida); k++; continue;
    }
    const prev = out[out.length - 1];
    if (prev && (/:$/.test(prev.nota || '') || /^[a-záéíóúñ]/.test(t))) prev.nota = `${prev.nota || ''} ${t}`.trim(); else pend = `${pend} ${t}`.trim();
  }
  if (pend && out.length) out[out.length - 1].nota = `${out[out.length - 1].nota || ''} ${pend}`.trim();
  out.forEach((r) => { if (/solo ½|½ porci/i.test(r.nombre)) r.media = true; });
  return out;
}
const buscar = (lineas, re, desde = 0, hasta = lineas.length) => { for (let i = desde; i < hasta; i++) if (re.test(bajo(lineas[i]))) return i; return -1; };
function textoHasta(lineas, i, fin) { // junta un párrafo ("Paso 3 · Grasa: …") hasta la próxima etiqueta o el pie
  const out = [lineas[i].replace(/^\s*(paso \d\s*·\s*[^:]+|nota):\s*/i, '')];
  for (let k = i + 1; k < fin; k++) { if (/^\s*(paso \d|nota:)/i.test(lineas[k]) || /^BELLIDOTRAINER ·/.test(lineas[k])) break; out.push(lineas[k]); }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

export function leerPlan(lineas) {
  const L = lineas.map((l) => String(l || ''));
  const todo = bajo(L.join('\n'));
  if (!/seleccion flexible/.test(todo)) throw new Error('Este PDF no parece un plan del Sistema de selección flexible.');
  const plan = { tipo: 'seleccion_flexible', formato: 1, comidas: [], grasas: [], crudo_cocido: [] };
  const ip = buscar(L, /^preparado para$/); if (ip >= 0) plan.nombre = (L[ip + 1] || '').trim().toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  const em = L.join(' ').match(/Emitido el (\d{1,2}) de (\w+) de (\d{4})/i);
  const MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  if (em && MES.includes(bajo(em[2]))) plan.emitido = `${em[3]}-${String(MES.indexOf(bajo(em[2])) + 1).padStart(2, '0')}-${em[1].padStart(2, '0')}`;
  // números del día
  const it = buscar(L, /^kcal\s+proteina\s+carbohidrato\s+grasa\s+comidas/);
  if (it > 0) { const n = partes(L[it - 1]).map(numES); plan.objetivos = { kcal: n[0], proteina: n[1], carbohidratos: n[2], grasa: n[3], comidas: n[4] }; }
  const s1 = L.join(' ').match(/semana 1[^:]*:\s*([\d.]+)\s*kcal\s*·\s*([\d.,]+)\s*g de prote[ií]na\s*·\s*([\d.,]+)\s*g de carbohidrato\s*·\s*([\d.,]+)\s*g de grasa/i);
  if (s1) plan.semana1 = { kcal: numES(s1[1]), proteina: numES(s1[2]), carbohidratos: numES(s1[3]), grasa: numES(s1[4]) };
  const ag = L.join(' ').match(/agua:?\s*([\d,]+)\s*a\s*([\d,]+)\s*litros/i) || L.join(' ').match(/([\d,]+)\s*a\s*([\d,]+)\s*litros de agua/i);
  if (ag) plan.agua = { min_ml: Math.round(numES(ag[1]) * 1000), max_ml: Math.round(numES(ag[2]) * 1000) };
  // reparto por comida (página de números)
  const reparto = {};
  L.forEach((l) => { const m = l.match(/^\s*(\S[^·]*?)\s{2,}([\d.]+)\s*kcal\s+P\s*([\d,]+)\s*·\s*C\s*([\d,]+)\s*·\s*G\s*([\d,]+)\s*·\s*(\d+)\s*porc/i); if (m) reparto[bajo(m[1]).trim()] = { kcal: numES(m[2]), proteina: numES(m[3]), carbohidratos: numES(m[4]), grasa: numES(m[5]), porciones_grasa: Number(m[6]) }; });
  // páginas por comida
  const inicios = L.map((l, i) => (/^comida \d+ de \d+$/i.test(l.trim()) ? i : -1)).filter((i) => i >= 0);
  inicios.forEach((ini, k) => {
    const fin = k + 1 < inicios.length ? inicios[k + 1] : (buscar(L, /^tres dias armados$|^lista de compras$/, ini) > 0 ? buscar(L, /^tres dias armados$|^lista de compras$/, ini) : L.length);
    const titulo = (L[ini + 1] || '').split('·')[0].trim();
    const ib = buscar(L, new RegExp(`^${bajo(titulo)}\\s+[\\d.]+\\s+`), ini, fin);
    const c = { nombre: titulo, proteinas: [], carbohidratos: [], frutas: [] };
    if (ib >= 0) { const n = partes(L[ib]).slice(1).map(numES); Object.assign(c, { kcal: n[0], proteina: n[1], carbohidratos_meta: n[2], grasa: n[3], porciones_grasa: n[4] }); }
    else if (reparto[bajo(titulo)]) { const r = reparto[bajo(titulo)]; Object.assign(c, { kcal: r.kcal, proteina: r.proteina, carbohidratos_meta: r.carbohidratos, grasa: r.grasa, porciones_grasa: r.porciones_grasa }); }
    const is1 = buscar(L, /^semana 1:/, ini, fin);
    if (is1 >= 0) { const t = L[is1]; c.semana1 = /igual/i.test(t) ? 'igual' : { kcal: numES((t.match(/([\d.]+)\s*kcal/) || [])[1]), carbohidratos: numES((t.match(/C\s*([\d,]+)\s*g/) || [])[1]) }; }
    const io = buscar(L, /^objetivo de la comida$/, ini, fin); const ipaso = buscar(L, /^paso 1/, ini, fin);
    if (io >= 0 && ipaso > io) c.intro = L.slice(io + 1, ipaso).filter((x) => !/^semana 1:/i.test(x.trim())).join(' ').replace(/\s+/g, ' ').trim();
    const hp = buscar(L, /^opcion de proteina/, ini, fin); const p2 = buscar(L, /^paso 2/, ini, fin);
    if (hp >= 0 && p2 > hp) c.proteinas = leerTabla(L, hp + 1, p2, filaProteina);
    const hc = buscar(L, /^opcion de carbohidrato/, ini, fin); const p3 = buscar(L, /^paso 3/, ini, fin);
    const finCarbo = p3 >= 0 ? p3 : fin;
    if (hc >= 0) c.carbohidratos = leerTabla(L, hc + 1, finCarbo, filaCarbo);
    const hf = buscar(L, /^fruta\s+½ porcion/, ini, fin);
    if (hf >= 0) {
      const ho = buscar(L, /^otros carbohidratos/, hf, fin);
      for (let i = hf + 1; i < (ho >= 0 ? ho : finCarbo); i++) {
        const p = partes(L[i]); for (let j = 0; j + 2 < p.length; j += 3) { const g = gramosTxt(p[j + 1]); if (g) c.frutas.push({ nombre: p[j], gramos: g, medida: p[j + 2], media: true, items: [{ nombre: p[j], gramos: g }] }); }
      }
      if (ho >= 0) c.carbohidratos = leerTabla(L, ho + 1, finCarbo, filaOtroCarbo);
      c.dos_medias = true;
    }
    if (p3 >= 0) c.paso_grasa = textoHasta(L, p3, fin);
    const p4 = buscar(L, /^paso 4/, ini, fin); if (p4 >= 0) c.paso_vegetales = textoHasta(L, p4, fin);
    const pn = buscar(L, /^nota:/, ini, fin); if (pn >= 0) c.nota = textoHasta(L, pn, fin);
    const hasta = (c.paso_grasa || '').match(/hasta (\d+) porci/i); if (hasta && c.porciones_grasa == null) c.porciones_grasa = Number(hasta[1]);
    plan.comidas.push(c);
  });
  // equivalencias de grasa
  const ig = buscar(L, /^grasa\s+1 porcion\s+medida casera/);
  if (ig >= 0) for (let i = ig + 1; i < L.length; i++) {
    const p = partes(L[i]); if (p.length < 3 || !/\d/.test(p[1])) break;
    const items = itemsDeCantidad(p[0], p[1]); const ml = items[0]?.ml;
    plan.grasas.push({ nombre: p[0], cantidad: p[1], medida: p[2], semana1: p[3] ? !/^no$/i.test(p[3]) : true, items: ml ? [{ nombre: p[0], ml, gramos: Math.round(ml * 0.92 * 10) / 10 }] : items });
  }
  // libres
  const iv = buscar(L, /^vegetales libres/);
  if (iv >= 0) { // dos columnas: la de la izquierda son los vegetales, hasta la línea que termina en punto
    const v = []; for (let i = iv + 1; i < Math.min(L.length, iv + 12); i++) { const p0 = partes(L[i])[0] || ''; if (/^(aliños|bebidas|en la semana)/i.test(p0)) continue; v.push(p0); if (/\.$/.test(p0)) break; }
    plan.vegetales_libres = v.join(' ').replace(/\s+/g, ' ').trim(); }
  const al = L.join(' ').match(/Aliños:\s*(.*?\.)\s/); if (al) plan.alinos = al[1].replace(/\s+/g, ' ');
  const be = L.join(' ').match(/Bebidas:\s*(.*?\.)\s/); if (be) plan.bebidas = be[1].replace(/\s+/g, ' ');
  const ic = buscar(L, /^alimento\s+factor\s+ejemplo en crudo/);
  if (ic >= 0) for (let i = ic + 1; i < L.length; i++) { const p = partes(L[i]); if (p.length < 4 || !/^x\s*[\d,]+/i.test(p[1])) break; plan.crudo_cocido.push({ alimento: p[0], factor: numES(p[1].replace(/^x\s*/i, '')) }); }
  if (!plan.comidas.length) throw new Error('No encontré las páginas de las comidas en el plan.');
  if (!plan.objetivos) plan.objetivos = {};
  if (!plan.objetivos.comidas) plan.objetivos.comidas = plan.comidas.length;
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
