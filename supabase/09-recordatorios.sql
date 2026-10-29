-- Vacunas y recordatorios. Se pega en Supabase → SQL Editor → Run (después de 01 a 08).

-- cada aviso enviado al propietario (para saber cuándo se le recordó por última vez)
create table if not exists public.recordatorios (
  id          uuid primary key default gen_random_uuid(),
  registro_id uuid not null references public.registros (id) on delete cascade, -- la vacuna o desparasitación
  canal       text not null check (canal in ('whatsapp', 'correo')),
  por         uuid default auth.uid(),
  por_nombre  text,
  creado      timestamptz not null default now()
);
create index if not exists recordatorios_reg_idx on public.recordatorios (registro_id, creado desc);

alter table public.recordatorios enable row level security;
drop policy if exists "recordatorios: equipo" on public.recordatorios;
create policy "recordatorios: equipo" on public.recordatorios for all to authenticated
  using (public.tiene_rol(array['admin', 'veterinario', 'recepcion']))
  with check (public.tiene_rol(array['admin', 'veterinario', 'recepcion']));
revoke all on public.recordatorios from anon, authenticated;
grant select, insert (registro_id, canal, por_nombre) on public.recordatorios to authenticated;

-- esquemas: cada cuántos días se repite cada vacuna o desparasitación (con esto se calcula la próxima dosis)
insert into public.ajustes (clave, valor, publico) values
  ('esquemas', '{
     "Polivalente (parvovirus, moquillo y otras)": 365,
     "Antirrábica": 365,
     "Tos de las perreras": 365,
     "Leptospirosis": 365,
     "Triple felina": 365,
     "Leucemia felina": 365,
     "Desparasitación interna": 90,
     "Desparasitación externa (pulgas y garrapatas)": 30
   }', false)
on conflict (clave) do nothing;
