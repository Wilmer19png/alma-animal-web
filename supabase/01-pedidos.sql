-- Pedidos de la tienda (Petshop). Se pega una vez en Supabase → SQL Editor → Run.
-- La página solo puede CREAR pedidos (no leerlos ni cambiarlos). El gestor los leerá con su propio acceso.

create table if not exists public.pedidos (
  id            uuid primary key default gen_random_uuid(),
  codigo        text not null unique,                -- AA-XXXXX, el que ve el cliente
  creado        timestamptz not null default now(),
  estado        text not null default 'nuevo'
                check (estado in ('nuevo', 'confirmado', 'pagado', 'enviado', 'entregado', 'cancelado')),
  origen        text not null default 'web' check (origen in ('web', 'consultorio')),
  -- cliente (se une a su ficha por el celular)
  nombre        text not null check (length(nombre) between 1 and 80),
  apellido      text not null check (length(apellido) between 1 and 80),
  celular       text not null check (length(regexp_replace(celular, '\D', '', 'g')) between 10 and 13),
  correo        text check (correo is null or length(correo) <= 120),
  -- entrega
  departamento  text not null check (length(departamento) <= 60),
  ciudad        text not null check (length(ciudad) <= 80),
  direccion     text not null check (length(direccion) <= 160),
  barrio        text not null check (length(barrio) <= 80),
  indicaciones  text check (indicaciones is null or length(indicaciones) <= 500),
  -- productos: [{id, nombre, variante, precio, cantidad}]
  items         jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) between 1 and 50),
  subtotal      integer not null check (subtotal >= 0),
  envio         integer not null check (envio >= 0),
  prioritario   boolean not null default false,
  total         integer not null check (total >= 0),
  obsequio      boolean not null default false,
  aviso_compras boolean not null default false        -- permiso para "Laura, de Pereira, compró…"
);

create index if not exists pedidos_creado_idx on public.pedidos (creado desc);
create index if not exists pedidos_celular_idx on public.pedidos (celular);

alter table public.pedidos enable row level security;

-- La página web (clave pública "anon") solo puede insertar pedidos nuevos.
drop policy if exists "web crea pedidos" on public.pedidos;
create policy "web crea pedidos" on public.pedidos
  for insert to anon
  with check (estado = 'nuevo' and origen = 'web');

grant insert on public.pedidos to anon;
