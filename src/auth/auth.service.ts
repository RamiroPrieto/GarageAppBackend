import {
  ConflictException,
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { OAuth2Client } from 'google-auth-library';

import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResetPasswordDto } from './dto/password-reset.dto';
import { EmailService } from '../email/email.service';

const RESET_CODE_TTL_MS = 15 * 60 * 1000;
const RESET_CODE_COOLDOWN_MS = 60 * 1000;
const RESET_CODE_MAX_ATTEMPTS = 5;

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

    const token = randomBytes(32).toString('hex');
    const pendingRegistration = await this.prisma.pendingRegistration.upsert({
      where: { email: registerDto.email },
      create: {
        firstName: registerDto.firstName.trim(),
        lastName: registerDto.lastName.trim(),
        email: registerDto.email,
        password: hashedPassword,
        phone: registerDto.phone?.trim() || null,
        tokenHash: this.hashToken(token),
        expiresAt: this.verificationExpiry(),
      },
      update: {
        firstName: registerDto.firstName.trim(),
        lastName: registerDto.lastName.trim(),
        password: hashedPassword,
        phone: registerDto.phone?.trim() || null,
        tokenHash: this.hashToken(token),
        expiresAt: this.verificationExpiry(),
      },
    });

    // SMS is intentionally not used for registration. A User is only created
    // after the recipient opens the email confirmation link.
    await this.emailService.sendVerificationEmail(
      pendingRegistration.firstName,
      pendingRegistration.email,
      token,
    );

    return {
      email: pendingRegistration.email,
      pendingEmailVerification: true,
    };
  }
  async login(loginDto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: {
        email: loginDto.email,
      },
    });

    if (!user) {
      const pendingRegistration = await this.prisma.pendingRegistration.findUnique({
        where: { email: loginDto.email },
      });
      if (
        pendingRegistration
        && await bcrypt.compare(loginDto.password, pendingRegistration.password)
      ) {
        await this.resendPendingRegistrationVerification(pendingRegistration);
        throw new UnauthorizedException('Revisá tu email: te enviamos un nuevo enlace de confirmación');
      }
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
      await this.sendVerificationEmail(user.id, user.firstName, user.email);
      throw new UnauthorizedException('Devi confermare il tuo indirizzo email prima di accedere');
    }

    return this.createAccessToken(user.id, user.email);
  }

  async verifyEmail(token: string) {
    if (!token) {
      throw new BadRequestException('Link di conferma non valido');
    }

    const tokenHash = this.hashToken(token);
    const pendingRegistration = await this.prisma.pendingRegistration.findUnique({
      where: { tokenHash },
    });

    if (pendingRegistration) {
      if (pendingRegistration.expiresAt < new Date()) {
        throw new BadRequestException('Confirmation link is invalid or expired');
      }

      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.pendingRegistration.deleteMany({
          where: { id: pendingRegistration.id, tokenHash },
        });
        if (claimed.count !== 1) {
          throw new BadRequestException('Confirmation link is invalid or expired');
        }

        const existingUser = await tx.user.findUnique({
          where: { email: pendingRegistration.email },
        });
        if (existingUser) {
          throw new ConflictException('Email is already registered');
        }

        await tx.user.create({
          data: {
            firstName: pendingRegistration.firstName,
            lastName: pendingRegistration.lastName,
            email: pendingRegistration.email,
            password: pendingRegistration.password,
            phone: pendingRegistration.phone,
            emailVerified: true,
          },
        });
      }, { isolationLevel: 'Serializable' });

      return { message: 'Email confirmed. You can now sign in to GarageApp.' };
    }

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
    const pendingRegistration = await this.prisma.pendingRegistration.findUnique({ where: { email } });
    if (pendingRegistration) {
      await this.resendPendingRegistrationVerification(pendingRegistration);
      return { message: 'If the account exists, a new confirmation link was sent.' };
    }

    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && !user.emailVerified && user.password) {
      await this.sendVerificationEmail(user.id, user.firstName, user.email);
    }

    return { message: 'Se l’account esiste, abbiamo inviato un nuovo link di conferma.' };
  }

  async forgotPassword(email: string) {
    // The answer never reveals whether the account exists.
    const response = { sent: true };
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return response;

    const recent = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, createdAt: { gt: new Date(Date.now() - RESET_CODE_COOLDOWN_MS) } },
    });
    if (recent) return response;

    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    await this.prisma.$transaction([
      // Only the newest code works.
      this.prisma.passwordResetCode.updateMany({
        where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() },
      }),
      this.prisma.passwordResetCode.create({
        data: {
          userId: user.id,
          codeHash: this.hashResetCode(user.id, code),
          expiresAt: new Date(Date.now() + RESET_CODE_TTL_MS),
        },
      }),
    ]);
    await this.emailService.sendPasswordResetEmail(user.firstName, user.email, code);
    return response;
  }

  async resetPassword({ email, code, password }: ResetPasswordDto) {
    const invalid = () => new BadRequestException('El código no es válido o venció');
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw invalid();

    const now = new Date();
    const reset = await this.prisma.passwordResetCode.findFirst({
      where: { userId: user.id, usedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: 'desc' },
    });
    if (!reset) throw invalid();

    // Count the attempt before comparing, so parallel guesses cannot exceed the limit.
    const attempt = await this.prisma.passwordResetCode.updateMany({
      where: { id: reset.id, usedAt: null, attempts: { lt: RESET_CODE_MAX_ATTEMPTS } },
      data: { attempts: { increment: 1 } },
    });
    const matches = timingSafeEqual(
      Buffer.from(reset.codeHash, 'hex'),
      Buffer.from(this.hashResetCode(user.id, code), 'hex'),
    );
    if (attempt.count !== 1 || !matches) throw invalid();

    const hashedPassword = await bcrypt.hash(password, 12);
    await this.prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetCode.updateMany({
        where: { id: reset.id, usedAt: null }, data: { usedAt: now },
      });
      if (claimed.count !== 1) throw invalid();
      await tx.user.update({
        where: { id: user.id },
        // Receiving the code proves ownership of the email address.
        data: { password: hashedPassword, emailVerified: true, passwordChangedAt: now },
      });
    });
    return { reset: true };
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
    } catch (error: unknown) {
      // Only the reason, cut before any token contents Google may append.
      const reason = error instanceof Error ? error.message.split(':')[0].slice(0, 100) : 'unknown';
      console.warn('[auth] Google token rejected', { reason });
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

  /*
  async requestRegistrationPhoneVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Do not reveal whether an email has an account.
    if (user?.pendingPhone) await this.sendPhoneVerification(user.id, user.pendingPhone);
    return { sent: true };
  }

  async confirmRegistrationPhoneVerification(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.pendingPhone) throw new BadRequestException('No hay un número pendiente de verificación');
    const approved = await this.smsService.isVerificationApproved(user.pendingPhone, code);
    if (!approved) throw new BadRequestException('El código SMS no es válido o venció');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { phone: user.pendingPhone, pendingPhone: null, phoneVerified: true, phoneVerificationSentAt: null },
    });
    return { verified: true };
  }

  */

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
    const expiresAt = this.verificationExpiry();

    await this.prisma.emailVerificationToken.updateMany({
      where: { userId, usedAt: null },
      data: { usedAt: new Date() },
    });
    await this.prisma.emailVerificationToken.create({
      data: { userId, tokenHash: this.hashToken(token), expiresAt },
    });
    await this.emailService.sendVerificationEmail(firstName, email, token);
  }

  private async resendPendingRegistrationVerification(
    pendingRegistration: { id: number; firstName: string; email: string },
  ) {
    const token = randomBytes(32).toString('hex');
    await this.prisma.pendingRegistration.update({
      where: { id: pendingRegistration.id },
      data: {
        tokenHash: this.hashToken(token),
        expiresAt: this.verificationExpiry(),
      },
    });
    await this.emailService.sendVerificationEmail(
      pendingRegistration.firstName,
      pendingRegistration.email,
      token,
    );
  }

  /*
  private async sendPhoneVerification(userId: number, phone: string) {
    const user = await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { phoneVerificationSentAt: true } });
    if (user.phoneVerificationSentAt && Date.now() - user.phoneVerificationSentAt.getTime() < 60_000) {
      throw new HttpException('Esperá un minuto antes de pedir otro código SMS', HttpStatus.TOO_MANY_REQUESTS);
    }
    await this.smsService.sendVerification(phone);
    await this.prisma.user.update({ where: { id: userId }, data: { phoneVerificationSentAt: new Date() } });
  }
  */

  private verificationExpiry() {
    return new Date(Date.now() + 24 * 60 * 60 * 1000);
  }

  // Keyed, because six digits are trivial to brute-force from a plain hash.
  private hashResetCode(userId: number, code: string) {
    return createHmac('sha256', process.env.JWT_SECRET!).update(`${userId}:${code}`).digest('hex');
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
