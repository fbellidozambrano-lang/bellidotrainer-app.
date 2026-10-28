// Periodización sugerida: lee los registros de un asesorado (fuerza, RPE, volumen, constancia)
// y propone la siguiente fase con pasos concretos. La decisión siempre es del coach.
import { aFecha, cargaNumero, diasEntre, ejerciciosDe, fechaLocal, fmt, hoy, lunesDe, nSeg, progresion, r05, seriesDe, uuid, clonarDias } from './util.js';
import { mismoEj } from './nombres.js';

const INFERIOR = new Set(['Cuádriceps', 'Isquiotibiales', 'Glúteo', 'Isquios / Glúteo', 'Cuádriceps / Glúteo', 'Aductores', 'Abductores', 'Gemelos']);
const GRANDES = new Set(['Pecho', 'Espalda amplitud', 'Espalda alta', 'Cuádriceps', 'Isquiotibiales', 'Glúteo', 'Isquios / Glúteo', 'Cuádriceps / Glúteo', 'Hombro lateral']);
const pct = (v) => `${v > 0 ? '+' : ''}${fmt(v, 1)} %`;
const media = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mediana = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const restar = (f, dias) => { const d = aFecha(f); d.setDate(d.getDate() - dias); return fechaLocal(d); };

// pendiente en % por semana (regresión lineal sobre la fuerza estimada de cada sesión)
export function tendencia(puntos) {
  if (puntos.length < 3) return null;
  const x0 = aFecha(puntos[0].fecha); const xs = puntos.map((p) => (aFecha(p.fecha) - x0) / (7 * 864e5)); const ys = puntos.map((p) => p.v);
  if (xs[xs.length - 1] < 1.4) return null; // menos de ~10 días: no alcanza para medir
  const mx = media(xs), my = media(ys); let num = 0, den = 0;
  xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; });
  return den && my ? (num / den / my) * 100 : null;
}

// semanas seguidas entrenando "en serio" (sin una semana suave o sin entrenar) hasta hoy
export function semanasSinDescarga(sesiones, ref = hoy()) {
  const porSemana = new Map(); sesiones.forEach((s) => { const l = lunesDe(s.fecha); porSemana.set(l, (porSemana.get(l) || 0) + (s.series || []).length); });
  const base = mediana([...porSemana.values()]); if (!base) return 0;
  let n = 0; let l = lunesDe(ref);
  if ((porSemana.get(l) || 0) < base * 0.6) l = restar(l, 7); // la semana actual puede estar recién empezando
  while ((porSemana.get(l) || 0) >= base * 0.6) { n++; l = restar(l, 7); }
  return n;
}

// el programa que más usó en las últimas 3 semanas
export function programaActual(programas, sesiones, ref = hoy()) {
  const cuenta = new Map(); sesiones.filter((s) => diasEntre(s.fecha, ref) <= 21 && s.programaId).forEach((s) => cuenta.set(s.programaId, (cuenta.get(s.programaId) || 0) + 1));
  const vis = programas.filter((p) => p.visible !== false && (p.dias || []).length);
  return [...vis].sort((a, b) => (cuenta.get(b.id) || 0) - (cuenta.get(a.id) || 0) || (a.orden || 0) - (b.orden || 0))[0] || null;
}

// ejercicios que la última vez completaron el tope del rango: toca subir carga
export function subidasDeCarga(programa, sesiones) {
  if (!programa) return [];
  const out = [];
  (programa.dias || []).forEach((d) => (d.ejercicios || []).forEach((e) => {
    if (e.tipo === 'tiempo' || out.some((x) => mismoEj(x.ejercicio, e.ejercicio))) return;
    const s = [...sesiones].filter((x) => seriesDe(x, e.ejercicio).length).sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0]; if (!s) return;
    const ss = seriesDe(s, e.ejercicio).filter((x) => nSeg(x.peso) > 0 && nSeg(x.reps) > 0); if (!ss.length) return;
    const tope = ss.filter((x) => nSeg(x.reps) >= (e.repMax || 12)).length; const rpe = media(ss.map((x) => nSeg(x.rpe)).filter(Boolean));
    if (tope < Math.ceil(ss.length * 0.66) || rpe > 8.5) return;
    const p = Math.max(...ss.map((x) => nSeg(x.peso)));
    const sube = p < 10 ? 1 : p < 30 ? 2 : INFERIOR.has(e.grupo) ? 5 : 2.5;
    out.push({ id: e.id, ejercicio: e.ejercicio, grupo: e.grupo, de: p, a: r05(p + sube), fecha: s.fecha, reps: Math.max(...ss.map((x) => nSeg(x.reps))) });
  }));
  return out;
}

