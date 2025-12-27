import {
  Controller,
  Get,
  Param,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { SurveyEnumerationAreaService } from './survey-enumeration-area.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('supervisor/survey-enumeration-area')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SurveyEnumerationAreaSupervisorController {
  constructor(
    private readonly surveyEnumerationAreaService: SurveyEnumerationAreaService,
  ) {}

  /**
   * Get survey enumeration areas by survey (scoped to supervisor's dzongkhags)
   * @param surveyId
   * @param req
   */
  @Get('by-survey/:surveyId')
  findBySurvey(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaService.findBySurveyForSupervisor(
      supervisorId,
      surveyId,
    );
  }

  /**
   * Get single SurveyEA (with access check)
   * @param id
   * @param req
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number, @Request() req) {
    const supervisorId = req.user?.id;
    return this.surveyEnumerationAreaService.findOneForSupervisor(
      supervisorId,
      id,
    );
  }
}

