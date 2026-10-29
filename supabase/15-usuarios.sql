-- Usuarios y roles del gestor. Se pega en Supabase → SQL Editor → Run (después de 01 a 14).
--
-- Cómo entra una persona nueva:
-- 1. La administradora la agrega en el gestor (nombre, correo y rol). Queda "pendiente".
-- 2. En Supabase → Authentication → Users → "Invite user" escribe ese correo. Le llega un correo para crear su contraseña.
-- 3. Al crear la cuenta, entra sola con el rol que se eligió (lo hace el trigger de abajo).
-- Si la persona ya tenía cuenta, entra de una al agregarla.

create table if not exists public.invitaciones (
  correo text primary key check (correo = lower(correo) and correo ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  nombre text not null check (length(nombre) between 1 and 80),
  rol    text not null check (rol in ('admin', 'veterinario', 'peluqueria', 'recepcion')),
  creado timestamptz not null default now()
);
alter table public.invitaciones enable row level security;
drop policy if exists "invitaciones: admin" on public.invitaciones;
create policy "invitaciones: admin" on public.invitaciones for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
revoke all on public.invitaciones from anon, authenticated;
grant select, delete on public.invitaciones to authenticated;

-- la lista para la administradora: equipo con su correo y último ingreso, más las invitaciones pendientes
create or replace function public.miembros()
returns table (id uuid, nombre text, rol text, activo boolean, correo text, ultimo timestamptz, pendiente boolean)
language sql stable security definer set search_path = public, auth
as $$
  select e.id, e.nombre, e.rol, e.activo, u.email::text, u.last_sign_in_at, false
    from public.equipo e join auth.users u on u.id = e.id
   where public.tiene_rol(array['admin'])
  union all
  select null, i.nombre, i.rol, true, i.correo, null, true
    from public.invitaciones i
   where public.tiene_rol(array['admin'])
$$;

-- agregar a alguien: si ya tiene cuenta entra de una; si no, queda pendiente hasta que acepte la invitación
create or replace function public.invitar_miembro(p_correo text, p_nombre text, p_rol text)
returns text language plpgsql security definer set search_path = public, auth
as $$
declare
  uid uuid;
  c text := lower(trim(p_correo));
begin
  if not public.tiene_rol(array['admin']) then raise exception 'Solo la administradora agrega personas'; end if;
  if p_rol not in ('admin', 'veterinario', 'peluqueria', 'recepcion') then raise exception 'Rol no válido'; end if;
  select id into uid from auth.users where lower(email) = c;
  if uid is not null then
    insert into public.equipo (id, nombre, rol) values (uid, trim(p_nombre), p_rol)
      on conflict (id) do update set nombre = excluded.nombre, rol = excluded.rol, activo = true;
    delete from public.invitaciones where correo = c;
    return 'listo';
  end if;
  insert into public.invitaciones (correo, nombre, rol) values (c, trim(p_nombre), p_rol)
    on conflict (correo) do update set nombre = excluded.nombre, rol = excluded.rol;
  return 'pendiente';
end $$;

revoke all on function public.miembros() from public, anon;
revoke all on function public.invitar_miembro(text, text, text) from public, anon;
grant execute on function public.miembros() to authenticated;
grant execute on function public.invitar_miembro(text, text, text) to authenticated;

-- cuando se crea la cuenta (por la invitación de Supabase), entra con el rol elegido
create or replace function public.vincular_invitacion() returns trigger
language plpgsql security definer set search_path = public
as $$
declare i public.invitaciones;
begin
  select * into i from public.invitaciones where correo = lower(new.email);
  if found then
    insert into public.equipo (id, nombre, rol) values (new.id, i.nombre, i.rol) on conflict (id) do nothing;
    delete from public.invitaciones where correo = i.correo;
  end if;
  return new;
end $$;
drop trigger if exists vincular_invitacion on auth.users;
create trigger vincular_invitacion after insert on auth.users for each row execute function public.vincular_invitacion();
