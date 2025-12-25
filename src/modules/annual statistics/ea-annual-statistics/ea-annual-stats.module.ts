import { Module, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EAAnnualStatsController } from './ea-annual-stats.controller';
import { EAAnnualStatsService } from './ea-annual-stats.service';
import { eaAnnualStatsProviders } from './ea-annual-stats.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SAZAnnualStatsModule } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.module';
import { AZAnnualStatsModule } from '../administrative-zone-annual-statistics/az-annual-stats.module';
import { DzongkhagAnnualStatsModule } from '../dzongkhag-annual-statistics/dzongkhag-annual-stats.module';

@Module({
  imports: [
    DatabaseModule,
    ScheduleModule.forRoot(),
    SAZAnnualStatsModule,
    AZAnnualStatsModule,
    forwardRef(() => DzongkhagAnnualStatsModule),
  ],
  controllers: [EAAnnualStatsController],
  providers: [EAAnnualStatsService, ...eaAnnualStatsProviders],
  exports: [EAAnnualStatsService],
})
export class EAAnnualStatsModule {}
