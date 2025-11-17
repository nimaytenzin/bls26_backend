import { IsInt, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateAZAnnualStatsDto {
  @IsInt()
  @IsNotEmpty()
  administrativeZoneId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1900)
  year: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  eaCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sazCount?: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalHouseholds: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalMale: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalFemale: number;
}
