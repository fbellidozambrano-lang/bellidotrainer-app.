import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Barra, Ico, ir, Hoja, Campo, Confirmar, Placa, Semana, useAviso } from '../ui/kit.jsx';
import { colorGrupo, fmt, nDias, totalEjercicios, resumenEj, textoCarga, uuid, clonarDias, copiaEj, primerNombre } from '../lib/util.js';
import { plantillasDesdeProgramas, plantillasBase, ejDesdeBib, corregirNombre } from '../data/biblioteca.js';
import { SelectorBib, asegurarEnBib, AvisoOrtografia } from './Biblioteca.jsx';
import { HojaEjercicio } from './Editor.jsx';

const nueva = (n, orden) => ({ id: uuid(), nombre: `Plantilla ${n} días`, nota: '', orden, dias: Array.from({ length: n }, (_, i) => ({ id: uuid(), nombre: `Día ${i + 1}`, ejercicios: [] })) });

function TarjetaPlantilla({ t, onClick }) {
  const n = nDias(t);
  return (
    <button className="prog" onClick={onClick}>
      <div className="prog-n"><b className="num">{n}</b><span>{n === 1 ? 'día' : 'días'}</span></div>
      <div className="prog-c"><strong>{t.nombre}</strong><span className="prog-dias">{(t.dias || []).map((d) => d.nombre).join(' · ') || 'Sin días'}</span>
        <div className="prog-pie"><Semana n={n} chica /><small>{totalEjercicios(t)} ejercicios{t.base ? ' · incluida' : ''}</small></div></div>
      <Ico n="chev" className="chev" s={20} />
    </button>
  );
}

// Asignar una plantilla a uno o varios asesorados (crea un programa en cada uno)
export function HojaAsignar({ t, datos, acc, onCerrar }) {
  const avisar = useAviso(); const [sel, setSel] = useState({}); const [ocupado, setOcupado] = useState(false);
  const activos = datos.asesorados.filter((a) => !a.archivado).sort((a, b) => a.nombre.localeCompare(b.nombre));
  const elegidos = activos.filter((a) => sel[a.id]);
  async function asignar() {
    setOcupado(true);
    try {
      for (const a of elegidos) {
        const p = { id: uuid(), asesoradoId: a.id, nombre: t.nombre, nota: '', visible: true, orden: Math.max(0, ...datos.programas.filter((x) => x.asesoradoId === a.id).map((x) => x.orden || 0)) + 1, dias: clonarDias(t.dias) };
        await acc.guardarPrograma(p);
      }
      avisar(elegidos.length === 1 ? `Programa creado para ${primerNombre(elegidos[0].nombre)}` : `Programa creado para ${elegidos.length} asesorados`);
      if (elegidos.length === 1) ir('a', elegidos[0].id, 'rutinas'); onCerrar();
    } catch {} setOcupado(false);
  }
  return (
    <Hoja titulo="Asignar a…" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!elegidos.length || ocupado} onClick={asignar}>Crear {elegidos.length > 1 ? `${elegidos.length} programas` : 'programa'}</button></>}>
      <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>Se crea “{t.nombre}” como programa nuevo en cada uno. Después lo ajustas a la medida de cada asesorado.</p>
      <div className="lista">{activos.map((a) => <button key={a.id} className="item" onClick={() => setSel((s) => ({ ...s, [a.id]: !s[a.id] }))}>
        <span className={`ej-sel ${sel[a.id] ? 'on' : ''}`}>{sel[a.id] && <Ico n="check" s={16} w={3} />}</span><Placa nombre={a.nombre} />
        <div className="item-t"><strong>{a.nombre}</strong><span>{(() => { const k = datos.programas.filter((p) => p.asesoradoId === a.id).length; return `${k} ${k === 1 ? 'programa' : 'programas'}`; })()}</span></div></button>)}</div>
    </Hoja>
  );
}

