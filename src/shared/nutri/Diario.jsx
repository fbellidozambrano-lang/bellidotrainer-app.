// Diario de alimentación de un día: contador de calorías, macros, agua, sal y micronutrientes,
// y las comidas con lo que se fue agregando. Lo usan el asesorado (para registrar) y el coach (para ver).
import React, { useMemo, useState } from 'react';
import { Hoja, Ico, Interruptor, useAviso } from '../../ui/kit.jsx';
import { POR_CODIGO } from '../../lib/nutricion/catalogo.js';
import { nutrientesDe, receta as calcReceta, salAnadida, totalesDia, sumar } from '../../lib/nutricion/calculo.js';
import { colorProteina } from '../../lib/nutricion/plan.js';
import { uuid, fCorta, hoy, aFecha, fechaLocal, diasEntre } from '../../lib/util.js';
import Buscador from './Buscador.jsx';
import { Anillo, BarraMeta, NOMBRE_FUENTE, nombresComidas, nombresDatos, n0, n1, nCant } from './comunes.jsx';

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const moverDia = (f, n) => { const d = aFecha(f); d.setDate(d.getDate() + n); return fechaLocal(d); };
const nombreDia = (f) => { const d = diasEntre(f, hoy()); return d === 0 ? 'Hoy' : d === 1 ? 'Ayer' : d === -1 ? 'Mañana' : `${DIAS[aFecha(f).getDay()][0].toUpperCase()}${DIAS[aFecha(f).getDay()].slice(1)}`; };

// registro a partir de una o varias partes {alimento_id, nombre, gramos}
export function registroDe({ fecha, comida, tipo, nombre, partes, fichas, extra = {} }) {
  const res = []; const sinFicha = [];
  partes.forEach((p) => { const f = fichas[p.alimento_id]; if (!f || !(p.gramos > 0)) { sinFicha.push(p.nombre); return; } const r = nutrientesDe(f, p.gramos); res.push({ nutrientes: { ...r.valores, ...r.principales }, desconocidos: r.desconocidos }); });
  const s = sumar(res); const desconocidos = Object.keys(s.faltan);
  if (sinFicha.length) ['kcal', 'proteina', 'carbohidratos', 'grasa'].forEach((k) => { if (!desconocidos.includes(k)) desconocidos.push(k); });
  return { id: uuid(), fecha, comida, tipo, nombre, gramos: partes.reduce((t, p) => t + (Number(p.gramos) || 0), 0), alimento_id: partes.length === 1 ? partes[0].alimento_id : null,
    nutrientes: s.nutrientes, desconocidos, detalle: { partes: partes.map((p) => ({ alimento_id: p.alimento_id, nombre: p.nombre, gramos: p.gramos, fuente: fichas[p.alimento_id]?.fuente || null, calidad: fichas[p.alimento_id]?.calidad || null })), sin_ficha: sinFicha, ...extra } };
}

