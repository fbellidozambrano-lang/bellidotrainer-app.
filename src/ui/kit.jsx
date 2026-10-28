import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { iniciales } from '../lib/util.js';

// ---------- íconos (trazo 1.8) ----------
const P = {
  atras: 'M15 5l-7 7 7 7', mas: 'M12 5v14M5 12h14', buscar: 'M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zm9 3l-4.3-4.3',
  ajustes: 'M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 13.5l1.6 1.2-2 3.4-1.9-.7a7.6 7.6 0 0 1-2.2 1.3l-.3 2h-4l-.3-2a7.6 7.6 0 0 1-2.2-1.3l-1.9.7-2-3.4 1.6-1.2a7.4 7.4 0 0 1 0-3l-1.6-1.2 2-3.4 1.9.7a7.6 7.6 0 0 1 2.2-1.3l.3-2h4l.3 2a7.6 7.6 0 0 1 2.2 1.3l1.9-.7 2 3.4-1.6 1.2a7.4 7.4 0 0 1 0 3z',
  pesa: 'M6.5 8v8M3.5 10v4M17.5 8v8M20.5 10v4M6.5 12h11', grafica: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  enlace: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  copiar: 'M9 9h10v12H9zM5 15V3h10', pegar: 'M9 4h6v3H9zM8 5H5v16h14V5h-3M9 12h6M9 16h4', ojo: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  basura: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13', lapiz: 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4', check: 'M5 12.5l4.5 4.5L19 7.5', cerrar: 'M6 6l12 12M18 6L6 18',
  arriba: 'M12 19V5M6 11l6-6 6 6', abajo: 'M12 5v14M6 13l6 6 6-6', play: 'M8 5v14l11-7z', reloj: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM12 9v4l2.5 2.5M9 2h6',
  bajar: 'M12 4v12M6 10l6 6 6-6M4 20h16', subir: 'M12 20V8M6 14l6-6 6 6M4 4h16', salir: 'M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10', nube: 'M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 8.5 4.8 4.8 0 0 1 17.5 18z',
  tel: 'M8 2h8a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1zM11 18h2', seleccion: 'M4 6h2M4 12h2M4 18h2M9 6h11M9 12h11M9 18h11', mas3: 'M5 12h.01M12 12h.01M19 12h.01',
  chev: 'M9 6l6 6-6 6', fuego: 'M12 21c4 0 7-2.7 7-6.8 0-4.4-4-6.4-4-10.2-2.6 1.6-4 4-4 6.5C10 9 9 7.8 9 6.5 6.6 8.3 5 10.9 5 14.2 5 18.3 8 21 12 21z', usuario: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1.2-4 4.3-6 8-6s6.8 2 8 6',
  comida: 'M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10M16 3c-2 0-3 2.5-3 6s1 4 3 4v8M16 3v18', casa: 'M3 11l9-7 9 7M5 9.5V20h5v-6h4v6h5V9.5',
  libro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 5v16M8 7h7', plantilla: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM16.5 13v7M13 16.5h7',
  candado: 'M6 11h12v10H6zM8 11V7.5a4 4 0 0 1 8 0V11M12 15v2', llave: 'M14 10a4 4 0 1 0-3.5 4L4 20.5V22h3v-2h2v-2h2l1.5-1.5A4 4 0 0 0 14 10z',
  refrescar: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7', tendencia: 'M3 17l6-6 4 4 8-8M15 7h6v6', agua: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z', duplicar: 'M8 8h12v12H8zM4 16V4h12',
  camara: 'M4 8h3.5l2-3h5l2 3H20v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z', imagen: 'M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M15.5 9h.01', compartir: 'M12 15V3M7.5 7.5 12 3l4.5 4.5M5 12v8h14v-8',
};
export function Ico({ n, s = 22, w = 1.8, ...r }) {
  if (n === 'wa') return <svg width={s} height={s} viewBox="0 0 24 24" fill="currentColor" {...r}><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.4.1-.7.3-.2.3-.9.9-.9 2.2s.9 2.5 1 2.7c.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z" /></svg>;
  return <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...r}><path d={P[n] || ''} /></svg>;
}

