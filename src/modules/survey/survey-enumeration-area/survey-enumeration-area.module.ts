import { Module } from '@nestjs/common';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import { SurveyEnumerationAreaController } from './survey-enumeration-area.controller';
import { surveyEnumerationAreaProviders } from './survey-enumeration-area.provider';
import { DatabaseModule } from '../../../database/database.module';
import { EAAnnualStatsModule } from '../../annual statistics/ea-annual-statistics/ea-annual-stats.module';
import { DzongkhagAnnualStatsModule } from '../../annual statistics/dzongkhag-annual-statistics/dzongkhag-annual-stats.module';
import { SurveyEnumerationAreaStructureModule } from '../survey-enumeration-area-structure/survey-enumeration-area-structure.module';

@Module({
  imports: [
    DatabaseModule,
    EAAnnualStatsModule,
    DzongkhagAnnualStatsModule,
    SurveyEnumerationAreaStructureModule,
  ],
  controllers: [SurveyEnumerationAreaController],
  providers: [SurveyEnumerationAreaService, ...surveyEnumerationAreaProviders],
  exports: [SurveyEnumerationAreaService],
})
export class SurveyEnumerationAreaModule {}
