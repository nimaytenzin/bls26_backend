import { AdministrativeZoneType } from '../../../location/administrative-zone/entities/administrative-zone.entity';
import { SurveyStatus } from '../entities/survey.entity';

export class EnumerationAreaHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  surveyEnumerationAreaId: number;
  totalHouseholdCount: number;
  // Submission status
  isSubmitted: boolean;
  submittedBy: number | null;
  submissionDate: Date | null;
  // Validation status
  isValidated: boolean;
  validatedBy: number | null;
  validationDate: Date | null;
}

export class SubAdministrativeZoneHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  type: string;
  enumerationAreas: EnumerationAreaHierarchyDto[];
}

export class AdministrativeZoneHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  type: AdministrativeZoneType;
  subAdministrativeZones: SubAdministrativeZoneHierarchyDto[];
}

export class DzongkhagHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  areaSqKm: number;
  administrativeZones: AdministrativeZoneHierarchyDto[];
}

export class SurveyEnumerationHierarchySummaryDto {
  totalDzongkhags: number;
  totalAdministrativeZones: number;
  totalSubAdministrativeZones: number;
  totalEnumerationAreas: number;
}

export class SurveyEnumerationHierarchyDto {
  survey: {
    id: number;
    name: string;
    year: number;
    status: SurveyStatus;
  };
  summary: SurveyEnumerationHierarchySummaryDto;
  hierarchy: DzongkhagHierarchyDto[];
}

