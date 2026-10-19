import React, { useRef, useState } from 'react';
import { Ico, Hoja, Campo, Confirmar, useAviso } from '../ui/kit.jsx';
import { fLarga, hoy, primerNombre, uuidDe } from '../lib/util.js';
import { CAMPOS, lineasDePdf, leerInforme } from '../data/informe.js';
import Composicion from '../shared/Composicion.jsx';

const sinAcento = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

// Revisar lo que se leyó del PDF (o cargar a mano) antes de guardar
function HojaControl({ a, inicial, aviso, acc, onCerrar }) {
  const avisar = useAviso();
  const [fecha, setFecha] = useState(inicial?.fecha || hoy());
  const [v, setV] = useState(() => { const o = {}; CAMPOS.forEach((x) => { const n = inicial?.datos?.[x.k]; o[x.k] = n == null ? '' : String(n); }); return o; });
  const [ocupado, setOcupado] = useState(false);
  async function guardar() {
    setOcupado(true);
    const datos = { ...(inicial?.datos || {}) };
    CAMPOS.forEach((x) => { const n = parseFloat(String(v[x.k]).replace(',', '.')); if (Number.isFinite(n)) datos[x.k] = n; else delete datos[x.k]; });
    try { await acc.guardarControl({ id: inicial?.id || uuidDe(`control:${a.id}:${fecha}`), asesoradoId: a.id, fecha, datos, archivo: inicial?.archivo || '' }); avisar(`Control guardado: ${primerNombre(a.nombre)} ya lo ve en su app`); onCerrar(); }
    catch {} setOcupado(false);
  }
  const ok = /^\d{4}-\d{2}-\d{2}$/.test(fecha) && (v.peso || v.grasa);
  return (
    <Hoja titulo="Control antropométrico" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!ok || ocupado} onClick={guardar}>Guardar</button></>}>
      {aviso && <p className={`aviso ${aviso.rojo ? 'rojo' : ''}`}><span>{aviso.texto}</span></p>}
      <Campo l="Fecha del control"><input className="in" type="date" value={fecha} max={hoy()} onChange={(e) => setFecha(e.target.value)} /></Campo>
      <div className="dos">{CAMPOS.map((x) => <Campo key={x.k} l={`${x.l}${x.u ? ` (${x.u})` : ''}`}><input className="in num" inputMode="decimal" value={v[x.k]} placeholder="—" onChange={(e) => setV((o) => ({ ...o, [x.k]: e.target.value }))} /></Campo>)}</div>
      <p className="ayuda" style={{ margin: 0 }}>Revisa los números. Lo que dejes vacío no se muestra. {primerNombre(a.nombre)} ve este resumen en su app.</p>
    </Hoja>
  );
}

export default function SeccionComposicion({ a, controles, acc, faltaTablas }) {
  const avisar = useAviso(); const ref = useRef(); const nom = primerNombre(a.nombre);
  const [hoja, setHoja] = useState(null); const [leyendo, setLeyendo] = useState(false); const [ver, setVer] = useState(false); const [borrar, setBorrar] = useState(null);
  const lista = [...controles].sort((x, y) => (x.fecha < y.fecha ? 1 : -1));
  async function elegir(e) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    setLeyendo(true);
    try {
      const r = leerInforme(await lineasDePdf(await f.arrayBuffer()));
      const otro = r.nombre && !sinAcento(r.nombre).split(/\s+/).some((p) => sinAcento(a.nombre).split(/\s+/).includes(p));
      const faltan = CAMPOS.filter((x) => r.datos[x.k] == null).map((x) => x.l.toLowerCase());
      setHoja({ inicial: { fecha: r.fecha || hoy(), datos: r.datos, archivo: f.name },
        aviso: otro ? { rojo: true, texto: `Ojo: el informe es de ${r.nombre}, no de ${a.nombre}.` } : faltan.length ? { texto: `Leído del PDF. No trae ${faltan.join(', ')}: si los tienes, escríbelos.` } : { texto: 'Leído del PDF.' } });
    } catch (x) { avisar(x.message || 'No pude leer ese PDF', 'error'); }
    setLeyendo(false);
  }
  return (
    <>
      <div className="sec"><h2>Composición corporal</h2>{lista.length > 1 && <button onClick={() => setVer(true)}>{lista.length} controles</button>}</div>
      {faltaTablas && <p className="aviso rojo"><span>Para guardar controles corre otra vez el schema.sql en Supabase.</span></p>}
      {lista.length ? <Composicion controles={lista} /> : <div className="vacio" style={{ marginBottom: 10 }}><b>Sin controles todavía</b>Sube el PDF del informe y {nom} verá su peso, % de grasa y músculo en su app.</div>}
      <div className="fila-btn" style={{ marginTop: 10 }}>
        <button className="btn oro" disabled={leyendo || faltaTablas} onClick={() => ref.current?.click()}><Ico n="subir" s={18} />{leyendo ? 'Leyendo PDF…' : 'Subir informe PDF'}</button>
        <button className="btn" disabled={faltaTablas} onClick={() => setHoja({ inicial: null })}><Ico n="lapiz" s={18} />A mano</button>
      </div>
      <input ref={ref} type="file" accept="application/pdf,.pdf" hidden onChange={elegir} />
      {hoja && <HojaControl a={a} inicial={hoja.inicial} aviso={hoja.aviso} acc={acc} onCerrar={() => setHoja(null)} />}
      {ver && <Hoja titulo="Controles" onCerrar={() => setVer(false)}>
        <div className="lista">{lista.map((c) => <div key={c.id} className="item"><div className="item-t"><strong>{fLarga(c.fecha)}</strong><span>{[c.datos.peso && `${c.datos.peso} kg`, c.datos.grasa && `${c.datos.grasa} % grasa`].filter(Boolean).join(' · ')}</span></div>
          <button className="ico-b" aria-label="Editar" onClick={() => { setVer(false); setHoja({ inicial: c }); }}><Ico n="lapiz" s={18} /></button>
          <button className="ico-b" aria-label="Borrar" onClick={() => setBorrar(c)}><Ico n="basura" s={18} /></button></div>)}</div>
      </Hoja>}
      {borrar && <Confirmar titulo="¿Borrar este control?" texto={`El control del ${fLarga(borrar.fecha)} deja de verse en la app de ${nom}.`} si="Borrar" peligro onNo={() => setBorrar(null)} onSi={async () => { await acc.borrarControl(borrar.id); setBorrar(null); avisar('Control borrado'); }} />}
    </>
  );
}