export function Plantillas({ datos, acc, usuario }) {
  const avisar = useAviso(); const salt = (usuario?.id || 'local') + ':';
  const [nueva_, setNueva] = useState(false); const [n, setN] = useState(3); const [ocupado, setOcupado] = useState(false); const [verBase, setVerBase] = useState(null);
  const propias = [...datos.plantillas].sort((a, b) => nDias(b) - nDias(a) || (a.orden || 0) - (b.orden || 0) || a.nombre.localeCompare(b.nombre));
  const desde = useMemo(() => plantillasDesdeProgramas(datos.programas, datos.plantillas, datos.asesorados, salt), [datos, salt]);
  const base = useMemo(plantillasBase, []);
  async function precargar() {
    setOcupado(true);
    try {
      // cada ejercicio queda enlazado a la biblioteca si ya existe
      const porNombre = new Map(datos.biblioteca.flatMap((b) => [b.nombre, ...(b.alias || [])].map((x) => [x.toLowerCase(), b])));
      const ts = desde.map((t) => ({ ...t, nombre: corregirNombre(t.nombre), dias: t.dias.map((d) => ({ ...d, nombre: corregirNombre(d.nombre), ejercicios: d.ejercicios.map((e) => { const b = porNombre.get(e.ejercicio.toLowerCase()); const n = { ...e, ejercicio: corregirNombre(e.ejercicio) }; return b ? { ...n, bibId: b.id, video: e.video || b.video } : n; }) })) }));
      await acc.guardarPlantillas(ts); avisar(`${ts.length} ${ts.length === 1 ? 'plantilla creada' : 'plantillas creadas'} desde las rutinas de tu equipo`);
    } catch {} setOcupado(false);
  }
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 16px' }}>
        <h1 className="gigante">Plantillas</h1>
        <p className="sub">Rutinas listas para asignar. Armas una vez, la das a quien quieras y luego la ajustas a cada uno.</p>
      </section>
      {datos.faltaTablas && <p className="aviso rojo"><span><b>Falta actualizar la base de datos.</b> Corre otra vez el archivo schema.sql en Supabase → SQL Editor.</span></p>}

      <AvisoOrtografia datos={datos} acc={acc} />
      {desde.length > 0 && <div className="tarj destacado" style={{ marginBottom: 14 }}>
        <h3>{propias.length ? `${desde.length} ${desde.length === 1 ? 'rutina nueva' : 'rutinas nuevas'} en tu equipo` : 'Precarga las rutinas de tu equipo'}</h3>
        <p style={{ margin: '6px 0 12px' }}>Hago una plantilla de cada rutina distinta que tienen tus asesorados. Si dos tienen la misma, queda una sola. No cambia nada en sus programas.</p>
        <p className="etq" style={{ marginBottom: 12 }}>{desde.slice(0, 6).map((t) => t.nombre).join(' · ')}{desde.length > 6 ? ` y ${desde.length - 6} más` : ''}</p>
        <button className="btn oro full" disabled={ocupado || datos.faltaTablas} onClick={precargar}>{ocupado ? 'Creando…' : `Crear ${desde.length} ${desde.length === 1 ? 'plantilla' : 'plantillas'}`}</button>
      </div>}

      <div className="sec"><h2>Tus plantillas</h2><span>{propias.length}</span></div>
      {propias.length ? propias.map((t) => <TarjetaPlantilla key={t.id} t={t} onClick={() => ir('plantilla', t.id)} />)
        : <div className="vacio" style={{ marginBottom: 12 }}><b>Sin plantillas propias</b>Crea una eligiendo ejercicios de tu biblioteca.</div>}
      <button className="nuevo-prog" onClick={() => setNueva(true)}><Ico n="mas" />Nueva plantilla</button>

      <div className="sec"><h2>Incluidas en la app</h2><span>{base.length}</span></div>
      {base.map((t) => <TarjetaPlantilla key={t.id} t={t} onClick={() => setVerBase(t)} />)}

      {nueva_ && <Hoja titulo="Nueva plantilla" onCerrar={() => setNueva(false)} acciones={<><button className="btn" onClick={() => setNueva(false)}>Cancelar</button><button className="btn oro" disabled={datos.faltaTablas} onClick={async () => { const t = nueva(n, propias.length + 1); await acc.guardarPlantillas([t]); setNueva(false); ir('plantilla', t.id); }}>Crear</button></>}>
        <Campo l="Días por semana"><div className="chips">{[1, 2, 3, 4, 5, 6].map((x) => <button key={x} className={`chip ${n === x ? 'on' : ''}`} style={{ minWidth: 52, fontSize: 17 }} onClick={() => setN(x)}>{x}</button>)}</div></Campo>
      </Hoja>}
      {verBase && <Hoja titulo={verBase.nombre} onCerrar={() => setVerBase(null)} acciones={<><button className="btn" onClick={() => setVerBase(null)}>Cerrar</button><button className="btn oro" disabled={datos.faltaTablas} onClick={async () => { const t = { ...verBase, id: uuid(), base: undefined, orden: propias.length + 1, dias: clonarDias(verBase.dias) }; delete t.base; await acc.guardarPlantillas([t]); setVerBase(null); avisar('Copiada a tus plantillas'); ir('plantilla', t.id); }}>Copiar a mis plantillas</button></>}>
        <p className="muted" style={{ marginTop: -6, marginBottom: 10 }}>{verBase.nota}</p>
        {verBase.dias.map((d) => <div key={d.id} style={{ marginBottom: 10 }}><p className="etq" style={{ marginBottom: 4 }}>{d.nombre}</p>{d.ejercicios.map((e) => <p key={e.id} style={{ fontSize: 15, padding: '3px 0' }}>{e.ejercicio} <span className="muted">· {resumenEj(e)}</span></p>)}</div>)}
      </Hoja>}
    </div>
  );
}

