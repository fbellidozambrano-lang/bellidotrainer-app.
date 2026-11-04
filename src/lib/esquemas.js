// Forma de hacer las series de un ejercicio (esquema): top set + back off, series rectas,
// rampa, pirámide, pirámide inversa o por RPE, con series de aproximación opcionales.
// Arma las filas del entreno con su peso y reps objetivo, las reajusta mientras se registra
// y analiza el progreso según el tipo de serie.
import { cargaNumero, e1rm, esTiempo, nSeg, r05, rangoReps, seriesPrevias, ESQ_KEYS } from './util.js';
import { esUnilateral } from './series.js';

export const ESQUEMAS = [
  { k: 'recto', n: 'Series rectas', c: '=', d: 'Mismo peso y mismas repeticiones en todas las series.' },
  { k: 'backoff', n: 'Top set + back off', c: 'TOP', d: 'La primera serie es la más pesada (top set). En cada serie siguiente bajas el peso o las repeticiones.' },
  { k: 'rampa', n: 'Rampa ascendente', c: '↗', d: 'Subes el peso en cada serie y bajan las repeticiones. La última es la más pesada.' },
  { k: 'inversa', n: 'Pirámide inversa', c: '↘', d: 'Empiezas con la serie más pesada; en cada serie bajas el peso y subes repeticiones.' },
  { k: 'piramide', n: 'Pirámide', c: '⋀', d: 'Subes el peso hasta la serie del medio y vuelves a bajar.' },
  { k: 'rpe', n: 'Por RPE', c: 'RPE', d: 'Cada serie se ajusta según el RPE de la anterior para quedar en el RPE objetivo.' },
];
export const ESQUEMA_DEF = 'recto';
export const esquemaInfo = (k) => ESQUEMAS.find((x) => x.k === k) || null;
export const nombreEsquema = (cfg) => esquemaInfo(cfg?.k)?.n || '';
export const PASOS = [5, 7.5, 10, 15, 20];
const PASO_DEF = { backoff: 10, rampa: 10, inversa: 10, piramide: 10 };
const lim = (v, a, b) => Math.min(b, Math.max(a, v));

// configuración completa del esquema de un ejercicio (null en ejercicios de tiempo)
export function esquemaDe(ej, base) {
  if (!ej || esTiempo(ej)) return null;
  const k = ESQ_KEYS.includes(ej.esquema) ? ej.esquema : ESQ_KEYS.includes(base?.esquema ?? base) ? (base?.esquema ?? base) : ESQUEMA_DEF;
  const c = (ej.esquema ? ej.esq : null) || (typeof base === 'object' && base ? base.esq : null) || {};
  return {
    k, paso: lim(nSeg(c.paso) || PASO_DEF[k] || 10, 2.5, 30), modo: c.modo === 'reps' ? 'reps' : 'peso',
    dReps: lim(Math.round(nSeg(c.dReps)) || 1, 1, 3), aprox: lim(Math.round(nSeg(c.aprox)) || 0, 0, 3),
  };
}
// lo que se guarda en el ejercicio: { esquema, esq } (esq solo con lo que cambia del valor por defecto)
export function guardarEsquema(cfg) {
  const esq = {};
  if (PASO_DEF[cfg.k] && cfg.paso !== PASO_DEF[cfg.k]) esq.paso = cfg.paso;
  if (cfg.k === 'backoff' && cfg.modo === 'reps') { esq.modo = 'reps'; if (cfg.dReps !== 1) esq.dReps = cfg.dReps; }
  if (cfg.aprox) esq.aprox = cfg.aprox;
  return { esquema: cfg.k, ...(Object.keys(esq).length ? { esq } : {}) };
}
// el esquema del asesorado (datos.esquema / datos.esq) y su aplicación a un ejercicio que aún no tiene uno
export const baseDe = (a) => (a?.datos?.esquema ? { esquema: a.datos.esquema, esq: a.datos.esq } : null);
// el ejercicio con otro esquema (sin restos de la configuración anterior)
export const ponerCfg = (e, cfg) => { const r = { ...e }; delete r.esq; return { ...r, ...guardarEsquema(cfg) }; };
export const conEsquema = (e, base) => (e.esquema || esTiempo(e) ? e : { ...e, ...guardarEsquema(esquemaDe(e, base)) });
// pone un esquema en todos los ejercicios por repeticiones de los programas
export function aplicarEsquemaProgramas(programas, cfg) {
  return programas.map((p) => ({ ...p, dias: (p.dias || []).map((d) => ({ ...d, ejercicios: (d.ejercicios || []).map((e) => { return esTiempo(e) ? e : ponerCfg(e, cfg); }) })) }));
}
const fmtN = (v) => String(v).replace('.', ',');
// la regla en una frase
export function textoEsquema(cfg, rpe = 8) {
  if (!cfg) return '';
  const p = `${fmtN(cfg.paso)} %`;
  const t = {
    backoff: cfg.modo === 'reps' ? `Top set y luego el mismo peso con ${cfg.dReps === 1 ? '1 rep' : `${cfg.dReps} reps`} menos en cada serie` : `Top set y luego −${p} de peso en cada serie`,
    recto: 'Mismo peso y reps en todas las series',
    rampa: `Sube ${p} de peso por serie; la última es la más pesada`,
    inversa: `Empieza por la más pesada y baja ${p} por serie, con más reps`,
    piramide: `Sube ${p} por serie hasta la del medio y vuelve a bajar`,
    rpe: `Cada serie se ajusta para quedar en RPE ${fmtN(rpe)}`,
  }[cfg.k];
  return cfg.aprox ? `${t} · ${cfg.aprox === 1 ? '1 serie' : `${cfg.aprox} series`} de aproximación` : t;
}

