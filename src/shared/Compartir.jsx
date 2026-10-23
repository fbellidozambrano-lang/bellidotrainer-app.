import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Ico, useAviso } from '../ui/kit.jsx';
import { lineasCompartir } from '../lib/compartir.js';
import logoTeam from '../assets/logo-team.png';

// Tarjeta para compartir el entreno (estilo Strava): nombre de la sesión, la mejor serie de cada
// ejercicio y el logo, en letras sin cajas ni fondo. El bloque se mueve con el dedo y se
// agranda o achica pellizcando (o con − / +).
const FORMATOS = { historia: [1080, 1920], post: [1080, 1350] };
const INICIAL = { x: 0.5, y: 0.6, k: 1 };
// tamaño inicial: el bloque ocupa ~78 % del ancho sin pasar del 60 % del alto
const kInicial = (b, [W, H]) => lim(Math.min((W * 0.78) / b.width, (H * 0.6) / b.height), KMIN, KMAX);
const KMIN = 0.25, KMAX = 2.2;
const lim = (v, a, b) => Math.min(b, Math.max(a, v));

const cargarImg = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
async function fuentes() {
  try { await Promise.all(['800 120px "Barlow Condensed"', '700 40px "Barlow Condensed"'].map((f) => document.fonts.load(f))); } catch { /* usa la del sistema */ }
}
function logoColor(logo, color) {
  const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(logo, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
const fuente = (peso, n) => `${peso} ${n}px "Barlow Condensed", "Arial Narrow", sans-serif`;
// achica el texto hasta que quepa en el ancho
function ajustar(ctx, texto, peso, tam, min, ancho) {
  let t = tam; ctx.font = fuente(peso, t);
  while (ctx.measureText(texto).width > ancho && t > min) { t -= 2; ctx.font = fuente(peso, t); }
  return t;
}

// El bloque de información en su propio lienzo transparente, recortado a su tamaño
export function dibujarBloque({ resumen, logo, color, sombra }) {
  const tinta = color === 'negro' ? '#0A0A0A' : '#FFFFFF';
  const lineas = lineasCompartir(resumen);
  const ANCHO = 960, PAD = 48;
  const m = document.createElement('canvas').getContext('2d');
  const items = lineas.map((l) => (l.k === 'sesion'
    ? { ...l, tv: ajustar(m, l.v.toUpperCase(), 800, 120, 56, ANCHO), alto: 0 }
    : { ...l, tl: ajustar(m, l.l.toUpperCase(), 700, 40, 24, ANCHO), tv: ajustar(m, l.v.toUpperCase(), 800, 88, 48, ANCHO) }));
  items.forEach((it) => { it.alto = it.k === 'sesion' ? it.tv * 0.95 : it.tl + 6 + it.tv * 0.92; });
  const GAP = 30, GAP_T = 44, GAP_L = 60;
  const logoW = 300; const logoH = logo ? logoW * (logo.naturalHeight / logo.naturalWidth) : 0;
  const alto = items.reduce((t, it, i) => t + it.alto + (i === 0 ? GAP_T : i < items.length - 1 ? GAP : 0), 0) + (logo ? GAP_L + logoH : 0);
  // ancho justo al texto más largo (o al logo), así el tamaño inicial se ve bien
  let maxW = logo ? logoW : 0;
  items.forEach((it) => { if (it.k === 'sesion') { m.font = fuente(800, it.tv); maxW = Math.max(maxW, m.measureText(it.v.toUpperCase()).width); }
    else { m.font = fuente(800, it.tv); maxW = Math.max(maxW, m.measureText(it.v.toUpperCase()).width); m.font = fuente(700, it.tl); maxW = Math.max(maxW, m.measureText(it.l.toUpperCase()).width + 4 * it.l.length); } });
  const cv = document.createElement('canvas'); cv.width = Math.ceil(Math.min(ANCHO, maxW) + PAD * 2); cv.height = Math.ceil(alto + PAD * 2);
  const ctx = cv.getContext('2d'); const cx = cv.width / 2; let y = PAD;
  if (sombra) { ctx.shadowColor = color === 'negro' ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.6)'; ctx.shadowBlur = 20; ctx.shadowOffsetY = 2; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillStyle = tinta;
  items.forEach((it, i) => {
    if (it.k === 'sesion') { ctx.font = fuente(800, it.tv); ctx.fillText(it.v.toUpperCase(), cx, y); y += it.alto + GAP_T; return; }
    ctx.font = fuente(700, it.tl); ctx.globalAlpha = 0.8; if ('letterSpacing' in ctx) ctx.letterSpacing = '4px';
    ctx.fillText(it.l.toUpperCase(), cx, y); ctx.globalAlpha = 1; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    ctx.font = fuente(800, it.tv); ctx.fillText(it.v.toUpperCase(), cx, y + it.tl + 6);
    y += it.alto + (i < items.length - 1 ? GAP : 0);
  });
  if (logo) { y += GAP_L; ctx.drawImage(logoColor(logo, tinta), cx - logoW / 2, y, logoW, logoH); }
  return cv;
}

// fondo (foto recortada al formato, o negro) en su propio lienzo, para mover el bloque sin redibujar la foto
function dibujarFondo(formato, fondo, foto) {
  const [W, H] = FORMATOS[formato]; const c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, W, H);
  if (fondo === 'foto' && foto) { const k = Math.max(W / foto.naturalWidth, H / foto.naturalHeight); const w = foto.naturalWidth * k, h = foto.naturalHeight * k; x.drawImage(foto, (W - w) / 2, (H - h) / 2, w, h); }
  return c;
}
export function componer(cv, fondoCv, bloque, { x, y, k }) {
  cv.width = fondoCv.width; cv.height = fondoCv.height;
  const ctx = cv.getContext('2d'); ctx.drawImage(fondoCv, 0, 0);
  const w = bloque.width * k, h = bloque.height * k;
  ctx.drawImage(bloque, x * cv.width - w / 2, y * cv.height - h / 2, w, h);
}

const Seg = ({ v, set, ops, etq }) => (
  <div className="comp-op"><span>{etq}</span><div className="seg">{ops.map(([k, l]) => <button key={k} type="button" className={v === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>)}</div></div>
);

export default function Compartir({ resumen, onCerrar }) {
  const avisar = useAviso();
  const cv = useRef(null); const blob = useRef(null); const capas = useRef({ fondo: null, bloque: null });
  const [logo, setLogo] = useState(null); const [foto, setFoto] = useState(null);
  const [fondo, setFondo] = useState('negro'); const [formato, setFormato] = useState('historia'); const [color, setColor] = useState('blanco');
  const [listo, setListo] = useState(false);
  const pos = useRef({ ...INICIAL }); const [, setVer] = useState(0);
  const transparente = fondo === 'transparente';

  useEffect(() => { let vivo = true; Promise.all([fuentes(), cargarImg(logoTeam)]).then(([, l]) => { if (vivo) { setLogo(l); setListo(true); } }).catch(() => vivo && setListo(true)); return () => { vivo = false; }; }, []);

  const exportar = useCallback(() => { // prepara el archivo con anticipación (el teléfono exige compartir al instante del toque)
    clearTimeout(exportar.t); blob.current = null; // un archivo viejo nunca se comparte
    exportar.t = setTimeout(() => { const c = transparente ? capas.current.bloque : cv.current; c?.toBlob((b) => { blob.current = b; }, transparente ? 'image/png' : 'image/jpeg', 0.92); }, 250);
  }, [transparente]);
  const pintar = useCallback(() => {
    const { fondo: f, bloque: b } = capas.current; if (!cv.current || !b) return;
    if (transparente) { cv.current.width = b.width; cv.current.height = b.height; const x = cv.current.getContext('2d'); x.clearRect(0, 0, b.width, b.height); x.drawImage(b, 0, 0); }
    else if (f) componer(cv.current, f, b, pos.current);
  }, [transparente]);
  useEffect(() => {
    if (!listo) return;
    const nuevo = dibujarBloque({ resumen, logo, color, sombra: fondo === 'foto' });
    if (!capas.current.bloque || !pos.current.tocado) pos.current = { ...pos.current, k: kInicial(nuevo, FORMATOS[formato]) };
    capas.current.bloque = nuevo;
    capas.current.fondo = transparente ? null : dibujarFondo(formato, fondo, foto);
    pintar(); exportar();
  }, [listo, resumen, logo, foto, fondo, formato, color, transparente, pintar, exportar]);

  // gestos: un dedo mueve, dos dedos agrandan o achican
  const dedos = useRef(new Map()); const g = useRef(null); const raf = useRef(0);
  const repintar = () => { cancelAnimationFrame(raf.current); raf.current = requestAnimationFrame(() => { pintar(); setVer((v) => v + 1); }); };
  const datosGesto = () => { const ps = [...dedos.current.values()]; if (ps.length === 1) return { cx: ps[0].x, cy: ps[0].y, d: 0 }; const [a, b] = ps; return { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) }; };
  function abajo(e) { if (transparente) return; try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* puntero sintético */ } dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); g.current = { ...datosGesto(), p: { ...pos.current } }; }
  function mover(e) {
    if (!dedos.current.has(e.pointerId) || !g.current) return;
    dedos.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const r = cv.current.getBoundingClientRect(); const a = datosGesto(); const s = g.current;
    const p = { ...s.p, x: lim(s.p.x + (a.cx - s.cx) / r.width, 0, 1), y: lim(s.p.y + (a.cy - s.cy) / r.height, 0, 1) };
    if (a.d && s.d) p.k = lim(s.p.k * (a.d / s.d), KMIN, KMAX);
    pos.current = { ...p, tocado: true }; repintar();
  }
  function arriba(e) { dedos.current.delete(e.pointerId); g.current = dedos.current.size ? { ...datosGesto(), p: { ...pos.current } } : null; if (!dedos.current.size) exportar(); }
  const tamano = (f) => { pos.current = { ...pos.current, tocado: true, k: lim(pos.current.k * f, KMIN, KMAX) }; pintar(); setVer((v) => v + 1); exportar(); };
  const centrar = () => { pos.current = { ...INICIAL, k: capas.current.bloque ? kInicial(capas.current.bloque, FORMATOS[formato]) : 1 }; pintar(); setVer((v) => v + 1); exportar(); };
  const rueda = (e) => { if (!transparente) tamano(e.deltaY < 0 ? 1.06 : 1 / 1.06); };

  async function elegirFoto(e) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { const i = await cargarImg(URL.createObjectURL(f)); setFoto(i); setFondo('foto'); }
    catch { avisar('No se pudo abrir esa foto', 'error'); }
  }
  const nombre = () => `entreno-bellidotrainer-${resumen.fecha || 'hoy'}.${transparente ? 'png' : 'jpg'}`;
  const archivo = async () => {
    const c = transparente ? capas.current.bloque : cv.current;
    const b = blob.current || await new Promise((ok) => c.toBlob(ok, transparente ? 'image/png' : 'image/jpeg', 0.92));
    return new File([b], nombre(), { type: b.type });
  };
  function guardar(f) {
    const u = URL.createObjectURL(f); const a = document.createElement('a'); a.href = u; a.download = f.name;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 5000);
  }
  async function compartir() {
    const f = await archivo();
    if (navigator.canShare && navigator.canShare({ files: [f] })) {
      try { await navigator.share({ files: [f], title: 'Mi entreno · TEAM BELLIDOTRAINER' }); return; }
      catch (e) { if (e?.name === 'AbortError') return; }
    }
    guardar(f); avisar('Imagen guardada: súbela a tus redes desde la galería');
  }

  return (
    <div className="pantalla comp">
      <div className="comp-cab"><button className="ico-b" aria-label="Volver" onClick={onCerrar}><Ico n="atras" /></button><h2>Compartir tu entreno</h2></div>
      <div className={`comp-prev ${transparente ? 'cuadros' : ''}`}>
        <canvas ref={cv} className={transparente ? '' : 'mueve'} aria-label="Vista previa: arrastra para mover, pellizca para cambiar el tamaño"
          onPointerDown={abajo} onPointerMove={mover} onPointerUp={arriba} onPointerCancel={arriba} onWheel={rueda} />
      </div>
      {!transparente && <div className="comp-tam">
        <button className="ico-b" aria-label="Achicar" onClick={() => tamano(1 / 1.12)}><b>A−</b></button>
        <span>Arrastra para mover · pellizca para el tamaño</span>
        <button className="ico-b" aria-label="Agrandar" onClick={() => tamano(1.12)}><b>A+</b></button>
        <button className="ico-b" aria-label="Centrar" onClick={centrar}><Ico n="refrescar" s={18} /></button>
      </div>}
      <div className="comp-fotos">
        <label className="btn"><Ico n="camara" s={20} />Tomar foto<input type="file" accept="image/*" capture="environment" onChange={elegirFoto} hidden /></label>
        <label className="btn"><Ico n="imagen" s={20} />Galería<input type="file" accept="image/*" onChange={elegirFoto} hidden /></label>
      </div>
      <Seg etq="Fondo" v={fondo} set={setFondo} ops={[...(foto ? [['foto', 'Tu foto']] : []), ['negro', 'Negro'], ['transparente', 'Sin fondo']]} />
      {!transparente && <Seg etq="Formato" v={formato} set={setFormato} ops={[['historia', 'Historia 9:16'], ['post', 'Post 4:5']]} />}
      <Seg etq="Letras" v={color} set={setColor} ops={[['blanco', 'Blancas'], ['negro', 'Negras']]} />
      {transparente && <p className="ayuda" style={{ margin: '4px 0 14px' }}>Sin fondo: pégala como sticker encima de tu foto o video en Instagram y ahí la mueves y cambias de tamaño.</p>}
      <div className="flotante"><div className="fila-btn">
        <button className="btn" disabled={!listo} onClick={async () => guardar(await archivo())}><Ico n="bajar" s={20} />Guardar</button>
        <button className="btn oro" disabled={!listo} onClick={compartir}><Ico n="compartir" s={20} />Compartir</button>
      </div></div>
    </div>
  );
}
