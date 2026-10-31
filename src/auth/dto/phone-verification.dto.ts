import { IsEmail, IsNotEmpty, IsString, Matches } from 'class-validator';

export class RequestPhoneVerificationDto {
  @IsEmail()
  email: string;
}

export class ConfirmPhoneVerificationDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4,10}$/)
  code: string;
}
