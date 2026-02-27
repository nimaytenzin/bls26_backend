import { Module } from '@nestjs/common';
import { EnumerationAreaService } from './enumeration-area.service';
import { EnumerationAreaController } from './enumeration-area.controller';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { StructureModule } from '../structure/structure.module';
import { HouseholdListingModule } from '../household-listing/household-listing.module';

@Module({
  imports: [StructureModule, HouseholdListingModule],
  controllers: [EnumerationAreaController],
  providers: [
    EnumerationAreaService,
    {
      provide: 'ENUMERATION_AREA_REPOSITORY',
      useValue: EnumerationArea,
    },
  ],
  exports: [EnumerationAreaService, 'ENUMERATION_AREA_REPOSITORY'],
})
export class EnumerationAreaModule {}
