import {
  IsEnum,
  IsInt,
  IsOptional,
  IsPositive,
  Min,
  ValidateIf,
} from 'class-validator';
import { SamplingMethod } from '../entities/survey-sampling-config.entity';

export class UpdateSurveySamplingConfigDto {
  @IsEnum(SamplingMethod)
  defaultMethod: SamplingMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  defaultSampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  urbanSampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  ruralSampleSize?: number;
}

