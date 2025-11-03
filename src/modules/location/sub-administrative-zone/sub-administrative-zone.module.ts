import { Module } from '@nestjs/common';
import { SubAdministrativeZoneService } from './sub-administrative-zone.service';
import { SubAdministrativeZoneController } from './sub-administrative-zone.controller';
import { SubAdministrativeZone } from './entities/sub-administrative-zone.entity';

@Module({
  controllers: [SubAdministrativeZoneController],
  providers: [
    SubAdministrativeZoneService,
    {
      provide: 'SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: SubAdministrativeZone,
    },
  ],
  exports: [SubAdministrativeZoneService],
})
export class SubAdministrativeZoneModule {}
