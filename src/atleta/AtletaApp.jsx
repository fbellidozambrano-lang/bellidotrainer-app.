import React, { useCallback, useEffect, useState } from 'react';
import { Barra, Ico, ir, useRuta, useAviso } from '../ui/kit.jsx';
import { TarjetaPrograma, TarjetaDia, ordenarProgramas, frecuencias } from '../shared/Programas.jsx';
import Metricas from '../shared/Metricas.jsx';
import Entrenamiento from '../shared/Entrenamiento.jsx';
import { aFecha, fechaLocal, haceCuanto, hoy, lunesDe, primerNombre, saludo, semanasSeguidas, nDias } from '../lib/util.js';
import logo from '../assets/logo.png';
import marca from '../assets/marca.png';

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const poner = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

export default function AtletaApp({ store, token, vista }) {
  const avisar = useAviso(); const ruta = useRuta();
  const kCache = `bt:at:${token}`, kCola = `bt:cola:${token}`;
  const [d, setD] = useState(() => leer(kCache)); const [estado, setEstado] = useState('cargando'); const [cola, setCola] = useState(() => leer(kCola) || []);

  const cargar = useCallback(async () => {
    try { const r = await store.atletaCargar(token); if (!r) { setEstado('invalido'); return; }
      const pend = leer(kCola) || []; const ids = new Set(r.sesiones.map((s) => s.id));
      const x = { ...r, sesiones: [...pend.filter((s) => !ids.has(s.id)).map((s) => ({ ...s, asesoradoId: r.asesorado.id })), ...r.sesiones] };
      setD(x); poner(kCache, x); setEstado('ok');
    } catch { setEstado(leer(kCache) ? 'sinred' : 'error'); }
  }, [store, token, kCache, kCola]);

  const vaciarCola = useCallback(async () => {
    const pend = leer(kCola) || []; if (!pend.length) return; const quedan = [];
    for (const s of pend) { try { await store.atletaGuardarSesion(token, s); } catch { quedan.push(s); } }
    poner(kCola, quedan.length ? quedan : null); setCola(quedan);
    if (quedan.length < pend.length) avisar(pend.length - quedan.length === 1 ? 'Tu sesión pendiente ya le llegó a tu coach' : 'Tus sesiones pendientes ya le llegaron a tu coach');
  }, [store, token, kCola, avisar]);

  useEffect(() => { vaciarCola().then(cargar); const f = () => { if (document.visibilityState === 'visible') { vaciarCola(); } }; addEventListener('online', f); document.addEventListener('visibilitychange', f); return () => { removeEventListener('online', f); document.removeEventListener('visibilitychange', f); }; }, [cargar, vaciarCola]);

  async function guardar(s) {
    if (vista === 'coach') { avisar('Vista previa: esta sesión no se guarda'); return {}; }
    const ses = { ...s, asesoradoId: d.asesorado.id, origen: 'asesorado', creado: new Date().toISOString() };
    let pendiente = false;
    try { await store.atletaGuardarSesion(token, s); }
    catch { const c = [...(leer(kCola) || []), s]; poner(kCola, c); setCola(c); pendiente = true; }
    setD((x) => { const n = { ...x, sesiones: [ses, ...x.sesiones] }; poner(kCache, n); return n; });
    return { pendiente };
  }

  if (!d) {
    if (estado === 'cargando') return <div className="cargando"><img src={logo} alt="BELLIDO TRAINER" /></div>;
    return <div className="fin"><img src={logo} alt="BELLIDO TRAINER" style={{ width: 170 }} />
      <h1 style={{ fontSize: 34 }}>{estado === 'invalido' ? 'Este enlace ya no funciona' : 'Sin conexión'}</h1>
      <p className="frase">{estado === 'invalido' ? 'Pídele a tu coach tu enlace actualizado por WhatsApp.' : 'Conéctate un momento para cargar tus rutinas. Después funcionan aunque no tengas señal.'}</p>
      {estado !== 'invalido' && <button className="btn oro xl full" onClick={() => { setEstado('cargando'); cargar(); }}>Reintentar</button>}</div>;
  }
  if (estado === 'invalido') return <div className="fin"><img src={logo} alt="" style={{ width: 170 }} /><h1 style={{ fontSize: 34 }}>Este enlace ya no funciona</h1><p className="frase">Pídele a tu coach tu enlace actualizado.</p></div>;

  const nom = primerNombre(d.asesorado.nombre); const ps = ordenarProgramas(d.programas); const ses = d.sesiones;
  const [r0, r1, r2] = ruta;
  const pie = estado === 'sinred' ? <p className="pill" style={{ marginTop: 10 }}>Sin conexión · mostrando lo último guardado</p> : null;

  if (r0 === 'e') {
    const p = ps.find((x) => x.id === r1); const dia = p?.dias.find((x) => x.id === r2);
    if (!dia) { setTimeout(() => ir('rutinas'), 0); return null; }
    return <Entrenamiento programa={p} dia={dia} historial={ses} quien={nom} claveBorrador={`bt:borrador:a:${token}:${p.id}:${dia.id}`} onGuardar={guardar} onSalir={() => ir('p', p.id)} />;
  }
  if (r0 === 'p') {
    const p = ps.find((x) => x.id === r1); if (!p) { setTimeout(() => ir('rutinas'), 0); return null; }
    return <div className="pantalla"><Barra volver={{ fn: () => ir('rutinas'), texto: 'Rutinas' }} titulo="" borde={false} />
      <section className="frec"><b className="num">{nDias(p)}</b><div><h1>{p.nombre}</h1><p className="etq">{nDias(p) === 1 ? 'día' : 'días'} por semana</p></div></section>
      {p.nota && <p className="nota-coach" style={{ marginTop: 14 }}><small>De tu coach</small>{p.nota}</p>}
      <div className="sec"><h2>¿Qué toca hoy?</h2><span>elige el día</span></div>
      {p.dias.map((x, i) => <TarjetaDia key={x.id} d={x} i={i} sesiones={ses} programaId={p.id} onClick={() => ir('e', p.id, x.id)} />)}{pie}</div>;
  }
  if (r0 === 'rutinas') return <div className="pantalla"><Barra volver={{ fn: () => ir(), texto: 'Inicio' }} titulo="" borde={false} />
    <section style={{ padding: '4px 0 18px' }}><h1 className="gigante">Rutinas</h1><p className="sub">Elige el programa según los días que puedes entrenar esta semana.</p></section>
    {ps.length ? ps.map((p) => <TarjetaPrograma key={p.id} p={p} sesiones={ses} onClick={() => ir('p', p.id)} />) : <div className="vacio"><b>Tu coach está armando tus rutinas</b>Vuelve a abrir tu enlace en un rato.</div>}{pie}</div>;
  if (r0 === 'metricas') return <div className="pantalla"><Barra volver={{ fn: () => ir(), texto: 'Inicio' }} titulo="Mis métricas" /><Metricas sesiones={ses} programas={ps} />{pie}</div>;

  // inicio
  const l = aFecha(lunesDe(hoy())); const sem = DIAS.map((x, i) => { const f = new Date(l); f.setDate(f.getDate() + i); const fs = fechaLocal(f); return { x, on: ses.some((s) => s.fecha === fs), hoy: fs === hoy() }; });
  const u = ses[0]; const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return (
    <div className="pantalla">
      <header className="barra" style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', position: 'relative' }}><img src={marca} className="marca-top" alt="BT" /><div className="barra-t" />{vista === 'coach' && <span className="pill oro">Vista previa</span>}</header>
      <section className="at-hero"><p className="etq">{saludo()}</p><h1 className="gigante" style={{ marginTop: 4 }}>{nom}</h1>
        <p className="sub">{d.asesorado.objetivo ? `${d.asesorado.objetivo} · ` : ''}Programa de Bellido Trainer</p></section>
      <div className="dias-sem" aria-label="Tu semana">{sem.map((s, i) => <div key={i}><i className={`${s.on ? 'on' : ''} ${s.hoy ? 'hoy' : ''}`} /><span>{s.x}</span></div>)}</div>
      {cola.length > 0 && <p className="aviso"><Ico n="nube" s={20} /><span>{cola.length === 1 ? 'Tienes 1 entreno' : `Tienes ${cola.length} entrenos`} esperando señal. <b>Se envían solos</b> cuando vuelvas a tener conexión.</span></p>}
      <div className="mosaico">
        <button className="losa oro" onClick={() => ir('rutinas')}><span className="losa-ico"><Ico n="pesa" /></span><div><h3>Rutinas</h3><p>{ps.length ? `Programas de ${frecuencias(ps)}` : 'En preparación'}</p></div></button>
        <button className="losa" onClick={() => ir('metricas')}><span className="losa-ico"><Ico n="grafica" /></span><div><h3>Métricas</h3><p>{ses.length ? `${semanasSeguidas(ses)} ${semanasSeguidas(ses) === 1 ? 'semana' : 'semanas'} seguidas` : 'Tu progreso'}</p></div></button>
      </div>
      {u && <><div className="sec"><h2>Último entreno</h2></div><button className="item" style={{ borderTop: '1px solid var(--line)' }} onClick={() => ir('metricas')}><div className="item-t"><strong>{u.dia}</strong><span>{haceCuanto(u.fecha)} · {(u.series || []).length} series</span></div><Ico n="chev" className="chev" s={18} /></button></>}
      {pie}
      {!standalone && <p className="instalar">Tenla a mano: en Safari toca Compartir → Agregar a inicio.</p>}
    </div>
  );
}
