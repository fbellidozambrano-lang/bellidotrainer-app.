// Alimentación de un asesorado (coach): objetivos, plan de selección flexible (desde el PDF),
// recetas personalizadas y lo que el asesorado va registrando.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Barra, Campo, Confirmar, Hoja, Ico, Interruptor, ir, useAviso } from '../ui/kit.jsx';
import { POR_CODIGO, MICROS_META } from '../lib/nutricion/catalogo.js';
import { receta as calcReceta } from '../lib/nutricion/calculo.js';
import { leerPlan, objetivosDePlan } from '../lib/nutricion/plan.js';
import { vincularPlan, idsCandidatos, totalOpcion } from '../lib/nutricion/vincular.js';
import { uuid, hoy, primerNombre, fCorta } from '../lib/util.js';
import Buscador from '../shared/nutri/Buscador.jsx';
import Diario, { moverDia } from '../shared/nutri/Diario.jsx';
import { COMIDAS_BASE, nombresComidas, nombresDatos, n0, n1, Calidad } from '../shared/nutri/comunes.jsx';

const num = (v) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : null; };
const txt = (v) => (v == null ? '' : String(v).replace('.', ','));

// ---------- objetivos ----------
function Objetivos({ ini, plan, onGuardar }) {
  const [o, setO] = useState(() => ({ comidas: 4, ...ini }));
  const comidas = nombresComidas(o); const porComida = Array.isArray(o.comidas) && o.comidas.some((c) => c.kcal || c.proteina);
  const [conMacros, setConMacros] = useState(porComida);
  const f = (k, v) => setO((x) => ({ ...x, [k]: v }));
  const setN = (n) => setO((x) => ({ ...x, comidas: Array.from({ length: n }, (_, i) => (Array.isArray(x.comidas) ? x.comidas[i] : null) || { nombre: COMIDAS_BASE[i] }) }));
  const setC = (i, k, v) => setO((x) => { const cs = Array.from({ length: comidas.length }, (_, j) => ({ nombre: comidas[j], ...(Array.isArray(x.comidas) ? x.comidas[j] : {}) })); cs[i] = { ...cs[i], [k]: v }; return { ...x, comidas: cs }; });
  const kcalMacros = (num(o.proteina) || 0) * 4 + (num(o.carbohidratos) || 0) * 4 + (num(o.grasa) || 0) * 9;
  const micros = o.micros || [];
  const limpiar = () => ({
    ...o, kcal: num(o.kcal), proteina: num(o.proteina), carbohidratos: num(o.carbohidratos), grasa: num(o.grasa), agua_ml: num(o.agua_ml), sal_g: num(o.sal_g),
    comidas: comidas.map((n, i) => { const c = Array.isArray(o.comidas) ? o.comidas[i] || {} : {}; return conMacros ? { nombre: c.nombre || n, kcal: num(c.kcal), proteina: num(c.proteina), carbohidratos: num(c.carbohidratos), grasa: num(c.grasa) } : { nombre: c.nombre || n }; }),
    micros: micros.filter((m) => num(m.meta) > 0).map((m) => ({ ...m, meta: num(m.meta) })),
  });
  return (
    <div>
      <div className="dos"><Campo l="Calorías (kcal)"><input className="in num" inputMode="numeric" value={txt(o.kcal)} onChange={(e) => f('kcal', e.target.value)} /></Campo>
        <Campo l="Proteína (g)"><input className="in num" inputMode="decimal" value={txt(o.proteina)} onChange={(e) => f('proteina', e.target.value)} /></Campo></div>
      <div className="dos"><Campo l="Carbohidratos (g)"><input className="in num" inputMode="decimal" value={txt(o.carbohidratos)} onChange={(e) => f('carbohidratos', e.target.value)} /></Campo>
        <Campo l="Grasa (g)"><input className="in num" inputMode="decimal" value={txt(o.grasa)} onChange={(e) => f('grasa', e.target.value)} /></Campo></div>
      {kcalMacros > 0 && <p className={`ayuda ${num(o.kcal) && Math.abs(kcalMacros - num(o.kcal)) > num(o.kcal) * 0.05 ? 'alerta' : ''}`} style={{ marginTop: -4 }}>Los macros suman {n0(kcalMacros)} kcal (4 · 4 · 9){num(o.kcal) ? `: ${Math.abs(kcalMacros - num(o.kcal)) <= num(o.kcal) * 0.05 ? 'cuadra con las calorías' : `${n0(kcalMacros - num(o.kcal))} kcal de diferencia`}` : ''}.</p>}
      <Campo l="Comidas al día"><div className="chips">{[2, 3, 4, 5, 6].map((n) => <button key={n} className={`chip ${comidas.length === n ? 'on' : ''}`} onClick={() => setN(n)}>{n}</button>)}</div></Campo>
      <Interruptor on={conMacros} onChange={setConMacros} label="Macros por comida" ayuda="Opcional: calorías y macros de cada comida" />
      <div className="tabla-c">{comidas.map((n, i) => { const c = Array.isArray(o.comidas) ? o.comidas[i] || {} : {}; return (
        <div key={i} className={`tc ${conMacros ? 'con' : ''}`}>
          <input className="in" value={c.nombre ?? n} onChange={(e) => setC(i, 'nombre', e.target.value)} aria-label={`Nombre de la comida ${i + 1}`} />
          {conMacros && ['kcal', 'proteina', 'carbohidratos', 'grasa'].map((k) => <input key={k} className="in num" inputMode="decimal" placeholder={{ kcal: 'kcal', proteina: 'P', carbohidratos: 'C', grasa: 'G' }[k]} value={txt(c[k])} onChange={(e) => setC(i, k, e.target.value)} aria-label={`${k} de ${n}`} />)}
        </div>); })}
        {conMacros && (() => { const s = (k) => (Array.isArray(o.comidas) ? o.comidas : []).reduce((t, c) => t + (num(c?.[k]) || 0), 0); return <p className="ayuda" style={{ margin: '4px 0 0' }}>Suman {n0(s('kcal'))} kcal · P {n0(s('proteina'))} · C {n0(s('carbohidratos'))} · G {n0(s('grasa'))}</p>; })()}
      </div>
      <div className="dos"><Campo l="Agua (ml al día)"><input className="in num" inputMode="numeric" value={txt(o.agua_ml)} onChange={(e) => f('agua_ml', e.target.value)} placeholder="2500" /></Campo>
        <Campo l="Sal máxima (g al día)"><input className="in num" inputMode="decimal" value={txt(o.sal_g)} onChange={(e) => f('sal_g', e.target.value)} placeholder="5" /></Campo></div>
      <p className="etq" style={{ margin: '6px 0 8px' }}>Micronutrientes (opcional)</p>
      {micros.map((m, i) => { const n = POR_CODIGO.get(m.codigo); return (
        <div key={m.codigo} className="micro-f"><span>{n?.nombre}</span>
          <div className="seg mini"><button className={m.tipo !== 'max' ? 'on' : ''} onClick={() => setO((x) => ({ ...x, micros: micros.map((y, j) => (j === i ? { ...y, tipo: 'min' } : y)) }))}>Mín.</button><button className={m.tipo === 'max' ? 'on' : ''} onClick={() => setO((x) => ({ ...x, micros: micros.map((y, j) => (j === i ? { ...y, tipo: 'max' } : y)) }))}>Máx.</button></div>
          <input className="in num" inputMode="decimal" value={txt(m.meta)} onChange={(e) => setO((x) => ({ ...x, micros: micros.map((y, j) => (j === i ? { ...y, meta: e.target.value } : y)) }))} aria-label={`Meta de ${n?.nombre}`} /><small>{n?.unidad}</small>
          <button className="ico-b" onClick={() => setO((x) => ({ ...x, micros: micros.filter((_, j) => j !== i) }))} aria-label={`Quitar ${n?.nombre}`}><Ico n="cerrar" s={16} /></button></div>); })}
      <div className="chips" style={{ margin: '6px 0 14px' }}>{MICROS_META.filter((c) => !micros.some((m) => m.codigo === c)).map((c) => <button key={c} className="chip" onClick={() => setO((x) => ({ ...x, micros: [...micros, { codigo: c, meta: '', tipo: ['sodio', 'azucares_totales', 'grasa_saturada', 'colesterol'].includes(c) ? 'max' : 'min' }] }))}>+ {POR_CODIGO.get(c)?.nombre}</button>)}</div>
      {plan?.semana1 && <p className="ayuda">Semana 1 del plan: {n0(plan.semana1.kcal)} kcal · C {n0(plan.semana1.carbohidratos)} g. El asesorado ve esos números los primeros 7 días desde el {fCorta(plan.emitido)}.</p>}
      <button className="btn oro full" style={{ marginTop: 8 }} onClick={() => onGuardar(limpiar())}>Guardar objetivos</button>
    </div>
  );
}

