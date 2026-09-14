import {
    Body,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
    Param,
    Patch,
    Delete
  } from '@nestjs/common';
  import type { Request } from 'express';
  
  import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
  import { CreateVehicleDto } from 'src/vehicles/dto/create-vehicle.dto';
  import { UpdateVehicleDto } from 'src/vehicles/dto/update-vehicle.dto';
  import { UpdateVehicleDefaultDto } from './dto/update-vehicle-default.dto';
  import { VehiclesService } from './vehicles.service';

  
  @Controller('vehicles')
  export class VehiclesController {
    constructor(private readonly vehiclesService: VehiclesService) {}
  
    @UseGuards(JwtAuthGuard)
    @Post()
    create(
      @Req() request: Request,
      @Body() createVehicleDto: CreateVehicleDto,
    ) {
      return this.vehiclesService.create(
        request.user!.userId,
        createVehicleDto,
      );
    }
  
    @UseGuards(JwtAuthGuard)
    @Get()
    findAll(@Req() request: Request) {
      return this.vehiclesService.findAll(request.user!.userId);
    }

    @UseGuards(JwtAuthGuard)
    @Get(':id')
    findOne(
    @Req() request: Request,
    @Param('id') id: string,
    ) {
    return this.vehiclesService.findOne(
        request.user!.userId,
        Number(id),
    );
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id')
    update(
      @Req() request: Request,
      @Param('id') id: string,
      @Body() updateVehicleDto: UpdateVehicleDto,
    ) {
      return this.vehiclesService.update(
        request.user!.userId,
        Number(id),
        updateVehicleDto,
      );
    }

    @UseGuards(JwtAuthGuard)
    @Delete(':id')
    remove(
      @Req() request: Request,
      @Param('id') id: string,
    ) {
      return this.vehiclesService.remove(
        request.user!.userId,
        Number(id),
      );
    }

    @UseGuards(JwtAuthGuard)
    @Patch(':id/default')
    setDefault(
      @Req() request: Request,
      @Param('id') id: string,
      @Body() updateVehicleDefaultDto: UpdateVehicleDefaultDto,
    ) {
      return this.vehiclesService.setDefault(
        request.user!.userId,
        Number(id),
        updateVehicleDefaultDto.isDefault,
      );
    }
  }
