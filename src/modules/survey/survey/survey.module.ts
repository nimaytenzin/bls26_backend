import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { SurveySchedulerService } from './survey-scheduler.service';
import { surveyProviders } from './survey.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SurveyEnumerationAreaHouseholdListingModule } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.module';

@Module({
  imports: [
    DatabaseModule,
    SurveyEnumerationAreaHouseholdListingModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [SurveyController],
  providers: [SurveyService, SurveySchedulerService, ...surveyProviders],
  exports: [SurveyService],
})
export class SurveyModule {}
