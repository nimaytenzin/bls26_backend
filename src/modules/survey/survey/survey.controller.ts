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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';
import { SurveyService } from './survey.service';
import { SurveySchedulerService } from './survey-scheduler.service';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SaveSurveyDto } from './dto/save-survey.dto';
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
  constructor(
    private readonly surveyService: SurveyService,
    private readonly surveySchedulerService: SurveySchedulerService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createSurveyDto: CreateSurveyDto) {
    return this.surveyService.create(createSurveyDto);
  }

  /**
   * Save (create or update) a survey
   * If id is provided and the survey exists, it will be updated
   * If id is not provided or the survey doesn't exist, a new survey will be created
   * 
   * @access Protected - Admin only
   * @route POST /survey/save
   * 
   * @param saveSurveyDto - Survey data with optional id field
   *   - id (optional): If provided and exists, updates the survey
   *   - name (required): Survey name
   *   - description (required): Survey description
   *   - startDate (required): Survey start date (ISO date string)
   *   - endDate (required): Survey end date (ISO date string)
   *   - year (required): Survey year
   *   - status (optional): Survey status (ACTIVE | ENDED)
   *   - isSubmitted (optional): Whether survey is submitted
   *   - isVerified (optional): Whether survey is verified
   *   - enumerationAreaIds (optional): Array of enumeration area IDs to associate
   * 
   * @returns Saved survey with enumeration areas included
   * 
   * @throws {UnauthorizedException} If JWT token is missing or invalid (401)
   * @throws {ForbiddenException} If user does not have Admin role (403)
   * @throws {BadRequestException} If request validation fails (400)
   * 
   * @example Create new survey
   * ```json
   * POST /survey/save
   * Body: {
   *   "name": "2024 National Survey",
   *   "description": "Annual national survey",
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-12-31",
   *   "year": 2024,
   *   "status": "ACTIVE",
   *   "enumerationAreaIds": [1, 2, 3]
   * }
   * ```
   * 
   * @example Update existing survey
   * ```json
   * POST /survey/save
   * Body: {
   *   "id": 1,
   *   "name": "2024 National Survey Updated",
   *   "description": "Updated description",
   *   "startDate": "2024-01-01",
   *   "endDate": "2024-12-31",
   *   "year": 2024,
   *   "status": "ACTIVE",
   *   "enumerationAreaIds": [1, 2, 3, 4]
   * }
   * ```
   */
  @Post('save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async save(@Body() saveSurveyDto: SaveSurveyDto) {
    return this.surveyService.save(saveSurveyDto);
  }

  /**
   * Bulk upload household counts for multiple EA-survey combinations
   * 
   * Automatically creates SurveyEnumerationArea records if they don't exist and
   * generates blank household listings based on the specified household counts.
   * 
   * **Important Behavior:**
   * - If data already exists for the same EA-Survey combination, existing household
   *   listings and structures are **deleted and replaced** (not appended)
   * - All uploaded data is automatically **published** (isPublished = true)
   * - This endpoint processes all items even if some fail
   * 
   * @access Admin only
   * @route POST /survey/auto-household-upload
   * 
   * @param dto - Bulk upload DTO containing array of items with:
   *   - enumerationAreaId: number (required, must exist)
   *   - surveyId: number (required, must exist)
   *   - householdCount: number (required, >= 0, 0 will be skipped)
   * @param req - Request object containing authenticated user information
   * 
   * @returns BulkHouseholdUploadResponseDto containing:
   *   - totalItems: Total number of items processed
   *   - created: Number of SurveyEnumerationArea records created
   *   - skipped: Number of items skipped (householdCount = 0)
   *   - householdListingsCreated: Total household listings created
   *   - errors: Array of errors with reason for each failed item
   * 
   * @throws {Error} If user ID is not found in request (500)
   * @throws {UnauthorizedException} If JWT token is missing or invalid (401)
   * @throws {ForbiddenException} If user does not have Admin role (403)
   * @throws {BadRequestException} If request validation fails (400)
   * 
   * @example
   * ```json
   * POST /survey/auto-household-upload
   * Body: {
   *   "items": [
   *     {
   *       "enumerationAreaId": 1,
   *       "surveyId": 1,
   *       "householdCount": 25
   *     },
   *     {
   *       "enumerationAreaId": 2,
   *       "surveyId": 1,
   *       "householdCount": 30
   *     }
   *   ]
   * }
   * ```
   * 
   * @example Response
   * ```json
   * {
   *   "totalItems": 2,
   *   "created": 2,
   *   "skipped": 0,
   *   "householdListingsCreated": 55,
   *   "errors": []
   * }
   * ```
   * 
   * @see {@link BulkHouseholdUploadDto} for request structure
   * @see {@link BulkHouseholdUploadResponseDto} for response structure
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

  /**
   * Bulk upload household counts via CSV (codes-based lookup)
   *
   * CSV headers (tab or comma separated):
   * dzongkhag, dzongkhagCode, adminZone, adminZoneCode, subAdminZone, subAdminZoneCode, ea, eaCode, surveyId1, surveyId2, ...
   *
   * - EA is resolved by codes chain: dzongkhagCode -> adminZoneCode -> subAdminZoneCode -> eaCode
   * - Any column whose header starts with "surveyId" is treated as a survey id; its value is the household count
   * - Existing data for the same EA+survey will be replaced (not appended) and auto-published
   *
   * @access Admin only
   * @route POST /survey/auto-household-upload/csv
   * @form file: CSV file (multipart/form-data)
   */
  @Post('auto-household-upload/csv')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(new BadRequestException('Invalid file type. Only CSV files are allowed.'), false);
        }
      },
    }),
  )
  async bulkUploadHouseholdCountsCsv(
    @UploadedFile() file: any,
    @Request() req,
  ) {
    const userId = req.user?.id;
    if (!userId) {
      throw new Error('User ID not found in request');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.surveyService.bulkUploadHouseholdCountsFromCsv(file.buffer, userId);
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

  /**
   * Manually trigger the cron job to mark expired surveys as ENDED
   * Useful for testing or immediate execution
   * @access Protected - Admin only
   */
  @Post('mark-expired-as-ended')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async manuallyMarkExpiredSurveysAsEnded() {
    return this.surveySchedulerService.manuallyMarkExpiredSurveysAsEnded();
  }
}
