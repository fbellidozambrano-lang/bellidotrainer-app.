import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Barra, Ico, ir, Hoja, Campo, Confirmar, Interruptor, Semana, useAviso, Placa } from '../ui/kit.jsx';
import { GRUPOS } from '../data/constants.js';
import { grupoDeEjercicio } from '../data/hevy.js';
import { SelectorBib, asegurarEnBib, Sugerencia } from './Biblioteca.jsx';
import { ejDesdeBib } from '../data/biblioteca.js';
import { colorGrupo, copiaEj, esTiempo, fmt, nDias, normEj, primerNombre, resumenEj, textoCarga, uuid, clonarDias, ytId } from '../lib/util.js';
import { esUnilateral } from '../lib/series.js';
import { mismoEj } from '../lib/nombres.js';
import { sesionesCon, renombrarEnSesiones, renombrarEnProgramas } from '../lib/renombrar.js';

// ---------- portapapeles de ejercicios (sirve entre asesorados) ----------
const KEY_PP = 'bt:portapapeles';
const leerPP = () => { try { return JSON.parse(localStorage.getItem(KEY_PP) || 'null'); } catch { return null; } };
function usePortapapeles() {
  const [pp, set] = useState(leerPP);
  useEffect(() => { const f = (e) => e.key === KEY_PP && set(leerPP()); addEventListener('storage', f); return () => removeEventListener('storage', f); }, []);
  return [pp, (v) => { try { v ? localStorage.setItem(KEY_PP, JSON.stringify(v)) : localStorage.removeItem(KEY_PP); } catch {} set(v); }];
}

