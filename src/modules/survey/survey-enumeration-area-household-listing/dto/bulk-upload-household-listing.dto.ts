import { IsInt, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './create-survey-enumeration-area-household-listing.dto';

export class BulkUploadHouseholdListingDto {
  @IsInt()
  @IsNotEmpty()
  surveyEnumerationAreaId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateSurveyEnumerationAreaHouseholdListingDto)
  households: CreateSurveyEnumerationAreaHouseholdListingDto[];
}
