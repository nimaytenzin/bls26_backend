import { IsInt, IsOptional, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class RecalculateStatsDto {
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Type(() => Number)
  year?: number;
}

export class ListEAAnnualStatsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dzongkhagId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  limit?: number = 50;
}

export enum AggregationLevel {
  DZONGKHAG = 'dzongkhag',
  GEWOG = 'gewog',
  CHIWOG = 'chiwog',
}

export class AggregateStatsQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1900)
  @Type(() => Number)
  year?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  dzongkhagId?: number;

  @IsOptional()
  @IsEnum(AggregationLevel)
  groupBy?: AggregationLevel = AggregationLevel.DZONGKHAG;
}

export class EAAnnualStatsResponseDto {
  id: number;
  enumerationAreaId: number;
  year: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
  totalPopulation: number;
  createdAt: Date;
  updatedAt: Date;
  enumerationArea?: {
    id: number;
    name: string;
    areaCode: string;
  };
}

export class AggregatedStatsResponseDto {
  groupName: string;
  groupId?: number;
  year: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
  totalPopulation: number;
}

export class PaginatedEAAnnualStatsResponseDto {
  data: EAAnnualStatsResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
