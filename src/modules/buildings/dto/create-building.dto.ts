import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateBuildingDto {
  @IsNotEmpty()
  @IsNumber()
  structureId: number;

  @IsNotEmpty()
  @IsNumber()
  enumerationAreaId: number;

  @IsOptional()
  @IsString()
  source?: string;

  @IsOptional()
  geom?: string;
}
