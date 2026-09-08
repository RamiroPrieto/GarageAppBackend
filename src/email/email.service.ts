import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { Resend } from 'resend';

// TEMPORAL: actualmente usamos Resend.
// En el futuro podemos volver a SMTP/Nodemailer.
@Injectable()
export class EmailService {
  private readonly resend = new Resend(process.env.RESEND_API_KEY);

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
}