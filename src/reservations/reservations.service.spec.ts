import { ReservationsService } from './reservations.service';

function setup() {
  const calls: string[] = [];
  const tx: any = {
    $queryRaw: jest.fn(() => { calls.push('lock'); return Promise.resolve([]); }),
    parking: { findUnique: jest.fn().mockResolvedValue({ id: 1, active: true, parkingStatus: 'AVAILABLE', pricePerHour: '3.333', currency: 'EUR' }) },
    vehicle: { findFirst: jest.fn() },
    reservation: {
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findFirst: jest.fn(() => { calls.push('overlap'); return Promise.resolve(null); }),
      create: jest.fn(({ data }: any) => { calls.push('create'); return Promise.resolve({ id: 9, ...data }); }),
    },
  };
  const prisma: any = {
    $transaction: jest.fn((run: (client: any) => unknown) => run(tx)),
    reservation: {
      findFirst: jest.fn().mockResolvedValue({ id: 9 }),
      updateMany: jest.fn(),
      findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 9, status: 'CANCELLED' }),
      findMany: jest.fn(),
    },
  };
  const notifications: any = { sendReservationReminder: jest.fn() };
  const payments: any = { cancelPendingPaymentIntent: jest.fn() };
  return { service: new ReservationsService(prisma, notifications, payments), prisma, tx, calls, payments, notifications };
}

const dto = { parkingId: 1, startDatetime: '2030-01-01T10:00:00Z', endDatetime: '2030-01-01T12:00:00Z' };

beforeEach(() => { jest.spyOn(console, 'log').mockImplementation(() => undefined); });

describe('create', () => {
  it('locks the parking before checking for overlaps and rounds the price', async () => {
    const { service, calls } = setup();
    const reservation = await service.create(1, dto);
    expect(calls).toEqual(['lock', 'overlap', 'create']);
    expect(reservation.totalPrice).toBe(6.67);
  });

  it('rejects an overlapping reservation', async () => {
    const { service, tx } = setup();
    tx.reservation.findFirst.mockResolvedValue({ id: 5 });
    await expect(service.create(1, dto)).rejects.toThrow('ya está reservado');
    expect(tx.reservation.create).not.toHaveBeenCalled();
  });
});

describe('cancel', () => {
  it('cancels a pending reservation and its charge', async () => {
    const { service, prisma, payments } = setup();
    prisma.reservation.updateMany.mockResolvedValue({ count: 1 });
    await service.cancel(1, 9);
    expect(prisma.reservation.updateMany.mock.calls[0][0].where.status).toBe('PENDING');
    expect(payments.cancelPendingPaymentIntent).toHaveBeenCalledWith(9);
  });

  it('refuses when the reservation is no longer pending', async () => {
    const { service, prisma, payments } = setup();
    prisma.reservation.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancel(1, 9)).rejects.toThrow('no puede ser cancelada');
    expect(payments.cancelPendingPaymentIntent).not.toHaveBeenCalled();
  });
});

describe('reminders', () => {
  it('shows the Italian hour whatever the server time zone is', async () => {
    const { service, prisma, notifications } = setup();
    prisma.reservation.findMany.mockResolvedValueOnce([{
      id: 9, userId: 1, startDatetime: new Date('2030-07-01T10:00:00Z'), vehicle: null, parking: { title: 'P', ownerId: 2 },
    }]).mockResolvedValue([]);
    await service.sendScheduledReminders();
    expect(notifications.sendReservationReminder.mock.calls[0][2]).toContain('12:00');
  });
});
