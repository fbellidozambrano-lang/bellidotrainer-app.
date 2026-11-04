// Base de alimentos: qué fuentes hay, su versión y licencia, la importación de USDA
// (idempotente y reanudable) y los alimentos personalizados del coach.
import React, { useCallback, useEffect, useState } from 'react';
import { Barra, Campo, Hoja, Ico, ir, useAviso } from '../ui/kit.jsx';
import { leerManifiesto, leerPendientes, importarConjunto } from '../data/nutricion.js';
import { FUENTES } from '../lib/nutricion/fuentes.js';
import { NUTRIENTES, GRUPOS } from '../lib/nutricion/catalogo.js';
import { CATEGORIAS, PREPARACIONES } from '../lib/nutricion/clasificar.js';
import Buscador from '../shared/nutri/Buscador.jsx';
import { n0 } from '../shared/nutri/comunes.jsx';
import LectorEtiqueta from '../shared/nutri/LectorEtiqueta.jsx';

// de mejor a menor calidad documentada: así se sugiere importarlos
const ORDEN = ['usda_foundation', 'usda_sr_legacy', 'usda_fndds', 'catalogo_ve'];
const ESTADO_F = { integrada: 'Integrada', en_linea: 'Consulta en línea', preparada: 'Preparada (sin importar)' };

