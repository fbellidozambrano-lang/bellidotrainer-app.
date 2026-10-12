-- =====================================================================
--  BELLIDO TRAINER · base de datos (Supabase)
--  Cómo usarlo: Supabase → SQL Editor → New query → pega todo → Run.
--  Se puede ejecutar más de una vez sin romper nada.
-- =====================================================================

-- ---------- tablas ----------------------------------------------------

create table if not exists public.asesorados (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  objetivo    text not null default '',
  nivel       text not null default '',
  notas       text not null default '',
  datos       jsonb not null default '{}'::jsonb,      -- edad, peso, mesociclo…
  token       text not null unique default replace(gen_random_uuid()::text, '-', ''),
  archivado   boolean not null default false,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);

-- Un programa = una forma de entrenar la semana (2, 3, 5 días…).
-- dias: [{ id, nombre, ejercicios: [{ id, ejercicio, grupo, tipo, series,
--          repMin, repMax, segundos, descanso, rpe, pesoSugerido, nota, video }] }]
create table if not exists public.programas (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null references public.asesorados(id) on delete cascade,
  nombre       text not null default '',
  nota         text not null default '',
  orden        int  not null default 0,
  visible      boolean not null default true,
  dias         jsonb not null default '[]'::jsonb,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);

-- series: [{ ejercicio, grupo, serie, peso, reps, seg, rpe }]
create table if not exists public.sesiones (
  id              uuid primary key default gen_random_uuid(),
  coach_id        uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id    uuid not null references public.asesorados(id) on delete cascade,
  programa_id     uuid,
  programa_nombre text not null default '',
  dia             text not null default '',
  fecha           date not null,
  minutos         int,
  series          jsonb not null default '[]'::jsonb,
  notas           jsonb not null default '{}'::jsonb,
  origen          text not null default 'coach',        -- coach | asesorado | importado
  creado          timestamptz not null default now()
);

alter table public.sesiones alter column coach_id set default auth.uid();

create index if not exists asesorados_coach_idx  on public.asesorados (coach_id);
create index if not exists programas_ases_idx    on public.programas  (asesorado_id, orden);
create index if not exists sesiones_ases_idx     on public.sesiones   (asesorado_id, fecha desc);
create index if not exists sesiones_coach_idx    on public.sesiones   (coach_id, fecha desc);

-- ---------- fecha de actualización automática -------------------------

create or replace function public.tocar_actualizado() returns trigger
language plpgsql as $$
begin new.actualizado := now(); return new; end $$;

drop trigger if exists asesorados_tocar on public.asesorados;
create trigger asesorados_tocar before update on public.asesorados
  for each row execute function public.tocar_actualizado();
drop trigger if exists programas_tocar on public.programas;
create trigger programas_tocar before update on public.programas
  for each row execute function public.tocar_actualizado();

-- ---------- seguridad: cada coach solo ve lo suyo ---------------------

alter table public.asesorados enable row level security;
alter table public.programas  enable row level security;
alter table public.sesiones   enable row level security;

revoke all on public.asesorados, public.programas, public.sesiones from anon;

drop policy if exists coach_asesorados on public.asesorados;
create policy coach_asesorados on public.asesorados for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

drop policy if exists coach_programas on public.programas;
create policy coach_programas on public.programas for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (
    select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));

drop policy if exists coach_sesiones on public.sesiones;
create policy coach_sesiones on public.sesiones for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (
    select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));

-- ---------- acceso del asesorado (sin cuenta, con su enlace personal) --
-- El enlace lleva un código secreto (token). Estas dos funciones son lo
-- único que puede usar alguien sin sesión, y solo ven lo de ese token.

create or replace function public.atleta_cargar(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.asesorados;
begin
  if p_token is null or length(p_token) < 16 then return null; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then return null; end if;
  return jsonb_build_object(
    'asesorado', jsonb_build_object('id', a.id, 'nombre', a.nombre,
                                    'objetivo', a.objetivo, 'nivel', a.nivel),
    'programas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'nota', p.nota,
                                          'orden', p.orden, 'dias', p.dias)
                       order by p.orden, p.creado)
      from public.programas p where p.asesorado_id = a.id and p.visible), '[]'::jsonb),
    'sesiones', coalesce((
      select jsonb_agg(x order by x.fecha desc, x.creado desc) from (
        select s.id, s.programa_id, s.programa_nombre, s.dia, s.fecha, s.minutos,
               s.series, s.notas, s.creado
        from public.sesiones s where s.asesorado_id = a.id
        order by s.fecha desc, s.creado desc limit 400) x), '[]'::jsonb)
  );
end $$;

create or replace function public.atleta_guardar_sesion(p_token text, p_sesion jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.asesorados; v_id uuid; v_fecha date;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'enlace no valido'; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then raise exception 'enlace no valido'; end if;
  if jsonb_typeof(p_sesion -> 'series') <> 'array'
     or jsonb_array_length(p_sesion -> 'series') = 0
     or jsonb_array_length(p_sesion -> 'series') > 400 then
    raise exception 'sesion sin series';
  end if;
  v_id    := coalesce(nullif(p_sesion ->> 'id', '')::uuid, gen_random_uuid());
  v_fecha := coalesce(nullif(p_sesion ->> 'fecha', '')::date, current_date);
  if v_fecha > current_date + 2 or v_fecha < current_date - 400 then
    raise exception 'fecha fuera de rango';
  end if;
  insert into public.sesiones (id, coach_id, asesorado_id, programa_id, programa_nombre,
                               dia, fecha, minutos, series, notas, origen)
  values (v_id, a.coach_id, a.id,
          nullif(p_sesion ->> 'programa_id', '')::uuid,
          left(coalesce(p_sesion ->> 'programa_nombre', ''), 120),
          left(coalesce(p_sesion ->> 'dia', ''), 120),
          v_fecha,
          least(nullif(p_sesion ->> 'minutos', '')::numeric, 600)::int,
          p_sesion -> 'series',
          case when jsonb_typeof(p_sesion -> 'notas') = 'object'
               then p_sesion -> 'notas' else '{}'::jsonb end,
          'asesorado')
  on conflict (id) do nothing;            -- reenviar la misma sesión no la duplica
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.atleta_cargar(text) from public;
revoke all on function public.atleta_guardar_sesion(text, jsonb) from public;
grant execute on function public.atleta_cargar(text) to anon, authenticated;
grant execute on function public.atleta_guardar_sesion(text, jsonb) to anon, authenticated;
