import {
  IsNotEmpty,
  IsNumber,
  IsArray,
  ArrayMinSize,
  IsString,
  IsOptional,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class NewEaDto {
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

export class SplitEnumerationAreaDto {
  @IsNotEmpty()
  @IsNumber()
  sourceEaId: number;

  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(2, { message: 'At least 2 new EAs are required for a split' })
  @ValidateNested({ each: true })
  @Type(() => NewEaDto)
  newEas: NewEaDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

