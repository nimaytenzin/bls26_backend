import { Module } from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { SamplingController } from './sampling.controller';
import { SamplingSupervisorController } from './sampling-supervisor.controller';
import { DatabaseModule } from 'src/database/database.module';
import { samplingProviders } from './sampling.providers';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [SamplingController, SamplingSupervisorController],
  providers: [SamplingService, ...samplingProviders],
  exports: [SamplingService],
})
export class SamplingModule {}

