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
  Header,
  Res,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import { SurveyEnumerationAreaHouseholdListingService } from './survey-enumeration-area-household-listing.service';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from './dto/update-survey-enumeration-area-household-listing.dto';
import { CreateBlankHouseholdListingsDto } from './dto/create-blank-household-listings.dto';
import { CurrentHouseholdListingResponseDto } from './dto/current-household-listing-response.dto';
import { HouseholdListingStatisticsResponseDto } from './dto/household-listing-statistics-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { PaginationQueryDto } from '../../../common/utils/pagination.util';

@Controller('survey-enumeration-area-household-listing')
export class SurveyEnumerationAreaHouseholdListingController {
  constructor(
    private readonly surveyEnumerationAreaHouseholdListingService: SurveyEnumerationAreaHouseholdListingService,
  ) {}

  /**
   * Create a new household listing
   * @access Supervisor, Enumerator
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  create(
    @Body()
    createDto: CreateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.create(createDto);
  }

  /**
   * Bulk create household listings
   * @access Supervisor, Enumerator
   */
  @Post('bulk')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  bulkCreate(
    @Body() listings: CreateSurveyEnumerationAreaHouseholdListingDto[],
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.bulkCreate(
      listings,
    );
  }

  /**
   * Create blank household listing entries for historical surveys
   * Creates placeholder entries with sequential serial numbers
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @param dto - DTO containing count and optional remarks
   * @access Admin, Supervisor
   */
  @Post('by-survey-ea/:surveyEnumerationAreaId/create-blank')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.CREATED)
  createBlankHouseholdListings(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Body() dto: CreateBlankHouseholdListingsDto,
    @Request() req,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.createBlankHouseholdListings(
      surveyEnumerationAreaId,
      dto,
      req.user?.id,
    );
  }

  /**
   * Generate CSV template for household listing submission
   * @access All authenticated users
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID to pre-populate
   */
  @Get('template/csv/:surveyEnumerationAreaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="household_listing_template.csv"',
  )
  async getCSVTemplate(
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
    @Res() res: Response,
  ) {
    const template =
      await this.surveyEnumerationAreaHouseholdListingService.generateCSVTemplate(
        +surveyEnumerationAreaId,
      );
    res.send(template);
  }

  /**
   * Get current household listings for an enumeration area
   * Returns the most recent validated household listing data
   * @param enumerationAreaId - Enumeration Area ID
   * @access All authenticated users
   */
  @Get('current/enumeration-area/:enumerationAreaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  getCurrentHouseholdListings(
    @Param('enumerationAreaId') enumerationAreaId: string,
  ): Promise<CurrentHouseholdListingResponseDto> {
    return this.surveyEnumerationAreaHouseholdListingService.getCurrentHouseholdListings(
      +enumerationAreaId,
    );
  }

 

  /**
   * Get all household listings for a survey enumeration area (non-paginated)
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Array of household listings for the enumeration area
   * @access All authenticated users
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.OK)
  getBySurveyEnumerationArea(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationArea(
      surveyEnumerationAreaId,
    );
  }

  /**
   * Get statistics for a survey enumeration area
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Household listing statistics for the enumeration area
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.OK)
  getStatistics(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
  ): Promise<HouseholdListingStatisticsResponseDto> {
    return this.surveyEnumerationAreaHouseholdListingService.getStatistics(
      surveyEnumerationAreaId,
    );
  }


  /**
   * Get statistics for an entire survey (across all enumeration areas)
   * @param surveyId - Survey ID
   * @returns Household listing statistics for the entire survey (includes totalEnumerationAreas)
   */
  @Get('by-survey/:surveyId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.OK)
  getStatisticsBySurvey(
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ): Promise<HouseholdListingStatisticsResponseDto> {
    return this.surveyEnumerationAreaHouseholdListingService.getStatisticsBySurvey(
      surveyId,
    );
  }

  /**
   * Get paginated household listings for a survey enumeration area
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @param query - Pagination query parameters (page, limit, sortBy, sortOrder)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: createdAt)
   * @query sortOrder - Sort order: ASC or DESC (default: DESC - latest to oldest)
   * @access All authenticated users
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/paginated')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.OK)
  getBySurveyEnumerationAreaPaginated(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationAreaPaginated(
      surveyEnumerationAreaId,
      query,
    );
  }

 

  /**
   * Get paginated household listings for a survey (across all enumeration areas)
   * @param surveyId - Survey ID
   * @param query - Pagination query parameters (page, limit, sortBy, sortOrder)
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: createdAt)
   * @query sortOrder - Sort order: ASC or DESC (default: DESC - latest to oldest)
   * @access All authenticated users
   */
  @Get('by-survey/:surveyId/paginated')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.OK)
  getBySurveyPaginated(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Query() query: PaginationQueryDto,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyPaginated(
      surveyId,
      query,
    );
  }

  /**
   * Get single household listing by ID
   * @param id
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findOne(@Param('id') id: string) {
    return this.surveyEnumerationAreaHouseholdListingService.findOne(+id);
  }

  /**
   * Update household listing
   * @param id
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.update(
      +id,
      updateDto,
    );
  }

  /**
   * Remove household listing
   * @param id
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.surveyEnumerationAreaHouseholdListingService.remove(+id);
  }

  /**
   * Export all household listings for a survey as ZIP (CSV + metadata TXT)
   * @param surveyId - Survey ID
   * @returns ZIP file containing CSV and metadata TXT
   * @access All authenticated users
   */
  @Get('by-survey/:surveyId/export/zip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  async exportSurveyHouseholdListings(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Res() res: Response,
  ) {
    const zipBuffer = await this.surveyEnumerationAreaHouseholdListingService.generateSurveyExportZIP(
      surveyId,
    );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="household_listings_survey_${surveyId}_${Date.now()}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    });

    res.send(zipBuffer);
  }

  /**
   * Export all household listings for a survey enumeration area as ZIP (CSV + metadata TXT)
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns ZIP file containing CSV and metadata TXT
   * @access All authenticated users
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/export/zip')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  async exportEnumerationAreaHouseholdListings(
    @Param('surveyEnumerationAreaId', ParseIntPipe) surveyEnumerationAreaId: number,
    @Res() res: Response,
  ) {
    const zipBuffer =
      await this.surveyEnumerationAreaHouseholdListingService.generateEnumerationAreaExportZIP(
        surveyEnumerationAreaId,
      );

    res.set({
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="household_listings_ea_${surveyEnumerationAreaId}_${Date.now()}.zip"`,
      'Content-Length': zipBuffer.length.toString(),
    });

    res.send(zipBuffer);
  }
}
