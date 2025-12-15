import { IsNotEmpty, IsString, IsOptional, IsNumber } from 'class-validator';

export class CreateEnumerationAreaDto {
  @IsNotEmpty()
  @IsNumber()
  subAdministrativeZoneId: number;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsOptional()
  @IsNumber()
  areaSqKm: number;

  @IsNotEmpty()
  @IsString()
  geom: string;
}
