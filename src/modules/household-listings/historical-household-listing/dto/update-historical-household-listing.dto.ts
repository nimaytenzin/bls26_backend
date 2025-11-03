import { PartialType } from '@nestjs/mapped-types';
import { CreateHistoricalHouseholdListingDto } from './create-historical-household-listing.dto';

export class UpdateHistoricalHouseholdListingDto extends PartialType(
  CreateHistoricalHouseholdListingDto,
) {}
