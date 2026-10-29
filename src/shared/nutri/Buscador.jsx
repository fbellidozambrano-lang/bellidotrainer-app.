// Buscador de alimentos: base de referencia (USDA y los del coach) y productos de marca
// (Open Food Facts por nombre o código de barras, y USDA Branded si hay clave en el servidor).
// Todo pasa dentro de la misma hoja: tocar un resultado lo abre ahí mismo para poner los gramos
// y agregarlo; la ficha completa y los productos de marca reemplazan la lista (con "‹ Resultados").
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Hoja, Ico, useAviso } from '../../ui/kit.jsx';
import { buscarExterno } from '../../data/externos.js';
import { paraGuardar } from '../../lib/nutricion/usda.js';
import { nutrientesDe, principalesPor100 } from '../../lib/nutricion/calculo.js';
import FichaAlimento from './FichaAlimento.jsx';
import { Calidad, Macros, n0, n1, prepTexto } from './comunes.jsx';

const FILTROS = [['', 'Todo'], ['crudo', 'Crudo'], ['cocido', 'Cocido'], ['hervido', 'Hervido'], ['asado', 'Asado'], ['frito', 'Frito'], ['seco', 'Seco'], ['comercial', 'De marca'], ['propios', 'Míos']];
const SUGERENCIAS = ['Pechuga de pollo', 'Arroz blanco cocido', 'Claras de huevo', 'Huevo entero', 'Avena', 'Cambur', 'Aguacate', 'Atún en agua', 'Harina de maíz', 'Papa', 'Plátano', 'Yogur griego'];

// recientes: los últimos alimentos elegidos en este teléfono, con los gramos que se usaron
const kRec = (token) => `bt:nrec:${token || 'coach'}`;
const leerRec = (token) => { try { const x = JSON.parse(localStorage.getItem(kRec(token)) || '[]'); return Array.isArray(x) ? x : []; } catch { return []; } };
function guardarRec(token, comp, g) {
  try {
    const r = { id: comp.id, nombre: comp.nombre, fuente: comp.fuente, calidad: comp.calidad, historico: !!comp.historico, preparacion: comp.preparacion, marca: comp.marca || null, por100: principalesPor100(comp).valores, g };
    localStorage.setItem(kRec(token), JSON.stringify([r, ...leerRec(token).filter((x) => x.id !== comp.id)].slice(0, 12)));
  } catch { /* sin almacenamiento: no pasa nada */ }
}
const numG = (t) => { const n = parseFloat(String(t).replace(',', '.')); return Number.isFinite(n) ? n : 0; };

function Escaner({ onCodigo, onCerrar }) {
  const v = useRef(); const [err, setErr] = useState('');
  useEffect(() => {
    let stream, vivo = true, t;
    (async () => {
      try {
        const det = new window.BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }); v.current.srcObject = stream; await v.current.play();
        const mirar = async () => { if (!vivo) return; try { const r = await det.detect(v.current); if (r[0]?.rawValue) { onCodigo(r[0].rawValue); return; } } catch { /* sigue mirando */ } t = setTimeout(mirar, 300); };
        mirar();
      } catch { setErr('No se pudo abrir la cámara. Escribe el código que está debajo de las barras.'); }
    })();
    return () => { vivo = false; clearTimeout(t); stream?.getTracks().forEach((x) => x.stop()); };
  }, [onCodigo]);
  return <Hoja titulo="Escanear código" onCerrar={onCerrar}>{err ? <p className="aviso rojo"><span>{err}</span></p> : <video ref={v} className="escaner" playsInline muted />}</Hoja>;
}

