import {
    Body,
    Controller,
    Post,
    Req,
    UseGuards,
    Get,
    Param,
    Patch,
    Delete
  } from '@nestjs/common';
  
  
  import type { Request } from 'express';
  
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CreateParkingDto } from './dto/create-parking.dto';
  import { ParkingsService } from './parkings.service';
  import { UpdateParkingDto } from './dto/update-parking.dto';
  import { Query } from '@nestjs/common';
  import { NearbyParkingsDto } from './dto/nearby-parkings.dto';
  
  @Controller('parkings')
  export class ParkingsController {
    constructor(
      private readonly parkingsService: ParkingsService,
    ) {}
  
    @UseGuards(JwtAuthGuard)
    @Post()
    create(
      @Req() request: Request,
      @Body() createParkingDto: CreateParkingDto,
    ) {
      return this.parkingsService.create(
        request.user!.userId,
        createParkingDto,
      );
    }

    @Get()
    findAll() {
    return this.parkingsService.findAll();
    }

    @Get('nearby')
    findNearby(@Query() query: NearbyParkingsDto) {
      return this.parkingsService.findNearby(
        query.latitude,
        query.longitude,
        query.radius,
      );
    }
    
    @Get(':id')
    findOne(@Param('id') id: string) {
    return this.parkingsService.findOne(Number(id));
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
      @Req() request: Request,
      @Param('id') id: string,
      @Body() updateParkingDto: UpdateParkingDto,
    ) {
      return this.parkingsService.update(
        request.user!.userId,
        Number(id),
        updateParkingDto,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(
      @Req() request: Request,
      @Param('id') id: string,
    ) {
      return this.parkingsService.remove(
        request.user!.userId,
        Number(id),
      );
    }

  }