// Lector de etiquetas: foto del frente + foto de la tabla nutricional → producto en la base.
// Primero intenta con la IA del servidor (si está configurada); si no, la lee gratis en el teléfono (PaddleOCR).
// Siempre se revisa antes de guardar: lo leído se compara con la foto y lo dudoso queda en ámbar.
// Si se ve el código de barras y está en Open Food Facts, se muestra al lado para comparar (no reemplaza nada).
import React, { useEffect, useMemo, useState } from 'react';
import { Campo, Hoja, Ico, useAviso } from '../../ui/kit.jsx';
import { CLAVES_ETIQUETA, faltaPorcion, lecturaVacia, nombreNutriente, productoDesdeLectura, unidadDe } from '../../lib/nutricion/etiqueta.js';
import { codigoEnFoto, leerFoto, prepararFoto } from '../../lib/nutricion/fotos.js';
import { buscarExterno } from '../../data/externos.js';

const fmtN = (v) => (v == null || v === '' ? '' : String(v).replace('.', ','));
const num = (t) => { const s = String(t ?? '').trim().replace(',', '.'); return s === '' ? null : Number.isFinite(Number(s)) ? Number(s) : NaN; };
const RES = [['energia_kcal', 'kcal'], ['proteina', 'g proteína'], ['carbohidratos_etiqueta', 'g carbos'], ['grasa_total', 'g grasa']];
// el código leído en el teléfono: de las barras, del número impreso o de los dos (y si coinciden)
const RANGO_CODIGO = { confirmado: 4, barras: 3, impreso: 2, distinto: 1 };
const AYUDA_CODIGO = { confirmado: '✓ Coincide con el número impreso.', barras: 'Leído de las barras: compáralo con el número impreso.', impreso: 'Leído del número impreso: compruébalo.', distinto: 'Las barras y el número impreso no coinciden: escríbelo mirando el envase.' };

function Foto({ titulo, ayuda, foto, onFoto, obligatoria }) {
  return (
    <label className={`etq-foto ${foto ? 'lista' : ''}`}>
      <input type="file" accept="image/*" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFoto(f); e.target.value = ''; }} aria-label={titulo} />
      {foto ? <img src={foto.url} alt={titulo} /> : <span className="etq-foto-i"><Ico n="camara" s={28} /></span>}
      <div><strong>{titulo}{obligatoria ? '' : ' (recomendada)'}</strong><small>{foto ? 'Toca para cambiarla' : ayuda}</small></div>
    </label>
  );
}