function NuevoAlimento({ nutri, onCerrar, inicial = null }) {
  const avisar = useAviso();
  const [a, setA] = useState({ nombre: '', marca: '', categoria: 'Otros', preparacion: 'no_indicado', base: '100 g', codigo_barras: '', ...(inicial?.datos || {}) });
  const [v, setV] = useState({}); const [mas, setMas] = useState(false); const [ocupado, setOcupado] = useState(false);
  const principales = ['energia_kcal', 'proteina', 'carbohidratos_diferencia', 'grasa_total', 'fibra_total', 'azucares_totales', 'grasa_saturada', 'sodio'];
  const lista = mas ? NUTRIENTES.filter((n) => !['energia_atwater_especifica_kcal', 'energia_atwater_general_kcal', 'carbohidratos_suma', 'carbohidratos_etiqueta', 'grasa_nlea', 'fibra_aoac_2011_25', 'azucares_totales_nlea'].includes(n.codigo)) : NUTRIENTES.filter((n) => principales.includes(n.codigo));
  async function guardar() {
    const valores = Object.entries(v).filter(([, x]) => String(x).trim() !== '').map(([codigo, x]) => ({ codigo, cantidad: Number(String(x).replace(',', '.')) }));
    if (valores.some((x) => !Number.isFinite(x.cantidad))) { avisar('Revisa los números', 'error'); return; }
    setOcupado(true);
    try { await nutri.guardarAlimento({ ...a, nombre: a.nombre.trim(), codigo_barras: a.codigo_barras.replace(/\D/g, '') || null, energia_ref: v.energia_kcal ? 'energia_kcal' : null, valores }); avisar('Alimento guardado (personalizado)'); onCerrar(); }
    catch (e) { avisar(e.message, 'error'); }
    setOcupado(false);
  }
  return (
    <Hoja titulo="Alimento personalizado" onCerrar={onCerrar} acciones={<><button className="btn" onClick={onCerrar}>Cancelar</button><button className="btn oro" disabled={ocupado || !a.nombre.trim() || !Object.values(v).some((x) => String(x).trim())} onClick={guardar}>Guardar</button></>}>
      {inicial?.nota && <p className="aviso" style={{ marginTop: -6 }}><span>{inicial.nota}</span></p>}
      <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Para lo que no está en las bases (una arepa de una panadería, un producto local). Queda marcado como personalizado: nunca aparece como dato oficial. Deja vacío lo que no sepas: no se cuenta como cero.</p>
      <Campo l="Nombre"><input className="in" autoFocus value={a.nombre} onChange={(e) => setA({ ...a, nombre: e.target.value })} placeholder="Arepa de la panadería X" /></Campo>
      <div className="dos"><Campo l="Marca (opcional)"><input className="in" value={a.marca} onChange={(e) => setA({ ...a, marca: e.target.value })} /></Campo>
        <Campo l="Código de barras"><input className="in num" inputMode="numeric" value={a.codigo_barras} onChange={(e) => setA({ ...a, codigo_barras: e.target.value })} /></Campo></div>
      <div className="dos"><Campo l="Categoría"><select className="in" value={a.categoria} onChange={(e) => setA({ ...a, categoria: e.target.value })}>{CATEGORIAS.map((c) => <option key={c}>{c}</option>)}</select></Campo>
        <Campo l="Preparación"><select className="in" value={a.preparacion} onChange={(e) => setA({ ...a, preparacion: e.target.value })}>{Object.entries(PREPARACIONES).map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></Campo></div>
      <p className="etq" style={{ margin: '4px 0 8px' }}>Valores por 100 g</p>
      <div className="nv">{lista.map((n) => <label key={n.codigo} className="nv-f"><span>{n.nombre}{n.grupo !== 'macro' && n.grupo !== 'energia' && !mas ? '' : ''}</span>
        <input className="in num" inputMode="decimal" value={v[n.codigo] ?? ''} onChange={(e) => setV({ ...v, [n.codigo]: e.target.value })} aria-label={`${n.nombre} por 100 g`} /><small>{n.unidad}</small></label>)}</div>
      {!mas && <button className="btn fant full" onClick={() => setMas(true)}>Agregar vitaminas y minerales</button>}
      {mas && <p className="ayuda">Grupos: {Object.values(GRUPOS).join(', ')}.</p>}
    </Hoja>
  );
}

// registros del catálogo de Venezuela que no tienen un equivalente defendible en USDA: por qué y qué falta
const ORDEN_MOTIVO = ['S', 'C', 'A', 'R', 'E', 'D', 'I'];
function Pendientes({ datos, onCerrar, onCompletar }) {
  const [m, setM] = useState('S'); const [q, setQ] = useState('');
  const cuenta = (k) => datos.pendientes.filter((p) => p.motivo === k).length;
  const qn = q.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const lista = datos.pendientes.filter((p) => p.motivo === m && (!qn || `${p.id} ${p.nombre}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(qn)));
  return (
    <Hoja titulo={`Pendientes del catálogo (${datos.pendientes.length})`} onCerrar={onCerrar}>
      <p className="muted" style={{ marginTop: -6 }}>Registros del catálogo de Venezuela sin valores: no tienen un alimento comparable en USDA, dependen de una receta o les falta un dato. No se inventan; se completan con la Tabla de Composición de Alimentos de Venezuela, una receta calculada o la etiqueta.</p>
      <div className="chips" style={{ margin: '10px 0' }}>{ORDEN_MOTIVO.filter(cuenta).map((k) => <button key={k} className={`chip ${m === k ? 'on' : ''}`} onClick={() => setM(k)}>{({ S: 'Sin equivalente', C: 'Receta', A: 'Ambiguos', R: 'Porciones', E: 'Etiqueta', D: 'Repetidos', I: 'No aplican' })[k]} · {cuenta(k)}</button>)}</div>
      <p className="ayuda" style={{ marginTop: 0 }}>{datos.motivos[m]}</p>
      <input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar en esta lista" aria-label="Buscar pendiente" />
      <div className="lista" style={{ marginTop: 8 }}>{lista.map((p) => (
        <div key={p.id} className="item pend-ve"><div className="item-t"><strong>{p.nombre}</strong><span>{p.id}{p.detalle ? ` · ${p.detalle}` : ''}</span>{p.nota && <em>{p.nota}</em>}</div>
          {!['I', 'D', 'R'].includes(p.motivo) && onCompletar && <button className="btn chico" onClick={() => onCompletar(p)}>Completar</button>}</div>))}
        {!lista.length && <p className="muted">Nada con ese texto.</p>}</div>
    </Hoja>
  );
}

export default function BaseAlimentos({ store }) {
  const avisar = useAviso(); const nutri = store.nutri;
  const [estado, setEstado] = useState(null); const [man, setMan] = useState(null); const [err, setErr] = useState(''); const [prog, setProg] = useState(null);
  const [buscar, setBuscar] = useState(false); const [nuevo, setNuevo] = useState(false); const [lector, setLector] = useState(false); const [pend, setPend] = useState(null);
  const cargar = useCallback(async () => {
    try { setEstado(await nutri.estado()); setErr(''); } catch (e) { setErr(e.message); }
    try { setMan(await leerManifiesto()); } catch (e) { setMan({ error: e.message, conjuntos: [] }); }
  }, [nutri]);
  useEffect(() => { cargar(); }, [cargar]);
  async function importar(c, forzar = false) {
    setProg({ fuente: c.fuente, parte: 0, partes: c.partes, ins: 0 });
    try {
      const r = await importarConjunto({ nutri, conjunto: c, forzar, onProgreso: (p) => setProg((x) => ({ ...x, parte: p.parte, ins: (x?.ins || 0) + (p.insertados || 0) + (p.actualizados || 0) })) });
      if (r.error) avisar(r.error, 'error'); else avisar(`${FUENTES[c.fuente].nombre.split('·').pop().trim()}: ${n0(r.insertados)} nuevos, ${n0(r.actualizados)} actualizados, ${n0(r.omitidos)} sin cambios${r.rechazados ? `, ${r.rechazados} rechazados` : ''}`);
    } catch (e) { avisar(e.message, 'error'); }
    setProg(null); cargar();
  }
  async function verPendientes(c) { try { setPend(await leerPendientes(c)); } catch (e) { avisar(e.message, 'error'); } }
  const total = (estado?.fuentes || []).reduce((t, f) => t + Number(f.alimentos || 0), 0);
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => history.length > 1 ? history.back() : ir(), texto: 'Volver' }} titulo="Base de alimentos" />
      <p className="muted" style={{ margin: '10px 0 4px' }}>Datos nutricionales reales con su procedencia. Cada número dice de qué fuente, versión y método sale; lo desconocido no se cuenta como cero.</p>
      {err && <p className="aviso rojo"><span>{err}</span></p>}
      <div className="fila-btn" style={{ margin: '10px 0' }}><button className="btn oro" onClick={() => setBuscar(true)}><Ico n="buscar" s={18} />Buscar alimento</button><button className="btn" onClick={() => setNuevo(true)}><Ico n="mas" s={18} />Personalizado</button></div>
      <button className="etq-abrir" onClick={() => setLector(true)}><Ico n="camara" s={22} /><div><b>Leer etiqueta con fotos</b><small>Foto del frente y de la tabla nutricional: crea el producto con sus datos</small></div><Ico n="chev" s={18} /></button>
      {estado && <div className="kpis"><div className="kpi"><b className="num">{n0(total)}</b><span>alimentos en total</span></div><div className="kpi"><b className="num">{n0(estado.propios)}</b><span>tuyos (personalizados y de marca)</span></div><div className="kpi"><b className="num">{NUTRIENTES.length}</b><span>nutrientes en el catálogo</span></div></div>}

      <div className="sec"><h2>Importar a la base</h2><span>USDA y catálogo de Venezuela</span></div>
      {estado && !estado.es_admin && <p className="aviso"><span>Otro coach administra la base compartida. Tú puedes buscar y crear tus alimentos personalizados.</span></p>}
      {man?.error && <p className="aviso rojo"><span>{man.error}</span></p>}
      <div className="lista">{[...(man?.conjuntos || [])].sort((x, y) => ORDEN.indexOf(x.fuente) - ORDEN.indexOf(y.fuente)).map((c) => { const f = estado?.fuentes?.find((x) => x.id === c.fuente); const en = Number(f?.alimentos || 0); const misma = f?.version === c.version && en >= c.estadisticas.validos;
        const imp = estado?.importaciones?.find((i) => i.fuente_id === c.fuente && i.version === c.version); const p = prog?.fuente === c.fuente ? prog : null;
        return <div key={c.fuente} className="item imp">
          <div className="item-t"><strong>{FUENTES[c.fuente]?.nombre}</strong>
            <span>Versión {c.version} · {n0(c.estadisticas.validos)} alimentos · {c.partes} partes{en ? ` · en tu base: ${n0(en)}${f.version && f.version !== c.version ? ` (versión ${f.version})` : ''}` : ''}</span>
            {imp && <span>Última importación: {imp.estado === 'completa' ? 'completa' : imp.estado === 'con_errores' ? 'con errores' : 'sin terminar'}{imp.terminado ? ` el ${String(imp.terminado).slice(0, 10)}` : ''}</span>}
            {c.estadisticas.pendientes > 0 && <><span>{n0(c.estadisticas.validos)} con equivalente USDA documentado · {n0(c.estadisticas.pendientes)} pendientes de fuente</span>
              <button className="btn fant chico ver-pend" onClick={() => verPendientes(c)}>Ver pendientes</button></>}
            {p && <div className="imp-b"><i style={{ width: `${(p.parte / p.partes) * 100}%` }} /><small>Parte {p.parte} de {p.partes}</small></div>}</div>
          {estado?.es_admin && <button className={`btn chico ${misma ? '' : 'oro'}`} disabled={!!prog} onClick={() => importar(c, misma)}>{p ? 'Importando…' : misma ? 'Revisar' : imp && imp.estado === 'en_curso' ? 'Continuar' : en ? 'Actualizar' : 'Importar'}</button>}
        </div>; })}</div>
      <p className="ayuda" style={{ marginTop: 8 }}>Cada importación se registra y se puede repetir sin duplicar: lo que no cambió se salta y lo que cambió guarda su versión anterior en el historial. Si se corta la señal, al volver a tocar sigue desde la parte en que quedó.</p>

      <div className="sec"><h2>Fuentes y licencias</h2></div>
      <div className="lista">{Object.entries(FUENTES).map(([id, f]) => { const e = estado?.fuentes?.find((x) => x.id === id); return (
        <div key={id} className="item fuente-i"><div className="item-t"><strong>{f.nombre}</strong>
          <span>{ESTADO_F[f.estado]}{e?.alimentos ? ` · ${n0(e.alimentos)} alimentos` : ''}{f.historico ? ' · colección histórica' : ''}</span>
          <span>Licencia: {f.licencia}</span>{f.nota && <em>{f.nota}</em>}</div></div>); })}</div>
      <p className="ayuda" style={{ marginTop: 8 }}>Para buscar productos de marca de EE. UU. en USDA hace falta una clave gratuita de api.data.gov guardada en Vercel (FDC_API_KEY). Open Food Facts no necesita clave.</p>
      {buscar && <Buscador nutri={nutri} titulo="Base de alimentos" onCerrar={() => setBuscar(false)} />}
      {lector && <LectorEtiqueta nutri={nutri} quien="el coach" onCerrar={() => setLector(false)} onGuardado={() => { setLector(false); cargar(); }} />}
      {nuevo && <NuevoAlimento nutri={nutri} inicial={typeof nuevo === 'object' ? nuevo : null} onCerrar={() => { setNuevo(false); cargar(); }} />}
      {pend && <Pendientes datos={pend} onCerrar={() => setPend(null)} onCompletar={estado?.es_admin !== false ? (p) => { setPend(null); setNuevo({ datos: { nombre: p.nombre, categoria: p.categoria, preparacion: p.prep }, nota: `${p.id} · ${p.detalle || pend.motivos[p.motivo]}. Usa valores de una fuente verificable (tabla venezolana, etiqueta o receta calculada); deja vacío lo que no sepas.` }); } : null} />}
    </div>
  );
}
