import React, { useMemo, useState } from 'react';
import { Ico, Placa, Semana, ir, Hoja, Campo, useAviso } from '../ui/kit.jsx';
import { haceCuanto, saludo, sesionesSemana, diasEntre, hoy, primerNombre, fCorta } from '../lib/util.js';
import { NIVELES, OBJETIVOS } from '../data/constants.js';
import marca from '../assets/marca.png';

export function FichaAsesorado({ inicial, onGuardar, onCerrar }) {
  const [f, setF] = useState(() => ({ nombre: '', objetivo: '', nivel: '', notas: '', ...inicial, datos: { ...(inicial?.datos || {}) } }));
  const [ocupado, setOcupado] = useState(false);
  const d = (k, v) => setF((x) => ({ ...x, datos: { ...x.datos, [k]: v } }));
  return (
    <Hoja titulo={inicial?.id ? 'Editar asesorado' : 'Nuevo asesorado'} onCerrar={onCerrar}
      acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!f.nombre.trim() || ocupado} onClick={async () => { setOcupado(true); try { await onGuardar({ ...f, nombre: f.nombre.trim() }); } finally { setOcupado(false); } }}>{inicial?.id ? 'Guardar' : 'Crear'}</button></>}>
      <Campo l="Nombre y apellido"><input className="in" autoFocus value={f.nombre} onChange={(e) => setF({ ...f, nombre: e.target.value })} /></Campo>
      <Campo l="Objetivo"><div className="chips">{OBJETIVOS.map((o) => <button type="button" key={o} className={`chip ${f.objetivo === o ? 'on' : ''}`} onClick={() => setF({ ...f, objetivo: f.objetivo === o ? '' : o })}>{o}</button>)}</div></Campo>
      <Campo l="Nivel"><div className="seg">{NIVELES.map((o) => <button type="button" key={o} className={f.nivel === o ? 'on' : ''} onClick={() => setF({ ...f, nivel: o })}>{o}</button>)}</div></Campo>
      <div className="dos"><Campo l="Edad"><input className="in" inputMode="numeric" value={f.datos.edad || ''} onChange={(e) => d('edad', e.target.value)} /></Campo>
        <Campo l="Peso (kg)"><input className="in" inputMode="decimal" value={f.datos.peso || ''} onChange={(e) => d('peso', e.target.value)} /></Campo></div>
      <Campo l="Notas (solo tú las ves)"><textarea className="in" rows={3} value={f.notas} onChange={(e) => setF({ ...f, notas: e.target.value })} placeholder="Lesiones, horarios, preferencias…" /></Campo>
    </Hoja>
  );
}

export default function Inicio({ datos, acc, store, usuario }) {
  const avisar = useAviso();
  const [q, setQ] = useState(''); const [nuevo, setNuevo] = useState(false);
  const activos = datos.asesorados.filter((a) => !a.archivado);
  const ultima = useMemo(() => { const m = {}; datos.sesiones.forEach((s) => { if (!m[s.asesoradoId] || s.fecha > m[s.asesoradoId]) m[s.asesoradoId] = s.fecha; }); return m; }, [datos.sesiones]);
  const semana = sesionesSemana(datos.sesiones);
  const entrenaron = new Set(semana.map((s) => s.asesoradoId)).size;
  const inactivos = activos.filter((a) => !ultima[a.id] || diasEntre(ultima[a.id], hoy()) > 7).length;
  const recientes = [...datos.sesiones].filter((s) => s.origen === 'asesorado' && diasEntre(s.fecha, hoy()) <= 4).sort((a, b) => String(b.creado || b.fecha).localeCompare(String(a.creado || a.fecha))).slice(0, 8);
  const lista = activos.filter((a) => !q || a.nombre.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (ultima[b.id] || '').localeCompare(ultima[a.id] || '') || a.nombre.localeCompare(b.nombre));
  const nombreCoach = primerNombre(usuario?.user_metadata?.nombre || '') || 'coach';

  return (
    <div className="pantalla">
      <header className="barra" style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', position: 'relative' }}>
        <img src={marca} className="marca-top" alt="BT" /><div className="barra-t" />
        <button className="ico-b" onClick={() => ir('ajustes')} aria-label="Ajustes"><Ico n="ajustes" /></button>
      </header>
      <section className="saludo">
        <p className="etq">{saludo()}, {nombreCoach}</p>
        <h1 className="gigante" style={{ marginTop: 6 }}>Tu equipo</h1>
      </section>
      <div className="resumen">
        <div><b className="num">{activos.length}</b><span>asesorados</span></div>
        <div><b className="num">{entrenaron}</b><span>entrenaron esta semana</span></div>
        <div><b className="num" style={{ color: inactivos ? '#FF9E4D' : undefined }}>{inactivos}</b><span>más de 7 días sin entrenar</span></div>
      </div>
      {store.modo === 'local' && <button className="aviso" style={{ width: '100%', textAlign: 'left' }} onClick={() => ir('ajustes')}><Ico n="nube" s={20} style={{ flex: 'none', marginTop: 1 }} /><span><b>Modo local.</b> Todo vive en este teléfono y tus asesorados no pueden entrar todavía. Toca para conectar Supabase.</span></button>}

      {recientes.length > 0 && <>
        <div className="sec"><h2>Recién entrenaron</h2></div>
        <div className="feed">{recientes.map((s) => { const a = datos.asesorados.find((x) => x.id === s.asesoradoId); return a && (
          <button key={s.id} className="feed-i" onClick={() => ir('a', a.id, 'metricas')}><strong>{a.nombre}</strong><span>{s.dia} · {(s.series || []).length} series</span><em>{haceCuanto(s.fecha) === 'hoy' ? 'Hoy' : fCorta(s.fecha)}</em></button>); })}</div>
      </>}

      {activos.length > 4 && <div className="buscar"><Ico n="buscar" s={18} /><input className="in" placeholder="Buscar asesorado" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Buscar asesorado" /></div>}
      <div className="sec"><h2>Asesorados</h2><span>{lista.length}</span></div>
      {activos.length === 0 ? <div className="vacio"><b>Empieza con tu primer asesorado</b>Crea su ficha, ármale sus programas de 2, 3 o 5 días y mándale su enlace. Si ya usabas la app anterior, importa tu respaldo en Ajustes.</div> :
        <div className="lista">{lista.map((a) => { const u = ultima[a.id]; const n = new Set(semana.filter((s) => s.asesoradoId === a.id).map((s) => s.fecha + s.dia)).size; const frio = !u || diasEntre(u, hoy()) > 7;
          return <button key={a.id} className="item" onClick={() => ir('a', a.id)}>
            <Placa nombre={a.nombre} oro={n > 0} />
            <div className="item-t"><strong>{a.nombre}</strong><span className={frio && u ? 'alerta' : ''}>{[a.objetivo, u ? `entrenó ${haceCuanto(u)}` : 'sin entrenos todavía'].filter(Boolean).join(' · ')}</span></div>
            <div className="item-d"><Semana n={n} chica /></div>
          </button>; })}</div>}
      <div className="flotante"><button className="btn oro xl full" onClick={() => setNuevo(true)}><Ico n="mas" />Nuevo asesorado</button></div>
      {nuevo && <FichaAsesorado onCerrar={() => setNuevo(false)} onGuardar={async (f) => { const a = await acc.guardarAsesorado(f); setNuevo(false); avisar(`${primerNombre(a.nombre)} creado`); ir('a', a.id); }} />}
    </div>
  );
}
