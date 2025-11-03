import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { AdministrativeZoneType } from '../entities/administrative-zone.entity';

export class CreateAdministrativeZoneGeoJsonDto {
  @IsNotEmpty()
  @IsObject()
  properties: {
    dzongkhagId: number;
    name: string;
    areaCode: string;
    areaSqKm: number;
    type: AdministrativeZoneType;
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
