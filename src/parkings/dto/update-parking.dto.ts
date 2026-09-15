import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsString,
  } from 'class-validator';
  
  import { Currency, ParkingType } from '@prisma/client';
  
  export class UpdateParkingDto {
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    title?: string;
  
    @IsOptional()
    @IsString()
    description?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    address?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    city?: string;
  
    @IsOptional()
    @IsString()
    @IsNotEmpty()
    country?: string;
  
    @IsOptional()
    @IsNumber()
    latitude?: number;
  
    @IsOptional()
    @IsNumber()
    longitude?: number;
  
    @IsOptional()
    @IsNumber()
    pricePerHour?: number;
  
    @IsOptional()
    @IsNumber()
  pricePerDay?: number;

  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
  
    @IsOptional()
    @IsNumber()
    maxHeight?: number;
  
    @IsOptional()
    @IsNumber()
    maxWidth?: number;
  
    @IsOptional()
    @IsBoolean()
    covered?: boolean;
  
    @IsOptional()
    @IsEnum(ParkingType)
    parkingType?: ParkingType;
  }
