import { Resend } from 'resend';
import { config } from './config.js';

export type PropositoCorreo = 'verificacion_email' | 'recuperacion_contrasena';

export async function enviarCodigoDeAcceso(destinatario: string, codigo: string, proposito: PropositoCorreo): Promise<void> {
  if (!config.RESEND_API_KEY || !config.EMAIL_FROM) {
    throw Object.assign(new Error('El envío de correos aún no está configurado en el servidor.'), { status: 503 });
  }

  const esVerificacion = proposito === 'verificacion_email';
  const asunto = esVerificacion ? 'Verifica tu correo de Mi Negocio' : 'Restablece tu contraseña de Mi Negocio';
  const instruccion = esVerificacion
    ? 'Escribe este código en la aplicación para verificar tu correo:'
    : 'Escribe este código en la aplicación y elige una contraseña nueva:';
  const expiracion = esVerificacion ? '24 horas' : '15 minutos';
  const resend = new Resend(config.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: config.EMAIL_FROM,
    to: [destinatario],
    subject: asunto,
    text: `${instruccion}\n\n${codigo}\n\nEste código vence en ${expiracion}. Si no solicitaste esta acción, ignora este correo.`,
    html: `<p>${instruccion}</p><p style="font-size:24px;font-weight:bold;letter-spacing:3px">${codigo}</p><p>Este código vence en ${expiracion}. Si no solicitaste esta acción, ignora este correo.</p>`,
  });
  if (error) {
    throw Object.assign(new Error('No fue posible enviar el correo. Inténtalo de nuevo más tarde.'), { status: 502 });
  }
}
