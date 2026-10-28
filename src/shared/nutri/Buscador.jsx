// Buscador de alimentos: base de referencia (USDA y los del coach) y productos de marca
// (Open Food Facts por nombre o código de barras, y USDA Branded si hay clave en el servidor).
import React, { useEffect, useRef, useState } from 'react';
import { Hoja, Ico, useAviso } from '../../ui/kit.jsx';
import { buscarExterno } from '../../data/externos.js';
import { paraGuardar } from '../../lib/nutricion/usda.js';
import FichaAlimento from './FichaAlimento.jsx';
import { Calidad, Macros, n0, prepTexto } from './comunes.jsx';

const FILTROS = [['', 'Todo'], ['crudo', 'Crudo'], ['cocido', 'Cocido'], ['hervido', 'Hervido'], ['asado', 'Asado'], ['frito', 'Frito'], ['seco', 'Seco'], ['comercial', 'De marca'], ['propios', 'Míos']];

function Escaner({ onCodigo, onCerrar }) {
  const v = useRef(); const [err, setErr] = useState('');
  useEffect(() => {
    let stream, vivo = true, t;
    (async () => {
      try {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.current.srcObject = stream; await v.current.play();
        const mirar = async () => { if (!vivo) return; try { const r = await det.detect(v.current); if (r[0]?.rawValue) { onCodigo(r[0].rawValue); return; } } catch {} t = setTimeout(mirar, 300); };
        mirar();
      } catch { setErr('No se pudo abrir la cámara. Escribe el código que está debajo de las barras.'); }
    })();
    return () => { vivo = false; clearTimeout(t); stream?.getTracks().forEach((x) => x.stop()); };
  }, [onCodigo]);
  return <Hoja titulo="Escanear código" onCerrar={onCerrar}>{err ? <p className="aviso rojo"><span>{err}</span></p> : <video ref={v} className="escaner" playsInline muted />}</Hoja>;
}

