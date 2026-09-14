import {
    Body,
    Controller,
    Get,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
  } from '@nestjs/common';
  
  import type { Request } from 'express';
  
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CreateReservationDto } from './dto/create-reservation.dto';
  import { ReservationsService } from './reservations.service';
  
  @Controller('reservations')
  export class ReservationsController {
    constructor(
      private readonly reservationsService: ReservationsService,
    ) {}
  
    @UseGuards(JwtAuthGuard)
    @Post()
    create(
      @Req() request: Request,
      @Body() createReservationDto: CreateReservationDto,
    ) {
      return this.reservationsService.create(
        request.user!.userId,
        createReservationDto,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Req() request: Request) {
    return this.reservationsService.findAll(
        request.user!.userId,
    );
    }

    @UseGuards(JwtAuthGuard)
    @Get('upcoming/home')
    findUpcomingForHome(@Req() request: Request) {
      return this.reservationsService.findUpcomingForHome(request.user!.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(
    @Req() request: Request,
    @Param('id') id: string,
    ) {
    return this.reservationsService.findOne(
        request.user!.userId,
        Number(id),
    );
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/cancel')
    cancel(
    @Req() request: Request,
    @Param('id') id: string,
    ) {
    return this.reservationsService.cancel(
        request.user!.userId,
        Number(id),
    );
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/start/customer')
    confirmCustomerStart(@Req() request: Request, @Param('id') id: string) {
      return this.reservationsService.confirmCustomerStart(request.user!.userId, Number(id));
    }

    @UseGuards(JwtAuthGuard)
    @Post(':id/start/owner')
    confirmOwnerStart(@Req() request: Request, @Param('id') id: string) {
      return this.reservationsService.confirmOwnerStart(request.user!.userId, Number(id));
    }
  }
