#!/usr/bin/env node
// Escribe en supabase/schema.sql (entre las marcas) las filas del catálogo de nutrientes y de las
// fuentes, sacadas de src/lib/nutricion/catalogo.js y fuentes.js. Así el SQL y la app no se desalinean.
//   node scripts/nutricion/sql-catalogo.mjs
import fs from 'node:fs';
import { NUTRIENTES } from '../../src/lib/nutricion/catalogo.js';
import { FUENTES } from '../../src/lib/nutricion/fuentes.js';
const q = (v) => (v == null ? 'null' : typeof v === 'number' ? String(v) : typeof v === 'boolean' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => `array[${(a || []).map(q).join(',')}]::text[]`;
const lineas = [];
lineas.push('insert into public.nutri_fuentes (id, nombre, organizacion, evidencia, estado, url, licencia, licencia_url, atribucion, nota, historico) values');
lineas.push(Object.entries(FUENTES).map(([id, f]) => `  (${[q(id), q(f.nombre), q(f.organizacion), q(f.evidencia), q(f.estado), q(f.url), q(f.licencia), q(f.licencia_url), q(f.atribucion), q(f.nota), q(!!f.historico)].join(', ')})`).join(',\n'));
lineas.push('on conflict (id) do update set nombre = excluded.nombre, organizacion = excluded.organizacion, evidencia = excluded.evidencia, estado = excluded.estado, url = excluded.url,');
lineas.push('  licencia = excluded.licencia, licencia_url = excluded.licencia_url, atribucion = excluded.atribucion, nota = excluded.nota, historico = excluded.historico;');
lineas.push('insert into public.nutri_nutrientes (id, codigo, nombre, unidad, grupo, definicion, orden) values');
lineas.push(NUTRIENTES.map((n) => `  (${[n.id, q(n.codigo), q(n.nombre), q(n.unidad), q(n.grupo), q(n.definicion), n.orden].join(', ')})`).join(',\n'));
lineas.push('on conflict (id) do update set codigo = excluded.codigo, nombre = excluded.nombre, unidad = excluded.unidad, grupo = excluded.grupo, definicion = excluded.definicion, orden = excluded.orden;');
const map = NUTRIENTES.flatMap((n) => [...(n.usda || []).map((u) => ['usda', n.id, String(u)]), ...(n.off ? [['off', n.id, n.off]] : [])]);
lineas.push('insert into public.nutri_nutriente_fuente (sistema, id_externo, nutriente_id) values');
lineas.push(map.map(([s, id, e]) => `  (${q(s)}, ${q(e)}, ${id})`).join(',\n'));
lineas.push('on conflict (sistema, id_externo) do update set nutriente_id = excluded.nutriente_id;');
const bloque = lineas.join('\n');
const ruta = new URL('../../supabase/schema.sql', import.meta.url);
const sql = fs.readFileSync(ruta, 'utf8');
const A = '-- >>> catálogo generado (scripts/nutricion/sql-catalogo.mjs)', B = '-- <<< fin del catálogo generado';
if (!sql.includes(A)) { console.error('Faltan las marcas del catálogo en schema.sql'); process.exit(1); }
const i = sql.indexOf(A), j = sql.indexOf(B, i);
if (j < 0) { console.error('Falta la marca de fin del catálogo en schema.sql'); process.exit(1); }
fs.writeFileSync(ruta, sql.slice(0, i) + `${A}\n${bloque}\n` + sql.slice(j));
console.log(`Catálogo: ${NUTRIENTES.length} nutrientes, ${Object.keys(FUENTES).length} fuentes, ${map.length} códigos externos.`);