// ---------- plan desde el PDF ----------
// los números del plan reemplazan a los anteriores; lo que el plan no trae (sal, micronutrientes, agua si no la dice) se conserva
const deDosPlanes = (antes, plan) => { const o = objetivosDePlan(plan); return { ...(antes || {}), ...Object.fromEntries(Object.entries(o).filter(([, v]) => v != null)), semana1: o.semana1 || null }; };
function VistaPlan({ plan, fichas, onCambiarVinculo }) {
  const fila = (o, i, tipo) => { const t = totalOpcion(o, fichas); const lejos = o.items?.some((it) => it.diferencia > 20);
    return <div key={`${tipo}${i}`} className="pv-o">
      <div className="pv-t"><strong>{o.nombre}</strong><span>{o.cantidad || `${o.gramos} g`}{o.no_semana1 ? ' · no en sem. 1' : ''}</span></div>
      {(o.items || []).map((it, k) => <button key={k} className={`pv-v ${it.vinculo === 'sin_ficha' ? 'sin' : lejos ? 'lejos' : ''}`} onClick={() => onCambiarVinculo(it)}>
        <Ico n={it.vinculo === 'sin_ficha' ? 'ojo' : 'enlace'} s={14} />{it.alimento_nombre || 'Sin ficha: toca para elegir'}{it.vinculo === 'coach' ? ' · elegido por ti' : ''}{it.diferencia > 20 ? ` · ${it.diferencia} % distinto al plan` : ''}</button>)}
      {t.completo && <small className="pv-c">Ficha: {n0(t.kcal)} kcal · P {n1(t.proteina)} · C {n1(t.carbohidratos)} · G {n1(t.grasa)}{o.proteina != null ? ` — plan: P ${txt(o.proteina)}${o.grasa != null ? ` · G ${txt(o.grasa)}` : ''}${o.carbohidratos != null ? ` · C ${txt(o.carbohidratos)}` : ''}` : ''}</small>}
    </div>; };
  return (
    <div>
      {plan.comidas.map((c, i) => <details key={i} className="pv" open={i === 0}><summary>{c.nombre}<small>{c.kcal ? `${n0(c.kcal)} kcal · P ${c.proteina} · C ${c.carbohidratos_meta} · G ${c.grasa}` : ''}</small></summary>
        {c.proteinas.length > 0 && <p className="pl-t">Proteínas</p>}{c.proteinas.map((o, k) => fila(o, k, 'p'))}
        {c.frutas.length > 0 && <p className="pl-t">Frutas (½ porción)</p>}{c.frutas.map((o, k) => fila(o, k, 'f'))}
        {c.carbohidratos.length > 0 && <p className="pl-t">Carbohidratos</p>}{c.carbohidratos.map((o, k) => fila(o, k, 'c'))}
      </details>)}
      {plan.grasas?.length > 0 && <details className="pv"><summary>Grasas (1 porción)<small>{plan.grasas.length} opciones</small></summary>{plan.grasas.map((o, k) => fila(o, k, 'g'))}</details>}
    </div>
  );
}

