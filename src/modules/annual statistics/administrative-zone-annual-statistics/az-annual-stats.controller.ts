import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  ValidationPipe,
} from '@nestjs/common';
import { AZAnnualStatsService } from './az-annual-stats.service';
import { CreateAZAnnualStatsDto } from './dto/create-az-annual-stats.dto';
import { UpdateAZAnnualStatsDto } from './dto/update-az-annual-stats.dto';
import { AZAnnualStats } from './entities/az-annual-stats.entity';
import { AZByDzongkhagGeoJsonResponse } from './dto/az-stats-geojson.dto';

@Controller('az-annual-stats')
export class AZAnnualStatsController {
  constructor(private readonly azAnnualStatsService: AZAnnualStatsService) {}

  /**
   * Get all Administrative Zones for a specific Dzongkhag with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic statistics
   * Perfect for map visualization and choropleth maps
   *
   * @access Public
   * @param dzongkhagId - ID of the Dzongkhag to filter by
   * @query year - Statistical year (defaults to current year)
   *
   * @example
   * GET /az-annual-stats/geojson/1
   * GET /az-annual-stats/geojson/1?year=2024
   *
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  @Get('all/geojson&stats/current&bydzongkhag/:dzongkhagId')
  async getCurrentAZStatsByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ): Promise<AZByDzongkhagGeoJsonResponse> {
    return this.azAnnualStatsService.getCurrentAZStatsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
  }

  @Get()
  async findAll(@Query('year') year?: string): Promise<AZAnnualStats[]> {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.azAnnualStatsService.findAll(yearNum);
  }

  @Get('history/:administrativeZoneId')
  async getHistoricalRecords(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
  ): Promise<AZAnnualStats[]> {
    return this.azAnnualStatsService.getHistoricalRecords(administrativeZoneId);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<AZAnnualStats> {
    return this.azAnnualStatsService.findOne(id);
  }

  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateAZAnnualStatsDto,
  ): Promise<AZAnnualStats> {
    return this.azAnnualStatsService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateAZAnnualStatsDto,
  ): Promise<AZAnnualStats> {
    return this.azAnnualStatsService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.azAnnualStatsService.remove(id);
    return { message: `AZ Annual Stats with ID ${id} has been deleted` };
  }
}
