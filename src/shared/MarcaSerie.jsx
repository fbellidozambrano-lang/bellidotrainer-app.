import React from 'react';
import { tecnicaDe } from '../lib/series.js';

// Etiqueta de una serie ya registrada: lado (D / I) y tipo de serie (drop set, rest-pause…)
export default function MarcaSerie({ x }) {
  if (!x?.lado && !x?.tecnica) return null;
  return <em className="s-tag">{x.lado || ''}{x.lado && x.tecnica ? ' · ' : ''}{x.tecnica ? tecnicaDe(x.tecnica)?.n || x.tecnica : ''}</em>;
}
