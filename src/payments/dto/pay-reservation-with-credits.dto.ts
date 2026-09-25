import { IsOptional, IsString, MaxLength } from 'class-validator';

export class PayReservationWithCreditsDto {
  // Lets clients safely retry the same user action without creating a new charge.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  idempotencyKey?: string;
}
