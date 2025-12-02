import { IsInt, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateSurveyEnumerationAreaDto {
  @IsInt()
  surveyId: number;

  @IsInt()
  enumerationAreaId: number;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class CompleteEnumerationDto {
  @IsInt()
  enumeratedBy: number;
}
