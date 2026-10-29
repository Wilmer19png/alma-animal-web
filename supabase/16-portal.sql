-- Portal de clientes. Se pega en Supabase → SQL Editor → Run (después de 01 a 15).
--
-- Cada cliente entra con su correo (enlace al correo o contraseña) y queda unido a su ficha de propietario
-- por ese correo, SOLO cuando lo confirma. Ve sus mascotas, su historia (sin notas internas), sus citas y sus
-- pedidos. Su ficha y sus pedidos se leen con funciones que devuelven solo lo que le corresponde.

-- ---------- la cuenta del cliente ----------
alter table public.propietarios add column if not exists usuario_id uuid unique references auth.users (id) on delete set null;
-- la cuenta se puede volver a unir si la doctora cambia el correo
grant update (usuario_id) on public.propietarios to authenticated;

create or replace function public.mi_propietario() returns uuid
language sql stable security definer set search_path = public
as $$ select id from public.propietarios where usuario_id = auth.uid() limit 1 $$;

-- al confirmar el correo: entra al equipo si tenía invitación, o se une a su ficha de cliente
create or replace function public.vincular_cuenta() returns trigger
language plpgsql security definer set search_path = public
as $$
declare i public.invitaciones;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into i from public.invitaciones where correo = lower(new.email);
  if found then
    insert into public.equipo (id, nombre, rol) values (new.id, i.nombre, i.rol) on conflict (id) do nothing;
    delete from public.invitaciones where correo = i.correo;
    return new;
  end if;
  update public.propietarios set usuario_id = new.id, portal = 'activo'
   where id = (select id from public.propietarios where usuario_id is null and lower(correo) = lower(new.email) order by creado limit 1)
     and not exists (select 1 from public.equipo where id = new.id)
     and not exists (select 1 from public.propietarios where usuario_id = new.id);
  return new;
end $$;
drop trigger if exists vincular_invitacion on auth.users;
drop trigger if exists vincular_cuenta on auth.users;
create trigger vincular_cuenta after insert or update of email_confirmed_at on auth.users
  for each row execute function public.vincular_cuenta();

-- por si la cuenta existía antes de que la doctora registrara al propietario: se une al entrar
create or replace function public.vincular_mi_cuenta() returns boolean
language plpgsql security definer set search_path = public, auth
as $$
declare u auth.users;
begin
  if public.mi_propietario() is not null then return true; end if;
  select * into u from auth.users where id = auth.uid();
  if u.id is null or u.email_confirmed_at is null or exists (select 1 from public.equipo where id = u.id) then return false; end if;
  update public.propietarios set usuario_id = u.id, portal = 'activo'
   where id = (select id from public.propietarios where usuario_id is null and lower(correo) = lower(u.email) order by creado limit 1);
  return found;
end $$;

-- su ficha (sin notas internas)
create or replace function public.mi_ficha()
returns table (id uuid, nombre text, apellidos text, celular text, correo text, direccion text, barrio text, ciudad text)
language sql stable security definer set search_path = public
as $$ select id, nombre, apellidos, celular, correo, direccion, barrio, ciudad from public.propietarios where usuario_id = auth.uid() limit 1 $$;

-- sus pedidos (los hechos con su celular), sin notas internas
create or replace function public.mis_pedidos()
returns table (id uuid, numero integer, codigo text, creado timestamptz, estado text, pago text, items jsonb, subtotal integer,
               envio integer, prioritario boolean, total integer, obsequio boolean, ciudad text, direccion text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.numero, p.codigo, p.creado, p.estado, p.pago, p.items, p.subtotal, p.envio, p.prioritario, p.total, p.obsequio, p.ciudad, p.direccion
    from public.pedidos p
   where p.celular_norm = (select celular_norm from public.propietarios where usuario_id = auth.uid() limit 1)
   order by p.creado desc
   limit 50
$$;

-- ---------- lo que ve el cliente ----------
drop policy if exists "pacientes: el dueño ve las suyas" on public.pacientes;
create policy "pacientes: el dueño ve las suyas" on public.pacientes for select to authenticated
  using (propietario_id = public.mi_propietario());

drop policy if exists "historia: el dueño ve la de sus mascotas" on public.registros;
create policy "historia: el dueño ve la de sus mascotas" on public.registros for select to authenticated
  using (tipo <> 'nota' and paciente_id in (select id from public.pacientes where propietario_id = public.mi_propietario()));

drop policy if exists "citas: el dueño ve las suyas" on public.citas;
create policy "citas: el dueño ve las suyas" on public.citas for select to authenticated
  using (propietario_id = public.mi_propietario() or paciente_id in (select id from public.pacientes where propietario_id = public.mi_propietario()));

-- pide citas desde el portal: quedan "solicitadas" hasta que el equipo las confirme
drop policy if exists "citas: el dueño solicita" on public.citas;
create policy "citas: el dueño solicita" on public.citas for insert to authenticated
  with check (origen = 'portal' and estado = 'solicitada' and not sobrecupo and inicio > now() and fin <= inicio + interval '4 hours'
              and servicio in ('consulta', 'vacuna', 'domicilio', 'spa')
              and propietario_id = public.mi_propietario()
              and paciente_id in (select id from public.pacientes where propietario_id = public.mi_propietario()));

-- cancelar una cita propia (las confirmadas, hasta 24 horas antes)
create or replace function public.cancelar_mi_cita(p_id uuid) returns text
language plpgsql security definer set search_path = public
as $$
declare c public.citas;
begin
  select * into c from public.citas where id = p_id
    and (propietario_id = public.mi_propietario() or paciente_id in (select id from public.pacientes where propietario_id = public.mi_propietario()));
  if c.id is null then return 'no'; end if;
  if c.estado not in ('solicitada', 'confirmada') then return 'no'; end if;
  if c.estado = 'confirmada' and c.inicio < now() + interval '24 hours' then return 'tarde'; end if;
  update public.citas set estado = 'cancelada' where id = c.id;
  return 'ok';
end $$;

-- horas ocupadas de la agenda (solo inicio y fin, sin datos de nadie) para ofrecer horas libres
create or replace function public.horas_ocupadas(desde timestamptz, hasta timestamptz)
returns table (carril text, inicio timestamptz, fin timestamptz)
language sql stable security definer set search_path = public
as $$
  select carril, inicio, fin from public.citas
   where estado in ('confirmada', 'atendida') and inicio < hasta and fin > desde and hasta - desde <= interval '62 days'
$$;

-- los archivos de la historia (exámenes, imágenes) de sus mascotas
drop policy if exists "clinica: el dueño ve los de sus mascotas" on storage.objects;
create policy "clinica: el dueño ve los de sus mascotas" on storage.objects for select to authenticated
  using (bucket_id = 'clinica' and (storage.foldername(name))[1] = 'pacientes'
         and (storage.foldername(name))[2] in (select id::text from public.pacientes where propietario_id = public.mi_propietario()));

revoke all on function public.mi_propietario(), public.vincular_mi_cuenta(), public.mi_ficha(), public.mis_pedidos(),
  public.cancelar_mi_cita(uuid), public.horas_ocupadas(timestamptz, timestamptz) from public, anon;
grant execute on function public.mi_propietario(), public.vincular_mi_cuenta(), public.mi_ficha(), public.mis_pedidos(),
  public.cancelar_mi_cita(uuid), public.horas_ocupadas(timestamptz, timestamptz) to authenticated;
