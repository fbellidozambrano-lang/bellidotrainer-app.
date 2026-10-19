// Capa de datos: Supabase (en línea) o modo local (solo este teléfono).
// Las dos exponen exactamente las mismas funciones.
import { createClient } from '@supabase/supabase-js';
import { tokenNuevo, uuid } from '../lib/util.js';

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
const aFilaA = (a) => ({ id: a.id, nombre: a.nombre, objetivo: a.objetivo || '', nivel: a.nivel || '', notas: a.notas || '', datos: a.datos || {}, token: a.token, archivado: !!a.archivado, vence: a.vence || null });
const deFilaA = (r) => ({ id: r.id, nombre: r.nombre, objetivo: r.objetivo, nivel: r.nivel, notas: r.notas, datos: r.datos || {}, token: r.token, archivado: r.archivado, vence: r.vence ? String(r.vence).slice(0, 10) : null, creado: r.creado });
const aFilaB = (b) => ({ id: b.id, nombre: b.nombre, grupo: b.grupo || '', tipo: b.tipo || 'reps', video: b.video || '', tecnica: b.tecnica || '', alias: b.alias || [], base: b.base || {} });
const deFilaB = (r) => ({ id: r.id, nombre: r.nombre, grupo: r.grupo, tipo: r.tipo, video: r.video, tecnica: r.tecnica, alias: r.alias || [], base: r.base || {}, creado: r.creado });
const aFilaT = (t) => ({ id: t.id, nombre: t.nombre || '', nota: t.nota || '', orden: t.orden || 0, dias: t.dias || [] });
const deFilaT = (r) => ({ id: r.id, nombre: r.nombre, nota: r.nota, orden: r.orden, dias: r.dias || [], creado: r.creado, actualizado: r.actualizado });
const aFilaC = (c) => ({ id: c.id, asesorado_id: c.asesoradoId, fecha: c.fecha, datos: c.datos || {}, archivo: c.archivo || '' });
const deFilaC = (r, aid) => ({ id: r.id, asesoradoId: r.asesorado_id || aid, fecha: String(r.fecha).slice(0, 10), datos: r.datos || {}, archivo: r.archivo || '', creado: r.creado });
const dePermiso = (r) => (r ? { id: r.id, codigo: r.codigo, creado: r.creado, expira: r.expira, abierto: r.abierto || null, usado: r.usado || null, intentos: r.intentos || 0 } : null);
const aFilaP = (p) => ({ id: p.id, asesorado_id: p.asesoradoId, nombre: p.nombre || '', nota: p.nota || '', orden: p.orden || 0, visible: p.visible !== false, dias: p.dias || [] });
const deFilaP = (r) => ({ id: r.id, asesoradoId: r.asesorado_id, nombre: r.nombre, nota: r.nota, orden: r.orden, visible: r.visible, dias: r.dias || [], creado: r.creado, actualizado: r.actualizado });
const aFilaS = (s) => ({ id: s.id, asesorado_id: s.asesoradoId, programa_id: s.programaId || null, programa_nombre: s.programaNombre || '', dia: s.dia || '', fecha: s.fecha, minutos: s.minutos ?? null, series: s.series || [], notas: s.notas || {}, origen: s.origen || 'coach' });
export const deFilaS = (r, asesoradoId) => ({ id: r.id, asesoradoId: r.asesorado_id || asesoradoId, programaId: r.programa_id, programaNombre: r.programa_nombre, dia: r.dia, fecha: String(r.fecha).slice(0, 10), minutos: r.minutos, series: r.series || [], notas: r.notas || {}, origen: r.origen, creado: r.creado });
const atletaDe = (d) => (d ? { asesorado: { ...d.asesorado, vence: d.asesorado.vence ? String(d.asesorado.vence).slice(0, 10) : null }, acceso: d.acceso || { abierto: true }, controles: (d.controles || []).map((c) => deFilaC(c, d.asesorado.id)), programas: (d.programas || []).map((p) => ({ ...p, asesoradoId: d.asesorado.id })), sesiones: (d.sesiones || []).map((s) => deFilaS(s, d.asesorado.id)) } : null);

