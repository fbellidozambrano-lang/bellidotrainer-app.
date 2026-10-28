// Capa de datos: Supabase (en línea) o modo local (solo este teléfono).
// Las dos exponen exactamente las mismas funciones.
import { createClient } from '@supabase/supabase-js';
import { tokenNuevo, uuid } from '../lib/util.js';
import { crearNutriLocal } from './nutriLocal.js';

// ---------- configuración ----------
export function leerConfig() {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  const w = (typeof window !== 'undefined' && window.BT_CONFIG) || {};
  const g = { supabaseUrl: w.supabaseUrl || env.VITE_SUPABASE_URL || '', supabaseAnonKey: w.supabaseAnonKey || env.VITE_SUPABASE_ANON_KEY || '' };
  let l = {}; try { l = JSON.parse(localStorage.getItem('bt:cfg') || '{}'); } catch {}
  const url = String(g.supabaseUrl || l.supabaseUrl || '').trim().replace(/\/+$/, '');
  const key = String(g.supabaseAnonKey || l.supabaseAnonKey || '').trim();
  return { url, key, origen: g.supabaseUrl ? 'archivo' : l.supabaseUrl ? 'telefono' : null };
}
export function guardarConfigLocal(url, key) {
  try { if (!url) localStorage.removeItem('bt:cfg'); else localStorage.setItem('bt:cfg', JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })); } catch {}
}

// ---------- conversión app ⇄ tabla ----------
// sin_codigo solo viaja si se tocó (así funciona aunque la base aún no tenga la columna)
const aFilaA = (a) => ({ id: a.id, nombre: a.nombre, objetivo: a.objetivo || '', nivel: a.nivel || '', notas: a.notas || '', datos: a.datos || {}, token: a.token, archivado: !!a.archivado, vence: a.vence || null, ...('sinCodigo' in a ? { sin_codigo: !!a.sinCodigo } : {}) });
const deFilaA = (r) => ({ id: r.id, nombre: r.nombre, objetivo: r.objetivo, nivel: r.nivel, notas: r.notas, datos: r.datos || {}, token: r.token, archivado: r.archivado, vence: r.vence ? String(r.vence).slice(0, 10) : null, creado: r.creado, ...(r.sin_codigo !== undefined ? { sinCodigo: !!r.sin_codigo } : {}) });
const aFilaB = (b) => ({ id: b.id, nombre: b.nombre, grupo: b.grupo || '', tipo: b.tipo || 'reps', video: b.video || '', tecnica: b.tecnica || '', alias: b.alias || [], base: b.base || {} });
const deFilaB = (r) => ({ id: r.id, nombre: r.nombre, grupo: r.grupo, tipo: r.tipo, video: r.video, tecnica: r.tecnica, alias: r.alias || [], base: r.base || {}, creado: r.creado });
const aFilaT = (t) => ({ id: t.id, nombre: t.nombre || '', nota: t.nota || '', orden: t.orden || 0, dias: t.dias || [] });
const deFilaT = (r) => ({ id: r.id, nombre: r.nombre, nota: r.nota, orden: r.orden, dias: r.dias || [], creado: r.creado, actualizado: r.actualizado });
const aFilaC = (c) => ({ id: c.id, asesorado_id: c.asesoradoId, fecha: c.fecha, datos: c.datos || {}, archivo: c.archivo || '' });
const deFilaC = (r, aid) => ({ id: r.id, asesoradoId: r.asesorado_id || aid, fecha: String(r.fecha).slice(0, 10), datos: r.datos || {}, archivo: r.archivo || '', creado: r.creado });
const dePermiso = (r) => (r ? { id: r.id, asesoradoId: r.asesorado_id || r.asesoradoId, codigo: r.codigo, creado: r.creado, expira: r.expira, abierto: r.abierto || null, usado: r.usado || null, intentos: r.intentos || 0, progreso: r.progreso || null, progresoAt: r.progreso_at || r.progresoAt || null } : null);
const aFilaP = (p) => ({ id: p.id, asesorado_id: p.asesoradoId, nombre: p.nombre || '', nota: p.nota || '', orden: p.orden || 0, visible: p.visible !== false, dias: p.dias || [] });
const deFilaP = (r) => ({ id: r.id, asesoradoId: r.asesorado_id, nombre: r.nombre, nota: r.nota, orden: r.orden, visible: r.visible, dias: r.dias || [], creado: r.creado, actualizado: r.actualizado });
const aFilaS = (s) => ({ id: s.id, asesorado_id: s.asesoradoId, programa_id: s.programaId || null, programa_nombre: s.programaNombre || '', dia: s.dia || '', fecha: s.fecha, minutos: s.minutos ?? null, series: s.series || [], notas: s.notas || {}, origen: s.origen || 'coach' });
export const deFilaS = (r, asesoradoId) => ({ id: r.id, asesoradoId: r.asesorado_id || asesoradoId, programaId: r.programa_id, programaNombre: r.programa_nombre, dia: r.dia, fecha: String(r.fecha).slice(0, 10), minutos: r.minutos, series: r.series || [], notas: r.notas || {}, origen: r.origen, creado: r.creado });
const atletaDe = (d) => (d ? { asesorado: { ...d.asesorado, vence: d.asesorado.vence ? String(d.asesorado.vence).slice(0, 10) : null }, acceso: d.acceso || { abierto: true }, controles: (d.controles || []).map((c) => deFilaC(c, d.asesorado.id)), programas: (d.programas || []).map((p) => ({ ...p, asesoradoId: d.asesorado.id })), sesiones: (d.sesiones || []).map((s) => deFilaS(s, d.asesorado.id)) } : null);

