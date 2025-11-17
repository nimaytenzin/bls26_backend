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
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
