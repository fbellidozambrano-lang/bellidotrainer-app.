import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Barra, Ico, ir, useAviso } from '../ui/kit.jsx';
import { colorGrupo, esTiempo, fmt, fCorta, nDias, primerNombre, records, seriesPrevias, nSeg, cargaNumero, haceCuanto, mejorSerie } from '../lib/util.js';
import { ordenarProgramas } from '../shared/Programas.jsx';
import { mismoNombre } from '../lib/nombres.js';

const r05 = (v) => Math.round(v * 2) / 2;
// repeticiones posibles a un % del 1RM (Epley al revés)
export const repsAl = (pct) => (pct >= 100 ? 1 : Math.max(1, Math.round(30 * (100 / pct - 1))));

// Escala de intensidad sobre el 1RM estimado
function Escala({ e1, onUsar }) {
  const [pct, setPct] = useState(75);
  const kg = r05((e1 * pct) / 100);
  return (
    <div className="escala">
      <div className="escala-top"><b className="num">{pct}%</b><span>= <b className="num">{fmt(kg, 1)} kg</b> · ≈ {repsAl(pct)} {repsAl(pct) === 1 ? 'rep' : 'reps'} máx.</span>
        <button className="btn chico oro" onClick={() => onUsar(kg)}>Usar</button></div>
      <input type="range" min={1} max={100} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Porcentaje del 1RM" />
      <div className="escala-t">{[95, 90, 85, 80, 75, 70, 65, 60, 55, 50].map((p) => <button key={p} className={p === pct ? 'on' : ''} onClick={() => setPct(p)}><b>{p}%</b><span className="num">{fmt(r05((e1 * p) / 100), 1)}</span><i>{repsAl(p)}r</i></button>)}</div>
    </div>
  );
}

function TarjetaPreparar({ e, historial, cambiar }) {
  const T = esTiempo(e); const prev = seriesPrevias(historial, e.ejercicio); const rec = records(historial, e.ejercicio); const mejor = T ? null : mejorSerie(historial, e.ejercicio);
  const [escala, setEscala] = useState(false);
  const f = (k, v) => cambiar({ ...e, [k]: v });
  const n = (k, v) => cambiar({ ...e, [k]: v === '' ? '' : Math.max(0, parseInt(v, 10) || 0) });
  const cargaHoy = cargaNumero(e.pesoSugerido);
  return (
    <article className="prep" style={{ borderLeft: `4px solid ${colorGrupo(e.grupo)}` }}>
      <h3>{e.ejercicio}<small>{e.grupo}</small></h3>
      {prev ? <div className="prep-ult"><span>Última sesión · {fCorta(prev.fecha)}</span>
        <div className="previa">{prev.series.map((x, i) => <span key={i}><b>{x.seg ? `${x.seg}s` : fmt(x.peso, 1)}</b>{!x.seg && <> × {x.reps}</>}{x.rpe ? <i> @{fmt(x.rpe, 1)}</i> : null}</span>)}</div></div>
        : <p className="prep-ult"><span>Sin registros todavía</span></p>}
      {prev && !T && <div className="prep-kpi">
        {mejor && <div><span>Mejor serie</span><b className="num">{fmt(mejor.peso, 1)}<small> kg</small> × {mejor.reps}</b></div>}
        <div><span>Mayor peso</span><b className="num">{fmt(rec.maxPeso, 1)}<small> kg</small></b></div>
        <div><span>Mayor volumen</span><b className="num">{fmt(rec.maxVol)}<small> kg</small></b></div>
        <div><span>1RM estimado</span><b className="num">{fmt(rec.maxE1, 1)}<small> kg</small></b></div>
      </div>}
      {prev && T && <div className="prep-kpi"><div><span>Mejor tiempo</span><b className="num">{fmt(rec.maxSeg)}<small> s</small></b></div></div>}
      <div className="prep-campos">
        <label><span>Series</span><input className="in num" inputMode="numeric" value={e.series} onChange={(x) => n('series', x.target.value)} /></label>
        {T ? <label><span>Segundos</span><input className="in num" inputMode="numeric" value={e.segundos} onChange={(x) => n('segundos', x.target.value)} /></label>
          : <><label><span>Reps mín.</span><input className="in num" inputMode="numeric" value={e.repMin} onChange={(x) => n('repMin', x.target.value)} /></label>
            <label><span>Reps máx.</span><input className="in num" inputMode="numeric" value={e.repMax} onChange={(x) => n('repMax', x.target.value)} /></label></>}
        <label><span>Descanso s</span><input className="in num" inputMode="numeric" value={e.descanso} onChange={(x) => n('descanso', x.target.value)} /></label>
        <label><span>RPE</span><input className="in num" inputMode="decimal" value={e.rpe} onChange={(x) => f('rpe', x.target.value)} /></label>
      </div>
      <label className="prep-carga"><span>Carga sugerida</span><input className="in" value={e.pesoSugerido} onChange={(x) => f('pesoSugerido', x.target.value)} placeholder={rec.maxPeso ? `Ej: ${fmt(rec.maxPeso, 1)} kg` : '22,5 kg · banda verde'} />
        {rec.maxE1 > 0 && cargaHoy > 0 && <em>{Math.round((cargaHoy / rec.maxE1) * 100)}% de su 1RM</em>}</label>
      {!T && rec.maxE1 > 0 && <>
        <button className="btn chico fant" onClick={() => setEscala(!escala)}><Ico n={escala ? 'arriba' : 'abajo'} s={16} />Escala de intensidad (1–100 % del 1RM)</button>
        {escala && <Escala e1={rec.maxE1} onUsar={(kg) => f('pesoSugerido', `${String(kg).replace('.', ',')} kg`)} />}
      </>}
    </article>
  );
}