// ---------- plan ----------
// Por cada serie efectiva: multiplicador del peso principal (m), reps de más o de menos (dr) y su papel (rol).
// El peso principal es el de la serie más pesada: el top set en back off, la última en rampa…
export function planEsquema(cfg, n, ej = {}) {
  const f = 1 - cfg.paso / 100; const n1 = Math.max(1, n);
  const pasoR = n1 > 1 ? Math.max(1, Math.round((nSeg(ej.repMax) - nSeg(ej.repMin)) / (n1 - 1))) : 0;
  return Array.from({ length: n1 }, (_, i) => {
    if (cfg.k === 'backoff') return i === 0 ? { m: 1, dr: 0, rol: 'top' } : cfg.modo === 'reps' ? { m: 1, dr: -cfg.dReps * i, rol: 'bo' } : { m: f ** i, dr: 0, rol: 'bo' };
    if (cfg.k === 'rampa') { const s = n1 - 1 - i; return { m: f ** s, dr: s * pasoR, rol: s === 0 ? 'max' : null }; }
    if (cfg.k === 'inversa') return { m: f ** i, dr: i * pasoR, rol: i === 0 ? 'max' : null };
    if (cfg.k === 'piramide') { const s = Math.abs(i - Math.floor(n1 / 2)); return { m: f ** s, dr: s * pasoR, rol: s === 0 ? 'max' : null }; }
    return { m: 1, dr: 0, rol: null };
  });
}
// series de aproximación: % de la serie más pesada y reps fijas
const APROX = { 1: [[0.6, 5]], 2: [[0.5, 8], [0.75, 4]], 3: [[0.4, 8], [0.6, 5], [0.8, 3]] };
export const planAprox = (n) => (APROX[n] || []).map(([m, r]) => ({ m, r }));

export const ROLES = { top: 'Top set', bo: 'Back off', max: 'Más pesada' };
export const esAprox = (x) => x?.pl?.t === 'a';
// peso escrito como número ("80", "80 kg", "45 lb"); "banda verde" o "máquina 3" no
export const pesoNumero = (t) => (/^\s*\d+([.,]\d+)?\s*(kg|kgs|lb|lbs)?\s*$/i.test(String(t || '')) ? cargaNumero(t) : 0);
const repsNumero = (t) => { const m = String(t ?? '').match(/\d+/); return m ? parseInt(m[0], 10) : 0; };
const mismoLado = (x, lado) => (lado ? !x.lado || x.lado === lado : x.lado !== 'I');
// la serie principal de una sesión pasada: la marcada (top / más pesada) o la de más peso
export function clavePrevia(series = []) {
  const ef = series.filter((x) => !x.seg);
  return ef.find((x) => x.rol === 'top' || x.rol === 'max') || [...ef].filter((x) => x.peso > 0).sort((a, b) => b.peso - a.peso || b.reps - a.reps)[0] || null;
}

