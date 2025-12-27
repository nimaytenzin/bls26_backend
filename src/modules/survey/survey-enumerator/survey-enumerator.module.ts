import { Module } from '@nestjs/common';
import { SurveyEnumeratorService } from './survey-enumerator.service';
import { SurveyEnumeratorController } from './survey-enumerator.controller';
import { SurveyEnumeratorSupervisorController } from './survey-enumerator-supervisor.controller';
import { surveyEnumeratorProviders } from './survey-enumerator.provider';
import { DatabaseModule } from 'src/database/database.module';
import { AuthModule } from '../../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    SurveyEnumeratorController,
    SurveyEnumeratorSupervisorController,
  ],
  providers: [SurveyEnumeratorService, ...surveyEnumeratorProviders],
  exports: [SurveyEnumeratorService],
})
export class SurveyEnumeratorModule {}
