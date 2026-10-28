// Datos del negocio. Más adelante saldrán del gestor (Supabase); por ahora viven aquí.

const wa = (num: string, msg: string) => `https://wa.me/${num}?text=${encodeURIComponent(msg)}`;

export const PHONES = {
  vet: { label: 'Veterinaria y spa', display: '324 679 6695', e164: '573246796695' },
  shop: { label: 'Petshop', display: '301 792 5910', e164: '573017925910' }
};

export const whatsapp = {
  vet: (msg = 'Hola, Alma Animal. Quiero hacer una consulta.') => wa(PHONES.vet.e164, msg),
  shop: (msg = 'Hola, Alma Animal. Tengo una pregunta sobre la tienda.') => wa(PHONES.shop.e164, msg)
};

export const ADDRESS = {
  line: 'Calle 1 # 9-02, Alfonso López',
  city: 'Pereira, Risaralda',
  maps: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Calle 1 # 9-02, Alfonso López, Pereira, Risaralda')
};

export const HOURS = [
  { days: 'Lunes a viernes', time: '8:00 a. m. – 12:30 p. m. y 2:00 – 5:00 p. m.' },
  { days: 'Sábados', time: '8:00 a. m. – 12:30 p. m.' }
];

export const SOCIAL = {
  instagram: [
    { handle: '@vet_alma_animal', url: 'https://instagram.com/vet_alma_animal' },
    { handle: '@vet_marianahoyos', url: 'https://instagram.com/vet_marianahoyos' }
  ],
  facebook: null as string | null // pendiente
};

export const DOCTOR = {
  name: 'Dra. Mariana Hoyos Giraldo',
  title: 'Médica Veterinaria y Zootecnista',
  tp: 'TP 51206'
};

export const NAV = [
  { href: '/', label: 'Inicio' },
  { href: '/consultorio', label: 'Consultorio' },
  { href: '/spa', label: 'Spa' },
  { href: '/petshop', label: 'Petshop' },
  { href: '/#nosotros', label: 'Nosotros' },
  { href: '/blog', label: 'Blog' },
  { href: '#contacto', label: 'Contacto' }
];
