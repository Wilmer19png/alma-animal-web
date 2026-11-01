# Correos de Alma Animal (plantillas de Supabase)

Se pegan en **Supabase → Authentication → Emails → Templates**. Para cada plantilla: elige la pestaña, cambia el
**Subject** (asunto), borra todo el **Message body** y pega el contenido del archivo. Luego **Save**.

| Pestaña en Supabase | Asunto | Archivo |
|---|---|---|
| Confirm sign up | Confirma tu correo · Alma Animal 🐾 | `confirmar-registro.html` |
| Magic link | Tu enlace para entrar · Alma Animal 🐾 | `enlace-para-entrar.html` |
| Reset password | Crea una contraseña nueva · Alma Animal | `restablecer-contrasena.html` |
| Invite user | Te invitamos a Alma Animal 🐾 | `invitacion.html` |
| Change email address | Confirma tu correo nuevo · Alma Animal | `cambiar-correo.html` |

Para cambiar un texto: edita scripts/correos.mjs y corre `node scripts/correos.mjs`.
