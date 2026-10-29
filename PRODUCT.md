# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack
Pendiente: el framework se propondrá cuando el usuario diga "pasemos a programación" (candidatos del brief: Next.js o Astro + React). Fijados: Supabase (DB, Auth con correo y Google, archivos, RLS), correo transaccional con plan gratuito (Resend o Brevo), Netlify con despliegue continuo desde GitHub (ramas main y develop). Ruta: escritorio → responsive → PWA → evaluar app nativa.

## Users
- **Propietarios de mascotas en Pereira, Risaralda**: buscan consulta, vacunas, spa/peluquería o productos; quieren saber precio estimado, agendar rápido y escribir por WhatsApp.
- **Clientes registrados**: consultan sus mascotas, próximas citas, carnet de vacunas e historial de spa; solicitan citas.
- **Equipo interno** (roles: administradora, veterinario/a, peluquero/a, recepción): llevan historia clínica, agenda, recordatorios, inventario y contenido del sitio.

## Product Purpose
Una sola plataforma para el consultorio y spa de la Dra. Mariana: sitio público que convierte visitas en citas y pedidos por WhatsApp, portal de clientes y sistema de gestión clínica tipo OkVet. Éxito: citas agendadas, cotizaciones de spa enviadas, pedidos de tienda por WhatsApp, y un panel que reemplace herramientas externas.

## Positioning
Consultorio veterinario y spa en el mismo lugar, atendido por la propia médica (MVZ, TP 51206). El spa tiene protocolo detallado (shampoo hipoalergénico libre de parabenos, hidromasaje, aromaterapia, cierre con perfume, accesorio y snack) y un cotizador transparente por especie, raza, peso y manto.

## Operating Context
- Pedidos de tienda: carrito propio que llega al gestor; el pago se coordina por WhatsApp por ahora (contraentrega, transferencia o en el consultorio). Decidido 2026-10-28: Wompi será la pasarela de pago en el futuro (comisión aprox. 2,7–3,5 % + IVA por venta, sin mensualidad).
- Citas generan correo con archivo .ics y recordatorios automáticos (cita, vacuna, desparasitación).
- Carnet de vacunación virtual con sello digital según laboratorio del biológico, lote, fecha y próxima dosis.
- Política de tratamiento de datos: Ley 1581 de 2012 (Colombia).
- Todo el contenido (servicios, tarifas del spa y reglas del cotizador, productos, blog, equipo, banners, colores de acento) es editable desde el panel sin código.

## Capabilities and Constraints
- Idioma: español (Colombia). Moneda: COP.
- Integraciones gratuitas primero; cualquier costo o límite de plan gratuito se avisa antes, con alternativa.
- Diseño primero: no se escribe código de producción hasta que el usuario diga "pasemos a programación". Aprobación sección por sección.
- Desktop-first; responsive después.
- Dirección: Calle 1 # 9-02, barrio Alfonso López, Pereira.
- Horario: lunes a sábado, 8:00 a. m.–12:30 p. m. y 2:00–5:00 p. m. (descanso 12:30–2:00). Sábado: 8:00 a. m.–12:30 p. m.
- Cobertura a domicilio: toda Pereira y Dosquebradas.
- WhatsApp (2026-10-28): veterinaria y spa 324 679 6695 · petshop 301 792 5910. Cada botón escribe al número de su área.
- Hosting: Netlify (subdominio gratis *.netlify.app; dominio propio opcional más adelante).
- Peluquero: Albert (apellido pendiente).
- Pendientes: enlace de Facebook, tarifas reales del spa y precio de consulta/domicilio, apellido de Albert, foto real de Albert, historia para Nosotros, fotos de productos.
- Fotos reales del spa en diseno/assets/spa-resultados (convertidas de HEIC), usadas en «Así salen».

