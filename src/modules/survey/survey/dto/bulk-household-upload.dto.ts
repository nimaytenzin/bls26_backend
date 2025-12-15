import { IsInt, IsArray, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class HouseholdUploadItemDto {
  @IsInt()
  enumerationAreaId: number;

  @IsInt()
  surveyId: number;

  @IsInt()
  @Min(0)
  householdCount: number;
}

export class BulkHouseholdUploadDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HouseholdUploadItemDto)
  items: HouseholdUploadItemDto[];
}

