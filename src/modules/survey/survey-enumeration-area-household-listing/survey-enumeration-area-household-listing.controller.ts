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
} from '@nestjs/common';
import { Response } from 'express';
import { SurveyEnumerationAreaHouseholdListingService } from './survey-enumeration-area-household-listing.service';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from './dto/update-survey-enumeration-area-household-listing.dto';
import { CurrentHouseholdListingResponseDto } from './dto/current-household-listing-response.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

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
  // @UseGuards(JwtAuthGuard, RolesGuard)
  // @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  getCurrentHouseholdListings(
    @Param('enumerationAreaId') enumerationAreaId: string,
  ): Promise<CurrentHouseholdListingResponseDto> {
    return this.surveyEnumerationAreaHouseholdListingService.getCurrentHouseholdListings(
      +enumerationAreaId,
    );
  }

  /**
   * Get all household listings with optional filters
   * @query surveyEnumerationAreaId - Filter by survey enumeration area
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findAll(@Query('surveyEnumerationAreaId') surveyEnumerationAreaId?: string) {
    return this.surveyEnumerationAreaHouseholdListingService.findAll(
      surveyEnumerationAreaId ? +surveyEnumerationAreaId : undefined,
    );
  }

  /**
   * Get household listings by survey enumeration area
   * @param surveyEnumerationAreaId
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findBySurveyEnumerationArea(
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
  ) {
    console.log('HI');
    return this.surveyEnumerationAreaHouseholdListingService.findBySurveyEnumerationArea(
      +surveyEnumerationAreaId,
    );
  }

  /**
   * Get all household listings for a survey (across all enumeration areas)
   * @param surveyId
   */
  @Get('by-survey/:surveyId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findBySurvey(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaHouseholdListingService.findBySurvey(
      +surveyId,
    );
  }

  /**
   * Get statistics for a survey enumeration area
   * @param surveyEnumerationAreaId
   */
  @Get('by-survey-ea/:surveyEnumerationAreaId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  getStatistics(
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
  ) {
    return this.surveyEnumerationAreaHouseholdListingService.getStatistics(
      +surveyEnumerationAreaId,
    );
  }

  /**
   * Get statistics for an entire survey (across all enumeration areas)
   * @param surveyId
   */
  @Get('by-survey/:surveyId/statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  getStatisticsBySurvey(@Param('surveyId') surveyId: string) {
    return this.surveyEnumerationAreaHouseholdListingService.getStatisticsBySurvey(
      +surveyId,
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
}
