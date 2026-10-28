import React, { useMemo, useState } from 'react';
import { Hoja, Ico, Confirmar } from '../ui/kit.jsx';
import { merito } from '../lib/merito.js';
import { revisarSerie } from '../lib/validar.js';
import { Campo } from '../ui/kit.jsx';
import MarcaSerie from './MarcaSerie.jsx';
import { colorGrupo, ejerciciosDe, fCorta, fLarga, fmt, hoy, lunesDe, aFecha, fechaLocal, nSeg, progresion, records, semanasSeguidas, sesionesSemana, seriesPorGrupo, volumen, seriesDe, esTiempo } from '../lib/util.js';

// ---------- gráficas propias (SVG, livianas) ----------
function Linea({ datos, series }) {
  const W = 340, H = 170, pl = 34, pr = 10, pt = 14, pb = 24;
  const vals = datos.flatMap((d) => series.map((s) => d[s.k])).filter((v) => v > 0);
  if (datos.length < 2 || !vals.length) return <p className="muted" style={{ fontSize: 14, padding: '18px 0' }}>Hacen falta al menos dos sesiones con este ejercicio para ver la línea.</p>;
  let lo = Math.min(...vals), hi = Math.max(...vals); const pad = (hi - lo) * 0.15 || hi * 0.1 || 1; lo = Math.max(0, lo - pad); hi += pad;
  const x = (i) => pl + (i * (W - pl - pr)) / (datos.length - 1); const y = (v) => pt + (1 - (v - lo) / (hi - lo)) * (H - pt - pb);
  return (
    <svg className="graf" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Progresión">
      {[0, 0.5, 1].map((t) => { const v = lo + (hi - lo) * t; return <g key={t}><line x1={pl} x2={W - pr} y1={y(v)} y2={y(v)} stroke="#262626" /><text x={pl - 6} y={y(v) + 4} textAnchor="end">{fmt(v)}</text></g>; })}
      <text x={pl} y={H - 6}>{fCorta(datos[0].fecha)}</text><text x={W - pr} y={H - 6} textAnchor="end">{fCorta(datos[datos.length - 1].fecha)}</text>
      {series.map((s) => { const pts = datos.map((d, i) => [x(i), d[s.k]]).filter((p) => p[1] > 0); const path = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${y(p[1]).toFixed(1)}`).join(' ');
        const u = pts[pts.length - 1];
        return <g key={s.k}><path d={path} fill="none" stroke={s.c} strokeWidth={s.w || 2.5} strokeDasharray={s.dash} strokeLinejoin="round" strokeLinecap="round" />
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={y(p[1])} r={i === pts.length - 1 ? 4.5 : 2.5} fill={s.c} />)}
          {u && <text x={u[0]} y={y(u[1]) - 10} textAnchor="end" style={{ fill: s.c, fontWeight: 700, fontSize: 12 }}>{fmt(u[1], 1)}</text>}</g>; })}
    </svg>
  );
}

function Constancia({ sesiones, meta }) {
  const N = 12, l0 = aFecha(lunesDe(hoy())); const semanas = [];
  for (let i = N - 1; i >= 0; i--) { const d = new Date(l0); d.setDate(d.getDate() - 7 * i); const l = fechaLocal(d); semanas.push({ l, n: new Set(sesiones.filter((s) => lunesDe(s.fecha) === l).map((s) => s.fecha + s.dia)).size }); }
  const max = Math.max(meta || 0, ...semanas.map((s) => s.n), 3); const W = 340, H = 120, bw = (W - 8) / N;
  return (
    <svg className="graf" viewBox={`0 0 ${W} ${H + 18}`} role="img" aria-label="Entrenamientos por semana">
      {meta > 0 && <><line x1="0" x2={W} y1={H - (meta / max) * H} y2={H - (meta / max) * H} stroke="#5c4700" strokeDasharray="4 4" /><text x={W} y={H - (meta / max) * H - 5} textAnchor="end" style={{ fill: '#B98F00' }}>meta {meta}</text></>}
      {semanas.map((s, i) => { const h = (s.n / max) * H; return <g key={s.l}><rect x={i * bw + 4} y={H - Math.max(h, 3)} width={bw - 8} height={Math.max(h, 3)} rx="4" fill={s.n ? (meta && s.n >= meta ? '#FFC400' : '#8a6a00') : '#262626'} />
        {s.n > 0 && <text x={i * bw + bw / 2} y={H - h - 5} textAnchor="middle" style={{ fill: '#BAB7B0', fontWeight: 600 }}>{s.n}</text>}</g>; })}
      <text x="4" y={H + 15}>{fCorta(semanas[0].l)}</text><text x={W - 4} y={H + 15} textAnchor="end">esta semana</text>
    </svg>
  );
}

// Editar a mano una sesión ya guardada (fecha, series, observaciones)
function EditarSesion({ s, historial = [], onGuardar, onCerrar }) {
  const [fecha, setFecha] = useState(s.fecha); const [min, setMin] = useState(s.minutos ?? '');
  const [grupos, setGrupos] = useState(() => { const ejs = [...new Set((s.series || []).map((x) => x.ejercicio))];
    return ejs.map((e) => { const ss = seriesDe(s, e); return { ejercicio: e, grupo: ss[0]?.grupo || '', tiempo: ss.some((x) => nSeg(x.seg) > 0), nota: (s.notas || {})[e] || '',
      filas: ss.map((x) => ({ peso: x.peso ? String(x.peso).replace('.', ',') : '', reps: x.reps ? String(x.reps) : '', seg: x.seg ? String(x.seg) : '', rpe: x.rpe ? String(x.rpe).replace('.', ',') : '', lado: x.lado || '', tecnica: x.tecnica || '' })) }; }); });
  const [ocupado, setOcupado] = useState(false);
  const otras = historial.filter((x) => x.id !== s.id);
  const cambiar = (gi, fi, k, v) => setGrupos((g) => g.map((x, i) => (i !== gi ? x : { ...x, filas: x.filas.map((f, j) => (j === fi ? { ...f, [k]: v } : f)) })));
  // la derecha y la izquierda de una misma serie comparten número
  const series = []; grupos.forEach((g) => { let n = 0; let ult = null; g.filas.forEach((f) => { const p = nSeg(f.peso), r = Math.round(nSeg(f.reps)), sg = Math.round(nSeg(f.seg)); if (!(p || r || sg)) return;
    const mismaSerie = f.lado === 'I' && ult === 'D'; ult = f.lado || null;
    const o = { ejercicio: g.ejercicio, grupo: g.grupo, serie: mismaSerie ? n : ++n, peso: p, reps: g.tiempo ? 0 : r, rpe: nSeg(f.rpe) || 8 }; if (g.tiempo) o.seg = sg; if (f.lado) o.lado = f.lado; if (f.tecnica) o.tecnica = f.tecnica; series.push(o); }); });
  async function guardar() {
    setOcupado(true); const notas = {}; grupos.forEach((g) => { if (g.nota.trim()) notas[g.ejercicio] = g.nota.trim(); });
    try { await onGuardar({ ...s, fecha, minutos: min === '' ? null : Math.max(1, parseInt(min, 10) || 0), series, notas }); onCerrar(); } catch {} setOcupado(false);
  }
  return (
    <Hoja titulo="Editar sesión" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={ocupado || !series.length || !/^\d{4}-\d{2}-\d{2}$/.test(fecha)} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar cambios'}</button></>}>
      <div className="dos"><Campo l="Fecha"><input className="in" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></Campo>
        <Campo l="Minutos"><input className="in num" inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value)} /></Campo></div>
      {grupos.map((g, gi) => { const rec = records(otras, g.ejercicio); return (
        <div key={g.ejercicio} className="edit-ej">
          <div className="edit-cab"><strong>{g.ejercicio}</strong><button className="ico-b" aria-label={`Quitar ${g.ejercicio}`} onClick={() => setGrupos((x) => x.filter((_, i) => i !== gi))}><Ico n="basura" s={18} /></button></div>
          <div className="edit-h"><span>#</span><span>Peso</span><span>{g.tiempo ? 'Seg' : 'Reps'}</span><span>RPE</span><span /></div>
          {g.filas.map((f, fi) => { const av = revisarSerie({ ...f, hecha: true }, { tipo: g.tiempo ? 'tiempo' : 'reps' }, rec); return (
            <React.Fragment key={fi}>
              <div className={`edit-f ${av ? 'raro' : ''}`}><u>{fi + 1}{f.lado && <small>{f.lado}</small>}</u>
                <input className="cel" inputMode="decimal" value={f.peso} placeholder="kg" onChange={(e) => cambiar(gi, fi, 'peso', e.target.value)} aria-label={`Peso serie ${fi + 1}`} />
                <input className="cel" inputMode="numeric" value={g.tiempo ? f.seg : f.reps} onChange={(e) => cambiar(gi, fi, g.tiempo ? 'seg' : 'reps', e.target.value)} aria-label={`${g.tiempo ? 'Segundos' : 'Reps'} serie ${fi + 1}`} />
                <input className="cel" inputMode="decimal" value={f.rpe} onChange={(e) => cambiar(gi, fi, 'rpe', e.target.value)} aria-label={`RPE serie ${fi + 1}`} />
                <button className="ico-b" aria-label={`Quitar serie ${fi + 1}`} onClick={() => setGrupos((x) => x.map((y, i) => (i !== gi ? y : { ...y, filas: y.filas.filter((_, j) => j !== fi) })))}><Ico n="cerrar" s={16} /></button></div>
              {av && <p className={`set-aviso ${av.nivel}`}>{av.texto}</p>}
            </React.Fragment>); })}
          <button className="btn chico" onClick={() => setGrupos((x) => x.map((y, i) => (i !== gi ? y : { ...y, filas: [...y.filas, { ...(y.filas[y.filas.length - 1] || { peso: '', reps: '', seg: '', rpe: '' }) }] })))}><Ico n="mas" s={14} />Serie</button>
          <input className="in obs" style={{ marginTop: 8 }} value={g.nota} placeholder="Observación" onChange={(e) => setGrupos((x) => x.map((y, i) => (i === gi ? { ...y, nota: e.target.value } : y)))} />
        </div>); })}
      <p className="ayuda" style={{ margin: '12px 0 0' }}>{series.length} series. Las métricas y récords se recalculan con lo que guardes.</p>
    </Hoja>
  );
}

export function DetalleSesion({ s, onCerrar, onBorrar, onGuardar, historial }) {
  const [conf, setConf] = useState(false); const [editar, setEditar] = useState(false);
  const ejs = [...new Set((s.series || []).map((x) => x.ejercicio))];
  return (
    <Hoja titulo={s.dia || 'Sesión'} onCerrar={onCerrar}>
      <p className="muted" style={{ marginTop: -8, marginBottom: 12 }}>{fLarga(s.fecha)}{s.programaNombre ? ` · ${s.programaNombre}` : ''}{s.minutos ? ` · ${s.minutos} min` : ''} · {s.origen === 'casa' ? 'entrenó en casa' : s.origen === 'asesorado' ? 'la registró el asesorado' : s.origen === 'importado' ? 'importada' : 'registrada por el coach'}</p>
      {ejs.map((e) => (
        <div key={e} style={{ padding: '10px 0', borderTop: '1px solid var(--line)' }}>
          <strong style={{ fontWeight: 600 }}>{e}</strong>
          <div className="previa">{seriesDe(s, e).map((x, i) => <span key={i}><b>{x.seg ? `${x.seg}s` : `${fmt(x.peso, 1)}`}</b>{!x.seg && <> kg × {x.reps}</>} {x.rpe ? <i>@{fmt(x.rpe, 1)}</i> : null}<MarcaSerie x={x} /></span>)}</div>
          {(s.notas || {})[e] && <p className="nota-coach" style={{ fontSize: 14 }}><small>Observación</small>{s.notas[e]}</p>}
        </div>
      ))}
      {onGuardar && <button className="btn full" style={{ marginTop: 16 }} onClick={() => setEditar(true)}><Ico n="lapiz" s={18} />Editar registros</button>}
      {onBorrar && <button className="btn peligro full" style={{ marginTop: onGuardar ? 8 : 16 }} onClick={() => setConf(true)}><Ico n="basura" s={18} />Borrar esta sesión</button>}
      {editar && <EditarSesion s={s} historial={historial} onGuardar={onGuardar} onCerrar={() => { setEditar(false); onCerrar(); }} />}
      {conf && <Confirmar titulo="¿Borrar la sesión?" texto="Se quita del historial y de las métricas. No se puede deshacer." si="Borrar" peligro onNo={() => setConf(false)} onSi={() => { setConf(false); onBorrar(s); }} />}
    </Hoja>
  );
}

export default function Metricas({ sesiones, programas = [], nombre, onBorrarSesion, onGuardarSesion }) {
  const ses = useMemo(() => [...sesiones].sort((a, b) => (a.fecha < b.fecha ? 1 : -1)), [sesiones]);
  const ejercicios = useMemo(() => ejerciciosDe(ses), [ses]);
  const [ej, setEj] = useState(''); const sel = ejercicios.includes(ej) ? ej : ejercicios[0] || '';
  const [ver, setVer] = useState(null); const [todas, setTodas] = useState(false);
  if (!ses.length) return <div className="vacio" style={{ marginTop: 18 }}><b>Todavía no hay sesiones</b>{nombre ? `Cuando ${nombre} termine su primer entreno, aquí aparece su progreso.` : 'Cuando termines tu primer entreno, aquí aparece tu progreso.'}</div>;

  const meta = Math.round(programas.reduce((t, p) => t + (p.dias || []).length, 0) / Math.max(1, programas.length)) || 0;
  const semana = new Set(sesionesSemana(ses).map((s) => s.fecha + s.dia)).size;
  const prog = sel ? progresion(ses, sel) : []; const rec = sel ? records(ses, sel) : {};
  const tiempo = prog.length && prog.every((p) => !p.carga && p.seg);
  const grupos = seriesPorGrupo(ses, 4); const tot = {}; grupos.forEach((g) => Object.entries(g.grupos).forEach(([k, v]) => (tot[k] = (tot[k] || 0) + v)));
  const filas = Object.entries(tot).map(([k, v]) => [k, Math.round((v / 4) * 10) / 10]).sort((a, b) => b[1] - a[1]); const maxG = Math.max(...filas.map((f) => f[1]), 1);
  const primera = prog[0], ultima = prog[prog.length - 1]; const subida = primera && ultima && primera.e1rm > 0 ? ((ultima.e1rm / primera.e1rm) - 1) * 100 : 0;

  return (
    <div>
      <div className="kpis" style={{ marginTop: 18 }}>
        <div className="kpi"><b className="num">{ses.length}</b><span>sesiones en total</span></div>
        <div className="kpi"><b className="num">{semana}{meta ? <small style={{ fontSize: 18, color: 'var(--mute)' }}>/{meta}</small> : null}</b><span>esta semana</span></div>
        <div className="kpi"><b className="num">{semanasSeguidas(ses)}</b><span>semanas seguidas</span></div>
      </div>

      <div className="sec"><h2>Constancia</h2><span>últimas 12 semanas</span></div>
      <div className="tarj"><Constancia sesiones={ses} meta={meta} /></div>

      {sel && <>
        <div className="sec"><h2>Progresión</h2></div>
        <div className="tarj">
          <select className="in" value={sel} onChange={(e) => setEj(e.target.value)} aria-label="Ejercicio">{ejercicios.map((x) => <option key={x}>{x}</option>)}</select>
          <div style={{ marginTop: 14 }}>
            {tiempo ? <Linea datos={prog} series={[{ k: 'seg', c: '#4FB6FF' }]} /> : <Linea datos={prog} series={[{ k: 'e1rm', c: '#FFC400' }, { k: 'carga', c: '#8F8C86', w: 2, dash: '4 4' }]} />}
          </div>
          {!tiempo && <div className="ley"><span><i style={{ background: '#FFC400' }} />Fuerza estimada (kg)</span><span><i style={{ background: '#8F8C86' }} />Carga máxima</span></div>}
          {subida > 0.5 && <p className="aviso" style={{ marginTop: 12 }}><Ico n="fuego" s={20} /><span>En {sel} la fuerza estimada subió <b>{fmt(subida, 1)}%</b> desde el primer registro.<small className="merito">{merito('fuerza', sel)}</small></span></p>}
          <div className="kpis">
            <div className="kpi"><b className="num">{tiempo ? `${fmt(rec.maxSeg)}s` : fmt(rec.maxPeso, 1)}</b><span>{tiempo ? 'mejor tiempo' : 'carga máxima (kg)'}</span></div>
            <div className="kpi"><b className="num">{fmt(rec.maxE1, 1)}</b><span>fuerza estimada</span></div>
            <div className="kpi"><b className="num">{prog.length}</b><span>sesiones con él</span></div>
          </div>
        </div>
      </>}

      {filas.length > 0 && <>
        <div className="sec"><h2>Series por músculo</h2><span>promedio semanal, último mes</span></div>
        <div className="tarj"><div className="barras">{filas.map(([g, v]) => <div className="barra-f" key={g}><span>{g}</span><div><i style={{ width: `${(v / maxG) * 100}%`, background: colorGrupo(g) }} /></div><b>{fmt(v, 1)}</b></div>)}</div></div>
      </>}

      <div className="sec"><h2>Historial</h2><span>{ses.length} sesiones</span></div>
      <div className="lista">
        {(todas ? ses : ses.slice(0, 8)).map((s) => (
          <button key={s.id} className="item" onClick={() => setVer(s)}>
            <div className="item-t"><strong>{s.dia || 'Entrenamiento'}</strong><span>{fLarga(s.fecha)} · {new Set((s.series || []).map((x) => x.ejercicio)).size} ejercicios · {(s.series || []).length} series</span></div>
            <div className="item-d"><span className="num" style={{ fontSize: 18, color: 'var(--chalk)' }}>{fmt(volumen(s))}</span><br />kg</div>
          </button>
        ))}
      </div>
      {ses.length > 8 && !todas && <button className="btn fant full" onClick={() => setTodas(true)}>Ver las {ses.length} sesiones</button>}
      {ver && <DetalleSesion s={ver} historial={ses} onCerrar={() => setVer(null)} onGuardar={onGuardarSesion} onBorrar={onBorrarSesion ? (s) => { setVer(null); onBorrarSesion(s); } : null} />}
    </div>
  );
}
