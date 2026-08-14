import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
  
  import { CreatePaymentDto } from './dto/create-payment.dto';
  import Stripe from 'stripe';
  
  import { PrismaService } from '../prisma/prisma.service';
  
  @Injectable()
  export class PaymentsService {
    private readonly stripe: Stripe;
  
    constructor(
      private readonly prisma: PrismaService,
    ) {
      this.stripe = new Stripe(
        process.env.STRIPE_SECRET_KEY!,
      );
    }
  
    async createSetupIntent(userId: number) {
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    
      if (!user) {
        throw new NotFoundException('Usuario no encontrado');
      }
    
      let customerId = user.stripeCustomerId;
    
      if (!customerId) {
        const customer = await this.stripe.customers.create({
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          phone: user.phone ?? undefined,
          metadata: {
            userId: user.id.toString(),
          },
        });
    
        customerId = customer.id;
    
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            stripeCustomerId: customerId,
          },
        });
      }
    
      const setupIntent =
        await this.stripe.setupIntents.create({
          customer: customerId,
          payment_method_types: ['card'],
          usage: 'off_session',
        });
    
      return {
        clientSecret: setupIntent.client_secret,
      };
    }
    async createPayment(
      userId: number,
      createPaymentDto: CreatePaymentDto,
    ) {
      const {
        reservationId,
        savePaymentMethod,
      } = createPaymentDto;
    
      // 1. Buscar la reserva del usuario
    
      const reservation =
        await this.prisma.reservation.findFirst({
          where: {
            id: reservationId,
            userId,
          },
          include: {
            payment: true,
          },
        });
    
      if (!reservation) {
        throw new NotFoundException(
          'Reserva no encontrada',
        );
      }
    
      // 2. Verificar que esté pendiente
    
      if (reservation.status !== 'PENDING') {
        throw new BadRequestException(
          'La reserva no está pendiente de pago',
        );
      }
    
      // 3. Verificar expiración
    
      if (
        reservation.expiresAt &&
        reservation.expiresAt < new Date()
      ) {
        await this.prisma.reservation.update({
          where: {
            id: reservation.id,
          },
          data: {
            status: 'EXPIRED',
          },
        });
    
        throw new BadRequestException(
          'La reserva ha expirado',
        );
      }
    
      // 4. Verificar que todavía no exista un pago
    
      if (reservation.payment) {
        throw new BadRequestException(
          'La reserva ya tiene un pago asociado',
        );
      }
    
      // 5. Buscar usuario
    
      const user = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });
    
      if (!user) {
        throw new NotFoundException(
          'Usuario no encontrado',
        );
      }
    
      // 6. Asegurarnos de tener Stripe Customer
    
      let customerId = user.stripeCustomerId;
    
      if (!customerId) {
        const customer =
          await this.stripe.customers.create({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            phone: user.phone ?? undefined,
            metadata: {
              userId: user.id.toString(),
            },
          });
    
        customerId = customer.id;
    
        await this.prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            stripeCustomerId: customerId,
          },
        });
      }
    
      // 7. Calcular importe en centavos
    
      const amountInCents = Math.round(
        Number(reservation.totalPrice) * 100,
      );
    
      // 8. Calcular comisión
    
      const commission =
        Number(reservation.totalPrice) * 0.10;
    
      const ownerAmount =
        Number(reservation.totalPrice) -
        commission;
    
      // 9. Crear PaymentIntent
    
      const paymentIntent =
        await this.stripe.paymentIntents.create({
          amount: amountInCents,
          currency: 'eur',
    
          customer: customerId,
    
          automatic_payment_methods: {
            enabled: true,
          },
    
          setup_future_usage: savePaymentMethod
            ? 'off_session'
            : undefined,
    
          metadata: {
            reservationId:
              reservation.id.toString(),
    
            userId: userId.toString(),
          },
        });
    
      // 10. Crear Payment en nuestra DB
    
      await this.prisma.payment.create({
        data: {
          reservationId: reservation.id,
          payerUserId: userId,
    
          amount: reservation.totalPrice,
          currency: 'EUR',
    
          commission,
          ownerAmount,
    
          paymentMethod: 'STRIPE',
    
          stripePaymentIntentId:
            paymentIntent.id,
    
          status: 'PENDING',
        },
      });
    
      return {
        clientSecret:
          paymentIntent.client_secret,
      };
    }
  }