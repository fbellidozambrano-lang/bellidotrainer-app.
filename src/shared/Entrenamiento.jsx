import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Barra, Hoja, Ico, useAviso } from '../ui/kit.jsx';
import { CUES, ESCALA_RPE, MOTIVACION } from '../data/constants.js';
import { textoSugerencia, cargaNumero, colorGrupo, esTiempo, fCorta, fmt, hoy, nSeg, records, semanasSeguidas, volumen, seriesPrevias, uuid, ytId, mejorSerie, repsAlPct, PCTS, r05 } from '../lib/util.js';
import brazo from '../assets/brazo.png';
import { analogia } from '../lib/analogias.js';
import { revisarSerie } from '../lib/validar.js';
import { merito } from '../lib/merito.js';
import { mismoNombre } from '../lib/nombres.js';
import { resumenCompartir } from '../lib/compartir.js';
import Compartir from './Compartir.jsx';
// la silueta pesa ~130 kB: se carga recién al terminar el entreno
const MapaMuscular = React.lazy(() => import('./MapaMuscular.jsx'));
import MarcaSerie from './MarcaSerie.jsx';
import { TECNICAS, tecnicaDe, esUnilateral, filasUnilaterales, filasBilaterales, numeroFila, LADOS, balanceLados } from '../lib/series.js';
import { ajusteSugerido, nuevasSubs, pesosSubs, primerNumero, progresoEjercicio, progresoSerie, subDe, subsParaGuardar, textoPct, volSerie } from '../lib/progreso.js';

// ---------- conversor kg ⇄ lb ----------
const LB = 2.20462;
const redondo = (v, d = 1) => { const n = Math.round(v * 10 ** d) / 10 ** d; return Number.isFinite(n) ? String(n).replace('.', ',') : ''; };
export function Conversor({ onCerrar }) {
  const [kg, setKg] = useState(''); const [lb, setLb] = useState('');
  const pon = (k, v) => { const n = parseFloat(String(v).replace(',', '.')); if (k === 'kg') { setKg(v); setLb(Number.isFinite(n) ? redondo(n * LB) : ''); } else { setLb(v); setKg(Number.isFinite(n) ? redondo(n / LB) : ''); } };
  return (
    <Hoja titulo="Kilos ⇄ libras" onCerrar={onCerrar}>
      <div className="conv">
        <label><span>Kilos</span><input className="in num" inputMode="decimal" autoFocus value={kg} placeholder="0" onChange={(e) => pon('kg', e.target.value)} /><b>kg</b></label>
        <Ico n="refrescar" s={22} className="conv-ico" />
        <label><span>Libras</span><input className="in num" inputMode="decimal" value={lb} placeholder="0" onChange={(e) => pon('lb', e.target.value)} /><b>lb</b></label>
      </div>
      <p className="etq" style={{ margin: '16px 0 8px' }}>Mancuernas y discos comunes</p>
      <div className="conv-t">{[5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70].map((l) => <button key={l} onClick={() => pon('lb', String(l))}><b className="num">{l} lb</b><span>{redondo(l / LB)} kg</span></button>)}</div>
    </Hoja>
  );
}

// ilustraciones de las analogías (Twemoji, CC-BY 4.0)
const IMGS = import.meta.glob('../assets/analogias/*.svg', { eager: true, query: '?url', import: 'default' });
const imgDe = (slug) => IMGS[`../assets/analogias/${slug}.svg`];
function Analogia({ a, kg }) {
  const src = imgDe(a.img); const total = a.n + (a.parcial ? 1 : 0); const tam = total <= 1 ? 112 : total === 2 ? 94 : total === 3 ? 80 : total === 4 ? 68 : 58;
  return (
    <div className="analogia">
      <small>Hoy moviste {fmt(kg)} kg</small>
      {src && <div className="analogia-img" aria-hidden="true">{Array.from({ length: a.n }, (_, i) => <img key={i} src={src} alt="" style={{ width: tam, height: tam, animationDelay: `${i * 90}ms` }} />)}
        {a.parcial && <span className="parcial" style={{ width: tam / 2, height: tam }}><img src={src} alt="" style={{ width: tam, height: tam, animationDelay: `${a.n * 90}ms` }} /></span>}</div>}
      <p>{a.texto[0].toUpperCase() + a.texto.slice(1)}.</p>
    </div>
  );
}

// Tus marcas en este ejercicio: mejor serie, mayor peso, 1RM estimado y % de intensidad
function Marcas({ historial, ej }) {
  const T = esTiempo(ej); const rec = records(historial, ej.ejercicio); const mejor = T ? null : mejorSerie(historial, ej.ejercicio);
  if (T ? !rec.maxSeg : !mejor) return null;
  if (T) return <div className="marcas"><div><span>Mejor tiempo</span><b className="num">{fmt(rec.maxSeg)}<small> s</small></b></div></div>;
  return (
    <>
      <div className="marcas">
        <div><span>Mejor serie</span><b className="num">{fmt(mejor.peso, 1)}<small> kg</small> × {mejor.reps}</b><em>{fCorta(mejor.fecha)}</em></div>
        <div><span>Mayor peso</span><b className="num">{fmt(rec.maxPeso, 1)}<small> kg</small></b></div>
        <div><span>1RM estimado</span><b className="num">{fmt(rec.maxE1, 1)}<small> kg</small></b></div>
      </div>
      <details className="intens"><summary>Intensidades según tu 1RM <Ico n="abajo" s={16} /></summary>
        <div className="intens-t">{PCTS.map((p) => <div key={p}><b>{p}%</b><span className="num">{fmt(r05((rec.maxE1 * p) / 100), 1)}<small> kg</small></span><i>{repsAlPct(p)} {repsAlPct(p) === 1 ? 'rep' : 'reps'}</i></div>)}</div>
        <p className="ayuda" style={{ margin: '8px 0 0' }}>1RM estimado: el peso que podrías levantar una sola vez, calculado de tu mejor serie.</p>
      </details>
    </>
  );
}