// ---------- editor de plantilla (mismo manejo que el de programas, sin asesorado) ----------
export function EditorPlantilla({ t: inicial, datos, acc }) {
  const avisar = useAviso();
  const [t, setT] = useState(inicial); const [diaId, setDiaId] = useState(inicial.dias[0]?.id); const [hoja, setHoja] = useState(null); const [estado, setEstado] = useState('ok');
  const tRef = useRef(t); const tm = useRef(); const pend = useRef(null);
  const dia = t.dias.find((d) => d.id === diaId) || t.dias[0];
  const guardarYa = async () => { const x = pend.current; if (!x) return; pend.current = null; try { await acc.guardarPlantillas([x]); setEstado(pend.current ? 'pend' : 'ok'); } catch { pend.current = pend.current || x; setEstado('err'); } };
  const cambiar = (fn) => { const n = fn(JSON.parse(JSON.stringify(tRef.current))); tRef.current = n; setT(n); pend.current = n; acc.ponerPlantilla(n); setEstado('pend'); clearTimeout(tm.current); tm.current = setTimeout(guardarYa, 700); };
  useEffect(() => () => { clearTimeout(tm.current); guardarYa(); }, []); // eslint-disable-line
  const conDia = (fn) => cambiar((x) => { fn(x.dias.find((y) => y.id === dia.id), x); return x; });
  const sugerencias = useMemo(() => datos.biblioteca.map((b) => b.nombre).sort(), [datos.biblioteca]);

  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => { guardarYa(); ir('plantillas'); }, texto: 'Plantillas' }} titulo=""
        derecha={<><span className={`guardado ${estado === 'pend' ? 'pend' : estado === 'err' ? 'err' : ''}`}><i />{estado === 'pend' ? 'Guardando' : estado === 'err' ? 'Sin guardar' : 'Guardado'}</span>
          <button className="ico-b" onClick={() => setHoja({ t: 'conf' })} aria-label="Ajustes de la plantilla"><Ico n="ajustes" /></button></>} />
      <section className="frec">
        <b className="num">{nDias(t)}</b>
        <div><h1>{t.nombre}</h1><p className="etq">{nDias(t) === 1 ? 'día' : 'días'} por semana · plantilla</p><div style={{ marginTop: 8 }}><Semana n={nDias(t)} /></div></div>
      </section>
      <button className="btn oro full" style={{ margin: '4px 0 14px' }} disabled={!totalEjercicios(t)} onClick={() => { guardarYa(); setHoja({ t: 'asignar' }); }}><Ico n="usuario" s={18} />Asignar a asesorados</button>

      <nav className="tabs-dias" aria-label="Días">
        {t.dias.map((d) => <button key={d.id} className={`tab-dia ${d.id === dia?.id ? 'on' : ''}`} onClick={() => setDiaId(d.id)}>{d.nombre} <span style={{ opacity: .55 }}>{d.ejercicios.length}</span></button>)}
        <button className="tab-dia mas" onClick={() => cambiar((x) => { const id = uuid(); x.dias.push({ id, nombre: `Día ${x.dias.length + 1}`, ejercicios: [] }); setDiaId(id); return x; })} aria-label="Agregar día"><Ico n="mas" s={18} /></button>
      </nav>
      {dia && <>
        <div className="dia-cab"><h2>{dia.nombre}</h2><button className="ico-b" onClick={() => setHoja({ t: 'dia' })} aria-label="Ajustes del día"><Ico n="lapiz" s={20} /></button></div>
        <div className="herr"><button className="btn chico oro" onClick={() => setHoja({ t: 'bib' })}><Ico n="mas" s={16} />Agregar de la biblioteca</button></div>
        {dia.ejercicios.length === 0 ? <div className="vacio"><b>Día vacío</b>Toca “Agregar de la biblioteca” y elige los ejercicios en el orden en que se hacen.</div> :
          dia.ejercicios.map((e, i) => <button key={e.id} className="ej" onClick={() => setHoja({ t: 'ej', e, i })}>
            <span className="ej-barra" style={{ background: colorGrupo(e.grupo) }} />
            <div className="ej-t"><strong>{e.ejercicio}</strong><span>{e.grupo} · {resumenEj(e)} · RPE {fmt(e.rpe, 1)} · {e.descanso} s{e.video ? ' · video' : ''}</span>
              {e.pesoSugerido && <span className="carga">{textoCarga(e.pesoSugerido)}</span>}{e.nota && <em>{e.nota}</em>}</div>
            <Ico n="chev" className="chev" s={18} /></button>)}
      </>}

      {hoja?.t === 'bib' && <SelectorBib biblioteca={datos.biblioteca} destino={dia.nombre} onCerrar={() => setHoja(null)} onNuevo={(q) => setHoja({ t: 'ej', nuevo: true, e: q ? { ejercicio: q, series: 3, repMin: 8, repMax: 12, rpe: 8, descanso: 90 } : undefined })}
        onElegir={(bs) => { conDia((d) => d.ejercicios.push(...bs.map(ejDesdeBib))); setHoja(null); }} />}
      {hoja?.t === 'ej' && <HojaEjercicio biblioteca={datos.biblioteca} esNuevo={hoja.nuevo} inicial={hoja.e} sugerencias={sugerencias} onCerrar={() => setHoja(null)}
        onGuardar={async (e0) => { setHoja(null); const e = await asegurarEnBib(e0, datos, acc); conDia((d) => { const i = d.ejercicios.findIndex((x) => x.id === e.id); if (i >= 0) d.ejercicios[i] = e; else d.ejercicios.push(e); }); }}
        onMover={hoja.nuevo ? null : (dir) => { conDia((d) => { const i = d.ejercicios.findIndex((x) => x.id === hoja.e.id); const j = i + dir; if (i < 0 || j < 0 || j >= d.ejercicios.length) return; [d.ejercicios[i], d.ejercicios[j]] = [d.ejercicios[j], d.ejercicios[i]]; }); setHoja(null); }}
        onBorrar={() => { conDia((d) => { d.ejercicios = d.ejercicios.filter((x) => x.id !== hoja.e.id); }); setHoja(null); }} />}
      {hoja?.t === 'dia' && <HojaDiaPl dia={dia} t={t} cambiar={cambiar} setDiaId={setDiaId} onCerrar={() => setHoja(null)} />}
      {hoja?.t === 'asignar' && <HojaAsignar t={t} datos={datos} acc={acc} onCerrar={() => setHoja(null)} />}
      {hoja?.t === 'conf' && <HojaConfPl t={t} acc={acc} cambiar={cambiar} onCerrar={() => setHoja(null)} parar={() => { clearTimeout(tm.current); pend.current = null; }} />}
    </div>
  );
}

