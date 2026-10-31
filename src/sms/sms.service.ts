import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private getClient() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    if (!accountSid || !authToken || !verifyServiceSid) {
      throw new ServiceUnavailableException('El servicio de verificación por SMS no está configurado');
    }
    return { client: twilio(accountSid, authToken), verifyServiceSid };
  }

  async sendVerification(phone: string) {
    const { client, verifyServiceSid } = this.getClient();
    try {
      await client.verify.v2.services(verifyServiceSid).verifications.create({ to: phone, channel: 'sms' });
    } catch {
      throw new ServiceUnavailableException('No pudimos enviar el código por SMS');
    }
  }

  async isVerificationApproved(phone: string, code: string) {
    const { client, verifyServiceSid } = this.getClient();
    try {
      const result = await client.verify.v2.services(verifyServiceSid).verificationChecks.create({ to: phone, code });
      return result.status === 'approved';
    } catch {
      return false;
    }
  }
}
