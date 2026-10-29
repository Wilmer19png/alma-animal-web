-- Productos, variantes e inventario de la tienda. Se pega en Supabase → SQL Editor → Run (después de 01 a 04).
--
-- La página pública lee los productos visibles (sin costos). El equipo los maneja desde el gestor.
-- El stock nunca se escribe a mano: cada entrada, venta o ajuste es un "movimiento" y el stock se suma solo.

-- ---------- PRODUCTOS ----------
create table if not exists public.productos (
  id            uuid primary key default gen_random_uuid(),
  slug          text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'), -- va en la dirección: /producto?p=slug
  nombre        text not null check (length(nombre) between 2 and 90),
  categoria     text not null check (categoria in ('alimento', 'higiene', 'accesorios', 'snacks', 'juguetes')),
  para          text[] not null default '{perro,gato}',
  tamanos       text[] not null default '{}',               -- pequeno, mediano, grande (filtro de la tienda)
  marca         text check (marca is null or length(marca) <= 60),
  descripcion   text not null default '' check (length(descripcion) <= 600),
  tipo_variante text check (tipo_variante is null or length(tipo_variante) <= 30), -- Presentación, Talla, Sabor, Color
  etiquetas     text[] not null default '{}',               -- top, dra, nuevo, oferta
  icono         text not null default 'pets',               -- se muestra mientras no haya foto
  tono          text not null default 'lav' check (tono in ('lav', 'peach', 'rose', 'mix')),
  caracteristicas jsonb not null default '[]' check (jsonb_typeof(caracteristicas) = 'array'), -- [["Tipo de piel","Sensible"]]
  fotos         text[] not null default '{}',               -- direcciones de las fotos; la primera es la portada
  precio_antes  integer check (precio_antes is null or precio_antes > 0), -- si hay, sale tachado (oferta)
  codigo        text check (codigo is null or length(codigo) <= 20),
  aviso_stock   integer not null default 3 check (aviso_stock >= 0), -- avisar cuando queden estas unidades
  pauta_mes     integer not null default 0 check (pauta_mes >= 0),   -- costos internos: no salen en la tienda
  envio_unidad  integer not null default 0 check (envio_unidad >= 0),
  visible       boolean not null default true,
  orden         integer not null default 0,                 -- orden en "Destacados"
  creado        timestamptz not null default now(),
  actualizado   timestamptz not null default now()
);

create table if not exists public.variantes (
  id          uuid primary key default gen_random_uuid(),
  producto_id uuid not null references public.productos (id) on delete cascade,
  nombre      text not null check (length(nombre) between 1 and 40), -- "250 ml", "Talla M", "Único"
  codigo      text check (codigo is null or length(codigo) <= 30),
  precio      integer not null check (precio >= 0),
  costo       integer not null default 0 check (costo >= 0),      -- costo de compra: no sale en la tienda
  stock       integer not null default 0,
  orden       integer not null default 0,
  activo      boolean not null default true
);
create index if not exists variantes_producto_idx on public.variantes (producto_id, orden);

-- ---------- MOVIMIENTOS DE INVENTARIO ----------
create table if not exists public.movimientos (
  id          bigint generated always as identity primary key,
  variante_id uuid not null references public.variantes (id) on delete cascade,
  cantidad    integer not null check (cantidad <> 0),  -- + entra, − sale
  motivo      text not null check (motivo in ('ingreso', 'ajuste', 'venta_web', 'venta_consultorio', 'devolucion')),
  pedido_id   uuid references public.pedidos (id) on delete set null,
  precio      integer,                                 -- precio de venta (para el resumen del mes)
  por         uuid default auth.uid(),
  creado      timestamptz not null default now()
);
create index if not exists movimientos_variante_idx on public.movimientos (variante_id, creado desc);

-- el stock se actualiza solo con cada movimiento
create or replace function public.aplicar_movimiento()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.variantes set stock = stock + new.cantidad where id = new.variante_id;
  return new;
end;
$$;
drop trigger if exists movimientos_stock on public.movimientos;
create trigger movimientos_stock after insert on public.movimientos
  for each row execute function public.aplicar_movimiento();

drop trigger if exists productos_actualizado on public.productos;
create trigger productos_actualizado before update on public.productos
  for each row execute function public.marcar_actualizado();

-- ventas de la web: se descuentan al confirmar el pedido y vuelven si se cancela después
create or replace function public.inventario_por_pedido()
returns trigger language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  if old.estado = 'nuevo' and new.estado in ('confirmado', 'pagado', 'enviado', 'entregado') then
    for it in select * from jsonb_array_elements(new.items) loop
      if it ? 'vid' and exists (select 1 from public.variantes where id = (it->>'vid')::uuid) then
        insert into public.movimientos (variante_id, cantidad, motivo, pedido_id, precio)
        values ((it->>'vid')::uuid, -(it->>'cantidad')::int, 'venta_web', new.id, (it->>'precio')::int);
      end if;
    end loop;
  elsif old.estado in ('confirmado', 'pagado', 'enviado', 'entregado') and new.estado = 'cancelado' then
    insert into public.movimientos (variante_id, cantidad, motivo, pedido_id)
    select variante_id, -cantidad, 'devolucion', new.id from public.movimientos
    where pedido_id = new.id and motivo = 'venta_web';
  end if;
  return new;