// peso de una serie del plan: al 0,5 kg o, si se sabe de cuánto en cuánto sube su equipo (ej.pasoPeso), a ese salto
export const redondear = (v, ej = {}) => { const s = nSeg(ej.pasoPeso); return s > 0 ? Math.max(s, Math.round(Math.round(v / s) * s * 100) / 100) : r05(v); };
// filas del registro de un ejercicio (con lados, una fila por lado en cada serie)
export function armarFilas(ej, historial, cfg, n = ej.series || 3) {
  const prev = seriesPrevias(historial, ej.ejercicio); const T = esTiempo(ej); const lados = esUnilateral(ej) ? ['D', 'I'] : [null];
  if (!cfg) { // ejercicios de tiempo: como siempre, lo de la vez pasada serie por serie
    const fila = (k, lado) => { const ps = (prev?.series || []).filter((x) => mismoLado(x, lado)); const p = ps[k] || ps[ps.length - 1];
      return { peso: pesoNumero(ej.pesoSugerido) || (p?.peso || ''), reps: T ? '' : (repsNumero(ej.repsSugeridas) || p?.reps || ej.repMin || ''), seg: T ? (p?.seg || ej.segundos || 40) : '', rpe: '', hecha: false, tocada: false, ...(lado ? { lado } : {}) }; };
    return Array.from({ length: n }, (_, k) => lados.map((l) => fila(k, l))).flat();
  }
  const plan = planEsquema(cfg, n, ej); const ap = planAprox(cfg.aprox);
  const ref = {}; lados.forEach((l) => { const ps = (prev?.series || []).filter((x) => mismoLado(x, l)); const c = clavePrevia(ps);
    ref[l || '-'] = { P: pesoNumero(ej.pesoSugerido) || c?.peso || 0, R: repsNumero(ej.repsSugeridas) || c?.reps || nSeg(ej.repMin) || 0 }; });
  const fila = (t, i, l) => { const { P, R } = ref[l || '-']; const x = t === 'a' ? ap[i] : plan[i];
    return { peso: P > 0 ? redondear(P * x.m, ej) : '', reps: t === 'a' ? x.r : R > 0 ? repsPlan(R, x, cfg, ej) : '', seg: '', rpe: '', hecha: false, tocada: false, pl: { t, i }, ap: true, ar: true, ...(t === 'e' && x.rol ? { rol: x.rol } : {}), ...(l ? { lado: l } : {}) }; };
  return [...ap.map((_, i) => lados.map((l) => fila('a', i, l))).flat(), ...plan.map((_, i) => lados.map((l) => fila('e', i, l))).flat()];
}

// reps de una serie: en back off bajan con el plan; en rampa y pirámides las series livianas suben reps sin pasar del rango
const repsPlan = (R, e, cfg, ej) => Math.max(1, Math.round(cfg.k === 'backoff' || !e.dr ? R + e.dr : Math.min(R + e.dr, Math.max(R, nSeg(ej.repMax) || R + e.dr))));
const nEf = (filas) => new Set(filas.filter((x) => x.pl?.t === 'e').map((x) => x.pl.i)).size;

