import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsObject,
} from 'class-validator';
import { IsValidWGS84GeoJSON } from '../../../validators/geojson.validator';

export class CreateDzongkhagDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsNotEmpty()
  @IsNumber()
  areaSqKm: number;
}
