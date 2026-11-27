import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';

// Names are typed by users and end up inside HTML.
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

// TEMPORAL: actualmente usamos Resend.
// En el futuro podemos volver a SMTP/Nodemailer.
@Injectable()
export class EmailService {
  // Created on first use: Resend throws without a key, which would stop the
  // whole API from starting wherever email is not configured.
  private client?: Resend;

  private get resend() {
    this.client ??= new Resend(process.env.RESEND_API_KEY);
    return this.client;
  }

  async sendVerificationEmail(
    name: string,
    email: string,
    token: string,
  ) {
    const from = process.env.EMAIL_FROM;
    const verificationUrl = process.env.EMAIL_VERIFICATION_URL;

    if (!process.env.RESEND_API_KEY || !from || !verificationUrl) {
      throw new ServiceUnavailableException(
        'El servicio de email no está configurado',
      );
    }

    const url = new URL(verificationUrl);
    url.searchParams.set('token', token);

    // ============================================================
    // RESEND - IMPLEMENTACIÓN TEMPORAL
    // ============================================================

    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Conferma il tuo indirizzo email - GarageApp',
      text: `Ciao ${name}, conferma il tuo indirizzo email: ${url.toString()}. Il link scade tra 24 ore.`,
      html: `
        <p>Ciao ${escapeHtml(name)},</p>

        <p>
          Hai creato un account GarageApp.
          Conferma il tuo indirizzo email per accedere.
        </p>

        <p>
          <a href="${url.toString()}">
            Conferma il mio email
          </a>
        </p>

        <p>
          Questo link scade tra 24 ore.
        </p>
      `,
    });

    if (error) {
      throw new ServiceUnavailableException(
        `No se pudo enviar el email: ${error.message}`,
      );
    }

    // ============================================================
    // SMTP / NODEMAILER - RESERVADO PARA FUTURO
    // ============================================================

    /*
    const host = process.env.SMTP_HOST;
    const smtpFrom = process.env.SMTP_FROM;

    if (!host || !smtpFrom || !verificationUrl) {
      throw new ServiceUnavailableException(
        'El servicio de email no está configurado',
      );
    }

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth:
        process.env.SMTP_USER && process.env.SMTP_PASSWORD
          ? {
              user: process.env.SMTP_USER,
              pass: process.env.SMTP_PASSWORD,
            }
          : undefined,
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: email,
      subject: 'Conferma il tuo indirizzo email - GarageApp',
      text: `Ciao ${name}, conferma il tuo indirizzo email: ${url.toString()}. Il link scade tra 24 ore.`,
      html: `
        <p>Ciao ${name},</p>
        <p>
          Hai creato un account GarageApp.
          Conferma il tuo indirizzo email per accedere.
        </p>
        <p>
          <a href="${url.toString()}">
            Conferma il mio email
          </a>
        </p>
        <p>
          Questo link scade tra 24 ore.
        </p>
      `,
    });
    */
  }

  async sendPasswordResetEmail(name: string, email: string, code: string) {
    const from = process.env.EMAIL_FROM;
    if (!process.env.RESEND_API_KEY || !from) throw new ServiceUnavailableException('El servicio de email no está configurado');
    const { error } = await this.resend.emails.send({
      from,
      to: email,
      subject: 'Reimposta la tua password - GarageApp',
      text: `Ciao ${name}, il tuo codice per reimpostare la password è ${code}. Scade tra 15 minuti. Se non l'hai richiesto, ignora questa email.`,
      html: `
        <p>Ciao ${escapeHtml(name)},</p>
        <p>Il tuo codice per reimpostare la password è:</p>
        <p style="font-size:28px;letter-spacing:6px"><strong>${code}</strong></p>
        <p>Scade tra 15 minuti. Se non l'hai richiesto, ignora questa email.</p>
      `,
    });
    if (error) throw new ServiceUnavailableException(`No se pudo enviar el email: ${error.message}`);
  }

  async sendSupportEmail(user: { firstName: string; lastName: string; email: string }, subject: string, message: string) {
    const from = process.env.EMAIL_FROM;
    const to = process.env.SUPPORT_EMAIL_TO ?? 'ramiro.mpdev@gmail.com';
    if (!process.env.RESEND_API_KEY || !from) throw new ServiceUnavailableException('El servicio de email no está configurado');
    const { error } = await this.resend.emails.send({ from, to, replyTo: user.email, subject: `[GarageApp Support] ${subject}`, text: `Usuario: ${user.firstName} ${user.lastName} (${user.email})\n\n${message}` });
    if (error) throw new ServiceUnavailableException(`No se pudo enviar el email: ${error.message}`);
  }
}
