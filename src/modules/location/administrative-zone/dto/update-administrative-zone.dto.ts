import { PartialType } from '@nestjs/mapped-types';
import { CreateAdministrativeZoneDto } from './create-administrative-zone.dto';

export class UpdateAdministrativeZoneDto extends PartialType(
  CreateAdministrativeZoneDto,
) {}
