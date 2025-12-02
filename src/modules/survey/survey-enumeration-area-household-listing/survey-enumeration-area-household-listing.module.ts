import { Module, forwardRef } from '@nestjs/common';
import { SurveyEnumerationAreaHouseholdListingService } from './survey-enumeration-area-household-listing.service';
import { SurveyEnumerationAreaHouseholdListingController } from './survey-enumeration-area-household-listing.controller';
import { surveyEnumerationAreaHouseholdListingProviders } from './survey-enumeration-area-household-listing.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SurveyEnumerationAreaStructureModule } from '../survey-enumeration-area-structure/survey-enumeration-area-structure.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => SurveyEnumerationAreaStructureModule)],
  controllers: [SurveyEnumerationAreaHouseholdListingController],
  providers: [
    SurveyEnumerationAreaHouseholdListingService,
    ...surveyEnumerationAreaHouseholdListingProviders,
  ],
  exports: [SurveyEnumerationAreaHouseholdListingService],
})
export class SurveyEnumerationAreaHouseholdListingModule {}
