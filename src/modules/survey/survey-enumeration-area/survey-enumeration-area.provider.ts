import { SurveyEnumerationArea } from './entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';

export const surveyEnumerationAreaProviders = [
  {
    provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
    useValue: SurveyEnumerationArea,
  },
  {
    provide: 'SURVEY_REPOSITORY',
    useValue: Survey,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdListing,
  },
  {
    provide: 'DZONGKHAG_REPOSITORY',
    useValue: Dzongkhag,
  },
];