function PlanPDF({ a, nutri, actual, objetivos, onGuardar }) {
  const avisar = useAviso(); const ref = useRef();
  const [nuevo, setNuevo] = useState(null); const [fichas, setFichas] = useState({}); const [usarObj, setUsarObj] = useState(true); const [err, setErr] = useState(''); const [leyendo, setLeyendo] = useState(false);
  const [relink, setRelink] = useState(null); const [quitar, setQuitar] = useState(false);
  const plan = nuevo?.plan || actual;
  useEffect(() => { if (!actual || nuevo) return; const ids = idsCandidatos(actual); const propios = []; JSON.stringify(actual, (k, v) => { if (k === 'alimento_id' && typeof v === 'string') propios.push(v); return v; });
    nutri.fichas([...ids, ...propios]).then(setFichas, () => {}); }, [actual, nuevo, nutri]);
  async function leer(e) {
    const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; setErr(''); setLeyendo(true);
    try {
      const { lineasDePdf } = await import('../data/informe.js');
      const p = leerPlan(await lineasDePdf(await file.arrayBuffer())); const ids = idsCandidatos(p); const fs = await nutri.fichas(ids);
      const v = vincularPlan(p, fs); setFichas(fs); setNuevo({ ...v, archivo: file.name });
      if (!Object.keys(fs).length) setErr('La base de alimentos está vacía: importa USDA en Base de alimentos para que el plan se calcule con fichas reales.');
    } catch (x) { setErr(x.message); }
    setLeyendo(false);
  }
  // el mismo alimento del plan (por su nombre) pasa a la ficha elegida en todas las comidas
  const cambiar = (it, f) => {
    const p = JSON.parse(JSON.stringify(plan));
    const recorrer = (o) => { if (!o || typeof o !== 'object') return; if ('vinculo' in o && o.nombre === it.nombre) { o.alimento_id = f.id; o.alimento_nombre = f.nombre; o.vinculo = 'coach'; o.diferencia = 0; } Object.values(o).forEach(recorrer); };
    recorrer(p); setFichas((x) => ({ ...x, [f.id]: f }));
    if (nuevo) setNuevo({ ...nuevo, plan: p }); else onGuardar({ plan: p }, `${it.nombre}: ficha cambiada en todo el plan`);
  };
  const sinFicha = useMemo(() => { const s = new Set(); JSON.stringify(plan || {}, (k, v) => { if (v && typeof v === 'object' && v.vinculo === 'sin_ficha') s.add(v.nombre); return v; }); return [...s]; }, [plan]);
  return (
    <div>
      <input ref={ref} type="file" accept="application/pdf" hidden onChange={leer} />
      {!plan && <div className="vacio"><b>Sube el PDF del plan de selección flexible</b>La app lee las calorías, los macros por comida, las opciones de proteína y carbohidrato con sus cantidades, las frutas y las equivalencias de grasa. Cada alimento se une a su ficha real de USDA para calcular con datos verificados.
        <button className="btn oro" style={{ marginTop: 12 }} disabled={leyendo} onClick={() => ref.current.click()}><Ico n="subir" s={18} />{leyendo ? 'Leyendo…' : 'Subir plan (PDF)'}</button></div>}
      {err && <p className="aviso rojo"><span>{err}</span></p>}
      {plan && <>
        <div className="tarj pv-res">
          <p className="etq">{nuevo ? `Leído de ${nuevo.archivo}` : 'Plan actual'}</p>
          <h3>{plan.nombre || 'Plan'}{plan.emitido ? <small> · emitido el {fCorta(plan.emitido)}</small> : null}</h3>
          <p>{n0(plan.objetivos?.kcal)} kcal · P {plan.objetivos?.proteina} · C {plan.objetivos?.carbohidratos} · G {plan.objetivos?.grasa} · {plan.comidas.length} comidas{plan.agua ? ` · agua ${txt(plan.agua.min_ml / 1000)}–${txt(plan.agua.max_ml / 1000)}\u00a0L` : ''}</p>
          {plan.semana1 && <p className="ayuda" style={{ margin: '4px 0 0' }}>Semana 1: {n0(plan.semana1.kcal)} kcal · C {plan.semana1.carbohidratos} g</p>}
          {plan.nombre && primerNombre(plan.nombre).toLowerCase() !== primerNombre(a.nombre).toLowerCase() && <p className="aviso rojo"><span>Este plan dice <b>{plan.nombre}</b>, pero estás en la ficha de <b>{a.nombre}</b>. Revisa que sea el correcto.</span></p>}
          {sinFicha.length > 0 && <p className="aviso rojo"><span><b>Sin ficha nutricional:</b> {sinFicha.join(', ')}. Toca cada uno para elegir su alimento.</span></p>}
          {nuevo && <p className="ayuda" style={{ margin: '6px 0 0' }}>{nuevo.resumen.vinculados} alimentos unidos a su ficha. Los vínculos en ámbar difieren más de 20 % de los macros que dice el plan: tócalos si quieres otro.</p>}
        </div>
        <VistaPlan plan={plan} fichas={fichas} onCambiarVinculo={setRelink} />
        {nuevo ? <>
          <Interruptor on={usarObj} onChange={setUsarObj} label="Usar los objetivos del plan" ayuda="Calorías, macros por comida y agua" />
          <div className="fila-btn" style={{ marginTop: 8 }}><button className="btn" onClick={() => setNuevo(null)}>Descartar</button>
            <button className="btn oro" onClick={() => { onGuardar({ plan: nuevo.plan, ...(usarObj ? { objetivos: deDosPlanes(objetivos, nuevo.plan) } : {}) }, 'Plan guardado: tu asesorado ya lo ve'); setNuevo(null); }}>Guardar plan</button></div>
        </> : <div className="fila-btn" style={{ marginTop: 12 }}><button className="btn" onClick={() => ref.current.click()}><Ico n="subir" s={16} />Reemplazar con otro PDF</button><button className="btn peligro" onClick={() => setQuitar(true)}>Quitar plan</button></div>}
      </>}
      {relink && <Buscador nutri={nutri} titulo={`Ficha para “${relink.nombre}”`} accion="Usar" onCerrar={() => setRelink(null)} onElegir={(f) => { cambiar(relink, f); setRelink(null); avisar(`${relink.nombre} → ${f.nombre}`); }} />}
      {quitar && <Confirmar titulo="¿Quitar el plan?" texto="El asesorado deja de ver las opciones del plan. Sus objetivos y su registro no se borran." si="Quitar" peligro onNo={() => setQuitar(false)} onSi={() => { setQuitar(false); onGuardar({ plan: null }, 'Plan quitado'); }} />}
    </div>
  );
}

