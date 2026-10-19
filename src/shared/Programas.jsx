import React from 'react';
import { Ico, Semana } from '../ui/kit.jsx';
import { mismoNombre } from '../lib/nombres.js';
import { haceCuanto, nDias, totalEjercicios, colorGrupo } from '../lib/util.js';

export const ultimaDe = (sesiones, p) => sesiones.filter((s) => s.programaId === p.id).map((s) => s.fecha).sort().pop();

// Tarjeta de programa: el número de días manda
export function TarjetaPrograma({ p, sesiones = [], onClick, coach }) {
  const n = nDias(p); const u = ultimaDe(sesiones, p);
  return (
    <button className={`prog ${coach && p.visible === false ? 'oculto' : ''}`} onClick={onClick}>
      <div className="prog-n"><b className="num">{n}</b><span>{n === 1 ? 'día' : 'días'}</span></div>
      <div className="prog-c">
        <strong>{p.nombre || `Plan ${n} días`}</strong>
        <span className="prog-dias">{(p.dias || []).map((d) => d.nombre).join(' · ') || 'Sin días'}</span>
        <div className="prog-pie"><Semana n={n} chica /><small>{coach && p.visible === false ? 'Oculto para el asesorado' : u ? `Último ${haceCuanto(u)}` : `${totalEjercicios(p)} ejercicios`}</small></div>
      </div>
      <Ico n="chev" className="chev" s={20} />
    </button>
  );
}

export const ordenarProgramas = (ps) => [...ps].sort((a, b) => nDias(b) - nDias(a) || (a.orden || 0) - (b.orden || 0));
// "5, 3 y 2 días"
export const frecuencias = (ps) => { const f = [...new Set(ps.map(nDias).filter(Boolean))].sort((a, b) => b - a); return f.length ? `${f.length > 1 ? f.slice(0, -1).join(', ') + ' y ' + f[f.length - 1] : f[0]} días` : ''; };

// Tarjeta de un día de entrenamiento
export function TarjetaDia({ d, i, sesiones = [], programaId, onClick }) {
  const u = sesiones.filter((s) => s.programaId === programaId && mismoNombre(s.dia, d.nombre)).map((s) => s.fecha).sort().pop();
  const grupos = [...new Set((d.ejercicios || []).map((e) => e.grupo))];
  return (
    <button className={`dia-card ${u ? 'hecho' : ''}`} onClick={onClick}>
      <span className="n num">{i + 1}</span>
      <div className="item-t"><strong>{d.nombre}</strong><span>{(d.ejercicios || []).length} ejercicios{u ? ` · hecho ${haceCuanto(u)}` : ''}</span>
        <div className="colores">{grupos.slice(0, 8).map((g) => <i key={g} style={{ background: colorGrupo(g) }} />)}</div></div>
      <Ico n="chev" className="chev" s={20} />
    </button>
  );
}
