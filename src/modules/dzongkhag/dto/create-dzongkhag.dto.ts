import { IsNotEmpty, IsString } from 'class-validator';

export class CreateDzongkhagDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  areaCode: string;
}
