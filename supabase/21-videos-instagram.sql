-- Videos de Instagram de la doctora (gestor → Equipo → «Videos de Instagram»).
-- Se ven en «Conoce a la doctora», en «Videos de la doctora». Se pega en Supabase → SQL Editor → Run (después de 01 a 20).
alter table public.personas
  add column if not exists videos_ig text[] not null default '{}' check (cardinality(videos_ig) <= 9);

grant select (videos_ig) on public.personas to anon;
