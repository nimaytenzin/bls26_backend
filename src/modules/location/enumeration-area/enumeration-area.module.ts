import { Module } from '@nestjs/common';
import { EnumerationAreaService } from './enumeration-area.service';
import { EnumerationAreaController } from './enumeration-area.controller';
import { EnumerationArea } from './entities/enumeration-area.entity';

@Module({
  controllers: [EnumerationAreaController],
  providers: [
    EnumerationAreaService,
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
  ],
  exports: [EnumerationAreaService],
})
export class EnumerationAreaModule {}
