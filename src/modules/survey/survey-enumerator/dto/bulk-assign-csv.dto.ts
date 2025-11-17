import { IsInt, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class EnumeratorCsvRowDto {
  name: string;
  cid: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
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