function HojaDiaPl({ dia, t, cambiar, setDiaId, onCerrar }) {
  const [nombre, setNombre] = useState(dia.nombre); const [conf, setConf] = useState(false); const i = t.dias.findIndex((d) => d.id === dia.id);
  return (
    <Hoja titulo="Día" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cerrar</button><button className="btn oro" disabled={!nombre.trim()} onClick={() => { cambiar((x) => { x.dias[i].nombre = nombre.trim(); return x; }); onCerrar(); }}>Guardar</button></>}>
      <Campo l="Nombre del día"><input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
      <div className="chips" style={{ marginBottom: 14 }}>{['Pierna', 'Torso', 'Empuje', 'Tracción', 'Full body', 'Glúteo', 'Superior', 'Inferior'].map((s) => <button key={s} className="chip" onClick={() => setNombre(s)}>{s}</button>)}</div>
      <div className="fila-btn">
        <button className="btn chico" onClick={() => { const id = uuid(); cambiar((x) => { x.dias.splice(i + 1, 0, { id, nombre: `${dia.nombre} (copia)`, ejercicios: dia.ejercicios.map(copiaEj) }); return x; }); setDiaId(id); onCerrar(); }}><Ico n="duplicar" s={16} />Duplicar</button>
        <button className="btn chico peligro" disabled={t.dias.length < 2} onClick={() => setConf(true)}><Ico n="basura" s={16} />Borrar día</button>
      </div>
      {conf && <Confirmar titulo={`¿Borrar ${dia.nombre}?`} texto="Se quitan sus ejercicios de la plantilla." si="Borrar" peligro onNo={() => setConf(false)} onSi={() => { cambiar((x) => { x.dias.splice(i, 1); return x; }); setDiaId(t.dias[i === 0 ? 1 : i - 1]?.id); onCerrar(); }} />}
    </Hoja>
  );
}

