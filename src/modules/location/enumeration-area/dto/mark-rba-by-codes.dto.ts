import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO to mark an EA as RBA using geographic codes.
 * Example: { dzongkhagCode: "2", administrativeZoneCode: "61", subAdministrativeZoneCode: "4", eaCode: "1" }
 */
export class MarkRbaByCodesDto {
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
