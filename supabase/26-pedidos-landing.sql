-- Pedidos que llegan de las landings de anuncios (por ejemplo /bano-sanitario-perros).
-- Guarda de dónde vino el pedido, cómo se mostró el envío y los datos del anuncio (utm, fbclid),
-- para medir qué campaña vende y entrega más.
-- El proveedor y el id de Dropi van dentro de cada producto del pedido (items: proveedor, dropi_id).
-- Se pega en Supabase → SQL Editor → Run. Se puede correr más de una vez.
alter table public.pedidos add column if not exists fuente text
  check (fuente is null or length(fuente) <= 40);                 -- 'landing-meta', null = tienda normal
alter table public.pedidos add column if not exists modo_envio text
  check (modo_envio is null or modo_envio in ('gratis', 'aparte'));
alter table public.pedidos add column if not exists atribucion jsonb
  check (atribucion is null or (jsonb_typeof(atribucion) = 'object' and length(atribucion::text) <= 1500));

-- la página puede llenarlos al crear el pedido
grant insert (fuente, modo_envio, atribucion) on public.pedidos to anon;