// Reajusta las filas automáticas (las que no escribió ni marcó) según el esquema. Cada una toma como guía
// la serie efectiva más cercana hacia atrás que escribió o ya hizo (si no hay, la más cercana hacia adelante);
// la aproximación sale de la serie principal. Por RPE, la guía ya hecha con su RPE sube o baja las siguientes.
export function recalcular(filas, cfg, ej = {}) {
  if (!cfg) return filas;
  const plan = planEsquema(cfg, nEf(filas), ej); const ap = planAprox(cfg.aprox);
  const out = filas.map((x) => (x.pl?.t === 'e' ? { ...x, rol: plan[x.pl.i]?.rol || undefined } : x));
  const ent = (x) => (x.pl.t === 'a' ? ap[x.pl.i] : plan[x.pl.i]);
  [...new Set(out.map((x) => x.lado || '-'))].forEach((l) => {
    const del = out.map((x, i) => ({ x, i })).filter(({ x }) => x.pl && (x.lado || '-') === l && ent(x));
    const anclasP = del.filter(({ x }) => x.pl.t === 'e' && (!x.ap || x.hecha) && nSeg(x.peso) > 0);
    const anclasR = del.filter(({ x }) => x.pl.t === 'e' && (!x.ar || x.hecha) && nSeg(x.reps) > 0);
    const guia = (anclas, i, aprox) => (aprox ? anclas.find(({ x }) => x.rol === 'top' || x.rol === 'max') || anclas[0]
      : [...anclas].reverse().find((a) => a.i < i) || anclas.find((a) => a.i > i));
    del.forEach(({ x, i }) => {
      if (x.hecha) return; const e = ent(x); const y = { ...x };
      const gP = x.ap ? guia(anclasP, i, x.pl.t === 'a') : null;
      if (gP) { let P = nSeg(gP.x.peso) / (ent(gP.x).m || 1);
        if (cfg.k === 'rpe' && gP.i < i && gP.x.hecha && nSeg(gP.x.rpe) > 0) P *= 1 + ajusteRpe(gP.x.rpe, ej.rpe) / 100;
        y.peso = redondear(P * e.m, ej); }
      const gR = x.ar && x.pl.t === 'e' ? guia(anclasR, i, false) : null;
      if (gR) y.reps = repsPlan(nSeg(gR.x.reps) - ent(gR.x).dr, e, cfg, ej);
      out[i] = y;
    });
  });
  return out;
}
// Por RPE: según cómo le costó una serie, las siguientes suben o bajan (≈ 3 % por punto de RPE, hasta ±10 %)
export function ajusteRpe(rpe, objetivo) { const d = nSeg(rpe) - nSeg(objetivo || 8); return nSeg(rpe) > 0 ? lim(-d * 3, -10, 10) : 0; }
export const ajustarPorRpe = (filas, ej = {}, cfg = esquemaDe(ej)) => recalcular(filas, cfg, ej);
// Cambiar de esquema en pleno entreno: se rearma y se conserva lo que ya hizo o escribió
export function cambiarEsquema(filas, ej, historial, cfg) {
  const n = Math.max(1, nEf(filas) || ej.series || 3); const lados = filas.some((x) => x.lado);
  let nuevas = armarFilas({ ...ej, unilateral: lados }, historial, cfg, n);
  const clave = (x) => `${x.pl?.t || 'e'}${x.pl ? x.pl.i : ''}${x.lado || ''}`;
  const hechas = new Map(filas.filter((x) => x.hecha || x.tocada).map((x) => [clave(x), x]));
  nuevas = nuevas.map((x) => { const v = hechas.get(clave(x)); return v ? { ...x, peso: v.peso, reps: v.reps, rpe: v.rpe, hecha: v.hecha, tocada: v.tocada, ap: false, ar: false, ...(v.tecnica ? { tecnica: v.tecnica, subs: v.subs } : {}) } : x; });
  return recalcular(nuevas, cfg, ej);
}
// una serie más al final (con lados, una por lado), con su objetivo según el esquema
export function filasMasSerie(filas, cfg, ej = {}) {
  const lados = filas.some((x) => x.lado) ? ['D', 'I'] : [null];
  if (!cfg) return [...filas, ...lados.map((l) => ({ ...([...filas].reverse().find((x) => (l ? x.lado === l : true)) || {}), ...(l ? { lado: l } : {}), hecha: false, tocada: false, tecnica: undefined, subs: undefined }))];
  const i = nEf(filas);
  const nuevas = lados.map((l) => { const u = [...filas].reverse().find((x) => x.pl?.t === 'e' && (l ? x.lado === l : true)) || {};
    return { ...u, pl: { t: 'e', i }, ap: true, ar: true, rpe: '', hecha: false, tocada: false, tecnica: undefined, subs: undefined, ...(l ? { lado: l } : {}) }; });
  return recalcular([...filas, ...nuevas], cfg, ej);
}
export function filasMenosSerie(filas, cfg, ej = {}) {
  const n = filas.some((x) => x.lado) ? 2 : 1; const efs = cfg ? filas.filter((x) => x.pl?.t === 'e').length : filas.length;
  return efs > n ? recalcular(filas.slice(0, -n), cfg, ej) : filas;
}

