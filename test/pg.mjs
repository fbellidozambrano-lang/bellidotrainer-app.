// Postgres en memoria (PGlite) que imita lo esencial de Supabase:
// roles anon / authenticated, auth.users y auth.uid() leído del JWT.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs';

export async function crearDB() {
  const db = new PGlite();
  await db.exec(`
    create role anon nologin; create role authenticated nologin;
    create schema auth;
    create table auth.users (id uuid primary key, email text);
    create function auth.uid() returns uuid language sql stable as
      $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    grant execute on function auth.uid() to anon, authenticated;
    grant usage on schema public to anon, authenticated;
    alter default privileges in schema public grant all on tables to anon, authenticated;
  `);
  const sql = fs.readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8');
  await db.exec(sql);
  await db.exec(sql); // debe poder correrse dos veces
  await db.exec(`grant all on public.asesorados, public.programas, public.sesiones, public.permisos, public.biblioteca, public.plantillas to authenticated;`);
  return db;
}

// Ejecuta como un usuario (uid) o como anónimo (uid = null) dentro de una transacción.
export async function como(db, uid, fn) {
  return db.transaction(async (tx) => {
    await tx.query(`select set_config('request.jwt.claim.sub', $1, true)`, [uid || '']);
    await tx.exec(`set local role ${uid ? 'authenticated' : 'anon'}`);
    return fn(tx);
  });
}
