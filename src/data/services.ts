// Servicios del consultorio. Más adelante saldrán del gestor (Servicios y tarifas).
// price: null = todavía no se muestra en la página.

export interface Service {
  id: string;
  name: string;
  icon: string;
  text: string;
  price: string | null;
}

export const CLINIC_SERVICES: Service[] = [
  { id: 'consulta', name: 'Consulta general', icon: 'stethoscope', text: 'Anamnesis, examen físico, diagnóstico y plan de tratamiento.', price: null },
  { id: 'vacunacion', name: 'Vacunación', icon: 'vaccines', text: 'Esquema completo con carnet digital: laboratorio, lote, fecha y próxima dosis.', price: null },
  { id: 'desparasitacion', name: 'Desparasitación', icon: 'pill', text: 'Interna y externa, con recordatorio automático de la siguiente dosis.', price: null },
  { id: 'radiografia', name: 'Radiografía', icon: 'radiology', text: 'Imágenes diagnósticas en el consultorio, adjuntas a la historia clínica.', price: null },
  { id: 'cirugia', name: 'Cirugía', icon: 'medical_services', text: 'Procedimientos programados con valoración previa y control después.', price: null }
];

export const HOME_VISIT = {
  coverage: 'Toda Pereira y Dosquebradas',
  price: null as string | null, // pendiente
  reasons: [
    'Para mascotas que se estresan al salir o al viajar en carro.',
    'Para cachorros, mascotas mayores o varias mascotas en casa.'
  ]
};

export const VISIT_STEPS = [
  { title: 'Agendas', text: 'En la web o por WhatsApp. En el consultorio o a domicilio.' },
  { title: 'Te confirmamos', text: 'Un correo con la cita, listo para tu calendario.' },
  { title: 'Te recordamos', text: 'Un aviso antes de la cita.' },
  { title: 'La consulta', text: 'Todo queda en la historia clínica.' },
  { title: 'Tu portal', text: 'Mascotas, citas, carnet e historia en un solo lugar.' }
];
