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
} from '@nestjs/common';
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
}
