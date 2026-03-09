import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { User, UserRole } from './entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateEnumeratorItemDto } from './dto/create-enumerator-item.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    const existingUserByCid = await this.userRepository.findOne({
      where: { cid: registerDto.cid },
    });
    if (existingUserByCid) {
      throw new ConflictException('User with this CID already exists');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = await this.userRepository.create({
      name: registerDto.name,
      cid: registerDto.cid,
      phoneNumber: registerDto.phoneNumber ?? null,
      password: hashedPassword,
      role: registerDto.role ?? UserRole.ENUMERATOR,
    });

    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { cid: loginDto.cid },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is deactivated. Please contact administrator.',
      );
    }
    if (loginDto.role && user.role !== loginDto.role) {
      throw new UnauthorizedException(
        `Access denied. This login is for ${loginDto.role.toLowerCase()}s only.`,
      );
    }
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const token = this.generateToken(user);
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      token,
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    return { message: 'Password changed successfully' };
  }

  async updateOwnProfile(userId: number, updateData: UpdateProfileDto) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateFields: Partial<{ name: string; phoneNumber: string | null }> =
      {};
    if (updateData.name !== undefined) updateFields.name = updateData.name;
    if (updateData.phoneNumber !== undefined)
      updateFields.phoneNumber = updateData.phoneNumber;
    await user.update(updateFields);
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      message: 'Profile updated successfully',
    };
  }

  /**
   * Admin reset password for any user (set to the provided new password).
   */
  async adminResetPassword(userId: number, newPassword: string) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      message: 'Password has been reset successfully',
      user: userWithoutPassword,
    };
  }

  async validateUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) return null;
    if (!user.isActive) {
      throw new UnauthorizedException(
        'Account is deactivated. Please contact administrator.',
      );
    }
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  private generateToken(user: User): string {
    return this.jwtService.sign({
      sub: user.id,
      cid: user.cid,
      role: user.role,
    });
  }

  // ============ USER MANAGEMENT ============

  async getAllUsers(role?: UserRole) {
    const where = role ? { role } : {};
    const users = await this.userRepository.findAll({
      where,
      order: [['name', 'ASC']],
    });
    return users.map((u) => {
      const { password, ...rest } = u.toJSON();
      return rest;
    });
  }

  async getUsersByRole(role: UserRole) {
    return this.getAllUsers(role);
  }

  /**
   * Create a single user (admin or enumerator) by admin.
   */
  async createUserWithRole(
    dto: { name: string; cid: string; phoneNumber?: string; password: string },
    role: UserRole,
  ) {
    const existingByCid = await this.userRepository.findOne({
      where: { cid: dto.cid },
    });
    if (existingByCid) {
      throw new ConflictException('User with this CID already exists');
    }
    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const user = await this.userRepository.create({
      name: dto.name,
      cid: dto.cid,
      phoneNumber: dto.phoneNumber ?? null,
      password: hashedPassword,
      role,
    });
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      message: `${role} created successfully`,
    };
  }

  /**
   * Update user details (admin only).
   */
  async updateUser(userId: number, dto: UpdateUserDto) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const updateFields: Partial<{ name: string; phoneNumber: string | null }> =
      {};
    if (dto.name !== undefined) updateFields.name = dto.name;
    if (dto.phoneNumber !== undefined)
      updateFields.phoneNumber = dto.phoneNumber;
    await user.update(updateFields);
    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      message: 'User updated successfully',
    };
  }

  /**
   * Bulk create enumerators. Returns created users and any errors (e.g. duplicate CID).
   */
  async bulkCreateEnumerators(
    items: CreateEnumeratorItemDto[],
  ): Promise<{
    created: number;
    failed: number;
    users: any[];
    errors: { row: number; cid: string; message: string }[];
  }> {
    const users: any[] = [];
    const errors: { row: number; cid: string; message: string }[] = [];
    const cids = items.map((i) => i.cid);
    const existingCids = new Set(
      cids.length
        ? (
            await this.userRepository.findAll({
              attributes: ['cid'],
              where: { cid: { [Op.in]: cids } },
            })
          ).map((u) => u.cid)
        : [],
    );

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      try {
        if (existingCids.has(item.cid)) {
          errors.push({
            row: i + 1,
            cid: item.cid,
            message: 'CID already exists',
          });
          continue;
        }
        const hashedPassword = await bcrypt.hash(item.password, 10);
        const user = await this.userRepository.create({
          name: item.name,
          cid: item.cid,
          phoneNumber: item.phoneNumber ?? null,
          password: hashedPassword,
          role: UserRole.ENUMERATOR,
        });
        existingCids.add(item.cid);
        const { password, ...rest } = user.toJSON();
        users.push(rest);
      } catch (err: any) {
        errors.push({
          row: i + 1,
          cid: item.cid,
          message: err?.message ?? 'Failed to create user',
        });
      }
    }

    return {
      created: users.length,
      failed: errors.length,
      users,
      errors,
    };
  }

  async deleteUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await user.destroy();
    return { message: 'User deleted successfully' };
  }

  async activateUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (user.isActive) {
      throw new BadRequestException('User is already active');
    }
    user.isActive = true;
    await user.save();
    const { password, ...rest } = user.toJSON();
    return { message: 'User activated successfully', user: rest };
  }

  async deactivateUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    if (!user.isActive) {
      throw new BadRequestException('User is already deactivated');
    }
    user.isActive = false;
    await user.save();
    const { password, ...rest } = user.toJSON();
    return { message: 'User deactivated successfully', user: rest };
  }
}
