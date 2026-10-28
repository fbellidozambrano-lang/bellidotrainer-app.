// Periodización: análisis de los registros de cada asesorado y la fase que conviene ahora,
// con los pasos para llevarla a cabo. El coach decide; los botones solo ahorran trabajo.
import React, { useMemo, useState } from 'react';
import { Barra, Hoja, Ico, Placa, ir, useAviso, Confirmar } from '../ui/kit.jsx';
import { analizarTodos, programaDescarga, aplicarCargas } from '../lib/periodizacion.js';
import { fmt, fCorta, haceCuanto, primerNombre } from '../lib/util.js';

export const ESTADOS = {
  descarga: { n: 'Descarga', c: 'rojo' },
  estancado: { n: 'Estancado', c: 'naranja' },
  retomar: { n: 'Retomar', c: 'naranja' },
  progresando: { n: 'Progresando', c: 'verde' },
  estable: { n: 'Avance lento', c: 'oro' },
  adaptacion: { n: 'Adaptación', c: 'gris' },
  'sin-datos': { n: 'Sin datos', c: 'gris' },
};
const signo = (v) => (v == null ? '—' : `${v > 0 ? '+' : ''}${fmt(v, 1)} %`);

function Tarjeta({ r, abierta, onAbrir, acc }) {
  const avisar = useAviso(); const [conf, setConf] = useState(null); const m = r.metricas; const e = ESTADOS[r.estado]; const nom = primerNombre(r.a.nombre);
  async function crearDescarga() { const d = programaDescarga(r.programa); setConf(null); await acc.guardarPrograma(d); avisar(`Descarga creada para ${nom} (oculta). Revísala y actívala`); ir('a', r.a.id, 'p', d.id); }
  async function subirCargas() { setConf(null); await acc.guardarPrograma(aplicarCargas(r.programa, r.subidas)); avisar(`Cargas sugeridas actualizadas en ${r.programa.nombre}`); }
  return (
    <article className={`peri ${abierta ? 'abierta' : ''}`}>
      <button className="peri-cab" onClick={onAbrir} aria-expanded={abierta}>
        <Placa nombre={r.a.nombre} />
        <div className="item-t"><strong>{r.a.nombre}</strong><span>{r.resumen}</span></div>
        <span className={`estado ${e.c}`}>{e.n}</span>
      </button>
      {abierta && <div className="peri-cuerpo">
        {r.estado !== 'sin-datos' && <div className="peri-kpis">
          <div><b className="num">{fmt(m.porSem, 1)}{m.meta ? <small>/{m.meta}</small> : null}</b><span>días por semana</span></div>
          <div><b className={`num ${m.tendencia > 0.4 ? 'sube' : m.tendencia < -0.4 ? 'baja' : ''}`}>{signo(m.tendencia)}</b><span>fuerza por semana</span></div>
          <div><b className="num">{m.rpe ? fmt(m.rpe, 1) : '—'}</b><span>RPE 2 semanas{m.rpeAntes ? ` (antes ${fmt(m.rpeAntes, 1)})` : ''}</span></div>
          <div><b className="num">{m.sinDescarga}</b><span>semanas seguidas sin descargar</span></div>
        </div>}
        <div className="plan">
          <p className="etq">Sugerencia</p>
          <h3>{r.plan.nombre}</h3>
          <p className="plan-meta"><Ico n="reloj" s={15} />{r.plan.duracion} · {r.plan.objetivo}</p>
          {r.plan.semanas && <ol className="plan-sem">{r.plan.semanas.map(([t, x]) => <li key={t}><b>{t}</b><span>{x}</span></li>)}</ol>}
          <p className="etq" style={{ marginTop: 14 }}>Cómo llevarlo a cabo</p>
          <ol className="plan-pasos">{r.plan.pasos.map((x, i) => <li key={i}>{x}</li>)}</ol>
        </div>
        {r.notas.length > 0 && r.notas.map((x, i) => <p key={i} className="aviso" style={{ marginTop: 10 }}><Ico n="ojo" s={18} /><span>{x}</span></p>)}
        {r.ejercicios.evaluados > 0 && <div className="peri-ejs">
          <p className="etq">Fuerza estimada por ejercicio · últimas 6 semanas</p>
          {[...r.ejercicios.suben, ...r.ejercicios.estancados, ...r.ejercicios.bajan].slice(0, 10).map((x) => <div key={x.ejercicio} className="peri-ej"><span>{x.ejercicio}</span><small>{x.sesiones} sesiones</small><b className={x.cambio >= 0.75 ? 'sube' : x.cambio <= -0.75 ? 'baja' : ''}>{signo(x.cambio)}/sem</b></div>)}
        </div>}
        <div className="fila-btn" style={{ marginTop: 14 }}>
          {r.accion === 'descarga' && <button className="btn oro" onClick={() => setConf('descarga')}><Ico n="duplicar" s={18} />Crear descarga</button>}
          {r.accion === 'cargas' && <button className="btn oro" onClick={() => setConf('cargas')}><Ico n="subir" s={18} />Actualizar cargas</button>}
          {r.programa && <button className="btn" onClick={() => ir('a', r.a.id, 'p', r.programa.id)}><Ico n="lapiz" s={18} />Rutina</button>}
          <button className="btn" onClick={() => ir('a', r.a.id, 'metricas')}><Ico n="grafica" s={18} />Métricas</button>
        </div>
        {m.ultimo && <p className="ayuda" style={{ margin: '10px 0 0' }}>Último entreno {haceCuanto(m.ultimo)} · {m.sesiones} sesiones en {m.semanas} {m.semanas === 1 ? 'semana' : 'semanas'}.</p>}
      </div>}
      {conf === 'descarga' && <Confirmar titulo="¿Crear la semana de descarga?" texto={`Se crea “Descarga · ${r.programa.nombre}” con la mitad de las series, RPE 6–7 y cargas al 88 %. Queda oculta para ${nom} hasta que la actives.`} si="Crear" onNo={() => setConf(null)} onSi={crearDescarga} />}
      {conf === 'cargas' && <Hoja titulo="Subir cargas sugeridas" onCerrar={() => setConf(null)} acciones={<><button className="btn" onClick={() => setConf(null)}>Cancelar</button><button className="btn oro" onClick={subirCargas}>Actualizar {r.subidas.length}</button></>}>
        <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>En su última sesión llegó al tope del rango con RPE ≤ 8,5. Se cambia la carga sugerida en {r.programa.nombre}:</p>
        <div className="lista">{r.subidas.map((x) => <div key={x.id} className="item"><div className="item-t"><strong>{x.ejercicio}</strong><span>{fmt(x.de, 1)} kg × {x.reps} el {fCorta(x.fecha)}</span></div><b className="num sube-t">{fmt(x.de, 1)} → {fmt(x.a, 1)} kg</b></div>)}</div>
      </Hoja>}
    </article>
  );
}

