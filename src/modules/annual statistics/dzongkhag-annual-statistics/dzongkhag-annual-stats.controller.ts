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
import { DzongkhagAnnualStatsService } from './dzongkhag-annual-stats.service';
import { CreateDzongkhagAnnualStatsDto } from './dto/create-dzongkhag-annual-stats.dto';
import { UpdateDzongkhagAnnualStatsDto } from './dto/update-dzongkhag-annual-stats.dto';
import { DzongkhagAnnualStats } from './entities/dzongkhag-annual-stats.entity';
import { DzongkhagStatsGeoJsonResponse } from './dto/dzongkhag-stats-geojson.dto';

@Controller('dzongkhag-annual-stats')
export class DzongkhagAnnualStatsController {
  constructor(
    private readonly dzongkhagAnnualStatsService: DzongkhagAnnualStatsService,
  ) {}

  /**
   * Get all Dzongkhags with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic statistics
   * Perfect for map visualization and choropleth maps
   *
   * @access Public
   * @query year - Statistical year (defaults to current year)
   *
   * @example
   * GET /dzongkhag-annual-stats/geojson
   * GET /dzongkhag-annual-stats/geojson?year=2024
   *
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  @Get('all/geojson&stats')
  async getDzongkhagStatsAsGeoJson(
    @Query('year') year?: string,
  ): Promise<DzongkhagStatsGeoJsonResponse> {
    const statsYear = year ? parseInt(year, 10) : undefined;
    return this.dzongkhagAnnualStatsService.getDzongkhagStatsAsGeoJson(
      statsYear,
    );
  }

  @Get()
  async findAll(@Query('year') year?: string): Promise<DzongkhagAnnualStats[]> {
    const yearNum = year ? parseInt(year, 10) : undefined;
    return this.dzongkhagAnnualStatsService.findAll(yearNum);
  }

  @Get('history/:dzongkhagId')
  async getHistoricalRecords(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ): Promise<DzongkhagAnnualStats[]> {
    return this.dzongkhagAnnualStatsService.getHistoricalRecords(dzongkhagId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<DzongkhagAnnualStats> {
    return this.dzongkhagAnnualStatsService.findOne(id);
  }

  @Post()
  async create(
    @Body(ValidationPipe) createDto: CreateDzongkhagAnnualStatsDto,
  ): Promise<DzongkhagAnnualStats> {
    return this.dzongkhagAnnualStatsService.create(createDto);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body(ValidationPipe) updateDto: UpdateDzongkhagAnnualStatsDto,
  ): Promise<DzongkhagAnnualStats> {
    return this.dzongkhagAnnualStatsService.update(id, updateDto);
  }

  @Delete(':id')
  async remove(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    await this.dzongkhagAnnualStatsService.remove(id);
    return {
      message: `Dzongkhag Annual Stats with ID ${id} has been deleted`,
    };
  }

  @Post('compute')
  async computeCurrentAnnualStatistics(): Promise<{
    message: string;
    year: number;
    dzongkhagCount: number;
    azCount: number;
    sazCount: number;
    eaCount: number;
  }> {
    return this.dzongkhagAnnualStatsService.computeCurrentAnnualStatistics();
  }
}
