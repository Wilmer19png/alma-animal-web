-- Suscriptores del boletín del blog ("Un consejo al mes"). Se pega en Supabase → SQL Editor → Run.
-- La página solo puede agregar correos; leerlos y darlos de baja se hace desde el gestor.

create table if not exists public.suscriptores (
  id          uuid primary key default gen_random_uuid(),
  correo      text not null check (correo ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(correo) <= 120),
  creado      timestamptz not null default now(),
  origen      text not null default 'blog' check (origen in ('blog', 'articulo')),
  acepto_datos boolean not null check (acepto_datos),     -- Ley 1581 de 2012
  activo      boolean not null default true
);

-- un correo se guarda una sola vez (sin importar mayúsculas)
create unique index if not exists suscriptores_correo_idx on public.suscriptores (lower(correo));

alter table public.suscriptores enable row level security;

drop policy if exists "web agrega suscriptores" on public.suscriptores;
create policy "web agrega suscriptores" on public.suscriptores
  for insert to anon
  with check (activo and acepto_datos);

grant insert on public.suscriptores to anon;
