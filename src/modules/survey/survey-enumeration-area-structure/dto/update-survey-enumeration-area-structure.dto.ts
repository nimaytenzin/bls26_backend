import { PartialType } from '@nestjs/mapped-types';
import { CreateSurveyEnumerationAreaStructureDto } from './create-survey-enumeration-area-structure.dto';

export class UpdateSurveyEnumerationAreaStructureDto extends PartialType(CreateSurveyEnumerationAreaStructureDto) {}

