import { Injectable } from '@nestjs/common';
import { GeographicStatisticalCodeResponse } from './geographic-statistical-code.dto';
import * as PdfPrinter from 'pdfmake';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class PdfGeneratorService {
  private fonts: any;

  constructor() {
    // Initialize fonts - try to load from node_modules, fallback to default if not found
    this.initializeFonts();
  }

  private initializeFonts(): void {
    const fontPaths = [
      path.join(process.cwd(), 'node_modules/pdfmake/build/fonts/Roboto'),
      path.join(__dirname, '../../../node_modules/pdfmake/build/fonts/Roboto'),
      path.join(__dirname, '../../../../node_modules/pdfmake/build/fonts/Roboto'),
    ];

    let fontDir: string | null = null;
    for (const fontPath of fontPaths) {
      if (fs.existsSync(fontPath)) {
        fontDir = fontPath;
        break;
      }
    }

    if (fontDir) {
      // Load fonts as buffers (required by pdfmake)
      try {
        this.fonts = {
          Roboto: {
            normal: fs.readFileSync(path.join(fontDir, 'Roboto-Regular.ttf')),
            bold: fs.readFileSync(path.join(fontDir, 'Roboto-Medium.ttf')),
            italics: fs.readFileSync(path.join(fontDir, 'Roboto-Italic.ttf')),
            bolditalics: fs.readFileSync(path.join(fontDir, 'Roboto-MediumItalic.ttf')),
          },
        };
      } catch (error) {
        // If font files can't be read, use empty object (pdfmake will use default fonts)
        this.fonts = {};
      }
    } else {
      // Fallback: Use pdfmake's default fonts (Helvetica)
      // pdfmake will use built-in fonts if no custom fonts are provided
      this.fonts = {};
    }
  }

  /**
   * Generate PDF buffer from report data
   */
  async generatePDF(reportData: GeographicStatisticalCodeResponse): Promise<Buffer> {
    try {
      const printer = new PdfPrinter(this.fonts);
      const docDefinition = this.buildDocumentDefinition(reportData);
      
      return new Promise<Buffer>((resolve, reject) => {
        const pdfDoc = printer.createPdfKitDocument(docDefinition);
        const chunks: Buffer[] = [];

        pdfDoc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        pdfDoc.on('end', () => {
          resolve(Buffer.concat(chunks));
        });

        pdfDoc.on('error', (error: Error) => {
          reject(new Error(`Failed to generate PDF: ${error.message}`));
        });

        pdfDoc.end();
      });
    } catch (error) {
      throw new Error(`Failed to generate PDF: ${error.message}`);
    }
  }

  /**
   * Build PDF document definition
   */
  private buildDocumentDefinition(reportData: GeographicStatisticalCodeResponse): any {
    // Format generation date
    const generatedDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const currentYear = new Date().getFullYear();

    return {
      pageSize: 'A4',
      pageOrientation: 'portrait',
      pageMargins: [40, 60, 40, 60],
      defaultStyle: {
        font: this.fonts.Roboto ? 'Roboto' : 'Helvetica',
        fontSize: 10,
      },
      header: {
        text: 'Geographic Statistical Code Report',
        style: 'header',
        margin: [0, 20, 0, 20],
      },
      content: [
        // Summary Section
        {
          text: 'Summary',
          style: 'sectionHeader',
          margin: [0, 0, 0, 10],
        },
        {
          columns: [
            {
              text: [
                { text: 'Total Dzongkhags: ', bold: true },
                { text: `${reportData.totalDzongkhags}` },
              ],
            },
            {
              text: [
                { text: 'Total EAs: ', bold: true },
                { text: `${reportData.totalEAs}` },
              ],
            },
          ],
          margin: [0, 0, 0, 5],
        },
        {
          columns: [
            {
              text: [
                { text: 'Urban EAs: ', bold: true },
                { text: `${reportData.totalUrbanEAs}` },
              ],
            },
            {
              text: [
                { text: 'Rural EAs: ', bold: true },
                { text: `${reportData.totalRuralEAs}` },
              ],
            },
          ],
          margin: [0, 0, 0, 15],
        },
        {
          text: `Generated: ${generatedDate}`,
          fontSize: 8,
          italics: true,
          margin: [0, 0, 0, 20],
        },
        // Dzongkhag Details
        ...this.buildDzongkhagSections(reportData.dzongkhags),
      ],
      styles: {
        header: {
          fontSize: 18,
          bold: true,
          alignment: 'center',
          color: '#2c3e50',
        },
        sectionHeader: {
          fontSize: 14,
          bold: true,
          color: '#34495e',
          margin: [0, 10, 0, 5],
        },
        dzongkhagHeader: {
          fontSize: 12,
          bold: true,
          color: '#2980b9',
          margin: [0, 15, 0, 5],
        },
        tableHeader: {
          bold: true,
          fontSize: 9,
          color: '#ffffff',
          fillColor: '#34495e',
        },
        tableCell: {
          fontSize: 8,
        },
      },
      footer: function(currentPage: number, pageCount: number) {
        return {
          text: `Page ${currentPage} of ${pageCount}`,
          alignment: 'center',
          fontSize: 8,
          margin: [0, 10, 0, 0],
        };
      },
    };
  }

  /**
   * Build dzongkhag sections for PDF
   */
  private buildDzongkhagSections(dzongkhags: any[]): any[] {
    const sections: any[] = [];

    for (const dz of dzongkhags) {
      sections.push({
        text: `${dz.name} (${dz.code})`,
        style: 'dzongkhagHeader',
      });

      // Summary table
      sections.push({
        table: {
          widths: ['*', '*', '*', '*', '*', '*'],
          body: [
            [
              { text: 'Gewogs', style: 'tableHeader' },
              { text: 'Thromdes', style: 'tableHeader' },
              { text: 'Chiwogs', style: 'tableHeader' },
              { text: 'LAPs', style: 'tableHeader' },
              { text: 'Urban EAs', style: 'tableHeader' },
              { text: 'Rural EAs', style: 'tableHeader' },
            ],
            [
              { text: `${dz.summary.totalGewogs}`, style: 'tableCell', alignment: 'center' },
              { text: `${dz.summary.totalThromdes}`, style: 'tableCell', alignment: 'center' },
              { text: `${dz.summary.totalChiwogs}`, style: 'tableCell', alignment: 'center' },
              { text: `${dz.summary.totalLaps}`, style: 'tableCell', alignment: 'center' },
              { text: `${dz.summary.urbanEAs}`, style: 'tableCell', alignment: 'center' },
              { text: `${dz.summary.ruralEAs}`, style: 'tableCell', alignment: 'center' },
            ],
          ],
        },
        margin: [0, 0, 0, 10],
      });

      // Urban EAs table
      if (dz.urbanEAs && dz.urbanEAs.length > 0) {
        sections.push({
          text: 'Urban Enumeration Areas',
          style: 'sectionHeader',
          fontSize: 11,
        });
        sections.push(this.buildEATable(dz.urbanEAs, true));
      }

      // Rural EAs table
      if (dz.ruralEAs && dz.ruralEAs.length > 0) {
        sections.push({
          text: 'Rural Enumeration Areas',
          style: 'sectionHeader',
          fontSize: 11,
        });
        sections.push(this.buildEATable(dz.ruralEAs, false));
      }
    }

    return sections;
  }

  /**
   * Build EA table for PDF
   */
  private buildEATable(eas: any[], isUrban: boolean): any {
    const tableBody: any[] = [];

    // Header row
    if (isUrban) {
      tableBody.push([
        { text: 'EA Code', style: 'tableHeader' },
        { text: 'EA Name', style: 'tableHeader' },
        { text: 'Thromde', style: 'tableHeader' },
        { text: 'LAP', style: 'tableHeader' },
      ]);
    } else {
      tableBody.push([
        { text: 'EA Code', style: 'tableHeader' },
        { text: 'EA Name', style: 'tableHeader' },
        { text: 'Gewog', style: 'tableHeader' },
        { text: 'Chiwog', style: 'tableHeader' },
      ]);
    }

    // Data rows
    for (const ea of eas) {
      if (isUrban) {
        tableBody.push([
          { text: ea.eaCode, style: 'tableCell' },
          { text: ea.eaName, style: 'tableCell' },
          { text: `${ea.administrativeZone.name} (${ea.administrativeZone.code})`, style: 'tableCell' },
          { text: `${ea.subAdministrativeZone.name} (${ea.subAdministrativeZone.code})`, style: 'tableCell' },
        ]);
      } else {
        tableBody.push([
          { text: ea.eaCode, style: 'tableCell' },
          { text: ea.eaName, style: 'tableCell' },
          { text: `${ea.administrativeZone.name} (${ea.administrativeZone.code})`, style: 'tableCell' },
          { text: `${ea.subAdministrativeZone.name} (${ea.subAdministrativeZone.code})`, style: 'tableCell' },
        ]);
      }
    }

    return {
      table: {
        widths: ['auto', '*', '*', '*'],
        body: tableBody,
      },
      margin: [0, 0, 0, 15],
      layout: {
        hLineWidth: (i: number, node: any) => (i === 0 || i === node.table.body.length) ? 1 : 0.5,
        vLineWidth: () => 0.5,
        hLineColor: () => '#cccccc',
        vLineColor: () => '#cccccc',
        paddingLeft: () => 5,
        paddingRight: () => 5,
        paddingTop: () => 3,
        paddingBottom: () => 3,
      },
    };
  }
}