// ---------- recetas ----------
function EditorReceta({ ini, comidas, nutri, fichasIni, onGuardar, onBorrar, onCerrar }) {
  const [r, setR] = useState(() => ({ nombre: '', porciones: 1, comida: '', ingredientes: [], nota: '', ...ini }));
  const [fichas, setFichas] = useState(fichasIni || {}); const [buscar, setBuscar] = useState(false); const [conf, setConf] = useState(false);
  const c = calcReceta({ ...r, porciones: num(r.porciones) || 1, ingredientes: r.ingredientes.map((i) => ({ ...i, gramos: num(i.gramos) || 0 })) }, fichas);
  return (
    <Hoja titulo={ini?.id ? 'Receta' : 'Nueva receta'} onCerrar={onCerrar}
      acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={!r.nombre.trim() || !r.ingredientes.length} onClick={() => onGuardar({ ...r, id: r.id || uuid(), nombre: r.nombre.trim(), porciones: num(r.porciones) || 1, ingredientes: r.ingredientes.map((i) => ({ ...i, gramos: num(i.gramos) || 0 })) })}>Guardar</button></>}>
      <Campo l="Nombre"><input className="in" autoFocus={!ini?.id} value={r.nombre} onChange={(e) => setR({ ...r, nombre: e.target.value })} placeholder="Revoltillo con arepa" /></Campo>
      <div className="dos"><Campo l="Rinde (porciones)"><input className="in num" inputMode="decimal" value={txt(r.porciones)} onChange={(e) => setR({ ...r, porciones: e.target.value })} /></Campo>
        <Campo l="Comida sugerida"><select className="in" value={r.comida || ''} onChange={(e) => setR({ ...r, comida: e.target.value })}><option value="">Cualquiera</option>{comidas.map((n) => <option key={n}>{n}</option>)}</select></Campo></div>
      <p className="etq" style={{ margin: '4px 0 6px' }}>Ingredientes (en crudo, en gramos)</p>
      {r.ingredientes.map((i, k) => <div key={k} className="ing"><div><strong>{i.nombre}</strong>{fichas[i.alimento_id] && <Calidad calidad={fichas[i.alimento_id].calidad} fuente={fichas[i.alimento_id].fuente} corto />}</div>
        <input className="in num" inputMode="decimal" value={txt(i.gramos)} onChange={(e) => setR({ ...r, ingredientes: r.ingredientes.map((x, j) => (j === k ? { ...x, gramos: e.target.value } : x)) })} aria-label={`Gramos de ${i.nombre}`} /><small>g</small>
        <button className="ico-b" onClick={() => setR({ ...r, ingredientes: r.ingredientes.filter((_, j) => j !== k) })} aria-label={`Quitar ${i.nombre}`}><Ico n="cerrar" s={16} /></button></div>)}
      <button className="btn chico" style={{ margin: '6px 0 12px' }} onClick={() => setBuscar(true)}><Ico n="mas" s={16} />Ingrediente</button>
      {r.ingredientes.length > 0 && <div className="ficha-tot"><div><b className="num">{n0(c.porPorcion.kcal)}</b><span>kcal/porción</span></div><div><b className="num">{n1(c.porPorcion.proteina)}</b><span>proteína</span></div><div><b className="num">{n1(c.porPorcion.carbohidratos)}</b><span>carbos</span></div><div><b className="num">{n1(c.porPorcion.grasa)}</b><span>grasa</span></div></div>}
      {c.desconocidos.length > 0 && <p className="ayuda">Algún ingrediente no trae: {nombresDatos(c.desconocidos)}.</p>}
      <Campo l="Preparación o nota"><textarea className="in" rows={2} value={r.nota || ''} onChange={(e) => setR({ ...r, nota: e.target.value })} placeholder="Revuelve las claras con tomate y cebolla…" /></Campo>
      {ini?.id && <button className="btn peligro full" onClick={() => setConf(true)}><Ico n="basura" s={16} />Borrar receta</button>}
      {buscar && <Buscador nutri={nutri} titulo="Ingrediente" accion="Usar" onCerrar={() => setBuscar(false)} onElegir={(f, g) => { setFichas((x) => ({ ...x, [f.id]: f })); setR((x) => ({ ...x, ingredientes: [...x.ingredientes, { alimento_id: f.id, nombre: f.nombre, gramos: g }] })); setBuscar(false); }} />}
      {conf && <Confirmar titulo="¿Borrar la receta?" texto="El asesorado deja de verla. Lo que ya registró con ella queda en su diario." si="Borrar" peligro onNo={() => setConf(false)} onSi={() => { setConf(false); onBorrar(ini.id); }} />}
    </Hoja>
  );
}

