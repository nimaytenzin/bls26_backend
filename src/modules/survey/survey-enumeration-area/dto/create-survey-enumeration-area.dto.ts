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

export class SubmitSurveyEnumerationAreaDto {
  @IsInt()
  submittedBy: number;
}

export class ValidateSurveyEnumerationAreaDto {
  @IsInt()
  validatedBy: number;

  @IsBoolean()
  isApproved: boolean;

  @IsOptional()
  @IsString()
  comments?: string;
}
