import { IsInt, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateSAZAnnualStatsDto {
  @IsInt()
  @IsNotEmpty()
  subAdministrativeZoneId: number;

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
