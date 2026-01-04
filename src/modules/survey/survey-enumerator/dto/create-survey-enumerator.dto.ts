import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSurveyEnumeratorDto {
  @IsInt()
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  // Support both single dzongkhagId (backward compatible) and comma-separated dzongkhagIds
  @IsInt()
  @IsOptional()
  dzongkhagId?: number; // Single dzongkhag (backward compatible)

  @IsString()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  dzongkhagIds?: string; // Comma-separated dzongkhag IDs (e.g., "1,2,3")
}
