import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { EAAnnualStatsService } from './ea-annual-stats.service';
import { CreateEAAnnualStatsDto } from './dto/create-ea-annual-stats.dto';
import { UpdateEAAnnualStatsDto } from './dto/update-ea-annual-stats.dto';
import {
  RecalculateStatsDto,
  ListEAAnnualStatsQueryDto,
  AggregateStatsQueryDto,
  EAAnnualStatsResponseDto,
  AggregatedStatsResponseDto,
  PaginatedEAAnnualStatsResponseDto,
} from './dto/ea-annual-stats-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { EAAnnualStats } from './entities/ea-annual-stats.entity';

@Controller('ea-annual-stats')
export class EAAnnualStatsController {
  constructor(private readonly eaAnnualStatsService: EAAnnualStatsService) {}

  /**
   * GET /ea-annual-stats/history/:enumerationAreaId
   * Get historical records for a specific Enumeration Area
   * Returns all annual statistics ordered by year (ascending)
   * Accessible by all authenticated users
   */
  @Get('history/:enumerationAreaId')
  async getHistoricalRecords(
    @Param('enumerationAreaId', ParseIntPipe) enumerationAreaId: number,
  ): Promise<EAAnnualStats[]> {
    return this.eaAnnualStatsService.getHistoricalRecords(enumerationAreaId);
  }

  /**
   * GET /ea-annual-stats/:id
   * Get one EA annual stat by ID
   * Accessible by all authenticated users
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<EAAnnualStatsResponseDto> {
    return this.eaAnnualStatsService.findOne(id);
  }

  /**
   * POST /ea-annual-stats
   * Create or upsert an EA annual stat
   * Accessible by ADMIN and SUPERVISOR only
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async create(
    @Body(ValidationPipe) createDto: CreateEAAnnualStatsDto,
  ): Promise<EAAnnualStatsResponseDto> {
    return this.eaAnnualStatsService.create(createDto);
  }

  /**
   * PUT /ea-annual-stats/:id
   * Update an EA annual stat by ID
   * Accessible by ADMIN and SUPERVISOR only
   */
  @Put(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateEAAnnualStatsDto,
  ): Promise<EAAnnualStatsResponseDto> {
    return this.eaAnnualStatsService.update(id, updateDto);
  }

  /**
   * DELETE /ea-annual-stats/:id
   * Delete an EA annual stat by ID
   * Accessible by ADMIN only
   */
  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.eaAnnualStatsService.remove(id);
    return { message: `EA Annual Stats with ID ${id} has been deleted` };
  }
}
