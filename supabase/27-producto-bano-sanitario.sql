-- Baño Sanitario para Perros con Pasto en el catálogo del Petshop (producto de Dropi, id 2282266).
-- Su tarjeta en la tienda lleva a la landing /bano-sanitario-perros (ver LANDINGS en src/scripts/catalogo.ts).
-- Dropi maneja el inventario: se le cargan 100 unidades para que salga «En stock»; se ajusta desde el gestor.
-- Se pega en Supabase → SQL Editor → Run. Se puede correr más de una vez (no duplica).
with p as (
  insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, etiquetas, icono, tono, caracteristicas, fotos, codigo, envio_unidad, orden)
  values (
    'bano-sanitario-perros',
    'Baño Sanitario para Perros con Pasto',
    'higiene', '{perro}', '{pequeno,mediano}',
    'Su propio “patio” dentro de casa: el orín baja a la bandeja y el pasto queda seco. Tres capas (pasto sintético, rejilla y bandeja), lavable y reutilizable. Envío gratis a toda Colombia y pagas al recibir.',
    '{nuevo}', 'grass', 'peach',
    '[["Medidas", "70 × 45 cm"], ["Capas", "Pasto, rejilla y bandeja"], ["Cuidado", "Lavable y reutilizable"], ["Envío", "Gratis a toda Colombia"]]'::jsonb,
    '{/landing/bano-sanitario/img/producto-cenital-durazno.webp,/landing/bano-sanitario/img/hero-pomerania-cenital.webp,/landing/bano-sanitario/img/boston-terrier-encima.webp,/landing/bano-sanitario/img/tres-capas-flatlay.webp}',
    'DROPI-2282266', 0, 0
  )
  on conflict (slug) do update set nombre = excluded.nombre, descripcion = excluded.descripcion, fotos = excluded.fotos, caracteristicas = excluded.caracteristicas
  returning id
), v as (
  insert into public.variantes (producto_id, nombre, codigo, precio, costo, orden)
  select p.id, '70 × 45 cm', '2282266', 119900, 0, 0 from p
  where not exists (select 1 from public.variantes x where x.producto_id = p.id)
  returning id
)
insert into public.movimientos (variante_id, cantidad, motivo)
select v.id, 100, 'ingreso' from v;
