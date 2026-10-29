// Ficha nutricional completa con su procedencia: de dónde sale cada número, si es un cero real,
// si está bajo el límite de cuantificación o si la fuente no lo da.
import React, { useEffect, useMemo, useState } from 'react';
import { Hoja, Ico } from '../../ui/kit.jsx';
import { ESTADOS, GRUPOS } from '../../lib/nutricion/catalogo.js';
import { CALIDADES } from '../../lib/nutricion/clasificar.js';
import { nutrientesDe, FACTOR_SAL } from '../../lib/nutricion/calculo.js';
import { Calidad, metodoTexto, nCant, n0, n1, nombresDatos, prepTexto } from './comunes.jsx';

export const compactaDeFicha = (f) => f && ({
  id: f.id, nombre: f.nombre, nombre_original: f.nombre_original, fuente: f.fuente_id || f.fuente?.id || f.fuente, calidad: f.calidad, tipo: f.tipo, preparacion: f.preparacion, base: f.base,
  energia_ref: f.energia_ref, historico: f.historico, publicado: f.publicado, version: f.version, marca: f.marca,
  valores: Object.fromEntries((f.valores || []).map((v) => [v.codigo, { c: v.cantidad, e: v.estado }])),
  porciones: (f.porciones || []).map((p) => ({ d: p.descripcion, g: p.gramos })),
});

const MARCA_ESTADO = { cero_asumido: '0 asumido', cero_publicado: '0 · posible < LQ', cero_calculado: '0 calculado', sin_valor: 'sin dato', etiqueta: 'etiqueta', colaborativo: 'colaborativo', personalizado: 'coach', imputado: 'estimado', calculado: 'calculado', analitico: 'analizado', fabricante: 'fabricante', sin_codigo: '' };

export function Cantidad({ ficha, gramos, setGramos }) {
  const porciones = ficha?.porciones || [];
  return (
    <div className="cant">
      <label className="cant-g"><input className="in num" inputMode="decimal" value={gramos} onFocus={(e) => e.target.select()} onChange={(e) => setGramos(e.target.value.replace(',', '.'))} aria-label="Gramos" /><span>g</span></label>
      <div className="chips">{[50, 100, 150, 200].map((g) => <button key={g} className={`chip ${Number(gramos) === g ? 'on' : ''}`} onClick={() => setGramos(String(g))}>{g} g</button>)}
        {porciones.slice(0, 6).map((p, i) => <button key={i} className={`chip ${Number(gramos) === p.g ? 'on' : ''}`} onClick={() => setGramos(String(p.g))}>{p.d} · {n0(p.g)} g</button>)}</div>
    </div>
  );
}

