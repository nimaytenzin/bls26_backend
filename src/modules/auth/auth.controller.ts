import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  Query,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { AssignDzongkhagDto } from './dto/assign-dzongkhag.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req) {
    return this.authService.getUserById(req.user.id);
  }

  /**
   * Update own profile
   * @access Protected - All authenticated users
   * @route PATCH /auth/profile
   */
  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateOwnProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateOwnProfile(req.user.id, updateProfileDto);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async signout() {
    // JWT tokens are stateless, so signout is handled client-side
    // by removing the token from storage
    return {
      message: 'Signed out successfully',
    };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOnly() {
    return { message: 'This is an admin-only endpoint' };
  }

  // ============ USER MANAGEMENT ROUTES (Admin/Supervisor) ============

  /**
   * Get all users (Admin/Supervisor only)
   * @access Protected - Admin, Supervisor
   * @query role - Optional filter by user role
   */
  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getAllUsers(@Query('role') role?: string) {
    return this.authService.getAllUsers(role as UserRole);
  }

  /**
   * Get all supervisors (Admin only)
   * @access Protected - Admin only
   */
  @Get('supervisors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllSupervisors() {
    return this.authService.getUsersByRole(UserRole.SUPERVISOR);
  }

  /**
   * Get all supervisors with their assigned dzongkhags (Admin only)
   * @access Protected - Admin only
   */
  @Get('supervisors/with-dzongkhags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllSupervisorsWithDzongkhags() {
    return this.authService.getAllSupervisorsWithDzongkhags();
  }

  /**
   * Get all admins (Admin only)
   * @access Protected - Admin only
   */
  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllAdmins() {
    return this.authService.getUsersByRole(UserRole.ADMIN);
  }

  /**
   * Get all enumerators (Admin/Supervisor only)
   * @access Protected - Admin, Supervisor
   */
  @Get('enumerators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getAllEnumerators() {
    return this.authService.getUsersByRole(UserRole.ENUMERATOR);
  }

  /**
   * Create a new admin (Admin only)
   * @access Protected - Admin only
   */
  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAdmin(@Body() registerDto: RegisterDto) {
    return this.authService.createUserWithRole(
      registerDto,
      UserRole.ADMIN,
    );
  }

  /**
   * Create a new admin (Alternative endpoint for signup)
   * @access Protected - Admin only
   */
  @Post('admin/signup')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminSignup(@Body() registerDto: RegisterDto) {
    return this.authService.createUserWithRole(
      registerDto,
      UserRole.ADMIN,
    );
  }

  /**
   * Create a new supervisor (Admin only)
   * @access Protected - Admin only
   */
  @Post('supervisors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createSupervisor(@Body() registerDto: RegisterDto) {
    return this.authService.createUserWithRole(
      registerDto,
      UserRole.SUPERVISOR,
    );
  }

  /**
   * Create a new enumerator (Admin/Supervisor only)
   * @access Protected - Admin, Supervisor
   */
  @Post('enumerators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async createEnumerator(@Body() registerDto: RegisterDto) {
    return this.authService.createUserWithRole(
      registerDto,
      UserRole.ENUMERATOR,
    );
  }

  /**
   * Get single user by ID (Admin/Supervisor only)
   * @access Protected - Admin, Supervisor
   */
  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(+id);
  }

  /**
   * Get comprehensive user profile with all assignments
   * Returns user details with role-specific data:
   * - Supervisors: includes dzongkhag assignments
   * - Enumerators: includes survey assignments (all and active)
   * - Admins: basic profile only
   * @access Protected - Admin, Supervisor, Enumerator (own profile)
   */
  @Get('users/:id/profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  async getUserProfileWithAssignments(
    @Param('id') id: string,
    @Request() req,
  ) {
    const userId = +id;
    const requestorId = req.user.id;
    const requestorRole = req.user.role;

    // Enumerators can only view their own profile
    if (requestorRole === UserRole.ENUMERATOR && userId !== requestorId) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return this.authService.getUserProfileWithAssignments(userId);
  }

  /**
   * Update user (Admin only, or Supervisor for Enumerators)
   * @access Protected - Admin, Supervisor (limited)
   */
  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<RegisterDto>,
    @Request() req,
  ) {
    return this.authService.updateUser(+id, updateData, req.user.role);
  }

  /**
   * Admin reset password for any user
   * @access Protected - Admin only
   */
  @Patch('users/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminResetPassword(
    @Param('id') id: string,
    @Body() adminResetPasswordDto: AdminResetPasswordDto,
  ) {
    return this.authService.adminResetPassword(
      +id,
      adminResetPasswordDto.newPassword,
    );
  }

  /**
   * Admin reset password for any user (alternative route)
   * @access Protected - Admin only
   */
  @Patch('admin/users/:id/reset-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async adminResetPasswordAlt(
    @Param('id') id: string,
    @Body() adminResetPasswordDto: AdminResetPasswordDto,
  ) {
    return this.authService.adminResetPassword(
      +id,
      adminResetPasswordDto.newPassword,
    );
  }

  /**
   * Delete user (Admin only)
   * @access Protected - Admin only
   */
  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(+id);
  }

  // ============ DZONGKHAG ASSIGNMENT ROUTES ============

  /**
   * Assign dzongkhags to a supervisor
   * @access Protected - Admin only
   */
  @Post('supervisors/:id/dzongkhags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignDzongkhags(
    @Param('id') supervisorId: string,
    @Body() assignDzongkhagDto: AssignDzongkhagDto,
  ) {
    return this.authService.assignDzongkhags(
      +supervisorId,
      assignDzongkhagDto.dzongkhagIds,
    );
  }

  /**
   * Remove dzongkhag assignments from a supervisor
   * @access Protected - Admin only
   */
  @Delete('supervisors/:id/dzongkhags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeDzongkhags(
    @Param('id') supervisorId: string,
    @Body() assignDzongkhagDto: AssignDzongkhagDto,
  ) {
    return this.authService.removeDzongkhags(
      +supervisorId,
      assignDzongkhagDto.dzongkhagIds,
    );
  }

  /**
   * Get all dzongkhags assigned to a supervisor
   * @access Protected - Admin, Supervisor
   */
  @Get('supervisors/:id/dzongkhags')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSupervisorDzongkhags(@Param('id') supervisorId: string) {
    return this.authService.getSupervisorDzongkhags(+supervisorId);
  }

  /**
   * Get all supervisors assigned to a dzongkhag
   * @access Protected - Admin
   */
  @Get('dzongkhags/:id/supervisors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getDzongkhagSupervisors(@Param('id') dzongkhagId: string) {
    return this.authService.getDzongkhagSupervisors(+dzongkhagId);
  }
}
