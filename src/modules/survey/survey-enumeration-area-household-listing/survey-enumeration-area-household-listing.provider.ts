import { SurveyEnumerationAreaHouseholdListing } from './entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationAreaStructure } from '../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';

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
];
