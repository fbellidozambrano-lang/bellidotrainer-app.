import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRuta, ir, useAviso } from '../ui/kit.jsx';
import { uuid, tokenNuevo } from '../lib/util.js';
import Login from './Login.jsx';
import Inicio from './Inicio.jsx';
import Hub from './Hub.jsx';
import Rutinas from './Rutinas.jsx';
import Editor from './Editor.jsx';
import Ajustes from './Ajustes.jsx';
import Preparar from './Preparar.jsx';
import EnVivo, { activos } from './EnVivo.jsx';
import Biblioteca from './Biblioteca.jsx';
import Periodizacion from './Periodizacion.jsx';
import { Plantillas, EditorPlantilla } from './Plantillas.jsx';
import Metricas from '../shared/Metricas.jsx';
import Entrenamiento from '../shared/Entrenamiento.jsx';
import { Barra } from '../ui/kit.jsx';
import logo from '../assets/logo.png';

// Pantalla de carga que nunca deja al coach atrapado: si tarda, ofrece reintentar
function Cargando({ reintentar }) {
  const [tarda, setTarda] = useState(false);
  useEffect(() => { const t = setTimeout(() => setTarda(true), 12000); return () => clearTimeout(t); }, []);
  return (
    <div className="cargando"><div style={{ display: 'grid', placeItems: 'center', gap: 18 }}><img src={logo} alt="BELLIDO TRAINER" />
      {tarda && <><p className="sub" style={{ textAlign: 'center', maxWidth: 280 }}>Está tardando más de lo normal. Puede ser la señal.</p>
        <button className="btn oro" onClick={reintentar}>Reintentar</button></>}</div></div>
  );
}

export const enlaceAtleta = (a) => `${location.origin}${location.pathname}?a=${a.token}`;

