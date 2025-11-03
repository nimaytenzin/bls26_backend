import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

/**
 * Reports Controller
 * Generates PDF reports with maps and statistical data
 *
 * Public routes: View HTML reports
 * Admin routes: Generate and download reports
 */
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // ============ PUBLIC ROUTES ============

  /**
   * View Bhutan map report in browser (HTML preview)
   * @access Public
   * @route GET /reports/bhutan-map/preview
   * @returns HTML page with interactive map
   */
  @Get('bhutan-map/preview')
  async viewBhutanMapReport(@Res() res: Response) {
    const html = await this.reportsService.generateBhutanMapReport();
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Download Bhutan map report as PDF
   * @access Public
   * @route GET /reports/bhutan-map
   * @returns PDF file
   */
  @Get('bhutan-map')
  async downloadBhutanMapPDF(@Res() res: Response) {
    const pdf = await this.reportsService.generateBhutanMapPDF();

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=bhutan-map-report-${Date.now()}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  /**
   * View single dzongkhag report in browser (HTML preview)
   * @access Public
   * @route GET /reports/dzongkhag/:id/preview
   * @param id - Dzongkhag ID
   * @returns HTML page with dzongkhag map
   */
  @Get('dzongkhag/:id/preview')
  async viewDzongkhagReport(@Param('id') id: string, @Res() res: Response) {
    const html = await this.reportsService.generateDzongkhagReport(+id);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }

  /**
   * Download single dzongkhag report as PDF
   * @access Public
   * @route GET /reports/dzongkhag/:id
   * @param id - Dzongkhag ID
   * @returns PDF file
   */
  @Get('dzongkhag/:id')
  async downloadDzongkhagPDF(@Param('id') id: string, @Res() res: Response) {
    const pdf = await this.reportsService.generateDzongkhagPDF(+id);

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=dzongkhag-${id}-report-${Date.now()}.pdf`,
      'Content-Length': pdf.length,
    });

    res.send(pdf);
  }

  // ============ ADMIN ROUTES ============

  // Note: Admin-specific routes can be added here if needed
  // For now, PDF generation is public for ease of access
}
