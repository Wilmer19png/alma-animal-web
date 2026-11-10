-- Reseñas de productos (estrellas, comentario y foto opcional). Las deja cualquier visitante desde la página
-- del producto, pero NO salen publicadas hasta que el equipo las revisa en el gestor (Sitio web → Reseñas).
-- El equipo solo puede publicar, ocultar o borrar: el texto y las estrellas no se editan.
-- Se pega en Supabase → SQL Editor → Run. Se puede correr más de una vez.
create table if not exists public.resenas (
  id                uuid primary key default gen_random_uuid(),
  creado            timestamptz not null default now(),
  producto          text not null check (producto ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(producto) <= 90), -- slug del producto
  nombre            text not null check (length(nombre) between 1 and 60),
  ciudad            text check (ciudad is null or length(ciudad) <= 60),
  estrellas         integer not null check (estrellas between 1 and 5),
  comentario        text not null check (length(comentario) between 3 and 1000),
  foto              text check (foto is null or (length(foto) <= 300 and foto like '%/storage/v1/object/public/resenas/%')),
  estado            text not null default 'pendiente' check (estado in ('pendiente', 'publicada', 'oculta')),
  acepto_datos      boolean not null check (acepto_datos),           -- autorización Ley 1581 para publicar nombre y ciudad
  version_politicas text not null check (length(version_politicas) <= 20)
);
create index if not exists resenas_producto_idx on public.resenas (producto, estado, creado desc);
alter table public.resenas enable row level security;

-- la página deja reseñas nuevas (siempre pendientes) y solo ve las publicadas
drop policy if exists "web deja resenas" on public.resenas;
create policy "web deja resenas" on public.resenas for insert to anon with check (estado = 'pendiente');
drop policy if exists "web ve publicadas" on public.resenas;
create policy "web ve publicadas" on public.resenas for select to anon using (estado = 'publicada');
grant insert (producto, nombre, ciudad, estrellas, comentario, foto, acepto_datos, version_politicas) on public.resenas to anon;
grant select (id, creado, producto, nombre, ciudad, estrellas, comentario, foto, estado) on public.resenas to anon;

-- el equipo las revisa: publicar, ocultar o borrar
drop policy if exists "equipo ve resenas" on public.resenas;
create policy "equipo ve resenas" on public.resenas for select to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo modera resenas" on public.resenas;
create policy "equipo modera resenas" on public.resenas for update to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo borra resenas" on public.resenas;
create policy "equipo borra resenas" on public.resenas for delete to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
grant select, delete on public.resenas to authenticated;
grant update (estado) on public.resenas to authenticated;

-- ---------- FOTOS de las reseñas (carpeta pública "resenas", máx. 3 MB, solo imágenes) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resenas', 'resenas', true, 3145728, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do update set file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "web sube fotos de resenas" on storage.objects;
create policy "web sube fotos de resenas" on storage.objects for insert to anon
  with check (bucket_id = 'resenas' and name ~ '^[a-z0-9-]+/[0-9]+-[a-z0-9]+\.webp$');
drop policy if exists "equipo borra fotos de resenas" on storage.objects;
create policy "equipo borra fotos de resenas" on storage.objects for delete to authenticated
  using (bucket_id = 'resenas' and public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