// número que se ve en la fila: A1, A2… para la aproximación; 1, 2, 3… para las efectivas
export const etiquetaFila = (filas, k, numero) => { const x = filas[k]; return x?.pl ? (x.pl.t === 'a' ? `A${x.pl.i + 1}` : String(x.pl.i + 1)) : String(numero); };
// la misma serie la vez pasada (con lados, la del mismo lado)
export function previaFila(prev, filas, k, numero) {
  if (!prev?.series?.length) return null; const x = filas[k]; if (esAprox(x)) return null;
  const ps = prev.series.filter((y) => mismoLado(y, x.lado));
  if (x.pl) return ps[x.pl.i] || null;
  const n = numero - 1; return ps[n] || ps[ps.length - 1] || null;
}

// ---------- análisis en vivo ----------
const pct = (a, b) => (a > 0 && b > 0 ? ((a - b) / b) * 100 : null);
const e1De = (x) => e1rm(nSeg(x?.peso), nSeg(x?.reps));
const lista = (x) => (x.hecha || x.tocada) && nSeg(x.peso) > 0 && nSeg(x.reps) > 0;
const kg = (v) => `${fmtN(Math.round(nSeg(v) * 10) / 10)}`;
const signo = (p, d = 1) => (p == null ? '' : `${p > 0.05 ? '+' : p < -0.05 ? '−' : '±'}${fmtN(Math.abs(Number(p.toFixed(d))))} %`);
const clase = (p) => (p == null ? '' : p > 0.05 ? 'sube' : p < -0.05 ? 'baja' : '');
const flecha = (p) => (p > 0.05 ? '▲' : p < -0.05 ? '▼' : '=');

