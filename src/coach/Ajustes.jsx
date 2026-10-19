import React, { useRef, useState } from 'react';
import { Barra, Ico, ir, useRuta, Hoja, Campo, useAviso, leerArchivo, descargar, Interruptor } from '../ui/kit.jsx';
import { interpretar, desdeRespaldoViejo, desdeSesionSuelta, desdeExportV9, desdeHevy, exportar } from '../data/legacy.js';
import { leerConfig, guardarConfigLocal } from '../data/store.js';
import { fLarga, hoy, primerNombre, diasParaVencer } from '../lib/util.js';
import { Cobro } from './Inicio.jsx';

export const VERSION = 'v9.3 · octubre 2026';

function Importar({ archivo, datos, acc, usuario, onCerrar }) {
  const avisar = useAviso(); const salt = (usuario?.id || 'local') + ':';
  const [quien, setQuien] = useState(datos.asesorados[0]?.id || ''); const [conProg, setConProg] = useState(true);
  const [prog, setProg] = useState(null); const [error, setError] = useState('');
  let plan = null, desc = null, planErr = '';
  try {
    if (archivo.tipo === 'viejo') { plan = desdeRespaldoViejo(archivo.raw, datos, salt); desc = `Respaldo de la app anterior.`; }
    else if (archivo.tipo === 'v9') { plan = desdeExportV9(archivo.raw, datos); desc = 'Respaldo de esta app.'; }
    else if (archivo.tipo === 'sesion') { plan = desdeSesionSuelta(archivo.raw, datos, salt); desc = `Sesión de ${plan.nombre}: ${archivo.raw.dia || ''} del ${fLarga(archivo.raw.fecha)}.`; }
    else if (archivo.tipo === 'hevy') { plan = quien ? desdeHevy(archivo.texto, quien, conProg, salt) : null; desc = 'Historial exportado de Hevy.'; }
  } catch (e) { planErr = e.message; }
  const err = error || planErr;
  const n = plan ? { a: plan.asesorados.length, p: plan.programas.length, s: plan.sesiones.length } : null;
  const vacio = n && !n.a && !n.p && !n.s && !plan.biblioteca?.length && !plan.plantillas?.length;
  async function hacer() {
    setProg(0);
    try { await acc.importar(plan, setProg); avisar(n.s === 1 && !n.a ? 'Sesión guardada en su historial' : 'Importación lista'); onCerrar(); }
    catch (e) { setError(e.message); setProg(null); }
  }
  return (
    <Hoja titulo="Importar" onCerrar={prog == null ? onCerrar : undefined}
      acciones={<><button className="btn" onClick={onCerrar} disabled={prog != null}>Cancelar</button><button className="btn oro" disabled={!plan || vacio || prog != null || !!err} onClick={hacer}>{prog != null ? `Subiendo ${Math.round(prog * 100)}%` : 'Importar'}</button></>}>
      <p style={{ marginBottom: 14 }}>{desc}</p>
      {archivo.tipo === 'hevy' && <>
        <Campo l="¿De quién es este historial?"><select className="in" value={quien} onChange={(e) => setQuien(e.target.value)}>{datos.asesorados.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}</select></Campo>
        <Interruptor on={conProg} onChange={setConProg} label="Armar un programa con sus días" ayuda="Lo puedes editar después" />
      </>}
      {err && <p className="aviso rojo">{err}</p>}
      {n && !err && (vacio ? <p className="aviso">Todo lo de este archivo ya está en tu app. No hay nada nuevo que importar.</p> : <div className="kpis" style={{ marginTop: 6 }}>
        <div className="kpi"><b className="num">{n.a}</b><span>asesorados nuevos</span></div>
        <div className="kpi"><b className="num">{n.p}</b><span>programas</span></div>
        <div className="kpi"><b className="num">{n.s}</b><span>sesiones</span></div>
      </div>)}
      {plan?.emparejados > 0 && archivo.tipo === 'viejo' && <p className="ayuda" style={{ marginTop: 12 }}>{plan.emparejados} asesorados ya estaban en tu equipo: se les suma lo que falte, sin duplicar.</p>}
      {archivo.tipo === 'viejo' && n?.p > 0 && <p className="ayuda" style={{ marginTop: 8 }}>Cada rutina anterior entra como un programa llamado “Rutina anterior”. Luego le cambias el nombre o la usas de base para los de 2, 3 y 5 días.</p>}
    </Hoja>
  );
}

