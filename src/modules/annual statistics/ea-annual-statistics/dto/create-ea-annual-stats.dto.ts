import { IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateEAAnnualStatsDto {
  @IsInt()
  @IsNotEmpty()
  enumerationAreaId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(1900)
  year: number;

  @IsInt()
  @Min(0)
  totalHouseholds: number;

  @IsInt()
  @Min(0)
  totalMale: number;

  @IsInt()
  @Min(0)
  totalFemale: number;
}
