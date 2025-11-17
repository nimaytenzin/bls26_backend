import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyEnumerationAreaDto } from './create-survey-enumeration-area.dto';

export class UpdateSurveyEnumerationAreaDto extends PartialType(CreateSurveyEnumerationAreaDto) {}
