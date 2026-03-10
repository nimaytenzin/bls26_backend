import { Module } from '@nestjs/common';
import { StatisticsController } from './statistics.controller';
import { StatisticsService } from './statistics.service';
import { AuthModule } from '../auth/auth.module';
import { HouseholdListingModule } from '../household-listing/household-listing.module';
import { DzongkhagModule } from '../dzongkhag/dzongkhag.module';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { StructureModule } from '../structure/structure.module';

@Module({
  imports: [
    AuthModule,
    HouseholdListingModule,
    DzongkhagModule,
    EnumerationAreaModule,
    StructureModule,
  ],
  controllers: [StatisticsController],
  providers: [StatisticsService],
  exports: [StatisticsService],
})
export class StatisticsModule {}