function HojaConfPl({ t, acc, cambiar, onCerrar, parar }) {
  const avisar = useAviso(); const [nombre, setNombre] = useState(t.nombre); const [conf, setConf] = useState(false);
  return (
    <Hoja titulo="Plantilla" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cerrar</button><button className="btn oro" onClick={() => { cambiar((x) => ({ ...x, nombre: nombre.trim() || x.nombre })); onCerrar(); }}>Guardar</button></>}>
      <Campo l="Nombre"><input className="in" value={nombre} onChange={(e) => setNombre(e.target.value)} /></Campo>
      <div className="lista">
        <button className="item" onClick={async () => { const c = { ...t, id: uuid(), nombre: `${t.nombre} (copia)`, dias: clonarDias(t.dias), orden: (t.orden || 0) + 1 }; await acc.guardarPlantillas([c]); onCerrar(); avisar('Plantilla duplicada'); ir('plantilla', c.id); }}><Ico n="duplicar" /><div className="item-t"><strong>Duplicar</strong><span>Para hacer una variante</span></div></button>
        <button className="item" style={{ color: 'var(--bad)' }} onClick={() => setConf(true)}><Ico n="basura" /><div className="item-t"><strong>Borrar plantilla</strong><span>Los programas que ya asignaste no cambian</span></div></button>
      </div>
      {conf && <Confirmar titulo="¿Borrar la plantilla?" texto={`${t.nombre} sale de tus plantillas. Los programas que creaste con ella siguen igual.`} si="Borrar" peligro onNo={() => setConf(false)} onSi={async () => { setConf(false); onCerrar(); parar(); await acc.borrarPlantilla(t.id); avisar('Plantilla borrada'); ir('plantillas'); }} />}
    </Hoja>
  );
}
