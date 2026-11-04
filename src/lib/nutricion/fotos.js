// Fotos de la etiqueta en el teléfono: achicarlas para mandarlas, leer el texto sin servidor
// (Tesseract, español e inglés) y buscar el código de barras. Solo navegador.

// la foto a JPEG de hasta `max` px por lado (las del teléfono pesan varios MB)
export async function prepararFoto(archivo, { max = 2000, calidad = 0.85, gris = false } = {}) {
  const bmp = await createImageBitmap(archivo).catch(async () => {
    const url = URL.createObjectURL(archivo); try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); } });
  const w0 = bmp.width, h0 = bmp.height; const k = Math.min(1, max / Math.max(w0, h0));
  const c = document.createElement('canvas'); c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  const x = c.getContext('2d'); x.drawImage(bmp, 0, 0, c.width, c.height);
  if (gris) { // gris con más contraste: ayuda al lector del teléfono
    const d = x.getImageData(0, 0, c.width, c.height); const p = d.data; let mn = 255, mx = 0;
    for (let i = 0; i < p.length; i += 4) { const g = 0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]; p[i] = g; if (g < mn) mn = g; if (g > mx) mx = g; }
    const r = Math.max(1, mx - mn);
    for (let i = 0; i < p.length; i += 4) { const g = Math.max(0, Math.min(255, ((p[i] - mn) / r) * 255)); p[i] = p[i + 1] = p[i + 2] = g; }
    x.putImageData(d, 0, 0);
  }
  const dataUrl = c.toDataURL('image/jpeg', calidad);
  return { dataUrl, base64: dataUrl.split(',')[1], media_type: 'image/jpeg', ancho: c.width, alto: c.height };
}

// código de barras en la foto (Chrome en Android lo trae; en iPhone no existe y se escribe a mano)
export async function codigoEnFoto(archivo) {
  try {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return '';
    const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
    const r = await det.detect(await createImageBitmap(archivo));
    const v = String(r?.[0]?.rawValue || '').replace(/\D/g, ''); return /^\d{8,14}$/.test(v) ? v : '';
  } catch { return ''; }
}

// lector de texto en el teléfono: se descarga la primera vez (unos 5 MB) y queda en caché
let trabajador = null; let avisar = null;
export async function textoDeFoto(dataUrl, onProgreso) {
  avisar = onProgreso || null;
  if (!trabajador) {
    trabajador = import('tesseract.js').then(({ createWorker }) => createWorker(['spa', 'eng'], 1, {
      logger: (m) => { if (avisar && m && typeof m.progress === 'number') avisar(m.status === 'recognizing text' ? 'leyendo' : 'preparando', m.progress); },
    })).catch((e) => { trabajador = null; throw e; });
  }
  const w = await trabajador; const r = await w.recognize(dataUrl); return String(r?.data?.text || '');
}
