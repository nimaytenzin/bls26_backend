import { Module } from '@nestjs/common';
import { LapService } from './lap.service';
import { LapController } from './lap.controller';
import { Lap } from './entities/lap.entity';

@Module({
  controllers: [LapController],
  providers: [
    LapService,
    {
      provide: 'LAP_REPOSITORY',
      useValue: Lap,
    },
  ],
  exports: [LapService, 'LAP_REPOSITORY'],
})
export class LapModule {}
