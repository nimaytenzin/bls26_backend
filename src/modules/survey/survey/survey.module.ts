import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { SurveyService } from './survey.service';
import { SurveyController } from './survey.controller';
import { SurveySupervisorController } from './survey-supervisor.controller';
import { SurveySchedulerService } from './survey-scheduler.service';
import { surveyProviders } from './survey.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SurveyEnumerationAreaHouseholdListingModule } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    SurveyEnumerationAreaHouseholdListingModule,
    ScheduleModule.forRoot(),
    AuthModule,
  ],
  controllers: [SurveyController, SurveySupervisorController],
  providers: [SurveyService, SurveySchedulerService, ...surveyProviders],
  exports: [SurveyService],
})
export class SurveyModule {}
