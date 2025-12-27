import { IsInt, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateSurveyEnumeratorDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  @IsInt()
  @IsOptional()
  dzongkhagId?: number;
}
