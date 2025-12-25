import { Module } from '@nestjs/common';
import { AnnualStatisticsDownloadController } from './annual-statistics-download.controller';
import { AnnualStatisticsDownloadService } from './annual-statistics-download.service';
import { DatabaseModule } from '../../../database/database.module';
import { DzongkhagAnnualStatsModule } from '../dzongkhag-annual-statistics/dzongkhag-annual-stats.module';
import { AZAnnualStatsModule } from '../administrative-zone-annual-statistics/az-annual-stats.module';
import { SAZAnnualStatsModule } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.module';
import { EAAnnualStatsModule } from '../ea-annual-statistics/ea-annual-stats.module';

@Module({
  imports: [
    DatabaseModule,
    DzongkhagAnnualStatsModule,
    AZAnnualStatsModule,
    SAZAnnualStatsModule,
    EAAnnualStatsModule,
  ],
  controllers: [AnnualStatisticsDownloadController],
  providers: [AnnualStatisticsDownloadService],
  exports: [AnnualStatisticsDownloadService],
})
export class AnnualStatisticsDownloadModule {}

