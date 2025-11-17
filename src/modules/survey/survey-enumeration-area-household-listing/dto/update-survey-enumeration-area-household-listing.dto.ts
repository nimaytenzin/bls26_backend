import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './create-survey-enumeration-area-household-listing.dto';

export class UpdateSurveyEnumerationAreaHouseholdListingDto extends PartialType(CreateSurveyEnumerationAreaHouseholdListingDto) {}
