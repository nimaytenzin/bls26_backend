import { IsInt, IsNotEmpty, Min, IsOptional } from 'class-validator';

export class CreateDzongkhagAnnualStatsDto {
  @IsInt()
  @IsNotEmpty()
  dzongkhagId: number;

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
  urbanEACount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralEACount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  sazCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  urbanSAZCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralSAZCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  azCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  urbanAZCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralAZCount?: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalHouseholds: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  urbanHouseholdCount?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralHouseholdCount?: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalMale: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  urbanMale?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralMale?: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty()
  totalFemale: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  urbanFemale?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  ruralFemale?: number;
}
