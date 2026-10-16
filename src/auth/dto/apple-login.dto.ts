import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AppleLoginDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  // Apple only returns names the first time a person authorizes the app.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;
}
