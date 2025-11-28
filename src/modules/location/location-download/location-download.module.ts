import { Module } from '@nestjs/common';
import { LocationDownloadService } from './location-download.service';
import { LocationDownloadController } from './location-download.controller';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { SubAdministrativeZoneModule } from '../sub-administrative-zone/sub-administrative-zone.module';
import { AdministrativeZoneModule } from '../administrative-zone/administrative-zone.module';
import { DzongkhagModule } from '../dzongkhag/dzongkhag.module';

@Module({
  imports: [
    EnumerationAreaModule,
    SubAdministrativeZoneModule,
    AdministrativeZoneModule,
    DzongkhagModule,
  ],
  controllers: [LocationDownloadController],
  providers: [LocationDownloadService],
  exports: [LocationDownloadService],
})
export class LocationDownloadModule {}

