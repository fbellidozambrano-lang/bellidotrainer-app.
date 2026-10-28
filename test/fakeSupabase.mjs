// Cliente que imita la parte de supabase-js que usa la app, sobre PGlite.
import { como } from './pg.mjs';

export function fakeSupabase(db) {
  let user = null; const subs = [];
  const exec = (fn) => como(db, user?.id || null, fn);
  function builder(tabla) {
    const st = { op: 'select', where: [], orders: [], range: null, rows: null, ret: false };
    const b = {
      select() { if (st.op !== 'select') st.ret = true; return b; },
      order(c, o = {}) { st.orders.push(`${c} ${o.ascending === false ? 'desc' : 'asc'}`); return b; },
      range(a, z) { st.range = [a, z]; return b; },
      limit(n) { st.range = [0, n - 1]; return b; },
      eq(c, v) { st.where.push([c, '=', v]); return b; },
      gte(c, v) { st.where.push([c, '>=', v]); return b; },
      lte(c, v) { st.where.push([c, '<=', v]); return b; },
      upsert(r) { st.op = 'upsert'; st.rows = Array.isArray(r) ? r : [r]; return b; },
      delete() { st.op = 'delete'; return b; },
      then(res, rej) { return run().then(res, rej); },
    };
    async function run() {
      try {
        const params = []; const p = (v) => { params.push(v !== null && typeof v === 'object' ? JSON.stringify(v) : v); return `$${params.length}`; };
        const where = st.where.length ? ' where ' + st.where.map(([c, o, v]) => `${c} ${o} ${p(v)}`).join(' and ') : '';
        let sql;
        if (st.op === 'select') sql = `select * from ${tabla}${where}${st.orders.length ? ' order by ' + st.orders.join(',') : ''}${st.range ? ` offset ${st.range[0]} limit ${st.range[1] - st.range[0] + 1}` : ''}`;
        else if (st.op === 'delete') sql = `delete from ${tabla}${where}`;
        else {
          const cols = Object.keys(st.rows[0]);
          const vals = st.rows.map((r) => '(' + cols.map((c) => p(r[c])).join(',') + ')').join(',');
          sql = `insert into ${tabla} (${cols.join(',')}) values ${vals} on conflict (id) do update set ${cols.filter((c) => c !== 'id').map((c) => `${c}=excluded.${c}`).join(',')} returning *`;
        }
        const r = await exec((tx) => tx.query(sql, params));
        return { data: r.rows.map(fix), error: null };
      } catch (e) { return { data: null, error: { message: e.message } }; }
    }
    return b;
  }
  const fix = (row) => { const o = { ...row }; for (const k in o) if (o[k] instanceof Date) o[k] = k === 'fecha' ? o[k].toISOString().slice(0, 10) : o[k].toISOString(); return o; };
  return {
    from: builder,
    async rpc(fn, args = {}) {
      try { const ks = Object.keys(args); const r = await exec((tx) => tx.query(`select ${fn}(${ks.map((k, i) => `${k} => $${i + 1}`).join(',')}) as r`, ks.map((k) => (args[k] === null || args[k] === undefined ? null : Array.isArray(args[k]) && args[k].every((x) => typeof x === 'string') && /_ids$/.test(k) ? `{${args[k].join(',')}}` : typeof args[k] === 'object' ? JSON.stringify(args[k]) : args[k])))); return { data: r.rows[0].r, error: null }; }
      catch (e) { return { data: null, error: { message: e.message } }; }
    },
    auth: {
      async getSession() { return { data: { session: user ? { user } : null } }; },
      async signInWithPassword({ email }) { const r = await db.query(`select * from auth.users where email=$1`, [email]); if (!r.rows[0]) return { data: {}, error: { message: 'Invalid login credentials' } }; user = r.rows[0]; subs.forEach((f) => f('SIGNED_IN', { user })); return { data: { user }, error: null }; },
      async signUp() { return { data: {}, error: { message: 'Signups not allowed for this instance' } }; },
      async signOut() { user = null; subs.forEach((f) => f('SIGNED_OUT', null)); },
      onAuthStateChange(f) { subs.push(f); return { data: { subscription: { unsubscribe() {} } } }; },
    },
    _anon() { user = null; },
  };
}
