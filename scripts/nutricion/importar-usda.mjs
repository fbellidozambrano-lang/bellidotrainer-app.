#!/usr/bin/env node
// Procesa un archivo OFICIAL de descarga de USDA FoodData Central (JSON comprimido en .zip) y genera
// los lotes normalizados que la app importa a la base (Ajustes → Base de alimentos).
//
//   node scripts/nutricion/importar-usda.mjs <archivo.zip> [--tamano 250] [--salida public/datos/nutricion]
//
// Descargas: https://fdc.nal.usda.gov/download-datasets/  (Foundation, SR Legacy, FNDDS "Survey")
// Es idempotente: con el mismo archivo genera exactamente los mismos lotes (mismos ids y huellas).
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { armarLotes } from '../../src/lib/nutricion/lotes.js';
import path from 'node:path';
import { normalizarUSDA, RAIZ_JSON, FUENTES_USDA } from '../../src/lib/nutricion/usda.js';
import { FUENTES } from '../../src/lib/nutricion/fuentes.js';

const args = process.argv.slice(2);
const zip = args.find((a) => !a.startsWith('--'));
const opt = (k, d) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : d; };
const TAM = Number(opt('tamano', 250)); const SALIDA = opt('salida', 'public/datos/nutricion');
if (!zip || !fs.existsSync(zip)) { console.error('Uso: node scripts/nutricion/importar-usda.mjs <archivo oficial .zip>'); process.exit(1); }

const nombreZip = path.basename(zip);
const ver = nombreZip.match(/_(\d{4}-\d{2}(?:-\d{2})?)\.zip$/); if (!ver) { console.error(`No reconozco la versión en el nombre del archivo: ${nombreZip}`); process.exit(1); }
const version = ver[1];
const sha256 = createHash('sha256').update(fs.readFileSync(zip)).digest('hex');

// 1) leer el JSON de dentro del zip (sin dependencias: unzip del sistema)
const lista = execFileSync('unzip', ['-Z1', zip]).toString().split('\n').filter((x) => x.endsWith('.json'));
if (lista.length !== 1) { console.error(`Se esperaba un solo .json dentro del zip y hay ${lista.length}`); process.exit(1); }
const datos = JSON.parse(execFileSync('unzip', ['-p', zip, lista[0]], { maxBuffer: 1 << 30 }).toString());
const raiz = Object.keys(datos).find((k) => RAIZ_JSON[k]);
if (!raiz || !Array.isArray(datos[raiz])) { console.error(`Formato no reconocido. Claves: ${Object.keys(datos).join(', ')}`); process.exit(1); }
const tipo = FUENTES_USDA[RAIZ_JSON[raiz]];

// 2) normalizar
const est = { recibidos: datos[raiz].length, validos: 0, rechazados: 0, duplicados: 0, valores: 0, valores_sin_numero: 0, avisos: 0 };
const errores = []; const porId = new Map();
for (const x of datos[raiz]) {
  const r = normalizarUSDA(x, { version });
  if (r.error) { est.rechazados++; if (errores.length < 200) errores.push(r.error); continue; }
  if (r.alimento.fuente !== tipo.fuente) { est.rechazados++; errores.push(`fdcId ${r.alimento.id_externo}: tipo ${r.alimento.tipo_registro} dentro de ${raiz}`); continue; }
  if (porId.has(r.alimento.id)) { est.duplicados++; continue; }
  porId.set(r.alimento.id, r.alimento); est.validos++; est.valores += r.alimento.valores.length;
  est.valores_sin_numero += r.alimento.valores.filter((v) => v.cantidad == null).length; est.avisos += r.alimento.avisos.length;
}

// 3) escribir lotes compactos (gzip): mismo formato que arma src/lib/nutricion/lotes.js
const dir = path.join(SALIDA, tipo.fuente, version);
fs.rmSync(path.join(SALIDA, tipo.fuente), { recursive: true, force: true }); // solo se publica la versión vigente
fs.mkdirSync(dir, { recursive: true });
const lotes = armarLotes([...porId.values()], { fuente: tipo.fuente, version, tamano: TAM });
const partes = lotes.length;
lotes.forEach((l) => fs.writeFileSync(path.join(dir, `parte-${String(l.parte).padStart(3, '0')}.json.gz`), zlib.gzipSync(JSON.stringify(l), { level: 9, mtime: 0 })));

// 4) manifiesto (lo lee la app para saber qué hay y qué versión)
const manPath = path.join(SALIDA, 'manifest.json');
const man = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : { formato: 1, conjuntos: [] };
const conj = {
  fuente: tipo.fuente, nombre: FUENTES[tipo.fuente].nombre, version, archivo: nombreZip, origen: `https://fdc.nal.usda.gov/fdc-datasets/${nombreZip}`, sha256,
  procesado: new Date().toISOString().slice(0, 10), partes, ruta: `${tipo.fuente}/${version}`, estadisticas: est, errores: errores.slice(0, 50), licencia: FUENTES[tipo.fuente].licencia,
};
man.conjuntos = [...man.conjuntos.filter((c) => c.fuente !== tipo.fuente), conj].sort((a, b) => a.fuente.localeCompare(b.fuente));
fs.writeFileSync(manPath, JSON.stringify(man, null, 2));
console.log(JSON.stringify({ fuente: tipo.fuente, version, sha256, partes, ...est }, null, 1));
if (errores.length) console.log('Primeros rechazos:', errores.slice(0, 5));
