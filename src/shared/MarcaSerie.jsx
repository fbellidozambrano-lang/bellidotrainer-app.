import React from 'react';
import { tecnicaDe } from '../lib/series.js';
import { ROLES } from '../lib/esquemas.js';
import { fmt, nSeg } from '../lib/util.js';

// Etiqueta de una serie ya registrada: lado (D / I), papel en el esquema (top set, back off…),
// tipo de serie (drop set, rest-pause…), sus sub-series ("↳ 17 × 6 · 14,5 × 4") y la aproximación que se hizo antes
export default function MarcaSerie({ x }) {
  const subs = (x?.subs || []).filter((s) => nSeg(s.reps) > 0);
  const aprox = Array.isArray(x?.aprox) ? x.aprox.filter((s) => nSeg(s.reps) > 0) : [];
  const rol = x?.aprox === true ? 'Aproximación' : ROLES[x?.rol] || '';
  if (!x?.lado && !x?.tecnica && !rol && !subs.length && !aprox.length) return null;
  return <>
    {rol && <em className={`s-tag ${x?.rol ? `rol-${x.rol}` : 'rol-aprox'}`}>{rol}</em>}
    {(x.lado || x.tecnica) && <em className="s-tag">{x.lado || ''}{x.lado && x.tecnica ? ' · ' : ''}{x.tecnica ? tecnicaDe(x.tecnica)?.n || x.tecnica : ''}</em>}
    {subs.length > 0 && <em className="s-sub"> ↳ {subs.map((s) => `${s.ejercicio ? `${s.ejercicio} ` : ''}${nSeg(s.peso) > 0 ? `${fmt(nSeg(s.peso), 1)} ` : ''}× ${s.reps}${s.pct ? ` (${s.pct > 0 ? '+' : '−'}${Math.abs(s.pct)} %)` : ''}`).join(' · ')}</em>}
    {aprox.length > 0 && <em className="s-sub s-aprox"> antes, aproximación: {aprox.map((s) => `${fmt(nSeg(s.peso), 1)} × ${s.reps}${s.lado ? ` ${s.lado}` : ''}`).join(' · ')}</em>}
  </>;
}
