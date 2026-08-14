import { IsBoolean } from 'class-validator';

export class UpdateParkingActiveDto {
  @IsBoolean()
  active: boolean;
}