import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateLapDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsNotEmpty()
  @IsNumber()
  townId: number;
}
