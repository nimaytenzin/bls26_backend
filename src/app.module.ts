import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { DzongkhagModule } from './modules/location/dzongkhag/dzongkhag.module';
import { AdministrativeZoneModule } from './modules/location/administrative-zone/administrative-zone.module';
import { SubAdministrativeZoneModule } from './modules/location/sub-administrative-zone/sub-administrative-zone.module';
import { EnumerationAreaModule } from './modules/location/enumeration-area/enumeration-area.module';
import { AuthModule } from './modules/auth/auth.module';
import { CurrentHouseholdListingModule } from './modules/household-listings/current-household-listing/current-household-listing.module';
import { SurveyModule } from './modules/survey/survey/survey.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    DzongkhagModule,
    AdministrativeZoneModule,
    SubAdministrativeZoneModule,
    EnumerationAreaModule,
    CurrentHouseholdListingModule,
    SurveyModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