const trozos = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
function traducirError(e) {
  const m = String(e?.message || e || '');
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
  const sb = clienteFalso || createClient(cfg.url, cfg.key, { auth: { persistSession: true, autoRefreshToken: true, storageKey: 'bt:auth' } });
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
      async usuario() { const { data } = await sb.auth.getSession(); return data?.session?.user || null; },
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
    async atletaAbrir(token, codigo) { return (await run(sb.rpc('atleta_abrir', { p_token: token, p_codigo: codigo }))) || { ok: false, motivo: 'enlace' }; },
    async nuevoCodigo(asesoradoId) { return dePermiso(await run(sb.rpc('nuevo_codigo', { p_asesorado: asesoradoId }))); },
    async codigoActual(asesoradoId) { const d = await run(sb.from('permisos').select('*').eq('asesorado_id', asesoradoId).order('creado', { ascending: false }).limit(1)); return dePermiso(d[0]); },
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
      const v = abiertoDe(d, a.id); const libre = !!v || coach;
      const ps = d.programas.filter((p) => p.asesoradoId === a.id && p.visible !== false).sort((x, y) => (x.orden || 0) - (y.orden || 0))
        .map((p) => (libre ? p : { id: p.id, asesoradoId: p.asesoradoId, nombre: p.nombre, orden: p.orden, nota: '', dias: (p.dias || []).map((x) => ({ id: x.id, nombre: x.nombre })) }));
      return { asesorado: { id: a.id, nombre: a.nombre, objetivo: a.objetivo, nivel: a.nivel, vence: a.vence || null }, controles: d.controles.filter((c) => c.asesoradoId === a.id).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)).slice(0, 6), acceso: { abierto: libre, coach, permiso: v?.id || null, hasta: v ? new Date(Date.parse(v.abierto) + H4).toISOString() : null }, programas: ps,
        sesiones: d.sesiones.filter((s) => s.asesoradoId === a.id).sort((x, y) => (x.fecha < y.fecha ? 1 : -1)).slice(0, 400) };
    },
    async atletaAbrir(token, codigo) {
      return mut((d) => { const a = d.asesorados.find((x) => x.token === token && !x.archivado); if (!a) return { ok: false, motivo: 'enlace' };
        const v = (d.permisos || []).filter((x) => x.asesoradoId === a.id && !x.abierto && !x.usado && Date.parse(x.expira) > Date.now()).sort((x, y) => (x.creado < y.creado ? 1 : -1))[0];
        if (!v) return { ok: false, motivo: 'sin_codigo' };
        if (v.codigo !== String(codigo || '').replace(/\D/g, '')) { v.intentos = (v.intentos || 0) + 1; if (v.intentos >= 5) v.expira = ahora(); return { ok: false, motivo: v.intentos >= 5 ? 'agotado' : 'incorrecto' }; }
        v.abierto = ahora(); return { ok: true }; });
    },
    async atletaGuardarSesion(token, s) {
      mut((d) => { const a = d.asesorados.find((x) => x.token === token); if (!a) throw new Error('Enlace no válido'); if (d.sesiones.some((x) => x.id === s.id)) return;
        const v = (d.permisos || []).find((x) => x.id === s.permiso && x.asesoradoId === a.id && x.abierto && !x.usado && Date.now() - Date.parse(x.abierto) < 3 * 864e5);
        if (!v) throw new Error('Esta sesión necesita un código de tu coach'); v.usado = ahora();
        const { permiso, ...ses } = s; d.sesiones.push({ ...ses, asesoradoId: a.id, origen: 'asesorado', creado: ahora() }); });
      return true;
    },
    async nuevoCodigo(asesoradoId) {
      return mut((d) => { d.permisos = (d.permisos || []).filter((x) => !(x.asesoradoId === asesoradoId && !x.abierto));
        const v = { id: uuid(), asesoradoId, codigo: String(crypto.getRandomValues(new Uint32Array(1))[0] % 1000000).padStart(6, '0'), creado: ahora(), expira: new Date(Date.now() + 24 * 36e5).toISOString(), abierto: null, usado: null, intentos: 0 };
        d.permisos.push(v); return { ...v }; });
    },
    async codigoActual(asesoradoId) { return (leer().permisos || []).filter((x) => x.asesoradoId === asesoradoId).sort((x, y) => (x.creado < y.creado ? 1 : -1))[0] || null; },
  };
}

export function crearStore() { const c = leerConfig(); return c.url && c.key ? crearStoreNube(c) : crearStoreLocal(); }
export { uuid };
