import React, { useMemo, useState } from 'react';
import { Barra, Ico, ir, Hoja, Campo, Confirmar, useAviso } from '../ui/kit.jsx';
import { GRUPOS } from '../data/constants.js';
import { grupoDeEjercicio } from '../data/hevy.js';
import { colorGrupo, esTiempo, primerNombre, ytId } from '../lib/util.js';
import { armarBiblioteca, propagarVideo, fusionar, posiblesDuplicados, nuevoItem, claveEj, buscarEnBib, correcciones, corregirNombre } from '../data/biblioteca.js';

const KEY_IGN = 'bt:bib:distintos';
const leerIgn = () => { try { return JSON.parse(localStorage.getItem(KEY_IGN) || '[]'); } catch { return []; } };
const sinAcento = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export const coincide = (b, q) => !q || [b.nombre, ...(b.alias || [])].some((n) => sinAcento(n).includes(sinAcento(q)));
const ordenGrupo = (g) => { const i = GRUPOS.indexOf(g); return i < 0 ? 99 : i; };
export const porGrupo = (lista) => { const m = new Map(); [...lista].sort((a, b) => ordenGrupo(a.grupo) - ordenGrupo(b.grupo) || a.nombre.localeCompare(b.nombre)).forEach((b) => { if (!m.has(b.grupo)) m.set(b.grupo, []); m.get(b.grupo).push(b); }); return [...m.entries()]; };

// Quién usa cada ejercicio de la biblioteca
function usoDe(datos) {
  const m = new Map();
  datos.programas.forEach((p) => (p.dias || []).forEach((d) => (d.ejercicios || []).forEach((e) => { if (!e.bibId) return; if (!m.has(e.bibId)) m.set(e.bibId, new Set()); m.get(e.bibId).add(p.asesoradoId); })));
  return m;
}

function FiltroGrupos({ lista, grupo, setGrupo }) {
  const gs = [...new Set(lista.map((b) => b.grupo))].sort((a, b) => ordenGrupo(a) - ordenGrupo(b));
  if (gs.length < 2) return null;
  return <div className="chips scroll-x" style={{ marginBottom: 12 }}><button className={`chip ${!grupo ? 'on' : ''}`} onClick={() => setGrupo('')}>Todos</button>
    {gs.map((g) => <button key={g} className={`chip ${grupo === g ? 'on' : ''}`} onClick={() => setGrupo(grupo === g ? '' : g)}><i className="punto" style={{ background: colorGrupo(g) }} />{g}</button>)}</div>;
}

// Un ejercicio escrito a mano en una rutina: se enlaza a la biblioteca o entra como nuevo
export async function asegurarEnBib(e, datos, acc) {
  if (e.bibId && datos.biblioteca.some((b) => b.id === e.bibId)) return e;
  const m = buscarEnBib(datos.biblioteca, e.ejercicio);
  if (m) return { ...e, bibId: m.id, video: e.video || m.video };
  if (datos.faltaTablas) return e;
  const item = nuevoItem({ nombre: e.ejercicio, grupo: e.grupo, tipo: e.tipo, video: e.video || '', base: { series: e.series, repMin: e.repMin, repMax: e.repMax, segundos: e.segundos, descanso: e.descanso, rpe: e.rpe } });
  try { await acc.guardarEjercicios([item]); } catch { return e; }
  return { ...e, bibId: item.id };
}

