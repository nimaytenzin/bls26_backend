import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';

export class CreateEnumerationAreaGeoJsonDto {
  @IsNotEmpty()
  @IsObject()
  properties: {
    subAdministrativeZoneId: number;
    name: string;
    areaCode: string;
    description: string;
    areaSqKm: number;
  };

  @IsNotEmpty()
  @IsObject()
  geometry: {
    type: string;
    coordinates: any;
  };

  @IsNotEmpty()
  type?: string;
}