// Ninguna llamada al servidor puede quedarse esperando para siempre: con señal mala el teléfono
// deja peticiones colgadas y la app (y el candado de sesión de Supabase) se quedaban pegados.
export const LIMITE_MS = 20000;
export function fetchConLimite(input, init = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), LIMITE_MS);
  const ext = init.signal;
  if (ext) { if (ext.aborted) ctrl.abort(); else ext.addEventListener('abort', () => ctrl.abort(), { once: true }); }
  return fetch(input, { ...init, signal: ctrl.signal }).finally(() => clearTimeout(t));
}
// espera una promesa como máximo ms; si no llega, usa el valor de respaldo
export const conLimite = (prom, ms, respaldo) => new Promise((ok, mal) => {
  const t = setTimeout(() => (respaldo !== undefined ? ok(respaldo()) : mal(new Error('La conexión está muy lenta y no respondió. Intenta de nuevo.'))), ms);
  prom.then((v) => { clearTimeout(t); ok(v); }, (e) => { clearTimeout(t); mal(e); });
});
const sesionGuardada = () => { try { const j = JSON.parse(localStorage.getItem('bt:auth') || 'null'); return j?.user || j?.currentSession?.user || null; } catch { return null; } };

const trozos = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
function traducirError(e) {
  const m = String(e?.message || e || '');
  if (e?.name === 'AbortError' || /aborted|AbortError|timeout/i.test(m)) return new Error('La conexión está muy lenta y no respondió. Intenta de nuevo.');
  // columna nueva que aún no existe en Supabase (ej. "Could not find the 'sin_codigo' column of 'asesorados' in the schema cache")
  if (/sin_codigo/i.test(m)) return new Error('Para dejarlo sin código falta actualizar tu base: en Supabase → SQL Editor pega el archivo schema.sql completo y toca Run. Tus datos no se tocan.');
  if (/Could not find the '.*' column|column .* does not exist/i.test(m)) return new Error('Falta actualizar tu base: en Supabase → SQL Editor pega el archivo schema.sql completo y toca Run. Tus datos no se tocan.');
  if (/Failed to fetch|NetworkError|Load failed|network/i.test(m)) return new Error('Sin conexión. Revisa tu señal e intenta de nuevo.');
  if (/Invalid login credentials/i.test(m)) return new Error('Correo o contraseña incorrectos.');
  if (/Email not confirmed/i.test(m)) return new Error('Falta confirmar tu correo: abre el enlace que te mandó Supabase.');
  if (/User already registered/i.test(m)) return new Error('Ese correo ya tiene cuenta. Entra con tu contraseña.');
  if (/Password should be/i.test(m)) return new Error('La contraseña debe tener al menos 6 caracteres.');
  if (/signups not allowed|Signups not allowed/i.test(m)) return new Error('El registro está cerrado. Crea tu usuario en Supabase → Authentication.');
  if (/relation .* does not exist|Could not find the table|schema cache/i.test(m)) return new Error('Falta crear las tablas: corre el archivo schema.sql en Supabase → SQL Editor.');
  if (/JWT|apikey|Invalid API key/i.test(m)) return new Error('La clave de Supabase no es válida. Revisa config.js.');
  return new Error(m || 'Algo falló al hablar con el servidor.');
}

