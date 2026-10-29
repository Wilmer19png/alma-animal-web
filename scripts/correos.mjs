// Genera las plantillas de los correos de Supabase (Authentication → Emails → Templates) con la marca.
// Uso: node scripts/correos.mjs  → escribe supabase/correos/*.html y supabase/correos/LEEME.md
// Los correos usan tablas y estilos en línea porque Gmail y Outlook no leen hojas de estilo.
import { mkdirSync, writeFileSync, copyFileSync } from 'node:fs';

const SITIO = 'https://almaanimalvet.netlify.app';
const LOGO = `${SITIO}/correo/logo.png`;
const C = { ink: '#2B1E48', muted: '#584E6E', fondo: '#F6EFF6', borde: '#E6E1E7', primario: '#655785', primario2: '#4D3F6C', durazno: '#FBCFAF', lav: '#EADDFF' };
const FUENTE = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
const SERIF = "Georgia, 'Times New Roman', serif";

function correo({ titulo, previa, saludo, parrafos, boton, nota, extra = '' }) {
  const p = (t) => `<p style="margin:0 0 16px;font:400 16px/1.6 ${FUENTE};color:${C.muted};">${t}</p>`;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:${C.fondo};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previa}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.fondo};">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <!-- logo -->
      <tr><td align="center" style="padding:0 0 20px;">
        <img src="${LOGO}" width="64" height="56" alt="" style="display:block;border:0;width:64px;height:auto;">
        <div style="margin-top:10px;font:700 22px/1.1 ${FUENTE};color:${C.ink};">Alma Animal</div>
        <div style="margin-top:4px;font:400 13px/1.2 ${SERIF};color:${C.muted};">Consultorio · Spa · Petshop</div>
      </td></tr>
      <!-- tarjeta -->
      <tr><td style="background:#FFFFFF;border-radius:24px;border:1px solid ${C.borde};padding:36px 32px;">
        <div style="height:6px;width:56px;border-radius:3px;background:${C.durazno};background-image:linear-gradient(90deg,${C.durazno},${C.lav});margin:0 0 24px;"></div>
        <h1 style="margin:0 0 16px;font:700 26px/1.25 ${FUENTE};color:${C.ink};">${titulo}</h1>
        ${saludo ? p(saludo) : ''}
        ${parrafos.map(p).join('\n        ')}
        <!-- botón -->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
          <tr><td align="center" bgcolor="${C.primario}" style="border-radius:999px;background:${C.primario};background-image:linear-gradient(135deg,${C.primario},${C.primario2});">
            <a href="${boton.url}" target="_blank" style="display:inline-block;padding:15px 30px;font:700 16px/1 ${FUENTE};color:#FFFFFF;text-decoration:none;border-radius:999px;">${boton.txt}</a>
          </td></tr>
        </table>
        ${extra}
        <p style="margin:0 0 6px;font:400 13px/1.5 ${FUENTE};color:${C.muted};">${nota}</p>
        <p style="margin:0;font:400 12px/1.5 ${FUENTE};color:#8A8296;word-break:break-all;">Si el botón no abre, copia este enlace en tu navegador:<br><a href="${boton.url}" style="color:${C.primario};">${boton.url}</a></p>
      </td></tr>
      <!-- firma -->
      <tr><td align="center" style="padding:24px 16px 8px;">
        <div style="font:700 14px/1.4 ${SERIF};color:${C.ink};">Dra. Mariana Hoyos Giraldo</div>
        <div style="font:400 12px/1.5 ${FUENTE};color:${C.muted};">Médica Veterinaria y Zootecnista · TP 51206</div>
        <div style="margin-top:10px;font:400 12px/1.6 ${FUENTE};color:${C.muted};">Calle 1 # 9-02, Alfonso López, Pereira · WhatsApp 324 679 6695<br>
          <a href="${SITIO}" style="color:${C.primario};text-decoration:underline;">almaanimalvet.netlify.app</a> · <a href="${SITIO}/privacidad" style="color:${C.primario};text-decoration:underline;">Tratamiento de datos</a></div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>