function AgregarPlan({ comida, plan, semana1Ini, onAgregar }) {
  const [mitad, setMitad] = useState(false); const [s1, setS1] = useState(semana1Ini); const k = mitad ? 0.5 : 1;
  const partes = (its) => (its || []).map((it) => ({ alimento_id: it.alimento_id, nombre: it.alimento_nombre || it.nombre, gramos: it.gramos != null ? it.gramos * k : null, plan: it.nombre }));
  if (!comida) return <div className="vacio"><b>Esta comida no está en tu plan</b>Usa Buscar o tus recetas.</div>;
  return (
    <div className="pl">
      <div className="pl-ops">
        {plan.semana1 && <div className="seg"><button className={s1 ? 'on' : ''} onClick={() => setS1(true)}>Semana 1</button><button className={!s1 ? 'on' : ''} onClick={() => setS1(false)}>Desde semana 2</button></div>}
        <Interruptor on={mitad} onChange={setMitad} label="Media porción" ayuda="Para combinar dos opciones a la mitad" />
      </div>
      {comida.kcal && <p className="pl-obj">Objetivo: {n0(s1 && comida.semana1?.kcal ? comida.semana1.kcal : comida.kcal)} kcal · P {comida.proteina} · C {s1 && comida.semana1?.carbohidratos ? comida.semana1.carbohidratos : comida.carbohidratos_meta} · G {comida.grasa}{comida.porciones_grasa != null ? ` · ${comida.porciones_grasa} porc. de grasa` : ''}</p>}
      {comida.proteinas?.length > 0 && <><p className="pl-t">1 · Elige tu proteína <small>cantidad en crudo</small></p>
        {comida.proteinas.map((o, i) => { const no = s1 && o.no_semana1; return (
          <button key={i} className="pl-o" disabled={no} onClick={() => onAgregar({ tipo: 'plan', nombre: `${o.nombre}${mitad ? ' (½)' : ''}`, partes: partes(o.items), extra: { bloque: 'proteina', porciones_quedan: o.porciones_quedan, resta_otra: o.resta_otra || 0, plan: { proteina: o.proteina, grasa: o.grasa }, mitad } })}>
            <i className={`sem ${o.color || colorProteina(o.grasa) || ''}`} /><div><strong>{o.nombre}</strong><span>{o.cantidad}{mitad ? ' · la mitad' : ''}{no ? ' · no en la semana 1' : ''}</span></div>
            <em>{o.porciones_quedan != null ? `${o.porciones_quedan}${o.resta_otra ? '*' : ''} porc.` : ''}</em></button>); })}</>}
      {comida.frutas?.length > 0 && <><p className="pl-t">2 · Frutas <small>cada una es ½ porción</small></p>
        {comida.frutas.map((o, i) => <button key={i} className="pl-o" onClick={() => onAgregar({ tipo: 'plan', nombre: `${o.nombre} (½ porción)`, partes: partes(o.items), extra: { bloque: 'carbohidrato', media: true } })}>
          <i className="sem fruta" /><div><strong>{o.nombre}</strong><span>{o.gramos} g · {o.medida}</span></div></button>)}</>}
      {comida.carbohidratos?.length > 0 && <><p className="pl-t">{comida.frutas?.length ? 'Otros carbohidratos' : '2 · Elige tu carbohidrato'}</p>
        {comida.carbohidratos.map((o, i) => { const no = s1 && (o.no_semana1 || !o.semana1); const its = s1 && o.semana1 ? o.semana1.items : o.items; const cant = s1 && o.semana1 ? o.semana1.cantidad : o.cantidad; return (
          <button key={i} className="pl-o" disabled={no} onClick={() => onAgregar({ tipo: 'plan', nombre: `${o.nombre}${mitad ? ' (½)' : ''}`, partes: partes(its), extra: { bloque: 'carbohidrato', plan: { carbohidratos: o.carbohidratos, proteina: o.proteina }, nota: o.nota, mitad, semana1: s1 } })}>
            <i className="sem carbo" /><div><strong>{o.nombre}</strong><span>{cant}{mitad ? ' · la mitad' : ''}{no ? ' · no en la semana 1' : ''}{o.nota ? ` · ${o.nota}` : ''}</span></div></button>); })}</>}
      {plan.grasas?.length > 0 && <><p className="pl-t">3 · Grasa <small>{comida.porciones_grasa != null ? `hasta ${comida.porciones_grasa} porciones, según tu proteína` : '1 porción = 5 g de grasa'}</small></p>
        {plan.grasas.map((o, i) => { const no = s1 && o.semana1 === false; return (
          <button key={i} className="pl-o" disabled={no} onClick={() => onAgregar({ tipo: 'plan', nombre: `${o.nombre} · 1 porción de grasa`, partes: partes(o.items), extra: { bloque: 'grasa', porciones: 1 } })}>
            <i className="sem grasa" /><div><strong>{o.nombre}</strong><span>{o.cantidad} · {o.medida}{no ? ' · no en la semana 1' : ''}</span></div><em>1 porc.</em></button>); })}</>}
      {(comida.paso_vegetales || plan.vegetales_libres) && <p className="pl-libre"><b>Vegetales libres:</b> {comida.paso_vegetales || ''} {plan.vegetales_libres ? `(${plan.vegetales_libres})` : ''}</p>}
    </div>
  );
}