// Video de YouTube vertical (formato shorts 9:16), visible de una vez
function Video({ id, titulo, onOcultar }) {
  return (
    <div className="video-v">
      <div className="video-9x16"><iframe src={`https://www.youtube-nocookie.com/embed/${id}?playsinline=1&rel=0&modestbranding=1`} title={titulo} loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>
      <button className="btn chico fant" onClick={onOcultar}><Ico n="cerrar" s={14} />Ocultar video</button>
    </div>
  );
}

// ---------- sonido y vibración del descanso ----------
let AC = null;
const audio = () => { try { AC = AC || new (window.AudioContext || window.webkitAudioContext)(); if (AC.state === 'suspended') AC.resume(); return AC; } catch { return null; } };
function pitar(pat = [[880, 0, 0.12]], cuando = 0) {
  const c = audio(); if (!c) return [];
  return pat.map(([f, t, d]) => { const o = c.createOscillator(), g = c.createGain(); const t0 = c.currentTime + cuando + t;
    o.frequency.value = f; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + d + 0.05); return o; });
}
const FIN = [[660, 0, 0.15], [880, 0.17, 0.3]], LOGRO = [[523, 0, 0.1], [659, 0.09, 0.1], [784, 0.18, 0.1], [1047, 0.27, 0.32]];

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const escribir = (k, v) => { try { v ? localStorage.setItem(k, JSON.stringify(v)) : localStorage.removeItem(k); } catch {} };

function preparar(dia, historial) {
  const reg = {};
  (dia.ejercicios || []).forEach((ej) => {
    const prev = seriesPrevias(historial, ej.ejercicio); const T = esTiempo(ej); const sug = cargaNumero(ej.pesoSugerido); const repsSug = Math.round(primerNumero(ej.repsSugeridas)) || 0; const uni = esUnilateral(ej);
    // con lados, cada fila toma lo que hizo la vez pasada con ese mismo lado
    const fila = (k, lado) => { const ps = (prev?.series || []).filter((x) => (lado ? !x.lado || x.lado === lado : x.lado !== 'I')); const p = ps[k] || ps[ps.length - 1];
      return { peso: sug || (p?.peso || ''), reps: T ? '' : (repsSug || p?.reps || ej.repMin || ''), seg: T ? (p?.seg || ej.segundos || 40) : '', rpe: '', hecha: false, tocada: false, ...(lado ? { lado } : {}) }; };
    reg[ej.id] = Array.from({ length: ej.series || 3 }, (_, k) => (uni ? [fila(k, 'D'), fila(k, 'I')] : [fila(k)])).flat();
  });
  return reg;
}

// la misma serie la vez pasada (con lados, la del mismo lado)
function previaDe(prev, filas, k) {
  if (!prev?.series?.length) return null; const x = filas[k]; const n = numeroFila(filas, k) - 1;
  const ps = prev.series.filter((y) => (x.lado ? !y.lado || y.lado === x.lado : y.lado !== 'I'));
  return ps[n] || ps[ps.length - 1] || null;
}
// tocar el % de un tramo lo cambia: 10 → 15 → 20 → 25 → 5 …
const siguientePct = (p, modo) => { const m = Math.abs(Number(p) || 0); const sig = [5, 10, 15, 20, 25, 30].find((v) => v > m) || 5; return modo === 'baja' ? -sig : sig; };

