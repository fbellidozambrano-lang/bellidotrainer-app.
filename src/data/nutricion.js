// Importación de la base de alimentos desde los lotes publicados con la app
// (public/datos/nutricion, generados con scripts/nutricion/importar-usda.mjs a partir de los
// archivos oficiales de USDA). Idempotente y reanudable: cada parte se registra en la base y,
// si algo falla, se reintenta sin duplicar nada.
import { uuidDe } from '../lib/util.js';

export const RUTA_DATOS = '/datos/nutricion';

export async function leerManifiesto(fetcher = fetch, base = RUTA_DATOS) {
  const r = await fetcher(`${base}/manifest.json`, { cache: 'no-cache' });
  if (!r.ok) throw new Error('No encontré la lista de conjuntos de datos (manifest.json).');
  const m = await r.json();
  if (m.formato !== 1 || !Array.isArray(m.conjuntos)) throw new Error('El manifiesto de datos no tiene el formato esperado.');
  return m;
}

// bytes (gzip o JSON plano) → objeto
export async function leerLote(bytes) {
  const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let texto;
  if (u8[0] === 0x1f && u8[1] === 0x8b) {
    if (typeof DecompressionStream !== 'undefined') texto = await new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
    else { const z = await import(/* @vite-ignore */ ['node', 'zlib'].join(':')); texto = z.gunzipSync(u8).toString('utf8'); }
  } else texto = new TextDecoder().decode(u8);
  const d = JSON.parse(texto);
  if (d.formato !== 1 || !d.fuente || !d.version || !Array.isArray(d.alimentos)) throw new Error('Lote con formato no válido.');
  return d;
}

export const idImportacion = (c) => uuidDe(`importacion:${c.fuente}:${c.version}:${c.sha256}`);

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
// Importa un conjunto completo. Salta las partes ya hechas (reanuda) y reintenta cada parte hasta 3 veces.
export async function importarConjunto({ nutri, conjunto, fetcher = fetch, base = RUTA_DATOS, onProgreso = () => {}, forzar = false, intentos = 3, pausa = 800 }) {
  const id = idImportacion(conjunto);
  const imp = await nutri.importacionIniciar({ id, fuente: conjunto.fuente, version: conjunto.version, archivo: conjunto.archivo, sha256: conjunto.sha256, origen: conjunto.origen,
    partes: conjunto.partes, recibidos: conjunto.estadisticas?.recibidos || 0 });
  const hechas = new Set(forzar ? [] : imp.partes_hechas || []);
  const tot = { insertados: 0, actualizados: 0, omitidos: 0, rechazados: 0, errores: [], partes: 0, saltadas: 0 };
  for (let p = 1; p <= conjunto.partes; p++) {
    if (hechas.has(p)) { tot.saltadas++; onProgreso({ parte: p, partes: conjunto.partes, saltada: true }); continue; }
    let ultimo;
    for (let i = 0; i < intentos; i++) {
      try {
        const r = await fetcher(`${base}/${conjunto.ruta}/parte-${String(p).padStart(3, '0')}.json.gz`);
        if (!r.ok) throw new Error(`No se pudo descargar la parte ${p} (${r.status})`);
        const lote = await leerLote(await r.arrayBuffer());
        if (lote.fuente !== conjunto.fuente || lote.version !== conjunto.version || lote.parte !== p) throw new Error(`La parte ${p} no corresponde a ${conjunto.fuente} ${conjunto.version}`);
        const res = await nutri.importarLote(id, p, { fuente: lote.fuente, version: lote.version, metodos: lote.metodos, alimentos: lote.alimentos }, forzar);
        ['insertados', 'actualizados', 'omitidos', 'rechazados'].forEach((k) => { tot[k] += res[k] || 0; });
        (res.errores || []).forEach((e) => tot.errores.length < 50 && tot.errores.push(e));
        tot.partes++; ultimo = null; onProgreso({ parte: p, partes: conjunto.partes, ...res }); break;
      } catch (e) { ultimo = e; if (i < intentos - 1) await esperar(pausa * (i + 1)); }
    }
    if (ultimo) { tot.error = `Se detuvo en la parte ${p}: ${ultimo.message}. Vuelve a tocar Importar y sigue desde ahí.`; break; }
  }
  if (!tot.error) await nutri.importacionCerrar(id);
  return { id, ...tot };
}
