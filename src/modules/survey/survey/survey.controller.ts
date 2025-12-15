import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  Request,
} from '@nestjs/common';
import { SurveyService } from './survey.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveyStatisticsResponseDto } from './dto/survey-statistics-response.dto';
import { SurveyEnumerationHierarchyDto } from './dto/survey-enumeration-hierarchy-response.dto';
import { BulkHouseholdUploadDto } from './dto/bulk-household-upload.dto';
import { BulkHouseholdUploadResponseDto } from './dto/bulk-household-upload-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

@Controller('survey')
export class SurveyController {
  constructor(private readonly surveyService: SurveyService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createSurveyDto: CreateSurveyDto) {
    return this.surveyService.create(createSurveyDto);
  }

  /**
   * Bulk upload household counts for multiple EA-survey combinations
   * Creates SurveyEnumerationArea if it doesn't exist and creates dummy household listings
   * @access Admin
   * @param dto - Bulk upload DTO containing items with enumerationAreaId, surveyId, and householdCount
   * @param req - Request object to get user ID
   * @returns Summary of created/skipped items and errors
   *
   * @example
   * POST /survey/auto-household-upload
   * Body: {
   *   "items": [
   *     {
   *       "enumerationAreaId": 1,
   *       "surveyId": 1,
   *       "householdCount": 25
   *     }
   *   ]
   * }
   */
  @Post('auto-household-upload')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async bulkUploadHouseholdCounts(
    @Body() dto: BulkHouseholdUploadDto,
    @Request() req,
  ): Promise<BulkHouseholdUploadResponseDto> {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    return this.surveyService.bulkUploadHouseholdCounts(dto, userId);
  }

  @Get()
  async findAll() {
    return this.surveyService.findAll();
  }

  /**
   * Get all active surveys (no pagination)
   * Returns all surveys with status ACTIVE
   *
   * @returns Array of active surveys
   *
   * @example
   * GET /survey/active
   */
  @Get('active')
  async findAllActive() {
    return this.surveyService.findAllActive();
  }

  /**
   * Get paginated surveys
   * Supports pagination, sorting, and filtering
   *
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: 'startDate')
   * @query sortOrder - Sort order: ASC or DESC (default: DESC)
   *
   * @returns Paginated response with surveys and metadata
   *
   * @example
   * GET /survey/paginated
   * GET /survey/paginated?page=2&limit=20
   * GET /survey/paginated?page=1&limit=10&sortBy=name&sortOrder=ASC
   */
  @Get('paginated')
  async findAllPaginated(@Query() query: PaginationQueryDto) {
    return this.surveyService.findAllPaginated(query);
  }

  @Get(':id/supervisors')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSupervisorsForSurvey(@Param('id') id: string) {
    return this.surveyService.getSupervisorsForSurvey(+id);
  }

  @Get(':id/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSurveyStatistics(
    @Param('id') id: string,
  ): Promise<SurveyStatisticsResponseDto> {
    return this.surveyService.getSurveyStatistics(+id);
  }

  @Get(':id/enumeration-hierarchy')
  async getSurveyEnumerationHierarchy(
    @Param('id') id: string,
  ): Promise<SurveyEnumerationHierarchyDto> {
    return this.surveyService.getSurveyEnumerationHierarchy(+id);
  }

  @Get('supervisor/:supervisorId/active')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getActiveSurveysForSupervisor(
    @Param('supervisorId') supervisorId: string,
  ) {
    return this.surveyService.getActiveSurveysForSupervisor(+supervisorId);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.surveyService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateSurveyDto: UpdateSurveyDto,
  ) {
    return this.surveyService.update(+id, updateSurveyDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.surveyService.remove(+id);
  }

  @Post(':id/enumeration-areas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async addEnumerationAreas(
    @Param('id') id: string,
    @Body() body: { enumerationAreaIds: number[] },
  ) {
    return this.surveyService.addEnumerationAreas(+id, body.enumerationAreaIds);
  }

  @Delete(':id/enumeration-areas')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async removeEnumerationAreas(
    @Param('id') id: string,
    @Body() body: { enumerationAreaIds: number[] },
  ) {
    return this.surveyService.removeEnumerationAreas(
      +id,
      body.enumerationAreaIds,
    );
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: 'ACTIVE' | 'ENDED' },
  ) {
    return this.surveyService.updateStatus(+id, body.status as any);
  }
}
