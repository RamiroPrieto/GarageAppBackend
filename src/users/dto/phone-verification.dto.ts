import { IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPhoneChangeDto {
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone: string;
}

export class ConfirmPhoneChangeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,10}$/)
  code: string;
}
