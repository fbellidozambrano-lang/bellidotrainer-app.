// Búsqueda en fuentes externas a través de la función del servidor (api/alimentos.js).
// Si falla (sin señal, sin la función publicada o sin clave), se informa y la app sigue con la base local.
export async function buscarExterno(params, f = typeof fetch !== 'undefined' ? fetch : null) {
  const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  let r;
  try { r = await f(`/api/alimentos?${qs}`); }
  catch { throw new Error('Sin conexión con la fuente externa. Puedes seguir con los alimentos de la base.'); }
  let d = null; try { d = await r.json(); } catch {}
  if (!r.ok || !d) {
    if (r.status === 404 && d?.productos) return d; // código no encontrado: respuesta válida, lista vacía
    if (!d) throw new Error('La búsqueda externa solo funciona con la app publicada en Vercel. Usa los alimentos de la base.');
    throw new Error(d.error || `La fuente externa respondió ${r.status}`);
  }
  return d;
}

// Lector de etiquetas con IA (api/etiqueta.js). Devuelve { lectura } o, si el servidor no tiene la IA
// configurada o no está (modo local), { sinServidor: true } para que el teléfono la lea por su cuenta.
export async function leerEtiquetaIA(imagenes, { token = null, jwt = null } = {}, f = typeof fetch !== 'undefined' ? fetch : null) {
  let r;
  try { r = await f('/api/etiqueta', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}) }, body: JSON.stringify({ imagenes, ...(token ? { token } : {}) }) }); }
  catch { return { sinServidor: true, motivo: 'Sin conexión: la etiqueta se lee en el teléfono.' }; }
  let d = null; try { d = await r.json(); } catch { d = null; }
  if (!d || r.status === 404) return { sinServidor: true, motivo: 'La lectura con IA solo funciona con la app publicada.' };
  if (r.status === 501 && d.sinClave) return { sinServidor: true, motivo: d.error };
  if (!r.ok) throw new Error(d.error || `La lectura respondió ${r.status}`);
  return d;
}
