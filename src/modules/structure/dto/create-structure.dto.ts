import { IsInt, IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateStructureDto {
  @IsInt()
  enumerationAreaId: number;

  @IsString()
  structureNumber: string;

  @IsOptional()
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @IsOptional()
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;
}
