import { IsOptional, IsNumber, IsString } from 'class-validator';

export class UpdateBuildingDto {
  @IsOptional()
  @IsNumber()
  structureId?: number;

  @IsOptional()
  @IsNumber()
  enumerationAreaId?: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  geom?: string;
}