export default function LectorEtiqueta({ nutri, token = null, quien = '', onCerrar, onGuardado }) {
  const avisar = useAviso();
  const [frente, setFrente] = useState(null); const [tabla, setTabla] = useState(null);
  const [paso, setPaso] = useState('fotos'); const [estado, setEstado] = useState(''); const [err, setErr] = useState(''); const [motivo, setMotivo] = useState('');
  const [l, setL] = useState(null); const [verFoto, setVerFoto] = useState(false); const [guardando, setGuardando] = useState(false); const [agregar, setAgregar] = useState('');
  const [off, setOff] = useState(null);
  const foto = (set) => (f) => set({ archivo: f, url: URL.createObjectURL(f) });

  // ¿el código de barras está en Open Food Facts? se muestra al lado para comparar (datos colaborativos)
  const cbLeido = paso === 'revisar' ? l?.codigo_barras || '' : '';
  useEffect(() => {
    if (!/^\d{8,14}$/.test(cbLeido)) return undefined;
    let vivo = true;
    const t = setTimeout(() => {
      buscarExterno({ fuente: 'off', codigo: cbLeido }).then((d) => {
        const p = (d?.productos || [])[0]; if (!vivo || !p) return;
        setOff({ codigo: cbLeido, nombre: p.nombre || '', marca: p.marca || '', v: Object.fromEntries((p.valores || []).map((x) => [x.codigo, x.cantidad])) });
      }).catch(() => {});
    }, 500);
    return () => { vivo = false; clearTimeout(t); };
  }, [cbLeido]);

  // lector gratuito del teléfono: la tabla (y el frente, si hay foto), con su código de barras
  async function leerEnTelefono() {
    setEstado('Preparando el lector del teléfono…');
    const rt = await leerFoto('tabla', tabla.archivo, setEstado);
    const lt = { ...lecturaVacia('telefono'), ...rt.l, origen: 'telefono' }; let cb = { codigo: rt.codigo || '', estado: rt.codigoEstado || '' };
    if (frente) {
      setEstado('Leyendo el frente…');
      try {
        const rf = await leerFoto('frente', frente.archivo, setEstado); lt.lineas_frente = rf.lineas || []; lt.contenido = rf.contenido || '';
        if (rf.codigo && (RANGO_CODIGO[rf.codigoEstado] || 0) > (RANGO_CODIGO[cb.estado] || 0)) cb = { codigo: rf.codigo, estado: rf.codigoEstado };
      } catch { /* el frente es opcional */ }
    }
    if (cb.codigo && !lt.codigo_barras) { lt.codigo_barras = cb.codigo; lt.codigo_estado = cb.estado; }
    return lt;
  }
  async function leer(soloTelefono = false) {
    setErr(''); setPaso('leyendo'); setOff(null);
    try {
      let lectura = null;
      if (!soloTelefono && nutri.leerEtiqueta) {
        setEstado('Leyendo la etiqueta con IA…');
        const imgs = [...(frente ? [{ tipo: 'frente', ...(await prepararFoto(frente.archivo)) }] : []), { tipo: 'tabla', ...(await prepararFoto(tabla.archivo)) }].map((x) => ({ tipo: x.tipo, media_type: x.media_type, data: x.base64 }));
        const r = await nutri.leerEtiqueta(imgs, token);
        if (r?.lectura) lectura = { ...lecturaVacia('ia'), ...r.lectura, origen: 'ia' };
        else setMotivo(r?.motivo || '');
      }
      if (lectura) { const cb = (await codigoEnFoto(tabla.archivo)) || (frente ? await codigoEnFoto(frente.archivo) : ''); if (!lectura.codigo_barras && cb) lectura.codigo_barras = cb; }
      else lectura = await leerEnTelefono();
      setL(lectura); setPaso('revisar');
    } catch (e) {
      setErr(e.message || 'No se pudo leer la etiqueta'); setPaso('fotos');
    }
    setEstado('');
  }

  const fila = (i, campo, v) => setL((x) => ({ ...x, filas: x.filas.map((f, k) => (k === i ? { ...f, [campo]: v, dudoso: false, confirmado: false } : f)) }));
  const lectNum = useMemo(() => (l ? { ...l, filas: l.filas.map((f) => ({ ...f, porPorcion: num(f.porPorcion), por100: num(f.por100) })) } : null), [l]);
  const producto = useMemo(() => (lectNum ? productoDesdeLectura(lectNum, { quien }) : null), [lectNum, quien]);
  const malos = lectNum ? lectNum.filas.filter((f) => Number.isNaN(f.porPorcion) || Number.isNaN(f.por100)).length : 0;
  const sinPorcion = lectNum ? faltaPorcion(lectNum) : false;
  const hay100 = l?.filas.some((f) => String(f.por100 ?? '') !== ''); const hayPorcion = l?.filas.some((f) => String(f.porPorcion ?? '') !== '');
  const u = l?.porcion?.unidad === 'ml' ? 'ml' : 'g';
  const v100 = (c) => producto?.valores.find((x) => x.codigo === c)?.cantidad;
  const offAqui = off && off.codigo === l?.codigo_barras ? off : null;
  const comparables = offAqui ? RES.filter(([c]) => v100(c) != null && offAqui.v[c] != null) : [];
  const difieren = comparables.filter(([c]) => Math.abs(v100(c) - offAqui.v[c]) > (c === 'energia_kcal' ? Math.max(8, 0.08 * offAqui.v[c]) : Math.max(1, 0.1 * offAqui.v[c]))).map(([c]) => nombreNutriente(c).replace(/ \(kcal\)/, '').toLowerCase());

  async function guardar() {
    setGuardando(true);
    try { const f = await nutri.guardarAlimento(producto, token); avisar('Producto guardado con los datos de su etiqueta'); onGuardado?.(f); }
    catch (e) { avisar(e.message, 'error'); }
    setGuardando(false);
  }

  if (paso === 'revisar' && l) return (
    <Hoja titulo="Revisa la etiqueta" onCerrar={onCerrar} acciones={<><button className="btn" onClick={() => { setPaso('fotos'); setL(null); }}>Otras fotos</button>
      <button className="btn oro" disabled={guardando || !l.nombre.trim() || !producto?.valores.length || malos > 0 || sinPorcion} onClick={guardar}>{guardando ? 'Guardando…' : 'Guardar producto'}</button></>}>
      {l.origen === 'ia' ? <p className="aviso etq-origen"><Ico n="check" s={18} /><span><b>Leído con IA.</b> Compara cada número con la foto antes de guardar.</span></p>
        : <p className="aviso etq-origen tel"><Ico n="camara" s={18} /><span><b>Leído en el teléfono.</b> Revisa cada valor con la foto: lo dudoso queda en ámbar y lo que coincide con el % del valor diario lleva ✓.{motivo ? ` ${motivo}` : ''}</span></p>}
      <button className="btn chico fant" onClick={() => setVerFoto(!verFoto)}><Ico n={verFoto ? 'arriba' : 'abajo'} s={16} />{verFoto ? 'Ocultar la foto de la tabla' : 'Ver la foto de la tabla'}</button>
      {verFoto && <img className="etq-ver" src={tabla.url} alt="Tabla nutricional" />}
      <Campo l="Nombre del producto"><input className="in" value={l.nombre} onChange={(e) => setL({ ...l, nombre: e.target.value })} placeholder="Hojuelas de avena integral" /></Campo>
      {l.lineas_frente?.length > 0 && <div className="etq-lineas"><small>Del frente: toca para usarlo</small><div className="chips">{l.lineas_frente.map((t) => <span key={t} className="etq-l">
        <button className="chip" onClick={() => setL({ ...l, nombre: l.nombre && !l.nombre.includes(t) ? `${l.nombre} ${t}` : t })}>{t}</button>
        <button className="chip marca" onClick={() => setL({ ...l, marca: t })} aria-label={`Usar ${t} como marca`}>marca</button></span>)}</div></div>}
      <div className="dos"><Campo l="Marca"><input className="in" value={l.marca} onChange={(e) => setL({ ...l, marca: e.target.value })} /></Campo>
        <Campo l="Código de barras" ayuda={l.codigo_barras && AYUDA_CODIGO[l.codigo_estado]}><input className={`in num ${l.codigo_estado === 'distinto' ? 'etq-dudoso' : ''}`} inputMode="numeric" value={l.codigo_barras} onChange={(e) => setL({ ...l, codigo_barras: e.target.value.replace(/\D/g, ''), codigo_estado: '' })} placeholder="Opcional" aria-label="Código de barras" /></Campo></div>
      <Campo l="Tamaño de la porción" ayuda={sinPorcion ? 'La tabla da valores por porción: falta saber cuántos g o ml es una porción.' : l.porcion.texto ? `La etiqueta dice: ${l.porcion.texto}` : null}>
        <div className="etq-porc"><input className={`in num ${sinPorcion || l.porcion.dudosa ? 'falta' : ''}`} inputMode="decimal" value={fmtN(l.porcion.cantidad)} onChange={(e) => setL({ ...l, porcion: { ...l.porcion, cantidad: num(e.target.value), dudosa: false } })} aria-label="Porción en gramos o mililitros" />
          <div className="seg"><button className={u === 'g' ? 'on' : ''} onClick={() => setL({ ...l, porcion: { ...l.porcion, unidad: 'g' } })}>g</button><button className={u === 'ml' ? 'on' : ''} onClick={() => setL({ ...l, porcion: { ...l.porcion, unidad: 'ml' } })}>ml</button></div></div></Campo>
      <p className="etq" style={{ margin: '6px 0 6px' }}>Tabla nutricional</p>
      <div className="etq-tab">
        <div className="etq-tab-h"><span>Nutriente</span><span>Por porción{l.porcion.cantidad ? ` (${fmtN(l.porcion.cantidad)} ${u})` : ''}</span><span>Por 100 {u}</span><span /></div>
        {l.filas.map((f, i) => { const calc = String(f.por100 ?? '') === '' && v100(f.codigo) != null;
          return <div key={f.codigo} className={`etq-tab-f ${f.dudoso ? 'dudoso' : ''}`}>
            <span>{nombreNutriente(f.codigo)}{f.confirmado && <i className="etq-ok" title="Coincide con el % del valor diario de la etiqueta" aria-label="coincide con el % del valor diario"><Ico n="check" s={12} /></i>}<small>{f.unidad}</small></span>
            <input className="in num" inputMode="decimal" value={fmtN(f.porPorcion)} placeholder={hayPorcion ? '—' : ''} onChange={(e) => fila(i, 'porPorcion', e.target.value)} aria-label={`${nombreNutriente(f.codigo)} por porción`} />
            <input className="in num" inputMode="decimal" value={fmtN(f.por100)} placeholder={calc ? fmtN(v100(f.codigo)) : hay100 ? '—' : ''} onChange={(e) => fila(i, 'por100', e.target.value)} aria-label={`${nombreNutriente(f.codigo)} por 100`} />
            <button className="ico-b" onClick={() => setL({ ...l, filas: l.filas.filter((_, k) => k !== i) })} aria-label={`Quitar ${nombreNutriente(f.codigo)}`}><Ico n="cerrar" s={14} /></button></div>; })}
        <div className="etq-mas"><select className="in" value={agregar} onChange={(e) => { const c = e.target.value; if (c) setL({ ...l, filas: [...l.filas, { codigo: c, porPorcion: null, por100: null, unidad: unidadDe(c), etiqueta: '' }].sort((a, b) => CLAVES_ETIQUETA.indexOf(a.codigo) - CLAVES_ETIQUETA.indexOf(b.codigo)) }); setAgregar(''); }} aria-label="Agregar nutriente">
          <option value="">+ Agregar un nutriente de la etiqueta</option>{CLAVES_ETIQUETA.filter((c) => !l.filas.some((f) => f.codigo === c)).map((c) => <option key={c} value={c}>{nombreNutriente(c)} ({unidadDe(c)})</option>)}</select></div>
      </div>
      {malos > 0 && <p className="aviso rojo"><span>Hay {malos === 1 ? 'un valor que no es' : `${malos} valores que no son`} número. Usa solo números (ej: 2,5).</span></p>}
      {producto?.valores.length > 0 && <div className="etq-res"><small>Así queda por 100 {u}</small><div>{RES.map(([c, t]) => <span key={c}><b className="num">{v100(c) != null ? fmtN(Math.round(v100(c) * 10) / 10) : '—'}</b> {t}</span>)}</div></div>}
      {offAqui && <div className="etq-off">
        <small>Este código está en Open Food Facts (datos colaborativos, sin verificar): compáralo con tu foto</small>
        <b className="etq-off-n">{offAqui.nombre}{offAqui.marca ? ` · ${offAqui.marca}` : ''}</b>
        {RES.some(([c]) => offAqui.v[c] != null) && <div className="etq-off-v">{RES.map(([c, t]) => <span key={c}><b className="num">{offAqui.v[c] != null ? fmtN(Math.round(offAqui.v[c] * 10) / 10) : '—'}</b> {t}</span>)}</div>}
        {comparables.length > 0 && <p className={difieren.length ? 'dif' : 'igual'}>{difieren.length ? `Difiere de lo leído en ${difieren.join(', ')}: mira la foto para decidir.` : 'Coincide con lo leído de la foto.'}</p>}
        {(offAqui.nombre !== l.nombre || offAqui.marca !== l.marca) && <button className="btn chico" onClick={() => setL({ ...l, nombre: offAqui.nombre || l.nombre, marca: offAqui.marca || l.marca })}>Usar su nombre y marca</button>}
      </div>}
      {[...(l.avisos || []), ...(producto?.sospechosos || [])].length > 0 && <ul className="etq-avisos">{[...(l.avisos || []), ...(producto?.sospechosos || [])].map((a) => <li key={a}>{a}</li>)}</ul>}
      <p className="ayuda">Se guarda como producto de marca con los datos de su etiqueta (no es un análisis de laboratorio). Lo que no pongas queda vacío: no se cuenta como cero. Las fotos no se guardan.</p>
    </Hoja>
  );

  return (
    <Hoja titulo="Leer etiqueta" onCerrar={onCerrar} acciones={paso === 'fotos' && <><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!tabla} onClick={() => leer(false)}><Ico n="buscar" s={18} />Leer etiqueta</button></>}>
      {paso === 'leyendo' ? <div className="etq-leyendo"><span className="gira" aria-hidden="true" /><b>{estado || 'Leyendo…'}</b><small>{/Preparando/.test(estado) ? 'Es gratis y queda en el teléfono: solo la primera vez descarga el lector (unos 10 MB). ' : ''}No cierres esta ventana.</small></div> : <>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Toma dos fotos del envase y la app arma el producto con su nombre y su tabla nutricional. Después revisas y lo guardas.</p>
        <div className="etq-fotos">
          <Foto titulo="1. Frente del producto" ayuda="Para el nombre, la marca y el código" foto={frente} onFoto={foto(setFrente)} />
          <Foto titulo="2. Tabla nutricional" ayuda="Obligatoria" foto={tabla} onFoto={foto(setTabla)} obligatoria />
        </div>
        <ul className="etq-tips"><li>De frente y con buena luz, sin reflejos.</li><li>Que la tabla salga completa y ocupe casi toda la foto.</li><li>Si la tabla está en un lado curvo, gira el envase para que quede plana.</li></ul>
        {err && <p className="aviso rojo"><span>{err}</span></p>}
        {err && tabla && <button className="btn full" onClick={() => leer(true)}>Leer en el teléfono</button>}
      </>}
    </Hoja>
  );
}
