import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateCreditPurchaseDto } from './dto/create-credit-purchase.dto';

const CREDITS_PER_USD = 100;

@Injectable()
export class PaymentsService {
  private readonly stripe: Stripe;

  constructor(private readonly prisma: PrismaService) {
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }

  private async getStripeCustomer(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    if (user.stripeCustomerId) return { user, customerId: user.stripeCustomerId };

    const customer = await this.stripe.customers.create({
      email: user.email,
      name: `${user.firstName} ${user.lastName}`,
      phone: user.phone ?? undefined,
      metadata: { userId: user.id.toString() },
    });
    await this.prisma.user.update({ where: { id: user.id }, data: { stripeCustomerId: customer.id } });
    return { user, customerId: customer.id };
  }

  async createSetupIntent(userId: number) {
    const { customerId } = await this.getStripeCustomer(userId);
    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId, payment_method_types: ['card'], usage: 'off_session',
    });
    return { clientSecret: setupIntent.client_secret };
  }

  async createPayment(userId: number, dto: CreatePaymentDto) {
    const reservation = await this.prisma.reservation.findFirst({
      where: { id: dto.reservationId, userId }, include: { payment: true, parking: true },
    });
    if (!reservation) throw new NotFoundException('Reserva no encontrada');
    if (reservation.expiresAt && reservation.expiresAt < new Date()) {
      await this.prisma.reservation.update({ where: { id: reservation.id }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('La reserva ha expirado');
    }
    this.assertPendingReservation(reservation);
    if (reservation.payment) throw new BadRequestException('La reserva ya tiene un pago asociado');

    // Recalculate server-side immediately before charging; client input is never used.
    const totalPrice = this.calculateReservationPrice(reservation);
    await this.prisma.reservation.update({ where: { id: reservation.id }, data: { totalPrice } });
    const { customerId } = await this.getStripeCustomer(userId);
    const amountInCents = Math.round(totalPrice * 100);
    const commission = totalPrice * 0.1;
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: amountInCents,
      currency: reservation.currency.toLowerCase() as 'eur' | 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      setup_future_usage: dto.savePaymentMethod ? 'off_session' : undefined,
      metadata: { reservationId: reservation.id.toString(), userId: userId.toString() },
    });
    await this.prisma.payment.create({
      data: {
        reservationId: reservation.id, payerUserId: userId, amount: totalPrice,
        currency: reservation.currency, commission, ownerAmount: totalPrice - commission,
        paymentMethod: 'STRIPE', stripePaymentIntentId: paymentIntent.id, status: 'PENDING',
      },
    });
    return { clientSecret: paymentIntent.client_secret };
  }

  async createCreditPurchase(userId: number, dto: CreateCreditPurchaseDto) {
    if (dto.credits > 1_000_000) throw new BadRequestException('La cantidad de créditos es demasiado alta');
    const { customerId } = await this.getStripeCustomer(userId);
    // 100 credits = USD 1, so a credit has exactly the value of one USD cent.
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.credits,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { kind: 'CREDIT_PURCHASE', userId: userId.toString(), credits: dto.credits.toString() },
    });
    await this.prisma.creditPurchase.create({
      data: { userId, credits: dto.credits, amountUsd: dto.credits / CREDITS_PER_USD, stripePaymentIntentId: paymentIntent.id },
    });
    console.log('[credits] PaymentIntent creado', { paymentIntentId: paymentIntent.id, userId, credits: dto.credits, mode: this.stripeMode() });
    return { clientSecret: paymentIntent.client_secret, paymentIntentId: paymentIntent.id };
  }

  async getCreditPurchaseStatus(userId: number, paymentIntentId: string) {
    const purchase = await this.prisma.creditPurchase.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, userId },
      select: { status: true, credits: true, stripePaymentIntentId: true, user: { select: { creditBalance: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra de créditos no encontrada');
    return {
      paymentIntentId: purchase.stripePaymentIntentId,
      status: purchase.status,
      credits: purchase.credits,
      creditBalance: purchase.user.creditBalance,
    };
  }

  async payReservationWithCredits(userId: number, reservationId: number, _idempotencyKey?: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const reservation = await tx.reservation.findFirst({
          where: { id: reservationId, userId }, include: { payment: true, parking: true, creditTransaction: true },
        });
        if (!reservation) throw new NotFoundException('Reserva no encontrada');
        if (reservation.creditTransaction) return reservation;
        if (reservation.expiresAt && reservation.expiresAt < new Date()) {
          await tx.reservation.update({ where: { id: reservation.id }, data: { status: 'EXPIRED' } });
          throw new BadRequestException('La reserva ha expirado');
        }
        this.assertPendingReservation(reservation);
        if (reservation.payment) throw new BadRequestException('La reserva ya tiene un pago asociado');

        const totalPrice = this.calculateReservationPrice(reservation);
        const credits = this.calculateCreditsForReservation(totalPrice, reservation.currency);
        const debit = await tx.user.updateMany({
          where: { id: userId, creditBalance: { gte: credits } },
          data: { creditBalance: { decrement: credits } },
        });
        if (debit.count !== 1) throw new BadRequestException('Créditos insuficientes');

        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { creditBalance: true } });
        await tx.creditTransaction.create({
          data: { userId, type: 'RESERVATION_DEBIT', amount: -credits, balanceAfter: user.creditBalance, reservationId },
        });
        return tx.reservation.update({
          where: { id: reservationId }, data: { totalPrice, status: 'CONFIRMED' },
          include: { payment: true, parking: true, creditTransaction: true },
        });
      }, { isolationLevel: 'Serializable' });
    } catch (error: unknown) {
      // A duplicate concurrent request can lose the unique reservation transaction race.
      const prismaCode = (error as { code?: string }).code;
      if (prismaCode === 'P2002') {
        const reservation = await this.prisma.reservation.findFirst({ where: { id: reservationId, userId } });
        if (reservation) return reservation;
      }
      throw error;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    if (!signature) {
      console.warn('[stripe-webhook] Firma ausente');
      throw new BadRequestException('Firma de Stripe ausente');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET!);
    } catch {
      console.warn('[stripe-webhook] Firma inválida');
      throw new BadRequestException('Firma de Stripe inválida');
    }
    console.log('[stripe-webhook] Webhook recibido', { eventId: event.id, eventType: event.type, mode: event.livemode ? 'live' : 'test' });
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log('[stripe-webhook] PaymentIntent confirmado', { paymentIntentId: intent.id });
      const creditPurchase = await this.prisma.creditPurchase.findUnique({ where: { stripePaymentIntentId: intent.id } });
      if (creditPurchase) {
        console.log('[credits] Compra identificada', { paymentIntentId: intent.id, userId: creditPurchase.userId, credits: creditPurchase.credits });
        if (!this.matchesCreditPurchaseMetadata(intent, creditPurchase)) {
          console.warn('[credits] Metadata de PaymentIntent inválida', { paymentIntentId: intent.id });
          throw new BadRequestException('Metadata de compra de créditos inválida');
        }
        await this.creditPurchaseSucceeded(intent.id);
      }
      else {
        const payment = await this.prisma.payment.findUnique({ where: { stripePaymentIntentId: intent.id } });
        if (payment) await this.markPaymentSucceeded(payment.id);
      }
    }
    if (event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      await this.prisma.creditPurchase.updateMany({ where: { stripePaymentIntentId: intent.id, status: 'PENDING' }, data: { status: 'FAILED' } });
      await this.prisma.payment.updateMany({ where: { stripePaymentIntentId: intent.id, status: 'PENDING' }, data: { status: 'FAILED' } });
      console.log('[stripe-webhook] PaymentIntent fallido', { paymentIntentId: intent.id });
    }
    return { received: true };
  }

  private async creditPurchaseSucceeded(paymentIntentId: string) {
    await this.prisma.$transaction(async (tx) => {
      // The conditional state change is the webhook idempotency gate.
      const claimed = await tx.creditPurchase.updateMany({
        where: { stripePaymentIntentId: paymentIntentId, status: 'PENDING' }, data: { status: 'SUCCEEDED' },
      });
      if (claimed.count !== 1) {
        console.log('[credits] Webhook ignorado: compra ya procesada', { paymentIntentId });
        return;
      }
      const purchase = await tx.creditPurchase.findUniqueOrThrow({ where: { stripePaymentIntentId: paymentIntentId } });
      const user = await tx.user.update({
        where: { id: purchase.userId }, data: { creditBalance: { increment: purchase.credits } }, select: { creditBalance: true },
      });
      await tx.creditTransaction.create({
        data: { userId: purchase.userId, type: 'PURCHASE', amount: purchase.credits, balanceAfter: user.creditBalance, stripePaymentIntentId: paymentIntentId },
      });
      console.log('[credits] Créditos acreditados', { paymentIntentId, userId: purchase.userId, credits: purchase.credits, creditBalance: user.creditBalance });
    }, { isolationLevel: 'Serializable' });
  }

  async confirmPayment(userId: number, reservationId: number) {
    const payment = await this.prisma.payment.findFirst({ where: { reservationId, payerUserId: userId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    const intent = await this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
    if (intent.status !== 'succeeded') throw new BadRequestException('El pago no fue completado');
    await this.markPaymentSucceeded(payment.id);
    return this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, userId } });
  }

  private async markPaymentSucceeded(paymentId: number) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    await this.prisma.$transaction([
      this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED' } }),
      this.prisma.reservation.update({ where: { id: payment.reservationId }, data: { status: 'CONFIRMED' } }),
    ]);
  }

  private assertPendingReservation(reservation: { status: string; expiresAt: Date | null }) {
    if (reservation.status !== 'PENDING') throw new BadRequestException('La reserva no está pendiente de pago');
    if (reservation.expiresAt && reservation.expiresAt < new Date()) throw new BadRequestException('La reserva ha expirado');
  }

  private calculateReservationPrice(reservation: { startDatetime: Date; endDatetime: Date; parking: { pricePerHour: unknown } }) {
    return (reservation.endDatetime.getTime() - reservation.startDatetime.getTime()) / 3_600_000 * Number(reservation.parking.pricePerHour);
  }

  private calculateCreditsForReservation(totalPrice: number, currency: 'USD' | 'EUR') {
    if (currency === 'USD') return Math.ceil(totalPrice * CREDITS_PER_USD);
    const usdPerEur = Number(process.env.CREDITS_EUR_TO_USD_RATE);
    if (!Number.isFinite(usdPerEur) || usdPerEur <= 0) {
      throw new BadRequestException('El pago con créditos para reservas en EUR requiere configurar CREDITS_EUR_TO_USD_RATE');
    }
    return Math.ceil(totalPrice * usdPerEur * CREDITS_PER_USD);
  }

  private matchesCreditPurchaseMetadata(intent: Stripe.PaymentIntent, purchase: { userId: number; credits: number }) {
    return intent.metadata.kind === 'CREDIT_PURCHASE'
      && intent.metadata.userId === purchase.userId.toString()
      && intent.metadata.credits === purchase.credits.toString();
  }

  private stripeMode() {
    return process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test';
  }
}