// Carga y reps sugeridas por el coach, con lo que significan: % de su 1RM y cambio desde la vez pasada
function Sugerida({ ej, historial }) {
  if (!ej.pesoSugerido && !ej.repsSugeridas) return null;
  const a = ajusteSugerido(ej, historial);
  if (!a.carga && String(ej.pesoSugerido).length > 14) return <div className="sug texto"><span>Con qué hacerlo</span><b>{textoSugerencia(ej)}</b></div>;
  const sube = a.cambioPct != null && a.cambioPct > 0.5, baja = a.cambioPct != null && a.cambioPct < -0.5;
  return (
    <div className="sug sug-c">
      <div className="sug-top"><span>{a.carga ? 'Carga sugerida hoy' : 'Sugerido hoy'}</span><b>{textoSugerencia(ej)}</b></div>
      {(a.pct1RM || a.cambioPct != null) && <div className="sug-pct">
        {a.pct1RM != null && <div><b className="num">{fmt(a.pct1RM)} %</b><span>de tu 100 % (1RM {fmt(a.e1, 1)} kg){a.pct1RMantes != null ? ` · la vez pasada ${fmt(a.pct1RMantes)} %` : ''}</span></div>}
        {a.cambioPct != null && <div className={sube ? 'sube' : baja ? 'baja' : ''}><b className="num">{Math.abs(a.cambioPct) < 0.5 ? '=' : textoPct(a.cambioPct, 1)}</b><span>{sube ? `subimos ${fmt(a.cambioKg, 1)} kg` : baja ? `bajamos ${fmt(-a.cambioKg, 1)} kg` : 'mismo peso'} vs. la vez pasada ({fmt(a.top.peso, 1)} kg × {a.top.reps})</span></div>}
      </div>}
      {a.exigencia != null && <p className="sug-nota">{a.exigencia > 100.5 ? `Si haces las ${a.reps} reps superas tu mejor marca en ${fmt(a.exigencia - 100, 1)} %.` : `Equivale al ${fmt(a.exigencia)} % de tu mejor marca: margen para hacerlo con buena técnica.`}</p>}
    </div>
  );
}

// Hoja para elegir el tipo de serie (técnica) que se hizo
function TipoSerie({ tec, fila, n, onPoner, onCerrar }) {
  const [todas, setTodas] = useState(false); const actual = fila?.tecnica || '';
  const [mag, setMag] = useState(null); const [tramos, setTramos] = useState(1);
  return (
    <Hoja titulo={`Serie ${n}${fila?.lado ? ` · ${LADOS[fila.lado].toLowerCase()}` : ''}`} onCerrar={onCerrar}>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>¿Qué tipo de serie hiciste en {tec.ej}?</p>
      <div className="tipo-cfg">
        <div><span>Cuánto cambia el peso en cada tramo</span><div className="chips">{[5, 10, 15, 20, 25, 30].map((v) => <button key={v} className={`chip ${mag === v ? 'on' : ''}`} onClick={() => setMag(mag === v ? null : v)}>{v} %</button>)}</div></div>
        <div><span>Tramos (sub-series)</span><div className="chips">{[1, 2, 3].map((v) => <button key={v} className={`chip ${tramos === v ? 'on' : ''}`} onClick={() => setTramos(v)}>{v}</button>)}</div></div>
        <p className="ayuda" style={{ margin: 0 }}>Para drop set, pirámides y rest-pause. Si no eliges: drop set baja 15 %, descendente 10 % y ascendente sube 10 %. Después puedes cambiar cada tramo.</p>
      </div>
      <div className="tipos">
        <button className={`tipo ${!actual ? 'on' : ''}`} onClick={() => onPoner('', todas)}><b>—</b><div><strong>Normal</strong><span>Serie común, con su descanso.</span></div></button>
        {TECNICAS.map((t) => { const sb = subDe(t.k); return <button key={t.k} className={`tipo ${actual === t.k ? 'on' : ''}`} onClick={() => onPoner(t.k, todas, { mag, tramos })}><b>{t.c}</b><div><strong>{t.n}</strong><span>{t.d}</span>
          {sb && <small className="tipo-sub">{sb.modo === 'otro' ? `Debajo anotas el otro ejercicio con su peso y reps` : sb.modo === 'mismo' ? `Debajo anotas ${tramos === 1 ? 'la mini serie' : `${tramos} mini series`} tras la pausa` : `Debajo: ${tramos === 1 ? 'un tramo' : `${tramos} tramos`} ${sb.modo === 'baja' ? 'bajando' : 'subiendo'} ${mag ?? sb.pct} % cada uno`}</small>}</div></button>; })}
      </div>
      <label className="todas-s"><input type="checkbox" checked={todas} onChange={(e) => setTodas(e.target.checked)} /> Aplicar a todas las series de este ejercicio</label>
    </Hoja>
  );
}

