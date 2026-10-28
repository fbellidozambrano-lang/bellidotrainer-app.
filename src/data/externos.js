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
