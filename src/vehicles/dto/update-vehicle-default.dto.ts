import { IsBoolean } from 'class-validator';

export class UpdateVehicleDefaultDto {
  @IsBoolean()
  isDefault: boolean;
}
