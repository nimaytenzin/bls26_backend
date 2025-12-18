import { Module } from '@nestjs/common';
import { DzongkhagEaSummaryController } from './dzongkhag-ea-summary.controller';
import { DzongkhagEaSummaryService } from './dzongkhag-ea-summary.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { DzongkhagModule } from '../../location/dzongkhag/dzongkhag.module';
import { AdministrativeZoneModule } from '../../location/administrative-zone/administrative-zone.module';
import { SubAdministrativeZoneModule } from '../../location/sub-administrative-zone/sub-administrative-zone.module';
import { EnumerationAreaModule } from '../../location/enumeration-area/enumeration-area.module';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';

@Module({
  imports: [
    DzongkhagModule,
    AdministrativeZoneModule,
    SubAdministrativeZoneModule,
    EnumerationAreaModule,
  ],
  controllers: [DzongkhagEaSummaryController],
  providers: [
    DzongkhagEaSummaryService,
    PdfGeneratorService,
    ExcelGeneratorService,
    {
      provide: 'DZONGKHAG_REPOSITORY',
      useValue: Dzongkhag,
    },
    {
      provide: 'ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: AdministrativeZone,
    },
    {
      provide: 'SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: SubAdministrativeZone,
    },
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
  ],
  exports: [
    DzongkhagEaSummaryService,
    PdfGeneratorService,
    ExcelGeneratorService,
  ],
})
export class DzongkhagEaSummaryModule {}
