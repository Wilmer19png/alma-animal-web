-- Perfil completo del equipo (gestor → Equipo): área, temas, universidad, historia, frase, foto de cuerpo
-- entero, video de presentación y fotos en acción. Se ve en el Inicio (Nosotros), el Consultorio y
-- la página «Conoce a la doctora». Se pega en Supabase → SQL Editor → Run (después de 01 a 18).
alter table public.personas
  add column if not exists area        text not null default 'consultorio' check (area in ('consultorio', 'spa', 'tienda')),
  add column if not exists temas       text[] not null default '{}',
  add column if not exists universidad text check (universidad is null or length(universidad) <= 120),
  add column if not exists frase       text check (frase is null or length(frase) <= 220),
  add column if not exists historia    text check (historia is null or length(historia) <= 2000),
  add column if not exists foto_cuerpo text check (foto_cuerpo is null or foto_cuerpo ~ '^https://'),
  add column if not exists video       text check (video is null or video ~ '^https://'),
  add column if not exists galeria     jsonb not null default '[]' check (jsonb_typeof(galeria) = 'array' and jsonb_array_length(galeria) <= 8);

-- la doctora ya es del consultorio; si hay alguien del spa con «pelu» en el cargo, queda en el spa
update public.personas set area = 'spa' where area = 'consultorio' and cargo ~* 'pelu|spa|groom';

grant select (area, temas, universidad, frase, historia, foto_cuerpo, video, galeria) on public.personas to anon;

-- el video puede pesar hasta 50 MB (es el máximo por archivo del plan gratis de Supabase)
update storage.buckets set file_size_limit = 52428800 where id = 'equipo';
