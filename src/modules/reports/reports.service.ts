import { Injectable, NotFoundException } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { DzongkhagService } from '../location/dzongkhag/dzongkhag.service';
const htmlToPdf = require('html-pdf-node');

@Injectable()
export class ReportsService {
  constructor(private readonly dzongkhagService: DzongkhagService) {}

  /**
   * Generate Bhutan map report with all dzongkhags
   * Returns HTML that can be converted to PDF
   */
  async generateBhutanMapReport(): Promise<string> {
    // Fetch all dzongkhags as GeoJSON
    const geojsonData = await this.dzongkhagService.findAllAsGeoJson();

    // Fetch all dzongkhags for statistics
    const dzongkhags = await this.dzongkhagService.findAll(false);

    // Calculate statistics
    const totalArea = dzongkhags
      .reduce((sum, d) => sum + parseFloat(d.areaSqKm?.toString() || '0'), 0)
      .toFixed(2);

    // Count administrative zones (assuming relationship exists)
    const totalAdminZones = dzongkhags.reduce(
      (sum, d) => sum + (d.administrativeZones?.length || 0),
      0,
    );

    // Prepare template data
    const templateData = {
      totalDzongkhags: dzongkhags.length,
      totalArea: totalArea,
      totalAdminZones: totalAdminZones,
      totalEAs: 0, // Will be calculated if relationship exists
      dzongkhags: dzongkhags.map((d) => ({
        name: d.name,
        areaCode: d.areaCode,
        areaSqKm: parseFloat(d.areaSqKm?.toString() || '0').toFixed(2),
      })),
      geojsonData: JSON.stringify(geojsonData),
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      currentYear: new Date().getFullYear(),
    };

    // Load and compile template
    // Try multiple paths: dist folder (production) and src folder (development)
    const possiblePaths = [
      path.join(__dirname, 'templates', 'bhutan-map.hbs'),
      path.join(
        __dirname,
        '../../src/modules/reports/templates',
        'bhutan-map.hbs',
      ),
      path.join(
        process.cwd(),
        'src/modules/reports/templates',
        'bhutan-map.hbs',
      ),
      path.join(
        process.cwd(),
        'dist/modules/reports/templates',
        'bhutan-map.hbs',
      ),
    ];

    let templatePath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        templatePath = possiblePath;
        break;
      }
    }

    if (!templatePath) {
      throw new NotFoundException(
        `Template file not found. Searched in: ${possiblePaths.join(', ')}`,
      );
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(templateData);

    return html;
  }

  /**
   * Generate Single Dzongkhag Report
   */
  async generateDzongkhagReport(dzongkhagId: number): Promise<string> {
    const dzongkhag = await this.dzongkhagService.findOne(dzongkhagId, true);

    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    // Get GeoJSON for this dzongkhag
    const geojsonData = await this.dzongkhagService.findAllAsGeoJson();

    // Filter to show only this dzongkhag
    const filteredGeojson = {
      ...geojsonData,
      features: geojsonData.features.filter(
        (f: any) => f.properties.id === dzongkhagId,
      ),
    };

    const templateData = {
      totalDzongkhags: 1,
      totalArea: parseFloat(dzongkhag.areaSqKm?.toString() || '0').toFixed(2),
      totalAdminZones: dzongkhag.administrativeZones?.length || 0,
      totalEAs: 0,
      dzongkhags: [
        {
          name: dzongkhag.name,
          areaCode: dzongkhag.areaCode,
          areaSqKm: parseFloat(dzongkhag.areaSqKm?.toString() || '0').toFixed(
            2,
          ),
        },
      ],
      geojsonData: JSON.stringify(filteredGeojson),
      generatedDate: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      currentYear: new Date().getFullYear(),
    };

    // Load and compile template
    // Try multiple paths: dist folder (production) and src folder (development)
    const possiblePaths = [
      path.join(__dirname, 'templates', 'bhutan-map.hbs'),
      path.join(
        __dirname,
        '../../src/modules/reports/templates',
        'bhutan-map.hbs',
      ),
      path.join(
        process.cwd(),
        'src/modules/reports/templates',
        'bhutan-map.hbs',
      ),
      path.join(
        process.cwd(),
        'dist/modules/reports/templates',
        'bhutan-map.hbs',
      ),
    ];

    let templatePath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        templatePath = possiblePath;
        break;
      }
    }

    if (!templatePath) {
      throw new NotFoundException(
        `Template file not found. Searched in: ${possiblePaths.join(', ')}`,
      );
    }

    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(templateData);

    return html;
  }

  /**
   * Generate Bhutan Map Report as PDF
   * @returns PDF Buffer
   */
  async generateBhutanMapPDF(): Promise<Buffer> {
    const html = await this.generateBhutanMapReport();

    const options = {
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      preferCSSPageSize: true,
    };

    const file = { content: html };

    try {
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Generate Single Dzongkhag Report as PDF
   * @param dzongkhagId - Dzongkhag ID
   * @returns PDF Buffer
   */
  async generateDzongkhagPDF(dzongkhagId: number): Promise<Buffer> {
    const html = await this.generateDzongkhagReport(dzongkhagId);

    const options = {
      format: 'A4',
      landscape: true,
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
      preferCSSPageSize: true,
    };

    const file = { content: html };

    try {
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      return pdfBuffer;
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }
}
