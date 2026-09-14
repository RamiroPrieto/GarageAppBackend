import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: number, token: string) {
    return this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
  }

  async sendReservationReminder(userId: number, title: string, body: string, reservationId: number) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    if (!tokens.length) return;
    // Expo Push is the transport used once the mobile app registers an Expo token.
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(tokens.map(({ token }) => ({ to: token, sound: 'default', title, body, data: { reservationId } }))),
    }).catch(() => undefined);
  }
}
