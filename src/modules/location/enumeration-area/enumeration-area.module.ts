import { Module } from '@nestjs/common';
import { EnumerationAreaService } from './enumeration-area.service';
import { EnumerationAreaController } from './enumeration-area.controller';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { EnumerationAreaSubAdministrativeZone } from './entities/enumeration-area-sub-administrative-zone.entity';
import { EnumerationAreaLineage } from './entities/enumeration-area-lineage.entity';
import { SubAdministrativeZone } from '../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';

@Module({
  controllers: [EnumerationAreaController],
  providers: [
    EnumerationAreaService,
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
    {
      provide: 'ENUMERATION_AREA_SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: EnumerationAreaSubAdministrativeZone,
    },
    {
      provide: 'ENUMERATION_AREA_LINEAGE_REPOSITORY',
      useValue: EnumerationAreaLineage,
    },
    {
      provide: 'SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: SubAdministrativeZone,
    },
    {
      provide: 'ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: AdministrativeZone,
    },
  ],
  exports: [EnumerationAreaService],
})
export class EnumerationAreaModule {}