function AgregarReceta({ recetas, fichas, onAgregar }) {
  const [porc, setPorc] = useState(1);
  if (!recetas.length) return <div className="vacio"><b>Sin recetas todavía</b>Tu coach te las puede cargar.</div>;
  return (
    <div>
      <div className="chips" style={{ marginBottom: 10 }}>{[0.5, 1, 1.5, 2].map((p) => <button key={p} className={`chip ${porc === p ? 'on' : ''}`} onClick={() => setPorc(p)}>{String(p).replace('.', ',')} {p === 1 ? 'porción' : 'porciones'}</button>)}</div>
      <div className="lista">{recetas.map((r) => { const c = calcReceta(r, fichas); return (
        <button key={r.id} className="item" onClick={() => onAgregar({ receta: r, calc: c, porciones: porc })}>
          <div className="item-t"><strong>{r.nombre}</strong><span>{n0(c.porPorcion.kcal)} kcal por porción · P {n1(c.porPorcion.proteina)} · C {n1(c.porPorcion.carbohidratos)} · G {n1(c.porPorcion.grasa)}</span>
            {r.nota && <em>{r.nota}</em>}{c.ingredientesSinFicha.length > 0 && <em>Sin ficha: {c.ingredientesSinFicha.join(', ')}</em>}</div><Ico n="mas" className="chev" s={18} /></button>); })}</div>
    </div>
  );
}

export function Agregar({ comida, idx, fecha, datos, nutri, token, onGuardar, onCerrar }) {
  const avisar = useAviso();
  const pc = datos.plan?.comidas?.[idx] || datos.plan?.comidas?.find((c) => c.nombre === comida);
  const [tab, setTab] = useState(pc ? 'plan' : datos.recetas?.length ? 'recetas' : 'buscar');
  const semana1 = !!(datos.plan?.semana1 && datos.plan?.emitido && diasEntre(datos.plan.emitido, fecha) < 7 && diasEntre(datos.plan.emitido, fecha) >= 0);
  const guardar = async (r, texto) => { await onGuardar(r); avisar(texto || `${r.nombre} agregado a ${comida}`); };
  if (tab === 'buscar') return <Buscador nutri={nutri} token={token} titulo={`Agregar a ${comida}`} onCerrar={onCerrar}
    onElegir={async (f, g) => { await guardar(registroDe({ fecha, comida: idx, tipo: 'alimento', nombre: f.nombre, partes: [{ alimento_id: f.id, nombre: f.nombre, gramos: g }], fichas: { [f.id]: f } })); }} />;
  return (
    <Hoja titulo={`Agregar a ${comida}`} onCerrar={onCerrar}>
      <div className="seg" style={{ marginBottom: 12 }}>
        {datos.plan && <button className={tab === 'plan' ? 'on' : ''} onClick={() => setTab('plan')}>Mi plan</button>}
        <button className={tab === 'recetas' ? 'on' : ''} onClick={() => setTab('recetas')}>Recetas</button>
        <button onClick={() => setTab('buscar')}>Buscar</button>
      </div>
      {tab === 'plan' && <AgregarPlan comida={pc} plan={datos.plan} semana1Ini={semana1} onAgregar={({ tipo, nombre, partes, extra }) => guardar(registroDe({ fecha, comida: idx, tipo, nombre, partes, fichas: datos.fichas, extra }))} />}
      {tab === 'recetas' && <AgregarReceta recetas={datos.recetas || []} fichas={datos.fichas} onAgregar={({ receta: r, calc, porciones }) => {
        const nutr = {}; Object.entries(calc.porPorcion).forEach(([k, v]) => { nutr[k] = v * porciones; });
        return guardar({ id: uuid(), fecha, comida: idx, tipo: 'receta', nombre: r.nombre, receta_id: r.id, cantidad: porciones, gramos: calc.gramosPorPorcion * porciones, nutrientes: nutr,
          desconocidos: [...calc.desconocidos, ...(calc.ingredientesSinFicha.length ? ['kcal'] : [])], detalle: { porciones, ingredientes: r.ingredientes, sin_ficha: calc.ingredientesSinFicha } });
      }} />}
    </Hoja>
  );
}

