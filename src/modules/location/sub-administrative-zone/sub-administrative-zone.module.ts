import { Module } from '@nestjs/common';
import { SubAdministrativeZoneService } from './sub-administrative-zone.service';
import { SubAdministrativeZoneController } from './sub-administrative-zone.controller';
import { SubAdministrativeZone } from './entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';

@Module({
  controllers: [SubAdministrativeZoneController],
  providers: [
    SubAdministrativeZoneService,
    {
      provide: 'SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: SubAdministrativeZone,
    },
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
    {
      provide: 'ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: AdministrativeZone,
    },
  ],
  exports: [SubAdministrativeZoneService],
})
export class SubAdministrativeZoneModule {}
