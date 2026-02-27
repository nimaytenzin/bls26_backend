import { Module } from '@nestjs/common';
import { DzongkhagService } from './dzongkhag.service';
import { DzongkhagController } from './dzongkhag.controller';
import { Dzongkhag } from './entities/dzongkhag.entity';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { StructureModule } from '../structure/structure.module';
import { HouseholdListingModule } from '../household-listing/household-listing.module';

@Module({
  imports: [
    EnumerationAreaModule,
    StructureModule,
    HouseholdListingModule,
  ],
  controllers: [DzongkhagController],
  providers: [
    DzongkhagService,
    {
      provide: 'DZONGKHAG_REPOSITORY',
      useValue: Dzongkhag,
    },
  ],
  exports: [DzongkhagService, 'DZONGKHAG_REPOSITORY'],
})
export class DzongkhagModule {}