## Brand Commitments
- Marca pública: **Alma Animal**, con firma profesional **Dra. Mariana Hoyos Giraldo — Médica Veterinaria & Zootecnista — TP 51206**.
- Logo: gato (durazno) y perro (lavanda) que forman un corazón con una "M" y una huella. Ilustración secundaria: tigre rayado y perro en composición circular tipo yin-yang.
- Inspiración china sutil (composición circular, equilibrio, tigre); sin clichés.
- Fuente de verdad visual: logo (`Logo vertical.png`) e ilustración tigre-perro en esta carpeta; vectores pendientes. Sistema de diseño aprobado en `diseno/00-tokens-y-componentes.src.html`.
- Solo tema claro (sin modo oscuro). Botón flotante de WhatsApp solo con el isotipo.
- **Tienda con carrito propio** (ya no se cierra el pedido por WhatsApp, 2026-10-27): envío gratis siempre en Pereira y Dosquebradas; gratis a toda Colombia desde $70.000; por debajo de $70.000 fuera de esas dos ciudades, envío fijo de $20.000; envío prioritario +$5.000; obsequio desde $85.000 ($15.000 sobre el envío gratis): un snack dental, que se descuenta del inventario. Contadores de "te faltan $X" y sugerencias de productos. Datos de envío: nombre, apellido, celular, dirección, barrio, departamento (lista), ciudad (lista); cada campo con ejemplo. El pedido llega al gestor; el pago se coordina por WhatsApp; los números de Nequi/Daviplata/Bancolombia se definen más adelante.
- Cada producto tiene ficha propia con carrusel de fotos y características esenciales.
- Formulario de cita de spa (mascota, servicio, día/hora, propietario) que llega al gestor; confirmación por WhatsApp.
- Portal de clientes: al registrar al propietario se envía correo de bienvenida para crear contraseña. En el portal ve mascotas, carnet, exámenes e imágenes, spa, citas y pedidos, y agenda citas solo en horas libres (misma regla que la agenda interna: duración por servicio, quién atiende, descanso 12:30–2:00, cierre 5:00).
- WhatsApp es el canal principal de contacto: reforzarlo en todas las páginas.
- **Servicio médico a domicilio** (indispensable): consulta en casa en Pereira; cobertura, valor y servicios aplicables por confirmar.
- Zona de clientes = gestor completo tipo OkVet (no una tarjeta simple); se diseña en la etapa del portal.
- Sitio completo, no landing: Inicio (presentación de Alma Animal) + páginas propias para Consultorio, Spa y Petshop (más Nosotros, Blog, Contacto).
- **Sin cotizador del spa** (decisión del cliente, 2026-10-27): la gente no sabe si su mascota es de pelo largo; el precio se da por WhatsApp o al valorar. Las tarifas siguen siendo editables en el admin para uso interno.
- Identidad china en papel recortado: siluetas blancas caladas del tigre-perro y del corazón (diseno/assets/papel-*.png).
- Referencia que gusta al cliente: OkVet (degradados en botones, fondos lavados, palabras clave resaltadas en color).
- Tono: cálido, cercano, profesional, confiable. Lema: "Un animalito limpio es un animalito sano 💜💛".
- Teléfonos: 324 679 6695 · 301 792 5910. Instagram: @vet_alma_animal · @vet_marianahoyos.

## Evidence on Hand
Solo el brief. No hay fotos, testimonios, reseñas, precios confirmados ni artículos de blog: no inventarlos como reales; los ejemplos en maquetas se marcan como ejemplo.

## Product Principles
1. Del interés a la cita en dos pasos: agendar o WhatsApp siempre a mano.
2. Precios claros y honestos: el cotizador siempre dice que es un estimado sujeto a valoración.
3. La doctora es la garantía: lo profesional (TP, protocolo, carnet con sello) se ve.
4. Todo editable por el equipo sin depender de un desarrollador.
5. Gratis primero; cada costo se avisa antes.

## Accessibility & Inclusion
WCAG 2.2 AA como requisito (contraste, foco visible, teclado). Público general de todas las edades, incluidos adultos mayores: textos legibles y objetivos táctiles amplios.
- Horario: no cierran en diciembre (solo festivos de Colombia).
- Vínculo pedido ↔ propietario (2026-10-28): por celular normalizado. Celular + correo coinciden → se une solo; solo celular → el gestor pregunta "¿Es de…?" y se confirma por WhatsApp; sin coincidencia → "Crear ficha". Ingreso opcional en el carrito (prellena datos). En el portal, "¿Falta un pedido?" con número de pedido + código por WhatsApp.
- Exámenes: se muestran en el portal apenas se suben (2026-10-28). El cliente verá el precio de la consulta al agendar (valor por definir).
- Responsive (2026-10-28): orden sitio público → gestor → portal. Regla: adaptar todo; si una imagen no se adapta, se descarta en celular; nada cortado; mantener la información relevante.
- WhatsApp (2026-10-28): verde del logo #00BC39 para botones, bordes, íconos y botón flotante; textos verdes en #00852A (mismo tono, legible). Reemplaza al #137A4A.
- Celular (2026-10-28): calendarios por día o por carril, nunca columnas apretadas (Hoy: pestañas Consulta/Spa/Domicilio; Agenda: un día a la vez con selector de días). Pasos en una sola fila. Ningún texto puede quedar montado ni cortado.