// Antes de dar el código: el coach deja lista la sesión que va a abrir el asesorado
export default function Preparar({ a, programas, sesiones, acc, store }) {
  const avisar = useAviso(); const nom = primerNombre(a.nombre);
  const ps = ordenarProgramas(programas.filter((p) => p.visible !== false && nDias(p)));
  const sug = useMemo(() => { // programa y día que probablemente toca
    const u = [...sesiones].sort((x, y) => (x.fecha < y.fecha ? 1 : -1)).find((s) => ps.some((p) => p.id === s.programaId));
    const p = (u && ps.find((x) => x.id === u.programaId)) || ps[0]; if (!p) return {};
    const i = u ? p.dias.findIndex((d) => mismoNombre(d.nombre, u.dia)) : -1;
    return { p: p.id, d: p.dias[(i + 1) % p.dias.length]?.id };
  }, []); // eslint-disable-line
  const [pid, setPid] = useState(sug.p); const [did, setDid] = useState(sug.d);
  const [estado, setEstado] = useState('ok'); const [ocupado, setOcupado] = useState(false);
  const pend = useRef(null); const tm = useRef();
  const p = programas.find((x) => x.id === pid); const dia = p?.dias.find((d) => d.id === did) || p?.dias[0];
  const guardarYa = async () => { const x = pend.current; if (!x) return; pend.current = null; try { await acc.guardarPrograma(x); setEstado(pend.current ? 'pend' : 'ok'); } catch { setEstado('err'); } };
  useEffect(() => () => { clearTimeout(tm.current); guardarYa(); }, []); // eslint-disable-line
  const cambiarEj = (e) => {
    const base = pend.current || p;
    const n = { ...base, dias: base.dias.map((d) => (d.id !== dia.id ? d : { ...d, ejercicios: d.ejercicios.map((x) => (x.id === e.id ? e : x)) })) };
    pend.current = n; acc.ponerPrograma(n); setEstado('pend'); clearTimeout(tm.current); tm.current = setTimeout(guardarYa, 800);
  };
  async function darCodigo() {
    setOcupado(true);
    try { clearTimeout(tm.current); await guardarYa(); await store.nuevoCodigo(a.id); avisar('Sesión lista y código creado: mándaselo'); ir('a', a.id); }
    catch (e) { avisar(e.message || 'No se pudo crear el código', 'error'); }
    setOcupado(false);
  }
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => { guardarYa(); ir('a', a.id); }, texto: nom }} titulo="Preparar sesión"
        derecha={<span className={`guardado ${estado === 'pend' ? 'pend' : estado === 'err' ? 'err' : ''}`}><i />{estado === 'pend' ? 'Guardando' : estado === 'err' ? 'Sin guardar' : 'Guardado'}</span>} />
      <p className="sub" style={{ margin: '12px 0 14px' }}>Ajusta series, reps, descanso, RPE y carga con lo que hizo la última vez. {nom} lo ve así al abrir su rutina con el código.</p>
      {!ps.length ? <div className="vacio"><b>{nom} no tiene programas visibles</b>Arma su rutina primero.</div> : <>
        {ps.length > 1 && <div className="chips scroll-x" style={{ marginBottom: 10 }}>{ps.map((x) => <button key={x.id} className={`chip ${x.id === pid ? 'on' : ''}`} onClick={() => { guardarYa(); setPid(x.id); setDid(x.dias[0]?.id); }}>{x.nombre}</button>)}</div>}
        <nav className="tabs-dias" aria-label="Días">{p.dias.map((d) => { const u = sesiones.filter((s) => s.programaId === p.id && mismoNombre(s.dia, d.nombre)).map((s) => s.fecha).sort().pop();
          return <button key={d.id} className={`tab-dia ${d.id === dia?.id ? 'on' : ''}`} onClick={() => setDid(d.id)}>{d.nombre}{u ? <span style={{ opacity: .55 }}> · {haceCuanto(u)}</span> : null}{d.id === sug.d && p.id === sug.p ? <span className="toca">toca</span> : null}</button>; })}</nav>
        {dia && (dia.ejercicios.length ? dia.ejercicios.map((e) => <TarjetaPreparar key={e.id} e={e} historial={sesiones} cambiar={cambiarEj} />) : <div className="vacio">Este día no tiene ejercicios.</div>)}
      </>}
      <div className="flotante"><button className="btn oro xl full" disabled={ocupado} onClick={darCodigo}><Ico n="llave" s={20} />{ocupado ? 'Creando…' : 'Guardar y dar código'}</button></div>
    </div>
  );
}
