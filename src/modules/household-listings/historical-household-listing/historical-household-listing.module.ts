import { Module } from '@nestjs/common';
import { HistoricalHouseholdListingService } from './historical-household-listing.service';
import { HistoricalHouseholdListingController } from './historical-household-listing.controller';
import { HistoricalHouseholdListing } from './entities/historical-household-listing.entity';

@Module({
  controllers: [HistoricalHouseholdListingController],
  providers: [
    HistoricalHouseholdListingService,
    {
      provide: 'HISTORICAL_HOUSEHOLD_LISTING_REPOSITORY',
      useValue: HistoricalHouseholdListing,
    },
  ],
  exports: [HistoricalHouseholdListingService],
})
export class HistoricalHouseholdListingModule {}
