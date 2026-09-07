import {
  ConflictException,
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}
  async register(registerDto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: registerDto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.prisma.user.create({
      data: {
        firstName: registerDto.firstName,
        lastName: registerDto.lastName,
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.phone,
      },
    });

    await this.sendVerificationEmail(user.id, user.firstName, user.email);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
    };
  }
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.password) {
      throw new UnauthorizedException('Questo account utilizza Google. Continua con Google');
    }

    const passwordMatches = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException('Credenciales incorrectas');
    }

    if (!user.emailVerified) {
      throw new UnauthorizedException('Devi confermare il tuo indirizzo email prima di accedere');
    }

    return this.createAccessToken(user.id, user.email);
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Link di conferma non valido');
    }

    const tokenHash = this.hashToken(token);
    const verification = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!verification || verification.usedAt || verification.expiresAt < new Date()) {
      throw new BadRequestException('Il link di conferma non è valido o è scaduto');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: verification.userId },
        data: { emailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: verification.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return { message: 'Email confermata. Ora puoi accedere a GarageApp.' };
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified && user.password) {
      await this.sendVerificationEmail(user.id, user.firstName, user.email);
    }

    return { message: 'Se l’account esiste, abbiamo inviato un nuovo link di conferma.' };
  }

  async googleLogin(idToken: string) {
    const clientId = process.env.GOOGLE_WEB_CLIENT_ID;
    if (!clientId) {
      throw new ServiceUnavailableException('Google Sign-In non è configurato');
    }

    const client = new OAuth2Client(clientId);
    let payload: { sub: string; email?: string; email_verified?: boolean; given_name?: string; family_name?: string; picture?: string } | undefined;

    try {
      const ticket = await client.verifyIdToken({ idToken, audience: clientId });
      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException('Credenziale Google non valida');
    }

    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Google non ha verificato questo indirizzo email');
    }

    let user = await this.prisma.user.findUnique({ where: { googleId: payload.sub } });

    if (!user) {
      user = await this.prisma.user.findUnique({ where: { email: payload.email } });
      if (user) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { googleId: payload.sub, emailVerified: true, profileImage: user.profileImage ?? payload.picture },
        });
      } else {
        user = await this.prisma.user.create({
          data: {
            firstName: payload.given_name ?? 'Utente',
            lastName: payload.family_name ?? '',
            email: payload.email,
            password: null,
            googleId: payload.sub,
            profileImage: payload.picture,
            emailVerified: true,
          },
        });
      }
    }

    return this.createAccessToken(user.id, user.email);
  }

  private async createAccessToken(userId: number, email: string) {

    const payload = {
      sub: userId,
      email,
    };

    const accessToken = await this.jwtService.signAsync(payload);

    return {
      accessToken,
    };
  }

  private async sendVerificationEmail(userId: number, firstName: string, email: string) {
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash: this.hashToken(token), expiresAt },
    });
    await this.emailService.sendVerificationEmail(firstName, email, token);
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
