import { Module } from '@nestjs/common';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import { SurveyEnumerationAreaController } from './survey-enumeration-area.controller';
import { surveyEnumerationAreaProviders } from './survey-enumeration-area.provider';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SurveyEnumerationAreaController],
  providers: [SurveyEnumerationAreaService, ...surveyEnumerationAreaProviders],
  exports: [SurveyEnumerationAreaService],
})
export class SurveyEnumerationAreaModule {}
