import { Module } from '@nestjs/common';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { surveyProviders } from './survey.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SurveyEnumerationAreaHouseholdListingModule } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.module';

@Module({
  imports: [DatabaseModule, SurveyEnumerationAreaHouseholdListingModule],
  controllers: [SurveyController],
  providers: [SurveyService, ...surveyProviders],
  exports: [SurveyService],
})
export class SurveyModule {}
