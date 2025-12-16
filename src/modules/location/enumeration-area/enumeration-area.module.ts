import { Module } from '@nestjs/common';
import { EnumerationAreaService } from './enumeration-area.service';
import { EnumerationAreaController } from './enumeration-area.controller';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { EnumerationAreaSubAdministrativeZone } from './entities/enumeration-area-sub-administrative-zone.entity';

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
  ],
  exports: [EnumerationAreaService],
})
export class EnumerationAreaModule {}
