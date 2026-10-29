-- Propietarios, pacientes e historia clínica. Se pega en Supabase → SQL Editor → Run (después de 01 a 06).
--
-- Permisos por rol:
--   administradora y veterinario/a: todo.
--   recepción: propietarios y pacientes completos; en la historia clínica ve todo y escribe notas, pesos y spa.
--   peluquería: ve propietarios y pacientes; en la historia clínica ve y escribe solo spa, pesos y notas.

-- celular colombiano normalizado (los últimos 10 dígitos) para unir pedidos y clientes
create or replace function public.cel_norm(c text) returns text
language sql immutable as $$ select right(regexp_replace(coalesce(c, ''), '\D', '', 'g'), 10) $$;

-- ---------- PROPIETARIOS ----------
create table if not exists public.propietarios (
  id            uuid primary key default gen_random_uuid(),
  nombre        text not null check (length(nombre) between 1 and 60),
  apellidos     text not null check (length(apellidos) between 1 and 80),
  doc_tipo      text check (doc_tipo is null or doc_tipo in ('CC', 'CE', 'PA', 'NIT', 'TI')),
  doc_numero    text check (doc_numero is null or length(doc_numero) <= 20),
  celular       text not null check (length(public.cel_norm(celular)) = 10),
  celular_norm  text generated always as (public.cel_norm(celular)) stored,
  correo        text check (correo is null or length(correo) <= 120),
  direccion     text check (direccion is null or length(direccion) <= 160),
  barrio        text check (barrio is null or length(barrio) <= 80),
  departamento  text check (departamento is null or length(departamento) <= 60),
  ciudad        text check (ciudad is null or length(ciudad) <= 80),
  fuente        text check (fuente is null or length(fuente) <= 40),        -- ¿cómo nos conoció?
  notas         text check (notas is null or length(notas) <= 1000),
  -- autorización de datos (Ley 1581): obligatoria; queda la fecha y quién la registró
  acepto_datos  boolean not null check (acepto_datos),
  acepto_fecha  timestamptz not null default now(),
  acepto_por    uuid default auth.uid(),
  -- portal de clientes (el envío del correo se activa con el módulo Portal)
  portal        text not null default 'sin_invitar' check (portal in ('sin_invitar', 'por_invitar', 'invitado', 'activo')),
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);
create index if not exists propietarios_cel_idx on public.propietarios (celular_norm);
create index if not exists propietarios_nombre_idx on public.propietarios (lower(apellidos), lower(nombre));

-- ---------- PACIENTES ----------
create table if not exists public.pacientes (
  id               uuid primary key default gen_random_uuid(),
  propietario_id   uuid not null references public.propietarios (id) on delete restrict,
  nombre           text not null check (length(nombre) between 1 and 40),
  especie          text not null check (especie in ('canino', 'felino', 'otro')),
  raza             text check (raza is null or length(raza) <= 60),
  color            text check (color is null or length(color) <= 60),
  sexo             text not null check (sexo in ('macho', 'hembra')),
  reproductivo     text check (reproductivo is null or reproductivo in ('entero', 'esterilizado')),
  nacimiento       date,
  edad_aprox       text check (edad_aprox is null or length(edad_aprox) <= 30),
  peso             numeric(5,2) check (peso is null or (peso > 0 and peso < 200)),
  microchip        text check (microchip is null or length(microchip) <= 30),
  alimento         text check (alimento is null or length(alimento) <= 120),
  alimento_cant    text check (alimento_cant is null or length(alimento_cant) <= 120),
  alergias         text check (alergias is null or length(alergias) <= 300),
  cronicas         text check (cronicas is null or length(cronicas) <= 300),
  extras           jsonb not null default '[]' check (jsonb_typeof(extras) = 'array'), -- campos personalizados [["Le teme a…","El secador"]]
  foto             text,
  activo           boolean not null default true,          -- false = falleció o ya no es paciente
  creado           timestamptz not null default now(),
  actualizado      timestamptz not null default now()
);
create index if not exists pacientes_prop_idx on public.pacientes (propietario_id);

-- ---------- HISTORIA CLÍNICA ----------
create table if not exists public.registros (
  id           uuid primary key default gen_random_uuid(),
  paciente_id  uuid not null references public.pacientes (id) on delete cascade,
  tipo         text not null check (tipo in ('consulta', 'vacuna', 'desparasitacion', 'examen', 'imagen', 'cirugia',
                                              'procedimiento', 'formula', 'hospitalizacion', 'peso', 'spa', 'nota')),
  fecha        timestamptz not null default now(),
  titulo       text not null check (length(titulo) between 1 and 120),
  resumen      text check (resumen is null or length(resumen) <= 4000),
  datos        jsonb not null default '{}' check (jsonb_typeof(datos) = 'object'), -- campos de cada tipo (peso, próxima dosis, lote…)
  archivos     jsonb not null default '[]' check (jsonb_typeof(archivos) = 'array'), -- [{nombre, ruta, tipo}]
  externo      boolean not null default false,             -- aplicada en otra veterinaria (vacunas anteriores)
  por          uuid default auth.uid(),
  por_nombre   text,
  creado       timestamptz not null default now()
);
create index if not exists registros_paciente_idx on public.registros (paciente_id, fecha desc);
create index if not exists registros_tipo_idx on public.registros (tipo, fecha desc);

drop trigger if exists propietarios_actualizado on public.propietarios;
create trigger propietarios_actualizado before update on public.propietarios for each row execute function public.marcar_actualizado();
drop trigger if exists pacientes_actualizado on public.pacientes;
create trigger pacientes_actualizado before update on public.pacientes for each row execute function public.marcar_actualizado();

