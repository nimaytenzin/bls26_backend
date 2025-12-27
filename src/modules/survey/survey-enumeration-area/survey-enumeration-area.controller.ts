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
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import { SurveyEnumerationAreaStructureService } from '../survey-enumeration-area-structure/survey-enumeration-area-structure.service';
import {
  CreateSurveyEnumerationAreaDto,
  CompleteEnumerationDto,
} from './dto/create-survey-enumeration-area.dto';
import {
  PublishSurveyEnumerationAreaDto,
  BulkPublishDto,
} from './dto/publish-survey-enumeration-area.dto';
import { UpdateSurveyEnumerationAreaDto } from './dto/update-survey-enumeration-area.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('survey-enumeration-area')
export class SurveyEnumerationAreaController {
  constructor(
    private readonly surveyEnumerationAreaService: SurveyEnumerationAreaService,
    private readonly structureService: SurveyEnumerationAreaStructureService,
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
   * @query isEnumerated - Filter by enumeration status (true/false)
   * @query isSampled - Filter by sampling status (true/false)
   * @query isPublished - Filter by publishing status (true/false)
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findAll(
    @Query('surveyId') surveyId?: string,
    @Query('enumerationAreaId') enumerationAreaId?: string,
    @Query('isEnumerated') isEnumerated?: string,
    @Query('isSampled') isSampled?: string,
    @Query('isPublished') isPublished?: string,
  ) {
    return this.surveyEnumerationAreaService.findAll(
      surveyId ? +surveyId : undefined,
      enumerationAreaId ? +enumerationAreaId : undefined,
      isEnumerated !== undefined ? isEnumerated === 'true' : undefined,
      isSampled !== undefined ? isSampled === 'true' : undefined,
      isPublished !== undefined ? isPublished === 'true' : undefined,
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
   * Get submission statistics for a survey (backward compatibility)
   * @param surveyId
   */
  @Get('by-survey/:surveyId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  getStatistics(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.getSubmissionStatistics(+surveyId);
  }

  /**
   * Get enumeration areas that are enumerated and ready for sampling
   * @param surveyId
   */
  @Get('by-survey/:surveyId/enumerated-for-sampling')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERVISOR)
  getEnumeratedForSampling(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.getEnumeratedForSampling(+surveyId);
  }

  /**
   * Get enumeration areas that are sampled and ready for publishing
   * @param surveyId
   */
  @Get('by-survey/:surveyId/ready-for-publishing')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getReadyForPublishing(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.getReadyForPublishing(+surveyId);
  }

  /**
   * Get sampling status and progress for a survey
   * @param surveyId
   */
  @Get('by-survey/:surveyId/sampling-status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  getSamplingStatus(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaService.getSamplingStatus(+surveyId);
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
   * Complete enumeration for a survey enumeration area (Enumerator only)
   * @param id - Survey Enumeration Area ID
   */
  @Post(':id/complete-enumeration')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ENUMERATOR)
  completeEnumeration(
    @Param('id') id: string,
    @Body() completeDto: CompleteEnumerationDto,
  ) {
    return this.surveyEnumerationAreaService.completeEnumeration(+id, completeDto);
  }

  /**
   * Publish sampled data for a survey enumeration area (Admin only)
   * @param id - Survey Enumeration Area ID
   */
  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  publishData(
    @Param('id') id: string,
    @Body() publishDto: PublishSurveyEnumerationAreaDto,
  ) {
    return this.surveyEnumerationAreaService.publishData(+id, publishDto);
  }

  /**
   * Bulk publish sampled data for multiple enumeration areas (Admin only)
   */
  @Post('bulk-publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  bulkPublish(@Body() bulkPublishDto: BulkPublishDto) {
    return this.surveyEnumerationAreaService.bulkPublish(bulkPublishDto);
  }

  /**
   * Get structures for a specific survey enumeration area
   * @access Admin, Supervisor, Enumerator
   */
  @Get('survey-ea/structures/:seaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findBySurveyEnumerationAreaStructures(@Param('seaId', ParseIntPipe) seaId: number) {
    return this.structureService.findBySurveyEnumerationArea(seaId);
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
   * Template includes: Dzongkhag Code, Gewog/Thromde Code, Chiwog/Lap Code, Enumeration Code
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
   * Bulk match enumeration areas from CSV file (for survey creation workflow)
   * Validates and matches enumeration areas from CSV without requiring a survey ID.
   * Returns matched enumeration areas with full hierarchy information.
   * CSV should contain: Dzongkhag Code, Admin Zone Code, Sub Admin Zone Code, Enumeration Code
   * @param file - CSV file
   * @returns Match result with matched enumeration areas and errors
   * @access Admin only
   */
  @Post('bulk-match')
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
  async bulkMatchFromCSV(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse the CSV file
      const csvContent = file.buffer.toString('utf-8');
      const result = await this.surveyEnumerationAreaService.bulkMatchFromCSV(
        csvContent,
      );

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process CSV file: ${error.message}`,
      );
    }
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