export function aplicarCargas(programa, subidas) {
  const m = new Map(subidas.map((x) => [x.ejercicio, x]));
  return { ...programa, dias: programa.dias.map((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => { const x = [...m.values()].find((y) => mismoEj(y.ejercicio, e.ejercicio)); return x && e.tipo !== 'tiempo' ? { ...e, pesoSugerido: `${String(x.a).replace('.', ',')} kg` } : e; }) })) };
}

// copia del programa para una semana de descarga (queda oculta para que el coach la revise)
export function programaDescarga(p) {
  return { id: uuid(), asesoradoId: p.asesoradoId, nombre: `Descarga · ${p.nombre}`.slice(0, 80), orden: (p.orden || 0) + 1, visible: false,
    nota: 'Semana de descarga: mismas técnicas, la mitad de las series y cargas un poco más bajas. Deja 3–4 repeticiones en reserva y no llegues al fallo.',
    dias: clonarDias(p.dias).map((d) => ({ ...d, ejercicios: d.ejercicios.map((e) => { const c = cargaNumero(e.pesoSugerido);
      return { ...e, series: Math.max(1, Math.ceil((e.series || 3) / 2)), rpe: Math.max(6, Math.min(7, (e.rpe || 8) - 2)), pesoSugerido: c ? `${String(r05(c * 0.88)).replace('.', ',')} kg` : e.pesoSugerido,
        nota: ['Descarga: ~85–90 % de tu carga habitual.', e.nota].filter(Boolean).join(' ') }; }) })) };
}