// un resultado: al tocarlo se abre ahí mismo con los gramos, las porciones y lo que aporta
function Fila({ a, abierta, onAbrir, onVer, onElegir, accion, nutri, token, gIni, agregado }) {
  const [comp, setComp] = useState(null); const [g, setG] = useState(String(gIni || 100)); const [err, setErr] = useState('');
  useEffect(() => {
    if (!abierta || comp) return; let vivo = true;
    nutri.fichas([a.id], token).then((m) => { if (vivo) { if (m?.[a.id]) setComp(m[a.id]); else setErr('No encontré esta ficha.'); } }, (e) => vivo && setErr(e.message));
    return () => { vivo = false; };
  }, [abierta, comp, a.id, nutri, token]);
  const gramos = numG(g);
  const tot = comp && gramos > 0 ? nutrientesDe(comp, gramos).principales
    : gramos > 0 && a.por100 ? Object.fromEntries(['kcal', 'proteina', 'carbohidratos', 'grasa'].map((k) => [k, a.por100[k] == null ? null : (gramos * a.por100[k]) / 100])) : null;
  const paso = gramos >= 200 ? 25 : 10;
  const porciones = (comp?.porciones || []).filter((p) => p.g > 0).slice(0, 4);
  return (
    <div className={`nres-f ${abierta ? 'on' : ''}`}>
      <button className="item nres-i" onClick={onElegir ? onAbrir : onVer} aria-expanded={onElegir ? abierta : undefined}>
        <div className="item-t"><strong>{a.nombre}</strong>
          <span><Calidad calidad={a.calidad} fuente={a.fuente} historico={a.historico} corto /> {prepTexto(a.preparacion)}{a.marca ? ` · ${a.marca}` : ''}{a.sospechosos ? ' · revisar datos' : ''}</span>
          <Macros v={a.por100} por100 /></div>
        {agregado ? <span className="nres-ok"><Ico n="check" s={16} /></span> : <Ico n={onElegir ? (abierta ? 'arriba' : 'abajo') : 'chev'} className="chev" s={18} />}
      </button>
      {abierta && <div className="rapido">
        <div className="rap-g">
          <button className="ico-b" onClick={() => setG(String(Math.max(0, Math.round((gramos - paso) / paso) * paso)))} aria-label="Menos gramos"><Ico n="menos" s={18} /></button>
          <label><input className="in num" inputMode="decimal" value={g} onFocus={(e) => e.target.select()} onChange={(e) => setG(e.target.value)} aria-label="Gramos" /><span>g</span></label>
          <button className="ico-b" onClick={() => setG(String(Math.round((gramos + paso) / paso) * paso))} aria-label="Más gramos"><Ico n="mas" s={18} /></button>
        </div>
        <div className="chips rap-c">{[50, 100, 150, 200].map((x) => <button key={x} className={`chip ${gramos === x ? 'on' : ''}`} onClick={() => setG(String(x))}>{x} g</button>)}
          {porciones.map((p, i) => <button key={i} className={`chip ${gramos === p.g ? 'on' : ''}`} onClick={() => setG(String(p.g))}>{p.d} · {n0(p.g)} g</button>)}</div>
        <div className="rap-t">
          <div><b className="num">{n0(tot?.kcal)}</b><span>kcal</span></div><div><b className="num">{n1(tot?.proteina)}</b><span>proteína</span></div>
          <div><b className="num">{n1(tot?.carbohidratos)}</b><span>carbos</span></div><div><b className="num">{n1(tot?.grasa)}</b><span>grasa</span></div>
        </div>
        {err && <p className="aviso rojo"><span>{err}</span></p>}
        <div className="fila-btn">
          <button className="btn chico" onClick={onVer}><Ico n="libro" s={16} />Ficha completa</button>
          <button className="btn chico oro" disabled={!comp || !(gramos > 0)} onClick={() => onElegir(comp, gramos)}>{comp ? `${accion} ${n0(gramos)} g` : 'Cargando…'}</button>
        </div>
      </div>}
    </div>
  );
}

