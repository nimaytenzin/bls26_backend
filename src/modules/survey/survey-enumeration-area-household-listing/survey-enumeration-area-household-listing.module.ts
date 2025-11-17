import { Module } from '@nestjs/common';
import { SurveyEnumerationAreaHouseholdListingService } from './survey-enumeration-area-household-listing.service';
import { SurveyEnumerationAreaHouseholdListingController } from './survey-enumeration-area-household-listing.controller';
import { surveyEnumerationAreaHouseholdListingProviders } from './survey-enumeration-area-household-listing.provider';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SurveyEnumerationAreaHouseholdListingController],
  providers: [
    SurveyEnumerationAreaHouseholdListingService,
    ...surveyEnumerationAreaHouseholdListingProviders,
  ],
  exports: [SurveyEnumerationAreaHouseholdListingService],
})
export class SurveyEnumerationAreaHouseholdListingModule {}