export default function Entrenamiento({ programa, dia, historial, quien, claveBorrador, onGuardar, onSalir, onProgreso, modo = 'atleta', sinCodigo = false, sexo = '' }) {
  const avisar = useAviso();
  const guardado = useMemo(() => leer(claveBorrador), [claveBorrador]);
  const [reg, setReg] = useState(() => guardado?.reg || preparar(dia, historial));
  const [notas, setNotas] = useState(() => guardado?.notas || {});
  const [inicio] = useState(() => guardado?.inicio || Date.now());
  const [fecha, setFecha] = useState(() => guardado?.fecha || hoy());
  const [ocultos, setOcultos] = useState({}); const [rpe, setRpe] = useState(null); const [conv, setConv] = useState(false); const [tec, setTec] = useState(null);
  const atleta = modo !== 'coach';
  const [finAt, setFinAt] = useState(0); const [total, setTotal] = useState(0); const [, tick] = useState(0); const alarma = useRef([]);
  const [cierre, setCierre] = useState(false); const [fin, setFin] = useState(null); const [guardando, setGuardando] = useState(false); const [compartir, setCompartir] = useState(false);
  const retomado = useRef(!!guardado?.reg);

  useEffect(() => { if (!fin) escribir(claveBorrador, { reg, notas, inicio, fecha, t: Date.now() }); }, [reg, notas, fecha, fin, claveBorrador, inicio]);
  useEffect(() => { if (retomado.current) avisar('Sigues donde lo dejaste'); }, [avisar]);
  // en vivo: el coach ve el avance (se manda unos segundos después de cada cambio)
  useEffect(() => {
    if (!onProgreso || fin) return;
    const t = setTimeout(() => {
      const ejs0 = dia.ejercicios || [];
      onProgreso({ programa: programa?.nombre || '', programaId: programa?.id || null, dia: dia.nombre, inicio: new Date(inicio).toISOString(),
        hechas: ejs0.reduce((n, e) => n + (reg[e.id] || []).filter((x) => x.hecha).length, 0), total: ejs0.reduce((n, e) => n + (reg[e.id] || []).length, 0),
        ejercicios: ejs0.map((e) => ({ ejercicio: e.ejercicio, grupo: e.grupo, tipo: e.tipo, objetivo: `${e.series} × ${esTiempo(e) ? `${e.segundos} s` : `${e.repMin}–${e.repMax}`}`, carga: textoSugerencia(e), nota: notas[e.ejercicio] || '',
          series: (reg[e.id] || []).map((x) => ({ peso: x.peso, reps: x.reps, seg: x.seg, rpe: x.rpe, hecha: !!x.hecha, ...(x.lado ? { lado: x.lado } : {}), ...(x.tecnica ? { tecnica: x.tecnica } : {}), ...(x.subs?.length ? { subs: subsParaGuardar(x.peso, x.subs) } : {}) })) })) });
    }, 2500);
    return () => clearTimeout(t);
  }, [reg, notas, fin]); // eslint-disable-line
  useEffect(() => {
    if (!finAt) return; const i = setInterval(() => { tick((x) => x + 1); if (Date.now() >= finAt) { setFinAt(0); navigator.vibrate?.([140, 70, 140]); } }, 250);
    return () => clearInterval(i);
  }, [finAt]);
  const restan = finAt ? Math.max(0, Math.ceil((finAt - Date.now()) / 1000)) : 0;
  const arrancar = (s) => { alarma.current.forEach((o) => { try { o.stop(); } catch {} }); if (!s) { setFinAt(0); return; } alarma.current = pitar(FIN, s); setTotal(s); setFinAt(Date.now() + s * 1000); };
  const sumar = (s) => { const r = Math.max(5, restan + s); arrancar(r); };

  const ejs = dia.ejercicios || [];
  const todas = ejs.flatMap((e) => reg[e.id] || []); const hechas = todas.filter((x) => x.hecha).length;
  const set = (id, k, campo, v) => setReg((r) => ({ ...r, [id]: r[id].map((x, i) => (i === k ? { ...x, [campo]: v, tocada: campo === 'hecha' ? x.tocada : true } : x)) }));
  const masSerie = (id) => setReg((r) => { const f = r[id]; const lados = f.some((x) => x.lado);
    const nuevas = lados ? ['D', 'I'].map((l) => ({ ...([...f].reverse().find((x) => x.lado === l) || f[f.length - 1] || {}), lado: l })) : [f[f.length - 1] || {}];
    return { ...r, [id]: [...f, ...nuevas.map((u) => ({ ...u, hecha: false, tocada: false, tecnica: undefined, subs: undefined }))] }; });
  const menosSerie = (id) => setReg((r) => { const n = r[id].some((x) => x.lado) ? 2 : 1; return r[id].length > n ? { ...r, [id]: r[id].slice(0, -n) } : r; });
  const alternarLados = (id) => setReg((r) => ({ ...r, [id]: r[id].some((x) => x.lado) ? filasBilaterales(r[id]) : filasUnilaterales(r[id]) }));
  // tipo de serie: se pone en la fila (y en su otro lado); "todas" la pone en todas las series del ejercicio
  const ponerTecnica = (id, k, t, todas, cfg = {}) => setReg((r) => { const f = r[id]; const n = numeroFila(f, k);
    return { ...r, [id]: f.map((x, i) => (todas || numeroFila(f, i) === n ? { ...x, tecnica: t || undefined, subs: t && subDe(t) ? (x.tecnica === t && x.subs?.length ? x.subs : nuevasSubs(t, cfg.tramos, cfg.mag)) : undefined } : x)) }; });
  // sub-series: el tramo de abajo de la serie (bajada del drop set, mini serie tras la pausa, ejercicio pareado…)
  const setSub = (id, k, j, campo, v) => setReg((r) => ({ ...r, [id]: r[id].map((x, i) => (i === k ? { ...x, tocada: true, subs: x.subs.map((y, m) => (m === j ? { ...y, [campo]: v } : y)) } : x)) }));
  const masSub = (id, k) => setReg((r) => ({ ...r, [id]: r[id].map((x, i) => (i === k ? { ...x, subs: [...(x.subs || []), ...nuevasSubs(x.tecnica, 1, x.subs?.length && x.subs[x.subs.length - 1].pct ? Math.abs(x.subs[x.subs.length - 1].pct) : undefined).map((y) => (y.ejercicio != null && x.subs?.length ? { ...y, ejercicio: x.subs[x.subs.length - 1].ejercicio } : y))] } : x)) }));
  const menosSub = (id, k, j) => setReg((r) => ({ ...r, [id]: r[id].map((x, i) => (i === k ? { ...x, subs: x.subs.filter((_, m) => m !== j) } : x)) }));
  const cambiarPct = (id, k, j, v) => setReg((r) => ({ ...r, [id]: r[id].map((x, i) => (i === k ? { ...x, subs: x.subs.map((y, m) => (m === j ? { ...y, pct: v, peso: '' } : y)) } : x)) }));

  function marcar(ej, k) {
    const s = reg[ej.id][k]; const on = !s.hecha; set(ej.id, k, 'hecha', on);
    if (!on) return;
    audio(); const T = esTiempo(ej); const rec = records(historial, ej.ejercicio); const peso = nSeg(s.peso);
    const av = revisarSerie({ ...s, hecha: true }, ej, rec);
    if (av) { pitar([[440, 0, 0.12], [330, 0.14, 0.18]]); navigator.vibrate?.([80, 60, 80]); avisar(av.texto, 'error'); arrancar(ej.descanso ?? 90); return; }
    if (!T && rec.maxPeso > 0 && peso > rec.maxPeso) { pitar(LOGRO); navigator.vibrate?.([40, 50, 90]); avisar(`Récord de carga en ${ej.ejercicio}: ${fmt(peso, 1)} kg. Tu progresión de cargas está funcionando.`); }
    else if (T && rec.maxSeg > 0 && nSeg(s.seg) > rec.maxSeg) { pitar(LOGRO); avisar(`Récord de tiempo en ${ej.ejercicio}`); }
    else pitar([[740, 0, 0.08]]);
    // con lados: el descanso arranca cuando terminó los dos lados de la serie
    const f = reg[ej.id]; const otro = s.lado && f.find((x, i) => i !== k && x.lado !== s.lado && numeroFila(f, i) === numeroFila(f, k));
    if (otro && !otro.hecha) return;
    arrancar(ej.descanso ?? 90);
  }

  function paquete() {
    const series = [];
    ejs.forEach((ej) => { const T = esTiempo(ej); let n = 0;
      const filas = reg[ej.id] || []; const num = {}; // con lados, la derecha y la izquierda de la misma serie llevan el mismo número
      filas.forEach((s, i) => { if (!(s.hecha || s.tocada)) return; const p = nSeg(s.peso), r = Math.round(nSeg(s.reps)), g = Math.round(nSeg(s.seg));
        if (T ? g > 0 : p > 0 || r > 0) { if (!T && !(r > 0)) return; const k = numeroFila(filas, i); if (!num[k]) num[k] = ++n;
          const o = { ejercicio: ej.ejercicio, grupo: ej.grupo, serie: num[k], peso: p, reps: T ? 0 : r, rpe: nSeg(s.rpe) || ej.rpe || 8 }; if (T) o.seg = g; if (s.lado) o.lado = s.lado; if (s.tecnica) o.tecnica = s.tecnica; if (!T && s.subs?.length) { const sb = subsParaGuardar(p, s.subs); if (sb.length) o.subs = sb; } series.push(o); } }); });
    const nt = {}; Object.entries(notas).forEach(([k, v]) => { if (String(v).trim()) nt[k] = String(v).trim(); });
    return { id: uuid(), programaId: programa?.id || null, programaNombre: programa?.nombre || '', dia: dia.nombre, fecha, minutos: Math.max(1, Math.round((Date.now() - inicio) / 60000)), series, notas: nt };
  }

  async function terminar() {
    const p = paquete(); if (!p.series.length) { setCierre(false); avisar('Marca con ✓ las series que hiciste antes de terminar', 'error'); return; }
    setGuardando(true);
    try {
      const r = await onGuardar(p); escribir(claveBorrador, null); arrancar(0);
      const vol = p.series.reduce((t, x) => t + volSerie(x), 0);
      const recs = [...new Set(p.series.filter((x) => { const rr = records(historial, x.ejercicio); return rr.maxPeso > 0 && x.peso > rr.maxPeso; }).map((x) => x.ejercicio))];
      const antes = historial.filter((x) => mismoNombre(x.dia, dia.nombre) && (!programa?.id || !x.programaId || x.programaId === programa.id)).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
      const volAntes = antes ? volumen(antes) : 0; const subeVol = volAntes > 0 && vol > volAntes * 1.03 ? Math.round((vol / volAntes - 1) * 100) : 0;
      const semanas = semanasSeguidas([...historial, { fecha: p.fecha }]);
      const resumen = resumenCompartir(p, historial, { dia: dia.nombre, programa: programa?.nombre || '' });
      setFin({ series: new Set(p.series.map((x) => `${x.ejercicio}|${x.serie}`)).size, todas: p.series, vol, min: p.minutos, recs, subeVol, semanas, id: p.id, pendiente: r?.pendiente, analogia: analogia(vol, p.id), frase: MOTIVACION[Math.floor(Math.random() * MOTIVACION.length)], resumen }); pitar(LOGRO);
    } catch (e) { avisar(e.message || 'No se pudo guardar', 'error'); }
    setGuardando(false); setCierre(false);
  }

  if (fin && compartir) return <Compartir resumen={fin.resumen} onCerrar={() => setCompartir(false)} />;
  if (fin) return (
    <div className="fin">
      <img src={brazo} alt="" />
      <h1>{modo === 'coach' ? 'Sesión guardada' : fin.pendiente ? 'Entreno completo' : 'Enviado a tu coach'}</h1>
      <p className="frase">{fin.frase}</p>
      <div className="kpis"><div className="kpi"><b className="num">{fin.series}</b><span>series</span></div><div className="kpi"><b className="num">{fmt(fin.vol)}</b><span>kg movidos</span></div><div className="kpi"><b className="num">{fin.min}</b><span>{fin.min === 1 ? 'minuto' : 'minutos'}</span></div></div>
      {fin.analogia && <Analogia a={fin.analogia} kg={fin.vol} />}
      {fin.recs.length > 0 && <p className="aviso progreso"><Ico n="fuego" s={20} /><span>Récord en <b>{fin.recs.join(', ')}</b>.<small>{merito('record', fin.id)}</small></span></p>}
      {fin.subeVol > 0 && <p className="aviso progreso"><Ico n="grafica" s={20} /><span><b>{fin.subeVol} % más volumen</b> que la última vez en este día.<small>{merito('volumen', fin.id)}</small></span></p>}
      {!fin.recs.length && !fin.subeVol && fin.semanas >= 3 && <p className="aviso progreso"><Ico n="check" s={20} /><span><b>{fin.semanas} semanas seguidas</b> entrenando.<small>{merito('constancia', fin.id)}</small></span></p>}
      <Suspense fallback={null}><MapaMuscular series={fin.todas} sexo={sexo} /></Suspense>
      {fin.pendiente && <p className="aviso" style={{ width: '100%', textAlign: 'left', marginTop: 0, marginBottom: 18 }}><Ico n="nube" s={20} /><span>No hay señal ahora. La sesión quedó guardada en tu teléfono y <b>se envía sola</b> cuando vuelvas a tener conexión.</span></p>}
      <button className="btn xl full comp-abrir" onClick={() => setCompartir(true)}><Ico n="camara" s={22} />Comparte tu progreso</button>
      <button className="btn oro xl full" onClick={onSalir}>Listo</button>
    </div>
  );

  return (
    <div className="pantalla">
      <Barra volver={{ fn: onSalir, texto: '' }} titulo={dia.nombre} sub={`${programa?.nombre || ''}${modo === 'coach' ? ` · con ${quien}` : ''}`}
        derecha={<><button className="kglb" onClick={() => setConv(true)} aria-label="Conversor de kilos a libras">kg⇄lb</button><span className="etq num" style={{ fontSize: 17, color: 'var(--chalk)' }}>{hechas}/{todas.length}</span></>} />
      <div className="ent-prog"><i style={{ width: `${todas.length ? (hechas / todas.length) * 100 : 0}%` }} /></div>
      {modo === 'coach' && <label className="campo" style={{ marginTop: 14 }}><span>Fecha de la sesión</span><input type="date" className="in" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value || hoy())} /></label>}

      {ejs.map((ej) => {
        const T = esTiempo(ej); const prev = seriesPrevias(historial, ej.ejercicio); const filas = reg[ej.id] || []; const recEj = records(historial, ej.ejercicio); const yt = ytId(ej.video); const cues = CUES[ej.grupo] || []; const lados = filas.some((x) => x.lado); const bal = lados ? balanceLados(historial, ej.ejercicio) : null; const pe = progresoEjercicio(filas, historial, ej.ejercicio, T);
        return (
          <article className="ent" key={ej.id} style={{ borderLeft: `4px solid ${colorGrupo(ej.grupo)}` }}>
            <div className="ent-cab">
              <h3>{ej.ejercicio}<small className="muted">{ej.grupo} · {ej.series} series · {T ? `${ej.segundos} s` : `${ej.repMin}–${ej.repMax} reps`} · RPE {fmt(ej.rpe, 1)} · descanso {ej.descanso ?? 90} s</small></h3>
              {yt && ocultos[ej.id] && <button className="ico-b oro" onClick={() => setOcultos((o) => ({ ...o, [ej.id]: false }))} aria-label="Ver video"><Ico n="play" /></button>}
            </div>
            <div className="ent-cuerpo">
              {yt && !ocultos[ej.id] && <Video id={yt} titulo={ej.ejercicio} onOcultar={() => setOcultos((o) => ({ ...o, [ej.id]: true }))} />}
              {prev ? <>
                <p className="previa-t">La vez pasada · {fCorta(prev.fecha)}</p>
                <div className="previa">{prev.series.map((x, i) => <span key={i}><b>{x.seg ? `${x.seg}s` : fmt(x.peso, 1)}</b>{!x.seg && <> kg × {x.reps}</>} {x.rpe ? <i>@{fmt(x.rpe, 1)}</i> : null}<MarcaSerie x={x} /></span>)}</div>
                {bal && bal.dif >= 10 && <p className="guia">La vez pasada tu lado {bal.fuerte === 'D' ? 'derecho' : 'izquierdo'} hizo {bal.dif} % más. Empieza por el más débil y que el otro lo iguale.</p>}
                {prev.nota && <p className="guia">“{prev.nota}”</p>}
                <Marcas historial={historial} ej={ej} />
              </> : <p className="previa-t">Primera vez con este ejercicio</p>}
              <Sugerida ej={ej} historial={historial} />
              {ej.nota && <div className="nota-coach"><small>Nota de tu coach</small>{ej.nota}</div>}
              <div className="sets">
                {pe && (pe.vsAntes != null || pe.vsRecord != null) && <div className={`prog-ej ${pe.vsRecord > 0 ? 'record' : pe.vsAntes > 0 ? 'sube' : pe.vsAntes < 0 ? 'baja' : ''}`}>
                  <Ico n={pe.vsRecord > 0 ? 'fuego' : 'tendencia'} s={16} />
                  {pe.vsRecord > 0 ? <span><b>Récord: {textoPct(pe.vsRecord, 1)}</b> sobre tu mejor marca</span>
                    : pe.vsAntes != null ? <span>Hoy vas <b>{textoPct(pe.vsAntes, 1)}</b> {T ? 'en tiempo' : 'de fuerza'} vs. la vez pasada</span> : null}</div>}
                <div className="set-h"><span>#</span><span>Peso</span><span>{T ? 'Seg' : 'Reps'}</span><span>RPE</span><span /></div>
                {filas.map((s, k) => { const av = s.tocada || s.hecha ? revisarSerie(s, ej, recEj) : null;
                  const pr = !av && (s.tocada || s.hecha) ? progresoSerie(s, previaDe(prev, filas, k), T) : null; const sb = !T && s.tecnica ? subDe(s.tecnica) : null; const ps = sb ? pesosSubs(s.peso, s.subs || []) : []; return (
                  <React.Fragment key={k}>
                  <div className={`set ${s.hecha ? 'ok' : ''} ${av ? 'raro' : ''}`}>
                    <button className={`n-serie ${s.lado ? 'lado' : ''} ${s.tecnica ? 'tec' : ''}`} onClick={() => setTec({ id: ej.id, k, ej: ej.ejercicio })} aria-label={`Tipo de serie ${numeroFila(filas, k)}${s.lado ? ` ${LADOS[s.lado].toLowerCase()}` : ''}${s.tecnica ? `: ${tecnicaDe(s.tecnica)?.n}` : ''}`}>
                      <b>{numeroFila(filas, k)}{s.lado && <small>{s.lado}</small>}</b>{s.tecnica && <em>{tecnicaDe(s.tecnica)?.c}</em>}</button>
                    <input className="cel" inputMode="decimal" value={s.peso} placeholder="kg" onFocus={(e) => e.target.select()} onChange={(e) => set(ej.id, k, 'peso', e.target.value)} aria-label={`Peso serie ${k + 1}`} />
                    <input className="cel" inputMode="numeric" value={T ? s.seg : s.reps} placeholder={T ? 's' : '—'} onFocus={(e) => e.target.select()} onChange={(e) => set(ej.id, k, T ? 'seg' : 'reps', e.target.value)} aria-label={`${T ? 'Segundos' : 'Repeticiones'} serie ${k + 1}`} />
                    <div className="cel-rpe"><input className="cel" inputMode="decimal" value={s.rpe} placeholder={fmt(ej.rpe, 1)} onFocus={(e) => e.target.select()} onChange={(e) => set(ej.id, k, 'rpe', e.target.value)} aria-label={`RPE serie ${k + 1}`} />
                      <button onClick={() => setRpe({ id: ej.id, k })} aria-label="Qué es el RPE">?</button></div>
                    <button className={`hecho ${s.hecha ? 'on' : ''}`} onClick={() => marcar(ej, k)} aria-label={`Marcar serie ${k + 1} hecha`}><Ico n="check" w={2.6} /></button>
                  </div>
                  {sb && (s.subs || []).map((u, j) => (
                    <div key={j} className={`sub-set ${sb.modo === 'otro' ? 'otro' : ''}`}>
                      <span className="sub-n">↳</span>
                      {sb.modo === 'otro' ? <input className="cel sub-ej" value={u.ejercicio} placeholder="Ejercicio pareado" onChange={(e) => setSub(ej.id, k, j, 'ejercicio', e.target.value)} aria-label={`Ejercicio pareado serie ${numeroFila(filas, k)}`} />
                        : <button className={`sub-pct ${sb.modo}`} onClick={() => cambiarPct(ej.id, k, j, sb.modo === 'mismo' ? 0 : siguientePct(u.pct, sb.modo))} aria-label="Cambiar el porcentaje del tramo">{sb.modo === 'mismo' ? 'mismo peso' : textoPct(ps[j]?.cambio ?? u.pct)}</button>}
                      <input className="cel" inputMode="decimal" value={u.peso} placeholder={ps[j]?.calculado ? String(ps[j].peso).replace('.', ',') : 'kg'} onFocus={(e) => e.target.select()} onChange={(e) => setSub(ej.id, k, j, 'peso', e.target.value)} aria-label={`Peso ${sb.nombre.toLowerCase()} ${j + 1} serie ${numeroFila(filas, k)}`} />
                      <input className="cel" inputMode="numeric" value={u.reps} placeholder="reps" onFocus={(e) => e.target.select()} onChange={(e) => setSub(ej.id, k, j, 'reps', e.target.value)} aria-label={`Reps ${sb.nombre.toLowerCase()} ${j + 1} serie ${numeroFila(filas, k)}`} />
                      <button className="ico-b sub-x" onClick={() => menosSub(ej.id, k, j)} aria-label={`Quitar ${sb.nombre.toLowerCase()} ${j + 1}`}><Ico n="cerrar" s={14} /></button>
                    </div>))}
                  {sb && <button className="sub-mas" onClick={() => masSub(ej.id, k)}><Ico n="mas" s={14} />{(s.subs || []).length ? sb.mas : sb.nombre}</button>}
                  {av && <p className={`set-aviso ${av.nivel}`} role="alert">{av.texto}</p>}
                  {pr && pr.pct != null && <p className={`set-prog ${pr.pct > 0.05 ? 'sube' : pr.pct < -0.05 ? 'baja' : ''}`}>{pr.pct > 0.05 ? '▲' : pr.pct < -0.05 ? '▼' : '='} {textoPct(pr.pct, 1)} vs. la vez pasada ({pr.antes}{T ? '' : ' kg'})</p>}
                  </React.Fragment>); })}
              </div>
              <div className="set-acc"><button className="btn chico" onClick={() => masSerie(ej.id)}><Ico n="mas" s={16} />Serie</button>{filas.length > (lados ? 2 : 1) && <button className="btn chico" onClick={() => menosSerie(ej.id)}>Quitar serie</button>}
                <button className={`btn chico ${lados ? 'on-lados' : ''}`} onClick={() => alternarLados(ej.id)} aria-pressed={lados}>{lados ? 'D / I por separado' : 'Separar D / I'}</button></div>
              {filas.length > 0 && !filas.some((x) => x.tecnica) && <p className="ayuda" style={{ margin: '6px 0 0' }}>Toca el número de la serie para marcar rest-pause, drop set, superserie o pirámide.</p>}
              <textarea className="in obs" rows={1} placeholder={modo === 'coach' ? 'Observación del ejercicio…' : 'Cómo te sentiste, molestias…'} value={notas[ej.ejercicio] || ''} onChange={(e) => setNotas((n) => ({ ...n, [ej.ejercicio]: e.target.value }))} />
              {cues.length > 0 && <details className="tecnica"><summary>Puntos de técnica <Ico n="abajo" s={16} /></summary><ul>{cues.map((c) => <li key={c}>{c}</li>)}</ul></details>}
            </div>
          </article>
        );
      })}

      <div style={{ marginTop: 22 }}><button className="btn oro xl full" onClick={() => setCierre(true)}>{atleta ? <><Ico n="subir" s={20} />Enviar a Coach</> : 'Terminar entreno'}</button></div>

      {finAt > 0 && <div className="reloj" role="timer"><b>{Math.floor(restan / 60)}:{String(restan % 60).padStart(2, '0')}<small>de {Math.floor(total / 60)}:{String(total % 60).padStart(2, '0')}</small></b>
        <button onClick={() => sumar(30)}>+30 s</button><button onClick={() => arrancar(0)}>Saltar</button></div>}

      {rpe && <Hoja titulo="¿Qué es el RPE?" onCerrar={() => setRpe(null)}>
        <p className="muted" style={{ marginBottom: 14 }}>Cuánto te costó la serie. Pregúntate: ¿cuántas repeticiones más podía hacer con buena técnica? Toca la que corresponde.</p>
        <div className="rpe-l">{ESCALA_RPE.map(([v, a, b]) => <button key={v} className="rpe-f" onClick={() => { set(rpe.id, rpe.k, 'rpe', String(v)); setRpe(null); }}><b>{String(v).replace('.', ',')}</b><div><strong>{a}</strong><span>{b}</span></div></button>)}</div>
      </Hoja>}

      {conv && <Conversor onCerrar={() => setConv(false)} />}
      {tec && <TipoSerie tec={tec} fila={reg[tec.id]?.[tec.k]} n={numeroFila(reg[tec.id] || [], tec.k)} onPoner={(t, todas, cfg) => { ponerTecnica(tec.id, tec.k, t, todas, cfg); setTec(null); }} onCerrar={() => setTec(null)} />}
      {cierre && <Hoja titulo={atleta ? '¿Enviar a tu coach?' : '¿Terminar el entreno?'} onCerrar={() => setCierre(false)} acciones={<><button className="btn" onClick={() => setCierre(false)}>Seguir</button><button className="btn oro" disabled={guardando} onClick={terminar}>{guardando ? (atleta ? 'Enviando…' : 'Guardando…') : atleta ? 'Enviar a Coach' : 'Terminar y guardar'}</button></>}>
        <p className="muted">Se guardan <b style={{ color: 'var(--chalk)' }}>{paquete().series.length} series</b>: las que marcaste con ✓ o escribiste a mano. {atleta ? (sinCodigo ? 'Tu coach las ve al instante.' : 'Tu coach las ve al instante y la rutina se bloquea hasta tu próximo código.') : ''}</p>
      </Hoja>}
    </div>
  );
}
