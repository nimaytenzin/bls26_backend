import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  Res,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Delete,
  Query,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminResetPasswordDto } from './dto/admin-reset-password.dto';
import { BulkCreateEnumeratorsDto } from './dto/bulk-create-enumerators.dto';
import { UserRole } from './entities/user.entity';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { Public } from './decorators/public.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @Public()
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @Public()
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Request() req: { user: { id: number } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@Request() req: { user: { id: number } }) {
    return this.authService.getUserById(req.user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateOwnProfile(
    @Request() req: { user: { id: number } },
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.authService.updateOwnProfile(req.user.id, updateProfileDto);
  }

  @Post('signout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async signout() {
    return { message: 'Signed out successfully' };
  }

  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async adminOnly() {
    return { message: 'This is an admin-only endpoint' };
  }

  // ============ USER MANAGEMENT (Admin) ============

  @Get('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllUsers(@Query('role') role?: string) {
    return this.authService.getAllUsers(role as UserRole);
  }

  @Get('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllAdmins() {
    return this.authService.getUsersByRole(UserRole.ADMIN);
  }

  @Get('enumerators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getAllEnumerators() {
    return this.authService.getUsersByRole(UserRole.ENUMERATOR);
  }

  /** Create a single user (admin or enumerator). */
  @Post('users')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createUser(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUserWithRole(
      {
        name: createUserDto.name,
        cid: createUserDto.cid,
        phoneNumber: createUserDto.phoneNumber,
        password: createUserDto.password,
      },
      createUserDto.role,
    );
  }

  /** Create a single admin. */
  @Post('admins')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN)
  async createAdmin(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUserWithRole(
      {
        name: createUserDto.name,
        cid: createUserDto.cid,
        phoneNumber: createUserDto.phoneNumber,
        password: createUserDto.password,
      },
      UserRole.ADMIN,
    );
  }

  /** Create a single enumerator. */
  @Post('enumerators')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createEnumerator(@Body() createUserDto: CreateUserDto) {
    return this.authService.createUserWithRole(
      {
        name: createUserDto.name,
        cid: createUserDto.cid,
        phoneNumber: createUserDto.phoneNumber,
        password: createUserDto.password,
      },
      UserRole.ENUMERATOR,
    );
  }

  /** Download CSV template for bulk enumerator upload. Headers: name,cid,phoneNumber,password */
  @Get('enumerators/bulk/template')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getBulkEnumeratorsTemplate(@Res({ passthrough: false }) res: Response) {
    const csv =
      'name,cid,phoneNumber,password\n' +
      'John Doe,10101010101,17123456,minimum6chars\n';
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="enumerators-bulk-template.csv"',
    );
    res.send(csv);
  }

  /** Bulk upload enumerators (CID must be unique; duplicates are skipped with error). */
  @Post('enumerators/bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async bulkCreateEnumerators(@Body() body: BulkCreateEnumeratorsDto) {
    return this.authService.bulkCreateEnumerators(body.enumerators);
  }

  /** Bulk upload enumerators from CSV file. CSV must have headers: name,cid,phoneNumber,password */
  @Post('enumerators/bulk/upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async bulkUploadEnumeratorsCsv(
    @UploadedFile() file: { buffer: Buffer } | undefined,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('No file uploaded. Use form field name "file".');
    }
    return this.authService.parseCsvAndBulkCreateEnumerators(file.buffer);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getUserById(@Param('id') id: string) {
    return this.authService.getUserById(+id);
  }

  /** Update user details (name, phoneNumber). */
  @Patch('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.authService.updateUser(+id, updateUserDto);
  }

  /** Admin reset password for any user (set to the provided new password). */
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

  @Delete('users/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id') id: string) {
    return this.authService.deleteUser(+id);
  }

  @Patch('users/:id/activate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async activateUser(@Param('id') id: string) {
    return this.authService.activateUser(+id);
  }

  @Patch('users/:id/deactivate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async deactivateUser(@Param('id') id: string) {
    return this.authService.deactivateUser(+id);
  }
}
