import { SamplingMethod } from '../entities/survey-sampling-config.entity';

export class RunSamplingResponseDto {
  success: boolean;
  message: string;
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: SamplingMethod;
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date;
  };
}