export default function Periodizacion({ datos, acc, inicial }) {
  const lista = useMemo(() => analizarTodos(datos), [datos]);
  const [abierto, setAbierto] = useState(inicial || (lista[0]?.estado === 'descarga' ? lista[0].a.id : null));
  const cuenta = lista.reduce((o, r) => ({ ...o, [r.estado]: (o[r.estado] || 0) + 1 }), {});
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 12px' }}><h1 className="gigante">Periodización</h1>
        <p className="sub">Leo los registros de cada asesorado (fuerza estimada, RPE, volumen y constancia de las últimas semanas) y te sugiero la siguiente fase con sus pasos. Tú decides si la aplicas.</p></section>
      <div className="chips" style={{ marginBottom: 6 }}>{Object.keys(ESTADOS).filter((k) => cuenta[k]).map((k) => <span key={k} className={`estado ${ESTADOS[k].c}`}>{cuenta[k]} · {ESTADOS[k].n}</span>)}</div>
      {!lista.length && <div className="vacio"><b>Todavía no tienes asesorados</b>Cuando registren entrenos, aquí aparece qué fase le conviene a cada uno.</div>}
      {lista.map((r) => <Tarjeta key={r.a.id} r={r} acc={acc} abierta={abierto === r.a.id} onAbrir={() => setAbierto(abierto === r.a.id ? null : r.a.id)} />)}
    </div>
  );
}
