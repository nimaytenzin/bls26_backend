import { Module } from '@nestjs/common';
import { GeographicStatisticalCodeController } from './geographic-statistical-code.controller';
import { GeographicStatisticalCodeService } from './geographic-statistical-code.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';
import { DzongkhagModule } from '../../location/dzongkhag/dzongkhag.module';
import { EnumerationAreaModule } from '../../location/enumeration-area/enumeration-area.module';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';

@Module({
  imports: [DzongkhagModule, EnumerationAreaModule],
  controllers: [GeographicStatisticalCodeController],
  providers: [
    GeographicStatisticalCodeService,
    PdfGeneratorService,
    ExcelGeneratorService,
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
    {
      provide: 'SUB_ADMINISTRATIVE_ZONE_REPOSITORY',
      useValue: SubAdministrativeZone,
    },
  ],
  exports: [
    GeographicStatisticalCodeService,
    PdfGeneratorService,
    ExcelGeneratorService,
  ],
})
export class GeographicStatisticalCodeModule {}