// con reps sugeridas por rango (8–10): dónde quedó la serie
export function notaRango(reps, ej = {}) {
  const r = rangoReps(ej.repsSugeridas); const n = nSeg(reps); if (!r || r.max <= r.min || !(n > 0)) return '';
  if (n > r.max) return ` · pasaste el rango ${r.min}–${r.max}: la próxima sube el peso`;
  if (n === r.max) return ` · tope del rango ${r.min}–${r.max} ✓`;
  if (n < r.min) return ` · debajo del rango ${r.min}–${r.max}`;
  return ` · en el rango ${r.min}–${r.max} ✓`;
}
// Una fila mientras se registra: qué significa según su papel en el esquema
export function analizarFila({ cfg, filas, k, prev, ej = {} }) {
  const x = filas[k]; if (!cfg || !x?.pl || !(x.hecha || x.tocada)) return null;
  const lado = x.lado || '-'; const del = filas.filter((y) => (y.lado || '-') === lado && y.pl?.t === 'e');
  const clave = del.find((y) => y.rol === 'top' || y.rol === 'max') || del[0];
  const prevL = (prev?.series || []).filter((y) => mismoLado(y, x.lado)); const prevClave = clavePrevia(prevL);
  if (x.pl.t === 'a') {
    const P = nSeg(clave?.peso); const p = P > 0 && nSeg(x.peso) > 0 ? Math.round((nSeg(x.peso) / P) * 100) : null;
    return { texto: `Aproximación${p ? ` al ${p} % de ${cfg.k === 'backoff' ? 'tu top set' : 'tu serie principal'}` : ''} · prepara la técnica, no suma a tu progreso`, clase: 'aprox' };
  }
  if (!lista(x)) return null;
  const antes = prevL[x.pl.i]; const vsAntes = antes && e1De(antes) > 0 ? pct(e1De(x), e1De(antes)) : null;
  const colaAntes = (txt) => (vsAntes != null ? ` · ${signo(vsAntes)} vs. ${txt} la vez pasada` : '');
  const esClave = x === clave || x.rol === 'top' || x.rol === 'max';
  if (cfg.k === 'rpe') {
    if (!(nSeg(x.rpe) > 0)) return { texto: `Anota el RPE de esta serie para ajustar la siguiente${colaAntes('esta serie')}`, clase: clase(vsAntes) };
    const adj = ajusteRpe(x.rpe, ej.rpe); const sig = redondear(nSeg(x.peso) * (1 + adj / 100), ej); const obj = nSeg(ej.rpe) || 8;
    const nr = notaRango(x.reps, ej);
    if (adj <= -2.5) return { texto: `▼ RPE ${fmtN(nSeg(x.rpe))} sobre el objetivo (${fmtN(obj)}): la siguiente baja a ${kg(sig)} kg${nr}${colaAntes('esta serie')}`, clase: 'baja' };
    if (adj >= 4.5) return { texto: `▲ RPE ${fmtN(nSeg(x.rpe))}: te sobró margen, la siguiente sube a ${kg(sig)} kg${nr}${colaAntes('esta serie')}`, clase: 'sube' };
    return { texto: `✓ En el RPE objetivo (${fmtN(obj)}): mantén ${kg(x.peso)} kg${nr}${colaAntes('esta serie')}`, clase: 'sube' };
  }
  if (cfg.k === 'recto') {
    const s1 = del[0]; const menos = s1 && s1 !== x && lista(s1) && nSeg(x.peso) >= nSeg(s1.peso) ? nSeg(s1.reps) - nSeg(x.reps) : 0;
    const nr = notaRango(x.reps, ej);
    if (vsAntes == null && menos < 2 && !nr) return null;
    const t = [vsAntes != null ? `${flecha(vsAntes)} ${signo(vsAntes)} vs. la vez pasada (${kg(antes.peso)} × ${antes.reps} kg)` : '', menos >= 2 ? `${menos} reps menos que la serie 1: alarga el descanso` : '', nr.slice(3)].filter(Boolean).join(' · ');
    return { texto: t, clase: menos >= 2 ? 'baja' : clase(vsAntes) };
  }
  const nombreClave = cfg.k === 'backoff' ? 'top set' : 'serie más pesada';
  if (esClave) {
    const p = prevClave && e1De(prevClave) > 0 ? pct(e1De(x), e1De(prevClave)) : null;
    const nr = notaRango(x.reps, ej);
    if (p == null) return { texto: `${cfg.k === 'backoff' ? 'Top set' : 'Serie más pesada'} de hoy: 1RM estimado ${kg(e1De(x))} kg${nr}. Es la referencia de ${cfg.k === 'backoff' ? 'tus back off' : 'las demás series'}`, clase: '' };
    return { texto: `${flecha(p)} ${signo(p)} de fuerza vs. tu ${nombreClave} anterior (${kg(prevClave.peso)} × ${prevClave.reps} kg)${nr}`, clase: clase(p) };
  }
  const Pc = nSeg(clave?.peso); if (!(Pc > 0)) return vsAntes != null ? { texto: `${flecha(vsAntes)} ${signo(vsAntes)} vs. la vez pasada`, clase: clase(vsAntes) } : null;
  const caida = pct(nSeg(x.peso), Pc);
  if (cfg.k === 'backoff') {
    if (nSeg(x.peso) > Pc) return { texto: 'Pesa más que tu top set: en back off cada serie va por debajo del top', clase: 'baja' };
    const e = planEsquema(cfg, del.length, ej)[x.pl.i]; const Rc = nSeg(clave.reps) - (planEsquema(cfg, del.length, ej)[clave.pl.i]?.dr || 0);
    const meta = Math.max(1, Math.round(Rc + (e?.dr || 0))); const faltan = meta - nSeg(x.reps);
    const base = cfg.modo === 'reps' && Math.abs(caida) < 0.5 ? 'Mismo peso del top' : `${signo(caida, 0)} del top`;
    return { texto: `${base} · ${nSeg(x.reps)} de ${meta} reps ${faltan > 0 ? `(faltaron ${faltan})` : '✓'}${colaAntes('este back off')}`, clase: faltan > 0 ? 'baja' : vsAntes != null ? clase(vsAntes) || 'sube' : 'sube' };
  }
  return { texto: `${signo(caida, 0)} de la serie más pesada${colaAntes('esta serie')}`, clase: clase(vsAntes) };
}