// ---------- elegir ejercicios de la biblioteca (se usa en rutinas y plantillas) ----------
export function SelectorBib({ biblioteca, destino, onElegir, onNuevo, onCerrar }) {
  const [q, setQ] = useState(''); const [grupo, setGrupo] = useState(''); const [sel, setSel] = useState([]);
  const lista = biblioteca.filter((b) => (!grupo || b.grupo === grupo) && coincide(b, q));
  const tog = (b) => setSel((s) => (s.some((x) => x.id === b.id) ? s.filter((x) => x.id !== b.id) : [...s, b]));
  return (
    <Hoja titulo="Agregar de la biblioteca" onCerrar={onCerrar}
      acciones={<><button className="btn" onClick={() => onNuevo(q)}>Escribir uno nuevo</button><button className="btn oro" disabled={!sel.length} onClick={() => onElegir(sel)}>Agregar {sel.length || ''}{destino ? ` a ${destino}` : ''}</button></>}>
      {!biblioteca.length ? <div className="vacio"><b>Tu biblioteca está vacía</b>Ármala desde Equipo → Biblioteca con los ejercicios que ya usas, o escribe uno nuevo.</div> : <>
        <div className="buscar" style={{ marginTop: 0 }}><Ico n="buscar" s={18} /><input className="in" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" /></div>
        <FiltroGrupos lista={biblioteca} grupo={grupo} setGrupo={setGrupo} />
        {sel.length > 0 && <p className="etq" style={{ marginBottom: 8 }}>En orden: {sel.map((b) => b.nombre).join(' → ')}</p>}
        {lista.map((b) => { const i = sel.findIndex((x) => x.id === b.id); return (
          <button key={b.id} className="ej" onClick={() => tog(b)}>
            <span className={`ej-sel ${i >= 0 ? 'on' : ''}`}>{i >= 0 && <b className="num" style={{ fontSize: 14 }}>{i + 1}</b>}</span>
            <span className="ej-barra" style={{ background: colorGrupo(b.grupo) }} />
            <div className="ej-t"><strong>{b.nombre}</strong><span>{b.grupo} · {b.base?.series || 3} × {esTiempo(b) ? `${b.base?.segundos || 40} s` : `${b.base?.repMin || 8}–${b.base?.repMax || 12}`}{b.video ? ' · video' : ''}</span></div>
          </button>); })}
        {!lista.length && <p className="vacio">Nada con “{q}”. Toca <b>Escribir uno nuevo</b> y queda guardado en la biblioteca.</p>}
      </>}
    </Hoja>
  );
}

