import { Inject, Injectable } from '@nestjs/common';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { Structure } from '../structure/entities/structure.entity';
import { HouseholdListing } from '../household-listing/entities/household-listing.entity';

@Injectable()
export class DashboardService {
  constructor(
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof Structure,
    @Inject('HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof HouseholdListing,
  ) {}

  async getSummary(): Promise<{
    totalDzongkhags: number;
    totalEnumerationAreas: number;
    totalStructures: number;
    totalHouseholds: number;
  }> {
    const [totalDzongkhags, totalEnumerationAreas, totalStructures, totalHouseholds] =
      await Promise.all([
        this.dzongkhagRepository.count(),
        this.enumerationAreaRepository.count(),
        this.structureRepository.count(),
        this.householdListingRepository.count(),
      ]);
    return {
      totalDzongkhags,
      totalEnumerationAreas,
      totalStructures,
      totalHouseholds,
    };
  }
}
