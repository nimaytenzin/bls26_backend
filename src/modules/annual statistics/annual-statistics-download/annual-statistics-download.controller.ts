import {
  Controller,
  Get,
  Param,
  Query,
  ParseIntPipe,
  Res,
  Header,
} from '@nestjs/common';
import { Response } from 'express';
import { AnnualStatisticsDownloadService } from './annual-statistics-download.service';

@Controller('annual-statistics-download')
export class AnnualStatisticsDownloadController {
  constructor(
    private readonly annualStatisticsDownloadService: AnnualStatisticsDownloadService,
  ) {}

  /**
   * Download national statistics (all Dzongkhags) as CSV
   * @access Public, Admin, Supervisor
   * @query year - Optional year (defaults to latest available year)
   * @query includeAZ - Optional flag to include Administrative Zone breakdown (default: false)
   * @query includeSAZ - Optional flag to include Sub-Administrative Zone breakdown (default: false, requires includeAZ=true)
   * @route GET /annual-statistics-download/national/csv
   * @example GET /annual-statistics-download/national/csv?year=2024&includeAZ=true
   * @example GET /annual-statistics-download/national/csv?year=2024&includeAZ=true&includeSAZ=true
   */
  @Get('national/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_annual_statistics.csv"',
  )
  async downloadNationalStats(
    @Res() res: Response,
    @Query('year') year?: string,
    @Query('includeAZ') includeAZ?: string,
    @Query('includeSAZ') includeSAZ?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const includeAZFlag = includeAZ === 'true';
    const includeSAZFlag = includeSAZ === 'true';
    const csv = await this.annualStatisticsDownloadService.downloadNationalStats(
      yearNumber,
      includeAZFlag,
      includeSAZFlag,
    );
    res.send(csv);
  }

  /**
   * Download statistics by Dzongkhag as CSV
   * @access Public, Admin, Supervisor
   * @param dzongkhagId - Dzongkhag ID
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/dzongkhag/:dzongkhagId/csv
   */
  @Get('dzongkhag/:dzongkhagId/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="dzongkhag_annual_statistics.csv"',
  )
  async downloadDzongkhagStats(
    @Res() res: Response,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadDzongkhagStats(
        dzongkhagId,
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download statistics by Administrative Zone as CSV
   * @access Public, Admin, Supervisor
   * @param administrativeZoneId - Administrative Zone ID
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/administrative-zone/:administrativeZoneId/csv
   */
  @Get('administrative-zone/:administrativeZoneId/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="administrative_zone_annual_statistics.csv"',
  )
  async downloadAdministrativeZoneStats(
    @Res() res: Response,
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadAdministrativeZoneStats(
        administrativeZoneId,
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download statistics by Sub-Administrative Zone as CSV
   * @access Public, Admin, Supervisor
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/sub-administrative-zone/:subAdministrativeZoneId/csv
   */
  @Get('sub-administrative-zone/:subAdministrativeZoneId/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="sub_administrative_zone_annual_statistics.csv"',
  )
  async downloadSubAdministrativeZoneStats(
    @Res() res: Response,
    @Param('subAdministrativeZoneId', ParseIntPipe)
    subAdministrativeZoneId: number,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadSubAdministrativeZoneStats(
        subAdministrativeZoneId,
        yearNumber,
      );
    res.send(csv);
  }
}

