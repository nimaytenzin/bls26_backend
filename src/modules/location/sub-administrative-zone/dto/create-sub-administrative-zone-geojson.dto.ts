import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { SubAdministrativeZoneType } from '../entities/sub-administrative-zone.entity';

export class CreateSubAdministrativeZoneGeoJsonDto {
  @IsNotEmpty()
  @IsObject()
  properties: {
    administrativeZoneId: number;
    name: string;
    areaCode: string;
    areaSqKm: number;
    type: SubAdministrativeZoneType;
  };

  @IsNotEmpty()
  @IsObject()
  geometry: {
    type: string;
    coordinates: any;
  };

  @IsOptional()
  type?: string;
}
