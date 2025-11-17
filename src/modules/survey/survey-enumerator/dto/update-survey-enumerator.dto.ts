import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyEnumeratorDto } from './create-survey-enumerator.dto';

export class UpdateSurveyEnumeratorDto extends PartialType(CreateSurveyEnumeratorDto) {}
