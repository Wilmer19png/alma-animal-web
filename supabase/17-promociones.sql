-- Promociones: precio anterior por variante (sale tachado en la tienda con el % de descuento).
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 16).
alter table public.variantes add column if not exists precio_antes integer check (precio_antes is null or precio_antes > 0);

-- lo que ya estaba como "precio anterior" del producto pasa a sus variantes
update public.variantes v set precio_antes = p.precio_antes
  from public.productos p
 where v.producto_id = p.id and p.precio_antes is not null and v.precio_antes is null and p.precio_antes > v.precio;

grant select (precio_antes) on public.variantes to anon, authenticated;
grant insert (precio_antes), update (precio_antes) on public.variantes to authenticated;
