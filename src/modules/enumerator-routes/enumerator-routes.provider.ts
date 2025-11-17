import { SurveyEnumerator } from '../survey/survey-enumerator/entities/survey-enumerator.entity';
import { Survey } from '../survey/survey/entities/survey.entity';
import { User } from '../auth/entities/user.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

export const enumeratorRoutesProviders = [
  {
    provide: 'SURVEY_ENUMERATOR_REPOSITORY',
    useValue: SurveyEnumerator,
  },
  {
    provide: 'SURVEY_REPOSITORY',
    useValue: Survey,
  },
  {
    provide: 'USER_REPOSITORY',
    useValue: User,
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
