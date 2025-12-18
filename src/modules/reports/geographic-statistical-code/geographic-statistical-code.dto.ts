/**
 * Geographic Statistical Code Report DTOs
 */

export interface EnumerationAreaReportRow {
  eaId: number;
  eaName: string;
  eaCode: string;
  administrativeZone: {
    id: number;
    name: string; // Gewog or Thromde name
    code: string; // GewogCode or ThromdeCode
    type: 'Gewog' | 'Thromde';
  };
  subAdministrativeZone: {
    id: number;
    name: string; // Chiwog or LAP name
    code: string; // ChiwogCode or LAPCode
    type: 'chiwog' | 'lap';
  };
}

export interface DzongkhagSummary {
  totalGewogs: number;
  totalThromdes: number;
  totalChiwogs: number;
  totalLaps: number;
  totalEAs: number;
  urbanEAs: number;
  ruralEAs: number;
}

export interface DzongkhagReportData {
  id: number;
  name: string;
  code: string;
  summary: DzongkhagSummary;
  urbanEAs: EnumerationAreaReportRow[];
  ruralEAs: EnumerationAreaReportRow[];
}

export interface GeographicStatisticalCodeResponse {
  generatedAt: string; // ISO timestamp
  totalDzongkhags: number;
  totalEAs: number;
  totalUrbanEAs: number;
  totalRuralEAs: number;
  dzongkhags: DzongkhagReportData[];
}

