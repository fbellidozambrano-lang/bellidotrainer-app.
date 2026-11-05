// Lector de texto gratuito que corre en el teléfono: PaddleOCR (modelos PP-OCRv6 tiny) con ONNX Runtime en
// WebAssembly. No usa servidor ni claves: los modelos (unos 6 MB) y el motor (unos 15 MB, comprimido mucho menos)
// se descargan de la propia app la primera vez y quedan guardados en el teléfono.
// Funciona dentro de un Web Worker (lo normal) o en la página si el navegador no tiene workers con canvas.
import * as ort from 'onnxruntime-web';
import wasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.wasm?url';
import { DetectionService, PaddleOcrService } from 'ppu-paddle-ocr/web';
import zxingUrl from 'zxing-wasm/reader/zxing_reader.wasm?url';
import { corregirDetector } from './cajas.js';
import { escalar } from './imagen.js';
import { leerFrenteFoto, leerTablaFoto } from './lector.js';
import { resolverCodigo } from './tabla.js';

const BASE = `${import.meta.env?.BASE_URL || '/'}ocr/`;
export const MODELOS = { det: 'PP-OCRv6_tiny_det.ort', rec: 'PP-OCRv6_tiny_rec.ort', dic: 'ppocrv6_tiny_dict.txt' };
const CACHE = 'bt-ocr-1';
// tamaños sin comprimir, para mostrar el avance de la primera descarga
const PESO = { wasm: 14.85e6, det: 1.89e6, rec: 4.53e6, dic: 0.03e6 };

const absoluta = (u) => new URL(u, globalThis.location?.href || 'http://localhost/').href;

// descarga con avance; queda en la caché del teléfono para la próxima vez (y sin conexión)
async function bajar(url, onBytes) {
  let cache = null;
  try { cache = await caches.open(CACHE); const r = await cache.match(url); if (r) { const b = await r.arrayBuffer(); onBytes?.(b.byteLength); return b; } } catch { cache = null; }
  const r = await fetch(url); if (!r.ok) throw new Error(`No se pudo descargar el lector (${r.status})`);
  let buf;
  if (r.body?.getReader && onBytes) {
    const lector = r.body.getReader(); const partes = []; let n = 0;
    for (;;) { const { done, value } = await lector.read(); if (done) break; partes.push(value); n += value.byteLength; onBytes(n); }
    const out = new Uint8Array(n); let o = 0; partes.forEach((p) => { out.set(p, o); o += p.byteLength; }); buf = out.buffer;
  } else buf = await r.arrayBuffer();
  try { await cache?.put(url, new Response(buf.slice(0), { headers: { 'content-type': r.headers.get('content-type') || 'application/octet-stream' } })); } catch { /* sin espacio: se baja de nuevo la próxima vez */ }
  return buf;
}
// borra versiones viejas del lector guardadas en el teléfono
async function limpiarViejos(validas) {
  try {
    const nombres = await caches.keys(); await Promise.all(nombres.filter((n) => n.startsWith('bt-ocr-') && n !== CACHE).map((n) => caches.delete(n)));
    const c = await caches.open(CACHE); const ks = await c.keys(); await Promise.all(ks.filter((k) => !validas.includes(k.url)).map((k) => c.delete(k)));
  } catch { /* nada */ }
}

// cajas de texto como el PaddleOCR original (ver cajas.js)
corregirDetector(DetectionService);

let servicio = null;
export function prepararOCR(onEstado) {
  if (!servicio) {
    servicio = (async () => {
      const urls = { wasm: absoluta(wasmUrl), det: absoluta(BASE + MODELOS.det), rec: absoluta(BASE + MODELOS.rec), dic: absoluta(BASE + MODELOS.dic) };
      const total = Object.values(PESO).reduce((a, b) => a + b, 0); const van = {}; let ultimo = -1;
      const avance = (k) => (n) => { van[k] = n; const p = Math.min(99, Math.round((Object.values(van).reduce((a, b) => a + b, 0) / total) * 100)); if (p !== ultimo) { ultimo = p; onEstado?.(`Preparando el lector del teléfono… ${p} %`); } };
      const [wasm, det, rec, dic] = await Promise.all(['wasm', 'det', 'rec', 'dic'].map((k) => bajar(urls[k], avance(k))));
      limpiarViejos(Object.values(urls));
      onEstado?.('Preparando el lector del teléfono…');
      // el motor va dentro del paquete de la app (no se pide a ningún CDN): solo se le pasa el .wasm ya descargado
      ort.env.wasm.wasmPaths = { wasm: urls.wasm }; ort.env.wasm.wasmBinary = wasm; ort.env.wasm.numThreads = 1; ort.env.logLevel = 'error';
      const s = new PaddleOcrService({
        model: { detection: det, recognition: rec, charactersDictionary: dic },
        session: { executionProviders: ['wasm'], graphOptimizationLevel: 'all' },
        recognition: { mainThreadYieldMs: typeof window !== 'undefined' ? 16 : 0 },
      });
      await s.initialize(); return s;
    })().catch((e) => { servicio = null; throw e; });
  }
  return servicio;
}

