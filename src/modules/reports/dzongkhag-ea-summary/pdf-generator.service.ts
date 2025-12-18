import { Injectable } from '@nestjs/common';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { DzongkhagEaSummaryResponse } from './dzongkhag-ea-summary.dto';
import { MapFeatureCollection } from './dzongkhag-ea-summary.dto';
const htmlToPdf = require('html-pdf-node');

@Injectable()
export class PdfGeneratorService {
  /**
   * Generate PDF buffer from report data
   */
  async generatePDF(
    reportData: DzongkhagEaSummaryResponse,
    mapData: MapFeatureCollection,
  ): Promise<Buffer> {
    const html = await this.generateHTML(reportData, mapData);

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
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
      ],
    };

    // Ensure file object is properly formatted
    const file = { 
      content: html,
    };

    // Validate HTML content
    if (!html || typeof html !== 'string' || html.length === 0) {
      throw new Error('Invalid HTML content generated');
    }

    try {
      const pdfBuffer = await htmlToPdf.generatePdf(file, options);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        throw new Error('PDF buffer is empty');
      }
      
      return pdfBuffer;
    } catch (error) {
      // Log more details for debugging
      console.error('PDF generation error:', error);
      console.error('HTML length:', html.length);
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Generate HTML from report data using Handlebars template
   */
  async generateHTML(
    reportData: DzongkhagEaSummaryResponse,
    mapData: MapFeatureCollection,
  ): Promise<string> {
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
    // Stringify mapData for template (will be used with triple braces for raw output)
    const mapDataJson = JSON.stringify(mapData);
    
    const templateData = {
      generatedDate,
      dzongkhag: reportData.dzongkhag,
      summary: reportData.summary,
      gewogs: reportData.gewogs || [], // Ensure gewogs is always an array
      mapData: mapDataJson,
      currentYear: new Date().getFullYear(),
    };
    
    // Validate template data
    if (!templateData.dzongkhag || !templateData.dzongkhag.name) {
      throw new Error('Invalid dzongkhag data in report');
    }

    // Load template
    const templatePath = this.findTemplatePath();
    console.log('Template path:', templatePath);
    
    if (!fs.existsSync(templatePath)) {
      throw new Error(`Template file does not exist: ${templatePath}`);
    }
    
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    
    if (!templateSource || templateSource.trim().length === 0) {
      throw new Error('Template file is empty');
    }
    
    let template;
    try {
      template = handlebars.compile(templateSource);
    } catch (compileError) {
      console.error('Template compilation error:', compileError);
      throw new Error(`Failed to compile template: ${compileError.message}`);
    }
    
    let html;
    try {
      html = template(templateData);
    } catch (renderError) {
      console.error('Template rendering error:', renderError);
      console.error('Template data keys:', Object.keys(templateData));
      throw new Error(`Failed to render template: ${renderError.message}`);
    }

    // Validate HTML is not empty
    if (!html || html.trim().length === 0) {
      console.error('Generated HTML is empty');
      console.error('Template source length:', templateSource.length);
      console.error('Template data:', JSON.stringify(templateData, null, 2).substring(0, 500));
      throw new Error('Generated HTML is empty');
    }

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
      path.join(__dirname, '../templates', 'dzongkhag-ea-summary.hbs'),
      path.join(
        __dirname,
        '../../../src/modules/reports/templates',
        'dzongkhag-ea-summary.hbs',
      ),
      path.join(
        process.cwd(),
        'src/modules/reports/templates',
        'dzongkhag-ea-summary.hbs',
      ),
      path.join(
        process.cwd(),
        'dist/modules/reports/templates',
        'dzongkhag-ea-summary.hbs',
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
