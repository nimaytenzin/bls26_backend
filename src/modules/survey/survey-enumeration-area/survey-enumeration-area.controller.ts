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
  UseInterceptors,
  UploadedFile,
  Header,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import {
  CreateSurveyEnumerationAreaDto,
  SubmitSurveyEnumerationAreaDto,
  ValidateSurveyEnumerationAreaDto,
} from './dto/create-survey-enumeration-area.dto';
import { UpdateSurveyEnumerationAreaDto } from './dto/update-survey-enumeration-area.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('survey-enumeration-area')
export class SurveyEnumerationAreaController {
  constructor(
    private readonly surveyEnumerationAreaService: SurveyEnumerationAreaService,
  ) {}

  /**
   * Create a new survey enumeration area assignment
   * @access Admin only
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  create(
    @Body() createSurveyEnumerationAreaDto: CreateSurveyEnumerationAreaDto,
  ) {
    return this.surveyEnumerationAreaService.create(
      createSurveyEnumerationAreaDto,
    );
  }

  /**
   * Get all survey enumeration area assignments with optional filters
   * @query surveyId - Filter by survey
   * @query enumerationAreaId - Filter by enumeration area
   * @query isSubmitted - Filter by submission status (true/false)
   * @query isValidated - Filter by validation status (true/false)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findAll(
    @Query('surveyId') surveyId?: string,
    @Query('enumerationAreaId') enumerationAreaId?: string,
    @Query('isSubmitted') isSubmitted?: string,
    @Query('isValidated') isValidated?: string,
  ) {
    return this.surveyEnumerationAreaService.findAll(
      surveyId ? +surveyId : undefined,
      enumerationAreaId ? +enumerationAreaId : undefined,
      isSubmitted !== undefined ? isSubmitted === 'true' : undefined,
      isValidated !== undefined ? isValidated === 'true' : undefined,
    );
  }

  /**
   * Get survey enumeration areas by survey
   * @param surveyId
   */
  @Get('by-survey/:surveyId')
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findBySurvey(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.findBySurveyWithEnumerationAreas(
      +surveyId,
    );
  }

  /**
   * Get submission statistics for a survey
   * @param surveyId
   */
  @Get('by-survey/:surveyId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  getStatistics(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.getSubmissionStatistics(+surveyId);
  }

  /**
   * Get survey enumeration areas by enumeration area
   * @param enumerationAreaId
   */
  @Get('by-enumeration-area/:enumerationAreaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findByEnumerationArea(@Param('enumerationAreaId') enumerationAreaId: string) {
    return this.surveyEnumerationAreaService.findByEnumerationArea(
      +enumerationAreaId,
    );
  }

  /**
   * Submit data for a survey enumeration area (Supervisor only)
   * @param id - Survey Enumeration Area ID
   */
  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  submitData(
    @Param('id') id: string,
    @Body() submitDto: SubmitSurveyEnumerationAreaDto,
  ) {
    return this.surveyEnumerationAreaService.submitData(+id, submitDto);
  }

  /**
   * Validate submitted data (Admin only)
   * @param id - Survey Enumeration Area ID
   */
  @Post(':id/validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  validateData(
    @Param('id') id: string,
    @Body() validateDto: ValidateSurveyEnumerationAreaDto,
  ) {
    return this.surveyEnumerationAreaService.validateData(+id, validateDto);
  }

  /**
   * Get single survey enumeration area by ID
   * @param id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findOne(@Param('id') id: string) {
    return this.surveyEnumerationAreaService.findOne(+id);
  }

  /**
   * Update survey enumeration area
   * @param id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() updateSurveyEnumerationAreaDto: UpdateSurveyEnumerationAreaDto,
  ) {
    return this.surveyEnumerationAreaService.update(
      +id,
      updateSurveyEnumerationAreaDto,
    );
  }

  /**
   * Remove survey enumeration area assignment
   * @param id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.surveyEnumerationAreaService.remove(+id);
  }

  /**
   * Generate CSV template for bulk upload of enumeration areas
   * Template includes: Dzongkhag Code, Admin Zone Code, Sub Admin Zone Code, Enumeration Code
   * @access Admin only
   */
  @Get('template/csv')

  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="enumeration_area_upload_template.csv"',
  )
  async getCSVTemplate(@Res() res: Response) {
    const template =
      await this.surveyEnumerationAreaService.generateCSVTemplate();
    res.send(template);
  }

  /**
   * Bulk upload enumeration areas from CSV file
   * CSV should contain: Dzongkhag Code, Admin Zone Code, Sub Admin Zone Code, Enumeration Code
   * @param surveyId - Survey ID to assign enumeration areas to
   * @param file - CSV file
   * @access Admin only
   */
  @Post('bulk-upload/:surveyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only .csv files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async bulkUploadFromCSV(
    @Param('surveyId') surveyId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse the CSV file
      const csvContent = file.buffer.toString('utf-8');
      const result = await this.surveyEnumerationAreaService.bulkUploadFromCSV(
        +surveyId,
        csvContent,
      );

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process CSV file: ${error.message}`,
      );
    }
  }
}