// dentro=true: se dibuja dentro de la hoja que la abre (con "‹ Volver"), sin otra capa oscura encima
export default function FichaAlimento({ id, nutri, token, onCerrar, onAgregar, accion = 'Agregar', gramosIni = 100, onAlternativa, dentro = false, volverTexto = 'Resultados' }) {
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [g, setG] = useState(String(gramosIni)); const [todo, setTodo] = useState(false);
  useEffect(() => { let vivo = true; setF(null); setErr(''); nutri.ficha(id, token).then((x) => { if (!vivo) return; if (!x) setErr('No encontré esa ficha.'); else setF(x); }, (e) => vivo && setErr(e.message)); return () => { vivo = false; }; }, [id, nutri, token]);
  const comp = useMemo(() => compactaDeFicha(f), [f]);
  const gramos = Number(g);
  const r = useMemo(() => (comp && gramos > 0 ? nutrientesDe(comp, gramos) : null), [comp, gramos]);
  const grupos = useMemo(() => { const m = {}; (f?.valores || []).forEach((v) => { (m[v.grupo] = m[v.grupo] || []).push(v); }); return m; }, [f]);
  const fte = f?.fuente || {};
  // una opción por preparación (la primera es la de mejor fuente) y sin repetir la de esta ficha
  const alternativas = useMemo(() => { const vistas = new Set([f?.preparacion]); return (f?.alternativas || []).filter((a) => !vistas.has(a.preparacion) && vistas.add(a.preparacion)).slice(0, 6); }, [f]);
  const acciones = onAgregar && f ? <><button className="btn" onClick={onCerrar}>Volver</button><button className="btn oro" disabled={!(gramos > 0)} onClick={() => onAgregar(comp, gramos)}>{accion} {gramos > 0 ? `${n0(gramos)} g` : ''}</button></> : null;
  const cuerpo = (<>
      {err && <p className="aviso rojo"><span>{err}</span></p>}
      {!f && !err && <div className="esq" aria-label="Cargando"><i /><i /><i style={{ width: '60%' }} /><b /></div>}
      {f && <>
        <p className="ficha-orig">{f.nombre_original}{f.nombre_traducido ? <small> · nombre traducido automáticamente del inglés</small> : null}</p>
        <div className="ficha-tags"><Calidad calidad={f.calidad} fuente={f.fuente_id || fte.id} historico={f.historico} /><span className="q">{prepTexto(f.preparacion)}</span>{f.marca && <span className="q">{f.marca}</span>}{f.codigo_barras && <span className="q num">{f.codigo_barras}</span>}</div>
        {(f.sospechosos || []).length > 0 && <p className="aviso rojo" style={{ marginTop: 10 }}><Ico n="ojo" s={18} /><span><b>Revisa estos datos:</b> {f.sospechosos.join(' · ')}</span></p>}
        {alternativas.length > 0 && <div className="ficha-alt"><small>Otras preparaciones:</small>{alternativas.map((a) => <button key={a.id} className="chip" onClick={() => onAlternativa?.(a.id)}>{prepTexto(a.preparacion)}</button>)}</div>}
        {onAgregar && <><p className="etq" style={{ margin: '14px 0 6px' }}>Cantidad (los valores son por {f.base})</p><Cantidad ficha={comp} gramos={g} setGramos={setG} /></>}
        {r && <div className="ficha-tot">
          <div><b className="num">{n0(r.principales.kcal)}</b><span>kcal</span></div><div><b className="num">{n1(r.principales.proteina)}</b><span>proteína</span></div>
          <div><b className="num">{n1(r.principales.carbohidratos)}</b><span>carbos</span></div><div><b className="num">{n1(r.principales.grasa)}</b><span>grasa</span></div>
        </div>}
        {r && r.desconocidos.length > 0 && <p className="ayuda" style={{ margin: '6px 0 0' }}>Esta ficha no trae: {nombresDatos(r.desconocidos)}. No se cuentan como cero.</p>}
        {r?.definiciones?.kcal && r.definiciones.kcal !== 'energia_kcal' && <p className="ayuda" style={{ margin: '4px 0 0' }}>Energía: {r.definiciones.kcal === 'derivada_de_kj' ? 'convertida de kJ (÷ 4,184)' : r.definiciones.kcal === 'energia_atwater_especifica_kcal' ? 'factores de Atwater específicos (USDA)' : 'factores de Atwater generales (USDA)'}.</p>}
        {r?.definiciones?.sal === 'calculada_de_sodio' && <p className="ayuda" style={{ margin: '4px 0 0' }}>Sal calculada: sodio × {String(FACTOR_SAL).replace('.', ',')} (la fuente no la declara).</p>}
        <div className="ficha-val">
          {Object.entries(GRUPOS).filter(([k]) => grupos[k]).map(([k, t]) => (
            <details key={k} open={k === 'energia' || k === 'macro' || todo}><summary>{t}<small>{grupos[k].length}</small></summary>
              {grupos[k].map((v) => <div key={v.codigo} className={`fv ${v.cantidad == null ? 'nd' : ''}`} title={v.definicion || ''}>
                <span>{v.nombre}</span><b className="num">{v.cantidad == null ? '—' : nCant(r ? (gramos * v.cantidad) / 100 : v.cantidad, v.unidad)}</b>
                <i className={`fe e-${v.estado}`} title={ESTADOS[v.estado]}>{MARCA_ESTADO[v.estado] ?? v.estado}</i>
                {(v.n > 1 || v.nota || v.metodo) && <small title={v.metodo || ''}>{[metodoTexto(v.metodo), v.n > 1 ? `${v.n} muestras${v.minimo != null ? ` · ${nCant(v.minimo)}–${nCant(v.maximo)} ${v.unidad}/100 g` : ''}` : '', v.nota].filter(Boolean).join(' · ')}</small>}
              </div>)}
            </details>))}
          {!todo && <button className="btn fant full" onClick={() => setTodo(true)}>Abrir todos los grupos</button>}
        </div>
        <div className="ficha-proc">
          <p className="etq">Procedencia</p>
          <p><b>{fte.nombre || f.fuente_id}</b>{f.version ? ` · versión ${f.version}` : ''}{f.publicado ? ` · publicado ${f.publicado}` : ''}</p>
          {f.historico && <p className="ayuda" style={{ margin: '4px 0' }}>Colección histórica: USDA dejó de actualizarla en 2018.</p>}
          <p className="ayuda" style={{ margin: '4px 0' }}>{CALIDADES[f.calidad]?.d}</p>
          {f.id_externo && <p className="ayuda" style={{ margin: '4px 0' }}>Identificador en la fuente: {f.id_externo}{f.ids?.ndb ? ` · NDB ${f.ids.ndb}` : ''}{f.ids?.fndds ? ` · código FNDDS ${f.ids.fndds}` : ''}</p>}
          {f.importacion && <p className="ayuda" style={{ margin: '4px 0' }}>Importado de {f.importacion.archivo || 'la descarga oficial'}{f.importacion.terminado ? ` el ${String(f.importacion.terminado).slice(0, 10)}` : ''}.</p>}
          {f.autor && <p className="ayuda" style={{ margin: '4px 0' }}>Cargado por: {f.autor}</p>}
          {f.cambios > 0 && <p className="ayuda" style={{ margin: '4px 0' }}>{f.cambios} {f.cambios === 1 ? 'cambio registrado' : 'cambios registrados'} en el historial.</p>}
          <p className="ayuda" style={{ margin: '4px 0' }}>Licencia: {fte.licencia || '—'}{fte.atribucion ? ` · ${fte.atribucion}` : ''}</p>
          {f.ref_url && <a className="btn chico" href={f.ref_url} target="_blank" rel="noreferrer"><Ico n="enlace" s={16} />Ver en la fuente</a>}
        </div>
      </>}
  </>);
  if (dentro) return (
    <div className="ficha-dentro">
      <button className="volver-n" onClick={onCerrar}><Ico n="atras" s={18} />{volverTexto}</button>
      <h3 className="ficha-tit">{f ? f.nombre : 'Ficha nutricional'}</h3>
      {cuerpo}
      {acciones && <div className="hoja-acc">{acciones}</div>}
    </div>
  );
  return <Hoja titulo={f ? f.nombre : 'Ficha nutricional'} onCerrar={onCerrar} acciones={acciones}>{cuerpo}</Hoja>;
}
