import { IsArray, IsInt, IsOptional, IsPositive, IsEnum, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { SamplingMethod } from '../../sampling/entities/survey-sampling-config.entity';

export class BulkRunSamplingDto {
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  surveyEnumerationAreaIds: number[];

  @IsOptional()
  @IsEnum(SamplingMethod)
  method?: SamplingMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  randomStart?: number;
}

