import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { SamplingService } from './sampling.service';
import { UpdateSurveySamplingConfigDto } from './dto/update-survey-sampling-config.dto';
import { RunEnumerationAreaSamplingDto } from './dto/run-enumeration-area-sampling.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('sampling')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SamplingController {
  constructor(private readonly samplingService: SamplingService) {}

  /**
   * Get survey sampling configuration
   * Returns null if config doesn't exist (frontend handles 404 case)
   * Optimized for performance - no unnecessary survey validation
   * @param surveyId - Survey ID
   * @returns Survey sampling config or null
   */
  @Get('surveys/:surveyId/config')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSurveySamplingConfig(
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.samplingService.getSurveySamplingConfig(surveyId);
  }

  @Post('surveys/:surveyId/config')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async upsertSurveySamplingConfig(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: UpdateSurveySamplingConfigDto,
    @Request() req,
  ) {
    return this.samplingService.upsertSurveySamplingConfig(
      surveyId,
      dto,
      req.user?.id,
    );
  }

  @Post('surveys/:surveyId/enumeration-areas/:seaId/run')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async runSampling(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
    @Body() dto: RunEnumerationAreaSamplingDto,
    @Request() req,
  ) {
    return this.samplingService.runSamplingForEnumerationArea(
      surveyId,
      seaId,
      dto,
      req.user?.id,
    );
  }

  @Get('surveys/:surveyId/enumeration-areas/:seaId/check')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async checkSamplingExists(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
  ) {
    return this.samplingService.checkSamplingExists(surveyId, seaId);
  }

  @Get('surveys/:surveyId/enumeration-areas/:seaId/results')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)

  async getSamplingResults(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
  ) {
    return this.samplingService.getSamplingResults(surveyId, seaId);
  }

  @Get('surveys/:surveyId/enumeration-hierarchy')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSamplingEnumerationHierarchy(
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.samplingService.getSamplingEnumerationHierarchy(surveyId);
  }

  @Get('surveys/:surveyId/enumeration-areas/:seaId/selected-households')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async getSelectedHouseholds(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
  ) {
    return this.samplingService.getSelectedHouseholdsByEnumerationArea(
      surveyId,
      seaId,
    );
  }
}

