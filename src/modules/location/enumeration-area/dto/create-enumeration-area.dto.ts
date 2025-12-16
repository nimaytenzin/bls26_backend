import { IsNotEmpty, IsString, IsOptional, IsNumber, ValidateIf, IsArray, ArrayMinSize } from 'class-validator';

export class CreateEnumerationAreaDto {
  /**
   * Array of Sub-Administrative Zone IDs (via junction table)
   * At least one SAZ is required
   */
  @IsNotEmpty()
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one Sub-Administrative Zone is required' })
  @IsNumber({}, { each: true })
  subAdministrativeZoneIds: number[];

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsNotEmpty()
  @IsString()
  geom: string;
}
