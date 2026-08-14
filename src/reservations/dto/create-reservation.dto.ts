import {
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsOptional,
  } from 'class-validator';
  
  export class CreateReservationDto {
    @IsInt()
    @IsNotEmpty()
    parkingId: number;
  
    @IsOptional()
    @IsInt()
    vehicleId?: number;
  
    @IsDateString()
    startDatetime: string;
  
    @IsDateString()
    endDatetime: string;
  }