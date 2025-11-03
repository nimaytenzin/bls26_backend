import { IsNotEmpty, IsNumber, IsPositive, Min } from 'class-validator';

export class CreateHistoricalHouseholdListingDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(1900)
  year: number;

  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  householdCount: number;

  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  enumerationAreaId: number;
}
