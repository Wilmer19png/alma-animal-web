-- Equipo interno y permisos del gestor. Se pega en Supabase → SQL Editor → Run (después de 01 y 02).
--
-- Cada persona del equipo es un usuario de Supabase Auth (correo y contraseña) con una fila en "equipo"
-- que dice su rol. Quien no está en "equipo" (por ejemplo, un cliente del portal) no ve nada del gestor.

create table if not exists public.equipo (
  id        uuid primary key references auth.users (id) on delete cascade,
  nombre    text not null check (length(nombre) between 1 and 80),
  rol       text not null check (rol in ('admin', 'veterinario', 'peluqueria', 'recepcion')),
  activo    boolean not null default true,
  creado    timestamptz not null default now()
);

alter table public.equipo enable row level security;

-- ¿la persona que hace la consulta es del equipo y tiene alguno de estos roles?
-- (security definer: puede leer "equipo" aunque las reglas de esa tabla no se lo permitan)
create or replace function public.tiene_rol(roles text[])
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.equipo
    where id = auth.uid() and activo and rol = any (roles)
  );
$$;

-- cada quien ve su propia ficha; la administradora ve y maneja todas
drop policy if exists "ver mi ficha" on public.equipo;
create policy "ver mi ficha" on public.equipo for select to authenticated
  using (id = auth.uid() or public.tiene_rol(array['admin']));
drop policy if exists "admin maneja equipo" on public.equipo;
create policy "admin maneja equipo" on public.equipo for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
grant select, insert, update, delete on public.equipo to authenticated;

-- ---------- PEDIDOS ----------
-- los ven y avanzan: administradora, recepción y veterinario/a
drop policy if exists "equipo ve pedidos" on public.pedidos;
create policy "equipo ve pedidos" on public.pedidos for select to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo avanza pedidos" on public.pedidos;
create policy "equipo avanza pedidos" on public.pedidos for update to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']))
  with check (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
-- solo se pueden cambiar estas columnas (los productos y valores que pidió el cliente no se tocan)
grant select on public.pedidos to authenticated;
grant update (estado, pago, nota_interna) on public.pedidos to authenticated;

-- la fecha de "actualizado" se pone sola en cada cambio
create or replace function public.marcar_actualizado()
returns trigger language plpgsql as $$
begin
  new.actualizado := now();
  return new;
end;
$$;
drop trigger if exists pedidos_actualizado on public.pedidos;
create trigger pedidos_actualizado before update on public.pedidos
  for each row execute function public.marcar_actualizado();

-- ---------- SUSCRIPTORES DEL BOLETÍN ----------
drop policy if exists "admin ve suscriptores" on public.suscriptores;
create policy "admin ve suscriptores" on public.suscriptores for select to authenticated
  using (public.tiene_rol(array['admin']));
drop policy if exists "admin da de baja" on public.suscriptores;
create policy "admin da de baja" on public.suscriptores for update to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
grant select on public.suscriptores to authenticated;
grant update (activo) on public.suscriptores to authenticated;

-- ---------- PRIMERA ADMINISTRADORA ----------
-- 1. Authentication → Users → Add user: correo y contraseña de la doctora ("Auto confirm user" marcado).
-- 2. Copia el "User UID" que aparece y ejecútalo aquí (cambiando el UID):
--
-- insert into public.equipo (id, nombre, rol)
-- values ('PEGA-AQUI-EL-USER-UID', 'Dra. Mariana Hoyos', 'admin');
