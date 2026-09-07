import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  async sendVerificationEmail(name: string, email: string, token: string) {
    const host = process.env.SMTP_HOST;
    const from = process.env.SMTP_FROM;
    const verificationUrl = process.env.EMAIL_VERIFICATION_URL;

    if (!host || !from || !verificationUrl) {
      throw new ServiceUnavailableException('El servicio de email no está configurado');
    }

    const url = new URL(verificationUrl);
    url.searchParams.set('token', token);

    const transporter = nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }
        : undefined,
    });

    await transporter.sendMail({
      from,
      to: email,
      subject: 'Conferma il tuo indirizzo email - GarageApp',
      text: `Ciao ${name}, conferma il tuo indirizzo email: ${url.toString()}. Il link scade tra 24 ore.`,
      html: `<p>Ciao ${name},</p><p>Hai creato un account GarageApp. Conferma il tuo indirizzo email per accedere.</p><p><a href="${url.toString()}">Conferma il mio email</a></p><p>Questo link scade tra 24 ore.</p>`,
    });
  }
}
