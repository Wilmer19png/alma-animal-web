-- Contabilidad en dos cuentas: «alma» (consultorio, spa y tienda física; se reparte entre socios) y «petshop»
-- (el Petshop en línea con productos de Dropi). Los pedidos del sitio van solos a «petshop»; lo que se anota a mano
-- queda en la cuenta que esté abierta en el gestor. Todo lo anterior queda en «alma».
-- Nuevas categorías: ingreso «pedido» (Pedidos del Petshop) y gasto «dropi» (Dropi: productos y fletes).
-- Se pega en Supabase → SQL Editor → Run. Se puede correr más de una vez.
alter table public.libro_contable add column if not exists cuenta text not null default 'alma';
alter table public.libro_contable drop constraint if exists libro_contable_cuenta_check;
alter table public.libro_contable add constraint libro_contable_cuenta_check check (cuenta in ('alma', 'petshop'));

alter table public.libro_contable drop constraint if exists libro_contable_categoria_check;
alter table public.libro_contable add constraint libro_contable_categoria_check check (categoria in (
  'consulta', 'medicamento', 'examen', 'procedimiento', 'vacuna', 'spa', 'tienda', 'pedido', 'otro_ingreso',
  'arriendo', 'servicios', 'meta', 'medic', 'insumos', 'merc', 'dropi', 'otro'
));
