import { Module } from '@nestjs/common';
import { SurveyEnumeratorService } from './survey-enumerator.service';
import { SurveyEnumeratorController } from './survey-enumerator.controller';
import { surveyEnumeratorProviders } from './survey-enumerator.provider';
import { DatabaseModule } from 'src/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SurveyEnumeratorController],
  providers: [SurveyEnumeratorService, ...surveyEnumeratorProviders],
  exports: [SurveyEnumeratorService],
})
export class SurveyEnumeratorModule {}