// ---------- ficha de un ejercicio ----------
function HojaItem({ inicial, datos, acc, uso, onCerrar }) {
  const avisar = useAviso(); const nuevo = !datos.biblioteca.some((x) => x.id === inicial.id);
  const [b, setB] = useState(() => ({ ...inicial, base: { ...(inicial.base || {}) }, alias: [...(inicial.alias || [])] }));
  const [grupoTocado, setGT] = useState(!nuevo); const [unir, setUnir] = useState(false); const [conf, setConf] = useState(false); const [qU, setQU] = useState('');
  const f = (k, v) => setB((x) => ({ ...x, [k]: v })); const fb = (k, v) => setB((x) => ({ ...x, base: { ...x.base, [k]: v } }));
  const T = b.tipo === 'tiempo';
  const repetido = datos.biblioteca.find((x) => x.id !== b.id && claveEj(x.nombre) === claveEj(b.nombre) && claveEj(b.nombre));
  const quienes = [...(uso.get(b.id) || [])].map((id) => datos.asesorados.find((a) => a.id === id)).filter(Boolean);
  const num = (v, d) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : d; };
  async function guardar() {
    const item = { ...b, nombre: b.nombre.trim(), base: { series: num(b.base.series, 3), repMin: num(b.base.repMin, 8), repMax: Math.max(num(b.base.repMin, 8), num(b.base.repMax, 12)), segundos: num(b.base.segundos, 40), descanso: Math.max(0, parseInt(b.base.descanso, 10) || 0), rpe: num(b.base.rpe, 8) } };
    await acc.guardarEjercicios([item]);
    let msg = nuevo ? `${item.nombre} agregado` : 'Ejercicio guardado';
    if (!nuevo && item.video && item.video !== inicial.video) {
      const r = propagarVideo(datos.programas, item, inicial.video || '');
      if (r.n) { await acc.guardarProgramas(r.programas); msg = `Video puesto en ${r.n} ${r.n === 1 ? 'rutina' : 'rutinas'} de tus asesorados`; }
    }
    avisar(msg); onCerrar();
  }
  async function unirCon(otro) {
    const r = fusionar(b, otro, datos.programas);
    await acc.guardarEjercicios([r.destino]); if (r.programas.length) await acc.guardarProgramas(r.programas); await acc.borrarEjercicio(otro.id);
    avisar(`${otro.nombre} quedó dentro de ${b.nombre}`); onCerrar();
  }
  return (
    <Hoja titulo={nuevo ? 'Nuevo ejercicio' : 'Ejercicio'} onCerrar={onCerrar}
      acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!b.nombre.trim() || !!repetido} onClick={guardar}>Guardar</button></>}>
      <Campo l="Nombre"><input className="in" autoFocus={nuevo} value={b.nombre} onChange={(e) => { const v = e.target.value; setB((x) => ({ ...x, nombre: v, grupo: grupoTocado ? x.grupo : (v.trim().length > 3 ? grupoDeEjercicio(v) : x.grupo) })); }} placeholder="Extensión de cuádriceps" /><Sugerencia valor={b.nombre} onUsar={(v) => f('nombre', v)} /></Campo>
      {repetido && <p className="aviso rojo"><span>Ya tienes <b>{repetido.nombre}</b> en la biblioteca. Edita ese o ponle otro nombre.</span></p>}
      <Campo l="Músculo principal"><select className="in" value={b.grupo} onChange={(e) => { setGT(true); f('grupo', e.target.value); }} style={{ borderLeft: `4px solid ${colorGrupo(b.grupo)}` }}>{GRUPOS.map((g) => <option key={g}>{g}</option>)}</select></Campo>
      <Campo l="Cómo se mide"><div className="seg"><button className={!T ? 'on' : ''} onClick={() => f('tipo', 'reps')}>Repeticiones</button><button className={T ? 'on' : ''} onClick={() => f('tipo', 'tiempo')}>Tiempo</button></div></Campo>
      <Campo l="Video de YouTube" ayuda={b.video && !ytId(b.video) ? 'Ese enlace no parece de YouTube.' : !nuevo ? 'Al cambiarlo se pone en las rutinas de tus asesorados que no tenían video.' : null}><input className="in" inputMode="url" value={b.video} onChange={(e) => f('video', e.target.value)} placeholder="https://youtu.be/…" /></Campo>
      <p className="etq" style={{ margin: '4px 0 8px' }}>Valores con que entra a una rutina</p>
      <div className="tres">
        <Campo l="Series"><input className="in num" inputMode="numeric" value={b.base.series ?? ''} onChange={(e) => fb('series', e.target.value)} /></Campo>
        {T ? <Campo l="Segundos"><input className="in num" inputMode="numeric" value={b.base.segundos ?? ''} onChange={(e) => fb('segundos', e.target.value)} /></Campo>
          : <><Campo l="Reps mín."><input className="in num" inputMode="numeric" value={b.base.repMin ?? ''} onChange={(e) => fb('repMin', e.target.value)} /></Campo>
            <Campo l="Reps máx."><input className="in num" inputMode="numeric" value={b.base.repMax ?? ''} onChange={(e) => fb('repMax', e.target.value)} /></Campo></>}
      </div>
      <div className="dos"><Campo l="Descanso (s)"><input className="in num" inputMode="numeric" value={b.base.descanso ?? ''} onChange={(e) => fb('descanso', e.target.value)} /></Campo>
        <Campo l="RPE"><input className="in num" inputMode="decimal" value={b.base.rpe ?? ''} onChange={(e) => fb('rpe', e.target.value)} /></Campo></div>
      <Campo l="Indicación de técnica"><textarea className="in" rows={2} value={b.tecnica || ''} onChange={(e) => f('tecnica', e.target.value)} placeholder="Entra como nota del ejercicio al ponerlo en una rutina" /></Campo>
      {b.alias.length > 0 && <Campo l="También se escribe así">
        <div className="chips">{b.alias.map((n) => <span key={n} className="chip on alias">{n}<button aria-label={`Quitar ${n}`} onClick={() => setB((x) => ({ ...x, alias: x.alias.filter((y) => y !== n) }))}><Ico n="cerrar" s={14} /></button></span>)}</div>
        <p className="ayuda" style={{ margin: '8px 0 0' }}>Son los nombres con que aparece en las rutinas de tus asesorados. Cada uno conserva su nombre y su historial.</p></Campo>}
      {!nuevo && <p className="etq" style={{ margin: '4px 0 10px' }}>{quienes.length ? `En las rutinas de ${quienes.map((a) => primerNombre(a.nombre)).join(', ')}` : 'Todavía no está en ninguna rutina'}</p>}
      {!nuevo && <div className="fila-btn"><button className="btn chico" onClick={() => setUnir(true)}><Ico n="duplicar" s={16} />Unir con otro</button><button className="btn chico peligro" onClick={() => setConf(true)}><Ico n="basura" s={16} />Borrar</button></div>}
      {unir && <Hoja titulo={`Unir con ${b.nombre}`} onCerrar={() => setUnir(false)}>
        <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>El que elijas pasa a ser una forma de escribir <b>{b.nombre}</b>. Las rutinas y el historial de tus asesorados no cambian.</p>
        <div className="buscar" style={{ marginTop: 0 }}><Ico n="buscar" s={18} /><input className="in" placeholder="Buscar" value={qU} onChange={(e) => setQU(e.target.value)} /></div>
        <div className="lista">{datos.biblioteca.filter((x) => x.id !== b.id && coincide(x, qU)).sort((x, y) => (x.grupo === b.grupo ? -1 : 0) - (y.grupo === b.grupo ? -1 : 0) || x.nombre.localeCompare(y.nombre)).slice(0, 60).map((x) =>
          <button key={x.id} className="item" onClick={() => unirCon(x)}><span className="ej-barra" style={{ background: colorGrupo(x.grupo), height: 30 }} /><div className="item-t"><strong>{x.nombre}</strong><span>{x.grupo}</span></div></button>)}</div>
      </Hoja>}
      {conf && <Confirmar titulo={`¿Borrar ${b.nombre}?`} texto="Sale de la biblioteca. Las rutinas de tus asesorados que lo tienen no cambian, ni su historial." si="Borrar" peligro onNo={() => setConf(false)} onSi={async () => { setConf(false); await acc.borrarEjercicio(b.id); avisar('Borrado de la biblioteca'); onCerrar(); }} />}
    </Hoja>
  );
}

