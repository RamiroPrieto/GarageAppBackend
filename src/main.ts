import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  // Do not print Stripe credentials. These flags make a Railway deployment
  // misconfiguration visible before the first payment reaches the webhook.
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  console.log('[stripe] Configuration', {
    mode: stripeSecretKey?.startsWith('sk_live_') ? 'live' : 'test',
    secretKeyConfigured: Boolean(stripeSecretKey),
    webhookSecretConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
  });
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  // Profile photos are compressed client-side data URLs. Nest keeps the raw
  // request body enabled above, which Stripe still uses for signature checks.
  app.useBodyParser('json', { limit: '3mb' });
  
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}

bootstrap();
