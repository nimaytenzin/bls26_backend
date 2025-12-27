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
import { Op } from 'sequelize';
import { User, UserRole } from './entities/user.entity';
import { SupervisorDzongkhag } from './entities/supervisor-dzongkhag.entity';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { instanceToPlain } from 'class-transformer';
import { SurveyEnumerator } from '../survey/survey-enumerator/entities/survey-enumerator.entity';
import { Survey } from '../survey/survey/entities/survey.entity';

@Injectable()
export class AuthService {
  constructor(
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    @Inject('SUPERVISOR_DZONGKHAG_REPOSITORY')
    private readonly supervisorDzongkhagRepository: typeof SupervisorDzongkhag,
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
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

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Please contact administrator.');
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

  async forgotPassword(forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { emailAddress: forgotPasswordDto.emailAddress },
    });

    if (!user) {
      // Don't reveal if user exists or not for security
      return {
        message:
          'If an account exists with this email, a password reset link has been sent.',
      };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token expiration (1 hour from now)
    const resetExpires = new Date();
    resetExpires.setHours(resetExpires.getHours() + 1);

    // Save token to user
    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = resetExpires;
    await user.save();

    // TODO: Send email with reset token
    // In production, you would send an email with the resetToken
    // For now, we'll return it in the response (remove this in production)
    // Example email: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`

    return {
      message:
        'If an account exists with this email, a password reset link has been sent.',
      // Remove this in production - only for development/testing
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined,
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
        resetPasswordExpires: {
          [Op.gt]: new Date(), // Token not expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(resetPasswordDto.newPassword, 10);

    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;

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

  /**
   * Update own profile (self-service)
   * Users can update their own name, email, and phone number
   */
  async updateOwnProfile(userId: number, updateData: UpdateProfileDto) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check if email is being changed and if it's already taken
    if (updateData.emailAddress && updateData.emailAddress !== user.emailAddress) {
      const existingUser = await this.userRepository.findOne({
        where: {
          emailAddress: updateData.emailAddress,
          id: { [Op.ne]: userId }, // Exclude current user
        },
      });

      if (existingUser) {
        throw new ConflictException('Email address already in use');
      }
    }

    // Only allow updating name, email, and phone number
    const allowedFields = ['name', 'emailAddress', 'phoneNumber'];
    const updateFields: any = {};

    for (const field of allowedFields) {
      if (updateData[field] !== undefined) {
        updateFields[field] = updateData[field];
      }
    }

    await user.update(updateFields);

    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      user: userWithoutPassword,
      message: 'Profile updated successfully',
    };
  }

  /**
   * Admin reset password for any user
   */
  async adminResetPassword(userId: number, newPassword: string) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear any reset tokens
    user.password = hashedPassword;
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    return {
      message: 'Password has been reset successfully',
      user: {
        id: user.id,
        name: user.name,
        emailAddress: user.emailAddress,
        role: user.role,
      },
    };
  }

  async validateUser(userId: number) {
    const user = await this.userRepository.findByPk(userId);

    if (!user) {
      return null;
    }

    // Check if user is active
    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated. Please contact administrator.');
    }

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
          attributes: ['id', 'name', 'areaCode'],
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

  /**
   * Activate user (Admin only)
   */
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

    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      message: 'User activated successfully',
      user: userWithoutPassword,
    };
  }

  /**
   * Deactivate user (Admin only)
   */
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

    const { password, ...userWithoutPassword } = user.toJSON();
    return {
      message: 'User deactivated successfully',
      user: userWithoutPassword,
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
          attributes: ['id', 'name', 'areaCode'],
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

  /**
   * Get comprehensive user profile with all assignments
   * Returns user details with role-specific data:
   * - Supervisors: includes dzongkhag assignments
   * - Enumerators: includes survey assignments (all and active)
   * - Admins: basic profile only
   */
  async getUserProfileWithAssignments(userId: number) {
    const user = await this.userRepository.findByPk(userId, {
      include: [
        {
          model: Dzongkhag,
          through: { attributes: [] },
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const { password, ...userWithoutPassword } = user.toJSON();

    const profile: any = {
      user: userWithoutPassword,
    };

    // Add dzongkhag assignments for supervisors
    if (user.role === UserRole.SUPERVISOR) {
      profile.dzongkhags = user.dzongkhags || [];
    }

    // Add survey assignments for enumerators
    if (user.role === UserRole.ENUMERATOR) {
      const allSurveyAssignments = await this.surveyEnumeratorRepository.findAll({
        where: { userId },
        include: [
          {
            model: Survey,
            attributes: [
              'id',
              'name',
              'description',
              'startDate',
              'endDate',
              'year',
              'status',
              'isFullyValidated',
            ],
          },
        ],
      });

      profile.allSurveys = allSurveyAssignments.map((assignment) => ({
        userId: assignment.userId,
        surveyId: assignment.surveyId,
        survey: assignment.survey,
        assignedAt: assignment.createdAt,
      }));

      // Filter active surveys only
      profile.activeSurveys = allSurveyAssignments
        .filter((assignment) => assignment.survey?.status === 'ACTIVE')
        .map((assignment) => assignment.survey);
    }

    return profile;
  }
}
