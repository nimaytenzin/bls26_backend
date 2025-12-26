import { Module } from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { BuildingsController } from './buildings.controller';
import { Building } from './entities/building.entity';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [BuildingsController],
  providers: [
    BuildingsService,
    {
      provide: 'BUILDING_REPOSITORY',
      useValue: Building,
    },
  ],
  exports: [BuildingsService],
})
export class BuildingsModule {}
