import { IsNotEmpty, IsString, IsEnum, IsOptional } from 'class-validator';
import { UserRole } from '../entities/user.entity';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  cid: string;

  @IsNotEmpty()
  @IsString()
  password: string;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
