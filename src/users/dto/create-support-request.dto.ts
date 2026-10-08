import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSupportRequestDto {
  @IsString() @MinLength(3) @MaxLength(120)
  subject: string;

  @IsString() @MinLength(10) @MaxLength(2_000)
  message: string;
}
