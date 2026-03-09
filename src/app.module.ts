import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { DzongkhagModule } from './modules/dzongkhag/dzongkhag.module';
import { TownModule } from './modules/town/town.module';
import { LapModule } from './modules/lap/lap.module';
import { EnumerationAreaModule } from './modules/enumeration-area/enumeration-area.module';
import { SeedModule } from './modules/seed/seed.module';
import { StructureModule } from './modules/structure/structure.module';
import { HouseholdListingModule } from './modules/household-listing/household-listing.module';
import { ValidateModule } from './modules/validate/validate.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    DzongkhagModule,
    TownModule,
    LapModule,
    EnumerationAreaModule,
    SeedModule,
    StructureModule,
    HouseholdListingModule,
    ValidateModule,
    DashboardModule,
    StatisticsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
