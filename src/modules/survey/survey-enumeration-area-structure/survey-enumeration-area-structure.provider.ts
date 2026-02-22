import { SurveyEnumerationAreaStructure } from './entities/survey-enumeration-area-structure.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationAreaHouseholdSample } from '../../sampling/entities/survey-enumeration-area-household-sample.entity';

export const surveyEnumerationAreaStructureProviders = [
  {
    provide: 'SURVEY_ENUMERATION_AREA_STRUCTURE_REPOSITORY',
    useValue: SurveyEnumerationAreaStructure,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
    useValue: SurveyEnumerationArea,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdListing,
  },
  {
    provide: 'SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdSample,
  },
];

