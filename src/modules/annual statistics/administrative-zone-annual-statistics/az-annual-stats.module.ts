import { Module } from '@nestjs/common';
import { AZAnnualStatsController } from './az-annual-stats.controller';
import { AZAnnualStatsService } from './az-annual-stats.service';
import { azAnnualStatsProviders } from './az-annual-stats.provider';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AZAnnualStatsController],
  providers: [AZAnnualStatsService, ...azAnnualStatsProviders],
  exports: [AZAnnualStatsService],
})
export class AZAnnualStatsModule {}
