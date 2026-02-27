import { Module } from '@nestjs/common';
import { HouseholdListingService } from './household-listing.service';
import { HouseholdListingController } from './household-listing.controller';
import { HouseholdListing } from './entities/household-listing.entity';
import { StructureModule } from '../structure/structure.module';

@Module({
  imports: [StructureModule],
  controllers: [HouseholdListingController],
  providers: [
    HouseholdListingService,
    {
      provide: 'HOUSEHOLD_LISTING_REPOSITORY',
      useValue: HouseholdListing,
    },
  ],
  exports: [HouseholdListingService, 'HOUSEHOLD_LISTING_REPOSITORY'],
})
export class HouseholdListingModule {}
