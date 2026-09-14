import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { IsString, Matches } from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

class RegisterPushTokenDto {
  @IsString()
  @Matches(/^ExponentPushToken\[.+\]$/)
  token: string;
}

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  register(@Req() request: Request, @Body() dto: RegisterPushTokenDto) {
    return this.notifications.registerPushToken(request.user!.userId, dto.token);
  }
}
