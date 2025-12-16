/**
 * DTO for Survey Submission Status Response
 * Returns enumeration areas grouped by geographic hierarchy with workflow status details
 */

export class EnumerationAreaSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  surveyEnumerationAreaId: number;
  isEnumerated: boolean;
  isSampled: boolean;
  isPublished: boolean;
  enumerationDate?: Date;
  sampledDate?: Date;
  publishedDate?: Date;
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
    enumeratedEnumerationAreas: number;
    sampledEnumerationAreas: number;
    publishedEnumerationAreas: number;
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
    enumeratedEnumerationAreas: number;
    sampledEnumerationAreas: number;
    publishedEnumerationAreas: number;
    totalHouseholds: number;
    totalPopulation: number;
  };
}

export class DzongkhagSubmissionDto {
  id: number;
  name: string;
  areaCode: string;
  administrativeZones: AdministrativeZoneSubmissionDto[];
  summary: {
    totalAdministrativeZones: number;
    totalSubAdministrativeZones: number;
    totalEnumerationAreas: number;
    enumeratedEnumerationAreas: number;
    sampledEnumerationAreas: number;
    publishedEnumerationAreas: number;
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
    enumeratedEnumerationAreas: number;
    sampledEnumerationAreas: number;
    publishedEnumerationAreas: number;
    pendingEnumerationAreas: number;
    enumerationPercentage: string;
    samplingPercentage: string;
    publishingPercentage: string;
    totalHouseholds: number;
    totalMale: number;
    totalFemale: number;
    totalPopulation: number;
  };
  hierarchy: DzongkhagSubmissionDto[];
}
