// Silueta (frente y espalda) con los músculos trabajados en la sesión, pintados según el volumen.
import React, { useMemo, useState } from 'react';
import { CUERPOS } from '../data/cuerpo.js';
import { cargaMuscular, colorNivel, NIVELES } from '../lib/musculos.js';
import { colorGrupo, fmt } from '../lib/util.js';

const NEUTRO = new Set(['head', 'hair', 'hands', 'feet', 'ankles', 'knees']);
const leerSexo = () => { try { return localStorage.getItem('bt:sexo') || ''; } catch { return ''; } };
const guardarSexo = (v) => { try { localStorage.setItem('bt:sexo', v); } catch {} };
export const sexoNormal = (s) => (/^f/i.test(String(s || '')) ? 'F' : /^m/i.test(String(s || '')) ? 'M' : '');

function Vista({ v, carga, titulo }) {
  return (
    <figure className="mapa-v">
      <svg viewBox={v.viewBox} role="img" aria-label={titulo}>
        <path d={v.contorno} className="mapa-cont" />
        {v.partes.map((p) => { const c = colorNivel(carga[p.slug] || 0);
          return p.d.map((d, i) => <path key={p.slug + i} d={d} data-slug={p.slug} data-nivel={c ? 1 : 0} fill={c || (NEUTRO.has(p.slug) ? '#262626' : '#343434')} />); })}
      </svg>
      <figcaption>{titulo}</figcaption>
    </figure>
  );
}

export default function MapaMuscular({ series, sexo, conLista = true }) {
  const [s, setS] = useState(() => sexoNormal(sexo) || sexoNormal(leerSexo()) || 'M');
  const { vistas, grupos } = useMemo(() => cargaMuscular(series), [series]);
  const cuerpo = CUERPOS[s === 'F' ? 'femenino' : 'masculino'];
  const elegir = (v) => { setS(v); guardarSexo(v); };
  if (!grupos.length) return null;
  return (
    <section className="mapa" aria-label="Músculos trabajados">
      <div className="mapa-cab"><h2>Músculos trabajados</h2>
        <div className="mapa-sexo" role="group" aria-label="Silueta">
          <button className={s === 'F' ? 'on' : ''} onClick={() => elegir('F')} aria-pressed={s === 'F'}>Mujer</button>
          <button className={s === 'M' ? 'on' : ''} onClick={() => elegir('M')} aria-pressed={s === 'M'}>Hombre</button></div></div>
      <div className="mapa-cuerpos"><Vista v={cuerpo.frente} carga={vistas.frente} titulo="Frente" /><Vista v={cuerpo.espalda} carga={vistas.espalda} titulo="Espalda" /></div>
      <div className="mapa-ley">{NIVELES.map((n) => <span key={n.n}><i style={{ background: n.c }} />{n.n}<small>{n.r}</small></span>)}</div>
      {conLista && <div className="mapa-lista">{grupos.map((g) => <div key={g.grupo}><i style={{ background: colorGrupo(g.grupo) }} /><span>{g.grupo}</span><b className="num">{fmt(g.series, 1)}</b><small>{g.series === 1 ? 'serie' : 'series'}{g.kg > 0 ? ` · ${fmt(g.kg)} kg` : ''}</small></div>)}</div>}
    </section>
  );
}
