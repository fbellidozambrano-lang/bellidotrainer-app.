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

-- Pagos: próxima fecha de vencimiento de la mensualidad
alter table public.asesorados add column if not exists vence date;

-- Códigos para entrenar: el coach genera uno, el asesorado lo ingresa para
-- ver su rutina, y al enviar la sesión se gasta.
create table if not exists public.permisos (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null references public.asesorados(id) on delete cascade,
  codigo       text not null,
  creado       timestamptz not null default now(),
  expira       timestamptz not null default now() + interval '24 hours',  -- para ingresarlo
  abierto      timestamptz,                                               -- cuando lo ingresó
  usado        timestamptz,                                               -- cuando envió la sesión
  intentos     int not null default 0
);
-- Biblioteca de ejercicios del coach: un ejercicio por item, con sus variantes
-- de nombre (alias), video y valores por defecto. Las rutinas de cada asesorado
-- guardan su propia copia del ejercicio (con bibId), así su historial no cambia.
create table if not exists public.biblioteca (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null,
  grupo       text not null default '',
  tipo        text not null default 'reps',
  video       text not null default '',
  tecnica     text not null default '',
  alias       jsonb not null default '[]'::jsonb,
  base        jsonb not null default '{}'::jsonb,     -- series, repMin, repMax, segundos, descanso, rpe
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists biblioteca_coach_idx on public.biblioteca (coach_id, nombre);

-- Plantillas de rutina del coach (mismo formato de días que un programa)
create table if not exists public.plantillas (
  id          uuid primary key default gen_random_uuid(),
  coach_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nombre      text not null default '',
  nota        text not null default '',
  orden       int  not null default 0,
  dias        jsonb not null default '[]'::jsonb,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now()
);
create index if not exists plantillas_coach_idx on public.plantillas (coach_id, orden);

-- Controles antropométricos (resumen leído del PDF del informe)
-- datos: { peso, grasa, masaGrasa, masaLibre, musculo, musculoPct, visceral, edadMet, imc, cintura, tmb, inicial: {…}, inicio }
create table if not exists public.controles (
  id           uuid primary key default gen_random_uuid(),
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null references public.asesorados(id) on delete cascade,
  fecha        date not null,
  datos        jsonb not null default '{}'::jsonb,
  archivo      text not null default '',
  creado       timestamptz not null default now()
);
create index if not exists controles_ases_idx on public.controles (asesorado_id, fecha desc);

create index if not exists permisos_ases_idx on public.permisos (asesorado_id, creado desc);

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
drop trigger if exists biblioteca_tocar on public.biblioteca;
create trigger biblioteca_tocar before update on public.biblioteca
  for each row execute function public.tocar_actualizado();
drop trigger if exists plantillas_tocar on public.plantillas;
create trigger plantillas_tocar before update on public.plantillas
  for each row execute function public.tocar_actualizado();
drop trigger if exists programas_tocar on public.programas;
create trigger programas_tocar before update on public.programas
  for each row execute function public.tocar_actualizado();

-- ---------- seguridad: cada coach solo ve lo suyo ---------------------

alter table public.asesorados enable row level security;
alter table public.programas  enable row level security;
alter table public.sesiones   enable row level security;
alter table public.permisos   enable row level security;
alter table public.biblioteca enable row level security;
alter table public.plantillas enable row level security;
alter table public.controles  enable row level security;
revoke all on public.controles from anon;
drop policy if exists coach_controles on public.controles;
create policy coach_controles on public.controles for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (
    select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));

revoke all on public.asesorados, public.programas, public.sesiones, public.permisos,
              public.biblioteca, public.plantillas from anon;

drop policy if exists coach_biblioteca on public.biblioteca;
create policy coach_biblioteca on public.biblioteca for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());
drop policy if exists coach_plantillas on public.plantillas;
create policy coach_plantillas on public.plantillas for all to authenticated
  using (coach_id = auth.uid()) with check (coach_id = auth.uid());

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

drop policy if exists coach_permisos on public.permisos;
create policy coach_permisos on public.permisos for all to authenticated
  using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (
    select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));

-- El coach genera un código nuevo (anula el anterior que no se haya usado)
create or replace function public.nuevo_codigo(p_asesorado uuid, p_horas int default 24)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare v public.permisos; v_cod text;
begin
  if auth.uid() is null or not exists (
    select 1 from public.asesorados where id = p_asesorado and coach_id = auth.uid()) then
    raise exception 'no autorizado';
  end if;
  delete from public.permisos where asesorado_id = p_asesorado and abierto is null;
  v_cod := lpad(((('x' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))::bit(32)::bigint) % 1000000)::text, 6, '0');
  insert into public.permisos (coach_id, asesorado_id, codigo, expira)
  values (auth.uid(), p_asesorado, v_cod,
          now() + make_interval(hours => greatest(1, least(coalesce(p_horas, 24), 168))))
  returning * into v;
  return to_jsonb(v);
