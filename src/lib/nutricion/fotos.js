// Fotos de la etiqueta en el teléfono: achicarlas para mandarlas a la IA (si el servidor la tiene) y leerlas
// gratis en el propio teléfono (PaddleOCR en un Web Worker, ver motorOcr.js). Solo navegador.

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

// lector del teléfono: corre en un Web Worker para no trabar la pantalla; si el navegador no puede, en la página
let trabajador = null; let sinWorker = false; let sec = 0; const pendientes = new Map();
function elTrabajador() {
  if (trabajador || sinWorker) return trabajador;
  try {
    if (typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') { sinWorker = true; return null; }
    trabajador = new Worker(new URL('./ocr.worker.js', import.meta.url), { type: 'module' });
    trabajador.onmessage = ({ data }) => {
      const p = pendientes.get(data?.id); if (!p) return;
      if (data.estado) { p.onEstado?.(data.estado); return; }
      pendientes.delete(data.id); if (data.ok) p.ok(data.r); else p.mal(Object.assign(new Error(data.error), { delWorker: true }));
    };
    trabajador.onerror = (e) => { e?.preventDefault?.(); const ps = [...pendientes.values()]; pendientes.clear(); trabajador?.terminate(); trabajador = null; sinWorker = true; ps.forEach((p) => p.mal(new Error('sin worker'))); };
  } catch { sinWorker = true; trabajador = null; }
  return trabajador;
}
async function enPagina(tipo, archivo, onEstado) { const m = await import('./motorOcr.js'); return m.procesar(tipo, archivo, onEstado); }
// tipo: 'tabla' → { l, codigo } · 'frente' → { lineas, contenido, codigo } · 'codigo' → { codigo }
export async function leerFoto(tipo, archivo, onEstado) {
  const w = elTrabajador();
  if (!w) return enPagina(tipo, archivo, onEstado);
  try {
    return await new Promise((ok, mal) => { const id = ++sec; pendientes.set(id, { ok, mal, onEstado }); w.postMessage({ id, tipo, archivo }); });
  } catch (e) {
    if (e.delWorker && /descargar/i.test(e.message)) throw e; // sin conexión: en la página tampoco se podría
    return enPagina(tipo, archivo, onEstado); // el worker no pudo (navegador viejo): se intenta en la página
  }
}
export async function codigoEnFoto(archivo) { try { return (await leerFoto('codigo', archivo)).codigo || ''; } catch { return ''; } }
