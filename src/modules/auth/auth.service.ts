import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { User, UserRole } from './entities/user.entity';
import { SupervisorDzongkhag } from './entities/supervisor-dzongkhag.entity';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { instanceToPlain } from 'class-transformer';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    @Inject('SUPERVISOR_DZONGKHAG_REPOSITORY')
    private readonly supervisorDzongkhagRepository: typeof SupervisorDzongkhag,
    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto) {
    // Check if user already exists
    const existingUserByCid = await this.userRepository.findOne({
      where: { cid: registerDto.cid },
    });

    if (existingUserByCid) {
      throw new ConflictException('User with this CID already exists');
    }

    const existingUserByEmail = await this.userRepository.findOne({
      where: { emailAddress: registerDto.emailAddress },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user
    const user = await this.userRepository.create({
      ...instanceToPlain(registerDto),
      password: hashedPassword,
    });

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async login(loginDto: LoginDto) {
    // Find user by email
    const user = await this.userRepository.findOne({
      where: { emailAddress: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const token = this.generateToken(user);

    // Remove password from response
    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      user: userWithoutPassword,
      token,
    };
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto) {
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetPasswordDto.token)
      .digest('hex');

    const user = await this.userRepository.findOne({
      where: {
        resetPasswordToken: hashedToken,
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;

    await user.save();

    return {
      message: 'Password has been reset successfully',
    };
  }

  async changePassword(userId: number, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    // Update password
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password changed successfully',
    };
  }

  async validateUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  async getUserById(userId: number) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { password, ...userWithoutPassword } = user.toJSON();
    return userWithoutPassword;
  }

  private generateToken(user: User): string {
    const payload = {
      sub: user.id,
      cid: user.cid,
      email: user.emailAddress,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  // ============ USER MANAGEMENT METHODS ============

  /**
   * Get all users with optional role filter
   */
  async getAllUsers(role?: UserRole): Promise<Omit<User, 'password'>[]> {
    const whereClause = role ? { role } : {};

    const users = await this.userRepository.findAll({
      where: whereClause,
      order: [['name', 'ASC']],
    });

    return users.map((user) => {
      const { password, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    });
  }

  /**
   * Get users by specific role
   */
  async getUsersByRole(role: UserRole): Promise<Omit<User, 'password'>[]> {
    const users = await this.userRepository.findAll({
      where: { role },
      order: [['name', 'ASC']],
    });

    return users.map((user) => {
      const { password, ...userWithoutPassword } = user.toJSON();
      return userWithoutPassword;
    });
  }

  /**
   * Get all supervisors with their assigned dzongkhags
   */
  async getAllSupervisorsWithDzongkhags() {
    const supervisors = await this.userRepository.findAll({
      where: { role: UserRole.SUPERVISOR },
      include: [
        {
          model: Dzongkhag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'areaCode', 'areaSqKm'],
        },
      ],
      order: [['name', 'ASC']],
    });

    return supervisors.map((supervisor) => {
      const { password, ...supervisorData } = supervisor.toJSON();
      return supervisorData;
    });
  }

  /**
   * Create user with specific role
   */
  async createUserWithRole(registerDto: RegisterDto, role: UserRole) {
    // Check if user already exists
    const existingUserByCid = await this.userRepository.findOne({
      where: { cid: registerDto.cid },
    });

    if (existingUserByCid) {
      throw new ConflictException('User with this CID already exists');
    }

    const existingUserByEmail = await this.userRepository.findOne({
      where: { emailAddress: registerDto.emailAddress },
    });

    if (existingUserByEmail) {
      throw new ConflictException('User with this email already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Create user with specified role
    const user = await this.userRepository.create({
      ...instanceToPlain(registerDto),
      password: hashedPassword,
      role: role,
    });

    // Remove password from response
    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      user: userWithoutPassword,
      message: `${role} created successfully`,
    };
  }

  /**
   * Update user (with role-based permissions)
   */
  async updateUser(
    userId: number,
    updateData: Partial<RegisterDto>,
    requestorRole: UserRole,
  ) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    // Role-based permission check
    if (requestorRole === UserRole.SUPERVISOR) {
      // Supervisors can only update Enumerators
      if (user.role !== UserRole.ENUMERATOR) {
        throw new ForbiddenException('Supervisors can only update Enumerators');
      }
    }

    // Don't allow role changes through this endpoint
    const { role, password, ...safeUpdateData } = updateData;

    // If password is being updated, hash it
    if (password) {
      safeUpdateData['password'] = await bcrypt.hash(password, 10);
    }

    await user.update(safeUpdateData);

    const { password: _, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      message: 'User updated successfully',
    };
  }

  /**
   * Delete user (Admin only)
   */
  async deleteUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    await user.destroy();

    return {
      message: 'User deleted successfully',
    };
  }

  // ============ DZONGKHAG ASSIGNMENT METHODS ============

  /**
   * Assign dzongkhags to a supervisor
   */
  async assignDzongkhags(supervisorId: number, dzongkhagIds: number[]) {
    // Verify supervisor exists and has supervisor role
    const supervisor = await this.userRepository.findByPk(supervisorId);

    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    if (supervisor.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('User is not a supervisor');
    }

    // Create assignments (will skip duplicates)
    const assignments = [];
    for (const dzongkhagId of dzongkhagIds) {
      const existing = await this.supervisorDzongkhagRepository.findOne({
        where: {
          supervisorId,
          dzongkhagId,
        },
      });

      if (!existing) {
        const assignment = await this.supervisorDzongkhagRepository.create({
          supervisorId,
          dzongkhagId,
        });
        assignments.push(assignment);
      }
    }

    return {
      message: `Assigned ${assignments.length} dzongkhag(s) to supervisor`,
      assigned: assignments,
    };
  }

  /**
   * Remove dzongkhag assignments from a supervisor
   */
  async removeDzongkhags(supervisorId: number, dzongkhagIds: number[]) {
    // Verify supervisor exists
    const supervisor = await this.userRepository.findByPk(supervisorId);

    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    if (supervisor.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('User is not a supervisor');
    }

    // Remove assignments
    const removed = await this.supervisorDzongkhagRepository.destroy({
      where: {
        supervisorId,
        dzongkhagId: dzongkhagIds,
      },
    });

    return {
      message: `Removed ${removed} dzongkhag assignment(s) from supervisor`,
      removedCount: removed,
    };
  }

  /**
   * Get all dzongkhags assigned to a supervisor
   */
  async getSupervisorDzongkhags(supervisorId: number) {
    // Verify supervisor exists
    const supervisor = await this.userRepository.findByPk(supervisorId, {
      include: [
        {
          model: Dzongkhag,
          through: { attributes: [] },
        },
      ],
    });

    if (!supervisor) {
      throw new NotFoundException('Supervisor not found');
    }

    if (supervisor.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('User is not a supervisor');
    }

    return supervisor.dzongkhags;
  }

  /**
   * Get all supervisors for a specific dzongkhag
   */
  async getDzongkhagSupervisors(dzongkhagId: number) {
    const supervisors = await this.supervisorDzongkhagRepository.findAll({
      where: { dzongkhagId },
      include: [
        {
          model: User,
          as: 'supervisor',
          attributes: [
            'id',
            'name',
            'cid',
            'emailAddress',
            'phoneNumber',
            'role',
          ],
        },
      ],
    });

    return supervisors.map((assignment) => assignment.supervisor);
  }
}