// =====================================================================
//  En línea
// =====================================================================
export function crearStoreNube(cfg, clienteFalso) {
  const sb = clienteFalso || createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bt:auth' }, global: { fetch: fetchConLimite } });
  const run = async (q) => { const { data, error } = await q; if (error) throw traducirError(error); return data; };
  async function todo(tabla, orden) {
    const out = []; const N = 1000;
    for (let i = 0; ; i += N) {
      const d = await run(sb.from(tabla).select('*').order(orden, { ascending: true }).order('id', { ascending: true }).range(i, i + N - 1));
      out.push(...d); if (d.length < N) break;
    }
    return out;
  }
  return {
    modo: 'nube', url: cfg.url,
    auth: {
      // si renovar la sesión se cuelga (señal mala), entra con la sesión guardada en vez de quedarse en el logo
      async usuario() { try { return await conLimite(sb.auth.getSession().then(({ data }) => data?.session?.user || null), 8000, sesionGuardada); } catch { return sesionGuardada(); } },
      async entrar(email, pass) { try { const { data, error } = await sb.auth.signInWithPassword({ email, password: pass }); if (error) throw error; return data.user; } catch (e) { throw traducirError(e); } },
      async registrar(email, pass) { try { const { data, error } = await sb.auth.signUp({ email, password: pass }); if (error) throw error; return data.user && data.session ? data.user : null; } catch (e) { throw traducirError(e); } },
      async salir() { await sb.auth.signOut(); },
      escuchar(cb) { const { data } = sb.auth.onAuthStateChange((_e, s) => cb(s?.user || null)); return () => data.subscription.unsubscribe(); },
    },
    async cargarTodo() {
      // biblioteca y plantillas: si aún no se corrió el schema.sql nuevo, la app sigue funcionando
      const opc = (t, o) => todo(t, o).catch(() => null);
      const [a, p, s, b, t, c] = await Promise.all([todo('asesorados', 'creado'), todo('programas', 'orden'), todo('sesiones', 'fecha'), opc('biblioteca', 'nombre'), opc('plantillas', 'orden'), opc('controles', 'fecha')]);
      return { asesorados: a.map(deFilaA), programas: p.map(deFilaP), sesiones: s.map((r) => deFilaS(r)), biblioteca: (b || []).map(deFilaB), plantillas: (t || []).map(deFilaT), controles: (c || []).map((r) => deFilaC(r)), faltaTablas: !b || !t || !c };
    },
    async sesionesDesde(desde) {
      const d = await run(sb.from('sesiones').select('*').gte('creado', desde).order('creado', { ascending: true }));
      return d.map((r) => deFilaS(r));
    },
    async guardarAsesorado(a) { const f = aFilaA({ ...a, token: a.token || tokenNuevo() }); const d = await run(sb.from('asesorados').upsert(f).select()); return deFilaA(d[0]); },
    async borrarAsesorado(id) { await run(sb.from('asesorados').delete().eq('id', id)); },
    async guardarPrograma(p) { const d = await run(sb.from('programas').upsert(aFilaP(p)).select()); return deFilaP(d[0]); },
    async guardarProgramas(ps) { if (!ps.length) return []; const d = await run(sb.from('programas').upsert(ps.map(aFilaP)).select()); return d.map(deFilaP); },
    async borrarPrograma(id) { await run(sb.from('programas').delete().eq('id', id)); },
    async guardarSesion(s) { const d = await run(sb.from('sesiones').upsert(aFilaS(s)).select()); return deFilaS(d[0]); },
    async guardarSesiones(ss) { if (!ss.length) return []; const out = []; for (const c of trozos(ss.map(aFilaS), 300)) out.push(...(await run(sb.from('sesiones').upsert(c).select()))); return out.map((r) => deFilaS(r)); },
    async borrarSesion(id) { await run(sb.from('sesiones').delete().eq('id', id)); },
    async guardarControl(c) { const d = await run(sb.from('controles').upsert(aFilaC(c)).select()); return deFilaC(d[0]); },
    async borrarControl(id) { await run(sb.from('controles').delete().eq('id', id)); },
    async guardarEjercicios(bs) { if (!bs.length) return []; const out = []; for (const c of trozos(bs.map(aFilaB), 200)) out.push(...(await run(sb.from('biblioteca').upsert(c).select()))); return out.map(deFilaB); },
    async borrarEjercicio(id) { await run(sb.from('biblioteca').delete().eq('id', id)); },
    async guardarPlantillas(ts) { if (!ts.length) return []; const d = await run(sb.from('plantillas').upsert(ts.map(aFilaT)).select()); return d.map(deFilaT); },
    async borrarPlantilla(id) { await run(sb.from('plantillas').delete().eq('id', id)); },
    async importar({ asesorados = [], programas = [], sesiones = [], biblioteca = [], plantillas = [], controles = [] }, progreso = () => {}) {
      let hecho = 0; const total = asesorados.length + programas.length + sesiones.length + biblioteca.length + plantillas.length || 1;
      if (biblioteca.length) for (const c of trozos(biblioteca.map(aFilaB), 200)) { await run(sb.from('biblioteca').upsert(c)); progreso((hecho += c.length) / total); }
      if (plantillas.length) for (const c of trozos(plantillas.map(aFilaT), 100)) { await run(sb.from('plantillas').upsert(c)); progreso((hecho += c.length) / total); }
      for (const c of trozos(asesorados.map((a) => aFilaA({ ...a, token: a.token || tokenNuevo() })), 200)) { await run(sb.from('asesorados').upsert(c)); progreso((hecho += c.length) / total); }
      for (const c of trozos(programas.map(aFilaP), 100)) { await run(sb.from('programas').upsert(c)); progreso((hecho += c.length) / total); }
      for (const c of trozos(sesiones.map(aFilaS), 300)) { await run(sb.from('sesiones').upsert(c)); progreso((hecho += c.length) / total); }
      if (controles.length) for (const c of trozos(controles.map(aFilaC), 200)) await run(sb.from('controles').upsert(c));
    },
    async atletaCargar(token) { const d = await run(sb.rpc('atleta_cargar', { p_token: token })); return atletaDe(d); },
    async atletaGuardarSesion(token, s) { const f = aFilaS(s); delete f.asesorado_id; delete f.origen; f.permiso = s.permiso || null; await run(sb.rpc('atleta_guardar_sesion', { p_token: token, p_sesion: f })); return true; },
    async atletaGuardarCasa(token, s) { const f = aFilaS(s); delete f.asesorado_id; delete f.origen; await run(sb.rpc('atleta_guardar_casa', { p_token: token, p_sesion: f })); return true; },
    async atletaAbrir(token, codigo) { return (await run(sb.rpc('atleta_abrir', { p_token: token, p_codigo: codigo }))) || { ok: false, motivo: 'enlace' }; },
    async nuevoCodigo(asesoradoId) { return dePermiso(await run(sb.rpc('nuevo_codigo', { p_asesorado: asesoradoId }))); },
    async atletaProgreso(token, p) { return !!(await run(sb.rpc('atleta_progreso', { p_token: token, p_progreso: p }))); },
    // quién tiene la rutina abierta (últimas 4 h) y quién terminó hoy
    async entrenandoAhora() { const desde = new Date(Date.now() - 16 * 36e5).toISOString(); const d = await run(sb.from('permisos').select('*').gte('abierto', desde).order('abierto', { ascending: false })); return d.map(dePermiso); },
    async codigoActual(asesoradoId) { const d = await run(sb.from('permisos').select('*').eq('asesorado_id', asesoradoId).order('creado', { ascending: false }).limit(1)); return dePermiso(d[0]); },
    // ---------- alimentación ----------
    nutri: {
      estado: () => run(sb.rpc('nutri_estado')),
      buscar: (q, filtros = {}, token = null) => run(sb.rpc('nutri_buscar', { p_q: q, p_filtros: filtros, p_token: token, p_limite: 40 })),
      async fichas(ids, token = null) { const u = [...new Set(ids.filter(Boolean))]; if (!u.length) return {}; return (await run(sb.rpc('nutri_fichas', { p_ids: u, p_token: token }))) || {}; },
      ficha: (id, token = null) => run(sb.rpc('nutri_ficha', { p_id: id, p_token: token })),
      guardarAlimento: (a, token = null) => run(sb.rpc('nutri_guardar_alimento', { p: a, p_token: token })),
      importacionIniciar: (p) => run(sb.rpc('nutri_importacion_iniciar', { p })),
      importarLote: (id, parte, lote, forzar = false) => run(sb.rpc('nutri_importar_lote', { p_importacion: id, p_parte: parte, p_lote: lote, p_forzar: forzar })),
      importacionCerrar: (id, estado = null) => run(sb.rpc('nutri_importacion_cerrar', { p_importacion: id, p_estado: estado })),
      async plan(asesoradoId) { const d = await run(sb.from('nutri_planes').select('*').eq('asesorado_id', asesoradoId)); return d[0] ? { objetivos: d[0].objetivos || {}, plan: d[0].plan || null, actualizado: d[0].actualizado } : { objetivos: {}, plan: null }; },
      async guardarPlan(asesoradoId, { objetivos, plan }) { await run(sb.from('nutri_planes').upsert({ id: asesoradoId, asesorado_id: asesoradoId, objetivos: objetivos || {}, plan: plan ?? null }).select()); return true; },
      recetas: (asesoradoId) => run(sb.from('nutri_recetas').select('*').eq('asesorado_id', asesoradoId).order('nombre', { ascending: true })),
      async guardarReceta(r) { const d = await run(sb.from('nutri_recetas').upsert({ id: r.id, asesorado_id: r.asesorado_id || null, nombre: r.nombre, porciones: r.porciones || 1, comida: r.comida || null, ingredientes: r.ingredientes || [], nota: r.nota || '' }).select()); return d[0]; },
      borrarReceta: (id) => run(sb.from('nutri_recetas').delete().eq('id', id)),
      registros: (asesoradoId, desde, hasta) => run(sb.from('nutri_registros').select('*').eq('asesorado_id', asesoradoId).gte('fecha', desde).lte('fecha', hasta).order('fecha', { ascending: true })),
      atletaCargar: (token, desde, hasta) => run(sb.rpc('atleta_nutri_cargar', { p_token: token, p_desde: desde, p_hasta: hasta })),
      atletaGuardar: (token, r) => run(sb.rpc('atleta_nutri_guardar', { p_token: token, p_registro: r })),
      atletaBorrar: (token, id) => run(sb.rpc('atleta_nutri_borrar', { p_token: token, p_id: id })),
    },
  };
}

