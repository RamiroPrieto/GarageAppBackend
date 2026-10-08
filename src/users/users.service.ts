import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly emailService: EmailService) {}

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
        profileImage: true,
        emailVerified: true,
        creditBalance: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async updateMe(userId: number, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: {
        id: true, firstName: true, lastName: true, email: true, phone: true,
        profileImage: true, emailVerified: true, creditBalance: true,
      },
    });
  }

  async createSupportRequest(userId: number, dto: CreateSupportRequestDto) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { firstName: true, lastName: true, email: true } });
    await this.emailService.sendSupportEmail(user, dto.subject.trim(), dto.message.trim());
    return { sent: true };
  }
}