export default function Buscador({ nutri, token, titulo = 'Agregar alimento', accion = 'Agregar', onElegir, onCerrar }) {
  const avisar = useAviso();
  const [q, setQ] = useState(''); const [filtro, setFiltro] = useState(''); const [res, setRes] = useState([]); const [cargando, setCargando] = useState(false); const [err, setErr] = useState('');
  const [buscado, setBuscado] = useState(''); const [abierta, setAbierta] = useState(null); const [agregados, setAgregados] = useState({}); const [recientes, setRecientes] = useState(() => leerRec(token));
  const [ver, setVer] = useState(null); const [tab, setTab] = useState('base');
  const [ext, setExt] = useState(null); const [extErr, setExtErr] = useState(''); const [prod, setProd] = useState(null); const [escanear, setEscanear] = useState(false); const [guardando, setGuardando] = useState(false);
  const pedido = useRef(0); const cache = useRef(new Map()); const caja = useRef(null); const posLista = useRef(0); const entrada = useRef(null);
  const hoja = () => caja.current?.closest('.hoja');

  useEffect(() => {
    if (tab !== 'base') return;
    const texto = q.trim(); if (texto.length < 2) { setRes([]); setErr(''); setBuscado(''); setCargando(false); return; }
    const f = filtro === 'comercial' ? { tipo: 'comercial' } : filtro === 'propios' ? { tipo: 'personalizado' } : filtro ? { preparacion: filtro } : {};
    const clave = `${texto.toLowerCase()}|${filtro}`; const n = ++pedido.current;
    if (cache.current.has(clave)) { setRes(cache.current.get(clave)); setBuscado(texto); setErr(''); setCargando(false); return; }
    setCargando(true);
    const t = setTimeout(async () => {
      try { const r = (await nutri.buscar(texto, f, token)) || []; cache.current.set(clave, r); if (n === pedido.current) { setRes(r); setBuscado(texto); setErr(''); setAbierta(r.length === 1 ? r[0].id : null); } }
      catch (e) { if (n === pedido.current) setErr(e.message); }
      if (n === pedido.current) setCargando(false);
    }, 220);
    return () => clearTimeout(t);
  }, [q, filtro, tab, nutri, token]);

  // al abrir la ficha o un producto se sube al principio; al volver, la lista queda donde estaba
  const abrirVista = (fn) => { posLista.current = hoja()?.scrollTop || 0; fn(); };
  const volverLista = () => { setVer(null); setProd(null); };
  useLayoutEffect(() => { const h = hoja(); if (!h) return; h.scrollTop = ver || prod ? 0 : posLista.current; }, [ver, prod]);

  const elegir = useCallback((comp, g) => {
    guardarRec(token, comp, g); setRecientes(leerRec(token)); setAgregados((x) => ({ ...x, [comp.id]: true })); setAbierta(null);
    onElegir?.(comp, g);
  }, [token, onElegir]);

  async function buscarFuera(params) {
    setExt(null); setExtErr(''); setCargando(true);
    try { setExt(await buscarExterno(params)); } catch (e) { setExtErr(e.message); }
    setCargando(false);
  }
  const porCodigo = useCallback((c) => { setEscanear(false); const cod = String(c).replace(/\D/g, ''); setQ(cod); setTab('marca'); buscarFuera({ fuente: 'off', codigo: cod }); }, []);
  async function usarProducto(p) {
    setGuardando(true);
    try { const f = await nutri.guardarAlimento(p, token); setProd(null); setVer(f.id); avisar('Producto guardado en la base con su procedencia'); }
    catch (e) { avisar(e.message, 'error'); }
    setGuardando(false);
  }
  const codigo = q.replace(/\D/g, ''); const esCodigo = codigo.length >= 8 && codigo.length === q.trim().length;
  const hayEscaner = typeof window !== 'undefined' && 'BarcodeDetector' in window && navigator.mediaDevices?.getUserMedia;
  const sugerir = (t) => { setQ(t); entrada.current?.focus(); };
  const fila = (a, gIni) => <Fila key={a.id} a={a} gIni={gIni} abierta={abierta === a.id} onAbrir={() => setAbierta((x) => (x === a.id ? null : a.id))} onVer={() => abrirVista(() => setVer(a.id))}
    onElegir={onElegir ? elegir : null} accion={accion} nutri={nutri} token={token} agregado={!!agregados[a.id]} />;

  return (
    <Hoja titulo={titulo} onCerrar={onCerrar}>
      <div ref={caja}>
        {ver ? <FichaAlimento dentro id={ver} nutri={nutri} token={token} onCerrar={volverLista} accion={accion} onAlternativa={setVer}
          onAgregar={onElegir ? (comp, g) => { volverLista(); elegir(comp, g); } : null} />
        : prod ? <div className="ficha-dentro">
          <button className="volver-n" onClick={volverLista}><Ico n="atras" s={18} />Resultados</button>
          <h3 className="ficha-tit">{prod.nombre}</h3>
          <p className="ficha-orig">{prod.nombre_original}{prod.marca ? ` · ${prod.marca}` : ''} · {prod.codigo_barras || prod.id_externo}</p>
          <div className="ficha-tags"><Calidad calidad={prod.fuente === 'off' ? 'colaborativo' : 'etiqueta'} fuente={prod.fuente} /></div>
          {(prod.sospechosos || []).length > 0 && <p className="aviso rojo"><span><b>Revisa:</b> {prod.sospechosos.join(' · ')}</span></p>}
          <div className="ficha-val">{(prod.valores || []).map((v) => <div key={v.codigo} className="fv"><span>{v.codigo.replace(/_/g, ' ')}</span><b className="num">{Number(v.cantidad).toLocaleString('es-VE', { maximumFractionDigits: 2 })}</b><i className="fe">{prod.fuente === 'off' ? 'colaborativo' : 'etiqueta'}</i></div>)}</div>
          <p className="ayuda" style={{ marginTop: 10 }}>Valores por {prod.base}. {prod.fuente === 'off' ? 'Son datos de la comunidad de Open Food Facts copiados de la etiqueta: no es un análisis de laboratorio.' : 'Son los datos de la etiqueta que USDA recopila de los fabricantes.'} Al usarlo se guarda una copia con su procedencia; no cambia la base oficial.</p>
          <div className="hoja-acc"><button className="btn" onClick={volverLista}>Volver</button><button className="btn oro" disabled={guardando} onClick={() => usarProducto(prod.fuente === 'usda_branded' && !prod.valores?.[0]?.codigo ? paraGuardar(prod) : prod)}>{guardando ? 'Guardando…' : 'Usar este producto'}</button></div>
        </div>
        : <>
          <div className="seg" style={{ marginBottom: 10 }}><button className={tab === 'base' ? 'on' : ''} onClick={() => setTab('base')}>Alimentos</button><button className={tab === 'marca' ? 'on' : ''} onClick={() => setTab('marca')}>Productos de marca</button></div>
          <div className="buscar buscar-n">
            <Ico n="buscar" s={18} />
            <input ref={entrada} className="in" autoFocus enterKeyHint="search" placeholder={tab === 'base' ? 'Pechuga, arroz cocido, cambur…' : 'Nombre o código de barras'} value={q} onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); if (tab === 'marca') buscarFuera(esCodigo ? { fuente: 'off', codigo } : { fuente: 'off', q }); } }} aria-label="Buscar alimento" />
            <div className="buscar-d">
              {cargando && <span className="gira" aria-label="Buscando" />}
              {q && <button className="ico-b" onClick={() => { setQ(''); entrada.current?.focus(); }} aria-label="Borrar búsqueda"><Ico n="cerrar" s={16} /></button>}
              {hayEscaner && <button className="ico-b" onClick={() => setEscanear(true)} aria-label="Escanear código de barras"><Ico n="camara" s={20} /></button>}
            </div>
          </div>
          {tab === 'base' ? <>
            <div className="chips filtros-n">{FILTROS.map(([k, t]) => <button key={k} className={`chip ${filtro === k ? 'on' : ''}`} onClick={() => setFiltro(k)}>{t}</button>)}</div>
            {err && <p className="aviso rojo"><span>{err}</span></p>}
            {q.trim().length < 2 ? <>
              {recientes.length > 0 && <><p className="etq nres-sec">Recientes</p><div className="lista nres">{recientes.map((r) => fila(r, r.g))}</div></>}
              <p className="etq nres-sec">{recientes.length ? 'Buscar otro' : 'Empieza a escribir o prueba con'}</p>
              <div className="chips sug-n">{SUGERENCIAS.map((s) => <button key={s} className="chip" onClick={() => sugerir(s)}>{s}</button>)}</div>
            </> : <>
              {buscado && res.length > 0 && <p className="nres-n">{res.length >= 40 ? 'Los 40 más parecidos' : `${res.length} ${res.length === 1 ? 'resultado' : 'resultados'}`} · mejor fuente primero{onElegir ? ' · toca uno para poner los gramos' : ''}</p>}
              {!cargando && buscado && !res.length && !err && <div className="vacio"><b>Sin resultados</b>Prueba otra palabra (por ejemplo “pollo” en vez de “pechuguita”) o busca en Productos de marca.
                {esCodigo ? <button className="btn chico oro" style={{ marginTop: 10 }} onClick={() => porCodigo(codigo)}>Buscar el código {codigo}</button>
                  : <button className="btn chico" style={{ marginTop: 10 }} onClick={() => setTab('marca')}>Buscar “{q.trim()}” en productos de marca</button>}</div>}
              {!buscado && cargando && <div className="esq lista-esq"><i /><i /><i /></div>}
              <div className={`lista nres ${cargando ? 'cargando' : ''}`}>{res.map((a) => fila(a))}</div>
            </>}
          </> : <>
            <div className="fila-btn" style={{ margin: '4px 0 10px' }}>
              <button className="btn chico oro" disabled={q.trim().length < 2} onClick={() => buscarFuera(esCodigo ? { fuente: 'off', codigo } : { fuente: 'off', q })}><Ico n="buscar" s={16} />Open Food Facts</button>
              <button className="btn chico" disabled={q.trim().length < 2 || esCodigo} onClick={() => buscarFuera({ fuente: 'usda', q })}>USDA (marcas de EE. UU.)</button>
            </div>
            {extErr && <p className="aviso rojo"><span>{extErr}</span></p>}
            {cargando && !ext && <div className="esq lista-esq"><i /><i /><i /></div>}
            {ext?.atribucion && <p className="ayuda">{ext.atribucion}</p>}
            {ext && !(ext.productos || ext.resultados || []).length && <div className="vacio"><b>No apareció</b>{ext.error || 'Prueba con otro nombre o con el código de barras.'}</div>}
            <div className="lista nres">
              {(ext?.productos || []).map((p) => <button key={p.codigo_barras || p.id_externo} className="item nres-i" onClick={() => abrirVista(() => setProd(p))}>
                <div className="item-t"><strong>{p.nombre}</strong><span><Calidad calidad={p.fuente === 'off' ? 'colaborativo' : 'etiqueta'} fuente={p.fuente} corto /> {p.marca || ''} · {p.codigo_barras}</span>
                  <Macros v={Object.fromEntries((p.valores || []).map((v) => [{ energia_kcal: 'kcal', proteina: 'proteina', carbohidratos_etiqueta: 'carbohidratos', carbohidratos_diferencia: 'carbohidratos', grasa_total: 'grasa' }[v.codigo], v.cantidad]).filter(([k]) => k))} por100 /></div>
                <Ico n="chev" className="chev" s={18} /></button>)}
              {(ext?.resultados || []).map((p) => <button key={p.fdcId} className="item nres-i" onClick={async () => { setCargando(true); try { const d = await buscarExterno({ fuente: 'usda', id: p.fdcId }); abrirVista(() => setProd(d.productos[0])); } catch (e) { setExtErr(e.message); } setCargando(false); }}>
                <div className="item-t"><strong>{p.nombre_original}</strong><span><Calidad calidad="etiqueta" fuente="usda_branded" corto /> {p.marca || ''}</span><Macros v={p.por100} por100 /></div><Ico n="chev" className="chev" s={18} /></button>)}
            </div>
          </>}
        </>}
      </div>
      {escanear && <Escaner onCodigo={porCodigo} onCerrar={() => setEscanear(false)} />}
    </Hoja>
  );
}
