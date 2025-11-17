/**
 * Response DTO for current household listings by enumeration area
 * Returns the most recent validated household data
 */

import { EnumerationArea } from 'src/modules/location/enumeration-area/entities/enumeration-area.entity';
import { Survey } from '../../survey/entities/survey.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../../survey-enumeration-area/entities/survey-enumeration-area.entity';

export enum CurrentHouseholdListingStatus {
  SUCCESS = 'SUCCESS',
  NO_DATA = 'NO_DATA',
  VALIDATED_BUT_EMPTY = 'VALIDATED_BUT_EMPTY',
}

export class EnumerationAreaInfoDto {
  id: number;
  name: string;
  areaCode: string;
  areaSqKm: number;
}

export class HouseholdStatisticsDto {
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
  totalPopulation: number;
  averageHouseholdSize: string;
  validatedDate: Date;
}

export class CurrentHouseholdListingDataDto {
  survey: Survey;
  surveyEnumerationArea: SurveyEnumerationArea;
  enumerationArea: EnumerationArea;
  householdListings: SurveyEnumerationAreaHouseholdListing[];
  statistics: HouseholdStatisticsDto;
}

export class LatestSurveyMetadataDto {
  surveyName: string;
  year: number;
  status: string;
  reason: string;
}

export class CurrentHouseholdListingMetadataDto {
  latestSurvey?: LatestSurveyMetadataDto;
  totalSurveysChecked: number;
}

export class CurrentHouseholdListingResponseDto {
  /**
   * Status of the response
   * - SUCCESS: Found validated household data
   * - NO_DATA: No surveys found or no validated data available
   * - VALIDATED_BUT_EMPTY: Survey validated but no household listings
   */
  status: CurrentHouseholdListingStatus;

  /**
   * Human-readable message explaining the status
   */
  message: string;

  /**
   * Household data (only present when status is SUCCESS or VALIDATED_BUT_EMPTY)
   */
  data?: CurrentHouseholdListingDataDto;

  /**
   * Additional metadata about the search process
   */
  metadata?: CurrentHouseholdListingMetadataDto;
}
