// Piezas de la alimentación que usan el coach y el asesorado.
import React from 'react';
import { CALIDADES, PREPARACIONES } from '../../lib/nutricion/clasificar.js';
import { FUENTES } from '../../lib/nutricion/fuentes.js';
import { redondear } from '../../lib/nutricion/calculo.js';
import { POR_CODIGO } from '../../lib/nutricion/catalogo.js';

// nombre legible de un dato que falta ("azucares" → "azúcares")
const DATOS = { kcal: 'calorías', proteina: 'proteína', carbohidratos: 'carbohidratos', grasa: 'grasa', fibra: 'fibra', azucares: 'azúcares', grasa_saturada: 'grasa saturada', sodio: 'sodio', sal: 'sal' };
export const nombreDato = (k) => DATOS[k] || POR_CODIGO.get(k)?.nombre?.toLowerCase() || k;
export const nombresDatos = (ks) => (ks || []).map(nombreDato).join(', ');

export const n0 = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(redondear(v, 0)).toLocaleString('es-VE'));
export const n1 = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : Number(redondear(v, 1)).toLocaleString('es-VE', { maximumFractionDigits: 1 }));
export const nCant = (v, unidad) => {
  if (v == null || !Number.isFinite(Number(v))) return '—';
  const x = Number(v); const d = x === 0 ? 0 : Math.abs(x) < 1 ? 2 : Math.abs(x) < 100 ? 1 : 0;
  return `${x.toLocaleString('es-VE', { maximumFractionDigits: d })}${unidad ? ` ${unidad}` : ''}`;
};
export const COMIDAS_BASE = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Merienda 2', 'Cena tardía', 'Pre-entreno', 'Post-entreno'];
export const nombresComidas = (obj) => {
  const c = obj?.comidas; const n = Array.isArray(c) ? c.length : Number(c) || 4;
  return Array.from({ length: Math.max(1, Math.min(8, n)) }, (_, i) => (Array.isArray(c) && c[i]?.nombre) || COMIDAS_BASE[i]);
};

const CLASE_CALIDAD = { oficial_analitico: 'q-oficial', referencia: 'q-ref', etiqueta: 'q-etiq', colaborativo: 'q-colab', personalizado: 'q-pers' };
export function Calidad({ calidad, fuente, historico, corto }) {
  const c = CALIDADES[calidad]; if (!c) return null;
  const f = FUENTES[fuente];
  return <span className={`q ${CLASE_CALIDAD[calidad] || ''}`} title={c.d}>{corto ? (fuente?.startsWith('usda') ? `USDA ${fuente.replace('usda_', '').replace('sr_legacy', 'SR').replace('foundation', 'Foundation').replace('fndds', 'FNDDS').replace('branded', 'marca')}` : f?.nombre?.split(' ·')[0] || c.n) : c.n}{historico ? ' · histórico' : ''}</span>;
}
// método de obtención de USDA (en inglés en la fuente) → resumen en español; el texto original va en el título
const METODOS = [[/^(A|AR|AI)$/, 'analítico'], [/^AS$/, 'suma de componentes'], [/^NC$/, 'calculado'], [/^NR$/, 'calculado desde otro nutriente'], [/^Z$/, 'cero asumido'],
  [/^M[ACL]$/, 'dato del fabricante'], [/^LC$/, 'calculado desde la etiqueta'], [/^FL/, 'estimado por formulación'], [/^R/, 'receta'], [/^B/, 'basado en otra forma del alimento'],
  [/^CA/, 'calculado de otro alimento de su grupo'], [/^P/, 'por composición física'], [/^J/, 'datos agregados'], [/^T$/, 'tomado de otra tabla'], [/^S$/, 'norma del producto'],
  [/^O$/, 'otro método de imputación'], [/^DA$/, 'ajuste de concentración']];
export function metodoTexto(m) {
  const t = String(m || ''); const cod = t.split(' · ')[0]; if (!cod || cod === t) return t;
  const r = METODOS.find(([re]) => re.test(cod)); return r ? `${cod} · ${r[1]}` : t;
}
export const NOMBRE_FUENTE = { usda_foundation: 'USDA Foundation', usda_sr_legacy: 'USDA SR Legacy', usda_fndds: 'USDA FNDDS', usda_branded: 'USDA marcas', off: 'Open Food Facts', coach: 'personalizado' };
export const prepTexto = (p) => PREPARACIONES[p] || p;

// barra de progreso contra una meta (mínima o máxima)
export function BarraMeta({ etiqueta, valor, meta, unidad = 'g', max = false, faltan = 0, clase = '' }) {
  const pct = meta ? Math.min(100, (Number(valor || 0) / meta) * 100) : 0; const pasa = meta && Number(valor || 0) > meta * 1.05;
  return (
    <div className={`bm ${clase} ${max && pasa ? 'pasa' : ''} ${!max && meta && Number(valor || 0) >= meta * 0.95 ? 'listo' : ''}`}>
      <div className="bm-t"><span>{etiqueta}</span><b className="num">{nCant(valor || 0)}{meta ? <small> / {nCant(meta)} {unidad}</small> : <small> {unidad}</small>}</b></div>
      <div className="bm-b"><i style={{ width: `${pct}%` }} /></div>
      {faltan > 0 && <small className="bm-f">Sin dato en {faltan} {faltan === 1 ? 'alimento' : 'alimentos'}: el total puede ser mayor</small>}
    </div>
  );
}

// anillo de calorías
export function Anillo({ valor = 0, meta, tam = 132 }) {
  const r = 52, c = 2 * Math.PI * r; const pct = meta ? Math.min(1, valor / meta) : 0; const pasa = meta && valor > meta * 1.05;
  const resta = meta ? Math.round(meta - valor) : null;
  return (
    <svg className="anillo" width={tam} height={tam} viewBox="0 0 120 120" role="img" aria-label={`${n0(valor)} de ${n0(meta)} kcal`}>
      <circle cx="60" cy="60" r={r} className="an-f" />
      <circle cx="60" cy="60" r={r} className={`an-v ${pasa ? 'pasa' : ''}`} strokeDasharray={`${c * pct} ${c}`} transform="rotate(-90 60 60)" />
      <text x="60" y="56" textAnchor="middle" className="an-n">{n0(valor)}</text>
      <text x="60" y="74" textAnchor="middle" className="an-s">{meta ? (resta >= 0 ? `quedan ${n0(resta)}` : `+${n0(-resta)} kcal`) : 'kcal'}</text>
    </svg>
  );
}

// línea corta de macros
export const Macros = ({ v, por100 }) => (
  <span className="macros-l">{n0(v?.kcal)} kcal · P {n1(v?.proteina)} · C {n1(v?.carbohidratos)} · G {n1(v?.grasa)}{por100 ? ' /100 g' : ''}</span>
);
