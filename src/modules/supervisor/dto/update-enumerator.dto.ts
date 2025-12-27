import { IsString, IsEmail, IsOptional, IsInt, IsPositive } from 'class-validator';

export class UpdateEnumeratorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  surveyId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  dzongkhagId?: number;
}

