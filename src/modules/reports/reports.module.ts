import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DzongkhagModule } from '../location/dzongkhag/dzongkhag.module';

@Module({
  imports: [DzongkhagModule],
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
