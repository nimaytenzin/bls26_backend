import { IsInt, IsNotEmpty } from 'class-validator';

export class CreateSurveyEnumeratorDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  surveyId: number;
}
