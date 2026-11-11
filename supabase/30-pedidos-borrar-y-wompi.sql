-- Pedidos: borrarlos desde el gestor y pago en línea con Wompi (con descuento por pagar de una vez).
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 29). Se puede correr más de una vez.

-- ---------- 1. BORRAR PEDIDOS ----------
-- Solo la administradora. Sirve para pedidos de prueba o duplicados: el pedido desaparece de Pedidos y de Contabilidad.
-- Si el pedido ya había sacado productos del inventario, vuelven solos a bodega antes de borrarlo.
create or replace function public.pedidos_antes_de_borrar() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.movimientos (variante_id, cantidad, motivo)
  select variante_id, -sum(cantidad), 'devolucion'
  from public.movimientos
  where pedido_id = old.id and motivo in ('venta_web', 'devolucion')
  group by variante_id
  having sum(cantidad) <> 0;
  return old;
end $$;
drop trigger if exists pedidos_antes_de_borrar on public.pedidos;
create trigger pedidos_antes_de_borrar before delete on public.pedidos
  for each row execute function public.pedidos_antes_de_borrar();

drop policy if exists "admin borra pedidos" on public.pedidos;
create policy "admin borra pedidos" on public.pedidos for delete to authenticated
  using (public.tiene_rol(array['admin']));
grant delete on public.pedidos to authenticated;

-- ---------- 2. PAGO EN LÍNEA CON WOMPI ----------
-- El cliente elige «Pagar ahora» (tarjeta, PSE, Nequi, Bancolombia) o «Pagar al recibir».
-- Pagar ahora tiene descuento (lo calcula la página y lo revisa netlify/functions/wompi-pago.mjs).
-- El pedido se guarda igual en los dos casos; el de Wompi queda «pendiente» hasta que Wompi avisa a
-- netlify/functions/wompi-eventos.mjs que el pago se aprobó: ahí pasa solo a «Pago recibido» (pago = en_linea).
alter table public.pedidos add column if not exists metodo_pago text not null default 'contraentrega';
alter table public.pedidos drop constraint if exists pedidos_metodo_pago_check;
alter table public.pedidos add constraint pedidos_metodo_pago_check check (metodo_pago in ('contraentrega', 'wompi'));

alter table public.pedidos add column if not exists descuento integer not null default 0;
alter table public.pedidos drop constraint if exists pedidos_descuento_check;
alter table public.pedidos add constraint pedidos_descuento_check check (descuento >= 0 and descuento <= subtotal);

alter table public.pedidos add column if not exists pago_estado text;        -- solo Wompi: pendiente, aprobado, rechazado, anulado, error
alter table public.pedidos drop constraint if exists pedidos_pago_estado_check;
alter table public.pedidos add constraint pedidos_pago_estado_check
  check (pago_estado is null or pago_estado in ('pendiente', 'aprobado', 'rechazado', 'anulado', 'error'));
alter table public.pedidos add column if not exists wompi_referencia text;   -- código del pedido + intento (AA-XXXXX-ab12)
alter table public.pedidos add column if not exists wompi_transaccion text;  -- id de la transacción en Wompi
alter table public.pedidos add column if not exists wompi_medio text;        -- CARD, PSE, NEQUI, BANCOLOMBIA_TRANSFER…
create unique index if not exists pedidos_wompi_referencia_idx on public.pedidos (wompi_referencia) where wompi_referencia is not null;

-- la página elige el método y manda el descuento al crear el pedido; lo demás solo lo escribe el servidor (clave de servicio)
grant insert (metodo_pago, descuento) on public.pedidos to anon;
grant select (metodo_pago, descuento, pago_estado, wompi_referencia, wompi_transaccion, wompi_medio) on public.pedidos to authenticated;

-- la misma regla de siempre para crear pedidos desde la página, y además sin estado de pago de Wompi
-- (los avisos de compra no cambian: un pedido de Wompi sin pagar sigue «nuevo» y no sale en ellos)
drop policy if exists "web crea pedidos" on public.pedidos;
create policy "web crea pedidos" on public.pedidos
  for insert to anon
  with check (estado = 'nuevo' and origen = 'web' and pago = 'pendiente' and nota_interna is null and pago_estado is null);