// ---------- ortografía ----------
export function AvisoOrtografia({ datos, acc }) {
  const [ver, setVer] = useState(false); const c = useMemo(() => correcciones(datos), [datos]);
  if (!c.cambios.length) return null;
  return <>
    <button className="aviso" style={{ width: '100%', textAlign: 'left' }} onClick={() => setVer(true)}><Ico n="lapiz" s={20} style={{ flex: 'none', marginTop: 1 }} />
      <span><b>{c.cambios.length} {c.cambios.length === 1 ? 'nombre tiene' : 'nombres tienen'} errores de escritura</b> en rutinas, días o ejercicios. Toca para revisarlos.</span></button>
    {ver && <HojaOrtografia c={c} acc={acc} onCerrar={() => setVer(false)} />}
  </>;
}
function HojaOrtografia({ c, acc, onCerrar }) {
  const avisar = useAviso(); const [ocupado, setOcupado] = useState(false);
  const unicos = []; const vistos = new Set(); c.cambios.forEach((x) => { const k = `${x.antes}→${x.despues}`; const u = vistos.has(k) ? unicos.find((y) => y.k === k) : null; if (u) { u.n++; if (!u.donde.includes(x.donde)) u.donde.push(x.donde); } else { vistos.add(k); unicos.push({ ...x, k, n: 1, donde: [x.donde] }); } });
  async function aplicar() {
    setOcupado(true);
    try { await acc.guardarEjercicios(c.biblioteca); await acc.guardarPlantillas(c.plantillas); await acc.guardarProgramas(c.programas); avisar(`${c.cambios.length} nombres corregidos`); onCerrar(); } catch {}
    setOcupado(false);
  }
  return (
    <Hoja titulo="Corregir nombres" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Ahora no</button><button className="btn oro" disabled={ocupado} onClick={aplicar}>{ocupado ? 'Corrigiendo…' : 'Corregir todo'}</button></>}>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Se corrigen en las rutinas de tus asesorados, plantillas y biblioteca. El historial no se toca y cada ejercicio sigue mostrando su progreso con el nombre nuevo.</p>
      <div className="lista">{unicos.map((x) => <div key={x.k} className="item" style={{ alignItems: 'flex-start' }}>
        <div className="item-t"><span className="tachado">{x.antes}</span><strong>{x.despues}</strong><span>{x.tipo} · {x.donde.slice(0, 4).join(', ')}{x.donde.length > 4 ? '…' : ''}{x.n > 1 ? ` · ${x.n} veces` : ''}</span></div></div>)}</div>
    </Hoja>
  );
}
// sugerencia bajo un campo de nombre
export function Sugerencia({ valor, onUsar }) {
  const c = corregirNombre(valor); if (!valor?.trim() || c === valor.trim()) return null;
  return <button type="button" className="sugerencia" onClick={() => onUsar(c)}>¿Quisiste decir <b>{c}</b>?</button>;
}

