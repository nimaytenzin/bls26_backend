import { Module } from '@nestjs/common';
import { AdministrativeZoneService } from './administrative-zone.service';
import { AdministrativeZoneController } from './administrative-zone.controller';
import { AdministrativeZone } from './entities/administrative-zone.entity';

@Module({
  controllers: [AdministrativeZoneController],
  providers: [
    AdministrativeZoneService,
    {
      provide: 'ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: AdministrativeZone,
    },
  ],
  exports: [AdministrativeZoneService],
})
export class AdministrativeZoneModule {}