// ---------- análisis de un asesorado ----------
export function analizar(a, sesiones = [], programas = [], ref = hoy()) {
  const ses = [...sesiones].sort((x, y) => (x.fecha < y.fecha ? -1 : 1));
  const ultimo = ses.length ? ses[ses.length - 1].fecha : null;
  const meta = Math.round(media(programas.filter((p) => p.visible !== false && (p.dias || []).length).map((p) => p.dias.length))) || 0;
  const ult28 = ses.filter((s) => diasEntre(s.fecha, ref) < 28);
  const porSem = new Set(ult28.map((s) => s.fecha + s.dia)).size / 4;
  const semanas = ses.length ? Math.max(1, Math.ceil((diasEntre(ses[0].fecha, ref) + 1) / 7)) : 0;

  // fuerza por ejercicio (últimas 6 semanas)
  const desde = restar(ref, 42); const reciente = ses.filter((s) => s.fecha >= desde);
  const suben = [], estancados = [], bajan = [];
  ejerciciosDe(reciente).forEach((ej) => {
    const pts = progresion(reciente, ej).filter((p) => p.e1rm > 0).map((p) => ({ fecha: p.fecha, v: p.e1rm }));
    const t = tendencia(pts); if (t == null) return;
    const x = { ejercicio: ej, cambio: Math.round(t * 10) / 10, sesiones: pts.length, e1rm: pts[pts.length - 1].v };
    (t >= 0.75 ? suben : t <= -0.75 ? bajan : estancados).push(x);
  });
  suben.sort((x, y) => y.cambio - x.cambio); bajan.sort((x, y) => x.cambio - y.cambio);
  const evaluados = suben.length + estancados.length + bajan.length;
  const tend = evaluados ? Math.round(mediana([...suben, ...estancados, ...bajan].map((x) => x.cambio)) * 10) / 10 : null;

  // esfuerzo percibido: últimas 2 semanas frente a las 4 anteriores
  const rpeDe = (ss) => media(ss.flatMap((s) => (s.series || []).map((x) => nSeg(x.rpe)).filter((v) => v >= 5)));
  const rpe = rpeDe(ses.filter((s) => diasEntre(s.fecha, ref) < 14)); const rpeAntes = rpeDe(ses.filter((s) => diasEntre(s.fecha, ref) >= 14 && diasEntre(s.fecha, ref) < 42));
  const repsProm = media(reciente.flatMap((s) => (s.series || []).map((x) => nSeg(x.reps)).filter((v) => v > 0)));
  const sinDescarga = semanasSinDescarga(ses, ref);

  // series semanales por músculo (último mes) para los grupos de sus rutinas
  const enRutina = new Set(programas.filter((p) => p.visible !== false).flatMap((p) => (p.dias || []).flatMap((d) => (d.ejercicios || []).map((e) => e.grupo))));
  const series = {}; ult28.forEach((s) => (s.series || []).forEach((x) => { const g = x.grupo || 'Core'; series[g] = (series[g] || 0) + (x.lado ? 0.5 : 1); }));
  const musculos = [...enRutina].map((g) => ({ grupo: g, semana: Math.round(((series[g] || 0) / 4) * 10) / 10 }));
  const bajos = musculos.filter((m) => GRANDES.has(m.grupo) && m.semana < 8).sort((x, y) => x.semana - y.semana);
  const altos = musculos.filter((m) => m.semana > 22).sort((x, y) => y.semana - x.semana);

  const actual = programaActual(programas, ses, ref);
  const metricas = { sesiones: ses.length, semanas, porSem: Math.round(porSem * 10) / 10, meta, tendencia: tend, rpe: rpe ? Math.round(rpe * 10) / 10 : null, rpeAntes: rpeAntes ? Math.round(rpeAntes * 10) / 10 : null, sinDescarga, ultimo, repsProm: Math.round(repsProm) };
  const base = { a, metricas, ejercicios: { suben, estancados, bajan, evaluados }, musculos: { bajos, altos }, programa: actual };

  // notas que acompañan a cualquier fase
  const notas = [];
  if (meta && ult28.length && porSem < meta * 0.6) notas.push(`Entrena ${fmt(porSem, 1)} días por semana de ${meta} planificados. Antes de cambiar la fase, ajusta la rutina a los días que de verdad puede (un plan de ${Math.max(2, Math.round(porSem))} días bien hecho rinde más).`);
  if (bajos.length) notas.push(`Pocas series semanales en ${bajos.slice(0, 3).map((m) => `${m.grupo} (${fmt(m.semana, 1)})`).join(', ')}. Para crecer, apunta a 10–20 series por semana: suma 2–4.`);
  if (altos.length) notas.push(`Mucho volumen en ${altos.slice(0, 2).map((m) => `${m.grupo} (${fmt(m.semana, 1)} series/sem)`).join(', ')}: si no progresa ahí, recorta 20–30 %.`);

  const fin = (o) => ({ ...base, ...o, notas });

  if (!ses.length) return fin({ estado: 'sin-datos', prioridad: 0, titulo: 'Sin registros todavía', resumen: 'Cuando registre sus primeros entrenos aparece el análisis.',
    plan: { nombre: 'Fase de adaptación', duracion: '2–3 semanas', objetivo: 'Aprender la técnica y tener sus primeras marcas.', pasos: ['Rangos de 10–15 repeticiones con RPE 6–7.', 'Que registre todas las series con el peso real: con 6 sesiones la app ya puede medir su progreso.', 'Sube la carga cuando haga 15 repeticiones limpias.'] } });

  const dSin = diasEntre(ultimo, ref);
  if (dSin > 14) return fin({ estado: 'retomar', prioridad: 3, titulo: 'Volver a entrenar', resumen: `Lleva ${dSin} días sin registrar entrenos.`,
    plan: { nombre: 'Re-entrada gradual', duracion: '2 semanas', objetivo: 'Volver sin dolores ni lesiones y recuperar sus cargas.',
      semanas: [['Semana 1', 'Dos tercios de las series (3 → 2), cargas 15 % más bajas que su última vez y RPE 6–7.'], ['Semana 2', 'Series completas, cargas 5–10 % más bajas, RPE 7–8.'], ['Semana 3', 'Vuelve a su programa normal y a la progresión de siempre.']],
      pasos: ['Escríbele: pregunta qué pasó (viaje, trabajo, molestia) y confirma cuántos días puede entrenar ahora.', 'Si no puede ir al gym, que use “Ejercicios de casa” para no cortar la constancia.'] } });

  if (ses.length < 6 || semanas < 3) return fin({ estado: 'adaptacion', prioridad: 1, titulo: 'Recién empieza', resumen: `${ses.length} ${ses.length === 1 ? 'sesión' : 'sesiones'} registradas: todavía son pocas para medir tendencia.`,
    plan: { nombre: 'Fase de adaptación', duracion: `${Math.max(1, 3 - semanas + 1)}–3 semanas más`, objetivo: 'Afinar técnica y encontrar sus cargas de trabajo.',
      pasos: ['Rangos de 10–15 repeticiones con RPE 6–7: que termine cada serie con 3–4 repeticiones en reserva.', 'Doble progresión: primero sube repeticiones hasta el tope del rango y después la carga.', 'Revisa que registre todas las series con el peso real; con 6 sesiones aparece su tendencia de fuerza.'] } });

  const rpeSube = rpe && rpeAntes && rpe - rpeAntes >= 0.5;
  const fatiga = (sinDescarga >= 5 && ((tend != null && tend <= 0.25) || rpe >= 8.8 || rpeSube)) || sinDescarga >= 8 || (evaluados >= 3 && bajan.length / evaluados >= 0.4);
  if (fatiga) {
    const motivo = [sinDescarga >= 5 ? `${sinDescarga} semanas seguidas sin descargar` : '', rpeSube ? `RPE subiendo (${fmt(rpeAntes, 1)} → ${fmt(rpe, 1)})` : rpe >= 8.8 ? `RPE promedio ${fmt(rpe, 1)}` : '', bajan.length ? `${bajan.length} ${bajan.length === 1 ? 'ejercicio bajando' : 'ejercicios bajando'}` : tend != null ? `fuerza ${pct(tend)}/sem` : ''].filter(Boolean).join(' · ');
    return fin({ estado: 'descarga', prioridad: 5, titulo: 'Necesita descarga', resumen: motivo, accion: actual ? 'descarga' : null,
      plan: { nombre: 'Semana de descarga', duracion: '1 semana', objetivo: 'Bajar la fatiga acumulada para que vuelva a subir sus marcas.',
        semanas: [['Esta semana', 'Mismos ejercicios y días. La mitad de las series (4 → 2, 3 → 2), cargas al 85–90 % de las que usa y RPE 6–7. Nada al fallo ni drop sets / rest-pause.'], ['La siguiente', 'Vuelve a su programa con las cargas de antes de la descarga. En 1–2 semanas deberían aparecer marcas nuevas.']],
        pasos: [actual ? `Toca “Crear descarga”: se arma una copia de ${actual.nombre} con la mitad de las series, RPE 6–7 y cargas al 88 %. Queda oculta para que la revises.` : 'Arma una copia de su programa con la mitad de las series y RPE 6–7.', 'En la rutina de descarga activa “Visible” y oculta la normal esa semana; después, al revés.', 'Avísale por WhatsApp que es una semana para recuperar, no para buscar récords.'] } });
  }

  const estancado = evaluados >= 2 && (estancados.length + bajan.length) / evaluados >= 0.5 && (tend ?? 0) < 0.5;
  if (estancado) {
    const lista = [...estancados, ...bajan].slice(0, 4).map((x) => x.ejercicio).join(', ');
    const alto = repsProm >= 9;
    const plan = alto
      ? { nombre: 'Bloque de intensificación', duracion: '4 semanas', objetivo: 'Romper el estancamiento con más carga y menos repeticiones.',
        semanas: [['Semana 1', 'Básicos en 6–8 repeticiones con cargas 5–7,5 % más altas. Una serie menos en accesorios. RPE 8.'], ['Semana 2', 'Mismos rangos; si completó todas las series, +2,5 % de carga.'], ['Semana 3', 'Básicos en 5–6 repeticiones, RPE 8–9. Accesorios igual.'], ['Semana 4', 'Descarga: la mitad de las series, RPE 6–7.']],
        pasos: [`Cambia el rango de los básicos (${lista}) a 6–8 repeticiones y sube la carga sugerida.`, 'Al volver a 8–12 repeticiones después del bloque, debería mover más peso que antes.', 'Si un ejercicio sigue igual, cambia la variante y mantén el patrón (barra ↔ mancuernas, plano ↔ inclinado).'] }
      : { nombre: 'Bloque de acumulación', duracion: '4 semanas', objetivo: 'Construir más volumen de trabajo para tener de dónde sacar fuerza después.',
        semanas: [['Semana 1', 'Rango de 10–12 repeticiones con cargas 10 % más bajas. +1 serie en los músculos con menos volumen. RPE 7–8.'], ['Semana 2', 'Si recupera bien (RPE ≤ 8 y sin molestias), +1 serie más en esos músculos.'], ['Semana 3', 'Mismo volumen; que suba repeticiones o carga en cada sesión.'], ['Semana 4', 'Descarga: la mitad de las series, RPE 6–7. Después vuelve a rangos más pesados.']],
        pasos: [`Pasa ${lista} a 10–12 repeticiones con algo menos de carga.`, 'Suma series primero donde el volumen está bajo.', 'Si un ejercicio sigue igual, cambia la variante y mantén el patrón (barra ↔ mancuernas, plano ↔ inclinado).'] };
    if (a?.nivel === 'Avanzado') plan.pasos.push('Opción para avanzado: periodización ondulante semanal: día pesado 4–6 reps (RPE 8–9), día medio 8–10, día liviano 12–15.');
    return fin({ estado: 'estancado', prioridad: 4, titulo: 'Fuerza estancada', resumen: `${estancados.length + bajan.length} de ${evaluados} ejercicios sin progreso en 6 semanas · fuerza ${pct(tend ?? 0)}/sem`, plan });
  }

  const subidas = subidasDeCarga(actual, ses);
  const proxima = Math.max(1, 6 - sinDescarga);
  if ((tend ?? 0) >= 0.5) return fin({ estado: 'progresando', prioridad: 2, titulo: 'Progresando', resumen: `Fuerza ${pct(tend)} por semana · ${suben.length} de ${evaluados} ejercicios subiendo`, subidas, accion: subidas.length ? 'cargas' : null,
    plan: { nombre: 'Seguir con progresión lineal', duracion: `${proxima}–${proxima + 1} semanas`, objetivo: 'Aprovechar que está respondiendo: mismo programa, más carga.',
      pasos: ['Mantén el mismo programa: está funcionando.', 'Regla de subida: cuando complete todas las series en el tope del rango con RPE ≤ 8, sube la carga (+2,5 kg tren superior, +5 kg tren inferior, o la mancuerna siguiente).', 'Si no llega al mínimo del rango, mantiene la carga la semana siguiente.', subidas.length ? `Ya toca subir en ${subidas.length} ${subidas.length === 1 ? 'ejercicio' : 'ejercicios'}: toca “Actualizar cargas”.` : 'Revisa sus últimas series para subir la carga donde llegó al tope.', `Planifica una descarga en ${proxima} ${proxima === 1 ? 'semana' : 'semanas'} (al cumplir 5–6 seguidas).`] } });

  return fin({ estado: 'estable', prioridad: 2, titulo: 'Avance lento', resumen: `Fuerza ${pct(tend ?? 0)} por semana · RPE ${rpe ? fmt(rpe, 1) : '—'}`, subidas, accion: subidas.length ? 'cargas' : null,
    plan: { nombre: 'Sobrecarga progresiva más precisa', duracion: '3–4 semanas', objetivo: 'Que cada semana haya un poco más: una repetición o un poco de carga.',
      pasos: ['Pídele RPE 8 en todas las series efectivas (2 repeticiones en reserva): si anota 6–7, le falta intensidad.', 'Doble progresión: sube repeticiones dentro del rango y, al llegar al tope en todas las series, la carga.', subidas.length ? `Ya toca subir en ${subidas.length} ${subidas.length === 1 ? 'ejercicio' : 'ejercicios'}: toca “Actualizar cargas”.` : 'Pon una carga sugerida en cada ejercicio para que sepa con qué empezar.', `Planifica una descarga en ${proxima} ${proxima === 1 ? 'semana' : 'semanas'}.`] } });
}

export const ORDEN_ESTADO = { descarga: 0, estancado: 1, retomar: 2, progresando: 3, estable: 4, adaptacion: 5, 'sin-datos': 6 };
export function analizarTodos(datos, ref = hoy()) {
  return datos.asesorados.filter((a) => !a.archivado).map((a) => analizar(a, datos.sesiones.filter((s) => s.asesoradoId === a.id), datos.programas.filter((p) => p.asesoradoId === a.id), ref))
    .sort((x, y) => ORDEN_ESTADO[x.estado] - ORDEN_ESTADO[y.estado] || x.a.nombre.localeCompare(y.a.nombre));
}
