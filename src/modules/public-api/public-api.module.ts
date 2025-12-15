import { Module } from '@nestjs/common';
import { PublicApiController } from './public-api.controller';
import { PublicApiService } from './public-api.service';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone } from '../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { DzongkhagAnnualStats } from '../annual statistics/dzongkhag-annual-statistics/entities/dzongkhag-annual-stats.entity';
import { AZAnnualStats } from '../annual statistics/administrative-zone-annual-statistics/entities/az-annual-stats.entity';
import { SAZAnnualStats } from '../annual statistics/sub-administrative-zone-annual-statistics/entities/saz-annual-stats.entity';
import { EAAnnualStats } from '../annual statistics/ea-annual-statistics/entities/ea-annual-stats.entity';

@Module({
  controllers: [PublicApiController],
  providers: [
    PublicApiService,
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
    {
      provide: 'SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY',
      useValue: SurveyEnumerationAreaHouseholdListing,
    },
    {
      provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
      useValue: SurveyEnumerationArea,
    },
    {
      provide: 'DZONGKHAG_ANNUAL_STATS_REPOSITORY',
      useValue: DzongkhagAnnualStats,
    },
    {
      provide: 'AZ_ANNUAL_STATS_REPOSITORY',
      useValue: AZAnnualStats,
    },
    {
      provide: 'SAZ_ANNUAL_STATS_REPOSITORY',
      useValue: SAZAnnualStats,
    },
    {
      provide: 'EA_ANNUAL_STATS_REPOSITORY',
      useValue: EAAnnualStats,
    },
  ],
  exports: [PublicApiService],
})
export class PublicApiModule {}

