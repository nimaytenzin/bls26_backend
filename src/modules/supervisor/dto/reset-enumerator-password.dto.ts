import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetEnumeratorPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}

