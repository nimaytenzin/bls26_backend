import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DzongkhagModule } from '../location/dzongkhag/dzongkhag.module';
import { GeographicStatisticalCodeModule } from './geographic-statistical-code/geographic-statistical-code.module';
import { DzongkhagEaSummaryModule } from './dzongkhag-ea-summary/dzongkhag-ea-summary.module';

@Module({
  imports: [DzongkhagModule, GeographicStatisticalCodeModule, DzongkhagEaSummaryModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
