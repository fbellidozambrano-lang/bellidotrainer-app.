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
  origen          text not null default 'coach',        -- coach | asesorado | importado | casa
  creado          timestamptz not null default now()
);

alter table public.sesiones alter column coach_id set default auth.uid();

-- Pagos: próxima fecha de vencimiento de la mensualidad
alter table public.asesorados add column if not exists vence date;
-- Acceso libre: el asesorado abre su rutina sin código (el coach lo decide por asesorado)
alter table public.asesorados add column if not exists sin_codigo boolean not null default false;

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

-- En vivo: el asesorado con la rutina abierta va mandando su avance
alter table public.permisos add column if not exists progreso jsonb;
alter table public.permisos add column if not exists progreso_at timestamptz;

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
  libre := found or coach or a.sin_codigo;
  return jsonb_build_object(
    'asesorado', jsonb_build_object('id', a.id, 'nombre', a.nombre,
                                    'objetivo', a.objetivo, 'nivel', a.nivel, 'vence', a.vence,
                                    'sexo', a.datos ->> 'sexo'),
    'acceso', jsonb_build_object('abierto', libre, 'coach', coach, 'permiso', v.id, 'sinCodigo', a.sin_codigo,
                                 'hasta', case when a.sin_codigo then null else v.abierto + interval '4 hours' end),
    -- sin código solo viajan los nombres de programas y días, nunca los ejercicios
    'programas', coalesce((
      select jsonb_agg(jsonb_build_object('id', p.id, 'nombre', p.nombre, 'orden', p.orden,
               'nota', case when libre then p.nota else '' end,
               'dias', case when libre then p.dias else coalesce((
                  select jsonb_agg(jsonb_build_object('id', d ->> 'id', 'nombre', d ->> 'nombre',
                           -- solo los grupos musculares (para armar la rutina en casa), nunca los ejercicios
                           'grupos', coalesce((select jsonb_agg(e ->> 'grupo') from jsonb_array_elements(coalesce(d -> 'ejercicios', '[]'::jsonb)) e), '[]'::jsonb)))
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

-- Avance del entreno en curso (lo ve el coach en "Entrenando ahora")
create or replace function public.atleta_progreso(p_token text, p_progreso jsonb)
returns boolean
language plpgsql volatile security definer set search_path = public as $$
declare a public.asesorados;
begin
  if p_token is null or length(p_token) < 16 then return false; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then return false; end if;
  if p_progreso is null or jsonb_typeof(p_progreso) <> 'object' or length(p_progreso::text) > 60000 then return false; end if;
  -- sin código: el entreno en curso se registra igual para que el coach lo vea en vivo
  if a.sin_codigo and not exists (select 1 from public.permisos where asesorado_id = a.id and abierto is not null
                                     and usado is null and abierto > now() - interval '4 hours') then
    insert into public.permisos (coach_id, asesorado_id, codigo, abierto, expira)
    values (a.coach_id, a.id, 'libre', now(), now() + interval '24 hours');
  end if;
  update public.permisos set progreso = p_progreso, progreso_at = now()
   where id = (select id from public.permisos
                where asesorado_id = a.id and abierto is not null and usado is null
                  and abierto > now() - interval '4 hours'
                order by abierto desc limit 1);
  return found;
end $$;

-- Entreno en casa: no necesita código (no muestra la rutina del gimnasio)
create or replace function public.atleta_guardar_casa(p_token text, p_sesion jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.asesorados; v_id uuid; v_fecha date;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'enlace no valido'; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then raise exception 'enlace no valido'; end if;
  if jsonb_typeof(p_sesion -> 'series') <> 'array' or jsonb_array_length(p_sesion -> 'series') = 0
     or jsonb_array_length(p_sesion -> 'series') > 120 then raise exception 'sesion sin series'; end if;
  v_id    := coalesce(nullif(p_sesion ->> 'id', '')::uuid, gen_random_uuid());
  v_fecha := coalesce(nullif(p_sesion ->> 'fecha', '')::date, current_date);
  if v_fecha > current_date + 2 or v_fecha < current_date - 30 then raise exception 'fecha fuera de rango'; end if;
  insert into public.sesiones (id, coach_id, asesorado_id, programa_id, programa_nombre, dia, fecha, minutos, series, notas, origen)
  values (v_id, a.coach_id, a.id, null, left(coalesce(p_sesion ->> 'programa_nombre', 'En casa'), 120),
          left(coalesce(p_sesion ->> 'dia', ''), 120), v_fecha, least(nullif(p_sesion ->> 'minutos', '')::numeric, 300)::int,
          p_sesion -> 'series', case when jsonb_typeof(p_sesion -> 'notas') = 'object' then p_sesion -> 'notas' else '{}'::jsonb end, 'casa')
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', v_id);
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
  if not found then
    if not a.sin_codigo then raise exception 'sesion sin codigo'; end if;
    -- acceso libre: no pide código; cierra el entreno en vivo si había uno
    update public.permisos set usado = now()
     where id = (select id from public.permisos where asesorado_id = a.id and abierto is not null and usado is null
                   and abierto > now() - interval '3 days' order by abierto desc limit 1);
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
  on conflict (id) do nothing;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

revoke all on function public.atleta_cargar(text) from public;
revoke all on function public.atleta_guardar_sesion(text, jsonb) from public;
grant execute on function public.atleta_cargar(text) to anon, authenticated;
grant execute on function public.atleta_guardar_sesion(text, jsonb) to anon, authenticated;
revoke all on function public.atleta_progreso(text, jsonb) from public;
grant execute on function public.atleta_progreso(text, jsonb) to anon, authenticated;
revoke all on function public.atleta_guardar_casa(text, jsonb) from public;
grant execute on function public.atleta_guardar_casa(text, jsonb) to anon, authenticated;
revoke all on function public.atleta_abrir(text, text) from public;
grant execute on function public.atleta_abrir(text, text) to anon, authenticated;
revoke all on function public.nuevo_codigo(uuid, int) from public;
grant execute on function public.nuevo_codigo(uuid, int) to authenticated;

-- =====================================================================
--  ALIMENTACIÓN
--  1) Base de alimentos de referencia, compartida y de solo lectura (USDA, etc.)
--     con su procedencia: fuente, versión, importación, método de cada valor.
--  2) Datos de cada asesorado: objetivos, plan, recetas y su diario.
-- =====================================================================

create table if not exists public.nutri_fuentes (
  id           text primary key,
  nombre       text not null,
  organizacion text,
  evidencia    text not null check (evidencia in ('analitico','referencia','etiqueta','colaborativo','personalizado')),
  estado       text not null default 'preparada' check (estado in ('integrada','en_linea','preparada')),
  url          text, licencia text, licencia_url text, atribucion text, nota text,
  historico    boolean not null default false
);
create table if not exists public.nutri_nutrientes (
  id          smallint primary key,               -- estable: nunca se reutiliza
  codigo      text not null unique,
  nombre      text not null,
  sinonimos   text[] not null default '{}',
  unidad      text not null,                      -- unidad normalizada (por 100 g de alimento)
  grupo       text not null,
  definicion  text,
  orden       smallint not null default 0
);
-- correspondencia con los identificadores de cada sistema (usda: nutrient.id · off: clave de nutriments)
create table if not exists public.nutri_nutriente_fuente (
  sistema      text not null,
  id_externo   text not null,
  nutriente_id smallint not null references public.nutri_nutrientes(id),
  primary key (sistema, id_externo)
);
create table if not exists public.nutri_importaciones (
  id            uuid primary key,
  fuente_id     text not null references public.nutri_fuentes(id),
  version       text not null,
  archivo       text, sha256 text, origen text,
  por           uuid default auth.uid(),
  iniciado      timestamptz not null default now(),
  terminado     timestamptz,
  estado        text not null default 'en_curso' check (estado in ('en_curso','completa','con_errores','cancelada')),
  partes        int, recibidos int not null default 0, insertados int not null default 0, actualizados int not null default 0,
  omitidos      int not null default 0, rechazados int not null default 0,
  errores       jsonb not null default '[]'::jsonb
);
create table if not exists public.nutri_importacion_partes (
  importacion_id uuid not null references public.nutri_importaciones(id) on delete cascade,
  parte          int not null,
  recibidos int not null default 0, insertados int not null default 0, actualizados int not null default 0, omitidos int not null default 0, rechazados int not null default 0,
  errores        jsonb not null default '[]'::jsonb,
  hecho          timestamptz not null default now(),
  primary key (importacion_id, parte)
);
create table if not exists public.nutri_alimentos (
  id                  uuid primary key,             -- estable: para USDA se deriva de su fdcId
  fuente_id           text not null references public.nutri_fuentes(id),
  id_externo          text,                         -- fdcId, código de barras…
  version             text,                         -- versión de la fuente de este registro
  ids                 jsonb not null default '{}'::jsonb,
  coach_id            uuid references auth.users(id) on delete cascade,   -- null = referencia compartida
  nombre              text not null,
  nombre_original     text not null,
  idioma_original     text,
  nombre_traducido    boolean not null default false,
  sinonimos           text[] not null default '{}',
  categoria           text, categoria_original text,
  marca               text, codigo_barras text,
  tipo                text not null check (tipo in ('generico','comercial','personalizado')),
  tipo_registro       text,
  preparacion         text not null default 'no_indicado',
  preparacion_detalle text[] not null default '{}',
  base                text not null default '100 g de parte comestible',
  publicado           date,
  historico           boolean not null default false,
  calidad             text not null check (calidad in ('oficial_analitico','referencia','etiqueta','colaborativo','personalizado')),
  completitud         smallint, completitud_de smallint,
  sospechosos         text[] not null default '{}',
  revision            text not null default 'importado' check (revision in ('importado','revisado','marcado')),
  energia_ref         text,
  ref_url             text,
  autor               text,
  busqueda            text not null,
  huella              text,
  importacion_id      uuid references public.nutri_importaciones(id) on delete set null,
  creado              timestamptz not null default now(),
  actualizado         timestamptz not null default now()
);
create unique index if not exists nutri_alimentos_externo on public.nutri_alimentos
  (fuente_id, id_externo, coalesce(coach_id, '00000000-0000-0000-0000-000000000000'::uuid)) where id_externo is not null;
create index if not exists nutri_alimentos_barras on public.nutri_alimentos (codigo_barras) where codigo_barras is not null;
create index if not exists nutri_alimentos_coach on public.nutri_alimentos (coach_id) where coach_id is not null;
create table if not exists public.nutri_valores (
  alimento_id     uuid not null references public.nutri_alimentos(id) on delete cascade,
  nutriente_id    smallint not null references public.nutri_nutrientes(id),
  cantidad        double precision,                 -- por la base del alimento (100 g); null = la fuente no da número
  estado          text not null check (estado in ('analitico','calculado','imputado','etiqueta','fabricante','cero_asumido','cero_publicado','cero_calculado','sin_codigo','sin_valor','colaborativo','personalizado')),
  metodo          text,                             -- código y descripción de derivación de la fuente
  id_externo      text,                             -- id del nutriente en la fuente
  unidad_original text,                             -- solo si se escribía distinto
  n               int, minimo double precision, maximo double precision, mediana double precision,
  nota            text,
  primary key (alimento_id, nutriente_id),
  -- el carbohidrato "por diferencia" puede publicarse negativo (USDA lo hace): se guarda tal cual y se marca como sospechoso
  constraint nutri_valores_cantidad check (cantidad is null or cantidad >= 0 or nutriente_id in (11, 12))
);
create table if not exists public.nutri_porciones (
  alimento_id uuid not null references public.nutri_alimentos(id) on delete cascade,
  orden       int not null,
  descripcion text not null, original text,
  gramos      double precision not null check (gramos > 0),
  primary key (alimento_id, orden)
);
create table if not exists public.nutri_historial (
  id          bigint generated always as identity primary key,
  alimento_id uuid not null,
  fecha       timestamptz not null default now(),
  por         uuid default auth.uid(),
  motivo      text not null,
  antes       jsonb, despues jsonb
);
create index if not exists nutri_historial_alim on public.nutri_historial (alimento_id, fecha desc);
create table if not exists public.nutri_admin (
  user_id uuid primary key references auth.users(id) on delete cascade,
  desde   timestamptz not null default now()
);
-- datos de cada asesorado
create table if not exists public.nutri_planes (
  id           uuid primary key,                    -- = asesorado_id
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null unique references public.asesorados(id) on delete cascade,
  objetivos    jsonb not null default '{}'::jsonb,
  plan         jsonb,
  actualizado  timestamptz not null default now(),
  check (id = asesorado_id)
);
create table if not exists public.nutri_recetas (
  id           uuid primary key,
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid references public.asesorados(id) on delete cascade,
  nombre       text not null,
  porciones    numeric not null default 1 check (porciones > 0),
  comida       text,
  ingredientes jsonb not null default '[]'::jsonb,  -- [{ alimento_id, nombre, gramos }]
  nota         text,
  creado       timestamptz not null default now(),
  actualizado  timestamptz not null default now()
);
create index if not exists nutri_recetas_ases on public.nutri_recetas (asesorado_id);
create table if not exists public.nutri_registros (
  id           uuid primary key,
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null references public.asesorados(id) on delete cascade,
  fecha        date not null,
  comida       smallint not null default 0 check (comida between 0 and 9),
  tipo         text not null check (tipo in ('alimento','receta','plan','agua','sal')),
  nombre       text not null,
  alimento_id  uuid, receta_id uuid,
  gramos       double precision check (gramos is null or (gramos >= 0 and gramos <= 5000)),
  cantidad     double precision,
  ml           double precision check (ml is null or (ml >= 0 and ml <= 5000)),
  nutrientes   jsonb not null default '{}'::jsonb,   -- instantánea calculada al registrar
  desconocidos text[] not null default '{}',
  detalle      jsonb not null default '{}'::jsonb,
  origen       text not null default 'asesorado',
  creado       timestamptz not null default now()
);
create index if not exists nutri_registros_dia on public.nutri_registros (asesorado_id, fecha);
-- comidas y días que el asesorado guarda para repetirlos otro día (copia de sus registros, sin fecha)
create table if not exists public.nutri_guardados (
  id           uuid primary key,
  coach_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  asesorado_id uuid not null references public.asesorados(id) on delete cascade,
  tipo         text not null check (tipo in ('comida','dia')),
  nombre       text not null check (length(nombre) between 1 and 80),
  comida       smallint check (comida is null or comida between 0 and 9),
  items        jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 60),
  creado       timestamptz not null default now()
);
create index if not exists nutri_guardados_ases on public.nutri_guardados (asesorado_id);

drop trigger if exists nutri_alimentos_tocar on public.nutri_alimentos;
create trigger nutri_alimentos_tocar before update on public.nutri_alimentos for each row execute function public.tocar_actualizado();
drop trigger if exists nutri_planes_tocar on public.nutri_planes;
create trigger nutri_planes_tocar before update on public.nutri_planes for each row execute function public.tocar_actualizado();
drop trigger if exists nutri_recetas_tocar on public.nutri_recetas;
create trigger nutri_recetas_tocar before update on public.nutri_recetas for each row execute function public.tocar_actualizado();

-- búsqueda rápida por texto (si el servidor tiene pg_trgm)
do $$ declare esq text; begin
  begin create extension if not exists pg_trgm; exception when others then null; end;
  select n.nspname into esq from pg_extension e join pg_namespace n on n.oid = e.extnamespace where e.extname = 'pg_trgm';
  if esq is not null then
    execute format('create index if not exists nutri_alimentos_busqueda_trgm on public.nutri_alimentos using gin (busqueda %I.gin_trgm_ops)', esq);
  end if;
end $$;

-- ---------- catálogo y fuentes ----------
-- >>> catálogo generado (scripts/nutricion/sql-catalogo.mjs)
insert into public.nutri_fuentes (id, nombre, organizacion, evidencia, estado, url, licencia, licencia_url, atribucion, nota, historico) values
  ('usda_foundation', 'USDA FoodData Central · Foundation Foods', 'U.S. Department of Agriculture, Agricultural Research Service', 'analitico', 'integrada', 'https://fdc.nal.usda.gov/', 'CC0 1.0 (dominio público)', 'https://creativecommons.org/publicdomain/zero/1.0/', 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central. fdc.nal.usda.gov.', 'Análisis de laboratorio de muestras identificadas, con número de muestras, mínimo, máximo y mediana. Pocos alimentos, los mejor documentados.', false),
  ('usda_sr_legacy', 'USDA FoodData Central · SR Legacy (abril 2018)', 'U.S. Department of Agriculture, Agricultural Research Service', 'referencia', 'integrada', 'https://fdc.nal.usda.gov/', 'CC0 1.0 (dominio público)', 'https://creativecommons.org/publicdomain/zero/1.0/', 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: SR Legacy, 2018. fdc.nal.usda.gov.', 'Colección histórica: la última versión es de 2018 y ya no se actualiza. Mezcla datos analíticos, calculados e imputados; cada valor dice cuál es.', true),
  ('usda_fndds', 'USDA FoodData Central · FNDDS 2021-2023', 'U.S. Department of Agriculture, Agricultural Research Service', 'referencia', 'integrada', 'https://fdc.nal.usda.gov/', 'CC0 1.0 (dominio público)', 'https://creativecommons.org/publicdomain/zero/1.0/', 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: Food and Nutrient Database for Dietary Studies 2021-2023. fdc.nal.usda.gov.', 'Alimentos y bebidas tal como se consumen (encuesta WWEIA/NHANES) con pesos de porciones. Valores calculados por USDA a partir de los ingredientes.', false),
  ('usda_branded', 'USDA FoodData Central · Branded Foods', 'USDA / Global Branded Food Products Database', 'etiqueta', 'preparada', 'https://fdc.nal.usda.gov/', 'CC0 1.0 (dominio público)', 'https://creativecommons.org/publicdomain/zero/1.0/', 'U.S. Department of Agriculture, Agricultural Research Service. FoodData Central: Branded Foods. fdc.nal.usda.gov.', 'Datos de etiquetas de productos de EE. UU. Pesa varios GB: no se importa completo. Se puede consultar por la API con una clave de api.data.gov guardada en el servidor (FDC_API_KEY).', false),
  ('off', 'Open Food Facts', 'Open Food Facts (asociación sin fines de lucro, Francia)', 'colaborativo', 'en_linea', 'https://world.openfoodfacts.org/', 'ODbL 1.0 (base de datos) · DbCL 1.0 (contenido) · imágenes CC BY-SA', 'https://world.openfoodfacts.org/terms-of-use', 'Datos de Open Food Facts (openfoodfacts.org), disponibles bajo la Open Database License (ODbL).', 'Datos colaborativos de etiquetas, sin verificar. Solo se guardan los productos que alguien elige; si se redistribuye una extracción sustancial, la base derivada debe compartirse bajo ODbL.', false),
  ('ciqual', 'CIQUAL (ANSES, Francia)', 'Agence nationale de sécurité sanitaire (ANSES)', 'referencia', 'preparada', 'https://ciqual.anses.fr/', 'Por verificar antes de importar (licencia abierta Etalab según ANSES)', 'https://ciqual.anses.fr/', null, 'Carbohidratos "disponibles" (sin fibra, convención europea) y energía con factores de la UE: no se mezclan con los de USDA.', false),
  ('bedca', 'BEDCA (España)', 'Red BEDCA / AESAN', 'referencia', 'preparada', 'https://www.bedca.net/', 'Por verificar antes de importar (condiciones de uso propias de BEDCA)', 'https://www.bedca.net/', null, 'Nombres en español. Revisar condiciones de reutilización comercial antes de importar.', false),
  ('bls', 'BLS · Bundeslebensmittelschlüssel (Alemania)', 'Max Rubner-Institut', 'referencia', 'preparada', 'https://blsdb.de/download', 'Por verificar antes de importar', 'https://blsdb.de/download', null, 'Convenciones europeas de carbohidratos y energía.', false),
  ('coach', 'Alimento personalizado', 'El coach', 'personalizado', 'integrada', null, 'Datos propios del coach', null, null, 'Escrito a mano. No está verificado por ninguna fuente oficial.', false)
on conflict (id) do update set nombre = excluded.nombre, organizacion = excluded.organizacion, evidencia = excluded.evidencia, estado = excluded.estado, url = excluded.url,
  licencia = excluded.licencia, licencia_url = excluded.licencia_url, atribucion = excluded.atribucion, nota = excluded.nota, historico = excluded.historico;
insert into public.nutri_nutrientes (id, codigo, nombre, unidad, grupo, definicion, orden) values
  (1, 'energia_kcal', 'Energía', 'kcal', 'energia', 'Energía publicada por la fuente. En SR Legacy y FNDDS se calculó con los factores de Atwater que USDA asignó a cada alimento.', 1),
  (2, 'energia_atwater_especifica_kcal', 'Energía (Atwater específicos)', 'kcal', 'energia', 'USDA FDC: energía metabolizable con factores de Atwater específicos del alimento (Handbook 74).', 2),
  (3, 'energia_atwater_general_kcal', 'Energía (Atwater generales)', 'kcal', 'energia', 'USDA FDC: energía metabolizable con factores generales 4 (proteína), 9 (grasa) y 4 (carbohidrato).', 3),
  (4, 'energia_kj', 'Energía (kJ)', 'kJ', 'energia', 'Energía en kilojulios publicada por la fuente.', 4),
  (10, 'proteina', 'Proteína', 'g', 'macro', 'Proteína (nitrógeno × factor de conversión del alimento).', 10),
  (11, 'carbohidratos_diferencia', 'Carbohidratos (por diferencia)', 'g', 'macro', 'Convención de EE. UU.: 100 − (agua + proteína + grasa + cenizas + alcohol). INCLUYE la fibra.', 11),
  (12, 'carbohidratos_suma', 'Carbohidratos (por suma)', 'g', 'macro', 'USDA Foundation: suma de azúcares, almidón y fibra analizados.', 12),
  (13, 'carbohidratos_etiqueta', 'Carbohidratos (etiqueta)', 'g', 'macro', 'Lo que declara la etiqueta. En la Unión Europea excluye la fibra; en EE. UU. la incluye. Open Food Facts no siempre indica cuál.', 13),
  (14, 'grasa_total', 'Grasa total', 'g', 'macro', 'Lípidos totales.', 14),
  (15, 'grasa_nlea', 'Grasa total (NLEA)', 'g', 'macro', 'USDA Foundation: grasa como suma de ácidos grasos expresados como triglicéridos (definición de etiquetado NLEA).', 15),
  (16, 'fibra_total', 'Fibra alimentaria', 'g', 'macro', 'Fibra dietética total.', 16),
  (17, 'fibra_aoac_2011_25', 'Fibra (AOAC 2011.25)', 'g', 'macro', 'USDA Foundation: fibra total por el método AOAC 2011.25 (incluye fibra de bajo peso molecular).', 17),
  (18, 'agua', 'Agua', 'g', 'macro', null, 18),
  (19, 'alcohol', 'Alcohol', 'g', 'macro', 'Alcohol etílico (OFF lo declara en % vol: no se convierte).', 19),
  (30, 'azucares_totales', 'Azúcares totales', 'g', 'componente', null, 30),
  (31, 'azucares_totales_nlea', 'Azúcares totales (NLEA)', 'g', 'componente', 'USDA Foundation: suma de mono y disacáridos analizados (definición NLEA).', 31),
  (32, 'azucares_anadidos', 'Azúcares añadidos', 'g', 'componente', null, 32),
  (33, 'almidon', 'Almidón', 'g', 'componente', null, 33),
  (34, 'grasa_saturada', 'Grasa saturada', 'g', 'componente', null, 34),
  (35, 'grasa_monoinsaturada', 'Grasa monoinsaturada', 'g', 'componente', null, 35),
  (36, 'grasa_poliinsaturada', 'Grasa poliinsaturada', 'g', 'componente', null, 36),
  (37, 'grasa_trans', 'Grasa trans', 'g', 'componente', null, 37),
  (38, 'colesterol', 'Colesterol', 'mg', 'componente', null, 38),
  (39, 'sodio', 'Sodio', 'mg', 'componente', null, 39),
  (40, 'sal', 'Sal', 'g', 'componente', 'Sal declarada por la fuente. Si no la declara, la app la calcula como sodio × 2,5 (Reglamento UE 1169/2011, anexo I) y lo indica.', 40),
  (41, 'epa', 'Omega 3 EPA', 'g', 'componente', 'PUFA 20:5 n-3 (EPA).', 41),
  (42, 'dha', 'Omega 3 DHA', 'g', 'componente', 'PUFA 22:6 n-3 (DHA).', 42),
  (43, 'ala', 'Omega 3 ALA', 'g', 'componente', 'PUFA 18:3 n-3 c,c,c (ácido alfa-linolénico).', 43),
  (44, 'cafeina', 'Cafeína', 'mg', 'componente', null, 44),
  (60, 'calcio', 'Calcio', 'mg', 'mineral', null, 60),
  (61, 'hierro', 'Hierro', 'mg', 'mineral', null, 61),
  (62, 'magnesio', 'Magnesio', 'mg', 'mineral', null, 62),
  (63, 'fosforo', 'Fósforo', 'mg', 'mineral', null, 63),
  (64, 'potasio', 'Potasio', 'mg', 'mineral', null, 64),
  (65, 'zinc', 'Zinc', 'mg', 'mineral', null, 65),
  (66, 'cobre', 'Cobre', 'mg', 'mineral', null, 66),
  (67, 'manganeso', 'Manganeso', 'mg', 'mineral', null, 67),
  (68, 'selenio', 'Selenio', 'µg', 'mineral', null, 68),
  (69, 'yodo', 'Yodo', 'µg', 'mineral', null, 69),
  (80, 'vitamina_a_rae', 'Vitamina A (RAE)', 'µg', 'vitamina', 'Equivalentes de actividad de retinol.', 80),
  (81, 'retinol', 'Retinol', 'µg', 'vitamina', null, 81),
  (82, 'beta_caroteno', 'Betacaroteno', 'µg', 'vitamina', null, 82),
  (83, 'vitamina_a_ui', 'Vitamina A (UI)', 'UI', 'vitamina', 'Unidades internacionales. No se convierten a µg: el factor depende de la forma (retinol o carotenoides).', 83),
  (84, 'vitamina_c', 'Vitamina C', 'mg', 'vitamina', null, 84),
  (85, 'vitamina_d', 'Vitamina D (D2 + D3)', 'µg', 'vitamina', null, 85),
  (86, 'vitamina_d_ui', 'Vitamina D (UI)', 'UI', 'vitamina', 'Unidades internacionales tal como las publica la fuente (1 UI = 0,025 µg).', 86),
  (87, 'vitamina_e', 'Vitamina E (alfa-tocoferol)', 'mg', 'vitamina', null, 87),
  (88, 'vitamina_k1', 'Vitamina K (filoquinona)', 'µg', 'vitamina', null, 88),
  (89, 'vitamina_k2_mk4', 'Vitamina K2 (menaquinona-4)', 'µg', 'vitamina', null, 89),
  (90, 'tiamina', 'Tiamina (B1)', 'mg', 'vitamina', null, 90),
  (91, 'riboflavina', 'Riboflavina (B2)', 'mg', 'vitamina', null, 91),
  (92, 'niacina', 'Niacina (B3)', 'mg', 'vitamina', null, 92),
  (93, 'acido_pantotenico', 'Ácido pantoténico (B5)', 'mg', 'vitamina', null, 93),
  (94, 'vitamina_b6', 'Vitamina B6', 'mg', 'vitamina', null, 94),
  (95, 'biotina', 'Biotina (B7)', 'µg', 'vitamina', null, 95),
  (96, 'folato_total', 'Folato total', 'µg', 'vitamina', 'Folato de los alimentos + ácido fólico, en masa (sin ajustar por biodisponibilidad).', 96),
  (97, 'folato_dfe', 'Folato (DFE)', 'µg', 'vitamina', 'Equivalentes dietéticos de folato: corrige por la mayor absorción del ácido fólico.', 97),
  (98, 'folato_alimentario', 'Folato de los alimentos', 'µg', 'vitamina', null, 98),
  (99, 'acido_folico', 'Ácido fólico (añadido)', 'µg', 'vitamina', null, 99),
  (100, 'folato_5mthf', '5-metiltetrahidrofolato', 'µg', 'vitamina', null, 100),
  (101, 'vitamina_b12', 'Vitamina B12', 'µg', 'vitamina', null, 101),
  (102, 'colina', 'Colina', 'mg', 'vitamina', null, 102)
on conflict (id) do update set codigo = excluded.codigo, nombre = excluded.nombre, unidad = excluded.unidad, grupo = excluded.grupo, definicion = excluded.definicion, orden = excluded.orden;
insert into public.nutri_nutriente_fuente (sistema, id_externo, nutriente_id) values
  ('usda', '1008', 1),
  ('off', 'energy-kcal', 1),
  ('usda', '2048', 2),
  ('usda', '2047', 3),
  ('usda', '1062', 4),
  ('off', 'energy-kj', 4),
  ('usda', '1003', 10),
  ('off', 'proteins', 10),
  ('usda', '1005', 11),
  ('usda', '1050', 12),
  ('off', 'carbohydrates', 13),
  ('usda', '1004', 14),
  ('off', 'fat', 14),
  ('usda', '1085', 15),
  ('usda', '1079', 16),
  ('off', 'fiber', 16),
  ('usda', '2033', 17),
  ('usda', '1051', 18),
  ('usda', '1018', 19),
  ('off', 'alcohol', 19),
  ('usda', '2000', 30),
  ('off', 'sugars', 30),
  ('usda', '1063', 31),
  ('usda', '1235', 32),
  ('off', 'added-sugars', 32),
  ('usda', '1009', 33),
  ('off', 'starch', 33),
  ('usda', '1258', 34),
  ('off', 'saturated-fat', 34),
  ('usda', '1292', 35),
  ('off', 'monounsaturated-fat', 35),
  ('usda', '1293', 36),
  ('off', 'polyunsaturated-fat', 36),
  ('usda', '1257', 37),
  ('off', 'trans-fat', 37),
  ('usda', '1253', 38),
  ('off', 'cholesterol', 38),
  ('usda', '1093', 39),
  ('off', 'sodium', 39),
  ('off', 'salt', 40),
  ('usda', '1278', 41),
  ('usda', '1272', 42),
  ('usda', '1404', 43),
  ('usda', '1057', 44),
  ('off', 'caffeine', 44),
  ('usda', '1087', 60),
  ('off', 'calcium', 60),
  ('usda', '1089', 61),
  ('off', 'iron', 61),
  ('usda', '1090', 62),
  ('off', 'magnesium', 62),
  ('usda', '1091', 63),
  ('off', 'phosphorus', 63),
  ('usda', '1092', 64),
  ('off', 'potassium', 64),
  ('usda', '1095', 65),
  ('off', 'zinc', 65),
  ('usda', '1098', 66),
  ('off', 'copper', 66),
  ('usda', '1101', 67),
  ('off', 'manganese', 67),
  ('usda', '1103', 68),
  ('off', 'selenium', 68),
  ('usda', '1100', 69),
  ('off', 'iodine', 69),
  ('usda', '1106', 80),
  ('usda', '1105', 81),
  ('usda', '1107', 82),
  ('usda', '1104', 83),
  ('usda', '1162', 84),
  ('off', 'vitamin-c', 84),
  ('usda', '1114', 85),
  ('off', 'vitamin-d', 85),
  ('usda', '1110', 86),
  ('usda', '1109', 87),
  ('off', 'vitamin-e', 87),
  ('usda', '1185', 88),
  ('off', 'vitamin-k', 88),
  ('usda', '1183', 89),
  ('usda', '1165', 90),
  ('off', 'vitamin-b1', 90),
  ('usda', '1166', 91),
  ('off', 'vitamin-b2', 91),
  ('usda', '1167', 92),
  ('off', 'vitamin-pp', 92),
  ('usda', '1170', 93),
  ('off', 'pantothenic-acid', 93),
  ('usda', '1175', 94),
  ('off', 'vitamin-b6', 94),
  ('usda', '1176', 95),
  ('off', 'biotin', 95),
  ('usda', '1177', 96),
  ('usda', '1190', 97),
  ('usda', '1187', 98),
  ('usda', '1186', 99),
  ('off', 'folates', 99),
  ('usda', '1188', 100),
  ('usda', '1178', 101),
  ('off', 'vitamin-b12', 101),
  ('usda', '1180', 102)
on conflict (sistema, id_externo) do update set nutriente_id = excluded.nutriente_id;
-- <<< fin del catálogo generado

-- ---------- seguridad ----------
alter table public.nutri_fuentes enable row level security;
alter table public.nutri_nutrientes enable row level security;
alter table public.nutri_nutriente_fuente enable row level security;
alter table public.nutri_importaciones enable row level security;
alter table public.nutri_importacion_partes enable row level security;
alter table public.nutri_alimentos enable row level security;
alter table public.nutri_valores enable row level security;
alter table public.nutri_porciones enable row level security;
alter table public.nutri_historial enable row level security;
alter table public.nutri_admin enable row level security;
alter table public.nutri_planes enable row level security;
alter table public.nutri_recetas enable row level security;
alter table public.nutri_registros enable row level security;
alter table public.nutri_guardados enable row level security;
-- la referencia se lee, nunca se escribe directo (solo por las funciones de importación y de guardado)
revoke insert, update, delete, truncate on public.nutri_fuentes, public.nutri_nutrientes, public.nutri_nutriente_fuente, public.nutri_importaciones,
  public.nutri_importacion_partes, public.nutri_alimentos, public.nutri_valores, public.nutri_porciones, public.nutri_historial, public.nutri_admin from anon, authenticated;
revoke all on public.nutri_admin, public.nutri_importaciones, public.nutri_importacion_partes, public.nutri_historial, public.nutri_planes, public.nutri_recetas, public.nutri_registros, public.nutri_guardados from anon;
grant select on public.nutri_fuentes, public.nutri_nutrientes, public.nutri_nutriente_fuente, public.nutri_alimentos, public.nutri_valores, public.nutri_porciones to anon, authenticated;
grant select on public.nutri_importaciones, public.nutri_importacion_partes, public.nutri_historial to authenticated;
grant select, insert, update, delete on public.nutri_planes, public.nutri_recetas, public.nutri_registros, public.nutri_guardados to authenticated;

drop policy if exists nutri_leer_fuentes on public.nutri_fuentes;
create policy nutri_leer_fuentes on public.nutri_fuentes for select using (true);
drop policy if exists nutri_leer_nutrientes on public.nutri_nutrientes;
create policy nutri_leer_nutrientes on public.nutri_nutrientes for select using (true);
drop policy if exists nutri_leer_nf on public.nutri_nutriente_fuente;
create policy nutri_leer_nf on public.nutri_nutriente_fuente for select using (true);
drop policy if exists nutri_leer_importaciones on public.nutri_importaciones;
create policy nutri_leer_importaciones on public.nutri_importaciones for select to authenticated using (true);
drop policy if exists nutri_leer_partes on public.nutri_importacion_partes;
create policy nutri_leer_partes on public.nutri_importacion_partes for select to authenticated using (true);
drop policy if exists nutri_leer_alimentos on public.nutri_alimentos;
create policy nutri_leer_alimentos on public.nutri_alimentos for select using (coach_id is null or coach_id = auth.uid());
drop policy if exists nutri_leer_valores on public.nutri_valores;
create policy nutri_leer_valores on public.nutri_valores for select using (exists (select 1 from public.nutri_alimentos a where a.id = alimento_id and (a.coach_id is null or a.coach_id = auth.uid())));
drop policy if exists nutri_leer_porciones on public.nutri_porciones;
create policy nutri_leer_porciones on public.nutri_porciones for select using (exists (select 1 from public.nutri_alimentos a where a.id = alimento_id and (a.coach_id is null or a.coach_id = auth.uid())));
drop policy if exists nutri_leer_historial on public.nutri_historial;
create policy nutri_leer_historial on public.nutri_historial for select to authenticated using (exists (select 1 from public.nutri_alimentos a where a.id = alimento_id and (a.coach_id is null or a.coach_id = auth.uid())));
drop policy if exists coach_nutri_planes on public.nutri_planes;
create policy coach_nutri_planes on public.nutri_planes for all to authenticated using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));
drop policy if exists coach_nutri_recetas on public.nutri_recetas;
create policy coach_nutri_recetas on public.nutri_recetas for all to authenticated using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and (asesorado_id is null or exists (select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid())));
drop policy if exists coach_nutri_registros on public.nutri_registros;
create policy coach_nutri_registros on public.nutri_registros for all to authenticated using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));
drop policy if exists coach_nutri_guardados on public.nutri_guardados;
create policy coach_nutri_guardados on public.nutri_guardados for all to authenticated using (coach_id = auth.uid())
  with check (coach_id = auth.uid() and exists (select 1 from public.asesorados a where a.id = asesorado_id and a.coach_id = auth.uid()));

-- ---------- funciones ----------
-- texto de búsqueda: minúsculas, sin tildes, solo letras y números (igual que normalizarBusqueda en la app)
create or replace function public.nutri_norm(t text) returns text language sql immutable as $$
  select trim(regexp_replace(translate(lower(coalesce(t, '')), 'áàäâãåéèëêíìïîóòöôõúùüûçñ', 'aaaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', ' ', 'g'))
$$;
-- palabras de la búsqueda sin artículos y en singular aproximado (huevos → huevo, frijoles → frijol)
create or replace function public.nutri_palabras(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(case when length(w) > 5 and w ~ '[^aeiou]es$' then left(w, -2) when length(w) > 3 and w ~ 's$' then left(w, -1) else w end), '{}')
  from unnest(string_to_array(public.nutri_norm(t), ' ')) w
  where w <> '' and w not in ('de','del','la','el','los','las','y','en','a','al','un','una','con','para','por')
$$;
-- "cruda" encuentra "crudo" (las fichas están en masculino) y "cocido" encuentra "cocida"
create or replace function public.nutri_otro_genero(w text) returns text language sql immutable as $$
  select case when length(w) >= 4 and w ~ 'a$' then left(w, -1) || 'o' when length(w) >= 4 and w ~ 'o$' then left(w, -1) || 'a' else w end
$$;
-- el mismo alimento en otra preparación: se comparan las palabras del nombre original sin las de preparación
-- (misma lista que clavesAlimento en src/lib/nutricion/clasificar.js)
create or replace function public.nutri_claves(t text) returns text[] language sql immutable as $$
  select coalesce(array_agg(distinct w), '{}') from unnest(string_to_array(
    regexp_replace(regexp_replace(public.nutri_norm(t), '\m(meat only|skinless|skin not eaten|without skin)\M', ' sinpiel ', 'g'), '\m(meat and skin|with skin|skin eaten)\M', ' conpiel ', 'g'), ' ')) w
  where length(w) > 2 and w <> all (string_to_array('raw cooked boiled roasted braised fried grilled baked steamed stewed broiled microwaved heated sauteed scrambled poached simmered toasted '
    || 'canned frozen dried dehydrated drained solids liquids with without salt salted unsalted added fat oil butter margarine from and the not only ready eat heat serve prepared '
    || 'unprepared uncooked dry pan deep reconstituted water pack packed nfs boneless broiler broilers fryer fryers meat', ' '))
$$;
create or replace function public.nutri_parecido(a text, b text) returns numeric language sql immutable as $$
  select case when cardinality(ka) = 0 or cardinality(kb) = 0 then 0
    else (select count(*) from unnest(ka) k where k = any (kb))::numeric / least(cardinality(ka), cardinality(kb)) end
  from (select public.nutri_claves(a) ka, public.nutri_claves(b) kb) z
$$;
-- quién mira: el coach del asesorado (por su enlace) o el coach con sesión
create or replace function public.nutri_coach(p_token text) returns uuid
language plpgsql stable security definer set search_path = public as $$
declare c uuid;
begin
  if p_token is not null and p_token <> '' then
    if length(p_token) < 16 then raise exception 'enlace no valido'; end if;
    select coach_id into c from public.asesorados where token = p_token and not archivado;
    if not found then raise exception 'enlace no valido'; end if;
    return c;
  end if;
  return auth.uid();
end $$;
create or replace function public.nutri_es_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and (exists (select 1 from public.nutri_admin where user_id = auth.uid()) or not exists (select 1 from public.nutri_admin))
$$;
-- principales por 100 g (misma prioridad que principalesPor100 en src/lib/nutricion/calculo.js)
create or replace function public.nutri_resumen(p_id uuid, p_energia text) returns jsonb
language sql stable security definer set search_path = public as $$
  with v as (select n.codigo, x.cantidad from public.nutri_valores x join public.nutri_nutrientes n on n.id = x.nutriente_id where x.alimento_id = p_id and x.cantidad is not null)
  select jsonb_build_object(
    'kcal', coalesce((select cantidad from v where codigo = p_energia), (select cantidad from v where codigo = 'energia_kcal'), (select cantidad from v where codigo = 'energia_atwater_especifica_kcal'),
                     (select cantidad from v where codigo = 'energia_atwater_general_kcal'), (select cantidad / 4.184 from v where codigo = 'energia_kj')),
    'proteina', (select cantidad from v where codigo = 'proteina'),
    'carbohidratos', coalesce((select cantidad from v where codigo = 'carbohidratos_diferencia'), (select cantidad from v where codigo = 'carbohidratos_etiqueta'), (select cantidad from v where codigo = 'carbohidratos_suma')),
    'grasa', coalesce((select cantidad from v where codigo = 'grasa_total'), (select cantidad from v where codigo = 'grasa_nlea')))
$$;

create or replace function public.nutri_buscar(p_q text, p_filtros jsonb default '{}'::jsonb, p_token text default null, p_limite int default 40)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare c uuid := public.nutri_coach(p_token); q text := public.nutri_norm(p_q); toks text[] := public.nutri_palabras(p_q);
  cod text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g'); lim int := least(greatest(coalesce(p_limite, 40), 1), 100); r jsonb; f jsonb := coalesce(p_filtros, '{}'::jsonb);
begin
  if coalesce(array_length(toks, 1), 0) = 0 and length(cod) < 8 then return '[]'::jsonb; end if;
  with base as (
    select a.id, a.nombre, a.nombre_original, a.fuente_id, a.calidad, a.tipo, a.preparacion, a.categoria, a.marca, a.codigo_barras, a.energia_ref, a.historico, a.publicado,
           a.base, a.sospechosos, a.version, a.coach_id,
      ( case when length(cod) >= 8 and a.codigo_barras = cod then 100 else 0 end
      + case when public.nutri_norm(a.nombre) = q then 30 when public.nutri_norm(a.nombre) like q || '%' then 18 else 0 end
      + case when exists (select 1 from unnest(a.sinonimos) s where public.nutri_norm(s) = q) then 28
             when exists (select 1 from unnest(a.sinonimos) s where public.nutri_norm(s) like q || '%') then 12 else 0 end
      + case when public.nutri_norm(a.nombre_original) like q || '%' then 3 else 0 end
      + case a.calidad when 'oficial_analitico' then 6 when 'personalizado' then 5 when 'referencia' then 4 when 'etiqueta' then 2 else 0 end
      + case when q ~ '(^| )(crud[oa]s?|raw)( |$)' and a.preparacion = 'crudo' then 10
             when q ~ '(^| )(cocid[oa]s?|hervid[oa]s?|cooked|boiled)( |$)' and a.preparacion in ('cocido','hervido','al_vapor','guisado') then 10
             when q ~ '(^| )(asad[oa]s?|parrilla|plancha|hornead[oa]s?)( |$)' and a.preparacion in ('asado','horneado') then 10
             when q ~ '(^| )(frit[oa]s?|fried)( |$)' and a.preparacion = 'frito' then 10
             when q ~ '(^| )(sec[oa]s?)( |$)' and a.preparacion in ('seco','deshidratado') then 10
             when a.preparacion in ('crudo','seco','no_indicado') then 2 else 0 end
      - case when a.historico then 1 else 0 end
      - case when a.categoria = 'Comidas preparadas' and coalesce(array_length(toks, 1), 0) <= 2 then 4 else 0 end
      - case when cardinality(a.sospechosos) > 0 then 3 else 0 end ) as puntos
    from public.nutri_alimentos a
    where (a.coach_id is null or a.coach_id = c)
      and ((length(cod) >= 8 and a.codigo_barras = cod)
           or (coalesce(array_length(toks, 1), 0) > 0 and not exists (select 1 from unnest(toks) t where position(t in a.busqueda) = 0 and position(public.nutri_otro_genero(t) in a.busqueda) = 0)))
      and (f->>'categoria' is null or a.categoria = f->>'categoria')
      and (f->>'fuente' is null or a.fuente_id = f->>'fuente')
      and (f->>'tipo' is null or a.tipo = f->>'tipo')
      and (f->>'preparacion' is null or a.preparacion = f->>'preparacion')
    order by puntos desc, length(a.nombre), a.nombre
    limit lim)
  select coalesce(jsonb_agg(jsonb_build_object('id', b.id, 'nombre', b.nombre, 'nombre_original', b.nombre_original, 'fuente', b.fuente_id, 'calidad', b.calidad, 'tipo', b.tipo,
           'preparacion', b.preparacion, 'categoria', b.categoria, 'marca', b.marca, 'codigo_barras', b.codigo_barras, 'historico', b.historico, 'publicado', b.publicado, 'version', b.version,
           'base', b.base, 'sospechosos', cardinality(b.sospechosos), 'propio', b.coach_id is not null, 'por100', public.nutri_resumen(b.id, b.energia_ref))
         order by b.puntos desc, length(b.nombre), b.nombre), '[]'::jsonb)
    into r from base b;
  return r;
end $$;

-- fichas compactas para calcular (las que usa el motor de la app)
create or replace function public.nutri_fichas(p_ids uuid[], p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c uuid := public.nutri_coach(p_token); r jsonb;
begin
  if coalesce(array_length(p_ids, 1), 0) > 300 then raise exception 'demasiados alimentos'; end if;
  select coalesce(jsonb_object_agg(a.id, jsonb_build_object('id', a.id, 'nombre', a.nombre, 'nombre_original', a.nombre_original, 'fuente', a.fuente_id, 'calidad', a.calidad, 'tipo', a.tipo,
           'preparacion', a.preparacion, 'base', a.base, 'energia_ref', a.energia_ref, 'historico', a.historico, 'publicado', a.publicado, 'version', a.version, 'marca', a.marca,
           'valores', coalesce((select jsonb_object_agg(n.codigo, jsonb_build_object('c', v.cantidad, 'e', v.estado)) from public.nutri_valores v join public.nutri_nutrientes n on n.id = v.nutriente_id where v.alimento_id = a.id), '{}'::jsonb),
           'porciones', coalesce((select jsonb_agg(jsonb_build_object('d', p.descripcion, 'g', p.gramos) order by p.orden) from public.nutri_porciones p where p.alimento_id = a.id), '[]'::jsonb))), '{}'::jsonb)
    into r from public.nutri_alimentos a where a.id = any(p_ids) and (a.coach_id is null or a.coach_id = c);
  return r;
end $$;

-- ficha completa con procedencia (para mostrar)
create or replace function public.nutri_ficha(p_id uuid, p_token text default null) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c uuid := public.nutri_coach(p_token); a public.nutri_alimentos; r jsonb;
begin
  select * into a from public.nutri_alimentos where id = p_id and (coach_id is null or coach_id = c);
  if not found then return null; end if;
  select to_jsonb(a) - 'busqueda' - 'coach_id' || jsonb_build_object(
    'propio', a.coach_id is not null,
    'fuente', (select to_jsonb(f) from public.nutri_fuentes f where f.id = a.fuente_id),
    'importacion', (select jsonb_build_object('version', i.version, 'archivo', i.archivo, 'sha256', i.sha256, 'terminado', i.terminado, 'iniciado', i.iniciado) from public.nutri_importaciones i where i.id = a.importacion_id),
    'valores', coalesce((select jsonb_agg(jsonb_build_object('codigo', n.codigo, 'nombre', n.nombre, 'unidad', n.unidad, 'grupo', n.grupo, 'definicion', n.definicion, 'cantidad', v.cantidad, 'estado', v.estado,
        'metodo', v.metodo, 'id_externo', v.id_externo, 'unidad_original', v.unidad_original, 'n', v.n, 'minimo', v.minimo, 'maximo', v.maximo, 'mediana', v.mediana, 'nota', v.nota) order by n.orden)
        from public.nutri_valores v join public.nutri_nutrientes n on n.id = v.nutriente_id where v.alimento_id = a.id), '[]'::jsonb),
    'porciones', coalesce((select jsonb_agg(jsonb_build_object('descripcion', p.descripcion, 'original', p.original, 'gramos', p.gramos) order by p.orden) from public.nutri_porciones p where p.alimento_id = a.id), '[]'::jsonb),
    'cambios', (select count(*) from public.nutri_historial h where h.alimento_id = a.id),
    'alternativas', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'nombre', o.nombre, 'preparacion', o.preparacion, 'fuente', o.fuente_id) order by o.par desc, o.pri desc, o.nombre)
        from (select y.* from (select x.id, x.nombre, x.preparacion, x.fuente_id, public.nutri_parecido(a.nombre_original, x.nombre_original) as par,
                case x.calidad when 'oficial_analitico' then 5 when 'referencia' then 4 when 'personalizado' then 3 when 'etiqueta' then 2 else 1 end as pri
              from public.nutri_alimentos x
              where x.id <> a.id and (x.coach_id is null or x.coach_id = c) and x.categoria is not distinct from a.categoria
                and public.nutri_norm(split_part(x.nombre_original, ',', 1)) = public.nutri_norm(split_part(a.nombre_original, ',', 1))
                and x.preparacion <> a.preparacion) y
              where y.par >= 0.75 order by y.par desc, y.pri desc limit 8) o), '[]'::jsonb))
  into r;
  return r;
end $$;

-- ---------- importación (solo el administrador de la base compartida) ----------
create or replace function public.nutri_importacion_iniciar(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := (p->>'id')::uuid; r jsonb;
begin
  if auth.uid() is null then raise exception 'necesitas iniciar sesion'; end if;
  if not public.nutri_es_admin() then raise exception 'solo el administrador de la base de alimentos puede importar'; end if;
  insert into public.nutri_admin (user_id) values (auth.uid()) on conflict do nothing;   -- el primero que importa queda como administrador
  if not exists (select 1 from public.nutri_fuentes where id = p->>'fuente' and evidencia in ('analitico','referencia','etiqueta')) then raise exception 'fuente no importable: %', p->>'fuente'; end if;
  insert into public.nutri_importaciones (id, fuente_id, version, archivo, sha256, origen, partes, recibidos)
  values (v_id, p->>'fuente', p->>'version', p->>'archivo', p->>'sha256', p->>'origen', (p->>'partes')::int, coalesce((p->>'recibidos')::int, 0))
  on conflict (id) do update set estado = case when nutri_importaciones.estado = 'cancelada' then 'en_curso' else nutri_importaciones.estado end;
  select to_jsonb(i) || jsonb_build_object('partes_hechas', coalesce((select jsonb_agg(parte order by parte) from public.nutri_importacion_partes where importacion_id = i.id), '[]'::jsonb))
    into r from public.nutri_importaciones i where i.id = v_id;
  return r;
end $$;

create or replace function public.nutri_importar_lote(p_importacion uuid, p_parte int, p_lote jsonb, p_forzar boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare imp public.nutri_importaciones; a jsonb; v_id uuid; ex public.nutri_alimentos; met jsonb := coalesce(p_lote->'metodos', '[]'::jsonb);
  ins int := 0; upd int := 0; omi int := 0; rec int := 0; errs jsonb := '[]'::jsonb; r jsonb;
begin
  if not public.nutri_es_admin() then raise exception 'solo el administrador de la base de alimentos puede importar'; end if;
  select * into imp from public.nutri_importaciones where id = p_importacion for update;
  if not found then raise exception 'importacion no encontrada'; end if;
  if p_lote->>'fuente' is distinct from imp.fuente_id or p_lote->>'version' is distinct from imp.version then raise exception 'el lote no corresponde a la importacion'; end if;
  if not coalesce(p_forzar, false) and exists (select 1 from public.nutri_importacion_partes where importacion_id = imp.id and parte = p_parte) then
    select to_jsonb(x) || jsonb_build_object('repetida', true) into r from public.nutri_importacion_partes x where importacion_id = imp.id and parte = p_parte;
    return r;
  end if;
  if jsonb_typeof(p_lote->'alimentos') <> 'array' or jsonb_array_length(p_lote->'alimentos') > 600 then raise exception 'lote no valido'; end if;
  for a in select * from jsonb_array_elements(p_lote->'alimentos') loop
    begin
      v_id := (a->>'id')::uuid;
      if coalesce(trim(a->>'nombre'), '') = '' or coalesce(trim(a->>'nombre_original'), '') = '' then raise exception 'sin nombre'; end if;
      if a->>'fuente' is distinct from imp.fuente_id then raise exception 'fuente distinta a la de la importacion'; end if;
      if jsonb_typeof(a->'valores') <> 'array' or jsonb_array_length(a->'valores') = 0 then raise exception 'sin valores'; end if;
      select * into ex from public.nutri_alimentos where id = v_id;
      if found and ex.coach_id is not null then raise exception 'el id es de un alimento personalizado'; end if;
      if found and ex.huella is not distinct from a->>'huella' and ex.version is not distinct from a->>'version' then omi := omi + 1; continue; end if;
      if found then
        insert into public.nutri_historial (alimento_id, motivo, antes, despues) values (v_id, format('actualización %s → %s', coalesce(ex.version, '?'), a->>'version'),
          jsonb_build_object('alimento', to_jsonb(ex) - 'busqueda', 'valores', (select jsonb_agg(to_jsonb(x) - 'alimento_id') from public.nutri_valores x where x.alimento_id = v_id)),
          jsonb_build_object('version', a->>'version', 'huella', a->>'huella', 'importacion', imp.id));
        delete from public.nutri_valores where alimento_id = v_id;
        delete from public.nutri_porciones where alimento_id = v_id;
        update public.nutri_alimentos set version = a->>'version', ids = coalesce(a->'ids', '{}'::jsonb), nombre = a->>'nombre', nombre_original = a->>'nombre_original',
          idioma_original = a->>'idioma_original', nombre_traducido = coalesce((a->>'nombre_traducido')::boolean, false),
          sinonimos = coalesce(array(select jsonb_array_elements_text(a->'sinonimos')), '{}'), categoria = a->>'categoria', categoria_original = a->>'categoria_original',
          marca = a->>'marca', codigo_barras = a->>'codigo_barras', tipo = a->>'tipo', tipo_registro = a->>'tipo_registro', preparacion = coalesce(a->>'preparacion', 'no_indicado'),
          preparacion_detalle = coalesce(array(select jsonb_array_elements_text(a->'preparacion_detalle')), '{}'), base = coalesce(a->>'base', base), publicado = (a->>'publicado')::date,
          historico = coalesce((a->>'historico')::boolean, false), calidad = a->>'calidad', completitud = (a->>'completitud')::smallint, completitud_de = (a->>'completitud_de')::smallint,
          sospechosos = coalesce(array(select jsonb_array_elements_text(a->'sospechosos')), '{}'), energia_ref = a->>'energia_ref', ref_url = a->>'ref_url', busqueda = a->>'busqueda',
          huella = a->>'huella', importacion_id = imp.id, revision = case when revision = 'revisado' then 'marcado' else revision end
        where id = v_id;
        upd := upd + 1;
      else
        insert into public.nutri_alimentos (id, fuente_id, id_externo, version, ids, nombre, nombre_original, idioma_original, nombre_traducido, sinonimos, categoria, categoria_original,
          marca, codigo_barras, tipo, tipo_registro, preparacion, preparacion_detalle, base, publicado, historico, calidad, completitud, completitud_de, sospechosos, energia_ref, ref_url,
          busqueda, huella, importacion_id)
        values (v_id, a->>'fuente', a->>'id_externo', a->>'version', coalesce(a->'ids', '{}'::jsonb), a->>'nombre', a->>'nombre_original', a->>'idioma_original',
          coalesce((a->>'nombre_traducido')::boolean, false), coalesce(array(select jsonb_array_elements_text(a->'sinonimos')), '{}'), a->>'categoria', a->>'categoria_original',
          a->>'marca', a->>'codigo_barras', a->>'tipo', a->>'tipo_registro', coalesce(a->>'preparacion', 'no_indicado'), coalesce(array(select jsonb_array_elements_text(a->'preparacion_detalle')), '{}'),
          coalesce(a->>'base', '100 g de parte comestible'), (a->>'publicado')::date, coalesce((a->>'historico')::boolean, false), a->>'calidad', (a->>'completitud')::smallint,
          (a->>'completitud_de')::smallint, coalesce(array(select jsonb_array_elements_text(a->'sospechosos')), '{}'), a->>'energia_ref', a->>'ref_url', a->>'busqueda', a->>'huella', imp.id);
        ins := ins + 1;
      end if;
      -- valores: [nutriente, cantidad, estado, método (índice), id externo, unidad original, n, mín, máx, mediana, nota]
      insert into public.nutri_valores (alimento_id, nutriente_id, cantidad, estado, metodo, id_externo, unidad_original, n, minimo, maximo, mediana, nota)
      select v_id, (e->>0)::smallint, (e->>1)::double precision, e->>2, case when jsonb_typeof(e->3) = 'number' then met->>((e->>3)::int) end,
             e->>4, e->>5, (e->>6)::int, (e->>7)::double precision, (e->>8)::double precision, (e->>9)::double precision, e->>10
      from jsonb_array_elements(a->'valores') e;
      insert into public.nutri_porciones (alimento_id, orden, descripcion, original, gramos)
      select v_id, o.ord, o.e->>0, o.e->>1, (o.e->>2)::double precision from jsonb_array_elements(coalesce(a->'porciones', '[]'::jsonb)) with ordinality o(e, ord);
    exception when others then
      rec := rec + 1;
      if jsonb_array_length(errs) < 50 then errs := errs || jsonb_build_array(coalesce(a->>'id_externo', a->>'id', '?') || ': ' || sqlerrm); end if;
    end;
  end loop;
  insert into public.nutri_importacion_partes (importacion_id, parte, recibidos, insertados, actualizados, omitidos, rechazados, errores)
  values (imp.id, p_parte, jsonb_array_length(p_lote->'alimentos'), ins, upd, omi, rec, errs)
  on conflict (importacion_id, parte) do update set recibidos = excluded.recibidos, insertados = excluded.insertados, actualizados = excluded.actualizados,
    omitidos = excluded.omitidos, rechazados = excluded.rechazados, errores = excluded.errores, hecho = now();
  update public.nutri_importaciones i set
    insertados = s.ins, actualizados = s.upd, omitidos = s.omi, rechazados = s.rec,
    errores = coalesce((select jsonb_agg(e) from (select jsonb_array_elements(errores) e from public.nutri_importacion_partes where importacion_id = i.id limit 100) z), '[]'::jsonb)
  from (select sum(insertados) ins, sum(actualizados) upd, sum(omitidos) omi, sum(rechazados) rec from public.nutri_importacion_partes where importacion_id = imp.id) s
  where i.id = imp.id;
  return jsonb_build_object('parte', p_parte, 'recibidos', jsonb_array_length(p_lote->'alimentos'), 'insertados', ins, 'actualizados', upd, 'omitidos', omi, 'rechazados', rec, 'errores', errs);
end $$;

create or replace function public.nutri_importacion_cerrar(p_importacion uuid, p_estado text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare r jsonb;
begin
  if not public.nutri_es_admin() then raise exception 'solo el administrador de la base de alimentos puede importar'; end if;
  update public.nutri_importaciones set terminado = now(),
    estado = coalesce(p_estado, case when rechazados > 0 then 'con_errores' else 'completa' end)
  where id = p_importacion;
  select to_jsonb(i) into r from public.nutri_importaciones i where id = p_importacion;
  return r;
end $$;

create or replace function public.nutri_estado() returns jsonb
language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'es_admin', public.nutri_es_admin(),
    'hay_admin', exists (select 1 from public.nutri_admin),
    'fuentes', (select jsonb_agg(jsonb_build_object('id', f.id, 'nombre', f.nombre, 'estado', f.estado, 'evidencia', f.evidencia, 'licencia', f.licencia, 'historico', f.historico,
        'alimentos', (select count(*) from public.nutri_alimentos a where a.fuente_id = f.id and a.coach_id is null),
        'version', (select max(version) from public.nutri_alimentos a where a.fuente_id = f.id and a.coach_id is null)) order by f.id) from public.nutri_fuentes f),
    'importaciones', (select coalesce(jsonb_agg(to_jsonb(i) - 'errores' order by i.iniciado desc), '[]'::jsonb) from (select * from public.nutri_importaciones order by iniciado desc limit 12) i),
    'propios', (select count(*) from public.nutri_alimentos where coach_id = auth.uid()))
$$;

-- ---------- alimentos personalizados y productos comerciales (Open Food Facts, USDA Branded) ----------
-- Nunca modifica un registro de referencia. Cada coach guarda su copia del producto que eligió.
-- Los cambios quedan en el historial.
create or replace function public.nutri_guardar_alimento(p jsonb, p_token text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c uuid := public.nutri_coach(p_token); asesorado boolean := p_token is not null and p_token <> ''; v_id uuid; ex public.nutri_alimentos;
  fte text := case when p->>'fuente' in ('off', 'usda_branded') then p->>'fuente' else 'coach' end; externo boolean; ext text;
  sin text[] := coalesce(array(select jsonb_array_elements_text(p->'sinonimos')), '{}'); antes jsonb; quien text;
begin
  externo := fte <> 'coach';
  if c is null then raise exception 'necesitas iniciar sesion'; end if;
  if coalesce(trim(p->>'nombre'), '') = '' then raise exception 'falta el nombre'; end if;
  if jsonb_typeof(p->'valores') <> 'array' or jsonb_array_length(p->'valores') = 0 then raise exception 'faltan los valores nutricionales'; end if;
  if asesorado and not externo then raise exception 'el asesorado solo puede agregar productos comerciales (Open Food Facts o USDA)'; end if;
  if exists (select 1 from jsonb_array_elements(p->'valores') e where (e->>'cantidad') is not null and ((e->>'cantidad')::double precision < 0 or (e->>'cantidad')::double precision > 100000)) then
    raise exception 'hay valores fuera de rango'; end if;
  quien := case when asesorado then 'asesorado: ' || coalesce((select nombre from public.asesorados where token = p_token), '?') else coalesce(p->>'autor', 'coach') end;
  if fte = 'off' then
    ext := p->>'codigo_barras'; if coalesce(ext, '') !~ '^\d{6,14}$' then raise exception 'codigo de barras no valido'; end if;
  elsif fte = 'usda_branded' then
    ext := p->>'id_externo'; if coalesce(ext, '') !~ '^\d{1,12}$' then raise exception 'fdcId no valido'; end if;
  end if;
  if externo then
    select * into ex from public.nutri_alimentos where fuente_id = fte and id_externo = ext and coach_id = c;
  elsif p->>'id' is not null then
    select * into ex from public.nutri_alimentos where id = (p->>'id')::uuid;
    if found and (ex.coach_id is null or ex.coach_id <> c) then raise exception 'no se puede modificar un registro de referencia: crea uno personalizado'; end if;
  end if;
  v_id := coalesce(ex.id, case when not externo then (p->>'id')::uuid end, gen_random_uuid());
  if ex.id is not null then
    antes := jsonb_build_object('alimento', to_jsonb(ex) - 'busqueda', 'valores', (select jsonb_agg(to_jsonb(x) - 'alimento_id') from public.nutri_valores x where x.alimento_id = ex.id));
    delete from public.nutri_valores where alimento_id = ex.id; delete from public.nutri_porciones where alimento_id = ex.id;
    update public.nutri_alimentos set nombre = p->>'nombre', nombre_original = coalesce(p->>'nombre_original', p->>'nombre'), sinonimos = sin, categoria = p->>'categoria',
      marca = p->>'marca', codigo_barras = p->>'codigo_barras', preparacion = coalesce(p->>'preparacion', 'no_indicado'), base = coalesce(p->>'base', base),
      version = p->>'version', publicado = (p->>'publicado')::date, sospechosos = coalesce(array(select jsonb_array_elements_text(p->'sospechosos')), '{}'),
      energia_ref = p->>'energia_ref', ref_url = p->>'ref_url', autor = quien,
      busqueda = public.nutri_norm(concat_ws(' ', p->>'nombre', p->>'nombre_original', p->>'marca', p->>'codigo_barras', array_to_string(sin, ' ')))
    where id = ex.id;
  else
    insert into public.nutri_alimentos (id, fuente_id, id_externo, version, coach_id, nombre, nombre_original, idioma_original, nombre_traducido, sinonimos, categoria, marca, codigo_barras, tipo,
      tipo_registro, preparacion, base, publicado, calidad, sospechosos, energia_ref, ref_url, autor, busqueda)
    values (v_id, fte, ext, p->>'version', c, p->>'nombre', coalesce(p->>'nombre_original', p->>'nombre'), p->>'idioma_original', coalesce((p->>'nombre_traducido')::boolean, false), sin,
      p->>'categoria', p->>'marca', p->>'codigo_barras', case when externo then 'comercial' else 'personalizado' end,
      case fte when 'off' then 'Open Food Facts' when 'usda_branded' then 'Branded' else 'Personalizado' end, coalesce(p->>'preparacion', 'no_indicado'), coalesce(p->>'base', '100 g'),
      (p->>'publicado')::date, case fte when 'off' then 'colaborativo' when 'usda_branded' then 'etiqueta' else 'personalizado' end,
      coalesce(array(select jsonb_array_elements_text(p->'sospechosos')), '{}'), p->>'energia_ref', p->>'ref_url', quien,
      public.nutri_norm(concat_ws(' ', p->>'nombre', p->>'nombre_original', p->>'marca', p->>'codigo_barras', array_to_string(sin, ' '))));
  end if;
  insert into public.nutri_valores (alimento_id, nutriente_id, cantidad, estado, metodo, id_externo, unidad_original)
  select v_id, n.id, (e->>'cantidad')::double precision,
         case fte when 'off' then 'colaborativo' when 'usda_branded' then 'etiqueta' else 'personalizado' end, e->>'metodo', e->>'id_externo', e->>'unidad_original'
  from jsonb_array_elements(p->'valores') e join public.nutri_nutrientes n on n.codigo = e->>'codigo';
  insert into public.nutri_porciones (alimento_id, orden, descripcion, original, gramos)
  select v_id, o.ord, o.e->>'descripcion', o.e->>'original', (o.e->>'gramos')::double precision from jsonb_array_elements(coalesce(p->'porciones', '[]'::jsonb)) with ordinality o(e, ord)
  where (o.e->>'gramos')::double precision > 0;
  insert into public.nutri_historial (alimento_id, motivo, antes, despues)
  values (v_id, case when ex.id is null then 'creado' else 'editado' end || case when asesorado then ' por el asesorado' else '' end, antes, p - 'busqueda');
  return public.nutri_fichas(array[v_id], p_token) -> v_id::text;
end $$;

-- ---------- el asesorado ----------
create or replace function public.atleta_nutri_cargar(p_token text, p_desde date, p_hasta date) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a public.asesorados; pl public.nutri_planes; ids uuid[]; r jsonb;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'enlace no valido'; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then raise exception 'enlace no valido'; end if;
  if p_hasta - p_desde > 62 then raise exception 'rango demasiado largo'; end if;
  select * into pl from public.nutri_planes where asesorado_id = a.id;
  ids := array(
    select distinct (x #>> '{}')::uuid from jsonb_path_query(coalesce(pl.plan, '{}'::jsonb), 'lax $.**.alimento_id') x
    where jsonb_typeof(x) = 'string' and (x #>> '{}') ~ '^[0-9a-f-]{36}$'
    union
    select distinct (i->>'alimento_id')::uuid from public.nutri_recetas rr, jsonb_array_elements(rr.ingredientes) i
    where rr.asesorado_id = a.id and (i->>'alimento_id') ~ '^[0-9a-f-]{36}$');
  select jsonb_build_object(
    'objetivos', coalesce(pl.objetivos, '{}'::jsonb), 'plan', pl.plan,
    'recetas', coalesce((select jsonb_agg(to_jsonb(rr) - 'coach_id' order by rr.nombre) from public.nutri_recetas rr where rr.asesorado_id = a.id), '[]'::jsonb),
    'registros', coalesce((select jsonb_agg(to_jsonb(g) - 'coach_id' order by g.fecha, g.comida, g.creado) from public.nutri_registros g
                           where g.asesorado_id = a.id and g.fecha between p_desde and p_hasta), '[]'::jsonb),
    'guardados', coalesce((select jsonb_agg(to_jsonb(gg) - 'coach_id' order by gg.creado desc) from public.nutri_guardados gg where gg.asesorado_id = a.id), '[]'::jsonb),
    'fichas', public.nutri_fichas(ids, p_token))
  into r;
  return r;
end $$;

create or replace function public.atleta_nutri_guardar(p_token text, p_registro jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.asesorados; v_id uuid := (p_registro->>'id')::uuid; f date := (p_registro->>'fecha')::date;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'enlace no valido'; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then raise exception 'enlace no valido'; end if;
  if f is null or f > current_date + 1 or f < current_date - 60 then raise exception 'fecha no valida'; end if;
  if jsonb_typeof(coalesce(p_registro->'nutrientes', '{}'::jsonb)) <> 'object' then raise exception 'nutrientes no validos'; end if;
  if exists (select 1 from jsonb_each(coalesce(p_registro->'nutrientes', '{}'::jsonb)) e where jsonb_typeof(e.value) <> 'number' or (e.value::text)::double precision < 0) then raise exception 'nutrientes no validos'; end if;
  if (select count(*) from jsonb_object_keys(coalesce(p_registro->'nutrientes', '{}'::jsonb))) > 120 then raise exception 'demasiados nutrientes'; end if;
  if exists (select 1 from public.nutri_registros where id = v_id and asesorado_id <> a.id) then raise exception 'registro ajeno'; end if;
  insert into public.nutri_registros (id, coach_id, asesorado_id, fecha, comida, tipo, nombre, alimento_id, receta_id, gramos, cantidad, ml, nutrientes, desconocidos, detalle, origen)
  values (v_id, a.coach_id, a.id, f, coalesce((p_registro->>'comida')::smallint, 0), p_registro->>'tipo', left(coalesce(p_registro->>'nombre', ''), 160),
    nullif(p_registro->>'alimento_id', '')::uuid, nullif(p_registro->>'receta_id', '')::uuid, (p_registro->>'gramos')::double precision, (p_registro->>'cantidad')::double precision,
    (p_registro->>'ml')::double precision, coalesce(p_registro->'nutrientes', '{}'::jsonb), coalesce(array(select jsonb_array_elements_text(p_registro->'desconocidos')), '{}'),
    coalesce(p_registro->'detalle', '{}'::jsonb), 'asesorado')
  on conflict (id) do update set fecha = excluded.fecha, comida = excluded.comida, nombre = excluded.nombre, gramos = excluded.gramos, cantidad = excluded.cantidad, ml = excluded.ml,
    nutrientes = excluded.nutrientes, desconocidos = excluded.desconocidos, detalle = excluded.detalle;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.atleta_nutri_borrar(p_token text, p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare a public.asesorados;
begin
  select * into a from public.asesorados where token = p_token and not archivado and length(p_token) >= 16;
  if not found then raise exception 'enlace no valido'; end if;
  delete from public.nutri_registros where id = p_id and asesorado_id = a.id;
  return found;
end $$;

-- guardar una comida o un día para repetirlo: se guarda lo que comió (con sus nutrientes ya calculados), sin fecha
create or replace function public.atleta_nutri_guardado_guardar(p_token text, p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare a public.asesorados; v_id uuid := (p->>'id')::uuid; it jsonb;
begin
  if p_token is null or length(p_token) < 16 then raise exception 'enlace no valido'; end if;
  select * into a from public.asesorados where token = p_token and not archivado;
  if not found then raise exception 'enlace no valido'; end if;
  if v_id is null then raise exception 'falta el id'; end if;
  if exists (select 1 from public.nutri_guardados where id = v_id and asesorado_id <> a.id) then raise exception 'guardado ajeno'; end if;
  if not exists (select 1 from public.nutri_guardados where id = v_id) and (select count(*) from public.nutri_guardados where asesorado_id = a.id) >= 60 then raise exception 'ya tienes 60 guardados: borra alguno'; end if;
  if jsonb_typeof(p->'items') <> 'array' or jsonb_array_length(p->'items') = 0 then raise exception 'nada que guardar'; end if;
  for it in select * from jsonb_array_elements(p->'items') loop
    if coalesce(it->>'tipo', '') not in ('alimento','receta','plan') then raise exception 'tipo no valido'; end if;
    if jsonb_typeof(coalesce(it->'nutrientes', '{}'::jsonb)) <> 'object'
       or exists (select 1 from jsonb_each(coalesce(it->'nutrientes', '{}'::jsonb)) e where jsonb_typeof(e.value) <> 'number' or (e.value::text)::double precision < 0) then raise exception 'nutrientes no validos'; end if;
  end loop;
  insert into public.nutri_guardados (id, coach_id, asesorado_id, tipo, nombre, comida, items)
  values (v_id, a.coach_id, a.id, p->>'tipo', left(btrim(coalesce(p->>'nombre', '')), 80), (p->>'comida')::smallint, p->'items')
  on conflict (id) do update set nombre = excluded.nombre, comida = excluded.comida, items = excluded.items;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

create or replace function public.atleta_nutri_guardado_borrar(p_token text, p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare a public.asesorados;
begin
  select * into a from public.asesorados where token = p_token and not archivado and length(p_token) >= 16;
  if not found then raise exception 'enlace no valido'; end if;
  delete from public.nutri_guardados where id = p_id and asesorado_id = a.id;
  return found;
end $$;

revoke all on function public.nutri_coach(text) from public;
revoke all on function public.nutri_importacion_iniciar(jsonb) from public;
revoke all on function public.nutri_importar_lote(uuid, int, jsonb, boolean) from public;
revoke all on function public.nutri_importacion_cerrar(uuid, text) from public;
grant execute on function public.nutri_importacion_iniciar(jsonb), public.nutri_importar_lote(uuid, int, jsonb, boolean), public.nutri_importacion_cerrar(uuid, text) to authenticated;
grant execute on function public.nutri_norm(text), public.nutri_palabras(text), public.nutri_otro_genero(text), public.nutri_claves(text), public.nutri_parecido(text, text), public.nutri_buscar(text, jsonb, text, int), public.nutri_fichas(uuid[], text), public.nutri_ficha(uuid, text),
  public.nutri_estado(), public.nutri_resumen(uuid, text), public.nutri_guardar_alimento(jsonb, text), public.atleta_nutri_cargar(text, date, date), public.atleta_nutri_guardar(text, jsonb),
  public.atleta_nutri_borrar(text, uuid), public.atleta_nutri_guardado_guardar(text, jsonb), public.atleta_nutri_guardado_borrar(text, uuid), public.nutri_es_admin() to anon, authenticated;

-- que la API de Supabase vea al instante las columnas y funciones nuevas
notify pgrst, 'reload schema';