// ---------- hoja de ejercicio ----------
export function HojaEjercicio({ inicial, sugerencias, biblioteca = [], esNuevo, onGuardar, onCerrar, onMover, onBorrar }) {
  const editando = !esNuevo && !!inicial?.ejercicio;
  const [e, setE] = useState(() => normEj(inicial || { series: 3, repMin: 8, repMax: 12, rpe: 8, descanso: 90 }));
  const [grupoTocado, setGT] = useState(!!inicial?.ejercicio); const [conf, setConf] = useState(false);
  const T = esTiempo(e); const f = (k, v) => setE((x) => ({ ...x, [k]: v }));
  const nombre = (v) => setE((x) => {
    const b = biblioteca.find((y) => y.nombre.toLowerCase() === v.trim().toLowerCase());
    if (b) return { ...x, ejercicio: v, grupo: b.grupo, tipo: b.tipo, video: x.video || b.video, bibId: b.id }; // elegido de la biblioteca
    const { bibId, ...r } = x; return { ...r, ejercicio: v, grupo: grupoTocado ? x.grupo : (v.trim().length > 3 ? grupoDeEjercicio(v) : x.grupo) };
  });
  return (
    <Hoja titulo={editando ? 'Editar ejercicio' : 'Nuevo ejercicio'} onCerrar={onCerrar}
      acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!e.ejercicio.trim()} onClick={() => onGuardar(normEj(e))}>Guardar</button></>}>
      <Campo l="Ejercicio"><input className="in" list="bt-ejs" autoFocus={!editando} value={e.ejercicio} onChange={(x) => nombre(x.target.value)} placeholder="Hip thrust con barra" />
        <datalist id="bt-ejs">{sugerencias.map((s) => <option key={s} value={s} />)}</datalist><Sugerencia valor={e.ejercicio} onUsar={nombre} /></Campo>
      <Campo l="Músculo principal"><select className="in" value={e.grupo} onChange={(x) => { setGT(true); f('grupo', x.target.value); }} style={{ borderLeft: `4px solid ${colorGrupo(e.grupo)}` }}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></Campo>
      <Campo l="Cómo se mide"><div className="seg"><button className={!T ? 'on' : ''} onClick={() => f('tipo', 'reps')}>Repeticiones</button><button className={T ? 'on' : ''} onClick={() => f('tipo', 'tiempo')}>Tiempo</button></div></Campo>
      <div className={T ? 'dos' : 'tres'}>
        <Campo l="Series"><input className="in num" style={{ fontSize: 20 }} inputMode="numeric" value={e.series} onChange={(x) => f('series', x.target.value)} /></Campo>
        {T ? <Campo l="Segundos"><input className="in num" style={{ fontSize: 20 }} inputMode="numeric" value={e.segundos} onChange={(x) => f('segundos', x.target.value)} /></Campo>
          : <><Campo l="Reps mín."><input className="in num" style={{ fontSize: 20 }} inputMode="numeric" value={e.repMin} onChange={(x) => f('repMin', x.target.value)} /></Campo>
            <Campo l="Reps máx."><input className="in num" style={{ fontSize: 20 }} inputMode="numeric" value={e.repMax} onChange={(x) => f('repMax', x.target.value)} /></Campo></>}
      </div>
      <Interruptor on={esUnilateral(e)} onChange={(v) => f('unilateral', v)} label="Un lado a la vez" ayuda={esUnilateral(e) ? 'Registra la derecha y la izquierda por separado.' : 'Actívalo en ejercicios unilaterales (búlgara, remo a una mano…).'} />
      <Campo l="Carga sugerida"><input className="in" value={e.pesoSugerido} onChange={(x) => f('pesoSugerido', x.target.value)} placeholder="22,5 kg · banda verde · máquina 3" /></Campo>
      <Campo l="RPE objetivo"><div className="chips">{[6, 7, 8, 9, 10].map((v) => <button key={v} className={`chip ${Number(e.rpe) === v ? 'on' : ''}`} style={{ minWidth: 48 }} onClick={() => f('rpe', v)}>{v}</button>)}</div></Campo>
      <Campo l="Descanso entre series"><div className="chips">{[45, 60, 90, 120, 150, 180].map((v) => <button key={v} className={`chip ${Number(e.descanso) === v ? 'on' : ''}`} onClick={() => f('descanso', v)}>{v < 120 ? `${v} s` : v === 150 ? '2:30' : `${v / 60} min`}</button>)}</div></Campo>
      <Campo l="Nota para el asesorado"><textarea className="in" rows={2} value={e.nota} onChange={(x) => f('nota', x.target.value)} placeholder="Tempo 3-1-1, pausa arriba, sube 2,5 kg si llegas a 12…" /></Campo>
      <Campo l="Video de YouTube" ayuda={e.video && !ytId(e.video) ? 'Ese enlace no parece de YouTube.' : null}><input className="in" inputMode="url" value={e.video} onChange={(x) => f('video', x.target.value)} placeholder="https://youtu.be/…" /></Campo>
      {editando && onMover && <div className="fila-btn" style={{ marginTop: 4 }}>
        <button className="btn chico" onClick={() => onMover(-1)}><Ico n="arriba" s={16} />Subir</button><button className="btn chico" onClick={() => onMover(1)}><Ico n="abajo" s={16} />Bajar</button>
        <button className="btn chico peligro" onClick={() => setConf(true)}><Ico n="basura" s={16} />Quitar</button></div>}
      {conf && <Confirmar titulo="¿Quitar el ejercicio?" texto={`${e.ejercicio} sale de este día. El historial no se borra.`} si="Quitar" peligro onNo={() => setConf(false)} onSi={onBorrar} />}
    </Hoja>
  );
}

