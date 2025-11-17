import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for querying Administrative Zone statistics with GeoJSON
 * Used to combine geographic boundaries with annual statistics for a specific Dzongkhag
 */
export class AZStatsGeoJsonQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number; // If not provided, uses current year
}

/**
 * Interface for GeoJSON Feature properties containing Administrative Zone statistics
 * This structure will be embedded in the GeoJSON Feature properties
 */
export interface AZStatsProperties {
  // Basic AZ information
  id: number;
  name: string;
  areaCode: string;
  type: 'Gewog' | 'Thromde'; // Gewog = Rural, Thromde = Urban
  areaSqKm: number;
  dzongkhagId: number;
  dzongkhagName: string;

  // Statistics year
  year: number;

  // Structural counts
  sazCount: number; // Total SAZs (Chiwog for Gewog, Lap for Thromde)
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
 * GeoJSON Feature with Administrative Zone statistics
 */
export interface AZStatsFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
  properties: AZStatsProperties;
}

/**
 * Summary statistics aggregated at Dzongkhag level
 * Summarizes all Administrative Zones within the Dzongkhag
 */
export interface DzongkhagAZSummary {
  dzongkhagId: number;
  dzongkhagName: string;
  year: number;
  totalAZs: number;
  thromdeCount: number; // Urban AZs
  gewogCount: number; // Rural AZs
  totalPopulation: number;
  urbanPopulation: number; // Population in Thromdes
  ruralPopulation: number; // Population in Gewogs
  totalHouseholds: number;
  urbanHouseholds: number;
  ruralHouseholds: number;
  totalSAZs: number;
  totalEAs: number;
  urbanizationRate: number; // Percentage of population in Thromdes
}

/**
 * GeoJSON FeatureCollection for Administrative Zones grouped by Dzongkhag
 * Contains all AZs (Thromdes and Gewogs) within a specific Dzongkhag
 * with their geometries and annual statistics
 */
export interface AZByDzongkhagGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    dzongkhagId: number;
    dzongkhagName: string;
    generatedAt: string;
    summary: DzongkhagAZSummary;
  };
  features: AZStatsFeature[];
}
