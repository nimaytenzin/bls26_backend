import { IsInt, IsNotEmpty, IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class EnumeratorCsvRowDto {
  name: string;
  cid: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  dzongkhagCode: string; // Dzongkhag code (e.g., "01", "02")
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
