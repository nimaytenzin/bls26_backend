import { IsNotEmpty, IsString, IsOptional, IsObject } from 'class-validator';
import { IsValidWGS84GeoJSON } from '../../../validators/geojson.validator';

export class CreateDzongkhagGeoJsonDto {
  @IsNotEmpty()
  @IsObject()
  properties: {
    name: string;
    areaCode: string;
  };

  @IsNotEmpty()
  @IsObject()
  @IsValidWGS84GeoJSON({
    message: 'Geometry must be valid GeoJSON in WGS84 projection (EPSG:4326)',
  })
  geometry: {
    type: string;
    coordinates: any;
  };

  @IsOptional()
  type?: string;
}
