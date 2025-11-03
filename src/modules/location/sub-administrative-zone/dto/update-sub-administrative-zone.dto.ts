import { PartialType } from '@nestjs/mapped-types';
import { CreateSubAdministrativeZoneDto } from './create-sub-administrative-zone.dto';

export class UpdateSubAdministrativeZoneDto extends PartialType(
  CreateSubAdministrativeZoneDto,
) {}
