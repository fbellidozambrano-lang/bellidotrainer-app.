// Worker del lector de etiquetas: lee las fotos sin trabar la pantalla.
import { procesar } from './motorOcr.js';

self.onmessage = async ({ data }) => {
  const { id, tipo, archivo } = data || {};
  try {
    const r = await procesar(tipo, archivo, (estado) => self.postMessage({ id, estado }));
    self.postMessage({ id, ok: true, r });
  } catch (e) {
    self.postMessage({ id, ok: false, error: String(e?.message || e) });
  }
};
