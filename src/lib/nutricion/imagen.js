// Operaciones de imagen sin dependencias (sirven en el navegador y en las pruebas con Node):
// una imagen es { data: RGBA, width, height }. Enderezar la foto, girarla, recortarla y escalarla
// antes de leerla hace que el OCR acierte mucho más.

export function nueva(width, height) { return { data: new Uint8ClampedArray(width * height * 4), width, height }; }

// escala con promedio de áreas al achicar y bilineal al agrandar
export function escalar(im, w, h) {
  w = Math.max(1, Math.round(w)); h = Math.max(1, Math.round(h));
  const out = nueva(w, h); const sx = im.width / w, sy = im.height / h; const s = im.data, d = out.data;
  if (sx >= 1 && sy >= 1) {
    for (let y = 0; y < h; y++) {
      const y0 = Math.floor(y * sy), y1 = Math.min(im.height, Math.max(y0 + 1, Math.floor((y + 1) * sy)));
      for (let x = 0; x < w; x++) {
        const x0 = Math.floor(x * sx), x1 = Math.min(im.width, Math.max(x0 + 1, Math.floor((x + 1) * sx)));
        let r = 0, g = 0, b = 0, n = 0;
        for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * im.width + xx) * 4; r += s[i]; g += s[i + 1]; b += s[i + 2]; n++; }
        const o = (y * w + x) * 4; d[o] = r / n; d[o + 1] = g / n; d[o + 2] = b / n; d[o + 3] = 255;
      }
    }
    return out;
  }
  for (let y = 0; y < h; y++) {
    const fy = Math.min(im.height - 1, Math.max(0, (y + 0.5) * sy - 0.5)); const y0 = Math.floor(fy), y1 = Math.min(im.height - 1, y0 + 1), ty = fy - y0;
    for (let x = 0; x < w; x++) {
      const fx = Math.min(im.width - 1, Math.max(0, (x + 0.5) * sx - 0.5)); const x0 = Math.floor(fx), x1 = Math.min(im.width - 1, x0 + 1), tx = fx - x0;
      const o = (y * w + x) * 4;
      for (let c = 0; c < 3; c++) {
        const a = s[(y0 * im.width + x0) * 4 + c], b = s[(y0 * im.width + x1) * 4 + c], e = s[(y1 * im.width + x0) * 4 + c], f = s[(y1 * im.width + x1) * 4 + c];
        d[o + c] = (a * (1 - tx) + b * tx) * (1 - ty) + (e * (1 - tx) + f * tx) * ty;
      }
      d[o + 3] = 255;
    }
  }
  return out;
}
export const caber = (im, max) => { const k = max / Math.max(im.width, im.height); return k >= 1 ? im : escalar(im, im.width * k, im.height * k); };

export function recortar(im, x, y, w, h) {
  x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y)); w = Math.min(im.width - x, Math.ceil(w)); h = Math.min(im.height - y, Math.ceil(h));
  const out = nueva(w, h);
  for (let r = 0; r < h; r++) out.data.set(im.data.subarray(((y + r) * im.width + x) * 4, ((y + r) * im.width + x + w) * 4), r * w * 4);
  return out;
}

// gira `grados` (sentido horario) alrededor del centro; el lienzo crece para no cortar nada (fondo blanco)
export function rotar(im, grados) {
  const g = ((grados % 360) + 360) % 360;
  if (g === 0) return im;
  if (g === 90 || g === 180 || g === 270) {
    const W = g === 180 ? im.width : im.height, H = g === 180 ? im.height : im.width; const out = nueva(W, H); const s = im.data, d = out.data;
    for (let y = 0; y < im.height; y++) for (let x = 0; x < im.width; x++) {
      const [nx, ny] = g === 90 ? [im.height - 1 - y, x] : g === 180 ? [im.width - 1 - x, im.height - 1 - y] : [y, im.width - 1 - x];
      const i = (y * im.width + x) * 4, o = (ny * W + nx) * 4; d[o] = s[i]; d[o + 1] = s[i + 1]; d[o + 2] = s[i + 2]; d[o + 3] = 255;
    }
    return out;
  }
  const a = (grados * Math.PI) / 180; const c = Math.cos(a), sn = Math.sin(a);
  const W = Math.ceil(Math.abs(im.width * c) + Math.abs(im.height * sn)), H = Math.ceil(Math.abs(im.width * sn) + Math.abs(im.height * c));
  const out = nueva(W, H); const s = im.data, d = out.data; const cx = im.width / 2, cy = im.height / 2, CX = W / 2, CY = H / 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - CX, dy = y - CY; const fx = c * dx + sn * dy + cx, fy = -sn * dx + c * dy + cy; const o = (y * W + x) * 4;
    if (fx < 0 || fy < 0 || fx > im.width - 1 || fy > im.height - 1) { d[o] = d[o + 1] = d[o + 2] = d[o + 3] = 255; continue; }
    const x0 = Math.floor(fx), y0 = Math.floor(fy), x1 = Math.min(im.width - 1, x0 + 1), y1 = Math.min(im.height - 1, y0 + 1), tx = fx - x0, ty = fy - y0;
    for (let k = 0; k < 3; k++) {
      const p = s[(y0 * im.width + x0) * 4 + k], q = s[(y0 * im.width + x1) * 4 + k], r = s[(y1 * im.width + x0) * 4 + k], t = s[(y1 * im.width + x1) * 4 + k];
      d[o + k] = (p * (1 - tx) + q * tx) * (1 - ty) + (r * (1 - tx) + t * tx) * ty;
    }
    d[o + 3] = 255;
  }
  return out;
}

