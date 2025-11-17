import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DzongkhagModule } from './modules/location/dzongkhag/dzongkhag.module';
import { AdministrativeZoneModule } from './modules/location/administrative-zone/administrative-zone.module';
import { SubAdministrativeZoneModule } from './modules/location/sub-administrative-zone/sub-administrative-zone.module';
import { EnumerationAreaModule } from './modules/location/enumeration-area/enumeration-area.module';
import { AuthModule } from './modules/auth/auth.module';
import { SurveyModule } from './modules/survey/survey/survey.module';
import { ReportsModule } from './modules/reports/reports.module';
import { BuildingsModule } from './modules/buildings/buildings.module';
import { SurveyEnumerationAreaModule } from './modules/survey/survey-enumeration-area/survey-enumeration-area.module';
import { SurveyEnumerationAreaHouseholdListingModule } from './modules/survey/survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.module';
import { SurveyEnumeratorModule } from './modules/survey/survey-enumerator/survey-enumerator.module';
import { EnumeratorRoutesModule } from './modules/enumerator-routes/enumerator-routes.module';
import { EAAnnualStatsModule } from './modules/annual statistics/ea-annual-statistics/ea-annual-stats.module';
import { SAZAnnualStatsModule } from './modules/annual statistics/sub-administrative-zone-annual-statistics/saz-annual-stats.module';
import { AZAnnualStatsModule } from './modules/annual statistics/administrative-zone-annual-statistics/az-annual-stats.module';
import { DzongkhagAnnualStatsModule } from './modules/annual statistics/dzongkhag-annual-statistics/dzongkhag-annual-stats.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    DzongkhagModule,
    AdministrativeZoneModule,
    SubAdministrativeZoneModule,
    EnumerationAreaModule,
    BuildingsModule,
    SurveyModule,
    ReportsModule,
    SurveyEnumerationAreaModule,
    SurveyEnumerationAreaHouseholdListingModule,
    SurveyEnumeratorModule,
    EnumeratorRoutesModule,
    EAAnnualStatsModule,
    SAZAnnualStatsModule,
    AZAnnualStatsModule,
    DzongkhagAnnualStatsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
