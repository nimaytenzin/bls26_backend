import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class CreateTownDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;

  @IsNotEmpty()
  @IsNumber()
  dzongkhagId: number;
}
