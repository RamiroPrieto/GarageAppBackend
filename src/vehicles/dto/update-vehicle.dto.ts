import { IsOptional, IsString, Length } from 'class-validator';

export class UpdateVehicleDto {
  @IsOptional()
  @IsString()
  @Length(1, 20)
  licensePlate?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  color?: string;
}