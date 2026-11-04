-- Contabilidad: lo que entra, lo que sale y el reparto entre socios. Solo la ve y la maneja la administradora.
-- Se pega en Supabase → SQL Editor → Run (después de 01 a 22). Se puede correr más de una vez.
--
-- Lo que ENTRA no se escribe dos veces: sale solo de donde ya se marca.
--   · Consultas, vacunas, domicilios, radiografías y cirugías: citas de la doctora marcadas «Atendida» en la Agenda
--     (el valor cobrado y cómo pagó quedan en citas.datos: total y pago).
--   · Baños: citas del spa marcadas «Entregada y pagada» en Citas de spa (citas.datos.total y pago).
--   · Tienda: pedidos con el pago confirmado en Pedidos (pagado_en, que se pone solo).
-- Mientras no se marquen, quedan «en espera» y no suman.
-- Aquí se guardan los GASTOS, los ingresos sueltos (ventas de mostrador, otros), los gastos fijos y el reparto.

-- ---------- PEDIDOS: fecha en que se confirmó el pago ----------
-- Transferencia o Nequi: al pasar a «Pago recibido» (o después). Contraentrega o en el consultorio: al entregarse.
alter table public.pedidos add column if not exists pagado_en timestamptz;

create or replace function public.pedidos_pagado_en() returns trigger language plpgsql as $$
declare cobrado boolean;
begin
  cobrado := new.estado = 'entregado'
    or (new.estado in ('pagado', 'enviado') and new.pago not in ('contraentrega', 'consultorio'));
  if cobrado and new.pagado_en is null then new.pagado_en := now();
  elsif not cobrado then new.pagado_en := null;
  end if;
  return new;
end $$;
drop trigger if exists pedidos_pagado_en on public.pedidos;
create trigger pedidos_pagado_en before insert or update on public.pedidos for each row execute function public.pedidos_pagado_en();

-- la primera vez: los pedidos que ya estaban pagados toman la fecha de su último cambio
update public.pedidos set pagado_en = actualizado
  where pagado_en is null
    and (estado = 'entregado' or (estado in ('pagado', 'enviado') and pago not in ('contraentrega', 'consultorio')));
create index if not exists pedidos_pagado_idx on public.pedidos (pagado_en);
grant select (pagado_en) on public.pedidos to authenticated;

-- ---------- GASTOS FIJOS (arriendo, luz, agua…): la plantilla de cada mes ----------
create table if not exists public.gastos_fijos (
  id        uuid primary key default gen_random_uuid(),
  nombre    text not null check (length(nombre) between 1 and 60),
  categoria text not null default 'servicios' check (categoria in ('arriendo', 'servicios', 'meta', 'medic', 'insumos', 'merc', 'otro')),
  icono     text not null default 'receipt_long' check (length(icono) <= 40),
  dia       smallint not null default 1 check (dia between 1 and 31),   -- día del mes en que vence
  varia     boolean not null default false,                            -- cambia cada mes (luz, agua): espera el valor del recibo
  valor     integer not null default 0 check (valor >= 0),             -- valor de referencia
  activo    boolean not null default true,
  orden     smallint not null default 0,
  creado    timestamptz not null default now()
);

-- ---------- MOVIMIENTOS: gastos e ingresos que se registran a mano ----------
-- Un gasto fijo de un mes es un movimiento con fijo_id y mes ('2026-11'); queda pendiente (pagado = false)
-- hasta que se marca como pagado. Solo suman los movimientos pagados.
create table if not exists public.movimientos (
  id         uuid primary key default gen_random_uuid(),
  fecha      date not null default (now() at time zone 'America/Bogota')::date,
  tipo       text not null check (tipo in ('ingreso', 'gasto')),
  categoria  text not null check (categoria in ('consulta', 'vacuna', 'spa', 'tienda', 'otro_ingreso',
                                                'arriendo', 'servicios', 'meta', 'medic', 'insumos', 'merc', 'otro')),
  concepto   text not null check (length(concepto) between 1 and 120),
  valor      integer not null check (valor >= 0 and valor <= 1000000000),
  medio      text check (medio is null or length(medio) <= 40),
  factura    text check (factura is null or length(factura) <= 300),   -- ruta de la foto en el depósito "contabilidad"
  pagado     boolean not null default true,
  fijo_id    uuid references public.gastos_fijos (id) on delete set null,
  mes        text check (mes is null or mes ~ '^\d{4}-\d{2}$'),
  por_nombre text,
  creado     timestamptz not null default now(),
  constraint movimientos_fijo_mes unique (fijo_id, mes)
);
create index if not exists movimientos_fecha_idx on public.movimientos (fecha desc);

