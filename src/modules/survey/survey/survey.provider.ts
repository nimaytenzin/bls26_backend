import { Survey } from './entities/survey.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerator } from '../survey-enumerator/entities/survey-enumerator.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationAreaStructure } from '../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';
import { SurveyEnumerationAreaSampling } from '../../sampling/entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from '../../sampling/entities/survey-enumeration-area-household-sample.entity';
import { SurveySamplingConfig } from '../../sampling/entities/survey-sampling-config.entity';
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
    provide: 'SURVEY_SAMPLING_CONFIG_REPOSITORY',
    useValue: SurveySamplingConfig,
  },
  {
    provide: 'DZONGKHAG_REPOSITORY',
    useValue: Dzongkhag,
  },
];
