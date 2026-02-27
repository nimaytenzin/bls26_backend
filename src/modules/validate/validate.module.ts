import { Module } from '@nestjs/common';
import { ValidateController } from './validate.controller';
import { ValidateService } from './validate.service';
import { EnumerationAreaModule } from '../enumeration-area/enumeration-area.module';
import { StructureModule } from '../structure/structure.module';
import { HouseholdListingModule } from '../household-listing/household-listing.module';

@Module({
  imports: [
    EnumerationAreaModule,
    StructureModule,
    HouseholdListingModule,
  ],
  controllers: [ValidateController],
  providers: [ValidateService],
  exports: [ValidateService],
})
export class ValidateModule {}
