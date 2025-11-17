import { PartialType } from '@nestjs/mapped-types';
import { CreateEAAnnualStatsDto } from './create-ea-annual-stats.dto';

export class UpdateEAAnnualStatsDto extends PartialType(
  CreateEAAnnualStatsDto,
) {}
