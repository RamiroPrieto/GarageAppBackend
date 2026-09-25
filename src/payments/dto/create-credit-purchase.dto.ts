import { IsInt, Min } from 'class-validator';

export class CreateCreditPurchaseDto {
  @IsInt()
  @Min(1)
  credits: number;
}
