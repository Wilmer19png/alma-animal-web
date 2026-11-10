-- Oculta de la tienda todos los productos menos el Baño Sanitario (los de ejemplo y de referencia).
-- No se borran: quedan en el gestor (Productos e inventario) y se pueden volver a mostrar desde ahí.
-- Se pega en Supabase → SQL Editor → Run.
update public.productos set visible = false where slug <> 'bano-sanitario-perros' and visible;
update public.productos set visible = true where slug = 'bano-sanitario-perros';

-- para revisar: qué quedó visible
select slug, nombre, visible from public.productos order by visible desc, nombre;
