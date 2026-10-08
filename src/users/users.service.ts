import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
