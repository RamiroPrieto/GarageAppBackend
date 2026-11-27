import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

function setup() {
  process.env.JWT_SECRET = 'unit';
  const user = { id: 1, firstName: 'Ana', email: 'ana@example.com' };
  let stored: any = null;
  const prisma: any = {
    user: { findUnique: jest.fn().mockResolvedValue(user), update: jest.fn() },
    passwordResetCode: {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve(where.createdAt ? null : stored && !stored.usedAt ? stored : null)),
      create: jest.fn(({ data }: any) => { stored = { id: 4, attempts: 0, usedAt: null, ...data }; return Promise.resolve(stored); }),
      updateMany: jest.fn(({ where, data }: any) => {
        if (!stored || stored.usedAt || (where.attempts && stored.attempts >= where.attempts.lt)) return Promise.resolve({ count: 0 });
        if (data.attempts) stored.attempts += 1;
        if (data.usedAt) stored.usedAt = data.usedAt;
        return Promise.resolve({ count: 1 });
      }),
    },
  };
  prisma.$transaction = jest.fn((arg: any) => (typeof arg === 'function' ? arg(prisma) : Promise.all(arg)));
  const email: any = { sendPasswordResetEmail: jest.fn() };
  return { service: new AuthService(prisma, {} as any, email), prisma, email };
}

const code = (email: any) => email.sendPasswordResetEmail.mock.calls[0][2] as string;
const wrong = (value: string) => (value === '000000' ? '000001' : '000000');

describe('password reset', () => {
  it('changes the password with the emailed code, only once', async () => {
    const { service, prisma, email } = setup();
    await service.forgotPassword('ana@example.com');
    const input = { email: 'ana@example.com', code: code(email), password: 'new-password' };
    await service.resetPassword(input);
    const { data } = prisma.user.update.mock.calls[0][0];
    expect(await bcrypt.compare('new-password', data.password)).toBe(true);
    expect(data.passwordChangedAt).toBeInstanceOf(Date);
    await expect(service.resetPassword(input)).rejects.toThrow('no es válido');
  });

  it('stops accepting even the right code after five wrong attempts', async () => {
    const { service, prisma, email } = setup();
    await service.forgotPassword('ana@example.com');
    const right = code(email);
    for (let i = 0; i < 5; i += 1) {
      await expect(service.resetPassword({ email: 'ana@example.com', code: wrong(right), password: 'new-password' })).rejects.toThrow();
    }
    await expect(service.resetPassword({ email: 'ana@example.com', code: right, password: 'new-password' })).rejects.toThrow();
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('answers the same for an unknown email', async () => {
    const { service, prisma, email } = setup();
    prisma.user.findUnique.mockResolvedValue(null);
    expect(await service.forgotPassword('nobody@example.com')).toEqual({ sent: true });
    expect(email.sendPasswordResetEmail).not.toHaveBeenCalled();
  });
});
