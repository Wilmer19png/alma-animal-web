-- Exámenes y archivos de la historia: la doctora decide si el dueño lo ve en su portal.
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 17).
alter table public.registros add column if not exists privado boolean not null default false;

grant insert (privado), update (privado) on public.registros to authenticated;

-- el dueño ve la historia de sus mascotas, menos las notas internas y lo marcado como "solo equipo"
drop policy if exists "historia: el dueño ve la de sus mascotas" on public.registros;
create policy "historia: el dueño ve la de sus mascotas" on public.registros for select to authenticated
  using (tipo <> 'nota' and not privado
         and paciente_id in (select id from public.pacientes where propietario_id = public.mi_propietario()));
