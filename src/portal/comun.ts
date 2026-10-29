// Cálculos que comparten las pantallas del portal.
import type { Paciente, Registro } from '../gestor/clinica-datos';
import { SERVICIOS, hhmm, MESES, DIAS, diaSemana, type Cita } from '../gestor/agenda-datos';
import { ADDRESS } from '../data/site';

export const diasA = (f: string) => Math.round((new Date(f.slice(0, 10) + 'T12:00:00').getTime() - new Date().setHours(12, 0, 0, 0)) / 86400000);
export const fechaLarga = (d: Date) => `${DIAS[diaSemana(d)].toLowerCase()} ${d.getDate()} de ${MESES[d.getMonth()]}`;
export const fechaHora = (iso: string) => { const d = new Date(iso); return `${fechaLarga(d)} · ${hhmm(d.getHours() * 60 + d.getMinutes())}`; };
export const fechaCorta = (iso: string) => { const d = new Date(iso); return `${d.getDate()} ${MESES[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`; };
export const especieTxt = (m: Paciente) => (m.especie === 'felino' ? (m.sexo === 'hembra' ? 'Gata' : 'Gato') : m.especie === 'canino' ? (m.sexo === 'hembra' ? 'Perra' : 'Perro') : 'Mascota');
export const peso = (n: number | null) => (n == null ? '—' : `${String(n).replace('.', ',')} kg`);

// lo último de cada vacuna o desparasitación, con su próxima dosis
export function pendientes(regs: Registro[], pacs: Paciente[], dias = 45) {
  const ultimo = new Map<string, Registro>();
  for (const r of regs) {
    if ((r.tipo !== 'vacuna' && r.tipo !== 'desparasitacion') || !r.datos.proxima) continue;
    const k = r.paciente_id + '|' + r.titulo;
    const x = ultimo.get(k);
    if (!x || x.fecha < r.fecha) ultimo.set(k, r);
  }
  return [...ultimo.values()]
    .map((r) => ({ r, m: pacs.find((p) => p.id === r.paciente_id)!, d: diasA(r.datos.proxima) }))
    .filter((x) => x.m && x.d <= dias)
    .sort((a, b) => a.d - b.d);
}
export const estadoDosis = (d: number): [string, string] => (d < 0 ? [`Vencida`, 'st-mal'] : d === 0 ? ['Hoy', 'st-warn'] : [`En ${d} ${d === 1 ? 'día' : 'días'}`, d <= 15 ? 'st-warn' : 'st-ok']);

export const ESTADO_CITA: Record<string, [string, string]> = {
  solicitada: ['Por confirmar', 'st-warn'], confirmada: ['Confirmada', 'ok'], atendida: ['Atendida', 'st-old'], no_vino: ['No asistió', 'st-old'], cancelada: ['Cancelada', 'st-old']
};
export const servicioTxt = (c: Cita) => SERVICIOS[c.servicio].txt;

// archivo .ics para agregar la cita al calendario del celular
export function calendario(c: Cita, mascota: string) {
  const f = (iso: string) => iso.replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const txt = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Alma Animal//Portal//ES', 'BEGIN:VEVENT', `UID:${c.id}@almaanimal`, `DTSTAMP:${f(new Date().toISOString())}`,
    `DTSTART:${f(c.inicio)}`, `DTEND:${f(c.fin)}`, `SUMMARY:${servicioTxt(c)} de ${mascota} · Alma Animal`,
    `LOCATION:${c.direccion ?? ADDRESS.line + ', ' + ADDRESS.city}`, 'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([txt], { type: 'text/calendar' }));
  a.download = 'cita-alma-animal.ics';
  a.click();
}

export const ESTADO_PEDIDO: Record<string, [string, string]> = {
  nuevo: ['Recibido', 'st-warn'], confirmado: ['Confirmado', 'lav'], pagado: ['Pagado', 'lav'], enviado: ['En camino', 'lav'], entregado: ['Entregado', 'ok'], cancelado: ['Cancelado', 'st-old']
};
export const PASOS_PEDIDO = ['nuevo', 'confirmado', 'enviado', 'entregado'];