// ---------- copiar ejercicios de otro asesorado ----------
function HojaCopiarDe({ datos, actual, destino, onPegar, onCerrar }) {
  const [quien, setQuien] = useState(null); const [sel, setSel] = useState({}); const [abierto, setAbierto] = useState(null);
  const con = datos.asesorados.filter((a) => datos.programas.some((p) => p.asesoradoId === a.id && nDias(p)));
  const ps = quien ? datos.programas.filter((p) => p.asesoradoId === quien.id) : [];
  const elegidos = ps.flatMap((p) => p.dias.flatMap((d) => d.ejercicios.filter((e) => sel[e.id])));
  const tog = (id) => setSel((s) => ({ ...s, [id]: !s[id] }));
  const todoDia = (d) => { const on = !d.ejercicios.every((e) => sel[e.id]); setSel((s) => { const n = { ...s }; d.ejercicios.forEach((e) => (n[e.id] = on)); return n; }); };
  return (
    <Hoja titulo={quien ? quien.nombre : 'Copiar de…'} onCerrar={onCerrar}
      acciones={quien && <><button className="btn" onClick={() => { setQuien(null); setSel({}); }}>Otro asesorado</button><button className="btn oro" disabled={!elegidos.length} onClick={() => onPegar(elegidos, `${primerNombre(quien.nombre)}`)}>Pegar {elegidos.length || ''} en {destino}</button></>}>
      {!quien ? <>
        <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>Elige de quién traer ejercicios. Solo se copian los ejercicios con sus series, reps, notas y videos; el historial no.</p>
        <div className="lista">{con.map((a) => <button key={a.id} className="item" onClick={() => { setQuien(a); const p0 = datos.programas.find((p) => p.asesoradoId === a.id); setAbierto(p0?.dias[0]?.id || null); }}>
          <Placa nombre={a.nombre} oro={a.id === actual} /><div className="item-t"><strong>{a.nombre}{a.id === actual ? ' (este)' : ''}</strong><span>{datos.programas.filter((p) => p.asesoradoId === a.id).map((p) => `${nDias(p)} días`).join(' · ')}</span></div><Ico n="chev" className="chev" s={18} /></button>)}</div>
      </> : ps.map((p) => (
        <div key={p.id} style={{ marginBottom: 14 }}>
          <p className="etq" style={{ marginBottom: 6 }}>{p.nombre}{/\d\s*d[ií]as?/i.test(p.nombre) ? '' : ` · ${nDias(p)} días`}</p>
          {p.dias.map((d) => { const n = d.ejercicios.filter((e) => sel[e.id]).length; const ab = abierto === d.id;
            return <div key={d.id} className="tarj" style={{ padding: 0, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
                <button style={{ flex: 1, textAlign: 'left', fontWeight: 600 }} onClick={() => setAbierto(ab ? null : d.id)}>{d.nombre} <span className="etq">· {d.ejercicios.length} ejercicios{n ? ` · ${n} elegidos` : ''}</span></button>
                <button className="btn chico" onClick={() => { todoDia(d); setAbierto(d.id); }}>{d.ejercicios.length && d.ejercicios.every((e) => sel[e.id]) ? 'Ninguno' : 'Todo el día'}</button>
              </div>
              {ab && <div style={{ padding: '0 14px 6px' }}>{d.ejercicios.map((e) => <button key={e.id} className="ej" onClick={() => tog(e.id)}>
                <span className={`ej-sel ${sel[e.id] ? 'on' : ''}`}>{sel[e.id] && <Ico n="check" s={16} w={3} />}</span><span className="ej-barra" style={{ background: colorGrupo(e.grupo) }} />
                <div className="ej-t"><strong>{e.ejercicio}</strong><span>{resumenEj(e)} · RPE {fmt(e.rpe, 1)}</span></div></button>)}
                {!d.ejercicios.length && <p className="etq" style={{ padding: '6px 0 10px' }}>Día vacío</p>}</div>}
            </div>; })}
        </div>))}
    </Hoja>
  );
}

// ---------- editor de programa ----------
export default function Editor({ a, p: inicial, datos, acc }) {
  const avisar = useAviso(); const nom = primerNombre(a.nombre);
  const [p, setP] = useState(inicial); const [diaId, setDiaId] = useState(() => sessionStorage.getItem('bt:dia:' + inicial.id) || inicial.dias[0]?.id);
  const [estado, setEstado] = useState('ok'); const pend = useRef(null); const tm = useRef(null);
  const [hoja, setHoja] = useState(null); const [selec, setSelec] = useState(null); const [pp, setPP] = usePortapapeles();
  const dia = p.dias.find((d) => d.id === diaId) || p.dias[0];
  useEffect(() => { if (dia) sessionStorage.setItem('bt:dia:' + p.id, dia.id); }, [dia, p.id]);

  const guardarYa = async () => { const x = pend.current; if (!x) return; pend.current = null; setEstado('pend'); try { await acc.guardarPrograma(x); setEstado(pend.current ? 'pend' : 'ok'); } catch { pend.current = pend.current || x; setEstado('err'); } };
  const pRef = useRef(p);
  const clon = (x) => (typeof structuredClone === 'function' ? structuredClone(x) : JSON.parse(JSON.stringify(x)));
  const cambiar = (fn) => { const n = typeof fn === 'function' ? fn(clon(pRef.current)) : fn; pRef.current = n; setP(n); pend.current = n; acc.ponerPrograma(n); setEstado('pend'); clearTimeout(tm.current); tm.current = setTimeout(guardarYa, 700); };
  const descartar = () => { clearTimeout(tm.current); pend.current = null; };
  useEffect(() => () => { clearTimeout(tm.current); guardarYa(); }, []); // eslint-disable-line
  useEffect(() => { const f = () => document.visibilityState === 'hidden' && guardarYa(); document.addEventListener('visibilitychange', f); return () => document.removeEventListener('visibilitychange', f); }, []); // eslint-disable-line

  const sugerencias = useMemo(() => [...new Set([...datos.biblioteca.map((b) => b.nombre), ...datos.programas.flatMap((x) => x.dias.flatMap((d) => d.ejercicios.map((e) => e.ejercicio)))])].sort(), [datos.programas, datos.biblioteca]);
  const conDia = (fn) => cambiar((x) => { const d = x.dias.find((y) => y.id === dia.id); fn(d, x); return x; });
  const pegar = (ejs, de) => { conDia((d) => d.ejercicios.push(...ejs.map(copiaEj))); avisar(`${ejs.length} ${ejs.length === 1 ? 'ejercicio pegado' : 'ejercicios pegados'} en ${dia.nombre}${de ? ` (de ${de})` : ''}`); };
  const elegidos = selec ? dia.ejercicios.filter((e) => selec[e.id]) : [];
  const sesA = useMemo(() => datos.sesiones.filter((s) => s.asesoradoId === a.id), [datos.sesiones, a.id]);
  // guarda el ejercicio; con "antes", además corrige el nombre en su historial y en sus otras rutinas
  async function guardarEj(e0, antes) {
    const e = await asegurarEnBib(e0, datos, acc);
    conDia((d) => { const i = d.ejercicios.findIndex((x) => x.id === e.id); if (i >= 0) d.ejercicios[i] = e; else d.ejercicios.push(e); });
    if (!antes) return;
    const grupo = e.grupo !== antes.grupo ? e.grupo : null;
    const ss = renombrarEnSesiones(sesA, antes.ejercicio, e.ejercicio, grupo);
    const ps = renombrarEnProgramas(datos.programas.filter((x) => x.asesoradoId === a.id), antes.ejercicio, e.ejercicio, grupo, p.id);
    // en esta misma rutina, otros días con el mismo ejercicio
    cambiar((x) => { x.dias.forEach((d) => d.ejercicios.forEach((y) => { if (y.id !== e.id && mismoEj(y.ejercicio, antes.ejercicio)) { y.ejercicio = e.ejercicio; if (grupo) y.grupo = grupo; } })); return x; });
    try { await acc.guardarSesiones(ss); if (ps.length) await acc.guardarProgramas(ps); avisar(ss.length ? `Nombre corregido en ${ss.length} ${ss.length === 1 ? 'sesión' : 'sesiones'} de su historial` : 'Nombre corregido'); } catch {}
  }

  if (!dia) return <div className="pantalla"><Barra volver={{ fn: () => ir('a', a.id, 'rutinas'), texto: 'Rutinas' }} titulo={p.nombre} />
    <div className="vacio" style={{ marginTop: 20 }}><b>Este programa no tiene días</b><button className="btn oro" style={{ marginTop: 12 }} onClick={() => cambiar((x) => { const id = uuid(); x.dias.push({ id, nombre: 'Día 1', ejercicios: [] }); setDiaId(id); return x; })}>Agregar un día</button></div></div>;

  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => { guardarYa(); ir('a', a.id, 'rutinas'); }, texto: 'Rutinas' }} titulo=""
        derecha={<><span className={`guardado ${estado === 'pend' ? 'pend' : estado === 'err' ? 'err' : ''}`}><i />{estado === 'pend' ? 'Guardando' : estado === 'err' ? 'Sin guardar' : 'Guardado'}</span>
          <button className="ico-b" onClick={() => setHoja({ t: 'prog' })} aria-label="Ajustes del programa"><Ico n="ajustes" /></button></>} />
      {estado === 'err' && <button className="aviso rojo" style={{ width: '100%', textAlign: 'left', marginTop: 10 }} onClick={guardarYa}><span>No se pudo guardar el último cambio. Toca para reintentar.</span></button>}
      <section className="frec">
        <b className="num">{nDias(p)}</b>
        <div><h1>{p.nombre}</h1><p className="etq">{nDias(p) === 1 ? 'día' : 'días'} por semana · de {nom}{p.visible === false ? ' · oculto' : ''}</p><div style={{ marginTop: 8 }}><Semana n={nDias(p)} /></div></div>
      </section>

      <nav className="tabs-dias" aria-label="Días">
        {p.dias.map((d) => <button key={d.id} className={`tab-dia ${d.id === dia.id ? 'on' : ''}`} onClick={() => { setDiaId(d.id); setSelec(null); }}>{d.nombre} <span style={{ opacity: .55 }}>{d.ejercicios.length}</span></button>)}
        <button className="tab-dia mas" onClick={() => cambiar((x) => { const id = uuid(); x.dias.push({ id, nombre: `Día ${x.dias.length + 1}`, ejercicios: [] }); setDiaId(id); return x; })} aria-label="Agregar día"><Ico n="mas" s={18} /></button>
      </nav>

      <div className="dia-cab"><h2>{dia.nombre}</h2><button className="ico-b" onClick={() => setHoja({ t: 'dia' })} aria-label="Ajustes del día"><Ico n="lapiz" s={20} /></button></div>
      <div className="herr">
        <button className="btn chico oro" onClick={() => setHoja({ t: 'bib' })}><Ico n="mas" s={16} />Ejercicio</button>
        <button className="btn chico" onClick={() => setHoja({ t: 'copiarDe' })}><Ico n="pegar" s={16} />Traer de otro asesorado</button>
        {dia.ejercicios.length > 0 && <button className="btn chico" onClick={() => setSelec(selec ? null : {})}><Ico n="seleccion" s={16} />{selec ? 'Listo' : 'Seleccionar'}</button>}
      </div>

      {dia.ejercicios.length === 0 ? <div className="vacio"><b>Día vacío</b>Agrega ejercicios, pégalos desde otro asesorado o usa los que copiaste.</div> :
        <div>{dia.ejercicios.map((e, i) => (
          <button key={e.id} className="ej" onClick={() => (selec ? setSelec((s) => ({ ...s, [e.id]: !s[e.id] })) : setHoja({ t: 'ej', e, i }))}>
            {selec && <span className={`ej-sel ${selec[e.id] ? 'on' : ''}`}>{selec[e.id] && <Ico n="check" s={16} w={3} />}</span>}
            <span className="ej-barra" style={{ background: colorGrupo(e.grupo) }} />
            <div className="ej-t"><strong>{e.ejercicio}</strong><span>{e.grupo} · {resumenEj(e)}{esUnilateral(e) ? ' por lado' : ''} · RPE {fmt(e.rpe, 1)} · {e.descanso} s{e.video ? ' · video' : ''}</span>
              {e.pesoSugerido && <span className="carga">{textoCarga(e.pesoSugerido)}</span>}{e.nota && <em>{e.nota}</em>}</div>
            {!selec && <Ico n="chev" className="chev" s={18} />}
          </button>))}</div>}

      {selec ? <div className="dock"><p><b>{elegidos.length}</b> elegidos<small>Toca los ejercicios para elegir</small></p>
        <button className="btn chico" disabled={!elegidos.length} onClick={() => { setPP({ de: `${nom} · ${dia.nombre}`, ejercicios: elegidos.map((x) => ({ ...x })), t: Date.now() }); setSelec(null); avisar(`${elegidos.length} copiados. Ve al asesorado y día donde quieras pegarlos`); }}><Ico n="copiar" s={16} />Copiar</button>
        <button className="btn chico" disabled={!elegidos.length} onClick={() => setHoja({ t: 'mover' })}>Mover</button>
        <button className="btn chico peligro" disabled={!elegidos.length} onClick={() => setHoja({ t: 'borrarSel' })}><Ico n="basura" s={16} /></button></div>
      : pp?.ejercicios?.length > 0 && <div className="dock"><p>{pp.ejercicios.length} ejercicios copiados<small>de {pp.de}</small></p>
        <button className="btn chico oro" onClick={() => pegar(pp.ejercicios)}><Ico n="pegar" s={16} />Pegar aquí</button>
        <button className="ico-b" onClick={() => setPP(null)} aria-label="Vaciar copiados"><Ico n="cerrar" s={18} /></button></div>}

      {hoja?.t === 'bib' && <SelectorBib biblioteca={datos.biblioteca} destino={dia.nombre} onCerrar={() => setHoja(null)} onNuevo={(q) => setHoja({ t: 'ej', e: q ? { ejercicio: q } : undefined, nuevo: true })}
        onElegir={(bs) => { conDia((d) => d.ejercicios.push(...bs.map(ejDesdeBib))); setHoja(null); avisar(`${bs.length} ${bs.length === 1 ? 'ejercicio agregado' : 'ejercicios agregados'} a ${dia.nombre}`); }} />}
      {hoja?.t === 'ej' && <HojaEjercicio biblioteca={datos.biblioteca} esNuevo={hoja.nuevo} inicial={hoja.nuevo ? (hoja.e ? { series: 3, repMin: 8, repMax: 12, rpe: 8, descanso: 90, ...hoja.e } : undefined) : hoja.e} sugerencias={sugerencias} onCerrar={() => setHoja(null)}
        onGuardar={async (e0) => {
          const antes = hoja.nuevo ? null : hoja.e;
          // le cambió el nombre a un ejercicio que ya tiene historial: ¿es el mismo (corrección) u otro?
          if (antes?.ejercicio && e0.ejercicio !== antes.ejercicio && sesionesCon(sesA, antes.ejercicio).length) {
            if (mismoEj(e0.ejercicio, antes.ejercicio)) { setHoja(null); await guardarEj(e0, antes); return; }
            setHoja({ t: 'renombrar', e0, antes }); return;
          }
          setHoja(null); await guardarEj(e0);
        }}
        onMover={(dir) => { conDia((d) => { const i = d.ejercicios.findIndex((x) => x.id === hoja.e.id); const j = i + dir; if (i < 0 || j < 0 || j >= d.ejercicios.length) return; [d.ejercicios[i], d.ejercicios[j]] = [d.ejercicios[j], d.ejercicios[i]]; }); setHoja(null); }}
        onBorrar={() => { conDia((d) => { d.ejercicios = d.ejercicios.filter((x) => x.id !== hoja.e.id); }); setHoja(null); }} />}
      {hoja?.t === 'renombrar' && (() => { const n = sesionesCon(sesA, hoja.antes.ejercicio).length; return (
        <Hoja titulo="¿Es el mismo ejercicio?" onCerrar={() => setHoja(null)}>
          <p className="muted" style={{ marginTop: -6, marginBottom: 14 }}>{nom} tiene <b style={{ color: 'var(--chalk)' }}>{n} {n === 1 ? 'sesión' : 'sesiones'}</b> registradas con <b style={{ color: 'var(--chalk)' }}>{hoja.antes.ejercicio}</b>.</p>
          <div className="tipos">
            <button className="tipo on" onClick={async () => { const { e0, antes } = hoja; setHoja(null); await guardarEj(e0, antes); }}><b><Ico n="check" s={20} /></b><div><strong>Sí, solo corrijo el nombre</strong><span>Todo su historial, récords y gráficas pasan a {hoja.e0.ejercicio}.</span></div></button>
            <button className="tipo" onClick={async () => { const { e0 } = hoja; setHoja(null); await guardarEj(e0); }}><b><Ico n="refrescar" s={20} /></b><div><strong>No, es otro ejercicio</strong><span>{hoja.e0.ejercicio} empieza su propio historial. Lo de {hoja.antes.ejercicio} queda guardado.</span></div></button>
          </div>
        </Hoja>); })()}
      {hoja?.t === 'copiarDe' && <HojaCopiarDe datos={datos} actual={a.id} destino={dia.nombre} onCerrar={() => setHoja(null)} onPegar={(ejs, de) => { pegar(ejs, de); setHoja(null); }} />}
      {hoja?.t === 'mover' && <Hoja titulo="Mover a otro día" onCerrar={() => setHoja(null)}>
        {p.dias.filter((d) => d.id !== dia.id).map((d) => <button key={d.id} className="item" onClick={() => { const ids = new Set(elegidos.map((x) => x.id)); cambiar((x) => { const o = x.dias.find((y) => y.id === dia.id); const m = o.ejercicios.filter((e) => ids.has(e.id)); o.ejercicios = o.ejercicios.filter((e) => !ids.has(e.id)); x.dias.find((y) => y.id === d.id).ejercicios.push(...m); return x; }); setSelec(null); setHoja(null); avisar(`Movidos a ${d.nombre}`); }}>
          <div className="item-t"><strong>{d.nombre}</strong><span>{d.ejercicios.length} ejercicios</span></div><Ico n="chev" className="chev" s={18} /></button>)}
        {p.dias.length < 2 && <p className="muted">Este programa tiene un solo día.</p>}
      </Hoja>}
      {hoja?.t === 'borrarSel' && <Confirmar titulo={`¿Quitar ${elegidos.length} ejercicios?`} texto={`Salen de ${dia.nombre}. El historial de ${nom} no se borra.`} si="Quitar" peligro onNo={() => setHoja(null)}
        onSi={() => { const ids = new Set(elegidos.map((x) => x.id)); conDia((d) => { d.ejercicios = d.ejercicios.filter((e) => !ids.has(e.id)); }); setSelec(null); setHoja(null); }} />}
      {hoja?.t === 'dia' && <HojaDia dia={dia} p={p} onCerrar={() => setHoja(null)} cambiar={cambiar} setDiaId={setDiaId} />}
      {hoja?.t === 'prog' && <HojaPrograma p={p} a={a} datos={datos} acc={acc} cambiar={cambiar} descartar={descartar} onCerrar={() => setHoja(null)} />}
    </div>
  );
}

