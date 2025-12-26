import { Controller, Get, Res, Query, Header } from '@nestjs/common';
import { Response } from 'express';
import { GeographicStatisticalCodeService } from './geographic-statistical-code.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { ExcelGeneratorService } from './excel-generator.service';

@Controller('reports/geographic-statistical-code')
export class GeographicStatisticalCodeController {
  constructor(
    private readonly geographicStatisticalCodeService: GeographicStatisticalCodeService,
    private readonly pdfGeneratorService: PdfGeneratorService,
    private readonly excelGeneratorService: ExcelGeneratorService,
  ) {}

  /**
   * Get report data as JSON
   * @access Public
   * @route GET /reports/geographic-statistical-code/data
   */
  @Get('data')
  async getReportData() {
    return this.geographicStatisticalCodeService.getReportData();
  }

  /**
   * Generate and download PDF report
   * @access Public
   * @route GET /reports/geographic-statistical-code/pdf?download=true
   * @param download - Optional query parameter to force download
   */
  @Get('pdf')
  async generatePDF(@Res() res: Response, @Query('download') download?: string) {
    const reportData = await this.geographicStatisticalCodeService.getReportData();
    const pdfBuffer = await this.pdfGeneratorService.generatePDF(reportData);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `geographic-statistical-code-report-${timestamp}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Length', pdfBuffer.length.toString());

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
   * @route GET /reports/geographic-statistical-code/excel
   */
  @Get('excel')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async generateExcel(@Res() res: Response) {
    const reportData = await this.geographicStatisticalCodeService.getReportData();
    const excelBuffer = await this.excelGeneratorService.generateExcel(reportData);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `geographic-statistical-code-report-${timestamp}.xlsx`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(excelBuffer);
  }
}

