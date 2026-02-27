import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateHouseholdListingDto } from './create-household-listing.dto';

export class BulkCreateHouseholdListingDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateHouseholdListingDto)
  householdListings: CreateHouseholdListingDto[];
}
