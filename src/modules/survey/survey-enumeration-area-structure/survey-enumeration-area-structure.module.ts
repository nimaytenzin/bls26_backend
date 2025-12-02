import { Module, forwardRef } from '@nestjs/common';
import { SurveyEnumerationAreaStructureService } from './survey-enumeration-area-structure.service';
import { SurveyEnumerationAreaStructureController } from './survey-enumeration-area-structure.controller';
import { surveyEnumerationAreaStructureProviders } from './survey-enumeration-area-structure.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SurveyEnumerationAreaHouseholdListingModule } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.module';

@Module({
  imports: [DatabaseModule, forwardRef(() => SurveyEnumerationAreaHouseholdListingModule)],
  controllers: [SurveyEnumerationAreaStructureController],
  providers: [
    SurveyEnumerationAreaStructureService,
    ...surveyEnumerationAreaStructureProviders,
  ],
  exports: [SurveyEnumerationAreaStructureService],
})
export class SurveyEnumerationAreaStructureModule {}

