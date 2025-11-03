import { PartialType } from '@nestjs/mapped-types';
import { CreateEnumerationAreaDto } from './create-enumeration-area.dto';

export class UpdateEnumerationAreaDto extends PartialType(
  CreateEnumerationAreaDto,
) {}
