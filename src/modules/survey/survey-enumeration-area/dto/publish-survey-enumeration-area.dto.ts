import { IsInt, IsOptional, IsString, IsArray } from 'class-validator';

export class PublishSurveyEnumerationAreaDto {
  @IsInt()
  publishedBy: number;

  @IsOptional()
  @IsString()
  comments?: string;
}

export class BulkPublishDto {
  @IsInt()
  surveyId: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  enumerationAreaIds?: number[];

  @IsInt()
  publishedBy: number;
}

