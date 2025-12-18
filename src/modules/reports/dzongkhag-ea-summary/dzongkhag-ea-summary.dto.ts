/**
 * Dzongkhag EA Summary Report DTOs
 */

export interface GeoJSONFeature {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties?: {
    id?: number;
    name?: string;
    [key: string]: any;
  };
}

export interface EnumerationAreaReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature;
  totalHouseholds?: number;
  totalPopulation?: number;
}

export interface ChiwogReportData {
  id: number;
  name: string;
  code: string;
  geometry?: GeoJSONFeature; // Optional
  summary: {
    totalEAs: number;
  };
  enumerationAreas: EnumerationAreaReportData[];
}

export interface GewogReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature; // Required for map
  summary: {
    totalChiwogs: number;
    totalEAs: number;
  };
  chiwogs: ChiwogReportData[];
}

export interface DzongkhagSummary {
  totalGewogs: number;
  totalChiwogs: number;
  totalEAs: number;
  totalHouseholds?: number;
  totalPopulation?: number;
}

export interface DzongkhagReportData {
  id: number;
  name: string;
  code: string;
  geometry: GeoJSONFeature;
}

export interface DzongkhagEaSummaryResponse {
  generatedAt: string; // ISO timestamp
  dzongkhag: DzongkhagReportData;
  summary: DzongkhagSummary;
  gewogs: GewogReportData[];
}

export interface MapFeatureCollection {
  type: 'FeatureCollection';
  features: Array<{
    type: 'Feature';
    geometry: {
      type: 'Polygon' | 'MultiPolygon';
      coordinates: number[][][] | number[][][][];
    };
    properties: {
      layer: 'dzongkhag' | 'gewog' | 'enumerationArea';
      id: number;
      name: string;
      code: string;
      dzongkhagId?: number;
      gewogId?: number;
      chiwogId?: number;
    };
  }>;
}
