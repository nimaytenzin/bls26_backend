import { IsNotEmpty, IsString, MinLength, IsOptional } from 'class-validator';

export class CreateEnumeratorItemDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  cid: string;

  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(6)
  password: string;
}
