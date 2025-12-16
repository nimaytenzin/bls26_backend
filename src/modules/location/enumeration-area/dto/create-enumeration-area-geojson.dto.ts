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
    subAdministrativeZoneIds: number[];  // Array of SAZ IDs (via junction table)
    name: string;
    areaCode: string;
    description: string;
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
