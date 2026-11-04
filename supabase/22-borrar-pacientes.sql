-- Borrar mascotas desde el gestor (solo la administradora, igual que los propietarios y los registros).
-- Al borrar una mascota se borra su historia clínica; sus citas quedan en la agenda sin ficha.
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 21). Se puede correr más de una vez.
drop policy if exists "admin borra pacientes" on public.pacientes;
create policy "admin borra pacientes" on public.pacientes for delete to authenticated using (public.tiene_rol(array['admin']));
grant delete on public.pacientes to authenticated;
