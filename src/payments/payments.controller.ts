import {
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  Body,
  Headers,
  Get,
} from '@nestjs/common';

import type { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { CreateCreditPurchaseDto } from './dto/create-credit-purchase.dto';
import { PayReservationWithCreditsDto } from './dto/pay-reservation-with-credits.dto';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('setup')
  createSetupIntent(@Req() request: Request) {
    return this.paymentsService.createSetupIntent(
      request.user!.userId,
    );
  }
  @UseGuards(JwtAuthGuard)
  @Post()
  createPayment(
    @Req() request: Request,
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.createPayment(
      request.user!.userId,
      createPaymentDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post('credits/purchase')
  createCreditPurchase(@Req() request: Request, @Body() dto: CreateCreditPurchaseDto, @Headers('idempotency-key') idempotencyKey: string) {
    return this.paymentsService.createCreditPurchase(request.user!.userId, dto, idempotencyKey);
  }

  @UseGuards(JwtAuthGuard)
  @Get('credits/purchases/:paymentIntentId')
  getCreditPurchaseStatus(
    @Req() request: Request,
    @Param('paymentIntentId') paymentIntentId: string,
  ) {
    return this.paymentsService.getCreditPurchaseStatus(request.user!.userId, paymentIntentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':reservationId/credits')
  payReservationWithCredits(
    @Req() request: Request,
    @Param('reservationId') reservationId: string,
    @Body() dto: PayReservationWithCreditsDto,
  ) {
    return this.paymentsService.payReservationWithCredits(request.user!.userId, Number(reservationId), dto.idempotencyKey);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':reservationId/confirm')
  confirmPayment(
    @Req() request: Request,
    @Param('reservationId') reservationId: string,
  ) {
    return this.paymentsService.confirmPayment(
      request.user!.userId,
      Number(reservationId),
    );
  }
  @Post('webhook')
  handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: Request & { rawBody: Buffer },
  ) {
    return this.paymentsService.handleWebhook(
      request.rawBody,
      signature,
    );
  }
}
