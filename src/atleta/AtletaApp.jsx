import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Barra, Ico, ir, useRuta, useAviso } from '../ui/kit.jsx';
import { TarjetaPrograma, TarjetaDia, ordenarProgramas, frecuencias } from '../shared/Programas.jsx';
import Metricas from '../shared/Metricas.jsx';
import Composicion from '../shared/Composicion.jsx';
import { programaCasa, PESOS_CASEROS } from '../data/casa.js';
import { colorGrupo } from '../lib/util.js';
import Entrenamiento from '../shared/Entrenamiento.jsx';
import { aFecha, fechaLocal, haceCuanto, hoy, lunesDe, primerNombre, saludo, semanasSeguidas, nDias, diasParaVencer, fLarga } from '../lib/util.js';
import logo from '../assets/logo.png';
import marca from '../assets/marca.png';

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const poner = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

// Sin código: solo quedan nombres de programas y días (lo mismo que manda el servidor)
const cerrado = (x) => ({ ...x, acceso: { abierto: false }, programas: (x.programas || []).map((p) => ({ ...p, nota: '', dias: (p.dias || []).map((d) => ({ id: d.id, nombre: d.nombre, grupos: d.grupos || (d.ejercicios || []).map((e) => e.grupo) })) })) });
const vigente = (x) => { const a = x?.acceso; if (!a) return true; return !!a.abierto && (!a.hasta || Date.parse(a.hasta) > Date.now()); };

// Protección de la rutina: sin copiar, sin menú, se oculta al salir de la app o al imprimir
function useProteger() {
  useEffect(() => {
    const b = document.body; b.classList.add('protegido');
    const velar = () => b.classList.add('velado'); const quitar = () => b.classList.remove('velado');
    const vis = () => (document.visibilityState === 'hidden' ? velar() : quitar());
    const menu = (e) => { if (!/INPUT|TEXTAREA/.test(e.target.tagName)) e.preventDefault(); };
    const tecla = (e) => { if (e.key === 'PrintScreen' || ((e.metaKey || e.ctrlKey) && /^[sp]$/i.test(e.key))) { e.preventDefault(); velar(); try { navigator.clipboard?.writeText(''); } catch {} setTimeout(quitar, 1500); } };
    // sin 'blur': tocar el video (iframe) o ponerlo en pantalla completa dispara blur y dejaba la pantalla negra
    const fs = () => quitar();
    document.addEventListener('visibilitychange', vis); addEventListener('pagehide', velar); addEventListener('pageshow', quitar);
    document.addEventListener('fullscreenchange', fs); document.addEventListener('webkitfullscreenchange', fs);
    document.addEventListener('contextmenu', menu); document.addEventListener('copy', menu); addEventListener('keydown', tecla); addEventListener('keyup', tecla);
    return () => { b.classList.remove('protegido', 'velado'); document.removeEventListener('visibilitychange', vis); removeEventListener('pagehide', velar); removeEventListener('pageshow', quitar); document.removeEventListener('fullscreenchange', fs); document.removeEventListener('webkitfullscreenchange', fs);
      document.removeEventListener('contextmenu', menu); document.removeEventListener('copy', menu); removeEventListener('keydown', tecla); removeEventListener('keyup', tecla); };
  }, []);
}

const MOTIVO = {
  incorrecto: 'Ese código no es. Revisa el número que te mandó tu coach.',
  agotado: 'Demasiados intentos. Pídele a tu coach un código nuevo.',
  sin_codigo: 'Ese código ya se usó o venció. Pídele uno nuevo a tu coach.',
  enlace: 'Este enlace ya no funciona. Pídele el nuevo a tu coach.',
};
function Desbloquear({ nom, onAbrir }) {
  const [c, setC] = useState(''); const [err, setErr] = useState(''); const [ocupado, setOcupado] = useState(false);
  async function enviar(e) {
    e?.preventDefault(); if (c.length !== 6 || ocupado) return; setOcupado(true); setErr('');
    try { const r = await onAbrir(c); if (!r.ok) { setErr(MOTIVO[r.motivo] || 'No se pudo abrir. Intenta de nuevo.'); setC(''); } }
    catch { setErr('Necesitas señal para ingresar el código. Después puedes entrenar sin conexión.'); }
    setOcupado(false);
  }
  return (
    <form className="candado" onSubmit={enviar}>
      <span className="candado-ico"><Ico n="candado" s={30} w={1.6} /></span>
      <h1>Tu rutina está bloqueada</h1>
      <p className="sub">{nom}, ingresa el código de 6 números que te manda tu coach para entrenar hoy. Sirve para una sesión: al enviarla se vuelve a bloquear.</p>
      <input className="in codigo-in num" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" maxLength={7} placeholder="••••••" aria-label="Código"
        value={c} onChange={(e) => { const v = e.target.value.replace(/\D/g, '').slice(0, 6); setC(v); setErr(''); }} autoFocus />
      {err && <p className="aviso rojo" style={{ width: '100%', textAlign: 'left' }}><span>{err}</span></p>}
      <button className="btn oro xl full" disabled={c.length !== 6 || ocupado}>{ocupado ? 'Abriendo…' : 'Abrir rutina'}</button>
    </form>
  );
}

