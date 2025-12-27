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
import { RunEnumerationAreaSamplingDto } from './dto/run-enumeration-area-sampling.dto';
import { BulkRunSamplingDto } from '../supervisor/dto/bulk-run-sampling.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('supervisor/sampling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SamplingSupervisorController {
  constructor(private readonly samplingService: SamplingService) {}

  /**
   * Get survey sampling configuration
   * Returns null if config doesn't exist (frontend handles 404 case)
   * Optimized for performance - no unnecessary survey validation
   * @param surveyId - Survey ID
   * @returns Survey sampling config or null
   */
  @Get('surveys/:surveyId/config')
  async getSurveySamplingConfig(
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.samplingService.getSurveySamplingConfig(surveyId);
  }

  /**
   * Run sampling for their EA (with EA access check)
   * @param surveyId
   * @param seaId
   * @param dto
   * @param req
   */
  @Post('surveys/:surveyId/enumeration-areas/:seaId/run')
  async runSampling(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
    @Body() dto: RunEnumerationAreaSamplingDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.samplingService.runSamplingForEnumerationAreaForSupervisor(
      supervisorId,
      surveyId,
      seaId,
      dto,
      req.user?.id,
    );
  }

  /**
   * View Results for their EA (with EA access check)
   * @param surveyId
   * @param seaId
   * @param req
   */
  @Get('surveys/:surveyId/enumeration-areas/:seaId/results')
  async getSamplingResults(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.samplingService.getSamplingResultsForSupervisor(
      supervisorId,
      surveyId,
      seaId,
    );
  }

  /**
   * Run bulk sampling for their EA (with access check for all EAs)
   * @param surveyId
   * @param dto
   * @param req
   */
  @Post('surveys/:surveyId/bulk-run')
  async bulkRunSampling(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() dto: BulkRunSamplingDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    const samplingDto: RunEnumerationAreaSamplingDto = {
      method: dto.method,
      sampleSize: dto.sampleSize,
      randomStart: dto.randomStart,
    };

    return this.samplingService.bulkRunSamplingForSupervisor(
      supervisorId,
      surveyId,
      dto.surveyEnumerationAreaIds,
      samplingDto,
      req.user?.id,
    );
  }

  /**
   * Re-sample EA (with EA access check, uses overwriteExisting: true)
   * @param surveyId
   * @param seaId
   * @param dto
   * @param req
   */
  @Post('surveys/:surveyId/enumeration-areas/:seaId/resample')
  async resampleEnumerationArea(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('seaId', ParseIntPipe) seaId: number,
    @Body() dto: RunEnumerationAreaSamplingDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.samplingService.resampleEnumerationAreaForSupervisor(
      supervisorId,
      surveyId,
      seaId,
      dto,
      req.user?.id,
    );
  }
}

