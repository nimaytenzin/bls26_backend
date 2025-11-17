import { PartialType } from '@nestjs/mapped-types';
import { CreateDzongkhagAnnualStatsDto } from './create-dzongkhag-annual-stats.dto';

export class UpdateDzongkhagAnnualStatsDto extends PartialType(
  CreateDzongkhagAnnualStatsDto,
) {}
