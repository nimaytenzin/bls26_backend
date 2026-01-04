import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsInt,
  IsArray,
  ArrayMinSize,
  IsEmail,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateSingleEnumeratorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  cid: string;

  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  dzongkhagIds: number[];
}