export default function AtletaApp({ store, token, vista }) {
  const avisar = useAviso(); const ruta = useRuta();
  const kCache = `bt:at:${token}`, kCola = `bt:cola:${token}`;
  const [d, setD] = useState(() => leer(kCache)); const [estado, setEstado] = useState('cargando'); const [cola, setCola] = useState(() => leer(kCola) || []);
  const bloquearAlSalir = useRef(false);
  useProteger();

  const cargar = useCallback(async () => {
    try { const r = await store.atletaCargar(token, { coach: vista === 'coach' }); if (!r) { setEstado('invalido'); return; }
      const pend = leer(kCola) || []; const ids = new Set(r.sesiones.map((s) => s.id));
      const x = { ...r, sesiones: [...pend.filter((s) => !ids.has(s.id)).map((s) => ({ ...s, asesoradoId: r.asesorado.id })), ...r.sesiones] };
      setD(x); poner(kCache, x); setEstado('ok');
    } catch { setEstado(leer(kCache) ? 'sinred' : 'error'); }
  }, [store, token, kCache, kCola, vista]);

  const vaciarCola = useCallback(async () => {
    const pend = leer(kCola) || []; if (!pend.length) return; const quedan = [];
    for (const s of pend) { try { if (s.casa) { const { casa, ...x } = s; await store.atletaGuardarCasa(token, x); } else await store.atletaGuardarSesion(token, s); } catch { quedan.push(s); } }
    poner(kCola, quedan.length ? quedan : null); setCola(quedan);
    if (quedan.length < pend.length) avisar(pend.length - quedan.length === 1 ? 'Tu sesión pendiente ya le llegó a tu coach' : 'Tus sesiones pendientes ya le llegaron a tu coach');
  }, [store, token, kCola, avisar]);

  useEffect(() => { vaciarCola().then(cargar); const f = () => { if (document.visibilityState === 'visible') { vaciarCola(); } }; addEventListener('online', f); document.addEventListener('visibilitychange', f); return () => { removeEventListener('online', f); document.removeEventListener('visibilitychange', f); }; }, [cargar, vaciarCola]);

  async function guardar(s0) {
    if (vista === 'coach') { avisar('Vista previa: esta sesión no se guarda'); return {}; }
    const s = { ...s0, permiso: d.acceso?.permiso || null };
    const ses = { ...s0, asesoradoId: d.asesorado.id, origen: 'asesorado', creado: new Date().toISOString() };
    let pendiente = false;
    try { await store.atletaGuardarSesion(token, s); }
    catch { const c = [...(leer(kCola) || []), s]; poner(kCola, c); setCola(c); pendiente = true; }
    // enviada: la rutina queda bloqueada (al tocar "Listo", para no tapar el resumen); con acceso libre sigue abierta
    const libreSiempre = !!d.acceso?.sinCodigo;
    bloquearAlSalir.current = !libreSiempre;
    setD((x) => { const n = { ...x, sesiones: [ses, ...x.sesiones] }; poner(kCache, libreSiempre ? n : cerrado(n)); return n; });
    return { pendiente };
  }
  async function guardarCasa(s0) {
    if (vista === 'coach') { avisar('Vista previa: esta sesión no se guarda'); return {}; }
    const ses = { ...s0, programaId: null, asesoradoId: d.asesorado.id, origen: 'casa', creado: new Date().toISOString() };
    let pendiente = false;
    try { await store.atletaGuardarCasa(token, s0); }
    catch { const c = [...(leer(kCola) || []), { ...s0, casa: true }]; poner(kCola, c); setCola(c); pendiente = true; }
    setD((x) => { const n = { ...x, sesiones: [ses, ...x.sesiones] }; poner(kCache, x.acceso?.abierto ? n : cerrado(n)); return n; });
    return { pendiente };
  }
  const salirEntreno = (p) => { if (bloquearAlSalir.current) { bloquearAlSalir.current = false; setD((x) => cerrado(x)); ir(); } else ir('p', p.id); };
  async function abrir(codigo) {
    const r = await store.atletaAbrir(token, codigo);
    if (r?.ok) { await cargar(); avisar('Rutina abierta. ¡A entrenar!'); }
    return r || { ok: false, motivo: 'enlace' };
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
  const [r0, r1, r2] = ruta; const libre = vigente(d);
  const pie = estado === 'sinred' ? <p className="pill" style={{ marginTop: 10 }}>Sin conexión · mostrando lo último guardado</p> : null;
  const bloqueo = <div className="pantalla"><Barra volver={{ fn: () => ir(), texto: 'Inicio' }} titulo="" borde={false} /><Desbloquear nom={nom} onAbrir={abrir} />{pie}</div>;

  if (r0 === 'e') {
    const p = ps.find((x) => x.id === r1); const dia = p?.dias.find((x) => x.id === r2);
    if (dia && !dia.ejercicios) return bloqueo;
    if (!dia) { setTimeout(() => ir('rutinas'), 0); return null; }
    return <><Entrenamiento programa={p} dia={dia} historial={ses} quien={nom} claveBorrador={`bt:borrador:a:${token}:${p.id}:${dia.id}`} onGuardar={guardar} sinCodigo={!!d.acceso?.sinCodigo} onSalir={() => salirEntreno(p)} onProgreso={vista === 'coach' ? null : (x) => { store.atletaProgreso(token, x).catch(() => {}); }} /></>;
  }
  // ---------- en casa (no necesita código) ----------
  if (r0 === 'ce') {
    const p = ps.find((x) => x.id === r1); const pc = p && programaCasa(p); const dia = pc?.dias.find((x) => x.id === r2);
    if (!dia) { setTimeout(() => ir('casa'), 0); return null; }
    return <Entrenamiento programa={pc} dia={dia} historial={ses} quien={nom} claveBorrador={`bt:borrador:casa:${token}:${dia.id}`} onGuardar={guardarCasa} onSalir={() => ir('casa')} />;
  }
  if (r0 === 'casa') {
    const conDias = ps.filter((p) => nDias(p));
    return <div className="pantalla"><Barra volver={{ fn: () => ir(), texto: 'Inicio' }} titulo="" borde={false} />
      <section style={{ padding: '4px 0 14px' }}><h1 className="gigante">En casa</h1>
        <p className="sub">¿No puedes ir al gym? Haz la versión en casa del día que te toca: corta, con lo que tienes a mano, y le das a cada músculo su estímulo para no perder el día.</p></section>
      <details className="intens casa-guia"><summary>Cómo armar tus pesos en casa <Ico n="abajo" s={16} /></summary>
        <div className="casa-pesos">{PESOS_CASEROS.map(([a, b]) => <div key={a}><span>{a}</span><b>{b}</b></div>)}</div>
        <p className="ayuda" style={{ margin: '8px 0 10px' }}>Como el peso es menor que en el gym, baja cada repetición en 3 segundos y llega cerca del fallo (RPE 9): así el estímulo sigue siendo bueno.</p>
      </details>
      {!conDias.length && <div className="vacio"><b>Tu coach está armando tus rutinas</b>Cuando tengas tu programa, aquí aparece su versión en casa.</div>}
      {conDias.map((p) => { const pc = programaCasa(p); return <div key={p.id}>
        {conDias.length > 1 && <div className="sec"><h2>{p.nombre}</h2><span>{nDias(p)} días</span></div>}
        {pc.dias.map((dc, i) => { const u = ses.filter((x) => x.origen === 'casa' && x.dia === dc.nombre).map((x) => x.fecha).sort().pop();
          return <button key={dc.id} className="dia-card casa" onClick={() => ir('ce', p.id, dc.id)}>
            <span className="n num">{i + 1}</span>
            <div className="item-t"><strong>{dc.base}</strong><span>En casa · ~{dc.minutos} min · {dc.ejercicios.length} ejercicios{u ? ` · hecho ${haceCuanto(u)}` : ''}</span>
              <div className="chips-g">{dc.grupos.map((g) => <i key={g} style={{ borderColor: colorGrupo(g) }}>{g}</i>)}</div></div>
            <Ico n="chev" className="chev" s={20} /></button>; })}
      </div>; })}{pie}</div>;
  }
  if ((r0 === 'p' || r0 === 'rutinas') && !libre) return bloqueo;
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
  const u = ses[0]; const nv = diasParaVencer(d.asesorado.vence); const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone;
  return (
    <div className="pantalla">
      <header className="barra" style={{ background: 'transparent', backdropFilter: 'none', WebkitBackdropFilter: 'none', position: 'relative' }}><img src={marca} className="marca-top" alt="BT" /><div className="barra-t" />{vista === 'coach' && <span className="pill oro">Vista previa</span>}</header>
      <section className="at-hero"><p className="etq">{saludo()}</p><h1 className="gigante" style={{ marginTop: 4 }}>{nom}</h1>
        <p className="sub">{d.asesorado.objetivo ? `${d.asesorado.objetivo} · ` : ''}Programa de Bellido Trainer</p></section>
      <div className="dias-sem" aria-label="Tu semana">{sem.map((s, i) => <div key={i}><i className={`${s.on ? 'on' : ''} ${s.hoy ? 'hoy' : ''}`} /><span>{s.x}</span></div>)}</div>
      {nv != null && nv <= 3 && <p className={`aviso ${nv < 0 ? 'rojo' : ''}`}><Ico n="reloj" s={20} /><span>{nv < 0 ? <>Tu mensualidad <b>venció el {fLarga(d.asesorado.vence)}</b>. Habla con tu coach para seguir con tu plan.</> : <>Tu mensualidad <b>{nv === 0 ? 'vence hoy' : nv === 1 ? 'vence mañana' : `vence el ${fLarga(d.asesorado.vence)}`}</b>. Recuerda renovarla para seguir sin pausa.</>}</span></p>}
      {cola.length > 0 && <p className="aviso"><Ico n="nube" s={20} /><span>{cola.length === 1 ? 'Tienes 1 entreno' : `Tienes ${cola.length} entrenos`} esperando señal. <b>Se envían solos</b> cuando vuelvas a tener conexión.</span></p>}
      <div className="mosaico">
        <button className="losa oro" onClick={() => ir('rutinas')}><span className="losa-ico"><Ico n={libre ? 'pesa' : 'candado'} /></span><div><h3>Rutinas</h3><p>{!ps.length ? 'En preparación' : libre ? `Programas de ${frecuencias(ps)}` : 'Ingresa tu código para entrenar'}</p></div></button>
        <button className="losa" onClick={() => ir('metricas')}><span className="losa-ico"><Ico n="grafica" /></span><div><h3>Métricas</h3><p>{ses.length ? `${semanasSeguidas(ses)} ${semanasSeguidas(ses) === 1 ? 'semana' : 'semanas'} seguidas` : 'Tu progreso'}</p></div></button>
        <div className="losa pronto" aria-disabled="true" aria-label="Tu alimentación, próximamente"><span className="losa-ico"><Ico n="comida" /></span><div><h3 className="largo">Tu<br />alimentación</h3><p>Tu plan de comidas</p></div><span className="sello">Próximamente</span></div>
        <button className="losa" onClick={() => ir('casa')}><span className="losa-ico"><Ico n="casa" /></span><div><h3>Ejercicios de casa</h3><p>Para cuando no puedas ir al gym</p></div></button>
      </div>
      {d.controles?.length > 0 && <><div className="sec"><h2>Tu composición corporal</h2></div><Composicion controles={d.controles} merito /></>}
      {u && <><div className="sec"><h2>Último entreno</h2></div><button className="item" style={{ borderTop: '1px solid var(--line)' }} onClick={() => ir('metricas')}><div className="item-t"><strong>{u.dia}</strong><span>{haceCuanto(u.fecha)} · {(u.series || []).length} series</span></div><Ico n="chev" className="chev" s={18} /></button></>}
      {pie}
      {!standalone && <p className="instalar">Tenla a mano: en Safari toca Compartir → Agregar a inicio.</p>}
    </div>
  );
}
