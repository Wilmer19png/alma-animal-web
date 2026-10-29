-- Servicios y tarifas del spa. Se pega en Supabase → SQL Editor → Run (después de 01 a 09).
-- Pública: la página de Spa la lee para mostrar los precios. Solo la administradora la cambia.
-- Arranca con precios de ejemplo y "mostrar": "no", así la web no muestra nada hasta que la doctora ponga los reales.
insert into public.ajustes (clave, valor, publico) values
  ('tarifas', '{
     "limites": [10, 25, 40],
     "servicios": [
       {"id": "bano", "nombre": "Baño completo", "tipo": "servicio", "desc": "Los 8 cuidados, secado y cierre con perfume, accesorio y snack.", "precios": {"pequeno": 40000, "mediano": 50000, "grande": 65000, "gigante": 80000, "gato": 45000}, "web": true},
       {"id": "corte", "nombre": "Corte según la raza", "tipo": "adicional", "desc": "Se suma al baño completo.", "precios": {"pequeno": 15000, "mediano": 20000, "grande": 25000, "gigante": 30000, "gato": 15000}, "web": true},
       {"id": "medicado", "nombre": "Baño medicado", "tipo": "adicional", "desc": "Para piel sensible o con indicación de la doctora.", "precios": {"pequeno": 5000, "mediano": 8000, "grande": 8000, "gigante": 10000, "gato": 5000}, "web": true},
       {"id": "desenredo", "nombre": "Desenredado", "tipo": "adicional", "desc": "Si llega con nudos. Se avisa al dueño antes de cobrarlo.", "precios": {"pequeno": 10000, "mediano": 15000, "grande": 20000, "gigante": 25000, "gato": 10000}, "web": false},
       {"id": "unas", "nombre": "Solo corte de uñas", "tipo": "servicio", "desc": "Sin baño, mientras esperas.", "precios": {"pequeno": 10000, "mediano": 10000, "grande": 12000, "gigante": 15000, "gato": 10000}, "web": true}
     ],
     "mostrar": "no",
     "proximo": 4
   }', true)
on conflict (clave) do nothing;
