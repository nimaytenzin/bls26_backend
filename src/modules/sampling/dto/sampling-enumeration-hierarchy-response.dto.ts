import { AdministrativeZoneType } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SamplingMethod } from '../entities/survey-sampling-config.entity';

export class EnumerationAreaSamplingHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  surveyEnumerationAreaId: number;
  totalHouseholdCount: number;
  // Enumeration status
  isEnumerated: boolean;
  enumeratedBy: number | null;
  enumerationDate: Date | null;
  // Sampling status
  isSampled: boolean;
  sampledBy: number | null;
  sampledDate: Date | null;
  // Publishing status
  isPublished: boolean;
  publishedBy: number | null;
  publishedDate: Date | null;
  // Sampling data
  hasSampling: boolean;
  sampling?: {
    id: number;
    method: SamplingMethod;
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date | null;
    executedBy: number | null;
  } | null;
}

export class SubAdministrativeZoneSamplingHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  type: string;
  enumerationAreas: EnumerationAreaSamplingHierarchyDto[];
}

export class AdministrativeZoneSamplingHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  type: AdministrativeZoneType;
  subAdministrativeZones: SubAdministrativeZoneSamplingHierarchyDto[];
}

export class DzongkhagSamplingHierarchyDto {
  id: number;
  name: string;
  areaCode: string;
  areaSqKm: number;
  administrativeZones: AdministrativeZoneSamplingHierarchyDto[];
}

export class SamplingEnumerationHierarchySummaryDto {
  totalDzongkhags: number;
  totalAdministrativeZones: number;
  totalSubAdministrativeZones: number;
  totalEnumerationAreas: number;
  totalWithSampling: number;
  totalWithoutSampling: number;
}

export class SamplingEnumerationHierarchyDto {
  survey: {
    id: number;
    name: string;
    year: number;
  };
  summary: SamplingEnumerationHierarchySummaryDto;
  hierarchy: DzongkhagSamplingHierarchyDto[];
}

