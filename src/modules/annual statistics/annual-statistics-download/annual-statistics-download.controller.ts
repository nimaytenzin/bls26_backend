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

  /**
   * NATIONAL DATA VIEWER DOWNLOADS
   * These endpoints provide structured CSV downloads for the national data viewer
   */

  /**
   * Download all Dzongkhags with basic statistics for national data viewer
   * @access Public
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/national-viewer/dzongkhags/csv
   * @description Returns: Dzongkhag Name, Dzongkhag Code, EA count, Household Count, Urban EA Count, Rural EA count, Urban household count
   * @example GET /annual-statistics-download/national-viewer/dzongkhags/csv?year=2024
   */
  @Get('national-viewer/dzongkhags/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_viewer_dzongkhags.csv"',
  )
  async downloadAllDzongkhagsForNationalViewer(
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadAllDzongkhagsForNationalViewer(
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download Dzongkhag with Gewog/Thromde breakdown for national data viewer
   * @access Public
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv
   * @description Returns: Dzongkhag Name, Dzongkhag Code, Location, Gewog/Thromde Name, Gewog/Thromde Code, Total EA, Total Household (Location: R=Rural, U=Urban)
   * @example GET /annual-statistics-download/national-viewer/dzongkhag-gewog-thromde/csv?year=2024
   */
  @Get('national-viewer/dzongkhag-gewog-thromde/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_viewer_dzongkhag_gewog_thromde.csv"',
  )
  async downloadDzongkhagWithGewogThromdeForNationalViewer(
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadDzongkhagWithGewogThromdeForNationalViewer(
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download Dzongkhag -> Gewog/Thromde -> Chiwog/LAP breakdown for national data viewer
   * @access Public
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv
   * @description Returns: Dzongkhag Name, Dzongkhag Code, Location, Gewog/Thromde Name, Gewog/Thromde Code, Chiwog/LAP Name, Chiwog/LAP Code, Total EA, Total Household (Location: R=Rural, U=Urban)
   * @example GET /annual-statistics-download/national-viewer/dzongkhag-chiwog-lap/csv?year=2024
   */
  @Get('national-viewer/dzongkhag-chiwog-lap/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_viewer_dzongkhag_chiwog_lap.csv"',
  )
  async downloadDzongkhagWithChiwogLapForNationalViewer(
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadDzongkhagWithChiwogLapForNationalViewer(
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download rural full hierarchy: Dzongkhag -> Gewog -> Chiwog -> EA for national data viewer
   * @access Public
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/national-viewer/rural-full-hierarchy/csv
   * @description Returns: Dzongkhag Name, Dzongkhag Code, Gewog Name, Gewog Code, Chiwog Name, Chiwog Code, EA Name, EA Code, Household Count
   * @example GET /annual-statistics-download/national-viewer/rural-full-hierarchy/csv?year=2024
   */
  @Get('national-viewer/rural-full-hierarchy/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_viewer_rural_full_hierarchy.csv"',
  )
  async downloadRuralFullHierarchyForNationalViewer(
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadRuralFullHierarchyForNationalViewer(
        yearNumber,
      );
    res.send(csv);
  }

  /**
   * Download urban full hierarchy: Dzongkhag -> Thromde -> LAP -> EA for national data viewer
   * @access Public
   * @query year - Optional year (defaults to latest available year)
   * @route GET /annual-statistics-download/national-viewer/urban-full-hierarchy/csv
   * @description Returns: Dzongkhag Name, Dzongkhag Code, Thromde Name, Thromde Code, LAP Name, LAP Code, EA Name, EA Code, Household Count
   * @example GET /annual-statistics-download/national-viewer/urban-full-hierarchy/csv?year=2024
   */
  @Get('national-viewer/urban-full-hierarchy/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="national_viewer_urban_full_hierarchy.csv"',
  )
  async downloadUrbanFullHierarchyForNationalViewer(
    @Res() res: Response,
    @Query('year') year?: string,
  ) {
    const yearNumber = year ? parseInt(year, 10) : undefined;
    const csv =
      await this.annualStatisticsDownloadService.downloadUrbanFullHierarchyForNationalViewer(
        yearNumber,
      );
    res.send(csv);
  }
}

