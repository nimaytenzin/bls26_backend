import { IsString, IsOptional } from 'class-validator';

export class BulkUploadEaRowDto {
  @IsString()
  dzongkhagCode: string;

  @IsString()
  adminZoneCode: string;

  @IsString()
  subAdminZoneCode: string;

  @IsString()
  enumerationCode: string;

  @IsOptional()
  @IsString()
  fullEaCode?: string;
}

export class BulkUploadEaResponseDto {
  success: boolean;
  totalRows: number;
  successful: number;
  failed: number;
  errors: Array<{
    row: number;
    codes: string;
    error: string;
  }>;
  created: number;
  skipped: number;
}

