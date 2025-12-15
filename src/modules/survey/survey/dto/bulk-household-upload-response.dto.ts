export class BulkHouseholdUploadResponseDto {
  totalItems: number;
  created: number;
  skipped: number;
  householdListingsCreated: number;
  errors: Array<{
    enumerationAreaId: number;
    surveyId: number;
    householdCount: number;
    reason: string;
  }>;
}

