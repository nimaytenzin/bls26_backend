import { Module } from '@nestjs/common';
import { StructureService } from './structure.service';
import { StructureController } from './structure.controller';
import { Structure } from './entities/structure.entity';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';

@Module({
  controllers: [StructureController],
  providers: [
    StructureService,
    {
      provide: 'STRUCTURE_REPOSITORY',
      useValue: Structure,
    },
  ],
  exports: [StructureService, 'STRUCTURE_REPOSITORY'],
})
export class StructureModule {}
