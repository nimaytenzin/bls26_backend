import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
  UseInterceptors,
  UploadedFile,
  Header,
  Res,
  Query,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SurveyEnumerationAreaHouseholdListingService } from './survey-enumeration-area-household-listing.service';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from './dto/update-survey-enumeration-area-household-listing.dto';
import { CreateBlankHouseholdListingsDto } from './dto/create-blank-household-listings.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { BadRequestException } from '@nestjs/common';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

@Controller('supervisor/survey-enumeration-area-household-listing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SurveyEnumerationAreaHouseholdListingSupervisorController {
  constructor(
    private readonly surveyEnumerationAreaHouseholdListingService: SurveyEnumerationAreaHouseholdListingService,
  ) {}

  /**
   * Get paginated household listings for a survey (with access check)
   * Only returns households from enumeration areas the supervisor has access to
   * @param surveyId - Survey ID
   * @param query - Pagination query parameters (page, limit, sortBy, sortOrder)
   * @param req
   */
  @Get('by-survey/:surveyId/paginated')
  findBySurveyPaginated(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Query() query: PaginationQueryDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyPaginatedForSupervisor(
      supervisorId,
      surveyId,
      query,
    );
  }

  /**
   * Get statistics for an entire survey (with access check)
   * Only includes households from enumeration areas the supervisor has access to
   * @param surveyId - Survey ID
   * @param req
   */
  @Get('by-survey/:surveyId/statistics')
  getStatisticsBySurvey(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.getStatisticsBySurveyForSupervisor(
      supervisorId,
      surveyId,
    );
  }

  /**
   * Get paginated household listings by survey enumeration area (with access check)
   * @param surveyEnumerationAreaId
   * @param query
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/paginated')
  findBySurveyEnumerationAreaPaginated(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Query() query: PaginationQueryDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationAreaPaginatedForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
      query,
    );
  }

  /**
   * View household by EA (with access check)
   * @param surveyEnumerationAreaId
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId')
  findBySurveyEnumerationArea(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationAreaForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
    );
  }

  /**
   * View sampled household by EA (with access check)
   * @param surveyEnumerationAreaId
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/sampled')
  findSampledHouseholds(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.findSampledHouseholdsBySurveyEAForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
    );
  }

  /**
   * Edit Household (with access check)
   * @param id
   * @param updateDto
   * @param req
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.updateForSupervisor(
      supervisorId,
      id,
      updateDto,
    );
  }

  /**
   * Create blank entries for their EA (with access check)
   * @param surveyEnumerationAreaId
   * @param dto
   * @param req
   */
  @Post('by-survey-ea/:surveyEnumerationAreaId/create-blank')
  createBlankHouseholdListings(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Body() dto: CreateBlankHouseholdListingsDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.createBlankHouseholdListingsForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
      dto,
    );
  }

  /**
   * Bulk upload household for their EA from CSV (with EA access verification)
   * @param file
   * @param surveyEnumerationAreaId
   * @param req
   */
  @Post('bulk-upload')
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
          cb(
            new BadRequestException(
              'Invalid file type. Only CSV files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  bulkUploadFromCsv(
    @UploadedFile() file: any,
    @Body('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const supervisorId = req.user?.id;
    const seaId = parseInt(surveyEnumerationAreaId, 10);

    if (!seaId || isNaN(seaId)) {
      throw new BadRequestException('surveyEnumerationAreaId is required');
    }

    const csvContent = file.buffer.toString('utf-8');
    return this.surveyEnumerationAreaHouseholdListingService.bulkUploadFromCsvForSupervisor(
      supervisorId,
      seaId,
      csvContent,
    );
  }

  /**
   * Get dedicated template route for bulk upload (with access check)
   * @param surveyEnumerationAreaId
   * @param res
   * @param req
   */
  @Get('template/csv/:surveyEnumerationAreaId')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="household_listing_template.csv"',
  )
  async getCSVTemplate(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Res() res: Response,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;

    // Verify access by trying to get households (which checks access)
    await this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationAreaForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
    );

    const template =
      await this.surveyEnumerationAreaHouseholdListingService.generateCSVTemplate(
        surveyEnumerationAreaId,
      );
    res.send(template);
  }

  /**
   * Download all household list by EA (with access check)
   * @param surveyEnumerationAreaId
   * @param res
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/export/zip')
  async exportHouseholdListings(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Res() res: Response,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    const zipBuffer =
      await this.surveyEnumerationAreaHouseholdListingService.exportHouseholdListingsByEAForSupervisor(
        supervisorId,
        surveyEnumerationAreaId,
      );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="household_listings_ea_${surveyEnumerationAreaId}_${Date.now()}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    });

    res.send(zipBuffer);
  }

  /**
   * Download household listings by EA as CSV (with access check)
   * @param surveyEnumerationAreaId
   * @param res
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/export/csv')
  @Header('Content-Type', 'text/csv')
  async exportHouseholdListingsCSV(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Res() res: Response,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    const csvContent =
      await this.surveyEnumerationAreaHouseholdListingService.generateEnumerationAreaCSVExportForSupervisor(
        supervisorId,
        surveyEnumerationAreaId,
      );
    res.set({
      'Content-Disposition': `attachment; filename="household_listings_ea_${surveyEnumerationAreaId}_${Date.now()}.csv"`,
    });
    res.send(csvContent);
  }

  /**
   * Download household count by EA (with access check)
   * @param surveyEnumerationAreaId
   * @param req
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/export/count')
  exportHouseholdCount(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaHouseholdListingService.exportHouseholdCountByEAForSupervisor(
      supervisorId,
      surveyEnumerationAreaId,
    );
  }

  /**
   * Download household count by EA, gewog/thromde, chiwog/lap, dzongkhag for their dzongkhag (with access check)
   * @param dzongkhagId
   * @param req
   * @param res
   */
  @Get('by-dzongkhag/:dzongkhagId/export/count')
  @Header('Content-Type', 'text/csv')
  async exportHouseholdCountByDzongkhag(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Request() req,
    @Res() res: Response,
  ) {
    const supervisorId = req.user?.id;
    const csvContent =
      await this.surveyEnumerationAreaHouseholdListingService.exportHouseholdCountByDzongkhagForSupervisor(
        supervisorId,
        dzongkhagId,
      );
    res.set({
      'Content-Disposition': `attachment; filename="household_count_by_dzongkhag_${dzongkhagId}_${Date.now()}.csv"`,
    });
    res.send(csvContent);
  }
}

