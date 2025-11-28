import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
} from 'class-validator';
import { SamplingMethod } from '../entities/survey-sampling-config.entity';

export class RunEnumerationAreaSamplingDto {
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

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}

