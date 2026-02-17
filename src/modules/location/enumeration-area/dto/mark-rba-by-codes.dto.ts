import { IsNotEmpty, IsString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateEnumerationAreaDto } from './create-enumeration-area.dto';

/**
 * Geographic code part used to identify a single EA.
 * Example: { dzongkhagCode: "2", administrativeZoneCode: "61", subAdministrativeZoneCode: "4", eaCode: "1" }
 */
export class EaGeoCodesDto {
  @IsNotEmpty()
  @IsString()
  dzongkhagCode: string;

  @IsNotEmpty()
  @IsString()
  administrativeZoneCode: string;

  @IsNotEmpty()
  @IsString()
  subAdministrativeZoneCode: string;

  @IsNotEmpty()
  @IsString()
  eaCode: string;
}

/**
 * DTO to mark an EA as RBA using geographic codes.
 */
export class MarkRbaByCodesDto extends EaGeoCodesDto {}

/**
 * DTO to update an EA using geographic codes instead of ID.
 * Combines the geo-code locator with a partial EA payload.
 */
export class UpdateEaByCodesDto extends PartialType(CreateEnumerationAreaDto) {
  @IsNotEmpty()
  @IsString()
  dzongkhagCode: string;

  @IsNotEmpty()
  @IsString()
  administrativeZoneCode: string;

  @IsNotEmpty()
  @IsString()
  subAdministrativeZoneCode: string;

  @IsNotEmpty()
  @IsString()
  eaCode: string;
}
