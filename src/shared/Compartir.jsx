import React, { useEffect, useRef, useState } from 'react';
import { Ico, useAviso } from '../ui/kit.jsx';
import { lineasCompartir, pieCompartir } from '../lib/compartir.js';
import logoTeam from '../assets/logo-team.png';

// Tarjeta para compartir el entreno (estilo Strava): las métricas en letras, sin cajas
// ni fondo, sobre una foto, sobre negro o transparente (para pegar como sticker).
const FORMATOS = { historia: [1080, 1920], post: [1080, 1350] };
const ORO = '#FFC400';

const cargarImg = (src) => new Promise((ok, mal) => { const i = new Image(); i.onload = () => ok(i); i.onerror = mal; i.src = src; });
async function fuentes() {
  try { await Promise.all(['800 120px "Barlow Condensed"', '700 40px "Barlow Condensed"', '600 30px "Barlow"'].map((f) => document.fonts.load(f))); } catch { /* sin fuentes: usa la del sistema */ }
}
// logo pintado del color del texto
function logoColor(logo, color) {
  const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight;
  const x = c.getContext('2d'); x.drawImage(logo, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, c.width, c.height);
  return c;
}
// texto que cabe en el ancho: achica hasta min y si no, parte en dos líneas
function ajustar(ctx, texto, peso, tam, min, ancho) {
  let t = tam; const f = (n) => `${peso} ${n}px "Barlow Condensed", "Arial Narrow", sans-serif`;
  ctx.font = f(t); while (ctx.measureText(texto).width > ancho && t > min) { t -= 4; ctx.font = f(t); }
  if (ctx.measureText(texto).width <= ancho) return { lineas: [texto], tam: t, font: f(t) };
  const pal = texto.split(' '); let a = ''; const out = [];
  pal.forEach((w) => { const n = a ? `${a} ${w}` : w; if (ctx.measureText(n).width > ancho && a) { out.push(a); a = w; } else a = n; });
  if (a) out.push(a);
  return { lineas: out.slice(0, 2), tam: t, font: f(t) };
}

// Dibuja la tarjeta y devuelve el canvas listo para exportar
export function dibujarTarjeta(cv, { resumen, logo, foto, fondo, formato, pos, color }) {
  const transparente = fondo === 'transparente';
  const [W, H0] = FORMATOS[formato] || FORMATOS.historia;
  // sobre foto o negro las letras son un poco más chicas para que se vea la foto
  const s = (W / 1080) * (transparente ? 1 : formato === 'post' ? 0.78 : 0.86);
  const ctx = cv.getContext('2d');
  const tinta = color === 'negro' ? '#0A0A0A' : '#FFFFFF';
  const lineas = lineasCompartir(resumen); const pie = pieCompartir(resumen);
  const ancho = Math.min(940 * s, W - 120);
  // medir el bloque
  ctx.font = `700 ${34 * s}px "Barlow Condensed", sans-serif`;
  const bloques = lineas.map((l, i) => {
    const m = i === 0 ? ajustar(ctx, l.v.toUpperCase(), 800, 128 * s, 64 * s, ancho) : ajustar(ctx, l.v.toUpperCase(), 800, 104 * s, 54 * s, ancho);
    return { ...l, ...m, alto: 34 * s + 10 * s + m.lineas.length * m.tam * 0.92 };
  });
  const logoW = 330 * s; const logoH = logo ? logoW * (logo.naturalHeight / logo.naturalWidth) : 0;
  const gap = 46 * s;
  const altoBloque = bloques.reduce((t, b) => t + b.alto, 0) + gap * (bloques.length - 1) + (logo ? 64 * s + logoH : 0) + (pie ? 22 * s + 30 * s : 0);
  const pad = 80 * s;
  const H = transparente ? Math.ceil(altoBloque + pad * 2) : H0;
  cv.width = W; cv.height = H;
  ctx.clearRect(0, 0, W, H);
  // fondo
  if (!transparente) {
    ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
    if (fondo === 'foto' && foto) {
      const k = Math.max(W / foto.naturalWidth, H / foto.naturalHeight); const w = foto.naturalWidth * k, h = foto.naturalHeight * k;
      ctx.drawImage(foto, (W - w) / 2, (H - h) / 2, w, h);
    }
  }
  // dónde va el bloque
  const margen = formato === 'post' ? 90 : 230;
  let y = transparente ? pad : pos === 'arriba' ? margen : pos === 'centro' ? (H - altoBloque) / 2 : H - margen - altoBloque;
  const sombra = !transparente && fondo === 'foto';
  ctx.save();
  if (sombra) { ctx.shadowColor = color === 'negro' ? 'rgba(255,255,255,.35)' : 'rgba(0,0,0,.6)'; ctx.shadowBlur = 22 * s; ctx.shadowOffsetY = 2 * s; }
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  const cx = W / 2;
  bloques.forEach((b, i) => {
    ctx.font = `700 ${34 * s}px "Barlow Condensed", sans-serif`; ctx.fillStyle = tinta; ctx.globalAlpha = 0.82;
    if ('letterSpacing' in ctx) ctx.letterSpacing = `${5 * s}px`;
    ctx.fillText(b.l.toUpperCase(), cx, y); ctx.globalAlpha = 1;
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    let yy = y + 34 * s + 10 * s;
    ctx.font = b.font; ctx.fillStyle = b.oro && color !== 'negro' ? ORO : tinta;
    b.lineas.forEach((t) => { ctx.fillText(t, cx, yy); yy += b.tam * 0.92; });
    y += b.alto + (i < bloques.length - 1 ? gap : 0);
  });
  if (logo) { y += 64 * s; ctx.drawImage(logoColor(logo, tinta), cx - logoW / 2, y, logoW, logoH); y += logoH; }
  if (pie) { y += 22 * s; ctx.font = `600 ${30 * s}px "Barlow", sans-serif`; ctx.fillStyle = tinta; ctx.globalAlpha = 0.75; ctx.fillText(pie, cx, y); ctx.globalAlpha = 1; }
  ctx.restore();
  return cv;
}

