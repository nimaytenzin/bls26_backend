import { Module } from '@nestjs/common';
import { TownService } from './town.service';
import { TownController } from './town.controller';
import { Town } from './entities/town.entity';

@Module({
  controllers: [TownController],
  providers: [
    TownService,
    {
      provide: 'TOWN_REPOSITORY',
      useValue: Town,
    },
  ],
  exports: [TownService, 'TOWN_REPOSITORY'],
})
export class TownModule {}
