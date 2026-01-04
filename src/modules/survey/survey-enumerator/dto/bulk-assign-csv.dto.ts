import { IsInt, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EnumeratorCsvRowDto {
  name: string;
  cid: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  dzongkhagCodes: string; // Comma-separated dzongkhag codes (e.g., "01,02,03") - REQUIRED
}

export class BulkAssignFromCsvDto {
  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnumeratorCsvRowDto)
  enumerators: EnumeratorCsvRowDto[];
}
