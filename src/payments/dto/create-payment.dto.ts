import {
    IsBoolean,
    IsInt,
    IsNotEmpty,
  } from 'class-validator';
  
  export class CreatePaymentDto {
    @IsInt()
    @IsNotEmpty()
    reservationId: number;
  
    @IsBoolean()
    savePaymentMethod: boolean;
  }