// ---------- navegación por #ruta (el botón atrás del teléfono funciona) ----------
export function useRuta() {
  const leer = () => (location.hash.replace(/^#\/?/, '') || '').split('/').filter(Boolean).map(decodeURIComponent);
  const [r, setR] = useState(leer);
  useEffect(() => { const f = () => { setR(leer()); window.scrollTo(0, 0); }; addEventListener('hashchange', f); return () => removeEventListener('hashchange', f); }, []);
  return r;
}
export const ir = (...partes) => { location.hash = '#/' + partes.filter((x) => x != null && x !== '').map(encodeURIComponent).join('/'); };
export const atras = (...padre) => { if (history.length > 1 && sessionStorage.getItem('bt:nav')) history.back(); else ir(...padre); };
if (typeof window !== 'undefined') addEventListener('hashchange', () => sessionStorage.setItem('bt:nav', '1'));

// ---------- avisos ----------
const Ctx = createContext(() => {});
export function AvisosProvider({ children }) {
  const [t, setT] = useState(null); const tm = useRef();
  const avisar = useCallback((texto, tipo = '') => { clearTimeout(tm.current); setT({ texto, tipo }); tm.current = setTimeout(() => setT(null), tipo === 'error' ? 4200 : 2600); }, []);
  return <Ctx.Provider value={avisar}>{children}{t && <div className={`toast ${t.tipo}`} role="status">{t.texto}</div>}</Ctx.Provider>;
}
export const useAviso = () => useContext(Ctx);

// ---------- hoja inferior ----------
export function Hoja({ titulo, onCerrar, children, acciones, ancha }) {
  useEffect(() => { const k = (e) => e.key === 'Escape' && onCerrar?.(); addEventListener('keydown', k); const o = document.body.style.overflow; document.body.style.overflow = 'hidden'; return () => { removeEventListener('keydown', k); document.body.style.overflow = o; }; }, [onCerrar]);
  return (
    <div className="velo" onMouseDown={(e) => e.target === e.currentTarget && onCerrar?.()}>
      <div className="hoja" role="dialog" aria-label={typeof titulo === 'string' ? titulo : undefined} style={ancha ? { maxWidth: 720 } : null}>
        <div className="hoja-asa" />
        {titulo && <div className="hoja-cab"><h3>{titulo}</h3><button className="ico-b" onClick={onCerrar} aria-label="Cerrar"><Ico n="cerrar" /></button></div>}
        {children}
        {acciones && <div className="hoja-acc">{acciones}</div>}
      </div>
    </div>
  );
}

export function Confirmar({ titulo, texto, si = 'Confirmar', peligro, onSi, onNo }) {
  return <Hoja titulo={titulo} onCerrar={onNo} acciones={<><button className="btn" onClick={onNo}>Cancelar</button><button className={`btn ${peligro ? 'peligro' : 'oro'}`} onClick={onSi}>{si}</button></>}>
    <p className="muted" style={{ fontSize: 16 }}>{texto}</p></Hoja>;
}

// ---------- piezas ----------
export const Campo = ({ l, ayuda, children }) => <label className="campo"><span>{l}</span>{children}{ayuda && <p className="ayuda" style={{ margin: '6px 0 0' }}>{ayuda}</p>}</label>;
export const Placa = ({ nombre, oro }) => <div className={`placa ${oro ? 'oro' : ''}`}>{iniciales(nombre)}</div>;
export const Semana = ({ n = 0, total = 7, chica }) => <div className={`semana ${chica ? 'chica' : ''}`} aria-label={`${n} de ${total}`}>{Array.from({ length: total }, (_, i) => <i key={i} className={i < n ? 'on' : ''} />)}</div>;
export const Interruptor = ({ on, onChange, label, ayuda }) => (
  <button type="button" className="interr" onClick={() => onChange(!on)} role="switch" aria-checked={on} style={{ width: '100%', textAlign: 'left' }}>
    <span><span style={{ display: 'block', fontWeight: 600 }}>{label}</span>{ayuda && <span className="etq">{ayuda}</span>}</span><span className={`sw ${on ? 'on' : ''}`} />
  </button>
);
export function Barra({ volver, titulo, sub, derecha, borde = true }) {
  return <header className={`barra ${borde ? 'borde' : ''}`}>
    {volver && <button className="volver" onClick={volver.fn}><Ico n="atras" s={24} />{volver.texto}</button>}
    <div className="barra-t">{titulo}{sub && <small>{sub}</small>}</div>
    {derecha}
  </header>;
}

// archivo → texto
export const leerArchivo = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsText(f); });
export function descargar(nombre, texto, tipo = 'application/json') {
  const b = new Blob([texto], { type: tipo }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
// copiar que funciona también en iPhone
export async function copiarTexto(t) {
  try { if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(t); return true; } } catch {}
  const x = document.createElement('textarea'); x.value = t; x.setAttribute('readonly', ''); x.style.cssText = 'position:fixed;top:0;opacity:0'; document.body.appendChild(x); x.select(); x.setSelectionRange(0, t.length);
  let ok = false; try { ok = document.execCommand('copy'); } catch {} x.remove(); return ok;
}