const Seg = ({ v, set, ops, etq }) => (
  <div className="comp-op"><span>{etq}</span><div className="seg">{ops.map(([k, l]) => <button key={k} type="button" className={v === k ? 'on' : ''} onClick={() => set(k)}>{l}</button>)}</div></div>
);

export default function Compartir({ resumen, onCerrar }) {
  const avisar = useAviso();
  const cv = useRef(null); const blob = useRef(null);
  const [logo, setLogo] = useState(null); const [foto, setFoto] = useState(null);
  const [fondo, setFondo] = useState('negro'); const [formato, setFormato] = useState('historia');
  const [pos, setPos] = useState('abajo'); const [color, setColor] = useState('blanco');
  const [listo, setListo] = useState(false);
  useEffect(() => { let vivo = true; Promise.all([fuentes(), cargarImg(logoTeam)]).then(([, l]) => { if (vivo) { setLogo(l); setListo(true); } }).catch(() => vivo && setListo(true)); return () => { vivo = false; }; }, []);
  useEffect(() => {
    if (!listo || !cv.current) return;
    dibujarTarjeta(cv.current, { resumen, logo, foto, fondo, formato, pos, color });
    blob.current = null;
    const tipo = fondo === 'transparente' ? 'image/png' : 'image/jpeg';
    cv.current.toBlob((b) => { blob.current = b; }, tipo, 0.92);
  }, [listo, resumen, logo, foto, fondo, formato, pos, color]);

  async function elegirFoto(e) {
    const f = e.target.files?.[0]; e.target.value = ''; if (!f) return;
    try { const u = URL.createObjectURL(f); const i = await cargarImg(u); setFoto(i); setFondo('foto'); }
    catch { avisar('No se pudo abrir esa foto', 'error'); }
  }
  const nombre = () => `entreno-bellidotrainer-${resumen.fecha || 'hoy'}.${fondo === 'transparente' ? 'png' : 'jpg'}`;
  const archivo = async () => { const b = blob.current || await new Promise((ok) => cv.current.toBlob(ok, fondo === 'transparente' ? 'image/png' : 'image/jpeg', 0.92)); return new File([b], nombre(), { type: b.type }); };
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
      <div className={`comp-prev ${fondo === 'transparente' ? 'cuadros' : ''}`}><canvas ref={cv} aria-label="Vista previa de la imagen para compartir" /></div>
      <div className="comp-fotos">
        <label className="btn"><Ico n="camara" s={20} />Tomar foto<input type="file" accept="image/*" capture="environment" onChange={elegirFoto} hidden /></label>
        <label className="btn"><Ico n="imagen" s={20} />Galería<input type="file" accept="image/*" onChange={elegirFoto} hidden /></label>
      </div>
      <Seg etq="Fondo" v={fondo} set={setFondo} ops={[...(foto ? [['foto', 'Tu foto']] : []), ['negro', 'Negro'], ['transparente', 'Sin fondo']]} />
      <Seg etq="Formato" v={formato} set={setFormato} ops={[['historia', 'Historia 9:16'], ['post', 'Post 4:5']]} />
      {fondo !== 'transparente' && <Seg etq="Texto" v={pos} set={setPos} ops={[['arriba', 'Arriba'], ['centro', 'Centro'], ['abajo', 'Abajo']]} />}
      <Seg etq="Letras" v={color} set={setColor} ops={[['blanco', 'Blancas'], ['negro', 'Negras']]} />
      <p className="ayuda" style={{ margin: '4px 0 14px' }}>{fondo === 'transparente' ? 'Sin fondo: pégala como sticker encima de tu foto o video en Instagram.' : 'Mejora de fuerza: tu 1RM estimado de hoy frente a la última vez que hiciste cada ejercicio.'}</p>
      <div className="flotante"><div className="fila-btn">
        <button className="btn" disabled={!listo} onClick={async () => guardar(await archivo())}><Ico n="bajar" s={20} />Guardar</button>
        <button className="btn oro" disabled={!listo} onClick={compartir}><Ico n="compartir" s={20} />Compartir</button>
      </div></div>
    </div>
  );
}
