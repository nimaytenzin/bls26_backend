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
import { SAZAnnualStatsService } from './saz-annual-stats.service';
import { CreateSAZAnnualStatsDto } from './dto/create-saz-annual-stats.dto';
import { UpdateSAZAnnualStatsDto } from './dto/update-saz-annual-stats.dto';
import { SAZAnnualStats } from './entities/saz-annual-stats.entity';
import {
  SAZByAdministrativeZoneGeoJsonResponse,
  SAZByDzongkhagGeoJsonResponse,
} from './dto/saz-stats-geojson.dto';

@Controller('saz-annual-stats')
export class SAZAnnualStatsController {
  constructor(private readonly sazAnnualStatsService: SAZAnnualStatsService) {}

  /**
   * Get all SAZs for a specific Administrative Zone with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic statistics
   * Perfect for map visualization and choropleth maps
   *
   * @access Public
   * @param administrativeZoneId - ID of the Administrative Zone to filter by
   *
   * @example
   * GET /saz-annual-stats/all/geojson&stats/current&byadministrativezone/1
   *
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  @Get('all/geojson&stats/current&byadministrativezone/:administrativeZoneId')
  async getCurrentSAZStatsByAdministrativeZoneAsGeoJson(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
  ): Promise<SAZByAdministrativeZoneGeoJsonResponse> {
    return this.sazAnnualStatsService.getCurrentSAZStatsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
  }

  /**
   * Get all SAZs for a specific Dzongkhag with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic statistics across all AZs
   * Perfect for comprehensive Dzongkhag-level visualization
   *
   * @access Public
   * @param dzongkhagId - ID of the Dzongkhag to filter by
   *
   * @example
   * GET /saz-annual-stats/all/geojson&stats/current&bydzongkhag/1
   *
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  @Get('all/geojson&stats/current&bydzongkhag/:dzongkhagId')
  async getCurrentSAZStatsByDzongkhagAsGeoJson(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ): Promise<SAZByDzongkhagGeoJsonResponse> {
    return this.sazAnnualStatsService.getCurrentSAZStatsByDzongkhagAsGeoJson(
      dzongkhagId,
    );
  }

  @Get()
  async findAll(@Query('year') year?: string): Promise<SAZAnnualStats[]> {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.sazAnnualStatsService.findAll(yearNum);
  }

  @Get('history/:subAdministrativeZoneId')
  async getHistoricalRecords(
    @Param('subAdministrativeZoneId', ParseIntPipe)
    subAdministrativeZoneId: number,
  ): Promise<SAZAnnualStats[]> {
    return this.sazAnnualStatsService.getHistoricalRecords(
      subAdministrativeZoneId,
    );
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<SAZAnnualStats> {
    return this.sazAnnualStatsService.findOne(id);
  }

  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateSAZAnnualStatsDto,
  ): Promise<SAZAnnualStats> {
    return this.sazAnnualStatsService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateSAZAnnualStatsDto,
  ): Promise<SAZAnnualStats> {
    return this.sazAnnualStatsService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.sazAnnualStatsService.remove(id);
    return { message: `SAZ Annual Stats with ID ${id} has been deleted` };
  }
}
