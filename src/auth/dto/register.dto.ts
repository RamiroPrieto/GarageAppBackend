import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsOptional()
  @IsString()
  @Matches(/^\+?[1-9]\d{6,14}$/)
  phone?: string;
}
