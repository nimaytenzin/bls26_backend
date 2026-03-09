import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { EnumerationAreaStatus } from '../enums/enumeration-area-status.enum';

export class CreateEnumerationAreaDto {
  @IsOptional()
  @IsNumber()
  dzongkhagId?: number;

  @IsOptional()
  @IsNumber()
  lapId?: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsOptional()
  @IsString()
  fullEaCode?: string;

  @IsOptional()
  @IsEnum(EnumerationAreaStatus)
  status?: EnumerationAreaStatus;

  @IsOptional()
  @IsString()
  geom?: string;

}
