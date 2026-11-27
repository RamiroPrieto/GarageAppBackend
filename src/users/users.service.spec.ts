import { UsersService } from './users.service';

function setup(creditBalance: number, openReservations: number) {
  const many = () => ({ deleteMany: jest.fn(), updateMany: jest.fn() });
  const tx: any = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    user: { findUniqueOrThrow: jest.fn().mockResolvedValue({ creditBalance, stripeCustomerId: 'cus_1' }), update: jest.fn() },
    reservation: { count: jest.fn().mockResolvedValue(openReservations) },
    pushToken: many(), favorite: many(), review: many(), vehicle: many(), emailVerificationToken: many(),
    passwordResetCode: many(), parkingPhoto: many(), parking: many(),
  };
  const prisma: any = { $transaction: (run: (client: any) => unknown) => run(tx) };
  const payments: any = { deleteCustomer: jest.fn() };
  return { service: new UsersService(prisma, {} as any, {} as any, payments), tx, payments };
}

describe('deleteMe', () => {
  it('erases personal data and hides the parkings', async () => {
    const { service, tx, payments } = setup(0, 0);
    await service.deleteMe(5);
    const { data } = tx.user.update.mock.calls[0][0];
    expect(data).toMatchObject({ email: 'deleted-5@deleted.invalid', password: null, googleId: null, appleId: null, phone: null });
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(tx.parking.updateMany.mock.calls[0][0].data.active).toBe(false);
    expect(payments.deleteCustomer).toHaveBeenCalledWith(5, 'cus_1');
  });

  it.each([['credits', 10, 0], ['open reservations', 0, 1]])('refuses with %s', async (_name, credits, reservations) => {
    const { service, tx, payments } = setup(credits, reservations);
    await expect(service.deleteMe(5)).rejects.toThrow();
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(payments.deleteCustomer).not.toHaveBeenCalled();
  });
});
