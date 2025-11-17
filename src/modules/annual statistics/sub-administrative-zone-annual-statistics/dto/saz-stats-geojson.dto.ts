import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for querying Sub-Administrative Zone statistics with GeoJSON
 */
export class SAZStatsGeoJsonQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number; // If not provided, uses current year
}

/**
 * Interface for GeoJSON Feature properties containing SAZ statistics
 */
export interface SAZStatsProperties {
  // Basic SAZ information
  id: number;
  name: string;
  areaCode: string;
  type: 'chiwog' | 'lap'; // chiwog = Rural, lap = Urban
  areaSqKm: number;

  // Parent references
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;

  // Statistics year
  year: number;

  // Structural counts
  eaCount: number; // Total Enumeration Areas

  // Household statistics
  totalHouseholds: number;

  // Population statistics
  totalPopulation: number;
  totalMale: number;
  totalFemale: number;

  // Calculated metrics
  populationDensity: number; // Population per sq km
  averageHouseholdSize: number; // Total population / total households
  genderRatio: number; // Males per 100 females
  malePercentage: number;
  femalePercentage: number;

  // Additional metadata
  hasData: boolean; // Whether statistics exist for this year
  lastUpdated: string; // ISO timestamp
}

/**
 * GeoJSON Feature with SAZ statistics
 */
export interface SAZStatsFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
  properties: SAZStatsProperties;
}

/**
 * Summary statistics aggregated at Administrative Zone level
 * Summarizes all SAZs within the Administrative Zone
 */
export interface AdministrativeZoneSAZSummary {
  administrativeZoneId: number;
  administrativeZoneName: string;
  administrativeZoneType: 'Gewog' | 'Thromde';
  dzongkhagId: number;
  dzongkhagName: string;
  year: number;
  totalSAZs: number;
  totalEAs: number;
  totalPopulation: number;
  totalHouseholds: number;
  totalMale: number;
  totalFemale: number;
}

/**
 * Summary statistics aggregated at Dzongkhag level
 * Summarizes all SAZs within the Dzongkhag
 */
export interface DzongkhagSAZSummary {
  dzongkhagId: number;
  dzongkhagName: string;
  year: number;
  totalAZs: number;
  thromdeCount: number; // Urban AZs
  gewogCount: number; // Rural AZs
  totalSAZs: number;
  urbanSAZCount: number; // Laps (under Thromde)
  ruralSAZCount: number; // Chiwogs (under Gewog)
  totalEAs: number;
  totalPopulation: number;
  urbanPopulation: number; // Population in Laps
  ruralPopulation: number; // Population in Chiwogs
  totalHouseholds: number;
  urbanHouseholds: number;
  ruralHouseholds: number;
  urbanizationRate: number; // Percentage of population in urban SAZs
}

/**
 * GeoJSON FeatureCollection for SAZs grouped by Administrative Zone
 * Contains all SAZs (Chiwogs or Laps) within a specific Administrative Zone
 */
export interface SAZByAdministrativeZoneGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    administrativeZoneId: number;
    administrativeZoneName: string;
    administrativeZoneType: 'Gewog' | 'Thromde';
    dzongkhagId: number;
    dzongkhagName: string;
    generatedAt: string;
    summary: AdministrativeZoneSAZSummary;
  };
  features: SAZStatsFeature[];
}

/**
 * GeoJSON FeatureCollection for SAZs grouped by Dzongkhag
 * Contains all SAZs across all Administrative Zones within a specific Dzongkhag
 */
export interface SAZByDzongkhagGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    dzongkhagId: number;
    dzongkhagName: string;
    generatedAt: string;
    summary: DzongkhagSAZSummary;
  };
  features: SAZStatsFeature[];
}