// micronutrientes con meta (los que puso el coach) + fibra y azúcares
function Micros({ objetivos, tot }) {
  const micros = objetivos?.micros || [];
  const lista = micros.length ? micros : [{ codigo: 'fibra_total', meta: null }, { codigo: 'azucares_totales', meta: null, tipo: 'max' }, { codigo: 'grasa_saturada', meta: null, tipo: 'max' }];
  return (
    <details className="micros"><summary>Micronutrientes y más <Ico n="abajo" s={16} /></summary>
      {lista.map((m) => { const n = POR_CODIGO.get(m.codigo); if (!n) return null; const val = tot.nutrientes[m.codigo] ?? (m.codigo === 'fibra_total' ? tot.nutrientes.fibra : m.codigo === 'azucares_totales' ? tot.nutrientes.azucares : undefined);
        return <BarraMeta key={m.codigo} etiqueta={`${n.nombre}${m.tipo === 'max' ? ' (máx.)' : ''}`} valor={val} meta={Number(m.meta) || null} unidad={n.unidad} max={m.tipo === 'max'} faltan={tot.faltan[m.codigo] || 0} />; })}
      <p className="ayuda" style={{ margin: '8px 0 0' }}>Los totales solo suman lo que cada ficha trae. Si a un alimento le falta el dato, se avisa: no se cuenta como cero.</p>
    </details>
  );
}

