import React, { useEffect, useState } from 'react';
import { Barra, Ico, ir, Placa } from '../ui/kit.jsx';
import { fmt, primerNombre, nSeg } from '../lib/util.js';

const H4 = 4 * 36e5;
const hora = (t) => new Date(t).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });
const hace = (t) => { const s = Math.max(0, Math.round((Date.now() - Date.parse(t)) / 1000)); return s < 60 ? 'hace segundos' : s < 3600 ? `hace ${Math.round(s / 60)} min` : `hace ${Math.floor(s / 3600)} h`; };
export const activos = (vivo) => vivo.filter((v) => v.abierto && !v.usado && Date.now() - Date.parse(v.abierto) < H4);
const deHoy = (t) => t && new Date(t).toDateString() === new Date().toDateString();

function Tarjeta({ v, a, abierta, onToggle }) {
  const pr = v.progreso; const pct = pr?.total ? Math.round((pr.hechas / pr.total) * 100) : 0;
  const min = Math.round((Date.now() - Date.parse(v.abierto)) / 60000);
  const quieto = v.progresoAt && Date.now() - Date.parse(v.progresoAt) > 20 * 60000;
  return (
    <div className="vivo">
      <button className="vivo-cab" onClick={onToggle}>
        <Placa nombre={a?.nombre || '?'} oro />
        <div className="item-t"><strong>{a?.nombre || 'Asesorado'}</strong>
          <span>{pr ? `${pr.dia}${pr.programa ? ` · ${pr.programa}` : ''}` : 'Abrió la rutina, todavía no registra series'}</span></div>
        <div className="vivo-dato"><b className="num">{pr ? `${pr.hechas}/${pr.total}` : '—'}</b><span>series</span></div>
      </button>
      <div className="vivo-barra"><i style={{ width: `${pct}%` }} /></div>
      <p className="vivo-pie"><span className={`punto-vivo ${quieto ? 'quieto' : ''}`} />Empezó {hora(v.abierto)} · {min} min{v.progresoAt ? ` · actualizado ${hace(v.progresoAt)}` : ''}</p>
      {abierta && pr && <div className="vivo-ejs">{pr.ejercicios.map((e, i) => { const hechas = e.series.filter((x) => x.hecha).length;
        return <div key={i} className={`vivo-ej ${hechas && hechas === e.series.length ? 'listo' : ''}`}>
          <div className="vivo-ej-t"><strong>{e.ejercicio}</strong><span>{e.objetivo}{e.carga ? ` · ${e.carga}` : ''} · {hechas}/{e.series.length}</span></div>
          <div className="previa">{e.series.map((x, k) => <span key={k} className={x.hecha ? 'hecha' : 'pend'}><b>{e.tipo === 'tiempo' ? `${fmt(nSeg(x.seg))}s` : fmt(nSeg(x.peso), 1)}</b>{e.tipo !== 'tiempo' && <> × {x.reps || '—'}</>}{x.rpe ? <i> @{x.rpe}</i> : null}</span>)}</div>
          {e.nota && <p className="guia">“{e.nota}”</p>}
        </div>; })}</div>}
      {abierta && <button className="btn chico fant" onClick={() => ir('a', v.asesoradoId)}>Ver ficha de {primerNombre(a?.nombre)}<Ico n="chev" s={16} /></button>}
    </div>
  );
}

export default function EnVivo({ datos, vivo, recargar }) {
  const [abiertas, setAbiertas] = useState({}); const [, tick] = useState(0);
  useEffect(() => { recargar(); const i = setInterval(() => { recargar(); tick((x) => x + 1); }, 15000); return () => clearInterval(i); }, []); // eslint-disable-line
  const ases = (id) => datos.asesorados.find((x) => x.id === id);
  const ahora = activos(vivo);
  const terminaron = vivo.filter((v) => v.usado && deHoy(v.usado));
  const hoySes = datos.sesiones.filter((s) => s.origen === 'asesorado');
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 16px' }}><h1 className="gigante">Entrenando ahora</h1>
        <p className="sub">Lo que van registrando tus asesorados con la rutina abierta. Se actualiza solo.</p></section>
      {ahora.length ? ahora.map((v) => <Tarjeta key={v.id} v={v} a={ases(v.asesoradoId)} abierta={abiertas[v.id] ?? ahora.length === 1} onToggle={() => setAbiertas((x) => ({ ...x, [v.id]: !(x[v.id] ?? ahora.length === 1) }))} />)
        : <div className="vacio"><b>Nadie entrenando en este momento</b>Cuando un asesorado abra su rutina con el código, aparece aquí con cada serie que registre.</div>}
      {terminaron.length > 0 && <>
        <div className="sec"><h2>Terminaron hoy</h2><span>{terminaron.length}</span></div>
        <div className="lista">{terminaron.map((v) => { const a = ases(v.asesoradoId); const s = hoySes.filter((x) => x.asesoradoId === v.asesoradoId).sort((x, y) => String(y.creado || '').localeCompare(String(x.creado || '')))[0];
          return <button key={v.id} className="item" onClick={() => ir('a', v.asesoradoId, 'metricas')}><Placa nombre={a?.nombre || '?'} />
            <div className="item-t"><strong>{a?.nombre}</strong><span>{v.progreso?.dia || s?.dia || 'Entreno'} · envió a las {hora(v.usado)}{s ? ` · ${(s.series || []).length} series` : ''}</span></div><Ico n="chev" className="chev" s={18} /></button>; })}</div>
      </>}
    </div>
  );
}
