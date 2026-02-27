import { IsEnum } from 'class-validator';
import { EnumerationAreaStatus } from '../enums/enumeration-area-status.enum';

export class UpdateEnumerationAreaStatusDto {
  @IsEnum(EnumerationAreaStatus)
  status: EnumerationAreaStatus;
}
