import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { SubAdministrativeZoneType } from '../entities/sub-administrative-zone.entity';

export class CreateSubAdministrativeZoneDto {
  @IsNotEmpty()
  @IsNumber()
  administrativeZoneId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  areaCode?: string;

  @IsNotEmpty()
  @IsNumber()
  areaSqKm: number;

  @IsOptional()
  @IsString()
  geom?: string;

  @IsNotEmpty()
  @IsEnum(SubAdministrativeZoneType)
  type: SubAdministrativeZoneType;
}
