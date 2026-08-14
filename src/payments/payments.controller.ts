import {
  Controller,
  Post,
  Req,
  UseGuards,
  Body
} from '@nestjs/common';

import type { Request } from 'express';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PaymentsService } from './payments.service';

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
}