-- Blog. Se pega en Supabase → SQL Editor → Run (después de 01 a 11).
--
-- Los artículos se guardan aquí y la página del blog se genera al publicar el sitio (así Google los lee bien).
-- Cuando la doctora publica o corrige un artículo, se marca "pendiente" y cada 10 minutos, si hay algo
-- pendiente (o un artículo programado que ya llegó a su hora), se le pide a Netlify que vuelva a publicar.
-- Cada publicación gasta un build de Netlify: agrupar cada 10 minutos evita gastar uno por cada corrección.

-- ---------- ARTÍCULOS ----------
create table if not exists public.articulos (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 90),
  titulo      text not null check (length(titulo) between 1 and 140),
  categoria   text not null check (categoria in ('Cuidado', 'Vacunas', 'Gatos', 'Nutrición', 'Spa')),
  resumen     text not null default '' check (length(resumen) <= 300),
  cuerpo      jsonb not null default '[]' check (jsonb_typeof(cuerpo) = 'array'),
  portada     text check (portada is null or portada ~ '^https://'),   -- foto subida; si no hay, ilustración de la marca
  ilustracion smallint not null default 0 check (ilustracion between 0 and 3),
  min         smallint not null default 3 check (min between 1 and 60),  -- minutos de lectura
  estado      text not null default 'borrador' check (estado in ('borrador', 'publicado')),
  publicado   timestamptz,                                             -- fecha de publicación (si es futura: programado)
  por_nombre  text,
  creado      timestamptz not null default now(),
  actualizado timestamptz not null default now(),
  check (estado = 'borrador' or publicado is not null)
);
create index if not exists articulos_publicado_idx on public.articulos (publicado desc);
drop trigger if exists articulos_actualizado on public.articulos;
create trigger articulos_actualizado before update on public.articulos for each row execute function public.marcar_actualizado();

alter table public.articulos enable row level security;
drop policy if exists "articulos: todos leen los publicados" on public.articulos;
create policy "articulos: todos leen los publicados" on public.articulos for select
  using (estado = 'publicado' and publicado <= now());
drop policy if exists "articulos: equipo ve todo" on public.articulos;
create policy "articulos: equipo ve todo" on public.articulos for select to authenticated
  using (public.tiene_rol(array['admin', 'veterinario']));
drop policy if exists "articulos: equipo escribe" on public.articulos;
create policy "articulos: equipo escribe" on public.articulos for all to authenticated
  using (public.tiene_rol(array['admin', 'veterinario'])) with check (public.tiene_rol(array['admin', 'veterinario']));

revoke all on public.articulos from anon, authenticated;
grant select (slug, titulo, categoria, resumen, cuerpo, portada, ilustracion, min, publicado) on public.articulos to anon;
grant select on public.articulos to authenticated;
grant insert (slug, titulo, categoria, resumen, cuerpo, portada, ilustracion, min, estado, publicado, por_nombre),
      update (slug, titulo, categoria, resumen, cuerpo, portada, ilustracion, min, estado, publicado, por_nombre),
      delete on public.articulos to authenticated;

-- ---------- PORTADAS (fotos públicas) ----------
insert into storage.buckets (id, name, public) values ('blog', 'blog', true) on conflict (id) do nothing;
drop policy if exists "blog: equipo sube" on storage.objects;
create policy "blog: equipo sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'blog' and public.tiene_rol(array['admin', 'veterinario']));
drop policy if exists "blog: equipo borra" on storage.objects;
create policy "blog: equipo borra" on storage.objects for delete to authenticated
  using (bucket_id = 'blog' and public.tiene_rol(array['admin', 'veterinario']));

-- ---------- PUBLICAR EL SITIO (Netlify) ----------
create extension if not exists pg_net;
create extension if not exists pg_cron;

-- el enlace secreto de Netlify (Build hook) vive aquí: nadie desde la página ni el gestor lo puede leer
create table if not exists public.despliegue (
  id        smallint primary key default 1 check (id = 1),
  hook      text,
  pendiente boolean not null default false,
  ultimo    timestamptz not null default now()
);
insert into public.despliegue (id) values (1) on conflict (id) do nothing;
alter table public.despliegue enable row level security;
revoke all on public.despliegue from anon, authenticated;

-- cualquier cambio en un artículo publicado (o que se despublica) deja la publicación pendiente
create or replace function public.articulos_pendiente() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op <> 'INSERT' and old.estado = 'publicado') or (tg_op <> 'DELETE' and new.estado = 'publicado') then
    update public.despliegue set pendiente = true where id = 1;
  end if;
  return null;
end $$;
drop trigger if exists articulos_pendiente on public.articulos;
create trigger articulos_pendiente after insert or update or delete on public.articulos for each row execute function public.articulos_pendiente();

-- cada 10 minutos: si hay algo pendiente o un programado que ya llegó a su hora, se publica una vez
create or replace function public.publicar_sitio() returns void language plpgsql security definer set search_path = public as $$
declare d public.despliegue;
begin
  select * into d from public.despliegue where id = 1;
  if d.hook is null or d.hook = '' then return; end if;
  if d.pendiente or exists (select 1 from public.articulos where estado = 'publicado' and publicado > d.ultimo and publicado <= now()) then
    perform net.http_post(url := d.hook, body := '{}'::jsonb);
    update public.despliegue set pendiente = false, ultimo = now() where id = 1;
  end if;
end $$;
revoke all on function public.publicar_sitio() from public, anon, authenticated;
select cron.unschedule('alma-publicar-sitio') where exists (select 1 from cron.job where jobname = 'alma-publicar-sitio');
select cron.schedule('alma-publicar-sitio', '*/10 * * * *', 'select public.publicar_sitio()');

-- PASO A MANO (una sola vez): en Netlify → Site configuration → Build & deploy → Build hooks → "Add build hook"
-- (nombre: Blog, rama: main). Copia el enlace y pégalo aquí, en lugar del texto entre comillas, y corre solo esta línea:
-- update public.despliegue set hook = 'https://api.netlify.com/build_hooks/PEGA-AQUI-EL-CODIGO' where id = 1;
