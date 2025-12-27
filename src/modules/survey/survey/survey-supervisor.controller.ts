import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { SurveyService } from './survey.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('supervisor/survey')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SurveySupervisorController {
  constructor(private readonly surveyService: SurveyService) {}

  /**
   * Get enumeration hierarchy for a survey (scoped to supervisor's dzongkhags)
   * Returns: Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Areas
   * Only includes dzongkhags assigned to the supervisor
   * @param surveyId
   * @param req
   */
  @Get(':surveyId/enumeration-hierarchy')
  getSurveyEnumerationHierarchy(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyService.getSurveyEnumerationHierarchyForSupervisor(
      surveyId,
      supervisorId,
    );
  }

  /**
   * Get a single survey (only if survey has EAs in supervisor's dzongkhags)
   * @param surveyId
   * @param req
   */
  @Get(':surveyId')
  findOne(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyService.findOneForSupervisor(surveyId, supervisorId);
  }
}

