-- Carnet digital: el portal muestra la identificación del tutor en el carnet y en los PDF.
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 19).
drop function if exists public.mi_ficha();
create or replace function public.mi_ficha()
returns table (id uuid, nombre text, apellidos text, celular text, correo text, direccion text, barrio text, ciudad text, doc_tipo text, doc_numero text)
language sql stable security definer set search_path = public
as $$ select id, nombre, apellidos, celular, correo, direccion, barrio, ciudad, doc_tipo, doc_numero from public.propietarios where usuario_id = auth.uid() limit 1 $$;
revoke all on function public.mi_ficha() from public, anon;
grant execute on function public.mi_ficha() to authenticated;
