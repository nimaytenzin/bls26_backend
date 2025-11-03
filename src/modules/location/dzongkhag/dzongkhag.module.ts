import { Module } from '@nestjs/common';
import { DzongkhagService } from './dzongkhag.service';
import { DzongkhagController } from './dzongkhag.controller';
import { Dzongkhag } from './entities/dzongkhag.entity';

@Module({
  controllers: [DzongkhagController],
  providers: [
    DzongkhagService,
    {
      provide: 'DZONGKHAG_REPOSITORY',
      useValue: Dzongkhag,
    },
  ],
  exports: [DzongkhagService],
})
export class DzongkhagModule {}
