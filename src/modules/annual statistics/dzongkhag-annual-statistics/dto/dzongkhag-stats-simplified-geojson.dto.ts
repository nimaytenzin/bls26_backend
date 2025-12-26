/**
 * Simplified DTO for Dzongkhag statistics GeoJSON
 * Contains only essential fields: EA counts, household counts, and population statistics
 */

/**
 * Simplified properties for GeoJSON Feature containing Dzongkhag statistics
 */
export interface DzongkhagStatsSimplifiedProperties {
  // Basic Dzongkhag information
  id: number;
  name: string;
  areaCode: string;

  // Statistics year
  year: number;

  // Enumeration Area counts
  totalEA: number; // Total enumeration areas
  urbanEA: number; // Urban enumeration areas
  ruralEA: number; // Rural enumeration areas

  // Household counts
  totalHousehold: number; // Total households
  urbanHousehold: number; // Urban households
  ruralHousehold: number; // Rural households

  // Population statistics
  totalPopulation: number; // Total population
  urbanPopulation: number; // Urban population
  ruralPopulation: number; // Rural population

  // Metadata
  hasData: boolean; // Whether statistics exist for this year
  lastUpdated: string; // ISO timestamp
}

/**
 * GeoJSON Feature with simplified Dzongkhag statistics
 */
export interface DzongkhagStatsSimplifiedFeature {
  type: 'Feature';
  id: number;
  geometry: {
    type: 'MultiPolygon';
    coordinates: number[][][][];
  };
  properties: DzongkhagStatsSimplifiedProperties;
}

/**
 * National summary statistics
 */
export interface DzongkhagStatsSimplifiedNationalSummary {
  totalEA: number;
  urbanEA: number;
  ruralEA: number;
  totalHousehold: number;
  urbanHousehold: number;
  ruralHousehold: number;
  totalPopulation: number;
  urbanPopulation: number;
  ruralPopulation: number;
}

/**
 * GeoJSON FeatureCollection for all Dzongkhags with simplified statistics
 */
export interface DzongkhagStatsSimplifiedGeoJsonResponse {
  type: 'FeatureCollection';
  metadata: {
    year: number;
    totalDzongkhags: number;
    generatedAt: string;
    nationalSummary: DzongkhagStatsSimplifiedNationalSummary;
  };
  features: DzongkhagStatsSimplifiedFeature[];
}