function HojaDia({ dia, p, cambiar, setDiaId, onCerrar }) {
  const [nombre, setNombre] = useState(dia.nombre); const [conf, setConf] = useState(false);
  const i = p.dias.findIndex((d) => d.id === dia.id);
  const mover = (dir) => cambiar((x) => { const j = i + dir; if (j < 0 || j >= x.dias.length) return x; [x.dias[i], x.dias[j]] = [x.dias[j], x.dias[i]]; return x; });
  return (
    <Hoja titulo="Día" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cerrar</button><button className="btn oro" disabled={!nombre.trim()} onClick={() => { cambiar((x) => { x.dias[i].nombre = nombre.trim(); return x; }); onCerrar(); }}>Guardar</button></>}>
      <Campo l="Nombre del día"><input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Pierna · glúteo" /></Campo>
      <div className="chips" style={{ marginBottom: 14 }}>{['Pierna', 'Torso', 'Empuje', 'Tracción', 'Full body', 'Glúteo', 'Superior', 'Inferior'].map((s) => <button key={s} className="chip" onClick={() => setNombre(s)}>{s}</button>)}</div>
      <div className="fila-btn">
        <button className="btn chico" disabled={i === 0} onClick={() => mover(-1)}><Ico n="atras" s={16} />Antes</button>
        <button className="btn chico" disabled={i === p.dias.length - 1} onClick={() => mover(1)}>Después<Ico n="chev" s={16} /></button>
        <button className="btn chico" onClick={() => { const id = uuid(); cambiar((x) => { x.dias.splice(i + 1, 0, { id, nombre: `${dia.nombre} (copia)`, ejercicios: dia.ejercicios.map(copiaEj) }); return x; }); setDiaId(id); onCerrar(); }}><Ico n="duplicar" s={16} />Duplicar</button>
        <button className="btn chico peligro" disabled={p.dias.length < 2} onClick={() => setConf(true)}><Ico n="basura" s={16} />Borrar</button>
      </div>
      {conf && <Confirmar titulo={`¿Borrar ${dia.nombre}?`} texto={`El programa queda con ${p.dias.length - 1} días. Sus ${dia.ejercicios.length} ejercicios se quitan.`} si="Borrar día" peligro onNo={() => setConf(false)}
        onSi={() => { cambiar((x) => { x.dias.splice(i, 1); return x; }); setDiaId(p.dias[i === 0 ? 1 : i - 1]?.id); onCerrar(); }} />}
    </Hoja>
  );
}

