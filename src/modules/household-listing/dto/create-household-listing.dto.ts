import { IsInt, IsString, IsOptional, Min } from 'class-validator';

export class CreateHouseholdListingDto {
  @IsInt()
  structureId: number;

  @IsInt()
  userId: number;

  @IsString()
  householdIdentification: string;

  @IsInt()
  @Min(1)
  householdSerialNumber: number;

  @IsString()
  nameOfHOH: string;

  @IsInt()
  @Min(0)
  totalMale: number;

  @IsInt()
  @Min(0)
  totalFemale: number;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}
