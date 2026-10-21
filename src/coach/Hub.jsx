import React, { useCallback, useEffect, useState } from 'react';
import { Barra, Ico, ir, Hoja, Confirmar, useAviso, copiarTexto } from '../ui/kit.jsx';
import { FichaAsesorado } from './Inicio.jsx';
import { DetalleSesion } from '../shared/Metricas.jsx';
import { TarjetaDia, ordenarProgramas, frecuencias } from '../shared/Programas.jsx';
import { haceCuanto, primerNombre, semanasSeguidas, sesionesSemana, tokenNuevo, fLarga, nDias, abrirWa, textoVence, diasParaVencer, fechaLocal } from '../lib/util.js';
import { enlaceAtleta } from './CoachApp.jsx';
import SeccionComposicion from './Controles.jsx';
import { programaCasa } from '../data/casa.js';
import { resumenEj } from '../lib/util.js';

const hora = (t) => new Date(t).toLocaleTimeString('es-VE', { hour: 'numeric', minute: '2-digit' });
const H4 = 4 * 36e5;
export function estadoCodigo(c) {
  if (!c) return 'ninguno'; const now = Date.now();
  if (c.usado) return 'usado';
  if (c.abierto) return now - Date.parse(c.abierto) < H4 ? 'abierto' : 'vencido';
  return Date.parse(c.expira) > now ? 'pendiente' : 'vencido';
}

// Código de 6 dígitos que el asesorado necesita para abrir su rutina
function CodigoSesion({ a, store, sesiones }) {
  const avisar = useAviso(); const nom = primerNombre(a.nombre);
  const [c, setC] = useState(undefined); const [ocupado, setOcupado] = useState(false);
  const traer = useCallback(async () => { try { setC(await store.codigoActual(a.id)); } catch { setC((x) => (x === undefined ? null : x)); } }, [store, a.id]);
  useEffect(() => { traer(); const f = () => document.visibilityState === 'visible' && traer(); document.addEventListener('visibilitychange', f); const i = setInterval(f, 30000); return () => { document.removeEventListener('visibilitychange', f); clearInterval(i); }; }, [traer, sesiones.length]);
  const est = estadoCodigo(c);
  async function generar() { setOcupado(true); try { const n = await store.nuevoCodigo(a.id); setC(n); avisar('Código listo: mándaselo'); } catch (e) { avisar(e.message, 'error'); } setOcupado(false); }
  const enviar = () => abrirWa(a.datos?.tel, `${nom}, tu código para entrenar hoy es: ${c.codigo}\nÁbrelo en tu app → Rutinas. Sirve para una sesión.`);
  return (
    <div className="tarj codigo-c">
      {est === 'pendiente' ? <>
        <p className="etq">Código para entrenar</p>
        <div className="codigo num" aria-label={`Código ${c.codigo}`}>{c.codigo.slice(0, 3)}<i />{c.codigo.slice(3)}</div>
        <p className="ayuda" style={{ margin: '2px 0 12px' }}>Sin usar · sirve hasta las {hora(c.expira)}{c.intentos ? ` · ${c.intentos} ${c.intentos === 1 ? 'intento fallido' : 'intentos fallidos'}` : ''}</p>
        <div className="fila-btn"><button className="btn wa" onClick={enviar}><Ico n="wa" s={20} />Enviar</button>
          <button className="btn" onClick={async () => avisar((await copiarTexto(c.codigo)) ? 'Código copiado' : 'No se pudo copiar')}><Ico n="copiar" s={18} />Copiar</button>
          <button className="btn" disabled={ocupado} onClick={generar}><Ico n="refrescar" s={18} />Otro</button></div>
        <button className="btn fant full" style={{ marginTop: 6 }} onClick={() => ir('a', a.id, 'preparar')}><Ico n="lapiz" s={16} />Ajustar la sesión</button>
      </> : <div className="codigo-fila">
        <span className={`codigo-ico ${est === 'abierto' ? 'on' : ''}`}><Ico n={est === 'abierto' ? 'llave' : 'candado'} s={22} /></span>
        <div className="item-t">
          <strong>{est === 'abierto' ? 'Entrenando ahora' : 'Rutina bloqueada'}</strong>
          <span>{est === 'abierto' ? `Abrió su rutina a las ${hora(c.abierto)}${c.progreso ? ` · ${c.progreso.hechas}/${c.progreso.total} series` : ''}. Se bloquea al enviar la sesión.` : est === 'usado' ? `Envió su sesión ${haceCuanto(fechaLocal(new Date(c.usado)))} a las ${hora(c.usado)}.` : `${nom} necesita un código para ver su rutina y entrenar.`}</span>
        </div>
        {est !== 'abierto' ? <button className="btn oro chico" disabled={ocupado || c === undefined} onClick={() => ir('a', a.id, 'preparar')}>Dar código</button>
          : <button className="btn chico" onClick={() => ir('envivo')}>Ver en vivo</button>}
      </div>}
    </div>
  );
}