-- ---------- REPARTO entre socios: qué se le pagó a cada quien de cada mes ----------
create table if not exists public.repartos (
  mes       text not null check (mes ~ '^\d{4}-\d{2}$'),
  socio     text not null check (length(socio) between 1 and 40),
  valor     integer not null check (valor >= 0),
  pagado_en timestamptz not null default now(),
  primary key (mes, socio)
);

-- ---------- SOCIOS y porcentajes (se ajustan aquí; la suma debe dar 100) ----------
insert into public.ajustes (clave, valor, publico) values
  ('socios', '[
     {"id": "mariana", "nombre": "Mariana Hoyos", "rol": "Médica veterinaria", "pct": 50},
     {"id": "albert", "nombre": "Albert", "rol": "Peluquero del spa", "pct": 50}
   ]', false)
on conflict (clave) do nothing;

-- gastos fijos de arranque (valores de referencia; se cambian en el gestor)
insert into public.gastos_fijos (nombre, categoria, icono, dia, varia, valor, orden)
select * from (values
  ('Arriendo del local', 'arriendo', 'home', 5, false, 0, 1),
  ('Agua', 'servicios', 'water_drop', 5, true, 0, 2),
  ('Internet y celular', 'servicios', 'wifi', 15, false, 0, 3),
  ('Luz', 'servicios', 'bolt', 27, true, 0, 4),
  ('Pauta en Meta', 'meta', 'campaign', 30, true, 0, 5)
) as v(nombre, categoria, icono, dia, varia, valor, orden)
where not exists (select 1 from public.gastos_fijos);

-- ---------- REGLAS (RLS): solo la administradora ----------
alter table public.gastos_fijos enable row level security;
alter table public.movimientos enable row level security;
alter table public.repartos enable row level security;

drop policy if exists "gastos_fijos: admin" on public.gastos_fijos;
create policy "gastos_fijos: admin" on public.gastos_fijos for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
drop policy if exists "movimientos: admin" on public.movimientos;
create policy "movimientos: admin" on public.movimientos for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));
drop policy if exists "repartos: admin" on public.repartos;
create policy "repartos: admin" on public.repartos for all to authenticated
  using (public.tiene_rol(array['admin'])) with check (public.tiene_rol(array['admin']));

revoke all on public.gastos_fijos, public.movimientos, public.repartos from anon, authenticated;
grant select, insert, update, delete on public.gastos_fijos, public.movimientos, public.repartos to authenticated;

-- ---------- FOTOS DE FACTURAS (privadas) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('contabilidad', 'contabilidad', false, 10485760)
on conflict (id) do nothing;
drop policy if exists "contabilidad: admin ve" on storage.objects;
create policy "contabilidad: admin ve" on storage.objects for select to authenticated
  using (bucket_id = 'contabilidad' and public.tiene_rol(array['admin']));
drop policy if exists "contabilidad: admin sube" on storage.objects;
create policy "contabilidad: admin sube" on storage.objects for insert to authenticated
  with check (bucket_id = 'contabilidad' and public.tiene_rol(array['admin']));
drop policy if exists "contabilidad: admin borra" on storage.objects;
create policy "contabilidad: admin borra" on storage.objects for delete to authenticated
  using (bucket_id = 'contabilidad' and public.tiene_rol(array['admin']));
