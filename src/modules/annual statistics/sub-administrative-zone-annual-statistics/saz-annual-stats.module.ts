import { Module } from '@nestjs/common';
import { SAZAnnualStatsController } from './saz-annual-stats.controller';
import { SAZAnnualStatsService } from './saz-annual-stats.service';
import { sazAnnualStatsProviders } from './saz-annual-stats.provider';
import { DatabaseModule } from '../../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SAZAnnualStatsController],
  providers: [SAZAnnualStatsService, ...sazAnnualStatsProviders],
  exports: [SAZAnnualStatsService],
})
export class SAZAnnualStatsModule {}
