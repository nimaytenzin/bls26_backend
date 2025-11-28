import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';

export class CreateBlankHouseholdListingsDto {
  @IsInt()
  @Min(1)
  @Max(10000) // Reasonable upper limit
  count: number;

  @IsOptional()
  @IsString()
  remarks?: string; // Optional custom remarks, defaults to "No data available - Historical survey"
}

