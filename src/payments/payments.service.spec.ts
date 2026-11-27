import { PaymentsService } from './payments.service';

function setup() {
  process.env.STRIPE_SECRET_KEY = 'sk_test_unit';
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit';
  const prisma: any = {
    payment: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    reservation: { findFirst: jest.fn(), findUniqueOrThrow: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    creditPurchase: { findUnique: jest.fn(), findUniqueOrThrow: jest.fn(), findFirst: jest.fn(), findFirstOrThrow: jest.fn(), updateMany: jest.fn() },
    creditTransaction: { create: jest.fn() },
    user: { update: jest.fn(), updateMany: jest.fn(), findUnique: jest.fn(), findUniqueOrThrow: jest.fn() },
  };
  prisma.$transaction = jest.fn((run: (tx: any) => unknown) => run(prisma));
  const service = new PaymentsService(prisma);
  const stripe: any = {
    refunds: { create: jest.fn() },
    paymentIntents: { create: jest.fn(), retrieve: jest.fn(), cancel: jest.fn() },
    webhooks: { constructEvent: jest.fn() },
  };
  (service as any).stripe = stripe;
  return { service, prisma, stripe };
}

const payment = { id: 1, reservationId: 7, stripePaymentIntentId: 'pi_1', status: 'PENDING' };

function succeeded(stripe: any, metadata = {}) {
  stripe.webhooks.constructEvent.mockReturnValue({
    id: 'evt', type: 'payment_intent.succeeded', livemode: false,
    data: { object: { id: 'pi_1', livemode: false, metadata } },
  });
}

beforeEach(() => {
  for (const method of ['log', 'warn', 'error'] as const) jest.spyOn(console, method).mockImplementation(() => undefined);
});

describe('reservation payment webhook', () => {
  function arrange(confirmed: number, reservationStatus: string) {
    const context = setup();
    succeeded(context.stripe);
    context.prisma.creditPurchase.findUnique.mockResolvedValue(null);
    context.prisma.payment.findUnique.mockResolvedValue(payment);
    context.prisma.payment.findUniqueOrThrow.mockResolvedValue(payment);
    context.prisma.reservation.updateMany.mockResolvedValue({ count: confirmed });
    context.prisma.reservation.findUniqueOrThrow.mockResolvedValue({ status: reservationStatus });
    return context;
  }

  it('confirms a pending reservation without refunding', async () => {
    const { service, stripe } = arrange(1, 'CONFIRMED');
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'EXPIRED'])('refunds when the reservation is %s', async (status) => {
    const { service, stripe, prisma } = arrange(0, status);
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(stripe.refunds.create).toHaveBeenCalledWith({ payment_intent: 'pi_1' }, { idempotencyKey: 'unfulfilled-reservation:1' });
    expect(prisma.payment.update).toHaveBeenLastCalledWith({ where: { id: 1 }, data: { status: 'REFUNDED' } });
  });

  it.each(['CONFIRMED', 'ACTIVE', 'COMPLETED'])('does not refund a repeated webhook for a %s reservation', async (status) => {
    const { service, stripe } = arrange(0, status);
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(stripe.refunds.create).not.toHaveBeenCalled();
  });

  it('rejects the webhook when the refund fails, so Stripe retries it', async () => {
    const { service, stripe, prisma } = arrange(0, 'EXPIRED');
    stripe.refunds.create.mockRejectedValue(new Error('network'));
    await expect(service.handleWebhook(Buffer.from(''), 'sig')).rejects.toThrow('network');
    expect(prisma.payment.update).not.toHaveBeenCalledWith(expect.objectContaining({ data: { status: 'REFUNDED' } }));
  });

  it('accepts a charge that was already refunded', async () => {
    const { service, stripe, prisma } = arrange(0, 'EXPIRED');
    stripe.refunds.create.mockRejectedValue(Object.assign(new Error('dup'), { code: 'charge_already_refunded' }));
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(prisma.payment.update).toHaveBeenLastCalledWith({ where: { id: 1 }, data: { status: 'REFUNDED' } });
  });
});

describe('createPayment', () => {
  it('charges the price fixed at creation, not the current parking price', async () => {
    const { service, prisma, stripe } = setup();
    prisma.payment.create = jest.fn();
    prisma.reservation.findFirst.mockResolvedValue({
      id: 7, status: 'PENDING', expiresAt: new Date(Date.now() + 60_000), payment: null,
      totalPrice: '5', currency: 'EUR', parking: { pricePerHour: 99 },
      startDatetime: new Date(0), endDatetime: new Date(3_600_000),
    });
    prisma.user.findUnique.mockResolvedValue({ id: 1, stripeCustomerId: 'cus_1' });
    stripe.paymentIntents.create.mockResolvedValue({ id: 'pi_1', client_secret: 's' });
    await service.createPayment(1, { reservationId: 7, savePaymentMethod: false });
    expect(stripe.paymentIntents.create.mock.calls[0][0].amount).toBe(500);
  });

  it('never expires a reservation that is already confirmed', async () => {
    const { service, prisma } = setup();
    prisma.reservation.findFirst.mockResolvedValue({ id: 7, status: 'CONFIRMED', expiresAt: new Date(0), payment });
    await expect(service.createPayment(1, { reservationId: 7, savePaymentMethod: false })).rejects.toThrow('pendiente de pago');
    expect(prisma.reservation.updateMany).not.toHaveBeenCalled();
    expect(prisma.reservation.update).not.toHaveBeenCalled();
  });
});

describe('credit purchases', () => {
  it('credits a purchase that failed once and then succeeded', async () => {
    const { service, prisma, stripe } = setup();
    const purchase = { userId: 3, credits: 100, idempotencyKey: 'k', status: 'FAILED' };
    succeeded(stripe, { kind: 'CREDIT_PURCHASE', userId: '3', credits: '100', creditPurchaseKey: 'k' });
    prisma.creditPurchase.findUnique.mockResolvedValue(purchase);
    prisma.creditPurchase.findUniqueOrThrow.mockResolvedValue(purchase);
    prisma.creditPurchase.updateMany.mockImplementation(({ where }: any) =>
      Promise.resolve({ count: where.status.in.includes(purchase.status) ? 1 : 0 }));
    prisma.user.update.mockResolvedValue({ creditBalance: 100 });
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(prisma.user.update).toHaveBeenCalledTimes(1);
  });

  it('does not credit the same purchase twice', async () => {
    const { service, prisma, stripe } = setup();
    succeeded(stripe, { kind: 'CREDIT_PURCHASE', userId: '3', credits: '100', creditPurchaseKey: 'k' });
    prisma.creditPurchase.findUnique.mockResolvedValue({ userId: 3, credits: 100, idempotencyKey: 'k' });
    prisma.creditPurchase.updateMany.mockResolvedValue({ count: 0 });
    await service.handleWebhook(Buffer.from(''), 'sig');
    expect(prisma.user.update).not.toHaveBeenCalled();
  });
});

describe('credit cost', () => {
  it('does not add a credit because of floating point noise', () => {
    const { service } = setup();
    expect((service as any).calculateCreditsForReservation(1.1, 'USD')).toBe(110);
    process.env.CREDITS_EUR_TO_USD_RATE = '1.1';
    expect((service as any).calculateCreditsForReservation(1, 'EUR')).toBe(110);
  });
});
