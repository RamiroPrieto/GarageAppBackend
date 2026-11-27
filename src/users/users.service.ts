import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly emailService: EmailService, private readonly smsService: SmsService, private readonly payments: PaymentsService) {}

  async getMe(userId: number) {
    return this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        phoneVerified: true,
        profileImage: true,
        emailVerified: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    const { phone: _phone, ...profile } = dto;
    return this.prisma.user.update({
      where: { id: userId },
      data: profile,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true, phoneVerified: true,
        profileImage: true, emailVerified: true, creditBalance: true,
      },
    });
  }

  // Erases personal data but keeps the rows that payments and other people's
  // bookings depend on.
  async deleteMe(userId: number) {
    const stripeCustomerId = await this.prisma.$transaction(async (tx) => {
      // Same lock reservations take, so nobody can book these parkings meanwhile.
      await tx.$queryRaw`SELECT id FROM "Parking" WHERE "ownerId" = ${userId} FOR UPDATE`;

      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId }, select: { creditBalance: true, stripeCustomerId: true },
      });
      if (user.creditBalance > 0) {
        throw new ConflictException({ message: 'Todavía tenés créditos en tu cuenta', code: 'ACCOUNT_HAS_CREDITS' });
      }
      const now = new Date();
      const openReservations = await tx.reservation.count({
        where: {
          AND: [
            { OR: [{ userId }, { parking: { ownerId: userId } }] },
            {
              OR: [
                { status: 'PENDING', expiresAt: { gt: now } },
                { status: { in: ['CONFIRMED', 'ACTIVE'] }, endDatetime: { gt: now } },
              ],
            },
          ],
        },
      });
      if (openReservations > 0) {
        throw new ConflictException({ message: 'Tenés reservas en curso', code: 'ACCOUNT_HAS_RESERVATIONS' });
      }

      await tx.pushToken.deleteMany({ where: { userId } });
      await tx.favorite.deleteMany({ where: { OR: [{ userId }, { parking: { ownerId: userId } }] } });
      await tx.review.deleteMany({ where: { userId } });
      await tx.vehicle.deleteMany({ where: { userId } });
      await tx.emailVerificationToken.deleteMany({ where: { userId } });
      await tx.passwordResetCode.deleteMany({ where: { userId } });
      await tx.parkingPhoto.deleteMany({ where: { parking: { ownerId: userId } } });
      await tx.parking.updateMany({
        where: { ownerId: userId },
        data: {
          active: false, title: 'Parking eliminado', description: null,
          address: '-', city: '-', country: '-', latitude: 0, longitude: 0,
        },
      });
      await tx.user.update({
        where: { id: userId },
        data: {
          firstName: 'Usuario', lastName: 'eliminado', email: `deleted-${userId}@deleted.invalid`,
          password: null, googleId: null, appleId: null, phone: null, pendingPhone: null,
          phoneVerified: false, phoneVerificationSentAt: null, profileImage: null,
          emailVerified: false, stripeCustomerId: null, deletedAt: now,
        },
      });
      return user.stripeCustomerId;
    });

    if (stripeCustomerId) await this.payments.deleteCustomer(userId, stripeCustomerId);
    return { deleted: true };
  }

  async requestPhoneChange(userId: number, phone: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phone: true, phoneVerified: true, phoneVerificationSentAt: true } });
    if (user.phone === phone && user.phoneVerified) return { sent: false, alreadyVerified: true };
    if (user.phoneVerificationSentAt && Date.now() - user.phoneVerificationSentAt.getTime() < 60_000) {
      throw new HttpException('Esperá un minuto antes de pedir otro código SMS', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.smsService.sendVerification(phone);
    await this.prisma.user.update({ where: { id: userId }, data: { pendingPhone: phone, phoneVerificationSentAt: new Date() } });
    return { sent: true };
  }

  async confirmPhoneChange(userId: number, code: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { pendingPhone: true } });
    if (!user.pendingPhone) throw new BadRequestException('No hay un número pendiente de verificación');
    const approved = await this.smsService.isVerificationApproved(user.pendingPhone, code);
    if (!approved) throw new BadRequestException('El código SMS no es válido o venció');
    return this.prisma.user.update({
      where: { id: userId },
      data: { phone: user.pendingPhone, pendingPhone: null, phoneVerified: true, phoneVerificationSentAt: null },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true, phoneVerified: true, profileImage: true, emailVerified: true, creditBalance: true },
    });
  }

  async createSupportRequest(userId: number, dto: CreateSupportRequestDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    await this.emailService.sendSupportEmail(user, dto.subject.trim(), dto.message.trim());
    return { sent: true };
  }
}
