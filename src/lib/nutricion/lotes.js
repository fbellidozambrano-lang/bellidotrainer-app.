// Arma los lotes compactos que se publican en public/datos/nutricion y que importa la app.
// Lo usan el script de importación y las pruebas (mismo formato en los dos lados).
import { POR_ID } from './catalogo.js';

const recortar = (arr) => { let n = arr.length; while (n > 0 && arr[n - 1] == null) n--; return arr.slice(0, n); };

// alimentos normalizados (normalizarUSDA) → [{ formato, fuente, version, parte, partes, metodos, alimentos }]
export function armarLotes(alimentos, { fuente, version, tamano = 250 }) {
  const orden = [...alimentos].sort((a, b) => (Number(a.id_externo) - Number(b.id_externo)) || String(a.id_externo).localeCompare(String(b.id_externo)));
  const partes = Math.ceil(orden.length / tamano); const out = [];
  for (let i = 0; i < partes; i++) {
    const metodos = []; const m = (t) => { if (t == null) return null; let k = metodos.indexOf(t); if (k < 0) { metodos.push(t); k = metodos.length - 1; } return k; };
    const lote = orden.slice(i * tamano, (i + 1) * tamano).map((a) => ({
      ...a, avisos: a.avisos?.length ? a.avisos : undefined,
      // [nutriente, cantidad, estado, método, id del nutriente en la fuente, unidad original si se escribe distinto, n, mín, máx, mediana, nota]
      valores: a.valores.map((v) => recortar([v.nutriente, v.cantidad, v.estado, m(v.metodo), v.id_externo != null ? Number(v.id_externo) : null,
        v.unidad_original === POR_ID.get(v.nutriente).unidad ? null : v.unidad_original, v.n, v.min, v.max, v.mediana, v.nota])),
      porciones: (a.porciones || []).map((p) => [p.descripcion, p.original, p.gramos]),
    }));
    out.push({ formato: 1, fuente, version, parte: i + 1, partes, metodos, alimentos: JSON.parse(JSON.stringify(lote)) });
  }
  return out;
}
