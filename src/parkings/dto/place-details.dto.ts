import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class PlaceDetailsDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  placeId: string;
}
