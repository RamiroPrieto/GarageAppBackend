import { IsBoolean, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export const PAYMENT_SHEET_CLIENT_EVENTS = [
  'PAYMENT_INTENT_RESPONSE',
  'PAYMENT_SHEET_INIT_STARTED',
  'PAYMENT_SHEET_INIT_RESULT',
  'PAYMENT_SHEET_PRESENT_STARTED',
  'PAYMENT_SHEET_PRESENT_RESULT',
  'PAYMENT_FLOW_ERROR',
] as const;

export class PaymentSheetClientLogDto {
  @IsIn(PAYMENT_SHEET_CLIENT_EVENTS)
  event: (typeof PAYMENT_SHEET_CLIENT_EVENTS)[number];

  @IsInt()
  @Min(1)
  reservationId: number;

  @IsOptional()
  @IsBoolean()
  hasClientSecret?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  errorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  errorMessage?: string;
}
