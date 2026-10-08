import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  lastName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string | null;

  // Profile images are sent as compressed data URLs by the native picker.
  @IsOptional()
  @IsString()
  @MaxLength(2_800_000)
  profileImage?: string | null;
}
