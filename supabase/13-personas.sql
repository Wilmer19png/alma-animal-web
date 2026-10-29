-- Equipo que se ve en la página (Nosotros). Se pega en Supabase → SQL Editor → Run (después de 01 a 12).
-- Es distinto de "equipo" (quién entra al gestor): aquí van las personas que se presentan al público.
create table if not exists public.personas (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null check (length(nombre) between 1 and 80),
  cargo     text not null default '' check (length(cargo) <= 80),
  tarjeta   text check (tarjeta is null or length(tarjeta) <= 40),        -- tarjeta profesional, si aplica
  instagram text check (instagram is null or instagram ~ '^@?[A-Za-z0-9._]{1,30}$'),
  desde     smallint check (desde is null or desde between 1990 and 2100), -- año en que llegó a Alma Animal
  bio       text not null default '' check (length(bio) <= 280),
  foto      text check (foto is null or foto ~ '^https://'),
  web       boolean not null default true,
  orden     smallint not null default 0,
  creado    timestamptz not null default now()
);
alter table public.personas enable row level security;
drop policy if exists "personas: todos ven las visibles" on public.personas;
create policy "personas: todos ven las visibles" on public.personas for select using (web);
drop policy if exists "personas: equipo ve todas" on public.personas;
create policy "personas: equipo ve todas" on public.personas for select to authenticated using (public.tiene_rol(array['admin', 'veterinario', 'recepcion', 'peluqueria']));
drop policy if exists "personas: admin maneja" on public.personas;
create policy "personas: admin maneja" on public.personas for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
revoke all on public.personas from anon, authenticated;
grant select (id, nombre, cargo, tarjeta, instagram, desde, bio, foto, orden) on public.personas to anon;
grant select, insert, update, delete on public.personas to authenticated;

-- la doctora, para empezar (la presentación la escribe ella desde el gestor)
insert into public.personas (nombre, cargo, tarjeta, instagram, orden)
select 'Dra. Mariana Hoyos Giraldo', 'Médica Veterinaria y Zootecnista', 'TP 51206', '@vet_marianahoyos', 0
where not exists (select 1 from public.personas);

-- fotos del equipo (públicas)
insert into storage.buckets (id, name, public) values ('equipo', 'equipo', true) on conflict (id) do nothing;
drop policy if exists "equipo-fotos: admin sube" on storage.objects;
create policy "equipo-fotos: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'equipo' and public.tiene_rol(array['admin']));
drop policy if exists "equipo-fotos: admin borra" on storage.objects;
create policy "equipo-fotos: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'equipo' and public.tiene_rol(array['admin']));
