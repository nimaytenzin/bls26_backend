import { Module } from '@nestjs/common';
import { DzongkhagAnnualStatsController } from './dzongkhag-annual-stats.controller';
import { DzongkhagAnnualStatsService } from './dzongkhag-annual-stats.service';
import { dzongkhagAnnualStatsProviders } from './dzongkhag-annual-stats.provider';
import { DatabaseModule } from '../../../database/database.module';
import { SAZAnnualStatsModule } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.module';
import { AZAnnualStatsModule } from '../administrative-zone-annual-statistics/az-annual-stats.module';
import { EAAnnualStatsModule } from '../ea-annual-statistics/ea-annual-stats.module';

@Module({
  imports: [DatabaseModule, SAZAnnualStatsModule, AZAnnualStatsModule, EAAnnualStatsModule],
  controllers: [DzongkhagAnnualStatsController],
  providers: [DzongkhagAnnualStatsService, ...dzongkhagAnnualStatsProviders],
  exports: [DzongkhagAnnualStatsService],
})
export class DzongkhagAnnualStatsModule {}
