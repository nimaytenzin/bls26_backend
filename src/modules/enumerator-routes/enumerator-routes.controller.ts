import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { EnumeratorRoutesService } from './enumerator-routes.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from '../survey/survey-enumeration-area-household-listing/dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from '../survey/survey-enumeration-area-household-listing/dto/update-survey-enumeration-area-household-listing.dto';

@Controller('enumerator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EnumeratorRoutesController {
  constructor(
    private readonly enumeratorRoutesService: EnumeratorRoutesService,
  ) {}

  /**
   * Get all active surveys assigned to the authenticated enumerator
   * @access Enumerator only
   */
  @Get('my-surveys')
  @Roles(UserRole.ENUMERATOR)
  async getMySurveys(@Request() req) {
    const enumeratorId = req.user.id;
    return this.enumeratorRoutesService.getActiveSurveysByEnumerator(
      enumeratorId,
    );
  }

  /**
   * Get survey details with enumeration areas for the authenticated enumerator
   * @param surveyId - The ID of the survey
   * @access Enumerator only
   */
  @Get('my-surveys/:surveyId')
  @Roles(UserRole.ENUMERATOR)
  async getSurveyDetails(@Request() req, @Param('surveyId') surveyId: string) {
    const enumeratorId = req.user.id;
    return this.enumeratorRoutesService.getSurveyDetailsWithEnumerationAreas(
      enumeratorId,
      +surveyId,
    );
  }

  /**
   * Get survey submission status with hierarchical enumeration area data
   * Shows submission status, validation status, and household counts grouped by geography
   * @param surveyId - The ID of the survey
   * @access Enumerator only
   */
  @Get('my-surveys/:surveyId/status')
  @Roles(UserRole.ENUMERATOR)
  async getSurveySubmissionStatus(
    @Request() req,
    @Param('surveyId') surveyId: string,
  ) {
    const enumeratorId = req.user.id;
    return this.enumeratorRoutesService.getSurveySubmissionStatus(
      enumeratorId,
      +surveyId,
    );
  }

  /**
   * Get survey enumeration area details by ID
   * @param surveyEnumerationAreaId - The ID of the survey enumeration area
   * @access Enumerator only
   */
  @Get('survey-enumeration-area/:surveyEnumerationAreaId')
  @Roles(UserRole.ENUMERATOR)
  async getSurveyEnumerationAreaDetails(
    @Request() req,
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
  ) {
    const enumeratorId = req.user.id;
    return this.enumeratorRoutesService.getSurveyEnumerationAreaDetails(
      enumeratorId,
      +surveyEnumerationAreaId,
    );
  }

  /**
   * Create a household listing entry
   * @param createDto - Household listing data
   * @access Enumerator, Supervisor, Admin
   */
  @Post('household-listing')
  @Roles(UserRole.ENUMERATOR, UserRole.SUPERVISOR, UserRole.ADMIN)
  async createHouseholdListing(
    @Request() req,
    @Body() createDto: CreateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    const userId = req.user.id;
    return this.enumeratorRoutesService.createHouseholdListing(
      userId,
      createDto,
    );
  }

  /**
   * Get household listings by survey enumeration area
   * @param surveyEnumerationAreaId - The ID of the survey enumeration area
   * @access Enumerator, Supervisor, Admin
   */
  @Get('household-listing/survey-ea/:surveyEnumerationAreaId')
  @Roles(UserRole.ENUMERATOR, UserRole.SUPERVISOR, UserRole.ADMIN)
  async getHouseholdListingsBySurveyEA(
    @Request() req,
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
  ) {
    const userId = req.user.id;
    return this.enumeratorRoutesService.getHouseholdListingsBySurveyEA(
      userId,
      +surveyEnumerationAreaId,
    );
  }

  /**
   * Update a household listing entry
   * @param id - Household listing ID
   * @param updateDto - Updated household listing data
   * @access Enumerator, Supervisor, Admin
   */
  @Patch('household-listing/:id')
  @Roles(UserRole.ENUMERATOR, UserRole.SUPERVISOR, UserRole.ADMIN)
  async updateHouseholdListing(
    @Request() req,
    @Param('id') id: string,
    @Body() updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    const userId = req.user.id;
    return this.enumeratorRoutesService.updateHouseholdListing(
      userId,
      +id,
      updateDto,
    );
  }

  /**
   * Delete a household listing entry
   * @param id - Household listing ID
   * @access Enumerator, Supervisor, Admin
   */
  @Delete('household-listing/:id')
  @Roles(UserRole.ENUMERATOR, UserRole.SUPERVISOR, UserRole.ADMIN)
  async deleteHouseholdListing(@Request() req, @Param('id') id: string) {
    const userId = req.user.id;
    return this.enumeratorRoutesService.deleteHouseholdListing(userId, +id);
  }

  /**
   * Get sampling results for an enumeration area with structure geolocation
   * @param surveyId - Survey ID
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @access Enumerator only
   */
  @Get('surveys/:surveyId/enumeration-areas/:surveyEnumerationAreaId/sampling-results')
  @Roles(UserRole.ENUMERATOR)
  async getSamplingResults(
    @Request() req,
    @Param('surveyId') surveyId: string,
    @Param('surveyEnumerationAreaId') surveyEnumerationAreaId: string,
  ) {
    const enumeratorId = req.user.id;
    return this.enumeratorRoutesService.getSamplingResultsForEnumerator(
      enumeratorId,
      +surveyId,
      +surveyEnumerationAreaId,
    );
  }
}
