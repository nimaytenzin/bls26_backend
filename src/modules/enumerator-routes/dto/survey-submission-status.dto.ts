/**
 * DTO for Survey Submission Status Response
 * Returns enumeration areas grouped by geographic hierarchy with submission details
 */

export class EnumerationAreaSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  areaSqKm?: number;
  surveyEnumerationAreaId: number;
  isSubmitted: boolean;
  isValidated: boolean;
  submissionDate?: Date;
  validationDate?: Date;
  householdCount: number;
  totalMale?: number;
  totalFemale?: number;
  totalPopulation?: number;
}

export class SubAdministrativeZoneSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  type: string;
  enumerationAreas: EnumerationAreaSubmissionDto[];
  summary: {
    totalEnumerationAreas: number;
    submittedEnumerationAreas: number;
    validatedEnumerationAreas: number;
    totalHouseholds: number;
    totalPopulation: number;
  };
}

export class AdministrativeZoneSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  type: string;
  subAdministrativeZones: SubAdministrativeZoneSubmissionDto[];
  summary: {
    totalSubAdministrativeZones: number;
    totalEnumerationAreas: number;
    submittedEnumerationAreas: number;
    validatedEnumerationAreas: number;
    totalHouseholds: number;
    totalPopulation: number;
  };
}

export class DzongkhagSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  areaSqKm?: number;
  administrativeZones: AdministrativeZoneSubmissionDto[];
  summary: {
    totalAdministrativeZones: number;
    totalSubAdministrativeZones: number;
    totalEnumerationAreas: number;
    submittedEnumerationAreas: number;
    validatedEnumerationAreas: number;
    totalHouseholds: number;
    totalPopulation: number;
  };
}

export class SurveySubmissionStatusResponseDto {
  survey: {
    id: number;
    name: string;
    year: number;
    status: string;
    startDate?: Date;
    endDate?: Date;
  };
  overallSummary: {
    totalDzongkhags: number;
    totalAdministrativeZones: number;
    totalSubAdministrativeZones: number;
    totalEnumerationAreas: number;
    submittedEnumerationAreas: number;
    validatedEnumerationAreas: number;
    pendingEnumerationAreas: number;
    submissionPercentage: string;
    validationPercentage: string;
    totalHouseholds: number;
    totalMale: number;
    totalFemale: number;
    totalPopulation: number;
  };
  hierarchy: DzongkhagSubmissionDto[];
}
