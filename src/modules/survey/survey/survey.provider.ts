import { Survey } from './entities/survey.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerator } from '../survey-enumerator/entities/survey-enumerator.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';

export const surveyProviders = [
  {
    provide: 'SURVEY_REPOSITORY',
    useValue: Survey,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
    useValue: SurveyEnumerationArea,
  },
  {
    provide: 'SURVEY_ENUMERATOR_REPOSITORY',
    useValue: SurveyEnumerator,
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
