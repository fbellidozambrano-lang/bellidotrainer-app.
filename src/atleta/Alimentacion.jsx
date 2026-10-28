// Alimentación del asesorado: su contador diario. Lo que registra se envía a su coach;
// sin señal queda en el teléfono y se envía solo después.
import React, { useCallback, useEffect, useState } from 'react';
import { Barra, ir, useAviso } from '../ui/kit.jsx';
import { hoy, diasEntre } from '../lib/util.js';
import Diario, { moverDia } from '../shared/nutri/Diario.jsx';

const leer = (k) => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const poner = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)); } catch {} };

export default function Alimentacion({ store, token, vista }) {
  const avisar = useAviso();
  const kCache = `bt:nutri:${token}`, kCola = `bt:ncola:${token}`;
  const [fecha, setFecha] = useState(hoy()); const [datos, setDatos] = useState(() => leer(kCache)); const [estado, setEstado] = useState('cargando');
  const [cola, setCola] = useState(() => leer(kCola) || []);
  const cargar = useCallback(async (f) => {
    try { const d = await store.nutri.atletaCargar(token, moverDia(f, -6), f); const pend = leer(kCola) || [];
      const ids = new Set((d.registros || []).map((r) => r.id)); const x = { ...d, registros: [...(d.registros || []), ...pend.filter((r) => r.op !== 'borrar' && !ids.has(r.id)).map((r) => ({ ...r.reg, _pendiente: true }))] };
      setDatos((prev) => { const otros = (prev?.registros || []).filter((r) => r.fecha < moverDia(f, -6) || r.fecha > f); const n = { ...x, registros: [...otros, ...x.registros] }; poner(kCache, { ...n, registros: n.registros.filter((r) => diasEntre(r.fecha, hoy()) <= 14) }); return n; });
      setEstado('ok');
    } catch (e) { setEstado(leer(kCache) ? 'sinred' : 'error'); if (!leer(kCache)) avisar(e.message, 'error'); }
  }, [store, token, kCache, kCola, avisar]);
  const vaciarCola = useCallback(async () => {
    const pend = leer(kCola) || []; if (!pend.length) return; const quedan = [];
    for (const p of pend) { try { if (p.op === 'borrar') await store.nutri.atletaBorrar(token, p.id); else await store.nutri.atletaGuardar(token, p.reg); } catch { quedan.push(p); } }
    poner(kCola, quedan.length ? quedan : null); setCola(quedan);
  }, [store, token, kCola]);
  useEffect(() => { vaciarCola().then(() => cargar(fecha)); }, [fecha]); // eslint-disable-line
  useEffect(() => { const f = () => vaciarCola().then(() => cargar(fecha)); addEventListener('online', f); return () => removeEventListener('online', f); }, [vaciarCola, cargar, fecha]);

  async function guardar(r) {
    if (vista === 'coach') { avisar('Vista previa: no se guarda'); return; }
    const { _pendiente, ...reg } = r;
    setDatos((d) => ({ ...d, registros: [...(d?.registros || []).filter((x) => x.id !== reg.id), reg] }));
    try { await store.nutri.atletaGuardar(token, reg); }
    catch (e) {
      if (/fecha|nutrientes|tipo|ajeno|enlace/i.test(e.message)) { setDatos((d) => ({ ...d, registros: d.registros.filter((x) => x.id !== reg.id) })); throw e; }
      const c = [...(leer(kCola) || []).filter((x) => x.id !== reg.id), { op: 'guardar', id: reg.id, reg }]; poner(kCola, c); setCola(c);
      setDatos((d) => ({ ...d, registros: d.registros.map((x) => (x.id === reg.id ? { ...x, _pendiente: true } : x)) }));
    }
  }
  async function borrar(id) {
    if (vista === 'coach') { avisar('Vista previa: no se guarda'); return; }
    setDatos((d) => ({ ...d, registros: d.registros.filter((x) => x.id !== id) }));
    const enCola = (leer(kCola) || []).find((x) => x.id === id && x.op === 'guardar');
    if (enCola) { const c = (leer(kCola) || []).filter((x) => x.id !== id); poner(kCola, c.length ? c : null); setCola(c); return; }
    try { await store.nutri.atletaBorrar(token, id); } catch { const c = [...(leer(kCola) || []), { op: 'borrar', id }]; poner(kCola, c); setCola(c); }
  }
  return (
    <div className="pantalla">
      <Barra volver={{ fn: () => ir(), texto: 'Inicio' }} titulo="Alimentación" />
      {!datos && estado === 'cargando' && <p className="muted" style={{ marginTop: 20 }}>Cargando tu plan…</p>}
      {!datos && estado === 'error' && <div className="vacio" style={{ marginTop: 20 }}><b>Sin conexión</b>Conéctate un momento para cargar tu plan de alimentación.<button className="btn oro" style={{ marginTop: 12 }} onClick={() => cargar(fecha)}>Reintentar</button></div>}
      {datos && <>
        {!datos.plan && !Object.keys(datos.objetivos || {}).length && <p className="aviso"><span>Tu coach todavía no carga tus objetivos. Igual puedes anotar lo que comes y él lo ve.</span></p>}
        <Diario datos={datos} fecha={fecha} setFecha={setFecha} nutri={store.nutri} token={token} onGuardar={guardar} onBorrar={borrar} pendientes={cola.length} />
        {estado === 'sinred' && <p className="pill" style={{ marginTop: 10 }}>Sin conexión · mostrando lo último guardado</p>}
      </>}
    </div>
  );
}
