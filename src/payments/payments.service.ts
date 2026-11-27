import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreditPurchaseStatus } from '@prisma/client';
import Stripe from 'stripe';
import { calculateReservationPrice, roundMoney } from '../common/pricing';
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

  // Best effort: the account is already erased on our side.
  async deleteCustomer(userId: number, customerId: string) {
    try {
      await this.stripe.customers.del(customerId);
    } catch {
      console.error('[payments] Stripe customer could not be deleted', { userId, customerId });
    }
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
    // expiresAt survives confirmation, so only a reservation that is still
    // PENDING may be moved to EXPIRED.
    if (reservation.status === 'PENDING' && reservation.expiresAt && reservation.expiresAt < new Date()) {
      await this.prisma.reservation.updateMany({ where: { id: reservation.id, status: 'PENDING' }, data: { status: 'EXPIRED' } });
      throw new BadRequestException('La reserva ha expirado');
    }
    this.assertPendingReservation(reservation);
    if (reservation.payment) throw new BadRequestException('La reserva ya tiene un pago asociado');

    // Charge the price the server fixed when the reservation was created, so an
    // owner editing the parking meanwhile cannot change what the customer pays.
    const totalPrice = roundMoney(Number(reservation.totalPrice));
    const { customerId } = await this.getStripeCustomer(userId);
    const amountInCents = Math.round(totalPrice * 100);
    const commission = roundMoney(totalPrice * 0.1);
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
        currency: reservation.currency, commission, ownerAmount: roundMoney(totalPrice - commission),
        paymentMethod: 'STRIPE', stripePaymentIntentId: paymentIntent.id, status: 'PENDING',
      },
    });
    console.log('[payments] PaymentIntent created', { paymentIntentId: paymentIntent.id, reservationId: reservation.id });
    console.log('[payments] PaymentIntent response prepared', {
      paymentIntentId: paymentIntent.id,
      reservationId: reservation.id,
      hasClientSecret: Boolean(paymentIntent.client_secret),
    });
    return { clientSecret: paymentIntent.client_secret };
  }

  async createCreditPurchase(userId: number, dto: CreateCreditPurchaseDto, idempotencyKey?: string) {
    if (!idempotencyKey || idempotencyKey.length > 200) {
      throw new BadRequestException('Se requiere una clave de idempotencia válida');
    }
    const existingPurchase = await this.prisma.creditPurchase.findUnique({ where: { idempotencyKey } });
    if (existingPurchase) {
      if (existingPurchase.userId !== userId || existingPurchase.credits !== dto.credits) {
        throw new BadRequestException('La clave de idempotencia pertenece a otra compra');
      }
      return this.creditPurchaseResponse(existingPurchase.stripePaymentIntentId);
    }
    if (dto.credits > 1_000_000) throw new BadRequestException('La cantidad de créditos es demasiado alta');
    const { customerId } = await this.getStripeCustomer(userId);
    // 100 credits = USD 1, so a credit has exactly the value of one USD cent.
    const paymentIntent = await this.stripe.paymentIntents.create({
      amount: dto.credits,
      currency: 'usd',
      customer: customerId,
      automatic_payment_methods: { enabled: true },
      metadata: { kind: 'CREDIT_PURCHASE', userId: userId.toString(), credits: dto.credits.toString(), creditPurchaseKey: idempotencyKey },
    }, { idempotencyKey: `credit-purchase:${idempotencyKey}` });
    try {
      await this.prisma.creditPurchase.create({
        data: { userId, idempotencyKey, credits: dto.credits, amountUsd: dto.credits / CREDITS_PER_USD, stripePaymentIntentId: paymentIntent.id },
      });
    } catch (error) {
      const duplicate = await this.prisma.creditPurchase.findUnique({ where: { idempotencyKey } });
      if (duplicate && duplicate.userId === userId && duplicate.credits === dto.credits) {
        return this.creditPurchaseResponse(duplicate.stripePaymentIntentId);
      }
      // Never hand an unmapped PaymentIntent to the app: the webhook could not
      // safely identify who should receive its credits. Cancellation is best
      // effort because Stripe may already have moved it to a final state.
      await this.stripe.paymentIntents.cancel(paymentIntent.id).catch(() => undefined);
      console.error('[credits] No se pudo registrar la compra pendiente', { paymentIntentId: paymentIntent.id, userId });
      throw error;
    }
    console.log('[credits] PaymentIntent creado', { paymentIntentId: paymentIntent.id, userId, credits: dto.credits, mode: this.stripeMode() });
    return this.creditPurchaseResponse(paymentIntent.id, paymentIntent.client_secret);
  }

  async getCreditPurchaseStatus(userId: number, paymentIntentId: string) {
    let purchase = await this.prisma.creditPurchase.findFirst({
      where: { stripePaymentIntentId: paymentIntentId, userId },
      select: { status: true, credits: true, stripePaymentIntentId: true, user: { select: { creditBalance: true } } },
    });
    if (!purchase) throw new NotFoundException('Compra de créditos no encontrada');
    let status: CreditPurchaseStatus = purchase.status;
    // FAILED only records a declined attempt. The same PaymentIntent can still
    // succeed when the customer retries in the PaymentSheet, so ask Stripe too.
    if (purchase.status !== 'SUCCEEDED') {
      const intent = await this.stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status === 'succeeded') {
        if (intent.livemode !== (this.stripeMode() === 'live')) {
          throw new BadRequestException('El pago no coincide con el modo de Stripe configurado');
        }
        const pendingPurchase = await this.prisma.creditPurchase.findUnique({
          where: { stripePaymentIntentId: paymentIntentId },
        });
        if (!pendingPurchase || pendingPurchase.userId !== userId || !this.matchesCreditPurchaseMetadata(intent, pendingPurchase)) {
          throw new BadRequestException('Metadata de compra de créditos inválida');
        }
        await this.creditPurchaseSucceeded(paymentIntentId);
        purchase = await this.prisma.creditPurchase.findFirstOrThrow({
          where: { stripePaymentIntentId: paymentIntentId, userId },
          select: { status: true, credits: true, stripePaymentIntentId: true, user: { select: { creditBalance: true } } },
        });
        status = purchase.status;
      } else if (intent.status === 'processing') {
        status = 'PENDING';
      }
    }

    return {
      paymentIntentId: purchase.stripePaymentIntentId,
      status,
      credits: purchase.credits,
      creditBalance: purchase.user.creditBalance,
    };
  }

  async getCreditQuote(parkingId: number, startDatetime: string, endDatetime: string) {
    const start = new Date(startDatetime);
    const end = new Date(endDatetime);
    if (!Number.isInteger(parkingId) || Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      throw new BadRequestException('Datos de reserva inválidos');
    }
    const parking = await this.prisma.parking.findUnique({
      where: { id: parkingId },
      select: { pricePerHour: true, currency: true },
    });
    if (!parking) throw new NotFoundException('Parking no encontrado');
    const totalPrice = calculateReservationPrice(start, end, parking.pricePerHour);
    return { credits: this.calculateCreditsForReservation(totalPrice, parking.currency) };
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

        const totalPrice = roundMoney(Number(reservation.totalPrice));
        const credits = this.calculateCreditsForReservation(totalPrice, reservation.currency);
        const debit = await tx.user.updateMany({
          where: { id: userId, creditBalance: { gte: credits } },
          data: { creditBalance: { decrement: credits } },
        });
        if (debit.count !== 1) {
          // The transaction rolls back, so no balance or credit transaction changes.
          throw new BadRequestException({ message: 'Créditos insuficientes', code: 'INSUFFICIENT_CREDITS' });
        }

        const user = await tx.user.findUniqueOrThrow({ where: { id: userId }, select: { creditBalance: true } });
        await tx.creditTransaction.create({
          data: { userId, type: 'RESERVATION_DEBIT', amount: -credits, balanceAfter: user.creditBalance, reservationId },
        });
        return tx.reservation.update({
          where: { id: reservationId }, data: { status: 'CONFIRMED' },
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
      const response = error instanceof BadRequestException
        ? error.getResponse()
        : (error as { response?: { code?: string } }).response;
      if (typeof response === 'object' && response !== null && (response as { code?: string }).code === 'INSUFFICIENT_CREDITS') {
        // Do not leave the pre-payment hold occupying the parking slot.
        await this.prisma.reservation.updateMany({
          where: { id: reservationId, userId, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });
        console.log('[payments] Credit payment rejected: insufficient credits', { reservationId, userId });
      }
      throw error;
    }
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    console.log('[credits] WEBHOOK RECEIVED', { signatureProvided: Boolean(signature), rawBodyAvailable: Buffer.isBuffer(rawBody), bodyLength: rawBody?.length ?? 0 });
    if (!signature) {
      console.warn('[stripe-webhook] Firma ausente');
      throw new BadRequestException('Firma de Stripe ausente');
    }
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET no está configurado');
      throw new BadRequestException('Webhook de Stripe no configurado');
    }
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch {
      console.warn('[stripe-webhook] Firma inválida');
      throw new BadRequestException('Firma de Stripe inválida');
    }
    console.log('[stripe-webhook] Webhook recibido', { eventId: event.id, eventType: event.type, mode: event.livemode ? 'live' : 'test' });
    console.log('[credits] WEBHOOK EVENT TYPE:', event.type);
    if (event.type === 'payment_intent.succeeded') {
      const intent = event.data.object as Stripe.PaymentIntent;
      console.log('[credits] PAYMENT INTENT SUCCEEDED', { mode: intent.livemode ? 'live' : 'test' });
      console.log('[credits] PAYMENT INTENT ID:', intent.id);
      console.log('[stripe-webhook] PaymentIntent confirmado', { paymentIntentId: intent.id });
      if (intent.livemode !== (this.stripeMode() === 'live')) {
        console.warn('[stripe-webhook] Modo de Stripe inconsistente', {
          paymentIntentId: intent.id,
          paymentIntentMode: intent.livemode ? 'live' : 'test',
          configuredMode: this.stripeMode(),
        });
        throw new BadRequestException('El evento de Stripe no coincide con el modo configurado');
      }
      const creditPurchase = await this.prisma.creditPurchase.findUnique({ where: { stripePaymentIntentId: intent.id } });
      if (creditPurchase) {
        console.log('[credits] CREDIT PURCHASE FOUND', { paymentIntentId: intent.id, userId: creditPurchase.userId });
        console.log('[credits] CREDITS TO ADD:', creditPurchase.credits);
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
        where: { stripePaymentIntentId: paymentIntentId, status: { in: ['PENDING', 'FAILED'] } }, data: { status: 'SUCCEEDED' },
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
      console.log('[credits] CREDITS CREDITED', { paymentIntentId, userId: purchase.userId, credits: purchase.credits });
      console.log('[credits] NEW BALANCE:', user.creditBalance);
      console.log('[credits] Créditos acreditados', { paymentIntentId, userId: purchase.userId, credits: purchase.credits, creditBalance: user.creditBalance });
    }, { isolationLevel: 'Serializable' });
  }

  async confirmPayment(userId: number, reservationId: number) {
    const payment = await this.prisma.payment.findFirst({ where: { reservationId, payerUserId: userId } });
    if (!payment) throw new NotFoundException('Pago no encontrado');
    // Payment and reservation transitions are owned by the verified Stripe
    // webhook. This endpoint is retained for compatibility as a read-only
    // status refresh and must not become a second confirmation path.
    return this.prisma.reservation.findFirstOrThrow({ where: { id: reservationId, userId } });
  }

  private async markPaymentSucceeded(paymentId: number) {
    const payment = await this.prisma.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status === 'REFUNDED') return;

    const fulfilled = await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({ where: { id: payment.id }, data: { status: 'SUCCEEDED' } });
      const confirmed = await tx.reservation.updateMany({
        where: { id: payment.reservationId, status: 'PENDING' }, data: { status: 'CONFIRMED' },
      });
      if (confirmed.count === 1) return true;
      // A repeated webhook finds the reservation already past PENDING.
      const reservation = await tx.reservation.findUniqueOrThrow({
        where: { id: payment.reservationId }, select: { status: true },
      });
      return reservation.status !== 'CANCELLED' && reservation.status !== 'EXPIRED';
    });

    if (fulfilled) {
      console.log('[payments] Payment confirmed', { paymentId: payment.id, reservationId: payment.reservationId });
      return;
    }
    // The slot was released before Stripe confirmed the charge, and may already
    // belong to someone else. A failure here rejects the webhook so Stripe retries.
    await this.refundUnfulfilledPayment(payment);
  }

  private async refundUnfulfilledPayment(payment: { id: number; reservationId: number; stripePaymentIntentId: string }) {
    try {
      await this.stripe.refunds.create(
        { payment_intent: payment.stripePaymentIntentId },
        { idempotencyKey: `unfulfilled-reservation:${payment.id}` },
      );
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== 'charge_already_refunded') {
        console.error('[payments] Refund failed', { paymentId: payment.id, reservationId: payment.reservationId });
        throw error;
      }
    }
    await this.prisma.payment.update({ where: { id: payment.id }, data: { status: 'REFUNDED' } });
    console.warn('[payments] Payment refunded: reservation no longer available', { paymentId: payment.id, reservationId: payment.reservationId });
  }

  // Stops a released reservation from being charged later. Best effort: if the
  // charge already went through, the webhook refunds it.
  async cancelPendingPaymentIntent(reservationId: number) {
    const payment = await this.prisma.payment.findUnique({ where: { reservationId } });
    if (!payment || (payment.status !== 'PENDING' && payment.status !== 'FAILED')) return;
    try {
      await this.stripe.paymentIntents.cancel(payment.stripePaymentIntentId);
      await this.prisma.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' },
      });
    } catch {
      console.warn('[payments] PaymentIntent could not be cancelled', { paymentId: payment.id, reservationId });
    }
  }

  private assertPendingReservation(reservation: { status: string; expiresAt: Date | null }) {
    if (reservation.status !== 'PENDING') throw new BadRequestException('La reserva no está pendiente de pago');
    if (reservation.expiresAt && reservation.expiresAt < new Date()) throw new BadRequestException('La reserva ha expirado');
  }

  private calculateCreditsForReservation(totalPrice: number, currency: 'USD' | 'EUR') {
    if (currency === 'USD') return Math.round(totalPrice * CREDITS_PER_USD);
    const usdPerEur = Number(process.env.CREDITS_EUR_TO_USD_RATE);
    if (!Number.isFinite(usdPerEur) || usdPerEur <= 0) {
      throw new BadRequestException('El pago con créditos para reservas en EUR requiere configurar CREDITS_EUR_TO_USD_RATE');
    }
    // Trim float noise first so 110.00000000000001 is not rounded up to 111.
    return Math.ceil(Number((totalPrice * usdPerEur * CREDITS_PER_USD).toFixed(6)));
  }

  private matchesCreditPurchaseMetadata(intent: Stripe.PaymentIntent, purchase: { userId: number; credits: number; idempotencyKey: string }) {
    return intent.metadata.kind === 'CREDIT_PURCHASE'
      && intent.metadata.userId === purchase.userId.toString()
      && intent.metadata.credits === purchase.credits.toString()
      && intent.metadata.creditPurchaseKey === purchase.idempotencyKey;
  }

  private async creditPurchaseResponse(paymentIntentId: string, knownClientSecret?: string | null) {
    const clientSecret = knownClientSecret ?? (await this.stripe.paymentIntents.retrieve(paymentIntentId)).client_secret;
    if (!clientSecret) throw new BadRequestException('No se pudo iniciar el pago de créditos');
    return { clientSecret, paymentIntentId };
  }

  private stripeMode() {
    return process.env.STRIPE_SECRET_KEY?.startsWith('sk_live_') ? 'live' : 'test';
  }
}