export default function Hub({ a, programas, sesiones, acc, store, controles = [], faltaTablas }) {
  const avisar = useAviso(); const nom = primerNombre(a.nombre);
  const [editar, setEditar] = useState(false); const [mas, setMas] = useState(false); const [borrar, setBorrar] = useState(false); const [nuevoTok, setNuevoTok] = useState(false);
  const [verCasa, setVerCasa] = useState(false);
  const [registrar, setRegistrar] = useState(false); const [regProg, setRegProg] = useState(null); const [ver, setVer] = useState(null);
  const ses = [...sesiones].sort((x, y) => (x.fecha < y.fecha ? 1 : -1)); const u = ses[0]?.fecha;
  const semana = new Set(sesionesSemana(ses).map((s) => s.fecha + s.dia)).size;
  const url = enlaceAtleta(a);
  const mensaje = `Hola ${nom}, este es tu acceso a BELLIDO TRAINER. Ahí tienes tus rutinas y tus métricas, y registras cada entreno. Cada vez que vayas a entrenar te paso un código para abrir la rutina. Guárdalo: es tu enlace personal.\n${url}`;
  const ps = ordenarProgramas(programas);

  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Equipo' }} titulo="" borde={false}
        derecha={<><button className="ico-b" onClick={() => setEditar(true)} aria-label="Editar ficha"><Ico n="lapiz" /></button><button className="ico-b" onClick={() => setMas(true)} aria-label="Más opciones"><Ico n="mas3" w={3} /></button></>} />
      <section className="hub-cab">
        <h1 className="gigante">{a.nombre}</h1>
        <div className="hub-meta">{a.objetivo && <span className="pill oro">{a.objetivo}</span>}{a.nivel && <span className="pill">{a.nivel}</span>}{a.datos?.edad && <span className="pill">{a.datos.edad} años</span>}{a.datos?.peso && <span className="pill">{a.datos.peso} kg</span>}</div>
        {a.notas && <p className="guia" style={{ fontSize: 14 }}>{a.notas}</p>}
      </section>

      <div className="mosaico">
        <button className="losa oro" onClick={() => ir('a', a.id, 'rutinas')}>
          <span className="losa-ico"><Ico n="pesa" /></span>
          <div><h3>Rutinas</h3><p>{programas.length ? `${programas.length} ${programas.length === 1 ? 'programa' : 'programas'} · ${frecuencias(programas)}` : 'Arma su primer programa'}</p></div>
        </button>
        <button className="losa" onClick={() => ir('a', a.id, 'metricas')}>
          <span className="losa-ico"><Ico n="grafica" /></span>
          <div><h3>Métricas</h3><p>{ses.length ? `${ses.length} sesiones · ${haceCuanto(u)}` : 'Sin sesiones todavía'}</p></div>
        </button>
      </div>

      {a.vence && diasParaVencer(a.vence) <= 3 && <button className="aviso" style={{ width: '100%', textAlign: 'left' }} onClick={() => ir('ajustes', 'pagos')}><Ico n="reloj" s={20} style={{ flex: 'none', marginTop: 1 }} /><span><b>Mensualidad: {textoVence(a.vence)}.</b> Toca para marcar el pago o recordarle.</span></button>}

      <div className="sec"><h2>Entrenar hoy</h2><span>código de un uso</span></div>
      <CodigoSesion a={a} store={store} sesiones={sesiones} />

      {ps.some((p) => nDias(p)) && <button className="item casa-coach" onClick={() => setVerCasa(true)}><span className="codigo-ico"><Ico n="casa" s={22} /></span>
        <div className="item-t"><strong>Rutina en casa</strong><span>Lista para cada día de sus programas · la ve en “Ejercicios de casa”</span></div><Ico n="chev" className="chev" s={18} /></button>}

      <div className="kpis">
        <div className="kpi"><b className="num">{semana}</b><span>entrenos esta semana</span></div>
        <div className="kpi"><b className="num">{semanasSeguidas(ses)}</b><span>semanas seguidas</span></div>
        <div className="kpi"><b className="num" style={{ fontSize: 20, lineHeight: 1.4 }}>{u ? haceCuanto(u) : '—'}</b><span>último entreno</span></div>
      </div>

      <SeccionComposicion a={a} controles={controles} acc={acc} faltaTablas={faltaTablas} />

      <div className="sec"><h2>Acceso de {nom}</h2><span>{store.modo === 'local' ? 'modo local' : 'enlace fijo'}</span></div>
      <div className="tarj acceso">
        <p style={{ fontSize: 15 }}>Con este enlace {nom} entra a su app. Se manda una sola vez; para entrenar, además, le das un código cada vez.</p>
        <p className="acceso-u">{url}</p>
        <div className="fila-btn">
          <button className="btn wa" onClick={() => abrirWa(a.datos?.tel, mensaje)}><Ico n="wa" s={20} />WhatsApp</button>
          <button className="btn" onClick={async () => avisar((await copiarTexto(url)) ? 'Enlace copiado' : 'No se pudo copiar: mantén presionado el enlace')}><Ico n="copiar" s={18} />Copiar</button>
          <button className="btn" onClick={() => window.open(url + '&vista=coach', '_blank')}><Ico n="ojo" s={18} />Ver</button>
        </div>
        {store.modo === 'local' && <p className="ayuda" style={{ margin: '12px 0 0' }}>En modo local el enlace solo abre en este teléfono. Conecta Supabase en Ajustes para que funcione en el de {nom}.</p>}
      </div>

      <div className="sec"><h2>Entrenar juntos</h2></div>
      <button className="btn full" onClick={() => { setRegProg(ps.length === 1 ? ps[0] : null); setRegistrar(true); }} disabled={!programas.length}><Ico n="pesa" s={20} />Registrar un entreno aquí</button>

      {ses.length > 0 && <>
        <div className="sec"><h2>Últimas sesiones</h2><button onClick={() => ir('a', a.id, 'metricas')}>Ver todo</button></div>
        <div className="lista">{ses.slice(0, 4).map((s) => <button key={s.id} className="item" onClick={() => setVer(s)}><div className="item-t"><strong>{s.dia || 'Entrenamiento'}</strong><span>{fLarga(s.fecha)} · {(s.series || []).length} series{s.origen === 'asesorado' ? '' : ' · contigo'}</span></div><Ico n="chev" className="chev" s={18} /></button>)}</div>
      </>}

      {verCasa && <Hoja titulo="Rutina en casa" onCerrar={() => setVerCasa(false)}>
        <p className="muted" style={{ marginTop: -6, marginBottom: 12 }}>Se arma sola con los grupos musculares de cada día de su rutina: un ejercicio casero por grupo, con botellas, mochila, silla o escalón. Si cambias su rutina, esta se actualiza. No necesita código.</p>
        {ps.filter((p) => nDias(p)).map((p) => <div key={p.id} style={{ marginBottom: 12 }}>
          {ps.length > 1 && <p className="etq" style={{ marginBottom: 6 }}>{p.nombre}</p>}
          {programaCasa(p).dias.map((dc) => <div key={dc.id} className="tarj" style={{ marginBottom: 8 }}>
            <strong style={{ fontWeight: 600 }}>{dc.base}</strong> <span className="etq">· ~{dc.minutos} min</span>
            {dc.ejercicios.map((e) => <p key={e.id} style={{ fontSize: 14.5, padding: '5px 0', borderTop: '1px solid var(--line)', marginTop: 6 }}>{e.ejercicio} <span className="muted">· {resumenEj(e)} · {e.pesoSugerido}</span></p>)}
          </div>)}
        </div>)}
      </Hoja>}
      {ver && <DetalleSesion s={ver} historial={sesiones} onCerrar={() => setVer(null)} onGuardar={async (x) => { await acc.guardarSesion(x); avisar('Sesión actualizada'); }} onBorrar={(s) => { setVer(null); acc.borrarSesion(s); }} />}
      {editar && <FichaAsesorado inicial={a} onCerrar={() => setEditar(false)} onGuardar={async (f) => { await acc.guardarAsesorado(f); setEditar(false); avisar('Ficha guardada'); }} />}
      {registrar && <Hoja titulo={regProg ? regProg.nombre : '¿Qué programa?'} onCerrar={() => setRegistrar(false)}>
        {!regProg ? ps.map((p) => <button key={p.id} className="item" onClick={() => setRegProg(p)}><div className="item-t"><strong>{p.nombre}</strong><span>{nDias(p)} días</span></div><Ico n="chev" className="chev" s={18} /></button>)
          : <>{ps.length > 1 && <button className="btn fant" style={{ marginBottom: 8, paddingLeft: 0 }} onClick={() => setRegProg(null)}><Ico n="atras" s={18} />Otro programa</button>}
            {regProg.dias.map((d, i) => <TarjetaDia key={d.id} d={d} i={i} sesiones={sesiones} programaId={regProg.id} onClick={() => { setRegistrar(false); ir('a', a.id, 'entrenar', regProg.id, d.id); }} />)}</>}
      </Hoja>}
      {mas && <Hoja titulo={a.nombre} onCerrar={() => setMas(false)}>
        <button className="item" onClick={() => { setMas(false); setNuevoTok(true); }}><Ico n="refrescar" /><div className="item-t"><strong>Cambiar su enlace</strong><span>El enlace anterior deja de funcionar</span></div></button>
        <button className="item" onClick={async () => { setMas(false); await acc.guardarAsesorado({ ...a, archivado: !a.archivado }); avisar(a.archivado ? 'Reactivado' : `${nom} quedó archivado: su enlace se pausa`); if (!a.archivado) ir(); }}><Ico n="bajar" /><div className="item-t"><strong>{a.archivado ? 'Reactivar' : 'Archivar'}</strong><span>{a.archivado ? 'Vuelve a la lista y su enlace funciona' : 'Lo saca de la lista y pausa su enlace. No borra nada'}</span></div></button>
        <button className="item" onClick={() => { setMas(false); setBorrar(true); }} style={{ color: 'var(--bad)' }}><Ico n="basura" /><div className="item-t"><strong>Borrar asesorado</strong><span>Borra sus programas y todo su historial</span></div></button>
      </Hoja>}
      {nuevoTok && <Confirmar titulo="¿Cambiar el enlace?" texto={`El enlace que tiene ${nom} deja de funcionar. Tendrás que mandarle el nuevo.`} si="Cambiar enlace" onNo={() => setNuevoTok(false)} onSi={async () => { setNuevoTok(false); await acc.guardarAsesorado({ ...a, token: tokenNuevo() }); avisar('Enlace nuevo listo: mándaselo'); }} />}
      {borrar && <Confirmar titulo={`¿Borrar a ${nom}?`} texto={`Se borran sus programas y sus ${ses.length} sesiones. No se puede deshacer. Si solo quieres sacarlo de la lista, archívalo.`} si="Borrar todo" peligro onNo={() => setBorrar(false)} onSi={async () => { setBorrar(false); await acc.borrarAsesorado(a.id); avisar('Asesorado borrado'); ir(); }} />}
    </div>
  );
}
