-- Envíos, obsequio y formas de pago. Se pega en Supabase → SQL Editor → Run (después de 01 a 13).
-- Pública: el carrito y las páginas de la tienda las usan. Solo la administradora las cambia.
-- Como esas reglas quedan escritas en varias páginas, al guardarlas se vuelve a publicar el sitio
-- (el mismo aviso a Netlify del blog, agrupado cada 10 minutos).
insert into public.ajustes (clave, valor, publico) values
  ('envios', '{
     "ciudades": ["Pereira", "Dosquebradas"],
     "gratisDesde": 70000,
     "fijo": 20000,
     "prioritario": {"activo": true, "valor": 5000},
     "obsequio": {"activo": true, "desde": 85000, "nombre": "snack dental"},
     "pagos": {"contraentrega": true, "transferencia": true, "consultorio": true}
   }', true)
on conflict (clave) do nothing;

create or replace function public.ajustes_republicar() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.clave = 'envios' and new.valor is distinct from old.valor then
    update public.despliegue set pendiente = true where id = 1;
  end if;
  return null;
end $$;
drop trigger if exists ajustes_republicar on public.ajustes;
create trigger ajustes_republicar after update on public.ajustes for each row execute function public.ajustes_republicar();