export default function Diario({ datos, fecha, setFecha, nutri, token, soloLectura, onGuardar, onBorrar, pendientes = 0 }) {
  const avisar = useAviso();
  const [agregar, setAgregar] = useState(null); const [ver, setVer] = useState(null); const [sal, setSal] = useState(false); const [salG, setSalG] = useState('1');
  const obj = datos.objetivos || {}; const comidas = nombresComidas(obj);
  const regs = useMemo(() => (datos.registros || []).filter((r) => r.fecha === fecha), [datos.registros, fecha]);
  const tot = useMemo(() => totalesDia(regs), [regs]);
  const semana1 = obj.semana1 && datos.plan?.emitido && diasEntre(datos.plan.emitido, fecha) >= 0 && diasEntre(datos.plan.emitido, fecha) < 7 ? obj.semana1 : null;
  const meta = (k) => (semana1?.[k] ?? obj[k]) || null;
  const faltan = (k) => tot.faltan[k] || 0;
  const salExtra = regs.filter((r) => r.tipo === 'sal').reduce((t, r) => t + (Number(r.gramos) || 0), 0);
  const agua = (ml) => onGuardar({ id: uuid(), fecha, comida: 0, tipo: 'agua', nombre: 'Agua', ml, nutrientes: {}, desconocidos: [], detalle: {} });
  return (
    <div>
      <div className="dia-nav">
        <button className="ico-b" onClick={() => setFecha(moverDia(fecha, -1))} aria-label="Día anterior"><Ico n="atras" /></button>
        <div><b>{nombreDia(fecha)}</b><span>{fCorta(fecha)}</span></div>
        <button className="ico-b" onClick={() => setFecha(moverDia(fecha, 1))} disabled={diasEntre(fecha, hoy()) <= 0} aria-label="Día siguiente"><Ico n="chev" /></button>
      </div>
      {semana1 && <p className="pill oro" style={{ margin: '0 auto 10px', display: 'table' }}>Semana 1 · {n0(semana1.kcal)} kcal</p>}
      <section className="cont">
        <Anillo valor={tot.nutrientes.kcal || 0} meta={meta('kcal')} />
        <div className="cont-m">
          <BarraMeta etiqueta="Proteína" valor={tot.nutrientes.proteina} meta={meta('proteina')} clase="p" faltan={faltan('proteina')} />
          <BarraMeta etiqueta="Carbohidratos" valor={tot.nutrientes.carbohidratos} meta={meta('carbohidratos')} clase="c" faltan={faltan('carbohidratos')} />
          <BarraMeta etiqueta="Grasa" valor={tot.nutrientes.grasa} meta={meta('grasa')} clase="g" faltan={faltan('grasa')} />
        </div>
      </section>
      {faltan('kcal') > 0 && <p className="ayuda" style={{ textAlign: 'center' }}>{faltan('kcal')} {faltan('kcal') === 1 ? 'alimento no trae' : 'alimentos no traen'} calorías en su ficha.</p>}
      <div className="agua-sal">
        <div className="agua"><div><Ico n="agua" s={20} /><b className="num">{n0(tot.agua_ml)}</b><small>{obj.agua_ml ? ` / ${n0(obj.agua_ml)} ml` : ' ml'}</small></div>
          <div className="agua-b"><i style={{ width: `${obj.agua_ml ? Math.min(100, (tot.agua_ml / obj.agua_ml) * 100) : 0}%` }} /></div>
          {!soloLectura && <div className="fila-btn"><button className="btn chico" onClick={() => agua(250)}>+250 ml</button><button className="btn chico" onClick={() => agua(500)}>+500 ml</button>
            {regs.some((r) => r.tipo === 'agua') && <button className="btn chico fant" onClick={() => { const u = [...regs].reverse().find((r) => r.tipo === 'agua'); if (u) onBorrar(u.id); }}>Deshacer</button>}</div>}</div>
        <div className={`sal ${obj.sal_g && (tot.nutrientes.sal || 0) > obj.sal_g ? 'pasa' : ''}`}><span>Sal</span><b className="num">{nCant(tot.nutrientes.sal || 0)}<small>{obj.sal_g ? ` / ${String(obj.sal_g).replace('.', ',')} g máx.` : ' g'}</small></b>
          {faltan('sal') > 0 && <small>sin dato en {faltan('sal')}</small>}
          {salExtra > 0 && <small>{nCant(salExtra)} g añadida a mano</small>}
          {!soloLectura && <div className="fila-btn"><button className="btn chico" onClick={() => setSal(true)}>+ Sal añadida</button>
            {salExtra > 0 && <button className="btn chico fant" onClick={() => { const u = [...regs].reverse().find((r) => r.tipo === 'sal'); if (u) onBorrar(u.id); }}>Deshacer</button>}</div>}</div>
      </div>
      <Micros objetivos={obj} tot={tot} />
      {comidas.map((c, i) => {
        const rs = regs.filter((r) => r.tipo !== 'agua' && r.tipo !== 'sal' && Number(r.comida) === i); const s = sumar(rs);
        const mc0 = Array.isArray(obj.comidas) ? obj.comidas[i] : null; const s1c = semana1 ? datos.plan?.comidas?.[i]?.semana1 : null;
        // en la semana 1 del plan, cada comida usa sus calorías y carbohidratos de esa semana
        const mc = mc0 && s1c && typeof s1c === 'object' ? { ...mc0, kcal: s1c.kcal ?? mc0.kcal, carbohidratos: s1c.carbohidratos ?? mc0.carbohidratos } : mc0;
        const porc = rs.find((r) => r.detalle?.bloque === 'proteina' && r.detalle.porciones_quedan != null)?.detalle.porciones_quedan;
        const usadas = rs.reduce((t, r) => t + (r.detalle?.bloque === 'grasa' ? Number(r.detalle.porciones || 1) : 0), 0);
        return (
          <section key={i} className="comida-n">
            <div className="comida-cab"><h3>{c}</h3><span className="num">{n0(s.nutrientes.kcal || 0)}{mc?.kcal ? ` / ${n0(mc.kcal)}` : ''} kcal</span></div>
            {(rs.length > 0 || mc?.proteina) && <p className="comida-m">P {n1(s.nutrientes.proteina || 0)}{mc?.proteina ? `/${mc.proteina}` : ''} · C {n1(s.nutrientes.carbohidratos || 0)}{mc?.carbohidratos ? `/${mc.carbohidratos}` : ''} · G {n1(s.nutrientes.grasa || 0)}{mc?.grasa ? `/${mc.grasa}` : ''}
              {porc != null && <b className={usadas > porc ? 'alerta' : ''}> · grasa: {Math.max(0, porc - usadas)} de {porc} porc.</b>}</p>}
            {rs.map((r) => <div key={r.id} className={`reg ${r._pendiente ? 'pend' : ''}`}>
              <button className="reg-t" onClick={() => setVer(r)}><strong>{r.nombre}</strong><span>{r.tipo === 'receta' ? `${String(r.cantidad).replace('.', ',')} porc. · ` : r.gramos ? `${n0(r.gramos)} g · ` : ''}{n0(r.nutrientes?.kcal)} kcal · P {n1(r.nutrientes?.proteina)} · C {n1(r.nutrientes?.carbohidratos)} · G {n1(r.nutrientes?.grasa)}{(r.desconocidos || []).includes('kcal') ? ' · sin dato de kcal' : ''}{r._pendiente ? ' · sin enviar' : ''}</span></button>
              {!soloLectura && <button className="ico-b" onClick={() => onBorrar(r.id)} aria-label={`Quitar ${r.nombre}`}><Ico n="cerrar" s={16} /></button>}</div>)}
            {!soloLectura && <button className="btn chico full comida-add" onClick={() => setAgregar({ c, i })}><Ico n="mas" s={16} />Agregar</button>}
          </section>);
      })}
      {pendientes > 0 && <p className="aviso"><Ico n="nube" s={20} /><span>{pendientes} {pendientes === 1 ? 'registro' : 'registros'} esperando señal. <b>Se envían solos.</b></span></p>}
      {agregar && <Agregar comida={agregar.c} idx={agregar.i} fecha={fecha} datos={datos} nutri={nutri} token={token} onCerrar={() => setAgregar(null)} onGuardar={async (r) => { await onGuardar(r); }} />}
      {sal && <Hoja titulo="Sal añadida" onCerrar={() => setSal(false)} acciones={<><button className="btn" onClick={() => setSal(false)}>Cancelar</button><button className="btn oro" disabled={!(Number(salG.replace(',', '.')) > 0)} onClick={async () => { const g = Number(salG.replace(',', '.')); await onGuardar({ id: uuid(), fecha, comida: 0, tipo: 'sal', nombre: `Sal añadida ${String(g).replace('.', ',')} g`, gramos: g, ...salAnadida(g), detalle: {} }); setSal(false); avisar('Sal anotada'); }}>Anotar</button></>}>
        <p className="muted" style={{ marginBottom: 10 }}>La sal que le echas a la comida, aparte de la que ya traen los alimentos. 1 cucharadita rasa ≈ 5 g.</p>
        <div className="chips" style={{ marginBottom: 10 }}>{['0.5', '1', '2', '3', '5'].map((v) => <button key={v} className={`chip ${salG === v ? 'on' : ''}`} onClick={() => setSalG(v)}>{v.replace('.', ',')} g</button>)}</div>
        <input className="in num" inputMode="decimal" value={salG} onChange={(e) => setSalG(e.target.value)} aria-label="Gramos de sal" />
      </Hoja>}
      {ver && <Hoja titulo={ver.nombre} onCerrar={() => setVer(null)}>
        <p className="muted" style={{ marginTop: -6 }}>{comidas[ver.comida] || ''} · {fCorta(ver.fecha)}{ver.gramos ? ` · ${n0(ver.gramos)} g` : ''}</p>
        <div className="ficha-tot"><div><b className="num">{n0(ver.nutrientes?.kcal)}</b><span>kcal</span></div><div><b className="num">{n1(ver.nutrientes?.proteina)}</b><span>proteína</span></div><div><b className="num">{n1(ver.nutrientes?.carbohidratos)}</b><span>carbos</span></div><div><b className="num">{n1(ver.nutrientes?.grasa)}</b><span>grasa</span></div></div>
        {(ver.detalle?.partes || []).length > 0 && <><p className="etq" style={{ margin: '12px 0 4px' }}>Calculado con</p>{ver.detalle.partes.map((p, i) => <p key={i} className="ayuda" style={{ margin: '2px 0' }}>{p.nombre} · {n0(p.gramos)} g{p.fuente ? ` · ${NOMBRE_FUENTE[p.fuente] || p.fuente}` : ''}</p>)}</>}
        {ver.detalle?.plan && <p className="ayuda" style={{ marginTop: 8 }}>El plan dice: {Object.entries(ver.detalle.plan).map(([k, v]) => `${k} ${String(v).replace('.', ',')} g`).join(' · ')}. La app calcula con la ficha real del alimento, por eso puede variar un poco.</p>}
        {(ver.desconocidos || []).length > 0 && <p className="ayuda">Sin dato en la ficha: {nombresDatos(ver.desconocidos)}.</p>}
        {(ver.detalle?.sin_ficha || []).length > 0 && <p className="aviso rojo"><span>Sin ficha nutricional: {ver.detalle.sin_ficha.join(', ')}. Tu coach lo puede vincular.</span></p>}
      </Hoja>}
    </div>
  );
}
