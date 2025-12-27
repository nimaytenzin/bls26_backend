/**
 * DTOs and interfaces for bulk matching enumeration areas from CSV
 * Used during survey creation workflow to validate and match enumeration areas
 * before survey is created
 */

export interface BulkMatchEaRowError {
  /** Row number in CSV (1-indexed, including header) */
  row: number;
    
  dzongkhagCode:string;
  gewogThromdeCode:string;
  chiwogLapCode:string;
  eaCode:string;
  /** Error message describing why the match failed */
  error: string;
}

export interface BulkMatchEaRowMatch {
  /** Row number in CSV (1-indexed, including header) */
  row: number;
  /** Enumeration Area ID that was matched */
  enumerationAreaId: number;
  /** Enumeration Area name */
  enumerationAreaName: string;
  /** Enumeration Area code */
  enumerationAreaCode: string;
  
  /** Sub Administrative Zone name */
  subAdminZoneName: string;
  /** Administrative Zone name */
  adminZoneName: string;
  /** Dzongkhag name */
  dzongkhagName: string;
  /** Codes used for matching */
  codes: {
    dzongkhagCode: string;
    adminZoneCode: string;
    subAdminZoneCode: string;
    enumerationCode: string;
  };
}

/**
 * Response DTO for bulk matching enumeration areas from CSV
 * Returns matched enumeration areas without creating survey enumeration area assignments
 */
export class BulkMatchEaResponseDto {
  /** Whether the matching operation completed successfully */
  success: boolean;

  /** Total number of rows processed (excluding header) */
  totalRows: number;

  /** Number of rows that successfully matched enumeration areas */
  matched: number;

  /** Number of rows that failed to match */
  failed: number;

  /** Array of errors for rows that failed to match */
  errors: BulkMatchEaRowError[];

  /** Array of successfully matched enumeration areas with details */
  matches: BulkMatchEaRowMatch[];

  /** Array of unique enumeration area IDs that were matched (for easy use in survey creation) */
  matchedEnumerationAreaIds: number[];
}