end $$;

-- ---------- acceso del asesorado (sin cuenta, con su enlace personal) --
-- El enlace lleva un código secreto (token). Estas dos funciones son lo
-- único que puede usar alguien sin sesión, y solo ven lo de ese token.

create or replace function public.atleta_cargar(p_token text)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.asesorados; v public.permisos; libre boolean := false; coach boolean := false;
begin
  if p_token is null or length(p_token) < 16 then return null; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then return null; end if;
  coach := auth.uid() is not null and a.coach_id = auth.uid();     -- vista previa del coach
  select * into v from public.permisos
   where asesorado_id = a.id and abierto is not null and usado is null
     and abierto > now() - interval '4 hours'
   order by abierto desc limit 1;
  libre := found or coach;
  return jsonb_build_object(
    'asesorado', jsonb_build_object('id', a.id, 'nombre', a.nombre,
                                    'objetivo', a.objetivo, 'nivel', a.nivel, 'vence', a.vence),
    'acceso', jsonb_build_object('abierto', libre, 'coach', coach, 'permiso', v.id,
                                 'hasta', v.abierto + interval '4 hours'),
    -- sin código solo viajan los nombres de programas y días, nunca los ejercicios
    'programas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'orden', p.orden,
               'nota', case when libre then p.nota else '' end,
               'dias', case when libre then p.dias else coalesce((
                  select jsonb_agg(jsonb_build_object('id', d ->> 'id', 'nombre', d ->> 'nombre'))
                  from jsonb_array_elements(p.dias) d), '[]'::jsonb) end)
               order by p.orden, p.creado)
      from public.programas p where p.asesorado_id = a.id and p.visible), '[]'::jsonb),
    'controles', coalesce((
      select jsonb_agg(c order by c.fecha desc) from (
        select k.id, k.fecha, k.datos from public.controles k
        where k.asesorado_id = a.id order by k.fecha desc, k.creado desc limit 6) c), '[]'::jsonb),
    'sesiones', coalesce((
      select jsonb_agg(x order by x.fecha desc, x.creado desc) from (
        select s.id, s.programa_id, s.programa_nombre, s.dia, s.fecha, s.minutos,
               s.series, s.notas, s.creado
        from public.sesiones s where s.asesorado_id = a.id
        order by s.fecha desc, s.creado desc limit 400) x), '[]'::jsonb)
  );
end $$;

-- El asesorado ingresa el código que le dio el coach
create or replace function public.atleta_abrir(p_token text, p_codigo text)
returns jsonb
language plpgsql volatile security definer set search_path = public as $$
declare a public.asesorados; v public.permisos;
begin
  if p_token is null or length(p_token) < 16 then return null; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then return null; end if;
  select * into v from public.permisos
   where asesorado_id = a.id and abierto is null and usado is null and expira > now()
   order by creado desc limit 1;
  if not found then return jsonb_build_object('ok', false, 'motivo', 'sin_codigo'); end if;
  if v.codigo <> regexp_replace(coalesce(p_codigo, ''), '[^0-9]', '', 'g') then
    update public.permisos set intentos = intentos + 1,
           expira = case when intentos + 1 >= 5 then now() else expira end
     where id = v.id;
    return jsonb_build_object('ok', false, 'motivo', case when v.intentos + 1 >= 5 then 'agotado' else 'incorrecto' end);
  end if;
  update public.permisos set abierto = now() where id = v.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.atleta_guardar_sesion(p_token text, p_sesion jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.asesorados; v_id uuid; v_fecha date; v_perm uuid;
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
  -- reenviar la misma sesión no la duplica ni pide código otra vez
  if exists (select 1 from public.sesiones where id = v_id) then
    return jsonb_build_object('ok', true, 'id', v_id);
  end if;
  -- toda sesión gasta el código con que se abrió la rutina (hasta 3 días, por si no había señal)
  v_perm := nullif(p_sesion ->> 'permiso', '')::uuid;
  update public.permisos set usado = now()
   where id = v_perm and asesorado_id = a.id and abierto is not null and usado is null
     and abierto > now() - interval '3 days';
  if not found then raise exception 'sesion sin codigo'; end if;
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
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.atleta_cargar(text) from public;
revoke all on function public.atleta_guardar_sesion(text, jsonb) from public;
grant execute on function public.atleta_cargar(text) to anon, authenticated;
grant execute on function public.atleta_guardar_sesion(text, jsonb) to anon, authenticated;
revoke all on function public.atleta_abrir(text, text) from public;
grant execute on function public.atleta_abrir(text, text) to anon, authenticated;
revoke all on function public.nuevo_codigo(uuid, int) from public;
grant execute on function public.nuevo_codigo(uuid, int) to authenticated;
