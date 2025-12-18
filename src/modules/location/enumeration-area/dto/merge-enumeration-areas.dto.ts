import {
  IsNotEmpty,
  IsArray,
  ArrayMinSize,
  IsNumber,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class MergedEaDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  geom: string;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  subAdministrativeZoneIds: number[];
}

export class MergeEnumerationAreasDto {
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 EAs are required for a merge' })
  @IsNumber({}, { each: true })
  sourceEaIds: number[];

  @IsNotEmpty()
  @ValidateNested()
  @Type(() => MergedEaDto)
  mergedEa: MergedEaDto;

  @IsOptional()
  @IsString()
  reason?: string;
}