// ---------- posibles duplicados ----------
function HojaDuplicados({ pares, datos, acc, onIgnorar, onCerrar }) {
  const avisar = useAviso(); const uso = usoDe(datos);
  const n = (b) => (uso.get(b.id)?.size || 0);
  return (
    <Hoja titulo="¿Son el mismo ejercicio?" onCerrar={onCerrar}>
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Estos nombres se parecen. Si son el mismo, únelos: queda uno solo en la biblioteca y nadie pierde su historial.</p>
      {pares.slice(0, 30).map(([x, y]) => { const [d, o] = n(y) > n(x) ? [y, x] : [x, y]; return (
        <div key={x.id + y.id} className="tarj" style={{ marginBottom: 8 }}>
          <p style={{ fontWeight: 600 }}>{x.nombre}</p><p style={{ fontWeight: 600, marginBottom: 10 }}>{y.nombre}</p>
          <div className="fila-btn"><button className="btn chico oro" onClick={async () => { const r = fusionar(d, o, datos.programas); await acc.guardarEjercicios([r.destino]); if (r.programas.length) await acc.guardarProgramas(r.programas); await acc.borrarEjercicio(o.id); avisar(`Unidos en ${d.nombre}`); }}>Unir en “{d.nombre}”</button>
            <button className="btn chico" onClick={() => onIgnorar(x, y)}>Son distintos</button></div>
        </div>); })}
      {!pares.length && <p className="vacio">No quedan parecidos por revisar.</p>}
    </Hoja>
  );
}

