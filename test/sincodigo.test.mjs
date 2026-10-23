// Asesorados sin código (acceso libre) y protecciones contra que la app se quede pegada.
import assert from 'node:assert/strict';
import { crearDB } from './pg.mjs';
import { fakeSupabase } from './fakeSupabase.mjs';
globalThis.localStorage = { _: {}, getItem(k) { return this._[k] ?? null; }, setItem(k, v) { this._[k] = String(v); }, removeItem(k) { delete this._[k]; } };
const { crearStoreNube, crearStoreLocal, conLimite, fetchConLimite, LIMITE_MS } = await import('../src/data/store.js');
const { hoy } = await import('../src/lib/util.js');
let ok = 0; const t = async (n, f) => { await f(); ok++; console.log('ok -', n); };
const ses = (extra = {}) => ({ id: crypto.randomUUID(), fecha: hoy(), dia: 'Pierna', series: [{ ejercicio: 'Sentadilla', grupo: 'Cuádriceps', serie: 1, peso: 80, reps: 8 }], ...extra });

for (const modo of ['nube', 'local']) {
  await t(`${modo}: sin código abre la rutina, guarda y sigue abierta; el coach la ve en vivo`, async () => {
    let st, entrar = async () => {}, salir = async () => {};
    if (modo === 'nube') { const db = await crearDB(); await db.exec(`insert into auth.users values ('11111111-1111-1111-1111-111111111111','c@bt.com')`); st = crearStoreNube({ url: 'x', key: 'y' }, fakeSupabase(db)); entrar = () => st.auth.entrar('c@bt.com', 'x'); salir = () => st.auth.salir(); await entrar(); }
    else { localStorage._ = {}; st = crearStoreLocal(); }
    const libre = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Lia Libre', token: 'l'.repeat(32), datos: {}, sinCodigo: true });
    const conCod = await st.guardarAsesorado({ id: crypto.randomUUID(), nombre: 'Ceci Codigo', token: 'c'.repeat(32), datos: {} });
    assert.equal(libre.sinCodigo, true);
    await st.guardarPrograma({ id: crypto.randomUUID(), asesoradoId: libre.id, nombre: 'Fuerza', orden: 0, visible: true, dias: [{ id: 'd1', nombre: 'Pierna', ejercicios: [{ id: 'e1', ejercicio: 'Sentadilla', grupo: 'Cuádriceps' }] }] });
    await st.guardarPrograma({ id: crypto.randomUUID(), asesoradoId: conCod.id, nombre: 'Fuerza', orden: 0, visible: true, dias: [{ id: 'd1', nombre: 'Pierna', ejercicios: [{ id: 'e1', ejercicio: 'Sentadilla', grupo: 'Cuádriceps' }] }] });
    await salir();
    // acceso libre: ve los ejercicios sin código
    let d = await st.atletaCargar(libre.token);
    assert.equal(d.acceso.abierto, true); assert.equal(d.acceso.sinCodigo, true); assert.equal(d.programas[0].dias[0].ejercicios.length, 1);
    // con código: sigue bloqueado
    const dc = await st.atletaCargar(conCod.token);
    assert.equal(dc.acceso.abierto, false); assert.equal(dc.programas[0].dias[0].ejercicios, undefined);
    await assert.rejects(st.atletaGuardarSesion(conCod.token, ses()), /codigo|código/);
    // en vivo sin código
    assert.equal(await st.atletaProgreso(libre.token, { dia: 'Pierna', hechas: 1, total: 4, ejercicios: [] }), true);
    await entrar(); let v = await st.entrenandoAhora();
    assert.equal(v.length, 1); assert.equal(v[0].asesoradoId, libre.id); assert.equal(v[0].progreso.hechas, 1);
    await salir();
    await st.atletaGuardarSesion(libre.token, ses({ permiso: null }));
    await st.atletaGuardarSesion(libre.token, ses({ fecha: hoy() })); // segunda sesión el mismo día, sin código
    d = await st.atletaCargar(libre.token);
    assert.equal(d.acceso.abierto, true, 'la rutina sigue abierta después de enviar'); assert.equal(d.sesiones.length, 2);
    await entrar(); v = await st.entrenandoAhora(); assert.ok(v[0].usado, 'el entreno en vivo queda terminado');
    // el coach vuelve a pedir código
    await st.guardarAsesorado({ ...libre, sinCodigo: false }); await salir();
    d = await st.atletaCargar(libre.token); assert.equal(d.acceso.abierto, false);
    await assert.rejects(st.atletaGuardarSesion(libre.token, ses()), /codigo|código/);
  });
}

await t('editar un asesorado viejo no manda sin_codigo (funciona aunque la base no tenga la columna)', async () => {
  const filas = [];
  const cli = { from: () => ({ upsert: (f) => { filas.push(f); return { select: async () => ({ data: [{ ...f, creado: 'x' }], error: null }) }; } }), auth: {} };
  const st = crearStoreNube({ url: 'x', key: 'y' }, cli);
  const g = await st.guardarAsesorado({ id: '1', nombre: 'Viejo', token: 'v'.repeat(32), datos: {} });
  assert.ok(!('sin_codigo' in filas[0])); assert.ok(!('sinCodigo' in g));
  await st.guardarAsesorado({ id: '1', nombre: 'Viejo', token: 'v'.repeat(32), datos: {}, sinCodigo: true });
  assert.equal(filas[1].sin_codigo, true);
});

await t('nada se queda esperando para siempre', async () => {
  // una promesa colgada se corta con error o con el respaldo
  const colgada = new Promise(() => {});
  await assert.rejects(conLimite(colgada, 30), /lenta/);
  assert.equal(await conLimite(colgada, 30, () => 'guardada'), 'guardada');
  assert.equal(await conLimite(Promise.resolve(7), 1000), 7);
  // el fetch del cliente de Supabase corta la petición colgada
  assert.ok(LIMITE_MS >= 10000 && LIMITE_MS <= 30000);
  const real = globalThis.fetch; let señal;
  globalThis.fetch = (_u, init) => { señal = init.signal; return new Promise((_, mal) => init.signal.addEventListener('abort', () => mal(Object.assign(new Error('aborted'), { name: 'AbortError' })))); };
  const ctrl = new AbortController(); const p = fetchConLimite('https://x', { signal: ctrl.signal }); ctrl.abort();
  await assert.rejects(p, /aborted/); assert.ok(señal.aborted);
  globalThis.fetch = real;
});

await t('la sesión guardada sirve si Supabase no responde al entrar', async () => {
  localStorage.setItem('bt:auth', JSON.stringify({ user: { id: 'u1', email: 'c@bt.com' } }));
  const cli = { auth: { getSession: () => new Promise(() => {}), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } };
  const st = crearStoreNube({ url: 'x', key: 'y' }, cli);
  const t0 = Date.now(); const u = await st.auth.usuario();
  assert.equal(u.id, 'u1'); assert.ok(Date.now() - t0 < 9500);
  localStorage.removeItem('bt:auth');
});
console.log(`\n${ok} pruebas OK`);
