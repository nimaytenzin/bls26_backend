import { SurveySamplingConfig } from './entities/survey-sampling-config.entity';
import { SurveyEnumerationAreaSampling } from './entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from './entities/survey-enumeration-area-household-sample.entity';
import { Survey } from '../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';

export const samplingProviders = [
  {
    provide: 'SURVEY_SAMPLING_CONFIG_REPOSITORY',
    useValue: SurveySamplingConfig,
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
    provide: 'SURVEY_REPOSITORY',
    useValue: Survey,
  },
  {
    provide: 'SURVEY_ENUMERATION_AREA_REPOSITORY',
    useValue: SurveyEnumerationArea,
  },
  {
    provide: 'SURVEY_EA_HOUSEHOLD_LISTING_REPOSITORY',
    useValue: SurveyEnumerationAreaHouseholdListing,
  },
  {
    provide: 'DZONGKHAG_REPOSITORY',
    useValue: Dzongkhag,
  },
];

