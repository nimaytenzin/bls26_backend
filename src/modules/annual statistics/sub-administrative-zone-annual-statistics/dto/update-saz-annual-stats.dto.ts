import { PartialType } from '@nestjs/mapped-types';
import { CreateSAZAnnualStatsDto } from './create-saz-annual-stats.dto';

export class UpdateSAZAnnualStatsDto extends PartialType(
  CreateSAZAnnualStatsDto,
) {}
