import { PartialType } from '@nestjs/mapped-types';
import { CreateHouseholdListingDto } from './create-household-listing.dto';

export class UpdateHouseholdListingDto extends PartialType(
  CreateHouseholdListingDto,
) {}
