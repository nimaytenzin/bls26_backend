import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for querying Enumeration Area statistics with GeoJSON
 */
export class EAStatsGeoJsonQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number; // If not provided, uses current year
}

/**
 * Interface for GeoJSON Feature properties containing EA statistics
 */
export interface EAStatsProperties {
  // Basic EA information
  id: number;
  name: string;
  areaCode: string;
  description: string;

  // Parent references
  subAdministrativeZoneId: number | null;
  subAdministrativeZoneName: string | null;
  subAdministrativeZoneType: 'chiwog' | 'lap' | null;
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;

  // Statistics year
  year: number;

  // Household statistics
  totalHouseholds: number;

  // Population statistics
  totalPopulation: number;
  totalMale: number;
  totalFemale: number;

  // Calculated metrics
  averageHouseholdSize: number; // Total population / total households
  genderRatio: number; // Males per 100 females
  malePercentage: number;
  femalePercentage: number;

  // Additional metadata
  hasData: boolean; // Whether statistics exist for this year
  lastUpdated: string; // ISO timestamp
}

/**
 * GeoJSON Feature with EA statistics
 */
export interface EAStatsFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  } | null;
  properties: EAStatsProperties;
}

/**
 * Summary statistics aggregated at Sub-Administrative Zone level
 * Summarizes all EAs within the Sub-Administrative Zone
 */
export interface SubAdministrativeZoneEASummary {
  subAdministrativeZoneId: number;
  subAdministrativeZoneName: string;
  subAdministrativeZoneType: 'chiwog' | 'lap' | null;
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;
  year: number;
  totalEAs: number;
  totalPopulation: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
}

/**
 * GeoJSON FeatureCollection for EAs grouped by Sub-Administrative Zone
 * Contains all Enumeration Areas within a specific Sub-Administrative Zone
 */
export interface EABySubAdministrativeZoneGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    subAdministrativeZoneId: number;
    subAdministrativeZoneName: string;
    subAdministrativeZoneType: 'chiwog' | 'lap' | null;
    administrativeZoneId: number;
    administrativeZoneName: string;
    administrativeZoneType: 'Gewog' | 'Thromde';
    dzongkhagId: number;
    dzongkhagName: string;
    generatedAt: string;
    summary: SubAdministrativeZoneEASummary;
  };
  features: EAStatsFeature[];
}

