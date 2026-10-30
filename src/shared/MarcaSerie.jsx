import React from 'react';
import { tecnicaDe } from '../lib/series.js';
import { fmt, nSeg } from '../lib/util.js';

// Etiqueta de una serie ya registrada: lado (D / I), tipo de serie (drop set, rest-pause…) y sus sub-series
// ("↳ 17 × 6 · 14,5 × 4" debajo de la serie donde se aplicó)
export default function MarcaSerie({ x }) {
  const subs = (x?.subs || []).filter((s) => nSeg(s.reps) > 0);
  if (!x?.lado && !x?.tecnica && !subs.length) return null;
  return <>
    {(x.lado || x.tecnica) && <em className="s-tag">{x.lado || ''}{x.lado && x.tecnica ? ' · ' : ''}{x.tecnica ? tecnicaDe(x.tecnica)?.n || x.tecnica : ''}</em>}
    {subs.length > 0 && <em className="s-sub"> ↳ {subs.map((s) => `${s.ejercicio ? `${s.ejercicio} ` : ''}${nSeg(s.peso) > 0 ? `${fmt(nSeg(s.peso), 1)} ` : ''}× ${s.reps}${s.pct ? ` (${s.pct > 0 ? '+' : '−'}${Math.abs(s.pct)} %)` : ''}`).join(' · ')}</em>}
  </>;
}
