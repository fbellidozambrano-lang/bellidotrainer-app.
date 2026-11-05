// Cajas de texto a partir del mapa de probabilidad del detector de PaddleOCR (post-proceso "DB", como el
// PaddleOCR original: umbral 0,3 y puntaje de la caja ≥ 0,6; la expansión, 1,0, es la que mejor leyó las tablas
// en las pruebas con fotos reales: con 1,5 las cajas de dos renglones se tocan). La librería, en el navegador,
// toma como texto cualquier píxel con probabilidad > 0: con fotos con textura o algo giradas las líneas se
// pegan en manchas enormes y se pierde casi toda la tabla. Esto lo corrige.
export const DB = { umbral: 0.3, minPuntaje: 0.6, expansion: 1.0, minLado: 3 };

// prob: probabilidades (0..1) de width × height (la imagen ya escalada y rellenada a múltiplos de 32)
// → [{ x, y, width, height }] en píxeles de la imagen original
export function cajasDB(prob, width, height, { resizeRatio = 1, originalWidth = width, originalHeight = height } = {}, op = {}) {
  const { umbral, minPuntaje, expansion, minLado } = { ...DB, ...op };
  const n = width * height; const marca = new Uint8Array(n);
  for (let i = 0; i < n; i++) if (prob[i] > umbral) marca[i] = 1;
  const pila = new Int32Array(n); const cajas = [];
  for (let s = 0; s < n; s++) {
    if (marca[s] !== 1) continue;
    let top = 0; pila[top++] = s; marca[s] = 2;
    let x0 = width, y0 = height, x1 = -1, y1 = -1, area = 0, suma = 0;
    while (top) {
      const p = pila[--top]; const x = p % width, y = (p - x) / width;
      area++; suma += prob[p]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
      if (x > 0 && marca[p - 1] === 1) { marca[p - 1] = 2; pila[top++] = p - 1; }
      if (x < width - 1 && marca[p + 1] === 1) { marca[p + 1] = 2; pila[top++] = p + 1; }
      if (y > 0 && marca[p - width] === 1) { marca[p - width] = 2; pila[top++] = p - width; }
      if (y < height - 1 && marca[p + width] === 1) { marca[p + width] = 2; pila[top++] = p + width; }
    }
    const w = x1 - x0 + 1, h = y1 - y0 + 1;
    if (Math.min(w, h) < minLado || suma / area < minPuntaje) continue;
    const d = (w * h * expansion) / (2 * (w + h)); // "unclip" de un rectángulo: área × 1,5 / perímetro
    const X0 = Math.max(0, Math.round((x0 - d) / resizeRatio)), Y0 = Math.max(0, Math.round((y0 - d) / resizeRatio));
    const X1 = Math.min(originalWidth, Math.round((x1 + 1 + d) / resizeRatio)), Y1 = Math.min(originalHeight, Math.round((y1 + 1 + d) / resizeRatio));
    if (X1 - X0 > 5 && Y1 - Y0 > 5) cajas.push({ x: X0, y: Y0, width: X1 - X0, height: Y1 - Y0 });
  }
  return cajas;
}

// cambia el post-proceso del detector de ppu-paddle-ocr (la clase DetectionService exportada por la librería)
export function corregirDetector(DetectionService, op = {}) {
  const proto = Object.getPrototypeOf(DetectionService.prototype) || DetectionService.prototype;
  if (proto.__cajasDB) return;
  const original = proto.postprocessDetection;
  proto.postprocessDetection = function (detection, input) {
    try { return cajasDB(detection, input.width, input.height, input, op); } catch { return original.call(this, detection, input); }
  };
  proto.__cajasDB = true;
}
