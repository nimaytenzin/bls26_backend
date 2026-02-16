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
import { SurveyEnumerationAreaStructureModule } from './modules/survey/survey-enumeration-area-structure/survey-enumeration-area-structure.module';
import { SurveyEnumeratorModule } from './modules/survey/survey-enumerator/survey-enumerator.module';
import { EnumeratorRoutesModule } from './modules/enumerator-routes/enumerator-routes.module';
import { EAAnnualStatsModule } from './modules/annual statistics/ea-annual-statistics/ea-annual-stats.module';
import { SAZAnnualStatsModule } from './modules/annual statistics/sub-administrative-zone-annual-statistics/saz-annual-stats.module';
import { AZAnnualStatsModule } from './modules/annual statistics/administrative-zone-annual-statistics/az-annual-stats.module';
import { DzongkhagAnnualStatsModule } from './modules/annual statistics/dzongkhag-annual-statistics/dzongkhag-annual-stats.module';
import { SamplingModule } from './modules/sampling/sampling.module';
import { LocationDownloadModule } from './modules/location/location-download/location-download.module';
import { PublicApiModule } from './modules/public-api/public-api.module';
import { AnnualStatisticsDownloadModule } from './modules/annual statistics/annual-statistics-download/annual-statistics-download.module';
import { PublicPageSettingsModule } from './modules/public-page-settings/public-page-settings.module';
import { EnumerationAreaSubAdministrativeZone } from './modules/location/enumeration-area/entities/enumeration-area-sub-administrative-zone.entity';
import { EnumerationAreaLineage } from './modules/location/enumeration-area/entities/enumeration-area-lineage.entity';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

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
    SurveyEnumerationAreaStructureModule,
    SurveyEnumerationAreaHouseholdListingModule,
    SurveyEnumeratorModule,
    EnumeratorRoutesModule,
    EAAnnualStatsModule,
    SAZAnnualStatsModule,
    AZAnnualStatsModule,
    DzongkhagAnnualStatsModule,
    SamplingModule,
    LocationDownloadModule,
    PublicApiModule,
    AnnualStatisticsDownloadModule,
    PublicPageSettingsModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  },],

})
export class AppModule {}
