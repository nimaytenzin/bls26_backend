import { SurveyEnumerationAreaHouseholdListing } from './entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationAreaStructure } from '../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';
import { SurveyEnumerationAreaSampling } from '../../sampling/entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from '../../sampling/entities/survey-enumeration-area-household-sample.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';

export const surveyEnumerationAreaHouseholdListingProviders = [
  {
    provide: 'SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdListing,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
    useValue: SurveyEnumerationArea,
  },
  {
    provide: 'SURVEY_REPOSITORY',
    useValue: Survey,
  },
  {
    provide: 'ENUMERATION_AREA_REPOSITORY',
    useValue: EnumerationArea,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_STRUCTURE_REPOSITORY',
    useValue: SurveyEnumerationAreaStructure,
  },
  {
    provide: 'SURVEY_EA_SAMPLING_REPOSITORY',
    useValue: SurveyEnumerationAreaSampling,
  },
  {
    provide: 'SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdSample,
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
    provide: 'DZONGKHAG_REPOSITORY',
    useValue: Dzongkhag,
  },
];
