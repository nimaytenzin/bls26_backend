import { Injectable } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { GeographicStatisticalCodeResponse } from './geographic-statistical-code.dto';
const htmlToPdf = require('html-pdf-node');

@Injectable()
export class PdfGeneratorService {
  /**
   * Generate PDF buffer from report data
   */
  async generatePDF(reportData: GeographicStatisticalCodeResponse): Promise<Buffer> {
    const html = await this.generateHTML(reportData);

    const options = {
      format: 'A4',
      landscape: false,
      printBackground: true,
      margin: {
        top: '15mm',
        right: '10mm',
        bottom: '15mm',
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
   * Generate HTML from report data using Handlebars template
   */
  async generateHTML(reportData: GeographicStatisticalCodeResponse): Promise<string> {
    // Register Handlebars helpers
    this.registerHandlebarsHelpers();

    // Format generation date
    const generatedDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Prepare template data
    const templateData = {
      generatedDate,
      totalDzongkhags: reportData.totalDzongkhags,
      totalEAs: reportData.totalEAs,
      totalUrbanEAs: reportData.totalUrbanEAs,
      totalRuralEAs: reportData.totalRuralEAs,
      dzongkhags: reportData.dzongkhags.map((dz) => ({
        id: dz.id,
        name: dz.name,
        code: dz.code,
        summary: dz.summary,
        urbanEAs: dz.urbanEAs,
        ruralEAs: dz.ruralEAs,
      })),
      currentYear: new Date().getFullYear(),
    };

    // Load template
    const templatePath = this.findTemplatePath();
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const template = handlebars.compile(templateSource);
    const html = template(templateData);

    return html;
  }

  /**
   * Register Handlebars helpers
   */
  private registerHandlebarsHelpers(): void {
    // Register eq helper for equality comparison
    if (!handlebars.helpers.eq) {
      handlebars.registerHelper('eq', function(a: any, b: any, options: any) {
        if (a === b) {
          return options.fn(this);
        }
        return options.inverse(this);
      });
    }
  }

  /**
   * Find template file path (handles both dev and production)
   */
  private findTemplatePath(): string {
    const possiblePaths = [
      path.join(__dirname, '../templates', 'geographic-statistical-code.hbs'),
      path.join(
        __dirname,
        '../../../src/modules/reports/templates',
        'geographic-statistical-code.hbs',
      ),
      path.join(
        process.cwd(),
        'src/modules/reports/templates',
        'geographic-statistical-code.hbs',
      ),
      path.join(
        process.cwd(),
        'dist/modules/reports/templates',
        'geographic-statistical-code.hbs',
      ),
    ];

    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        return possiblePath;
      }
    }

    throw new Error(
      `Template file not found. Searched in: ${possiblePaths.join(', ')}`,
    );
  }
}

