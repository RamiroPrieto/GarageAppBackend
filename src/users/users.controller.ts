import {
  Controller,
  Get,
  Patch,
  Body,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateSupportRequestDto } from './dto/create-support-request.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@Req() request: Request) {
    return this.usersService.getMe(request.user!.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  updateMe(@Req() request: Request, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateMe(request.user!.userId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('support')
  createSupportRequest(@Req() request: Request, @Body() dto: CreateSupportRequestDto) {
    return this.usersService.createSupportRequest(request.user!.userId, dto);
  }
}
