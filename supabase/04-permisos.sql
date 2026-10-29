-- Permisos exactos por columna. Se pega en Supabase → SQL Editor → Run (después de 01, 02 y 03).
--
-- Supabase da por defecto todos los permisos de cada tabla nueva a "anon" (visitantes) y "authenticated"
-- (usuarios con sesión). Las reglas RLS ya limitan QUÉ FILAS ve cada quien; aquí se limita QUÉ COLUMNAS
-- puede escribir: la web solo crea pedidos y suscripciones con los datos del formulario, y el equipo
-- solo cambia el estado, el pago y la nota de un pedido (nunca sus productos ni sus valores).

revoke all on public.pedidos, public.suscriptores, public.equipo from anon, authenticated;

-- ---------- visitantes de la página ----------
grant insert (codigo, nombre, apellido, celular, correo, departamento, ciudad, direccion, barrio, indicaciones,
              items, subtotal, envio, prioritario, total, obsequio, aviso_compras, acepto_terminos, version_politicas)
  on public.pedidos to anon;
grant insert (correo, acepto_datos, version_politicas, origen) on public.suscriptores to anon;

-- ---------- equipo con sesión (las reglas RLS dicen qué rol ve qué) ----------
grant select on public.pedidos to authenticated;
grant update (estado, pago, nota_interna) on public.pedidos to authenticated;
grant select on public.suscriptores to authenticated;
grant update (activo) on public.suscriptores to authenticated;
grant select, insert, update, delete on public.equipo to authenticated;

-- las tablas que se creen después también arrancan cerradas: cada archivo da sus propios permisos
alter default privileges in schema public revoke all on tables from anon, authenticated;
