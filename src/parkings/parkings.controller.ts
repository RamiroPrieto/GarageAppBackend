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
  import { UpdateParkingActiveDto } from './dto/update-parking-active.dto';
  import { GeocodeParkingAddressDto } from './dto/geocode-parking-address.dto';
  
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

    @UseGuards(JwtAuthGuard)
    @Post('geocode')
    geocode(@Body() geocodeParkingAddressDto: GeocodeParkingAddressDto) {
      return this.parkingsService.geocodeAddress(geocodeParkingAddressDto);
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

    @UseGuards(JwtAuthGuard)
    @Get('mine')
    findMine(@Req() request: Request) {
      return this.parkingsService.findMine(request.user!.userId);
    }

    @Get("available")
    findAvailable(
      @Query("startDatetime") startDatetime: string,
      @Query("endDatetime") endDatetime: string,
      @Query('latitude') latitude: string,
      @Query('longitude') longitude: string,
      @Query('radius') radius: string,
    ) {
      return this.parkingsService.findAvailable(
        new Date(startDatetime),
        new Date(endDatetime),
        Number(latitude),
        Number(longitude),
        Number(radius),
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

    @UseGuards(JwtAuthGuard)
    @Patch(':id/active')
    updateActive(
      @Req() request: Request,
      @Param('id') id: string,
      @Body() updateParkingActiveDto: UpdateParkingActiveDto,
    ) {
      return this.parkingsService.updateActive(
        request.user!.userId,
        Number(id),
        updateParkingActiveDto,
      );
    }
  }
