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
  Header,
  Res,
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
import { Response } from 'express';

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

  @Post('save')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async save(@Body() saveSurveyDto: SaveSurveyDto) {
    return this.surveyService.save(saveSurveyDto);
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
  @Roles(UserRole.ADMIN)
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

  /**
   * Download survey household counts by EA as CSV
   * Includes full geographic hierarchy: Dzongkhag, Gewog/Thromde, Chiwog/LAP, EA
   * @param id - Survey ID
   * @param res - Express response object
   * @access Admin only
   */
  @Get(':id/download/household-counts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'text/csv')
  async downloadSurveyHouseholdCountsCSV(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const csvContent = await this.surveyService.generateSurveyHouseholdCountCSV(+id);
    res.set({
      'Content-Disposition': `attachment; filename="survey_${id}_household_counts_${Date.now()}.csv"`,
    });
    res.send(csvContent);
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