function HojaPrograma({ p, a, datos, acc, cambiar, descartar, onCerrar }) {
  const avisar = useAviso(); const [nombre, setNombre] = useState(p.nombre); const [nota, setNota] = useState(p.nota || ''); const [conf, setConf] = useState(false); const [aQuien, setAQuien] = useState(false);
  const nom = primerNombre(a.nombre);
  return (
    <Hoja titulo="Programa" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cerrar</button><button className="btn oro" onClick={() => { cambiar((x) => ({ ...x, nombre: nombre.trim() || x.nombre, nota })); onCerrar(); }}>Guardar</button></>}>
      <Campo l="Nombre"><input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
      <Campo l={`Mensaje para ${nom}`}><textarea className="in" rows={2} value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Para las semanas en que solo puedes 3 días." /></Campo>
      <Interruptor on={p.visible !== false} onChange={(v) => cambiar((x) => ({ ...x, visible: v }))} label={`Visible para ${nom}`} ayuda="Apágalo mientras lo armas" />
      <div className="lista" style={{ marginTop: 8 }}>
        <button className="item" onClick={() => setAQuien(true)}><Ico n="copiar" /><div className="item-t"><strong>Copiar programa a otro asesorado</strong><span>Solo los ejercicios</span></div></button>
        <button className="item" onClick={async () => { const c = { ...p, id: uuid(), nombre: `${p.nombre} (copia)`, dias: clonarDias(p.dias), orden: (p.orden || 0) + 1 }; await acc.guardarPrograma(c); onCerrar(); avisar('Programa duplicado'); ir('a', a.id, 'p', c.id); }}><Ico n="duplicar" /><div className="item-t"><strong>Duplicar</strong><span>Para hacer una variante</span></div></button>
        <button className="item" style={{ color: 'var(--bad)' }} onClick={() => setConf(true)}><Ico n="basura" /><div className="item-t"><strong>Borrar programa</strong><span>Las sesiones ya hechas se conservan</span></div></button>
      </div>
      {aQuien && <Hoja titulo="Copiar a…" onCerrar={() => setAQuien(false)}>
        <div className="lista">{datos.asesorados.filter((x) => x.id !== a.id && !x.archivado).map((x) => <button key={x.id} className="item" onClick={async () => {
          const c = { id: uuid(), asesoradoId: x.id, nombre: p.nombre, nota: p.nota, visible: true, orden: datos.programas.filter((y) => y.asesoradoId === x.id).length + 1, dias: clonarDias(p.dias) };
          await acc.guardarPrograma(c); setAQuien(false); avisar(`Copiado a ${primerNombre(x.nombre)}`); }}><Placa nombre={x.nombre} /><div className="item-t"><strong>{x.nombre}</strong><span>{datos.programas.filter((y) => y.asesoradoId === x.id).length} programas</span></div></button>)}</div>
      </Hoja>}
      {conf && <Confirmar titulo="¿Borrar el programa?" texto={`${p.nombre} desaparece de las rutinas de ${nom}. Las sesiones que ya hizo quedan en su historial.`} si="Borrar" peligro onNo={() => setConf(false)} onSi={async () => { setConf(false); onCerrar(); descartar(); await acc.borrarPrograma(p.id); avisar('Programa borrado'); ir('a', a.id, 'rutinas'); }} />}
    </Hoja>
  );
}
