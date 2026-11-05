// Cómo se lee la foto de una tabla nutricional, paso a paso (el OCR lo pone quien llama):
// 1) se endereza la foto (inclinación y fotos de lado), 2) se lee, 3) si sale poco se prueba de cabeza,
// 4) se recorta la tabla DE LA FOTO ORIGINAL (con toda su resolución) y se vuelve a leer; se queda con la mejor lectura.
import { caber, contraste, escalar, inclinacionTexto, recortar, rotar } from './imagen.js';
import { filas, inclinacion, leerFrente, leerTabla, normalizarTrozos, nutrienteDe } from './tabla.js';

// qué tan buena es una lectura: nutrientes con número, confirmados por el % VD, energía, porción y si cuadran las calorías
export function puntaje(l) {
  let s = 0;
  for (const f of l.filas || []) { s += 1; if (f.confirmado) s += 0.5; if (f.dudoso) s -= 0.4; }
  if ((l.filas || []).some((f) => f.codigo === 'energia_kcal' || f.codigo === 'energia_kj')) s += 1;
  if (l.porcion?.cantidad) s += 1;
  if (l.cuadra === true) s += 1.5; else if (l.cuadra === false) s -= 1;
  return s;
}

// la parte de la foto donde están las filas de la tabla
const RE_TABLA = /(porci[oó]n|raci[oó]n|serving|100\s*(g|ml)|informaci[oó]n\s*nutri|nutrition\s*facts|tabla\s*nutri)/i;
export function zonaTabla(lineas, ancho, alto) {
  const fs = filas(normalizarTrozos(lineas)); let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity, n = 0;
  fs.forEach((f) => {
    const rot = f.trozos.filter((s) => /[a-z]{3,}/i.test(s.t)).map((s) => s.t).join(' ');
    if (!nutrienteDe(rot) && !RE_TABLA.test(f.texto)) return; n++;
    f.trozos.forEach((s) => { x0 = Math.min(x0, s.x0); y0 = Math.min(y0, s.y0); x1 = Math.max(x1, s.x1); y1 = Math.max(y1, s.y1); });
  });
  if (n < 3) return null;
  const mx = (x1 - x0) * 0.06 + 10, my = (y1 - y0) * 0.05 + 10;
  const z = { x: Math.max(0, x0 - mx), y: Math.max(0, y0 - my) }; z.w = Math.min(ancho, x1 + mx) - z.x; z.h = Math.min(alto, y1 + my) - z.y;
  return z;
}

// Pasos que llevan de la foto original a la imagen leída: { k } (escala) o { g, w, h } (giro de g grados
// sobre una imagen de w × h). Sirven para llevar la zona de la tabla de vuelta a la foto original.
function alOriginal(pasos, x, y) {
  for (let i = pasos.length - 1; i >= 0; i--) {
    const p = pasos[i];
    if (p.k) { x /= p.k; y /= p.k; continue; }
    const g = ((p.g % 360) + 360) % 360; const { w, h } = p;
    if (g === 90) [x, y] = [y, h - 1 - x];
    else if (g === 180) [x, y] = [w - 1 - x, h - 1 - y];
    else if (g === 270) [x, y] = [w - 1 - y, x];
    else {
      const a = (p.g * Math.PI) / 180; const c = Math.cos(a), s = Math.sin(a);
      const W = Math.ceil(Math.abs(w * c) + Math.abs(h * s)), H = Math.ceil(Math.abs(w * s) + Math.abs(h * c));
      const dx = x - W / 2, dy = y - H / 2; [x, y] = [c * dx + s * dy + w / 2, -s * dx + c * dy + h / 2];
    }
  }
  return [x, y];
}
// la tabla recortada de la foto original, con los mismos giros, de hasta `lado` px (como mucho 2,5× más grande)
export function recorteOriginal(im0, pasos, z, lado = 1800) {
  const esq = [[z.x, z.y], [z.x + z.w, z.y], [z.x, z.y + z.h], [z.x + z.w, z.y + z.h]].map(([x, y]) => alOriginal(pasos, x, y));
  const X0 = Math.max(0, Math.min(...esq.map((p) => p[0]))), Y0 = Math.max(0, Math.min(...esq.map((p) => p[1])));
  const X1 = Math.min(im0.width, Math.max(...esq.map((p) => p[0]))), Y1 = Math.min(im0.height, Math.max(...esq.map((p) => p[1])));
  if (X1 - X0 < 20 || Y1 - Y0 < 20) return null;
  let rec = recortar(im0, X0, Y0, X1 - X0, Y1 - Y0);
  const k = Math.min(2.5, lado / Math.max(rec.width, rec.height)); if (Math.abs(k - 1) > 0.05) rec = escalar(rec, rec.width * k, rec.height * k);
  for (const p of pasos) if (p.g) rec = rotar(rec, p.g);
  return rec;
}