// gris (luminancia)
function grises(im) { const n = im.width * im.height; const g = new Uint8Array(n); for (let i = 0; i < n; i++) g[i] = (im.data[i * 4] * 299 + im.data[i * 4 + 1] * 587 + im.data[i * 4 + 2] * 114) / 1000; return g; }
// texto como bordes (sirve para texto oscuro y claro, y sobre fondos de color)
function bordes(im) {
  const g = grises(im); const W = im.width, H = im.height; const e = new Uint16Array(W * H);
  let suma = 0;
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const v = Math.abs(g[y * W + x + 1] - g[y * W + x - 1]) + Math.abs(g[(y + 1) * W + x] - g[(y - 1) * W + x]); e[y * W + x] = v; suma += v; }
  const t = Math.max(30, (suma / (W * H)) * 3); const pts = [];
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) if (e[y * W + x] > t) pts.push(x, y);
  return pts;
}
// Inclinación de las líneas de texto por perfil de proyección: el ángulo (±15°) que deja las filas más nítidas.
// Si la foto está de lado lo detecta el OCR (las cajas salen altas), no esto.
export function inclinacionTexto(im0) {
  const im = caber(im0, 700); const pts = bordes(im); if (pts.length < 400) return { angulo: 0, puntos: pts.length / 2 };
  const W = im.width, H = im.height;
  const puntaje = (ang) => {
    const t = Math.tan((ang * Math.PI) / 180); const off = Math.ceil(Math.abs(t) * W) + 2; const h = new Float64Array(H + 2 * off);
    for (let i = 0; i < pts.length; i += 2) { const y = Math.round(pts[i + 1] - t * pts[i]) + off; if (y >= 0 && y < h.length) h[y]++; }
    let s = 0; for (let i = 1; i < h.length; i++) { const d = h[i] - h[i - 1]; s += d * d; } return s;
  };
  let mejor = { a: 0, s: puntaje(0) };
  for (let a = -15; a <= 15; a += 0.5) { const s = puntaje(a); if (s > mejor.s * 1.0001) mejor = { a, s }; }
  for (let a = mejor.a - 0.4; a <= mejor.a + 0.4; a += 0.1) { const s = puntaje(a); if (s > mejor.s * 1.0001) mejor = { a, s }; }
  return { angulo: Math.round(mejor.a * 10) / 10, puntos: pts.length / 2 };
}

// fotos oscuras o lavadas: estira el brillo para que lo más oscuro sea negro y lo más claro blanco (1 % y 99 %)
export function contraste(im) {
  const n = im.width * im.height; const hist = new Uint32Array(256); const d = im.data;
  for (let i = 0; i < n; i++) hist[(d[i * 4] * 299 + d[i * 4 + 1] * 587 + d[i * 4 + 2] * 114) / 1000 | 0]++;
  let a = 0, b = 255, acc = 0; for (; a < 255; a++) { acc += hist[a]; if (acc > n * 0.01) break; }
  acc = 0; for (; b > 0; b--) { acc += hist[b]; if (acc > n * 0.01) break; }
  if (b - a >= 170 || b <= a) return im; // ya tiene buen contraste
  const k = 255 / (b - a); const out = nueva(im.width, im.height); const o = out.data;
  for (let i = 0; i < d.length; i += 4) { o[i] = (d[i] - a) * k; o[i + 1] = (d[i + 1] - a) * k; o[i + 2] = (d[i + 2] - a) * k; o[i + 3] = 255; }
  return out;
}
