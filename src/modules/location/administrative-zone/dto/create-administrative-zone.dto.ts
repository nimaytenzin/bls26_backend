import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { AdministrativeZoneType } from '../entities/administrative-zone.entity';

export class CreateAdministrativeZoneDto {
  @IsNotEmpty()
  @IsNumber()
  dzongkhagId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode?: string;

  @IsNotEmpty()
  @IsEnum(AdministrativeZoneType)
  type: AdministrativeZoneType;

  @IsNotEmpty()
  @IsNumber()
  areaSqKm: number;

  @IsOptional()
  @IsString()
  geom?: string;
}