// El ejercicio completo, según el esquema: top set y back off, volumen de las series rectas, serie más pesada o RPE
// Lo que ve el asesorado: solo progreso positivo (lo negativo queda para el coach)
export function filaPositiva(r) {
  if (!r || (r.clase !== 'sube' && r.clase !== 'aprox')) return null;
  return { ...r, texto: r.texto.replace(/ · debajo del rango [^·]*/g, '').replace(/ · ±0 % vs\. [^·]*/g, '') };
}
export function ejercicioPositivo(r) {
  if (!r) return null; const partes = r.partes.filter((x) => x.v != null && x.v > 0.05);
  if (!partes.length && !r.record) return null;
  return { ...r, partes, clase: r.record ? 'record' : 'sube' };
}
export function analizarEjercicio({ cfg, filas, prev, rec = {}, ej = {} }) {
  if (!cfg) return null;
  const ef = filas.filter((x) => x.pl?.t === 'e' && x.lado !== 'I'); const hechas = ef.filter(lista); if (!hechas.length) return null;
  const prevEf = (prev?.series || []).filter((x) => !x.seg && x.lado !== 'I');
  const hoyMax = Math.max(...hechas.map(e1De)); const record = rec.maxE1 > 0 ? pct(hoyMax, rec.maxE1) : null;
  const partes = [];
  const volMismas = () => { const pares = hechas.map((x) => [x, prevEf[x.pl.i]]).filter(([, y]) => y && nSeg(y.peso) * nSeg(y.reps) > 0);
    if (!pares.length) return null; return pct(pares.reduce((t, [x]) => t + nSeg(x.peso) * nSeg(x.reps), 0), pares.reduce((t, [, y]) => t + nSeg(y.peso) * nSeg(y.reps), 0)); };
  if (cfg.k === 'backoff') {
    const top = hechas.find((x) => x.rol === 'top'); const pt = clavePrevia(prevEf);
    if (top && pt) partes.push({ t: 'Top set', v: pct(e1De(top), e1De(pt)) });
    const bo = hechas.filter((x) => x.rol === 'bo').map((x) => [x, prevEf[x.pl.i]]).filter(([, y]) => y && nSeg(y.peso) * nSeg(y.reps) > 0);
    if (bo.length) partes.push({ t: 'back off', v: pct(bo.reduce((t, [x]) => t + nSeg(x.peso) * nSeg(x.reps), 0), bo.reduce((t, [, y]) => t + nSeg(y.peso) * nSeg(y.reps), 0)), s: 'de volumen' });
  } else if (cfg.k === 'recto') {
    const v = volMismas(); if (v != null) partes.push({ t: 'Volumen', v, s: 'en las mismas series' });
  } else if (cfg.k === 'rpe') {
    const antes = Math.max(0, ...prevEf.map(e1De)); if (antes) partes.push({ t: 'Fuerza', v: pct(hoyMax, antes) });
    const rpes = hechas.map((x) => nSeg(x.rpe)).filter((v) => v > 0); if (rpes.length) partes.push({ t: 'RPE medio', txt: `${fmtN(Math.round((rpes.reduce((a, b) => a + b, 0) / rpes.length) * 10) / 10)} (objetivo ${fmtN(nSeg(ej.rpe) || 8)})` });
  } else {
    const mx = hechas.find((x) => x.rol === 'max'); const pm = clavePrevia(prevEf);
    if (mx && pm) partes.push({ t: 'Serie más pesada', v: pct(e1De(mx), e1De(pm)) });
    else { const v = volMismas(); if (v != null) partes.push({ t: 'Volumen', v, s: 'en las mismas series' }); }
  }
  const princ = partes.find((x) => x.v != null)?.v ?? null;
  if (!partes.length && !(record > 0)) return null;
  return { partes: partes.map((x) => ({ ...x, txt: x.txt || `${signo(x.v)}${x.s ? ` ${x.s}` : ''}` })), record: record > 0 ? record : null, clase: record > 0 ? 'record' : clase(princ), signo };
}
