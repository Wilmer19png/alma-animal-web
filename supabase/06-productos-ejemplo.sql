-- PRODUCTOS DE EJEMPLO para que la tienda no arranque vacía. Se pega en SQL Editor → Run (después de 05).
-- Cámbialos o bórralos desde el gestor (Productos e inventario) antes de publicar la tienda.
-- Solo se insertan si la tabla está vacía.
do $$
declare pid uuid;
begin
if exists (select 1 from public.productos) then return; end if;

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('shampoo-hipoalergenico', 'Shampoo hipoalergénico', 'higiene', '{perro,gato}', '{pequeno,mediano,grande}', 'Libre de parabenos, para pieles sensibles. El mismo que usamos en el spa.', 'Presentación', '{top}', 'soap', 'lav', '[["Tipo de piel","Sensible"],["Libre de","Parabenos"],["Modo de uso","Aplicar sobre el pelo húmedo, masajear y enjuagar bien."]]'::jsonb, null, 0)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, '250 ml', 28000, 12, 0),
  (pid, '500 ml', 42000, 8, 1),
  (pid, '1 litro', 68000, 0, 2);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('concentrado-adulto-pequena', 'Concentrado adulto raza pequeña', 'alimento', '{perro}', '{pequeno}', 'Croqueta pequeña, alta en proteína y fácil de digerir.', 'Presentación', '{dra}', 'set_meal', 'peach', '[["Etapa","Adulto (desde 1 año)"],["Proteína","Pollo y arroz"]]'::jsonb, null, 1)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, '2 kg', 45000, 10, 0),
  (pid, '4 kg', 82000, 6, 1),
  (pid, '8 kg', 150000, 3, 2);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('pechera-ajustable', 'Pechera ajustable', 'accesorios', '{perro}', '{pequeno,mediano,grande}', 'Acolchada y con broche de seguridad. No aprieta el cuello.', 'Talla', '{nuevo}', 'pets', 'mix', '[["Material","Malla acolchada"],["Cómo medir","Mide el pecho detrás de las patas delanteras."]]'::jsonb, null, 2)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, 'XS', 35000, 3, 0),
  (pid, 'S', 35000, 5, 1),
  (pid, 'M', 38000, 5, 2),
  (pid, 'L', 42000, 2, 3);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('galletas-entrenamiento', 'Galletas para entrenamiento', 'snacks', '{perro}', '{pequeno,mediano,grande}', 'Bocados pequeños para premiar sin pasarse de calorías.', null, '{top}', 'cookie', 'rose', '[]'::jsonb, null, 3)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, '200 g', 12000, 25, 0);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('cepillo-deslanador', 'Cepillo deslanador', 'higiene', '{perro,gato}', '{mediano,grande}', 'Retira el pelo muerto sin maltratar el manto.', null, '{}', 'brush', 'lav', '[]'::jsonb, null, 4)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, 'Único', 32000, 7, 0);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('pelota-caucho', 'Pelota de caucho resistente', 'juguetes', '{perro}', '{pequeno,mediano,grande}', 'Rebota y flota. Aguanta mordidas fuertes.', null, '{oferta}', 'sports_baseball', 'peach', '[]'::jsonb, 12000, 5)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, 'Única', 9000, 18, 0);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('alimento-humedo-gato', 'Alimento húmedo para gato', 'alimento', '{gato}', '{pequeno,mediano}', 'Sobre de 85 g con trozos en salsa.', 'Sabor', '{}', 'set_meal', 'mix', '[]'::jsonb, null, 6)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, 'Pollo', 6500, 30, 0),
  (pid, 'Salmón', 6500, 22, 1);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('collar-placa', 'Collar con placa de nombre', 'accesorios', '{perro,gato}', '{pequeno,mediano}', 'Te grabamos el nombre y tu celular en la placa.', 'Color', '{nuevo}', 'loyalty', 'rose', '[]'::jsonb, null, 7)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, 'Lila', 25000, 6, 0),
  (pid, 'Durazno', 25000, 4, 1),
  (pid, 'Morado oscuro', 25000, 5, 2);

insert into public.productos (slug, nombre, categoria, para, tamanos, descripcion, tipo_variante, etiquetas, icono, tono, caracteristicas, precio_antes, orden)
values ('toallitas-patas', 'Toallitas húmedas para patas', 'higiene', '{perro,gato}', '{pequeno,mediano,grande}', 'Para limpiar las patitas después del paseo.', null, '{}', 'clean_hands', 'lav', '[]'::jsonb, null, 8)
returning id into pid;
insert into public.variantes (producto_id, nombre, precio, stock, orden) values
  (pid, '50 unidades', 15000, 3, 0);
end $$;
