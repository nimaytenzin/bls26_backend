import { Module } from '@nestjs/common';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import { SurveyEnumerationAreaController } from './survey-enumeration-area.controller';
import { SurveyEnumerationAreaSupervisorController } from './survey-enumeration-area-supervisor.controller';
import { surveyEnumerationAreaProviders } from './survey-enumeration-area.provider';
import { DatabaseModule } from '../../../database/database.module';
import { EAAnnualStatsModule } from '../../annual statistics/ea-annual-statistics/ea-annual-stats.module';
import { DzongkhagAnnualStatsModule } from '../../annual statistics/dzongkhag-annual-statistics/dzongkhag-annual-stats.module';
import { SurveyEnumerationAreaStructureModule } from '../survey-enumeration-area-structure/survey-enumeration-area-structure.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [
    DatabaseModule,
    EAAnnualStatsModule,
    DzongkhagAnnualStatsModule,
    SurveyEnumerationAreaStructureModule,
    AuthModule,
  ],
  controllers: [
    SurveyEnumerationAreaController,
    SurveyEnumerationAreaSupervisorController,
  ],
  providers: [SurveyEnumerationAreaService, ...surveyEnumerationAreaProviders],
  exports: [SurveyEnumerationAreaService],
})
export class SurveyEnumerationAreaModule {}
