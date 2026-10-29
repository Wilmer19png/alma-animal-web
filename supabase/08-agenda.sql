-- Agenda, horarios y cierres. Se pega en Supabase → SQL Editor → Run (después de 01 a 07).
--
-- Dos carriles: "dra" (la doctora: consultas, vacunas, domicilios, cirugías) y "spa" (peluquería).
-- Dos citas confirmadas del mismo carril nunca se cruzan (lo impide la base de datos), salvo un sobrecupo.

create extension if not exists btree_gist;

-- ---------- CITAS ----------
create table if not exists public.citas (
  id             uuid primary key default gen_random_uuid(),
  paciente_id    uuid references public.pacientes (id) on delete set null,
  propietario_id uuid references public.propietarios (id) on delete set null,
  servicio       text not null check (servicio in ('consulta', 'vacuna', 'domicilio', 'radiografia', 'cirugia', 'spa')),
  carril         text not null check (carril in ('dra', 'spa')),
  inicio         timestamptz not null,
  fin            timestamptz not null check (fin > inicio),
  estado         text not null default 'confirmada' check (estado in ('solicitada', 'confirmada', 'atendida', 'no_vino', 'cancelada')),
  origen         text not null default 'consultorio' check (origen in ('consultorio', 'web', 'portal')),
  sobrecupo      boolean not null default false,
  nota           text check (nota is null or length(nota) <= 1000),
  direccion      text check (direccion is null or length(direccion) <= 200),  -- domicilios
  -- solicitudes de la web (todavía sin ficha): mascota, raza, peso, servicios, nombre y celular del propietario
  datos          jsonb not null default '{}' check (jsonb_typeof(datos) = 'object'),
  acepto_datos   boolean not null default true,
  version_politicas text,
  por            uuid default auth.uid(),
  por_nombre     text,
  creado         timestamptz not null default now(),
  actualizado    timestamptz not null default now(),
  -- dos citas confirmadas o atendidas del mismo carril no pueden cruzarse (a menos que sea sobrecupo)
  constraint citas_sin_cruces exclude using gist (carril with =, tstzrange(inicio, fin) with &&)
    where (estado in ('confirmada', 'atendida') and not sobrecupo)
);
create index if not exists citas_inicio_idx on public.citas (inicio);
create index if not exists citas_paciente_idx on public.citas (paciente_id, inicio desc);
drop trigger if exists citas_actualizado on public.citas;
create trigger citas_actualizado before update on public.citas for each row execute function public.marcar_actualizado();

-- ---------- CIERRES (días que no se atiende, además de los festivos) ----------
create table if not exists public.cierres (
  id      uuid primary key default gen_random_uuid(),
  fecha   date not null unique,
  nombre  text not null check (length(nombre) between 1 and 80)
);

-- ---------- AJUSTES: horario y duraciones (los lee la página, el formulario del spa y el portal) ----------
-- dias: lunes (0) a domingo (6); minutos desde la medianoche. tarde null = cerrado en la tarde.
insert into public.ajustes (clave, valor, publico) values
  ('horario', '{
     "dias": [
       {"abre": true,  "manana": [480, 750], "tarde": [840, 1020]},
       {"abre": true,  "manana": [480, 750], "tarde": [840, 1020]},
       {"abre": true,  "manana": [480, 750], "tarde": [840, 1020]},
       {"abre": true,  "manana": [480, 750], "tarde": [840, 1020]},
       {"abre": true,  "manana": [480, 750], "tarde": [840, 1020]},
       {"abre": true,  "manana": [480, 750], "tarde": null},
       {"abre": false, "manana": [480, 750], "tarde": null}
     ],
     "festivos": true
   }', true),
  ('duraciones', '{"consulta": 30, "vacuna": 30, "domicilio": 60, "radiografia": 30, "cirugia": 120, "spa": 120}', true)
on conflict (clave) do nothing;

-- ---------- REGLAS (RLS) ----------
alter table public.citas enable row level security;
alter table public.cierres enable row level security;

drop policy if exists "citas: equipo ve" on public.citas;
create policy "citas: equipo ve" on public.citas for select to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion']) or (public.tiene_rol(array['peluqueria']) and carril = 'spa'));
drop policy if exists "citas: equipo agenda" on public.citas;
create policy "citas: equipo agenda" on public.citas for insert to authenticated
  with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']) or (public.tiene_rol(array['peluqueria']) and carril = 'spa'));
drop policy if exists "citas: equipo cambia" on public.citas;
create policy "citas: equipo cambia" on public.citas for update to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion']) or (public.tiene_rol(array['peluqueria']) and carril = 'spa'))
  with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']) or (public.tiene_rol(array['peluqueria']) and carril = 'spa'));
-- la página solo puede dejar solicitudes de spa (quedan "solicitadas" hasta que el equipo las confirme)
drop policy if exists "citas: la web solicita spa" on public.citas;
create policy "citas: la web solicita spa" on public.citas for insert to anon
  with check (servicio = 'spa' and carril = 'spa' and estado = 'solicitada' and origen = 'web' and not sobrecupo
              and paciente_id is null and propietario_id is null and acepto_datos
              and inicio > now() and fin <= inicio + interval '4 hours');

drop policy if exists "cierres: todos ven" on public.cierres;
create policy "cierres: todos ven" on public.cierres for select using (true);
drop policy if exists "cierres: admin maneja" on public.cierres;
create policy "cierres: admin maneja" on public.cierres for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));

-- ---------- PERMISOS POR COLUMNA ----------
revoke all on public.citas, public.cierres from anon, authenticated;
grant insert (servicio, carril, inicio, fin, estado, origen, sobrecupo, datos, acepto_datos, version_politicas) on public.citas to anon;
grant select on public.citas to authenticated;
grant insert (paciente_id, propietario_id, servicio, carril, inicio, fin, estado, origen, sobrecupo, nota, direccion, datos, por_nombre)
  on public.citas to authenticated;
grant update (paciente_id, propietario_id, servicio, carril, inicio, fin, estado, sobrecupo, nota, direccion, datos)
  on public.citas to authenticated;
grant select on public.cierres to anon, authenticated;
grant insert, update, delete on public.cierres to authenticated;
-- el horario y las duraciones (tabla ajustes) ya los lee todo el mundo y solo los cambia la administradora