end;
$$;
drop trigger if exists pedidos_inventario on public.pedidos;
create trigger pedidos_inventario after update of estado on public.pedidos
  for each row execute function public.inventario_por_pedido();

-- ---------- AJUSTES (lo que el gestor configura y la página lee) ----------
create table if not exists public.ajustes (
  clave   text primary key,
  valor   jsonb not null,
  publico boolean not null default false
);
insert into public.ajustes (clave, valor, publico) values
  ('avisos_compra', '{"activo": true, "cada": 20}', true)
on conflict (clave) do nothing;

-- ---------- AVISOS DE COMPRA ("Laura, de Pereira, compró…") ----------
-- solo pedidos confirmados de los últimos 7 días, de clientes que dieron permiso; nombre sin apellido
create or replace function public.avisos_compra()
returns table (nombre text, ciudad text, producto text, slug text, variante text, icono text, tono text, creado timestamptz)
language sql stable security definer set search_path = public as $$
  select split_part(p.nombre, ' ', 1), p.ciudad, it->>'nombre', it->>'id', it->>'variante',
         coalesce(pr.icono, 'pets'), coalesce(pr.tono, 'lav'), p.creado
  from public.pedidos p
  cross join lateral (select value as it from jsonb_array_elements(p.items) limit 1) x
  left join public.productos pr on pr.slug = it->>'id'
  where p.aviso_compras and p.estado in ('confirmado', 'pagado', 'enviado', 'entregado')
    and p.creado > now() - interval '7 days'
    and coalesce((select (valor->>'activo')::boolean from public.ajustes where clave = 'avisos_compra'), true)
  order by p.creado desc
  limit 12;
$$;

-- ---------- REGLAS (RLS) ----------
alter table public.productos enable row level security;
alter table public.variantes enable row level security;
alter table public.movimientos enable row level security;
alter table public.ajustes enable row level security;

drop policy if exists "todos ven productos visibles" on public.productos;
create policy "todos ven productos visibles" on public.productos for select
  using (visible or public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo maneja productos" on public.productos;
create policy "equipo maneja productos" on public.productos for all to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']))
  with check (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));

drop policy if exists "todos ven variantes visibles" on public.variantes;
create policy "todos ven variantes visibles" on public.variantes for select
  using ((activo and exists (select 1 from public.productos p where p.id = producto_id and p.visible))
         or public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo maneja variantes" on public.variantes;
create policy "equipo maneja variantes" on public.variantes for all to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']))
  with check (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));

drop policy if exists "equipo ve y registra movimientos" on public.movimientos;
create policy "equipo ve y registra movimientos" on public.movimientos for select to authenticated
  using (public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo registra movimientos" on public.movimientos;
create policy "equipo registra movimientos" on public.movimientos for insert to authenticated
  with check (public.tiene_rol(array['admin', 'recepcion', 'veterinario']) and motivo in ('ingreso', 'ajuste', 'venta_consultorio'));

drop policy if exists "todos leen ajustes publicos" on public.ajustes;
create policy "todos leen ajustes publicos" on public.ajustes for select
  using (publico or public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "admin cambia ajustes" on public.ajustes;
create policy "admin cambia ajustes" on public.ajustes for update to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));

-- ---------- PERMISOS POR COLUMNA ----------
revoke all on public.productos, public.variantes, public.movimientos, public.ajustes from anon, authenticated;
-- visitantes: todo menos los costos
grant select (id, slug, nombre, categoria, para, tamanos, marca, descripcion, tipo_variante, etiquetas, icono, tono,
              caracteristicas, fotos, precio_antes, codigo, visible, orden, creado)
  on public.productos to anon, authenticated;
grant select (id, producto_id, nombre, codigo, precio, stock, orden, activo) on public.variantes to anon, authenticated;
grant select (clave, valor, publico) on public.ajustes to anon, authenticated;
-- equipo
grant select (aviso_stock, pauta_mes, envio_unidad, actualizado) on public.productos to authenticated;
grant insert, delete on public.productos to authenticated;
grant update (slug, nombre, categoria, para, tamanos, marca, descripcion, tipo_variante, etiquetas, icono, tono,
              caracteristicas, fotos, precio_antes, codigo, aviso_stock, pauta_mes, envio_unidad, visible, orden)
  on public.productos to authenticated;
grant select (costo) on public.variantes to authenticated;
grant insert (producto_id, nombre, codigo, precio, costo, stock, orden, activo), delete on public.variantes to authenticated;
grant update (nombre, codigo, precio, costo, orden, activo) on public.variantes to authenticated; -- el stock solo cambia con movimientos
grant select, insert (variante_id, cantidad, motivo, precio) on public.movimientos to authenticated;
grant update (valor) on public.ajustes to authenticated;
grant execute on function public.avisos_compra() to anon, authenticated;

-- ---------- FOTOS (Supabase Storage, carpeta pública "productos") ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('productos', 'productos', true, 2097152, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;
drop policy if exists "equipo sube fotos" on storage.objects;
create policy "equipo sube fotos" on storage.objects for insert to authenticated
  with check (bucket_id = 'productos' and public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo cambia fotos" on storage.objects;
create policy "equipo cambia fotos" on storage.objects for update to authenticated
  using (bucket_id = 'productos' and public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
drop policy if exists "equipo borra fotos" on storage.objects;
create policy "equipo borra fotos" on storage.objects for delete to authenticated
  using (bucket_id = 'productos' and public.tiene_rol(array['admin', 'recepcion', 'veterinario']));
