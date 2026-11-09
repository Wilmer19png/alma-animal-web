-- Contabilidad: el consultorio ya no mete todo en «Consultas». Nuevas categorías de ingreso:
--   medicamento   → Medicamentos y antiparasitarios (fórmulas, medicación, Credelio, Rondel, Milpro…)
--   examen        → Exámenes e imágenes (prequirúrgicos, laboratorio, ecografías, Rx, tests)
--   procedimiento → Procedimientos y cirugías (cirugías, profilaxis, hidrataciones, nebulizaciones)
-- Se pega en Supabase → SQL Editor → Run, ANTES de volver a correr contabilidad/importar-excel.sql.
-- Se puede correr más de una vez.
alter table public.libro_contable drop constraint if exists libro_contable_categoria_check;
alter table public.libro_contable add constraint libro_contable_categoria_check check (categoria in (
  'consulta', 'medicamento', 'examen', 'procedimiento', 'vacuna', 'spa', 'tienda', 'otro_ingreso',
  'arriendo', 'servicios', 'meta', 'medic', 'insumos', 'merc', 'otro'
));