`;
}

// Supabase reemplaza {{ .ConfirmationURL }}, {{ .Email }}, {{ .Token }}, {{ .NewEmail }} al enviar.
const URLC = '{{ .ConfirmationURL }}';
const PLANTILLAS = [
  {
    archivo: 'confirmar-registro', menu: 'Confirm sign up', asunto: 'Confirma tu correo · Alma Animal 🐾',
    html: correo({
      titulo: 'Confirma tu correo', previa: 'Un toque y entras a tu portal de Alma Animal.',
      parrafos: ['Con este correo entras a tu portal de Alma Animal: ves el carnet de vacunas de tu mascota, sus consultas y exámenes, y agendas citas en las horas libres.', 'Toca el botón para confirmar que este correo es tuyo.'],
      boton: { txt: 'Confirmar y entrar', url: URLC }, nota: 'El enlace sirve por una hora. Si no fuiste tú, ignora este correo.'
    })
  },
  {
    archivo: 'enlace-para-entrar', menu: 'Magic link', asunto: 'Tu enlace para entrar · Alma Animal 🐾',
    html: correo({
      titulo: 'Tu enlace para entrar', previa: 'Entra a tu portal sin contraseña.',
      parrafos: ['Pediste entrar a tu portal de Alma Animal. Toca el botón y entras de una vez, sin contraseña.', 'Ábrelo desde el mismo celular o computador donde lo pediste.'],
      boton: { txt: 'Entrar a mi portal', url: URLC }, nota: 'El enlace sirve por una hora y solo una vez. Si no lo pediste, ignora este correo: nadie puede entrar sin él.'
    })
  },
  {
    archivo: 'restablecer-contrasena', menu: 'Reset password', asunto: 'Crea una contraseña nueva · Alma Animal',
    html: correo({
      titulo: 'Crea una contraseña nueva', previa: 'Recupera el acceso a tu cuenta de Alma Animal.',
      parrafos: ['Recibimos una solicitud para crear una contraseña nueva para tu cuenta de Alma Animal.', 'Toca el botón y escribe la contraseña que quieras.'],
      boton: { txt: 'Crear contraseña nueva', url: URLC }, nota: 'El enlace sirve por una hora. Si no lo pediste, ignora este correo: tu contraseña sigue igual.'
    })
  },
  {
    archivo: 'invitacion', menu: 'Invite user', asunto: 'Te invitamos a Alma Animal 🐾',
    html: correo({
      titulo: 'Te invitamos a Alma Animal', previa: 'Crea tu contraseña para entrar.',
      parrafos: ['Te dieron acceso a Alma Animal. Toca el botón para crear tu contraseña; después entras con este correo y esa contraseña.'],
      boton: { txt: 'Crear mi contraseña', url: URLC }, nota: 'El enlace sirve por 24 horas. Si no esperabas esta invitación, ignora este correo.'
    })
  },
  {
    archivo: 'cambiar-correo', menu: 'Change email address', asunto: 'Confirma tu correo nuevo · Alma Animal',
    html: correo({
      titulo: 'Confirma tu correo nuevo', previa: 'Confirma el cambio de correo de tu cuenta.',
      parrafos: ['Pediste cambiar el correo de tu cuenta de Alma Animal de <b style="color:#2B1E48;">{{ .Email }}</b> a <b style="color:#2B1E48;">{{ .NewEmail }}</b>.', 'Toca el botón para confirmar el cambio.'],
      boton: { txt: 'Confirmar el cambio', url: URLC }, nota: 'Si no pediste este cambio, ignora este correo y escríbenos por WhatsApp.'
    })
  }
];

mkdirSync('supabase/correos', { recursive: true });
mkdirSync('public/correo', { recursive: true });
copyFileSync('src/assets/corazon.png', 'public/correo/logo.png');
for (const t of PLANTILLAS) writeFileSync(`supabase/correos/${t.archivo}.html`, t.html);
writeFileSync('supabase/correos/LEEME.md', `# Correos de Alma Animal (plantillas de Supabase)

Se pegan en **Supabase → Authentication → Emails → Templates**. Para cada plantilla: elige la pestaña, cambia el
**Subject** (asunto), borra todo el **Message body** y pega el contenido del archivo. Luego **Save**.

| Pestaña en Supabase | Asunto | Archivo |
|---|---|---|
${PLANTILLAS.map((t) => `| ${t.menu} | ${t.asunto} | \`${t.archivo}.html\` |`).join('\n')}

Para cambiar un texto: edita scripts/correos.mjs y corre \`node scripts/correos.mjs\`.
`);
console.log('ok', PLANTILLAS.length);