-- el peso de la ficha se actualiza solo con el último registro que trae peso
create or replace function public.peso_desde_registro()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (new.datos ? 'peso') and (new.datos->>'peso') ~ '^[0-9]+([.,][0-9]+)?$' then
    update public.pacientes set peso = replace(new.datos->>'peso', ',', '.')::numeric
    where id = new.paciente_id
      and not exists (select 1 from public.registros r where r.paciente_id = new.paciente_id and r.id <> new.id and r.fecha > new.fecha and r.datos ? 'peso');
  end if;
  return new;
end;
$$;
drop trigger if exists registros_peso on public.registros;
create trigger registros_peso after insert on public.registros for each row execute function public.peso_desde_registro();

-- ---------- REGLAS (RLS) ----------
alter table public.propietarios enable row level security;
alter table public.pacientes enable row level security;
alter table public.registros enable row level security;

drop policy if exists "equipo ve propietarios" on public.propietarios;
create policy "equipo ve propietarios" on public.propietarios for select to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion', 'peluqueria']));
drop policy if exists "equipo maneja propietarios" on public.propietarios;
create policy "equipo maneja propietarios" on public.propietarios for insert to authenticated
  with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']));
drop policy if exists "equipo edita propietarios" on public.propietarios;
create policy "equipo edita propietarios" on public.propietarios for update to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion'])) with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']));
drop policy if exists "admin borra propietarios" on public.propietarios;
create policy "admin borra propietarios" on public.propietarios for delete to authenticated using (public.tiene_rol(array['admin']));

drop policy if exists "equipo ve pacientes" on public.pacientes;
create policy "equipo ve pacientes" on public.pacientes for select to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion', 'peluqueria']));
drop policy if exists "equipo crea pacientes" on public.pacientes;
create policy "equipo crea pacientes" on public.pacientes for insert to authenticated
  with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']));
drop policy if exists "equipo edita pacientes" on public.pacientes;
create policy "equipo edita pacientes" on public.pacientes for update to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion'])) with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']));

drop policy if exists "historia: ver" on public.registros;
create policy "historia: ver" on public.registros for select to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion']) or (public.tiene_rol(array['peluqueria']) and tipo in ('spa', 'peso', 'nota')));
drop policy if exists "historia: escribir" on public.registros;
create policy "historia: escribir" on public.registros for insert to authenticated
  with check (public.tiene_rol(array['admin', 'veterinario'])
              or (public.tiene_rol(array['recepcion', 'peluqueria']) and tipo in ('spa', 'peso', 'nota')));
drop policy if exists "historia: corregir" on public.registros;
create policy "historia: corregir" on public.registros for update to authenticated
  using (public.tiene_rol(array['admin', 'veterinario'])) with check (public.tiene_rol(array['admin', 'veterinario']));
drop policy if exists "historia: borrar" on public.registros;
create policy "historia: borrar" on public.registros for delete to authenticated using (public.tiene_rol(array['admin']));

-- ---------- PERMISOS POR COLUMNA ----------
revoke all on public.propietarios, public.pacientes, public.registros from anon, authenticated;
grant select on public.propietarios, public.pacientes, public.registros to authenticated;
grant insert (nombre, apellidos, doc_tipo, doc_numero, celular, correo, direccion, barrio, departamento, ciudad, fuente, notas, acepto_datos, portal)
  on public.propietarios to authenticated;
grant update (nombre, apellidos, doc_tipo, doc_numero, celular, correo, direccion, barrio, departamento, ciudad, fuente, notas, portal)
  on public.propietarios to authenticated;
grant delete on public.propietarios to authenticated;
grant insert (propietario_id, nombre, especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip,
              alimento, alimento_cant, alergias, cronicas, extras, foto, activo) on public.pacientes to authenticated;
grant update (propietario_id, nombre, especie, raza, color, sexo, reproductivo, nacimiento, edad_aprox, peso, microchip,
              alimento, alimento_cant, alergias, cronicas, extras, foto, activo) on public.pacientes to authenticated;
grant insert (paciente_id, tipo, fecha, titulo, resumen, datos, archivos, externo, por_nombre) on public.registros to authenticated;
grant update (fecha, titulo, resumen, datos, archivos) on public.registros to authenticated;
grant delete on public.registros to authenticated;
grant execute on function public.cel_norm(text) to authenticated;

-- los pedidos de la tienda se unen al propietario por el celular
alter table public.pedidos add column if not exists celular_norm text generated always as (public.cel_norm(celular)) stored;
create index if not exists pedidos_cel_idx on public.pedidos (celular_norm);
grant select (celular_norm) on public.pedidos to authenticated;

-- ---------- ARCHIVOS CLÍNICOS (privados: exámenes, imágenes, fórmulas, fotos de pacientes) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('clinica', 'clinica', false, 10485760)
on conflict (id) do nothing;
drop policy if exists "clinica: equipo ve" on storage.objects;
create policy "clinica: equipo ve" on storage.objects for select to authenticated
  using (bucket_id = 'clinica' and public.tiene_rol(array['admin', 'veterinario', 'recepcion', 'peluqueria']));
drop policy if exists "clinica: equipo sube" on storage.objects;
create policy "clinica: equipo sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'clinica' and public.tiene_rol(array['admin', 'veterinario', 'recepcion', 'peluqueria']));
drop policy if exists "clinica: admin borra" on storage.objects;
create policy "clinica: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'clinica' and public.tiene_rol(array['admin', 'veterinario']));
