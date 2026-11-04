-- Pacientes de consulta y de spa: cada mascota dice a qué viene (solo consulta, solo spa o las dos) y,
-- si viene al spa, su perfil: guía de cuchilla, tipo de corte y observaciones.
-- La fórmula médica con varios medicamentos no necesita cambios: va en registros.datos.
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 20). Se puede correr más de una vez.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'pacientes' and column_name = 'servicio') then
    alter table public.pacientes
      add column servicio text not null default 'consulta' check (servicio in ('consulta', 'spa', 'ambos'));
    -- la primera vez se clasifica a los que ya existen según su historia
    update public.pacientes p set servicio = case
        when exists (select 1 from public.registros r where r.paciente_id = p.id and r.tipo not in ('spa', 'peso', 'nota')) then 'ambos'
        else 'spa' end
      where exists (select 1 from public.registros r where r.paciente_id = p.id and r.tipo = 'spa');
  end if;
end $$;

alter table public.pacientes
  add column if not exists spa jsonb not null default '{}' check (jsonb_typeof(spa) = 'object');

-- el equipo solo puede escribir las columnas que se le dan una por una: se le dan las dos nuevas
grant insert (servicio, spa), update (servicio, spa) on public.pacientes to authenticated;
