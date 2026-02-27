import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { DzongkhagModule } from '../dzongkhag/dzongkhag.module';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { StructureModule } from '../structure/structure.module';
import { HouseholdListingModule } from '../household-listing/household-listing.module';

@Module({
  imports: [
    DzongkhagModule,
    EnumerationAreaModule,
    StructureModule,
    HouseholdListingModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
