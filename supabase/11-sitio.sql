-- Textos e imágenes de la página. Se pega en Supabase → SQL Editor → Run (después de 01 a 10).
-- Pública: la página la lee al cargar y aplica los textos cambiados. Solo la administradora la cambia.
insert into public.ajustes (clave, valor, publico) values
  ('sitio', '{"textos": {}, "ocultos": {}, "seo": {}, "anuncio": {"activo": false, "texto": "", "enlace": ""}}', true)
on conflict (clave) do nothing;
