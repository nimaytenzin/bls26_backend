import { PartialType } from '@nestjs/mapped-types';
import { CreateAZAnnualStatsDto } from './create-az-annual-stats.dto';

export class UpdateAZAnnualStatsDto extends PartialType(
  CreateAZAnnualStatsDto,
) {}
