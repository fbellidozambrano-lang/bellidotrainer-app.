// Lee el PDF del informe antropométrico (formato BELLIDOTRAINER) y saca el resumen
// que ve el asesorado. Todo pasa en el teléfono del coach: el PDF no se sube a ningún lado.

// PDF → líneas de texto (agrupando por altura en la página)
export async function lineasDePdf(buffer) {
  const m = await import('pdfjs-dist/legacy/build/pdf.js'); const pdfjs = m.getDocument ? m : m.default;
  if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
    const w = await import('pdfjs-dist/legacy/build/pdf.worker.min.js?url');
    pdfjs.GlobalWorkerOptions.workerSrc = w.default;
  }
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buffer), isEvalSupported: false, useSystemFonts: true }).promise;
  const out = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const pg = await doc.getPage(i); const tc = await pg.getTextContent();
    const filas = [];
    tc.items.forEach((it) => { const s = String(it.str || ''); if (!s.trim()) return; const y = it.transform[5], x = it.transform[4];
      let f = filas.find((r) => Math.abs(r.y - y) < 2.5); if (!f) { f = { y, items: [] }; filas.push(f); } f.items.push({ x, s: s.trim() }); });
    filas.sort((a, b) => b.y - a.y).forEach((f) => out.push(f.items.sort((a, b) => a.x - b.x).map((x) => x.s).join('  ')));
  }
  return out;
}

const num = (s) => { const t = parseFloat(String(s).replace(',', '.')); return Number.isFinite(t) ? t : null; };
const numeros = (s) => (String(s).match(/[-+]?\d+(?:[.,]\d+)?/g) || []).map(num).filter((x) => x != null);
const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const fechaISO = (d) => { const m = String(d).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/); return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null; };

// Busca la primera línea que empieza con la etiqueta y devuelve los números que siguen
function fila(lineas, re) {
  for (const l of lineas) { const t = sinAcento(l).trim(); const m = t.match(re); if (m && m.index === 0) return numeros(l.slice(m[0].length + (l.length - l.trimStart().length))); }
  return null;
}

export function leerInforme(lineas) {
  const txt = lineas.join('\n');
  if (!/evaluaci[oó]n antropom|composici[oó]n corporal|pliegues/i.test(txt)) throw new Error('Este PDF no parece un informe antropométrico.');
  const nombre = (lineas.find((l) => /^nombre y apellido/i.test(sinAcento(l).trim())) || '').replace(/^\s*nombre y apellido\s*/i, '').trim();
  const per = txt.match(/Per[ií]odo evaluado\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*a\s*(\d{1,2}\/\d{1,2}\/\d{4})/i);
  const todas = [...txt.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}/g)].map((m) => fechaISO(m[0])).filter(Boolean).sort();
  const fecha = per ? fechaISO(per[2]) : todas.pop() || null;
  const inicio = per ? fechaISO(per[1]) : null;
  // tabla "Resumen": Inicial · Actual · Cambio
  const res = (re) => { const n = fila(lineas, re); return n && n.length >= 2 ? { ini: n[0], act: n[1] } : n && n.length === 1 ? { ini: null, act: n[0] } : null; };
  const ult = (re) => { const n = fila(lineas, re); return n && n.length ? n[n.length - 1] : null; };
  const peso = res(/^peso corporal/) ; const grasa = res(/^grasa corporal/); const mg = res(/^masa grasa \(kg\)/) || null;
  const ml = res(/^masa libre de grasa \(kg\)/); const mm = res(/^masa muscular esqueletica \(kg\)/); const imc = res(/^indice de masa corporal(?! \()/);
  const d = {
    peso: peso?.act ?? ult(/^peso · kg|^peso kg/),
    grasa: ult(/^% grasa adoptado/) ?? grasa?.act,
    masaGrasa: ult(/^masa grasa(?! \()/) ?? mg?.act,
    masaLibre: ult(/^masa libre de grasa(?! \()/) ?? ml?.act,
    musculo: ult(/^masa muscular esqueletica \(lee/) ?? mm?.act,
    musculoPct: ult(/^% de masa muscular/),
    visceral: ult(/^(nivel de )?grasa visceral/),
    edadMet: ult(/^edad metabolica/),
    imc: imc?.act ?? null,
    cintura: ult(/^cintura(?!-)/),
    tmb: ult(/^tasa metabolica basal/),
    bia: ult(/^bioimpedancia/),
  };
  const inicial = { peso: peso?.ini ?? null, grasa: grasa?.ini ?? null, masaGrasa: mg?.ini ?? null, masaLibre: ml?.ini ?? null, musculo: mm?.ini ?? null, imc: imc?.ini ?? null };
  Object.keys(d).forEach((k) => { if (d[k] == null) delete d[k]; });
  Object.keys(inicial).forEach((k) => { if (inicial[k] == null) delete inicial[k]; });
  if (!d.peso && !d.grasa) throw new Error('No encontré peso ni % de grasa en este PDF.');
  return { nombre, fecha, datos: { ...d, ...(Object.keys(inicial).length ? { inicial } : {}), ...(inicio ? { inicio } : {}) } };
}

// Lo que se muestra (orden, nombre, unidad, si bajar es bueno)
export const CAMPOS = [
  { k: 'peso', l: 'Peso', u: 'kg', d: 1 },
  { k: 'grasa', l: 'Grasa corporal', u: '%', d: 1, baja: true },
  { k: 'masaGrasa', l: 'Masa grasa', u: 'kg', d: 1, baja: true },
  { k: 'musculo', l: 'Músculo esquelético', u: 'kg', d: 1, sube: true },
  { k: 'masaLibre', l: 'Masa libre de grasa', u: 'kg', d: 1, sube: true },
  { k: 'musculoPct', l: 'Masa muscular', u: '%', d: 1, sube: true },
  { k: 'visceral', l: 'Grasa visceral', u: 'nivel', d: 0, baja: true },
  { k: 'edadMet', l: 'Edad metabólica', u: 'años', d: 0, baja: true },
  { k: 'imc', l: 'IMC', u: '', d: 1 },
  { k: 'cintura', l: 'Cintura', u: 'cm', d: 1, baja: true },
];
