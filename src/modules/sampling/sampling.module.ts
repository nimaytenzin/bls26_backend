import { Module } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { SamplingController } from './sampling.controller';
import { DatabaseModule } from 'src/database/database.module';
import { samplingProviders } from './sampling.providers';

@Module({
  imports: [DatabaseModule],
  controllers: [SamplingController],
  providers: [SamplingService, ...samplingProviders],
  exports: [SamplingService],
})
export class SamplingModule {}

