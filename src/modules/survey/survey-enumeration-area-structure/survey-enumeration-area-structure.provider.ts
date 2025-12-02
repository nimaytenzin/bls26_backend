import { SurveyEnumerationAreaStructure } from './entities/survey-enumeration-area-structure.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

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
];