// ---------- pantalla ----------
export default function Biblioteca({ datos, acc, usuario }) {
  const avisar = useAviso(); const salt = (usuario?.id || 'local') + ':';
  const [q, setQ] = useState(''); const [grupo, setGrupo] = useState(''); const [hoja, setHoja] = useState(null); const [ocupado, setOcupado] = useState(false);
  const [ign, setIgn] = useState(leerIgn);
  const bib = datos.biblioteca; const uso = useMemo(() => usoDe(datos), [datos]);
  const plan = useMemo(() => armarBiblioteca(datos, salt), [datos, salt]);
  const pares = useMemo(() => posiblesDuplicados(bib, ign), [bib, ign]);
  const lista = bib.filter((b) => (!grupo || b.grupo === grupo) && coincide(b, q));
  const nombres = new Set(datos.programas.flatMap((p) => (p.dias || []).flatMap((d) => (d.ejercicios || []).map((e) => e.ejercicio.trim().toLowerCase())))).size;
  const hayNovedad = plan.nuevos > 0 || plan.videos > 0 || plan.enlaces > 0;
  const sinArmar = !bib.length || (plan.nuevos >= 5 && plan.nuevos >= bib.length * 2); // todavía no se armó con lo existente

  async function armar() {
    setOcupado(true);
    try {
      await acc.guardarEjercicios(plan.guardar); await acc.guardarProgramas(plan.programas);
      avisar(bib.length ? `Biblioteca al día: ${plan.nuevos} nuevos${plan.videos ? `, ${plan.videos} videos repartidos` : ''}` : `Biblioteca lista: ${plan.biblioteca.length} ejercicios${plan.videos ? ` y ${plan.videos} videos repartidos` : ''}`);
    } catch {} setOcupado(false);
  }
  const ignorar = (x, y) => { const n = [...ign, [x.id, y.id].sort().join(':')]; setIgn(n); try { localStorage.setItem(KEY_IGN, JSON.stringify(n)); } catch {} };

  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 16px' }}>
        <h1 className="gigante">Biblioteca</h1>
        <p className="sub">{bib.length && !sinArmar ? `${bib.length} ${bib.length === 1 ? 'ejercicio' : 'ejercicios'} · ${bib.filter((b) => b.video).length} con video` : 'Tu repertorio de ejercicios, cada uno una sola vez.'}</p>
      </section>
      {datos.faltaTablas && <p className="aviso rojo"><span><b>Falta actualizar la base de datos.</b> Corre otra vez el archivo schema.sql en Supabase → SQL Editor para guardar la biblioteca y las plantillas.</span></p>}
      <AvisoOrtografia datos={datos} acc={acc} />

      {sinArmar ? <div className="tarj destacado">
        <h3>Arma tu biblioteca con lo que ya tienes</h3>
        <p style={{ margin: '6px 0 14px' }}>Junto los ejercicios de las rutinas de tus asesorados, de su historial y de las plantillas. Los que están escritos distinto pero son el mismo (“Extensión de cuádriceps”, “extensiones cuadriceps”…) quedan en uno solo.</p>
        <div className="kpis" style={{ marginBottom: 14 }}>
          <div className="kpi"><b className="num">{plan.biblioteca.length}</b><span>ejercicios distintos</span></div>
          <div className="kpi"><b className="num">{nombres}</b><span>nombres en rutinas</span></div>
          <div className="kpi"><b className="num">{plan.videos}</b><span>videos para repartir</span></div>
        </div>
        <p className="ayuda" style={{ margin: '0 0 14px' }}>El historial de cada asesorado no se toca. En sus rutinas solo se agrega el video donde faltaba.</p>
        <button className="btn oro full" disabled={ocupado || !plan.biblioteca.length || datos.faltaTablas} onClick={armar}>{ocupado ? 'Armando…' : 'Crear biblioteca'}</button>
      </div> : <>
        {hayNovedad && <button className="aviso" style={{ width: '100%', textAlign: 'left' }} disabled={ocupado} onClick={armar}><Ico n="refrescar" s={20} style={{ flex: 'none', marginTop: 1 }} />
          <span>{[plan.nuevos && `${plan.nuevos} ${plan.nuevos === 1 ? 'ejercicio nuevo' : 'ejercicios nuevos'} en las rutinas`, plan.videos && `${plan.videos} ${plan.videos === 1 ? 'rutina puede recibir' : 'rutinas pueden recibir'} video`].filter(Boolean).join(' · ') || 'Hay rutinas sin enlazar a la biblioteca'}. <b>Toca para actualizar.</b></span></button>}
        {pares.length > 0 && <button className="aviso" style={{ width: '100%', textAlign: 'left' }} onClick={() => setHoja({ t: 'dup' })}><Ico n="duplicar" s={20} style={{ flex: 'none', marginTop: 1 }} /><span><b>{pares.length} {pares.length === 1 ? 'pareja parece' : 'parejas parecen'} el mismo ejercicio.</b> Toca para revisarlas.</span></button>}
        <div className="buscar"><Ico n="buscar" s={18} /><input className="in" placeholder="Buscar ejercicio" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar ejercicio" /></div>
        <FiltroGrupos lista={bib} grupo={grupo} setGrupo={setGrupo} />
        {porGrupo(lista).map(([g, bs]) => <div key={g}>
          <div className="sec"><h2><i className="punto" style={{ background: colorGrupo(g) }} />{g}</h2><span>{bs.length}</span></div>
          {bs.map((b) => { const u = uso.get(b.id)?.size || 0; return (
            <button key={b.id} className="ej" onClick={() => setHoja({ t: 'item', b })}>
              <span className="ej-barra" style={{ background: colorGrupo(b.grupo) }} />
              <div className="ej-t"><strong>{b.nombre}</strong><span>{[b.alias?.length ? `${b.alias.length + 1} formas de escribirlo` : null, u ? `${u} ${u === 1 ? 'asesorado' : 'asesorados'}` : null, b.base ? `${b.base.series} × ${b.tipo === 'tiempo' ? `${b.base.segundos} s` : `${b.base.repMin}–${b.base.repMax}`}` : null].filter(Boolean).join(' · ')}</span></div>
              {b.video ? <span className="video-tag"><Ico n="play" s={14} /></span> : null}
              <Ico n="chev" className="chev" s={18} />
            </button>); })}
        </div>)}
        {!lista.length && <p className="vacio">Nada con “{q}”.</p>}
      </>}
      {bib.length > 0 && !sinArmar && <div className="flotante"><button className="btn oro xl full" onClick={() => setHoja({ t: 'item', b: nuevoItem({ nombre: q }) })}><Ico n="mas" />Nuevo ejercicio</button></div>}
      {hoja?.t === 'item' && <HojaItem key={hoja.b.id} inicial={hoja.b} datos={datos} acc={acc} uso={uso} onCerrar={() => setHoja(null)} />}
      {hoja?.t === 'dup' && <HojaDuplicados pares={pares} datos={datos} acc={acc} onIgnorar={ignorar} onCerrar={() => setHoja(null)} />}
    </div>
  );
}
