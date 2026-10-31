import { BadRequestException, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly emailService: EmailService, private readonly smsService: SmsService) {}

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