export default function Ajustes({ store, datos, acc, usuario }) {
  const avisar = useAviso(); const ref = useRef(); const cfg = leerConfig();
  const [archivo, setArchivo] = useState(null); const [url, setUrl] = useState(cfg.url); const [key, setKey] = useState(cfg.key);
  const archivados = datos.asesorados.filter((a) => a.archivado);
  const pagos = datos.asesorados.filter((a) => !a.archivado).sort((x, y) => (x.vence || '9999').localeCompare(y.vence || '9999') || x.nombre.localeCompare(y.nombre));
  const porVencer = pagos.filter((a) => a.vence && diasParaVencer(a.vence) <= 3).length;
  const ruta = useRuta(); const refPagos = useRef();
  React.useEffect(() => { if (ruta[1] === 'pagos') refPagos.current?.scrollIntoView({ block: 'start' }); }, [ruta]);
  async function elegir(e) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { const t = await leerArchivo(f); setArchivo(interpretar(t, f.name)); } catch (x) { avisar(x.message, 'error'); }
  }
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="Ajustes" />

      <div className="sec"><h2>Conexión</h2><span>{store.modo === 'nube' ? 'en línea' : 'modo local'}</span></div>
      {store.modo === 'nube' ? <div className="tarj">
        <p><b>Conectado a Supabase.</b> Tus datos están en línea y tus asesorados entran con su enlace desde cualquier teléfono.</p>
        <p className="acceso-u" style={{ margin: '8px 0 0' }}>{cfg.url.replace(/^https?:\/\//, '')}{cfg.origen === 'telefono' ? ' · configurado solo en este teléfono' : ''}</p>
        {cfg.origen === 'telefono' && <p className="ayuda" style={{ margin: '8px 0 0' }}>Para que tus asesorados entren, la dirección y la clave tienen que estar también en el archivo config.js del proyecto.</p>}
      </div> : <div className="tarj">
        <p style={{ marginBottom: 12 }}>Ahora todo vive en este teléfono. Conecta tu proyecto de Supabase para trabajar en línea: pega la <b>Project URL</b> y la clave <b>anon public</b> (Supabase → Project Settings → API).</p>
        <Campo l="Project URL"><input className="in" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://xxxx.supabase.co" /></Campo>
        <Campo l="Clave anon public"><input className="in" value={key} onChange={(e) => setKey(e.target.value)} placeholder="eyJhbGciOi…" /></Campo>
        <button className="btn oro full" disabled={!/^https:\/\/.+\.supabase\.co$/.test(url.trim().replace(/\/+$/, '')) || key.trim().length < 30} onClick={() => { guardarConfigLocal(url.trim(), key.trim()); location.reload(); }}>Conectar</button>
        <p className="ayuda" style={{ margin: '10px 0 0' }}>Antes exporta tu respaldo aquí abajo: al conectar empiezas con la base en línea vacía y lo importas allá.</p>
      </div>}

      <div className="sec" ref={refPagos}><h2>Pagos</h2><span>{porVencer ? `${porVencer} por vencer` : 'al día'}</span></div>
      <div className="tarj" style={{ paddingBottom: 6 }}>
        <p style={{ marginBottom: 6 }}>Pon la fecha en que vence la mensualidad de cada uno. Tres días antes te aparece en el inicio con un botón para recordarle por WhatsApp, y a él le sale el aviso en su app. Cuando pague, toca <b>Pagó</b> y la fecha corre un mes.</p>
        {pagos.length ? <div className="lista">{pagos.map((a) => <Cobro key={a.id} a={a} acc={acc} conFecha />)}</div> : <p className="ayuda">Todavía no tienes asesorados.</p>}
      </div>

      <div className="sec"><h2>Respaldos</h2></div>
      <div className="tarj">
        <p style={{ marginBottom: 12 }}>Importa el respaldo de la app anterior (todas las versiones), una sesión suelta que te mandó un asesorado o el historial de Hevy (.csv). Importar dos veces el mismo archivo no duplica nada.</p>
        <div className="fila-btn">
          <button className="btn oro" onClick={() => ref.current?.click()}><Ico n="subir" s={18} />Importar archivo</button>
          <button className="btn" onClick={() => { descargar(`bellidotrainer-respaldo-${hoy()}.json`, exportar(datos)); avisar('Respaldo descargado'); }}><Ico n="bajar" s={18} />Exportar respaldo</button>
        </div>
        <input ref={ref} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={elegir} />
        <p className="ayuda" style={{ margin: '12px 0 0' }}>En la app anterior: Equipo → Descargar respaldo. Ese archivo es el que se importa aquí.</p>
      </div>

      {archivados.length > 0 && <>
        <div className="sec"><h2>Archivados</h2><span>{archivados.length}</span></div>
        <div className="lista">{archivados.map((a) => <div key={a.id} className="item"><div className="item-t"><strong>{a.nombre}</strong><span>Su enlace está pausado</span></div>
          <button className="btn chico" onClick={async () => { await acc.guardarAsesorado({ ...a, archivado: false }); avisar(`${primerNombre(a.nombre)} reactivado`); }}>Reactivar</button></div>)}</div>
      </>}

      <div className="sec"><h2>Cuenta</h2></div>
      <div className="tarj">
        <p>{store.modo === 'nube' ? <>Entraste como <b>{usuario?.email}</b>.</> : 'Sin cuenta: modo local.'}</p>
        {store.modo === 'nube' && <button className="btn full" style={{ marginTop: 12 }} onClick={() => store.auth.salir()}><Ico n="salir" s={18} />Cerrar sesión</button>}
        {store.modo === 'nube' && cfg.origen === 'telefono' && <button className="btn fant full" style={{ marginTop: 6 }} onClick={() => { guardarConfigLocal(''); location.reload(); }}>Desconectar Supabase de este teléfono</button>}
      </div>
      <p className="instalar">BELLIDO TRAINER {VERSION}. Para tenerla como app: en Safari toca Compartir → Agregar a inicio.</p>
      {archivo && <Importar archivo={archivo} datos={datos} acc={acc} usuario={usuario} onCerrar={() => setArchivo(null)} />}
    </div>
  );
}