// =====================================================================
//  Local (sin Supabase): todo en este teléfono
// =====================================================================
const KEY_L = 'bt:v9:local';
const H4 = 4 * 36e5;
const abiertoDe = (d, aid) => (d.permisos || []).filter((x) => x.asesoradoId === aid && x.abierto && !x.usado && Date.now() - Date.parse(x.abierto) < H4).sort((x, y) => (x.abierto < y.abierto ? 1 : -1))[0] || null;
export function crearStoreLocal() {
  const vacio = () => ({ asesorados: [], programas: [], sesiones: [], biblioteca: [], plantillas: [], controles: [] });
  const leer = () => { try { return { ...vacio(), ...(JSON.parse(localStorage.getItem(KEY_L) || 'null') || {}) }; } catch { return vacio(); } };
  const escribir = (d) => { try { localStorage.setItem(KEY_L, JSON.stringify(d)); } catch { throw new Error('No queda espacio en el teléfono. Exporta un respaldo y borra sesiones viejas.'); } };
  const mut = (fn) => { const d = leer(); const r = fn(d); escribir(d); return r; };
  const ahora = () => new Date().toISOString();
  const upsert = (lista, x) => { const i = lista.findIndex((y) => y.id === x.id); if (i >= 0) lista[i] = { ...lista[i], ...x }; else lista.push(x); return x; };
  return {
    modo: 'local',
    auth: { async usuario() { return { id: 'local', email: 'este teléfono' }; }, async entrar() { return { id: 'local' }; }, async registrar() { return { id: 'local' }; }, async salir() {}, escuchar() { return () => {}; } },
    async cargarTodo() { return leer(); },
    async sesionesDesde(desde) { return leer().sesiones.filter((s) => (s.creado || '') >= desde); },
    async guardarAsesorado(a) { return mut((d) => upsert(d.asesorados, { creado: ahora(), ...a, token: a.token || tokenNuevo(), datos: a.datos || {} })); },
    async borrarAsesorado(id) { mut((d) => { d.asesorados = d.asesorados.filter((x) => x.id !== id); d.programas = d.programas.filter((x) => x.asesoradoId !== id); d.sesiones = d.sesiones.filter((x) => x.asesoradoId !== id); d.permisos = (d.permisos || []).filter((x) => x.asesoradoId !== id); d.controles = d.controles.filter((x) => x.asesoradoId !== id); }); },
    async guardarPrograma(p) { return mut((d) => upsert(d.programas, { creado: ahora(), ...p, actualizado: ahora() })); },
    async guardarProgramas(ps) { return mut((d) => ps.map((p) => upsert(d.programas, { creado: ahora(), ...p, actualizado: ahora() }))); },
    async borrarPrograma(id) { mut((d) => { d.programas = d.programas.filter((x) => x.id !== id); }); },
    async guardarSesion(s) { return mut((d) => upsert(d.sesiones, { creado: ahora(), ...s })); },
    async guardarSesiones(ss) { return mut((d) => ss.map((s) => upsert(d.sesiones, { creado: ahora(), ...s }))); },
    async borrarSesion(id) { mut((d) => { d.sesiones = d.sesiones.filter((x) => x.id !== id); }); },
    async guardarControl(c) { return mut((d) => upsert(d.controles, { creado: ahora(), ...c })); },
    async borrarControl(id) { mut((d) => { d.controles = d.controles.filter((x) => x.id !== id); }); },
    async guardarEjercicios(bs) { return mut((d) => bs.map((b) => upsert(d.biblioteca, { creado: ahora(), ...b }))); },
    async borrarEjercicio(id) { mut((d) => { d.biblioteca = d.biblioteca.filter((x) => x.id !== id); }); },
    async guardarPlantillas(ts) { return mut((d) => ts.map((t) => upsert(d.plantillas, { creado: ahora(), ...t, actualizado: ahora() }))); },
    async borrarPlantilla(id) { mut((d) => { d.plantillas = d.plantillas.filter((x) => x.id !== id); }); },
    async importar({ asesorados = [], programas = [], sesiones = [], biblioteca = [], plantillas = [], controles = [] }) {
      mut((d) => { controles.forEach((c) => upsert(d.controles, { creado: ahora(), ...c })); biblioteca.forEach((b) => upsert(d.biblioteca, { creado: ahora(), ...b })); plantillas.forEach((t) => upsert(d.plantillas, { creado: ahora(), ...t })); asesorados.forEach((a) => upsert(d.asesorados, { creado: ahora(), ...a, token: a.token || tokenNuevo() })); programas.forEach((p) => upsert(d.programas, { creado: ahora(), ...p })); sesiones.forEach((s) => upsert(d.sesiones, { creado: ahora(), ...s })); });
    },
    // mismas reglas que el servidor (schema.sql), para probar sin Supabase
    async atletaCargar(token, { coach = false } = {}) {
      const d = leer(); const a = d.asesorados.find((x) => x.token === token && !x.archivado); if (!a) return null;
      const v = abiertoDe(d, a.id); const libre = !!v || coach || !!a.sinCodigo;
      const ps = d.programas.filter((p) => p.asesoradoId === a.id && p.visible !== false).sort((x, y) => (x.orden || 0) - (y.orden || 0))
        .map((p) => (libre ? p : { id: p.id, asesoradoId: p.asesoradoId, nombre: p.nombre, orden: p.orden, nota: '', dias: (p.dias || []).map((x) => ({ id: x.id, nombre: x.nombre, grupos: (x.ejercicios || []).map((e) => e.grupo) })) }));
      return { asesorado: { id: a.id, nombre: a.nombre, objetivo: a.objetivo, nivel: a.nivel, vence: a.vence || null, sexo: a.datos?.sexo || null }, controles: d.controles.filter((c) => c.asesoradoId === a.id).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)).slice(0, 6), acceso: { abierto: libre, coach, permiso: v?.id || null, sinCodigo: !!a.sinCodigo, hasta: v && !a.sinCodigo ? new Date(Date.parse(v.abierto) + H4).toISOString() : null }, programas: ps,
        sesiones: d.sesiones.filter((s) => s.asesoradoId === a.id).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)).slice(0, 400) };
    },
    async atletaAbrir(token, codigo) {
      return mut((d) => { const a = d.asesorados.find((x) => x.token === token && !x.archivado); if (!a) return { ok: false, motivo: 'enlace' };
        const v = (d.permisos || []).filter((x) => x.asesoradoId === a.id && !x.abierto && !x.usado && Date.parse(x.expira) > Date.now()).sort((x, y) => (x.creado < y.creado ? 1 : -1))[0];
        if (!v) return { ok: false, motivo: 'sin_codigo' };
        if (v.codigo !== String(codigo || '').replace(/\D/g, '')) { v.intentos = (v.intentos || 0) + 1; if (v.intentos >= 5) v.expira = ahora(); return { ok: false, motivo: v.intentos >= 5 ? 'agotado' : 'incorrecto' }; }
        v.abierto = ahora(); return { ok: true }; });
    },
    async atletaGuardarCasa(token, s) {
      mut((d) => { const a = d.asesorados.find((x) => x.token === token); if (!a) throw new Error('Enlace no válido'); if (d.sesiones.some((x) => x.id === s.id)) return;
        const { permiso, ...ses } = s; d.sesiones.push({ ...ses, programaId: null, asesoradoId: a.id, origen: 'casa', creado: ahora() }); });
      return true;
    },
    async atletaGuardarSesion(token, s) {
      mut((d) => { const a = d.asesorados.find((x) => x.token === token); if (!a) throw new Error('Enlace no válido'); if (d.sesiones.some((x) => x.id === s.id)) return;
        const v = (d.permisos || []).find((x) => x.id === s.permiso && x.asesoradoId === a.id && x.abierto && !x.usado && Date.now() - Date.parse(x.abierto) < 3 * 864e5);
        if (v) v.usado = ahora();
        else if (a.sinCodigo) { const w = abiertoDe(d, a.id); if (w) w.usado = ahora(); }
        else throw new Error('Esta sesión necesita un código de tu coach');
        const { permiso, ...ses } = s; d.sesiones.push({ ...ses, asesoradoId: a.id, origen: 'asesorado', creado: ahora() }); });
      return true;
    },
    async nuevoCodigo(asesoradoId) {
      return mut((d) => { d.permisos = (d.permisos || []).filter((x) => !(x.asesoradoId === asesoradoId && !x.abierto));
        const v = { id: uuid(), asesoradoId, codigo: String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0'), creado: ahora(), expira: new Date(Date.now() + 24 * 36e5).toISOString(), abierto: null, usado: null, intentos: 0 };
        d.permisos.push(v); return { ...v }; });
    },
    async atletaProgreso(token, p) { return mut((d) => { const a = d.asesorados.find((x) => x.token === token); if (!a) return false; let v = abiertoDe(d, a.id);
      if (!v && a.sinCodigo) { v = { id: uuid(), asesoradoId: a.id, codigo: 'libre', creado: ahora(), expira: new Date(Date.now() + 24 * 36e5).toISOString(), abierto: ahora(), usado: null, intentos: 0 }; d.permisos = [...(d.permisos || []), v]; }
      if (!v) return false; v.progreso = p; v.progresoAt = ahora(); return true; }); },
    async entrenandoAhora() { const desde = Date.now() - 16 * 36e5; return (leer().permisos || []).filter((x) => x.abierto && Date.parse(x.abierto) > desde).sort((a, b) => (a.abierto < b.abierto ? 1 : -1)).map((x) => ({ ...x })); },
    async codigoActual(asesoradoId) { return (leer().permisos || []).filter((x) => x.asesoradoId === asesoradoId).sort((x, y) => (x.creado < y.creado ? 1 : -1))[0] || null; },
    // ---------- alimentación (base de alimentos en IndexedDB; lo personal en este mismo respaldo) ----------
    nutri: (() => {
      const base = crearNutriLocal();
      const deToken = (token) => { const a = leer().asesorados.find((x) => x.token === token && !x.archivado); if (!a) throw new Error('enlace no valido'); return a; };
      const idsPlan = (plan) => { const out = new Set(); const rec = (x) => { if (!x || typeof x !== 'object') return; if (typeof x.alimento_id === 'string') out.add(x.alimento_id); Object.values(x).forEach(rec); }; rec(plan); return [...out]; };
      const validarRegistro = (r) => {
        const f = String(r.fecha || ''); const hoyL = new Date(); const d = (x) => Math.round((Date.parse(x + 'T12:00:00') - Date.parse(hoyL.toISOString().slice(0, 10) + 'T12:00:00')) / 864e5);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(f) || d(f) > 1 || d(f) < -60) throw new Error('fecha no valida');
        if (!['alimento', 'receta', 'plan', 'agua', 'sal'].includes(r.tipo)) throw new Error('tipo no valido');
        if (Object.values(r.nutrientes || {}).some((v) => typeof v !== 'number' || v < 0)) throw new Error('nutrientes no validos');
      };
      return {
        ...base,
        buscar: (q, filtros = {}, token = null) => { if (token) deToken(token); return base.buscar(q, filtros); },
        fichas: (ids) => base.fichas([...new Set(ids.filter(Boolean))]),
        guardarAlimento: (a, token = null) => { if (token) deToken(token); return base.guardarAlimento(a, { asesorado: !!token }); },
        async plan(asesoradoId) { const p = (leer().nutri_planes || []).find((x) => x.asesorado_id === asesoradoId); return p ? { objetivos: p.objetivos || {}, plan: p.plan || null, actualizado: p.actualizado } : { objetivos: {}, plan: null }; },
        async guardarPlan(asesoradoId, { objetivos, plan }) { mut((d) => { d.nutri_planes = (d.nutri_planes || []).filter((x) => x.asesorado_id !== asesoradoId); d.nutri_planes.push({ id: asesoradoId, asesorado_id: asesoradoId, objetivos: objetivos || {}, plan: plan ?? null, actualizado: ahora() }); }); return true; },
        async recetas(asesoradoId) { return (leer().nutri_recetas || []).filter((r) => r.asesorado_id === asesoradoId).sort((a, b) => a.nombre.localeCompare(b.nombre)); },
        async guardarReceta(r) { return mut((d) => { d.nutri_recetas = d.nutri_recetas || []; return upsert(d.nutri_recetas, { creado: ahora(), ...r, porciones: r.porciones || 1, actualizado: ahora() }); }); },
        async borrarReceta(id) { mut((d) => { d.nutri_recetas = (d.nutri_recetas || []).filter((x) => x.id !== id); }); },
        async registros(asesoradoId, desde, hasta) { return (leer().nutri_registros || []).filter((r) => r.asesorado_id === asesoradoId && r.fecha >= desde && r.fecha <= hasta).sort((a, b) => (a.fecha + (a.creado || '')).localeCompare(b.fecha + (b.creado || ''))); },
        async atletaCargar(token, desde, hasta) {
          const a = deToken(token); const d = leer(); const p = (d.nutri_planes || []).find((x) => x.asesorado_id === a.id); const recetas = (d.nutri_recetas || []).filter((r) => r.asesorado_id === a.id);
          const ids = [...idsPlan(p?.plan), ...recetas.flatMap((r) => (r.ingredientes || []).map((i) => i.alimento_id))];
          return { objetivos: p?.objetivos || {}, plan: p?.plan || null, recetas, registros: (d.nutri_registros || []).filter((r) => r.asesorado_id === a.id && r.fecha >= desde && r.fecha <= hasta), fichas: await base.fichas([...new Set(ids)]) };
        },
        async atletaGuardar(token, r) { const a = deToken(token); validarRegistro(r); return mut((d) => { d.nutri_registros = d.nutri_registros || []; const ex = d.nutri_registros.find((x) => x.id === r.id); if (ex && ex.asesorado_id !== a.id) throw new Error('registro ajeno'); upsert(d.nutri_registros, { creado: ahora(), ...r, asesorado_id: a.id, origen: 'asesorado' }); return { ok: true, id: r.id }; }); },
        async atletaBorrar(token, id) { const a = deToken(token); return mut((d) => { const n = (d.nutri_registros || []).length; d.nutri_registros = (d.nutri_registros || []).filter((x) => !(x.id === id && x.asesorado_id === a.id)); return d.nutri_registros.length < n; }); },
      };
    })(),
  };
}

export function crearStore() { const c = leerConfig(); return c.url && c.key ? crearStoreNube(c) : crearStoreLocal(); }
export { uuid };
