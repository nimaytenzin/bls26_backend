import { Injectable } from '@nestjs/common';
import { EnumerationAreaService } from '../enumeration-area/enumeration-area.service';
import { StructureService } from '../structure/structure.service';
import { HouseholdListingService } from '../household-listing/household-listing.service';

@Injectable()
export class ValidateService {
  constructor(
    private readonly enumerationAreaService: EnumerationAreaService,
    private readonly structureService: StructureService,
    private readonly householdListingService: HouseholdListingService,
  ) {}

  async isStructureNumberUnique(
    eaId: number,
    number: string,
  ): Promise<boolean> {
    return this.structureService.isStructureNumberUnique(eaId, number);
  }

  async isHouseholdSerialUnique(
    structureId: number,
    serial: number,
  ): Promise<boolean> {
    return this.householdListingService.isHouseholdSerialUnique(
      structureId,
      serial,
    );
  }

  async checkEaCompletion(eaId: number) {
    return this.enumerationAreaService.checkEaCompletion(eaId);
  }
}