export default function Buscador({ nutri, token, titulo = 'Agregar alimento', accion = 'Agregar', onElegir, onCerrar }) {
  const avisar = useAviso();
  const [q, setQ] = useState(''); const [filtro, setFiltro] = useState(''); const [res, setRes] = useState([]); const [cargando, setCargando] = useState(false); const [err, setErr] = useState('');
  const [ver, setVer] = useState(null); const [tab, setTab] = useState('base');
  const [ext, setExt] = useState(null); const [extErr, setExtErr] = useState(''); const [prod, setProd] = useState(null); const [escanear, setEscanear] = useState(false); const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0);
  useEffect(() => {
    if (tab !== 'base') return;
    const texto = q.trim(); if (texto.length < 2) { setRes([]); setErr(''); return; }
    const n = ++pedido.current; setCargando(true);
    const t = setTimeout(async () => {
      try {
        const f = filtro === 'comercial' ? { tipo: 'comercial' } : filtro === 'propios' ? { tipo: 'personalizado' } : filtro ? { preparacion: filtro } : {};
        const r = await nutri.buscar(texto, f, token); if (n === pedido.current) { setRes(r || []); setErr(''); }
      } catch (e) { if (n === pedido.current) setErr(e.message); }
      if (n === pedido.current) setCargando(false);
    }, 280);
    return () => clearTimeout(t);
  }, [q, filtro, tab, nutri, token]);

  async function buscarFuera(params) {
    setExt(null); setExtErr(''); setCargando(true);
    try { setExt(await buscarExterno(params)); } catch (e) { setExtErr(e.message); }
    setCargando(false);
  }
  const porCodigo = (c) => { setEscanear(false); const cod = String(c).replace(/\D/g, ''); setQ(cod); setTab('marca'); buscarFuera({ fuente: 'off', codigo: cod }); };
  async function usarProducto(p) {
    setGuardando(true);
    try { const f = await nutri.guardarAlimento(p, token); setProd(null); setVer(f.id); avisar('Producto guardado en la base con su procedencia'); }
    catch (e) { avisar(e.message, 'error'); }
    setGuardando(false);
  }
  const codigo = q.replace(/\D/g, ''); const esCodigo = codigo.length >= 8 && codigo.length === q.trim().length;
  const hayEscaner = typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;

  return (
    <Hoja titulo={titulo} onCerrar={onCerrar}>
      <div className="seg" style={{ marginBottom: 10 }}><button className={tab === 'base' ? 'on' : ''} onClick={() => setTab('base')}>Alimentos</button><button className={tab === 'marca' ? 'on' : ''} onClick={() => setTab('marca')}>Productos de marca</button></div>
      <div className="buscar" style={{ marginTop: 0 }}><Ico n="buscar" s={18} /><input className="in" autoFocus placeholder={tab === 'base' ? 'Pechuga, arroz cocido, cambur…' : 'Nombre o código de barras'} value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && tab === 'marca') buscarFuera(esCodigo ? { fuente: 'off', codigo } : { fuente: 'off', q }); }} aria-label="Buscar alimento" />
        {hayEscaner && <button className="ico-b buscar-cam" onClick={() => setEscanear(true)} aria-label="Escanear código de barras"><Ico n="camara" s={20} /></button>}</div>
      {tab === 'base' ? <>
        <div className="chips filtros-n">{FILTROS.map(([k, t]) => <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>{t}</button>)}</div>
        {err && <p className="aviso rojo"><span>{err}</span></p>}
        {cargando && <p className="muted" style={{ padding: '8px 0' }}>Buscando…</p>}
        {!cargando && q.trim().length >= 2 && !res.length && !err && <div className="vacio"><b>Sin resultados</b>Prueba otra palabra (por ejemplo “pollo” en vez de “pechuguita”) o busca en Productos de marca.{esCodigo && <button className="btn chico oro" style={{ marginTop: 10 }} onClick={() => porCodigo(codigo)}>Buscar el código {codigo}</button>}</div>}
        <div className="lista nres">{res.map((a) => (
          <button key={a.id} className="item nres-i" onClick={() => setVer(a.id)}>
            <div className="item-t"><strong>{a.nombre}</strong>
              <span><Calidad calidad={a.calidad} fuente={a.fuente} historico={a.historico} corto /> {prepTexto(a.preparacion)}{a.marca ? ` · ${a.marca}` : ''}{a.sospechosos ? ' · revisar datos' : ''}</span>
              <Macros v={a.por100} por100 /></div>
            <Ico n="chev" className="chev" s={18} /></button>))}</div>
        {res.length > 0 && <p className="ayuda" style={{ marginTop: 10 }}>Primero salen los de mejor fuente: análisis de laboratorio, luego referencia y por último etiquetas y datos colaborativos.</p>}
      </> : <>
        <div className="fila-btn" style={{ margin: '4px 0 10px' }}>
          <button className="btn chico oro" disabled={q.trim().length < 2} onClick={() => buscarFuera(esCodigo ? { fuente: 'off', codigo } : { fuente: 'off', q })}><Ico n="buscar" s={16} />Open Food Facts</button>
          <button className="btn chico" disabled={q.trim().length < 2 || esCodigo} onClick={() => buscarFuera({ fuente: 'usda', q })}>USDA (marcas de EE. UU.)</button>
        </div>
        {extErr && <p className="aviso rojo"><span>{extErr}</span></p>}
        {cargando && <p className="muted">Buscando…</p>}
        {ext?.atribucion && <p className="ayuda">{ext.atribucion}</p>}
        {ext && !(ext.productos || ext.resultados || []).length && <div className="vacio"><b>No apareció</b>{ext.error || 'Prueba con otro nombre o con el código de barras.'}</div>}
        <div className="lista nres">
          {(ext?.productos || []).map((p) => <button key={p.codigo_barras || p.id_externo} className="item nres-i" onClick={() => setProd(p)}>
            <div className="item-t"><strong>{p.nombre}</strong><span><Calidad calidad={p.fuente === 'off' ? 'colaborativo' : 'etiqueta'} fuente={p.fuente} corto /> {p.marca || ''} · {p.codigo_barras}</span>
              <Macros v={Object.fromEntries((p.valores || []).map((v) => [{ energia_kcal: 'kcal', proteina: 'proteina', carbohidratos_etiqueta: 'carbohidratos', carbohidratos_diferencia: 'carbohidratos', grasa_total: 'grasa' }[v.codigo], v.cantidad]).filter(([k]) => k))} por100 /></div>
            <Ico n="chev" className="chev" s={18} /></button>)}
          {(ext?.resultados || []).map((p) => <button key={p.fdcId} className="item nres-i" onClick={async () => { setCargando(true); try { const d = await buscarExterno({ fuente: 'usda', id: p.fdcId }); setProd(d.productos[0]); } catch (e) { setExtErr(e.message); } setCargando(false); }}>
            <div className="item-t"><strong>{p.nombre_original}</strong><span><Calidad calidad="etiqueta" fuente="usda_branded" corto /> {p.marca || ''}</span><Macros v={p.por100} por100 /></div><Ico n="chev" className="chev" s={18} /></button>)}
        </div>
      </>}
      {prod && <Hoja titulo={prod.nombre} onCerrar={() => setProd(null)} acciones={<><button className="btn" onClick={() => setProd(null)}>Volver</button><button className="btn oro" disabled={guardando} onClick={() => usarProducto(prod.fuente === 'usda_branded' && !prod.valores?.[0]?.codigo ? paraGuardar(prod) : prod)}>{guardando ? 'Guardando…' : 'Usar este producto'}</button></>}>
        <p className="ficha-orig">{prod.nombre_original}{prod.marca ? ` · ${prod.marca}` : ''} · {prod.codigo_barras || prod.id_externo}</p>
        <div className="ficha-tags"><Calidad calidad={prod.fuente === 'off' ? 'colaborativo' : 'etiqueta'} fuente={prod.fuente} /></div>
        {(prod.sospechosos || []).length > 0 && <p className="aviso rojo"><span><b>Revisa:</b> {prod.sospechosos.join(' · ')}</span></p>}
        <div className="ficha-val">{(prod.valores || []).map((v) => <div key={v.codigo} className="fv"><span>{v.codigo.replace(/_/g, ' ')}</span><b className="num">{n0(v.cantidad) === '0' && v.cantidad > 0 ? v.cantidad : Number(v.cantidad).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</b><i className="fe">{prod.fuente === 'off' ? 'colaborativo' : 'etiqueta'}</i></div>)}</div>
        <p className="ayuda" style={{ marginTop: 10 }}>Valores por {prod.base}. {prod.fuente === 'off' ? 'Son datos de la comunidad de Open Food Facts copiados de la etiqueta: no es un análisis de laboratorio.' : 'Son los datos de la etiqueta que USDA recopila de los fabricantes.'} Al usarlo se guarda una copia con su procedencia; no cambia la base oficial.</p>
      </Hoja>}
      {ver && <FichaAlimento id={ver} nutri={nutri} token={token} onCerrar={() => setVer(null)} accion={accion} onAlternativa={setVer} onAgregar={onElegir ? (comp, g) => { setVer(null); onElegir(comp, g); } : null} />}
      {escanear && <Escaner onCodigo={porCodigo} onCerrar={() => setEscanear(false)} />}
    </Hoja>
  );
}