async function pasada(im, ocr, pasos) { const lineas = await ocr(im); return { im, lineas, pasos, l: leerTabla(lineas) }; }
const mejorDe = (a, b) => (!a ? b : !b ? a : puntaje(b.l) > puntaje(a.l) ? b : a);

// imagen: { data, width, height } (la foto con toda la resolución que se tenga). ocr(imagen) → líneas del OCR
export async function leerTablaFoto(im0, ocr, { onEstado, maxLado = 1800 } = {}) {
  const base = caber(im0, maxLado); // (agrandar las fotos chicas antes de leerlas se probó y lee peor)
  const pasos0 = base === im0 ? [] : [{ k: base.width / im0.width }];
  const enderezada = (ang) => (Math.abs(ang) >= 0.5 ? { im: rotar(base, -ang), pasos: [...pasos0, { g: -ang, w: base.width, h: base.height }] } : { im: base, pasos: pasos0 });
  onEstado?.('Enderezando la foto…');
  const inc = inclinacionTexto(base); let { im, pasos } = enderezada(inc.angulo);
  onEstado?.('Leyendo la tabla…');
  let mejor = await pasada(im, ocr, pasos);
  // lo que quedó torcido se ve en las cajas que el lector puso en el mismo renglón: se endereza de nuevo y se relee
  const resto = (Math.atan(inclinacion(normalizarTrozos(mejor.lineas))) * 180) / Math.PI;
  if (Math.abs(resto) >= 1 && Math.abs(inc.angulo + resto) <= 20) {
    onEstado?.('Enderezando mejor la foto…');
    const otra = enderezada(inc.angulo + resto); const p2 = await pasada(otra.im, ocr, otra.pasos);
    if (puntaje(p2.l) > puntaje(mejor.l)) { mejor = p2; ({ im, pasos } = otra); }
  }
  // foto oscura o lavada: si casi no se entendió nada, se estira el brillo y se relee
  // (siempre no: con fotos normales de colores lee peor)
  if (puntaje(mejor.l) < 4) {
    const c = contraste(im);
    if (c !== im) { onEstado?.('Aclarando la foto…'); const p2 = await pasada(c, ocr, pasos); p2.contraste = true; mejor = mejorDe(mejor, p2); }
  }
  // foto de lado (las cajas de texto salen altas) o de cabeza: se prueba girada si casi no se entendió nada
  if (puntaje(mejor.l) < 4) {
    const tr = normalizarTrozos(mejor.lineas); const altas = tr.filter((s) => s.h > s.w * 1.3).length;
    const giros = altas > tr.length * 0.4 ? [90, 270, 180] : [180, 90, 270];
    for (const g of giros) {
      onEstado?.('Probando la foto girada…');
      mejor = mejorDe(mejor, await pasada(rotar(im, g), ocr, [...pasos, { g, w: im.width, h: im.height }]));
      if (puntaje(mejor.l) >= 6) break;
    }
  }
  // zoom sobre la tabla cuando ocupa poco de la foto, o cuando la foto original tiene más detalle que lo leído
  const z = zonaTabla(mejor.lineas, mejor.im.width, mejor.im.height);
  const area = z ? (z.w * z.h) / (mejor.im.width * mejor.im.height) : 1;
  const hayDetalle = mejor.pasos.some((p) => p.k && p.k < 0.8);
  if (z && z.w > 60 && z.h > 60 && (area < 0.6 || hayDetalle)) {
    onEstado?.('Acercando la tabla…');
    let rec = recorteOriginal(im0, mejor.pasos, z); if (rec && mejor.contraste) rec = contraste(rec);
    if (rec) {
      const otra = await pasada(rec, ocr, null);
      if (!otra.l.porcion?.cantidad && mejor.l.porcion?.cantidad) { otra.l.porcion = mejor.l.porcion; otra.l.porciones_envase = otra.l.porciones_envase ?? mejor.l.porciones_envase; }
      mejor = mejorDe(mejor, otra);
    }
  }
  return mejor;
}

export async function leerFrenteFoto(im0, ocr) {
  let im = caber(im0, 1400); const inc = inclinacionTexto(im);
  if (Math.abs(inc.angulo) >= 0.5) im = rotar(im, -inc.angulo);
  const lineas = await ocr(im);
  return { ...leerFrente(lineas), lineasOCR: lineas };
}
