import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

// The whole application with an in-memory database: no network, no real data.
describe('AppModule', () => {
  let app: INestApplication;
  const user: Record<string, unknown> = { id: 1, email: 'ana@example.com', emailVerified: true, deletedAt: null, passwordChangedAt: null };
  const prisma = {
    user: { findUnique: jest.fn(({ where }: any) => Promise.resolve(where.id === 1 || where.email === user.email ? user : null)) },
    pendingRegistration: { findUnique: jest.fn().mockResolvedValue(null) },
    reservation: { updateMany: jest.fn().mockResolvedValue({ count: 0 }), findMany: jest.fn().mockResolvedValue([]) },
  };

  beforeAll(async () => {
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
    user.password = await bcrypt.hash('password-1', 4);
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService).useValue(prisma)
      .compile();
    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => { await app?.close(); });

  it('rejects existing sessions after a password change or account deletion', async () => {
    const login = await request(app.getHttpServer()).post('/auth/login').send({ email: user.email, password: 'password-1' });
    expect(login.status).toBe(201);
    const me = () => request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${login.body.accessToken}`);

    expect((await me()).status).toBe(200);
    user.passwordChangedAt = new Date(Date.now() + 5_000);
    expect((await me()).status).toBe(401);
    user.passwordChangedAt = null;
    user.deletedAt = new Date();
    expect((await me()).status).toBe(401);
    user.deletedAt = null;
  });

  it('limits login attempts', async () => {
    const statuses: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      const response = await request(app.getHttpServer()).post('/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password' });
      statuses.push(response.status);
    }
    expect(statuses[0]).toBe(401);
    expect(statuses[statuses.length - 1]).toBe(429);
  });
});
