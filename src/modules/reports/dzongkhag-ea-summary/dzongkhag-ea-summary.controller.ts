import { Controller, Get, Res, Param, Query, ParseIntPipe, Header } from '@nestjs/common';
import { Response } from 'express';
import { DzongkhagEaSummaryService } from './dzongkhag-ea-summary.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Controller('reports/dzongkhag-ea-summary')
export class DzongkhagEaSummaryController {
  constructor(
    private readonly dzongkhagEaSummaryService: DzongkhagEaSummaryService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly excelGeneratorService: ExcelGeneratorService,
  ) {}

  /**
   * Get report data as JSON
   * @access Public
   * @route GET /reports/dzongkhag-ea-summary/:dzongkhagId/data
   */
  @Get(':dzongkhagId/data')
  async getReportData(@Param('dzongkhagId', ParseIntPipe) dzongkhagId: number) {
    return this.dzongkhagEaSummaryService.getReportData(dzongkhagId);
  }

  /**
   * Get map data as GeoJSON FeatureCollection
   * @access Public
   * @route GET /reports/dzongkhag-ea-summary/:dzongkhagId/map
   */
  @Get(':dzongkhagId/map')
  async getMapData(@Param('dzongkhagId', ParseIntPipe) dzongkhagId: number) {
    return this.dzongkhagEaSummaryService.getMapData(dzongkhagId);
  }

  /**
   * Generate and download PDF report
   * @access Public
   * @route GET /reports/dzongkhag-ea-summary/:dzongkhagId/pdf?download=true
   * @param download - Optional query parameter to force download
   */
  @Get(':dzongkhagId/pdf')
  @Header('Content-Type', 'application/pdf')
  async generatePDF(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
    @Query('download') download?: string,
  ) {
    const reportData = await this.dzongkhagEaSummaryService.getReportData(dzongkhagId);
    const mapData = await this.dzongkhagEaSummaryService.getMapData(dzongkhagId);
    const pdfBuffer = await this.pdfGeneratorService.generatePDF(reportData, mapData);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `dzongkhag-ea-summary-${reportData.dzongkhag.name}-${timestamp}.pdf`;

    if (download === 'true') {
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    } else {
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
    }

    res.send(pdfBuffer);
  }

  /**
   * Generate and download Excel report
   * @access Public
   * @route GET /reports/dzongkhag-ea-summary/:dzongkhagId/excel
   */
  @Get(':dzongkhagId/excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateExcel(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Res() res: Response,
  ) {
    const reportData = await this.dzongkhagEaSummaryService.getReportData(dzongkhagId);
    const excelBuffer = await this.excelGeneratorService.generateExcel(reportData);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `dzongkhag-ea-summary-${reportData.dzongkhag.name}-${timestamp}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  }
}
