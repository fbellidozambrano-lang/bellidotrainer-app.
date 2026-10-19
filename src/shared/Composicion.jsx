import React from 'react';
import { fmt, fLarga, fCorta } from '../lib/util.js';
import { CAMPOS } from '../data/informe.js';

// Resumen del último control antropométrico, con el cambio frente al anterior
// (o frente al primer control del informe si es el único que hay en la app).
export default function Composicion({ controles = [], compacto }) {
  const [c, prev] = [...controles].sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
  if (!c) return null;
  const d = c.datos || {}; const ref = prev ? prev.datos || {} : d.inicial || {}; const refF = prev ? prev.fecha : d.inicio;
  const campos = CAMPOS.filter((x) => d[x.k] != null && d[x.k] !== '').slice(0, compacto ? 6 : 10);
  return (
    <div className="compo">
      <div className="compo-g">{campos.map((x) => { const v = Number(d[x.k]); const r = ref[x.k] != null ? Number(ref[x.k]) : null; const dif = r != null ? Math.round((v - r) * 10) / 10 : null;
        const bueno = dif == null || dif === 0 ? '' : (x.baja && dif < 0) || (x.sube && dif > 0) ? 'bien' : (x.baja && dif > 0) || (x.sube && dif < 0) ? 'mal' : '';
        return <div key={x.k} className="compo-i"><span>{x.l}</span><b className="num">{fmt(v, x.d)}<small>{x.u === '%' ? '%' : x.u ? ` ${x.u}` : ''}</small></b>
          {dif != null && <em className={bueno}>{dif > 0 ? '+' : ''}{fmt(dif, 1)}{x.u === '%' ? ' pts' : x.u && x.u !== 'nivel' && x.u !== 'años' ? ` ${x.u}` : ''}</em>}</div>; })}</div>
      <p className="compo-pie">Control del {fLarga(c.fecha)}{refF ? ` · cambios frente al ${prev ? 'control anterior' : 'primer control'} (${fCorta(refF)})` : ''}</p>
    </div>
  );
}
