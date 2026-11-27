import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async registerPushToken(userId: number, token: string) {
    const registered = await this.prisma.pushToken.upsert({
      where: { token },
      create: { userId, token },
      update: { userId },
    });
    console.log('[notifications] Push token registered', { userId });
    return registered;
  }

  async unregisterPushToken(userId: number, token: string) {
    // Scoped to the user: the device may already belong to another session.
    await this.prisma.pushToken.deleteMany({ where: { userId, token } });
    return { removed: true };
  }

  async sendReservationReminder(userId: number, title: string, body: string, reservationId: number) {
    const tokens = await this.prisma.pushToken.findMany({ where: { userId }, select: { token: true } });
    console.log('[notifications] Reminder dispatch requested', { userId, reservationId, tokenCount: tokens.length });
    if (!tokens.length) return;
    // Expo Push is the transport used once the mobile app registers an Expo token.
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
        body: JSON.stringify(tokens.map(({ token }) => ({ to: token, sound: 'default', title, body, data: { reservationId } }))),
      });
      const payload = await response.json().catch(() => null) as { data?: unknown } | null;
      console.log('[notifications] Expo push dispatch result', {
        reservationId,
        accepted: response.ok,
        ticketCount: Array.isArray(payload?.data) ? payload.data.length : 0,
      });
    } catch {
      console.warn('[notifications] Expo push dispatch failed', { reservationId });
    }
  }
}
