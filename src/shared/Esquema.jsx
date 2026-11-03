import React from 'react';
import { ESQUEMAS, PASOS, textoEsquema } from '../lib/esquemas.js';

// Elegir cómo se hacen las series: tipo de esquema, cuánto cambia cada serie y series de aproximación
export default function ConfigEsquema({ cfg, onChange, rpe = 8, compacto = false }) {
  const f = (k, v) => onChange({ ...cfg, [k]: v });
  const conPaso = ['rampa', 'inversa', 'piramide'].includes(cfg.k) || (cfg.k === 'backoff' && cfg.modo !== 'reps');
  return (
    <div className="esq-cfg">
      <div className={`tipos ${compacto ? 'compacto' : ''}`}>
        {ESQUEMAS.map((t) => <button key={t.k} type="button" className={`tipo ${cfg.k === t.k ? 'on' : ''}`} onClick={() => onChange({ ...cfg, k: t.k, paso: t.k === cfg.k ? cfg.paso : 10 })} aria-pressed={cfg.k === t.k}>
          <b>{t.c}</b><div><strong>{t.n}</strong>{(!compacto || cfg.k === t.k) && <span>{t.d}</span>}</div></button>)}
      </div>
      <div className="tipo-cfg">
        {cfg.k === 'backoff' && <div><span>En los back off</span><div className="seg"><button type="button" className={cfg.modo !== 'reps' ? 'on' : ''} onClick={() => f('modo', 'peso')}>Bajo el peso</button><button type="button" className={cfg.modo === 'reps' ? 'on' : ''} onClick={() => f('modo', 'reps')}>Bajo las reps</button></div></div>}
        {conPaso && <div><span>{cfg.k === 'backoff' ? 'Cuánto baja el peso en cada serie' : 'Cuánto cambia el peso entre series'}</span><div className="chips">{PASOS.map((v) => <button type="button" key={v} className={`chip ${cfg.paso === v ? 'on' : ''}`} onClick={() => f('paso', v)}>{String(v).replace('.', ',')} %</button>)}</div></div>}
        {cfg.k === 'backoff' && cfg.modo === 'reps' && <div><span>Reps menos en cada serie</span><div className="chips">{[1, 2, 3].map((v) => <button type="button" key={v} className={`chip ${cfg.dReps === v ? 'on' : ''}`} onClick={() => f('dReps', v)}>{v}</button>)}</div></div>}
        <div><span>Series de aproximación antes de empezar</span><div className="chips">{[0, 1, 2, 3].map((v) => <button type="button" key={v} className={`chip ${cfg.aprox === v ? 'on' : ''}`} onClick={() => f('aprox', v)}>{v === 0 ? 'Ninguna' : v}</button>)}</div></div>
        <p className="ayuda" style={{ margin: 0 }}>{textoEsquema(cfg, rpe)}.{cfg.aprox ? ' La aproximación sube de a poco hasta tu serie principal y no cuenta para el progreso.' : ''}</p>
      </div>
    </div>
  );
}
