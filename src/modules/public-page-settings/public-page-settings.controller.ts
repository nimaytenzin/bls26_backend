import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PublicPageSettingsService } from './public-page-settings.service';
import { UpdatePublicPageSettingsDto } from './dto/update-public-page-settings.dto';
import { PublicPageSettingsDto } from './dto/public-page-settings.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('public-page-settings')
export class PublicPageSettingsController {
  constructor(
    private readonly publicPageSettingsService: PublicPageSettingsService,
  ) {}

  /**
   * Get public page settings (public endpoint - no authentication required)
   * @access Public
   * @returns PublicPageSettingsDto
   */
  @Get()
  @HttpCode(HttpStatus.OK)
  async getSettings(): Promise<PublicPageSettingsDto> {
    return this.publicPageSettingsService.getSettings();
  }

  /**
   * Get public page settings (admin endpoint)
   * @access Protected - Admin only
   * @returns PublicPageSettingsDto
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async getSettingsAdmin(): Promise<PublicPageSettingsDto> {
    return this.publicPageSettingsService.getSettings();
  }

  /**
   * Update public page settings
   * @access Protected - Admin only
   * @param updateDto - Settings to update
   * @param req - Request object containing authenticated user
   * @returns PublicPageSettingsDto
   */
  @Put('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async updateSettings(
    @Body() updateDto: UpdatePublicPageSettingsDto,
    @Request() req,
  ): Promise<PublicPageSettingsDto> {
    return this.publicPageSettingsService.updateSettings(
      updateDto,
      req.user.id,
    );
  }

  /**
   * Reset public page settings to defaults
   * @access Protected - Admin only
   * @param req - Request object containing authenticated user
   * @returns PublicPageSettingsDto
   */
  @Post('admin/reset')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async resetSettings(@Request() req): Promise<PublicPageSettingsDto> {
    return this.publicPageSettingsService.resetToDefaults(req.user.id);
  }
}