export default function AlimentacionCoach({ a, store }) {
  const avisar = useAviso(); const nutri = store.nutri; const nom = primerNombre(a.nombre);
  const [tab, setTab] = useState(() => sessionStorage.getItem('bt:ntab') || 'registro');
  const [datos, setDatos] = useState(null); const [err, setErr] = useState(''); const [fecha, setFecha] = useState(hoy()); const [receta, setReceta] = useState(null);
  const cargar = useCallback(async () => {
    try {
      const [p, recetas, registros] = await Promise.all([nutri.plan(a.id), nutri.recetas(a.id), nutri.registros(a.id, moverDia(fecha, -6), fecha)]);
      const ids = []; JSON.stringify([p.plan, recetas, registros], (k, v) => { if (k === 'alimento_id' && typeof v === 'string') ids.push(v); return v; });
      const fichas = await nutri.fichas(ids.slice(0, 300));
      setDatos({ objetivos: p.objetivos || {}, plan: p.plan, recetas, registros, fichas }); setErr('');
    } catch (e) { setErr(e.message); }
  }, [nutri, a.id, fecha]);
  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { sessionStorage.setItem('bt:ntab', tab); }, [tab]);
  async function guardarPlan(cambios, msg) {
    const n = { objetivos: datos.objetivos, plan: datos.plan, ...cambios };
    try { await nutri.guardarPlan(a.id, n); setDatos((d) => ({ ...d, ...cambios })); avisar(msg || 'Guardado'); cargar(); } catch (e) { avisar(e.message, 'error'); }
  }
  const comidas = datos ? nombresComidas(datos.objetivos) : [];
  const semana = datos ? Array.from({ length: 7 }, (_, i) => moverDia(fecha, i - 6)).map((f) => ({ f, kcal: datos.registros.filter((r) => r.fecha === f && r.tipo !== 'agua').reduce((t, r) => t + (Number(r.nutrientes?.kcal) || 0), 0), n: datos.registros.filter((r) => r.fecha === f).length })) : [];
  const meta = datos?.objetivos?.kcal;
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir('a', a.id), texto: nom }} titulo="Alimentación" derecha={<button className="ico-b" onClick={() => ir('alimentos')} aria-label="Base de alimentos"><Ico n="libro" /></button>} />
      <nav className="tabs-dias" style={{ marginTop: 12, marginBottom: 14 }}>{[['registro', 'Registro'], ['objetivos', 'Objetivos'], ['plan', 'Plan'], ['recetas', 'Recetas']].map(([k, t]) => <button key={k} className={`tab-dia ${tab === k ? 'on' : ''}`} onClick={() => setTab(k)}>{t}</button>)}</nav>
      {err && <p className="aviso rojo"><span>{err}</span><button className="btn chico" onClick={cargar}>Reintentar</button></p>}
      {!datos && !err && <p className="muted" style={{ marginTop: 16 }}>Cargando…</p>}
      {datos && tab === 'registro' && <>
        <div className="semana-n">{semana.map((d) => <button key={d.f} className={`sn ${d.f === fecha ? 'on' : ''}`} onClick={() => setFecha(d.f)}>
          <i style={{ height: `${meta ? Math.min(100, (d.kcal / meta) * 100) : d.kcal ? 60 : 0}%` }} className={meta && d.kcal > meta * 1.1 ? 'pasa' : ''} /><span>{fCorta(d.f).split(' ')[0]}</span></button>)}</div>
        <p className="ayuda" style={{ textAlign: 'center' }}>{semana.filter((d) => d.n).length} de 7 días con registro · promedio {n0(semana.filter((d) => d.kcal).reduce((t, d) => t + d.kcal, 0) / Math.max(1, semana.filter((d) => d.kcal).length))} kcal{meta ? ` (meta ${n0(meta)})` : ''}</p>
        <Diario datos={datos} fecha={fecha} setFecha={setFecha} nutri={nutri} soloLectura />
      </>}
      {datos && tab === 'objetivos' && <Objetivos key={JSON.stringify(datos.objetivos).length} ini={datos.objetivos} plan={datos.plan} onGuardar={(o) => guardarPlan({ objetivos: o }, 'Objetivos guardados')} />}
      {datos && tab === 'plan' && <PlanPDF a={a} nutri={nutri} actual={datos.plan} objetivos={datos.objetivos} onGuardar={guardarPlan} />}
      {datos && tab === 'recetas' && <>
        <p className="muted" style={{ margin: '4px 0 10px' }}>Recetas solo para {nom}. Se calculan con las fichas de cada ingrediente y él las agrega con un toque.</p>
        <div className="lista">{datos.recetas.map((r) => { const c = calcReceta(r, datos.fichas); return (
          <button key={r.id} className="item" onClick={() => setReceta(r)}><div className="item-t"><strong>{r.nombre}</strong><span>{n0(c.porPorcion.kcal)} kcal por porción · P {n1(c.porPorcion.proteina)} · C {n1(c.porPorcion.carbohidratos)} · G {n1(c.porPorcion.grasa)}{r.comida ? ` · ${r.comida}` : ''}</span></div><Ico n="chev" className="chev" s={18} /></button>); })}</div>
        {!datos.recetas.length && <div className="vacio"><b>Sin recetas</b>Arma las que más va a repetir: el desayuno típico, su batido, su almuerzo de la semana.</div>}
        <button className="btn oro full" style={{ marginTop: 12 }} onClick={() => setReceta({})}><Ico n="mas" s={18} />Nueva receta</button>
      </>}
      {receta && <EditorReceta ini={receta.id ? receta : null} comidas={comidas} nutri={nutri} fichasIni={datos.fichas} onCerrar={() => setReceta(null)}
        onGuardar={async (r) => { try { await nutri.guardarReceta({ ...r, asesorado_id: a.id }); setReceta(null); avisar('Receta guardada'); cargar(); } catch (e) { avisar(e.message, 'error'); } }}
        onBorrar={async (id) => { await nutri.borrarReceta(id); setReceta(null); avisar('Receta borrada'); cargar(); }} />}
    </div>
  );
}
