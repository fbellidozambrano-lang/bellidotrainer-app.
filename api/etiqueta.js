// Función de servidor (Vercel): lee las fotos de una etiqueta (frente y tabla nutricional) con la IA de Anthropic.
//   POST /api/etiqueta   { imagenes: [{ tipo: 'frente'|'tabla', media_type: 'image/jpeg', data: '<base64>' }], token?: '<enlace del asesorado>' }
//   Header Authorization: Bearer <sesión del coach>   (o el token del asesorado en el cuerpo)
// La clave va en Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY (sin VITE_: nunca llega al teléfono).
// Cada lectura se anota en Supabase (nutri_lectura_etiqueta) para validar quién la pide y limitar el uso diario.
// Las fotos no se guardan: se mandan a la IA y se descartan.
import fs from 'node:fs';
import path from 'node:path';
import { desdeIA, HERRAMIENTA_IA, INSTRUCCION_IA } from '../src/lib/nutricion/etiqueta.js';

const MODELO = 'claude-sonnet-5-5';
const TIPOS = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_IMG = 5 * 1024 * 1024; // base64 por imagen
const LIMITE_DIA = 60;

// URL y clave pública de Supabase: variables de Vercel o, si no están, public/config.js
export function configSupabase(env = process.env) {
  let url = env.VITE_SUPABASE_URL || env.SUPABASE_URL || ''; let key = env.VITE_SUPABASE_ANON_KEY || env.SUPABASE_ANON_KEY || '';
  if (!url || !key) {
    try {
      const t = fs.readFileSync(path.join(process.cwd(), 'public', 'config.js'), 'utf8');
      url = url || (t.match(/supabaseUrl:\s*"([^"]*)"/) || [])[1] || ''; key = key || (t.match(/supabaseAnonKey:\s*"([^"]*)"/) || [])[1] || '';
    } catch { /* sin archivo */ }
  }
  return { url: url.replace(/\/+$/, ''), key };
}

async function conTiempo(f, url, opciones, ms) {
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), ms);
  try { return await f(url, { ...opciones, signal: ctrl.signal }); } finally { clearTimeout(t); }
}

export async function leerEtiqueta(cuerpo, { f = fetch, env = process.env, autorizacion = '' } = {}) {
  const clave = env.ANTHROPIC_API_KEY;
  if (!clave) return [501, { error: 'La lectura con IA no está configurada. El teléfono lee la etiqueta por su cuenta.', sinClave: true }];
  const imgs = Array.isArray(cuerpo?.imagenes) ? cuerpo.imagenes : [];
  if (!imgs.length || imgs.length > 3) return [400, { error: 'Manda 1 a 3 fotos' }];
  for (const i of imgs) {
    if (!TIPOS.includes(i?.media_type) || typeof i?.data !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(i.data.slice(0, 200))) return [400, { error: 'Foto no válida' }];
    if (i.data.length > MAX_IMG) return [413, { error: 'La foto pesa demasiado' }];
  }
  if (!imgs.some((i) => i.tipo === 'tabla')) return [400, { error: 'Falta la foto de la tabla nutricional' }];
  // quién la pide: el coach con su sesión o el asesorado con su enlace
  const sb = configSupabase(env); if (!sb.url || !sb.key) return [500, { error: 'Falta la configuración de Supabase en el servidor' }];
  const token = typeof cuerpo.token === 'string' && cuerpo.token.length >= 16 ? cuerpo.token : null;
  const jwt = !token && /^Bearer\s+\S+/.test(autorizacion) ? autorizacion.replace(/^Bearer\s+/, '') : null;
  if (!token && !jwt) return [401, { error: 'Necesitas iniciar sesión' }];
  const lim = Number(env.ETIQUETAS_POR_DIA) > 0 ? Number(env.ETIQUETAS_POR_DIA) : LIMITE_DIA;
  const rr = await conTiempo(f, `${sb.url}/rest/v1/rpc/nutri_lectura_etiqueta`, { method: 'POST', headers: { apikey: sb.key, Authorization: `Bearer ${jwt || sb.key}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ p_token: token, p_limite: lim }) }, 10000);
  if (!rr.ok) { const d = await rr.json().catch(() => ({})); const m = String(d.message || d.error || '');
    return /limite/i.test(m) ? [429, { error: `Se llegó al límite de ${lim} lecturas en 24 horas. Escribe los datos a mano o intenta mañana.` }] : [401, { error: m && !/jwt/i.test(m) ? m : 'Tu sesión venció: vuelve a entrar' }]; }
  const control = await rr.json().catch(() => ({}));
  // la IA
  const contenido = [];
  [['frente', 'Foto del frente del envase:'], ['tabla', 'Foto de la tabla de información nutricional:'], ['otra', 'Otra foto del envase:']].forEach(([t, txt]) => imgs.filter((i) => (i.tipo || 'otra') === t).forEach((i) => {
    contenido.push({ type: 'text', text: txt }); contenido.push({ type: 'image', source: { type: 'base64', media_type: i.media_type, data: i.data } }); }));
  contenido.push({ type: 'text', text: 'Lee la etiqueta y regístrala con la herramienta.' });
  const modelo = env.ANTHROPIC_MODEL || MODELO;
  const r = await conTiempo(f, 'https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: { 'x-api-key': clave, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: modelo, max_tokens: 2500, system: INSTRUCCION_IA, tools: [HERRAMIENTA_IA], tool_choice: { type: 'tool', name: HERRAMIENTA_IA.name }, messages: [{ role: 'user', content: contenido }] }),
  }, 50000);
  if (!r.ok) {
    if (r.status === 401 || r.status === 403) return [502, { error: 'La clave de Anthropic del servidor no es válida (revisa ANTHROPIC_API_KEY en Vercel).' }];
    if (r.status === 429 || r.status === 529) return [503, { error: 'La IA está ocupada. Intenta de nuevo en un minuto.' }];
    const d = await r.json().catch(() => ({})); return [502, { error: `La IA respondió ${r.status}${d?.error?.message ? `: ${d.error.message}` : ''}` }];
  }
  const d = await r.json();
  const uso = (d.content || []).find((c) => c.type === 'tool_use' && c.name === HERRAMIENTA_IA.name);
  if (!uso) return [502, { error: 'La IA no devolvió la lectura. Intenta con otra foto.' }];
  return [200, { lectura: desdeIA(uso.input), modelo: d.model || modelo, restantes: control.restantes ?? null }];
}

async function leerCuerpo(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body);
  const partes = []; let n = 0;
  for await (const c of req) { n += c.length; if (n > 12 * 1024 * 1024) throw Object.assign(new Error('demasiado grande'), { status: 413 }); partes.push(c); }
  return JSON.parse(Buffer.concat(partes).toString('utf8') || '{}');
}

export default async function handler(req, res) {
  const enviar = (st, cuerpo) => { res.statusCode = st; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.setHeader('Cache-Control', 'no-store'); res.end(JSON.stringify(cuerpo)); };
  if (req.method !== 'POST') return enviar(405, { error: 'Usa POST' });
  try {
    const cuerpo = await leerCuerpo(req);
    const [st, r] = await leerEtiqueta(cuerpo, { autorizacion: String(req.headers?.authorization || '') });
    enviar(st, r);
  } catch (e) {
    enviar(e?.status || (e?.name === 'AbortError' ? 504 : 500), { error: e?.name === 'AbortError' ? 'La lectura tardó demasiado. Intenta con fotos más nítidas o de nuevo en un momento.' : e?.status === 413 ? 'Las fotos pesan demasiado' : `No se pudo leer la etiqueta: ${e?.message || e}` });
  }
}