const lienzo = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// la foto (archivo o Blob) como { data, width, height }, con la orientación de la cámara y de hasta `max` px
export async function imagenDeArchivo(archivo, max = 3000) {
  let bmp;
  try { bmp = await createImageBitmap(archivo, { imageOrientation: 'from-image' }); } catch { bmp = await createImageBitmap(archivo); }
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height)); const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
  const c = lienzo(w, h); const x = c.getContext('2d', { willReadFrequently: true });
  x.imageSmoothingQuality = 'high'; x.drawImage(bmp, 0, 0, w, h); bmp.close?.();
  const d = x.getImageData(0, 0, w, h); return { data: d.data, width: w, height: h };
}

// imagen { data, width, height } → líneas del OCR
export async function ocrImagen(im) {
  const s = await prepararOCR();
  const c = lienzo(im.width, im.height); const x = c.getContext('2d', { willReadFrequently: true });
  const id = x.createImageData(im.width, im.height); id.data.set(im.data); x.putImageData(id, 0, 0);
  const r = await s.recognize(c, { noCache: true }); return r?.lines || [];
}

// código de barras: el detector del navegador (Chrome en Android) o ZXing en WebAssembly (iPhone y el resto)
let zxing = null;
async function lectorZXing() {
  if (!zxing) zxing = import('zxing-wasm/reader').then((z) => { z.prepareZXingModule({ overrides: { locateFile: (p, pre) => (p.endsWith('.wasm') ? absoluta(zxingUrl) : pre + p) } }); return z; }).catch((e) => { zxing = null; throw e; });
  return zxing;
}
export async function codigoDe(im) {
  try {
    const k = Math.min(1, 2000 / Math.max(im.width, im.height)); const s = k < 1 ? escalar(im, im.width * k, im.height * k) : im;
    const datos = new ImageData(s.data, s.width, s.height); let v = '';
    // barras de menos de ~190 px de ancho (menos de 2 px por barra) se leen mal a veces: no se toman
    const ANCHO_MIN = 190;
    if (typeof BarcodeDetector !== 'undefined') {
      try { const r = await new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] }).detect(datos); const b = (r || []).find((x) => (x.boundingBox?.width ?? ANCHO_MIN) >= ANCHO_MIN || (x.boundingBox?.height ?? 0) >= ANCHO_MIN); v = String(b?.rawValue || ''); } catch { v = ''; }
    }
    if (!v) {
      const z = await lectorZXing(); const r = await z.readBarcodes(datos, { formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'], tryHarder: true, maxNumberOfSymbols: 1 });
      const b = (r || []).find((x) => { const q = x.position; return x.isValid && (!q || Math.hypot(q.topRight.x - q.topLeft.x, q.topRight.y - q.topLeft.y) >= ANCHO_MIN); }); v = String(b?.text || '');
    }
    v = v.replace(/\D/g, ''); return /^\d{8,14}$/.test(v) ? v : '';
  } catch { return ''; }
}

// lo que hace el worker: leer la tabla o el frente de una foto (y su código de barras, si se ve)
export async function procesar(tipo, archivo, onEstado) {
  if (tipo === 'codigo') return { codigo: await codigoDe(await imagenDeArchivo(archivo, 2000)) };
  await prepararOCR(onEstado);
  const im = await imagenDeArchivo(archivo, tipo === 'tabla' ? 3000 : 2000);
  if (tipo === 'frente') {
    onEstado?.('Leyendo el frente…');
    const { lineasOCR, ...r } = await leerFrenteFoto(im, ocrImagen);
    return { ...r, ...resolverCodigo(await codigoDe(im), lineasOCR) };
  }
  const r = await leerTablaFoto(im, ocrImagen, { onEstado });
  return { l: r.l, ...resolverCodigo(await codigoDe(im), r.lineas) };
}