export default function CoachApp({ store }) {
  const avisar = useAviso();
  const [usuario, setUsuario] = useState(undefined);
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const ruta = useRuta();
  const ultimo = useRef('');

  // Supabase avisa de cada renovación de la sesión (al volver a la app, cada hora): si es el mismo
  // usuario no se recarga todo, antes eso volvía a bajar todos los datos y la app se quedaba pegada
  const mismo = (u) => setUsuario((prev) => (prev && u && prev.id === u.id ? prev : u));
  useEffect(() => { store.auth.usuario().then(mismo, () => setUsuario(null)); return store.auth.escuchar(mismo); }, [store]); // eslint-disable-line

  const cargar = useCallback(async () => {
    try { setError(''); const d = await store.cargarTodo(); setDatos(d); ultimo.current = d.sesiones.reduce((m, s) => (s.creado > m ? s.creado : m), ''); }
    catch (e) { setError(e.message); }
  }, [store]);
  useEffect(() => { if (usuario) cargar(); else setDatos(null); }, [usuario, cargar]);

  // sesiones nuevas de los asesorados: al volver a la app y cada 45 s
  useEffect(() => {
    if (!usuario || store.modo !== 'nube') return;
    const traer = async () => {
      if (document.visibilityState !== 'visible' || !ultimo.current) return;
      try { const nuevas = await store.sesionesDesde(ultimo.current); if (!nuevas.length) return;
        setDatos((d) => { const ids = new Set(d.sesiones.map((s) => s.id)); const add = nuevas.filter((s) => !ids.has(s.id)); return add.length ? { ...d, sesiones: [...d.sesiones, ...add] } : d; });
        ultimo.current = nuevas.reduce((m, s) => (s.creado > m ? s.creado : m), ultimo.current);
      } catch {}
    };
    const i = setInterval(traer, 45000); document.addEventListener('visibilitychange', traer);
    return () => { clearInterval(i); document.removeEventListener('visibilitychange', traer); };
  }, [usuario, store]);

  // en vivo: quién tiene la rutina abierta
  const [vivo, setVivo] = useState([]);
  const vivoTxt = useRef('[]');
  const recargarVivo = useCallback(async () => { if (document.visibilityState !== 'visible') return; try { const v = await store.entrenandoAhora(); const t = JSON.stringify(v); if (t !== vivoTxt.current) { vivoTxt.current = t; setVivo(v); } } catch {} }, [store]);
  useEffect(() => { if (!usuario) return; recargarVivo(); const i = setInterval(recargarVivo, 30000); document.addEventListener('visibilitychange', recargarVivo); return () => { clearInterval(i); document.removeEventListener('visibilitychange', recargarVivo); }; }, [usuario, recargarVivo]);

  const acc = useMemo(() => {
    const falla = (e) => { avisar(e.message || 'No se pudo guardar', 'error'); throw e; };
    return {
      async guardarAsesorado(a) {
        const nuevo = { datos: {}, objetivo: '', nivel: '', notas: '', ...a, id: a.id || uuid(), token: a.token || tokenNuevo() };
        try { const g = await store.guardarAsesorado(nuevo); setDatos((d) => ({ ...d, asesorados: d.asesorados.some((x) => x.id === g.id) ? d.asesorados.map((x) => (x.id === g.id ? g : x)) : [...d.asesorados, g] })); return g; } catch (e) { falla(e); }
      },
      async borrarAsesorado(id) { try { await store.borrarAsesorado(id); setDatos((d) => ({ ...d, asesorados: d.asesorados.filter((x) => x.id !== id), programas: d.programas.filter((x) => x.asesoradoId !== id), sesiones: d.sesiones.filter((x) => x.asesoradoId !== id) })); } catch (e) { falla(e); } },
      ponerPrograma(p) { setDatos((d) => ({ ...d, programas: d.programas.some((x) => x.id === p.id) ? d.programas.map((x) => (x.id === p.id ? p : x)) : [...d.programas, p] })); },
      async guardarPrograma(p) { acc.ponerPrograma(p); try { await store.guardarPrograma(p); } catch (e) { falla(e); } },
      async guardarProgramas(ps) { if (!ps.length) return; setDatos((d) => { const m = new Map(ps.map((p) => [p.id, p])); return { ...d, programas: d.programas.map((x) => m.get(x.id) || x) }; }); try { await store.guardarProgramas(ps); } catch (e) { falla(e); } },
      async guardarControl(c) { try { const g = await store.guardarControl(c); setDatos((d) => ({ ...d, controles: [...d.controles.filter((x) => x.id !== g.id), g] })); return g; } catch (e) { falla(e); } },
      async borrarControl(id) { try { await store.borrarControl(id); setDatos((d) => ({ ...d, controles: d.controles.filter((x) => x.id !== id) })); } catch (e) { falla(e); } },
      async guardarEjercicios(bs) { if (!bs.length) return; setDatos((d) => { const m = new Map(bs.map((b) => [b.id, b])); const ya = new Set(d.biblioteca.map((x) => x.id)); return { ...d, biblioteca: [...d.biblioteca.map((x) => m.get(x.id) || x), ...bs.filter((b) => !ya.has(b.id))] }; }); try { await store.guardarEjercicios(bs); } catch (e) { falla(e); } },
      async borrarEjercicio(id) { try { await store.borrarEjercicio(id); setDatos((d) => ({ ...d, biblioteca: d.biblioteca.filter((x) => x.id !== id) })); } catch (e) { falla(e); } },
      ponerPlantilla(t) { setDatos((d) => ({ ...d, plantillas: d.plantillas.some((x) => x.id === t.id) ? d.plantillas.map((x) => (x.id === t.id ? t : x)) : [...d.plantillas, t] })); },
      async guardarPlantillas(ts) { if (!ts.length) return; ts.forEach((t) => acc.ponerPlantilla(t)); try { await store.guardarPlantillas(ts); } catch (e) { falla(e); } },
      async borrarPlantilla(id) { try { await store.borrarPlantilla(id); setDatos((d) => ({ ...d, plantillas: d.plantillas.filter((x) => x.id !== id) })); } catch (e) { falla(e); } },
      async borrarPrograma(id) { try { await store.borrarPrograma(id); setDatos((d) => ({ ...d, programas: d.programas.filter((x) => x.id !== id) })); } catch (e) { falla(e); } },
      async guardarSesion(s) { try { const g = await store.guardarSesion({ ...s, origen: s.origen || 'coach' }); setDatos((d) => ({ ...d, sesiones: [...d.sesiones.filter((x) => x.id !== g.id), g] })); return g; } catch (e) { falla(e); } },
      async guardarSesiones(ss) { if (!ss.length) return; try { const gs = await store.guardarSesiones(ss); const m = new Map(gs.map((g) => [g.id, g])); setDatos((d) => ({ ...d, sesiones: d.sesiones.map((x) => m.get(x.id) || x) })); } catch (e) { falla(e); } },
      async borrarSesion(s) { try { await store.borrarSesion(s.id); setDatos((d) => ({ ...d, sesiones: d.sesiones.filter((x) => x.id !== s.id) })); avisar('Sesión borrada'); } catch (e) { falla(e); } },
      async importar(x, prog) { await store.importar(x, prog); await cargar(); },
    };
  }, [store, avisar, cargar]);

  if (usuario === undefined) return <Cargando reintentar={() => location.reload()} />;
  if (!usuario) return <Login store={store} />;
  if (error && !datos) return <div className="pantalla"><div className="aviso rojo" style={{ marginTop: 40 }}><span>{error}</span></div><button className="btn oro full" style={{ marginTop: 14 }} onClick={cargar}>Reintentar</button><button className="btn full" style={{ marginTop: 10 }} onClick={() => ir('ajustes')}>Ajustes</button>{ruta[0] === 'ajustes' && <Ajustes store={store} datos={{ asesorados: [], programas: [], sesiones: [], biblioteca: [], plantillas: [], controles: [] }} acc={acc} usuario={usuario} />}</div>;
  if (!datos) return <Cargando reintentar={cargar} />;

  const [r0, id, r2, r3, r4] = ruta;
  if (r0 === 'ajustes') return <Ajustes store={store} datos={datos} acc={acc} usuario={usuario} />;
  if (r0 === 'envivo') return <EnVivo datos={datos} vivo={vivo} recargar={recargarVivo} />;
  if (r0 === 'periodizacion') return <Periodizacion datos={datos} acc={acc} inicial={id} />;
  if (r0 === 'biblioteca') return <Biblioteca datos={datos} acc={acc} usuario={usuario} />;
  if (r0 === 'plantillas') return <Plantillas datos={datos} acc={acc} usuario={usuario} />;
  if (r0 === 'plantilla') { const t = datos.plantillas.find((x) => x.id === id); if (!t) { setTimeout(() => ir('plantillas'), 0); return null; } return <EditorPlantilla key={t.id} t={t} datos={datos} acc={acc} />; }
  if (r0 === 'a') {
    const a = datos.asesorados.find((x) => x.id === id);
    if (!a) { setTimeout(() => ir(), 0); return null; }
    const ps = datos.programas.filter((p) => p.asesoradoId === a.id); const ss = datos.sesiones.filter((s) => s.asesoradoId === a.id);
    if (r2 === 'preparar') return <Preparar a={a} programas={ps} sesiones={ss} acc={acc} store={store} />;
    if (r2 === 'rutinas') return <Rutinas a={a} programas={ps} sesiones={ss} datos={datos} acc={acc} />;
    if (r2 === 'p') { const p = ps.find((x) => x.id === r3); if (!p) { setTimeout(() => ir('a', a.id, 'rutinas'), 0); return null; } return <Editor key={p.id} a={a} p={p} datos={datos} acc={acc} store={store} />; }
    if (r2 === 'metricas') return <div className="pantalla"><Barra volver={{ fn: () => ir('a', a.id), texto: a.nombre.split(' ')[0] }} titulo="Métricas" /><Metricas sesiones={ss} programas={ps.filter((p) => p.visible !== false)} nombre={a.nombre.split(' ')[0]} onBorrarSesion={acc.borrarSesion} onGuardarSesion={async (x) => { await acc.guardarSesion(x); avisar('Sesión actualizada'); }} /></div>;
    if (r2 === 'entrenar') {
      const p = ps.find((x) => x.id === r3); const d = p?.dias.find((x) => x.id === r4);
      if (!d) { setTimeout(() => ir('a', a.id), 0); return null; }
      return <Entrenamiento modo="coach" programa={p} dia={d} historial={ss} quien={a.nombre.split(' ')[0]} claveBorrador={`bt:borrador:c:${a.id}:${p.id}:${d.id}`}
        sexo={a.datos?.sexo || ''} onGuardar={async (s) => { await acc.guardarSesion({ ...s, asesoradoId: a.id, origen: 'coach' }); return {}; }} onSalir={() => ir('a', a.id)} />;
    }
    return <Hub a={a} programas={ps} sesiones={ss} acc={acc} store={store} controles={datos.controles.filter((c) => c.asesoradoId === a.id)} faltaTablas={datos.faltaTablas} />;
  }
  return <Inicio datos={datos} acc={acc} store={store} usuario={usuario} entrenando={activos(vivo)} recargarVivo={recargarVivo} />;
}
