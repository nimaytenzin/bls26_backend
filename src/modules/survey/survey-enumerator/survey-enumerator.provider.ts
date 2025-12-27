import { SurveyEnumerator } from './entities/survey-enumerator.entity';
import { User } from 'src/modules/auth/entities/user.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';

export const surveyEnumeratorProviders = [
  {
    provide: 'SURVEY_ENUMERATOR_REPOSITORY',
    useValue: SurveyEnumerator,
  },
  {
    provide: 'USER_REPOSITORY',
    useValue: User,
  },
  {
    provide: 'DZONGKHAG_REPOSITORY',
    useValue: Dzongkhag,
  },
];
