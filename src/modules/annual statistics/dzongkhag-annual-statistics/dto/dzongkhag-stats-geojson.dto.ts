import { IsInt, IsOptional, Min } from 'class-validator';

/**
 * DTO for querying Dzongkhag statistics with GeoJSON
 * Used to combine geographic boundaries with annual statistics
 */
export class DzongkhagStatsGeoJsonQueryDto {
  @IsOptional()
  @IsInt()
  @Min(2000)
  year?: number; // If not provided, uses current year
}

/**
 * Interface for GeoJSON Feature properties containing Dzongkhag statistics
 * This structure will be embedded in the GeoJSON Feature properties
 */
export interface DzongkhagStatsProperties {
  // Basic Dzongkhag information
  id: number;
  name: string;
  areaCode: string;
  areaSqKm: number;

  // Statistics year
  year: number;

  // Structural counts
  azCount: number;
  urbanAZCount: number; // Thromdes
  ruralAZCount: number; // Gewogs
  sazCount: number;
  urbanSAZCount: number; // Laps
  ruralSAZCount: number; // Chiwogs
  eaCount: number;
  urbanEACount: number;
  ruralEACount: number;

  // Household statistics
  totalHouseholds: number;
  urbanHouseholdCount: number;
  ruralHouseholdCount: number;
  urbanHouseholdPercentage: number;
  ruralHouseholdPercentage: number;

  // Population statistics
  totalPopulation: number;
  totalMale: number;
  totalFemale: number;
  urbanPopulation: number;
  urbanMale: number;
  urbanFemale: number;
  ruralPopulation: number;
  ruralMale: number;
  ruralFemale: number;

  // Calculated metrics
  urbanizationRate: number; // Percentage of urban population
  populationDensity: number; // Population per sq km
  averageHouseholdSize: number; // Total population / total households
  genderRatio: number; // Males per 100 females
  urbanGenderRatio: number;
  ruralGenderRatio: number;

  // Additional metadata
  hasData: boolean; // Whether statistics exist for this year
  lastUpdated: string; // ISO timestamp
}

/**
 * GeoJSON Feature with Dzongkhag statistics
 */
export interface DzongkhagStatsFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
  properties: DzongkhagStatsProperties;
}

/**
 * GeoJSON FeatureCollection for all Dzongkhags with statistics
 */
export interface DzongkhagStatsGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    totalDzongkhags: number;
    generatedAt: string;
    nationalSummary: {
      totalPopulation: number;
      totalHouseholds: number;
      urbanPopulation: number;
      ruralPopulation: number;
      nationalUrbanizationRate: number;
      averageUrbanizationRate: number;
    };
  };
  features: DzongkhagStatsFeature[];
}
