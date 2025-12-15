import { IsNotEmpty, IsString, IsOptional, IsNumber, ValidateIf } from 'class-validator';

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
  @ValidateIf((o) => o.areaSqKm !== null && o.areaSqKm !== undefined)
  @IsNumber({}, { message: 'areaSqKm must be a number' })
  areaSqKm?: number | null;

  @IsNotEmpty()
  @IsString()
  geom: string;
}
