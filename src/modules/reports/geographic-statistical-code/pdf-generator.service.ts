import { Injectable } from '@nestjs/common';
import { GeographicStatisticalCodeResponse } from './geographic-statistical-code.dto';

// PDFKit is a CommonJS module, use require
const PDFDocument = require('pdfkit');

@Injectable()
export class PdfGeneratorService {
  /**
   * Generate PDF buffer from report data using PDFKit
   */
  async generatePDF(reportData: GeographicStatisticalCodeResponse): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let hasError = false;

      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 60,
            bottom: 60,
            left: 40,
            right: 40,
          },
        });

        doc.on('data', (chunk: Buffer) => {
          chunks.push(chunk);
        });

        doc.on('end', () => {
          if (hasError) {
            return;
          }

    try {
            const buffer = Buffer.concat(chunks as Uint8Array[]);
            
            // Validate PDF buffer
            if (!buffer || buffer.length === 0) {
              reject(new Error('Generated PDF buffer is empty'));
              return;
            }

            // Verify it's a valid PDF (starts with %PDF-)
            const pdfHeader = buffer.slice(0, 4).toString();
            if (pdfHeader !== '%PDF') {
              reject(new Error(`Generated buffer is not a valid PDF. Header: ${pdfHeader}`));
              return;
            }

            resolve(buffer);
          } catch (error) {
            reject(new Error(`Failed to concatenate PDF chunks: ${error.message}`));
          }
        });

        doc.on('error', (error: Error) => {
          hasError = true;
          reject(new Error(`PDF generation error: ${error.message}`));
        });

        // Build PDF content
        try {
          this.buildPDFContent(doc, reportData);
        } catch (error) {
          hasError = true;
          reject(new Error(`Failed to build PDF content: ${error.message}`));
          return;
        }

        // Finalize PDF
        doc.end();
    } catch (error) {
        hasError = true;
        reject(new Error(`Failed to generate PDF: ${error.message}`));
    }
    });
  }

  /**
   * Build PDF content
   */
  private buildPDFContent(
    doc: PDFKit.PDFDocument,
    reportData: GeographicStatisticalCodeResponse,
  ): void {
    // Header
    doc
      .fontSize(18)
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('Geographic Statistical Code Report', {
        align: 'center',
      })
      .moveDown(1);

    // Summary Section
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor('#34495e')
      .text('Summary', { align: 'left' })
      .moveDown(0.5);

    doc.fontSize(10).font('Helvetica').fillColor('black');

    // Summary data in two columns
    doc.text(`Total Dzongkhags: ${reportData.totalDzongkhags}`, {
      continued: true,
      align: 'left',
    });
    doc.text(`Total EAs: ${reportData.totalEAs}`, {
      align: 'right',
    });

    doc.moveDown(0.5);
    doc.text(`Urban EAs: ${reportData.totalUrbanEAs}`, {
      continued: true,
      align: 'left',
    });
    doc.text(`Rural EAs: ${reportData.totalRuralEAs}`, {
      align: 'right',
    });

    // Generated date
    const generatedDate = new Date(reportData.generatedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    doc
      .moveDown(1)
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#666666')
      .text(`Generated: ${generatedDate}`)
      .moveDown(1.5);

    // Dzongkhag Details
    this.buildDzongkhagSections(doc, reportData.dzongkhags);
  }

  /**
   * Build dzongkhag sections
   */
  private buildDzongkhagSections(doc: PDFKit.PDFDocument, dzongkhags: any[]): void {
    for (const dz of dzongkhags) {
      // Check if we need a new page
      if (doc.y > 700) {
        doc.addPage();
      }

      // Dzongkhag header
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2980b9')
        .text(`${dz.name} (${dz.code})`, { align: 'left' })
        .moveDown(0.5);

      // Summary table
      this.buildSummaryTable(doc, dz.summary);

      // Urban EAs table
      if (dz.urbanEAs && dz.urbanEAs.length > 0) {
        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#34495e')
          .text('Urban Enumeration Areas', { align: 'left' })
          .moveDown(0.3);
        this.buildEATable(doc, dz.urbanEAs, true);
  }

      // Rural EAs table
      if (dz.ruralEAs && dz.ruralEAs.length > 0) {
        doc.moveDown(0.5);
        doc
          .fontSize(11)
          .font('Helvetica-Bold')
          .fillColor('#34495e')
          .text('Rural Enumeration Areas', { align: 'left' })
          .moveDown(0.3);
        this.buildEATable(doc, dz.ruralEAs, false);
      }

      doc.moveDown(1);
    }
  }

  /**
   * Build summary table
   */
  private buildSummaryTable(doc: PDFKit.PDFDocument, summary: any): void {
    const tableTop = doc.y;
    const cellHeight = 20;
    const cellPadding = 5;
    const pageWidth = doc.page.width;
    const margin = 40;
    const tableWidth = pageWidth - (margin * 2);
    const columnWidth = tableWidth / 6;

    // Header row
    const headers = ['Gewogs', 'Thromdes', 'Chiwogs', 'LAPs', 'Urban EAs', 'Rural EAs'];
    let x = margin;

    doc.font('Helvetica-Bold').fontSize(9);
    for (const header of headers) {
      // Draw filled rectangle for header background
      doc
        .rect(x, tableTop, columnWidth, cellHeight)
        .fill('#34495e');
      // Draw text in white
      doc.fillColor('#ffffff');
      doc.text(header, x + cellPadding, tableTop + cellPadding, {
        width: columnWidth - cellPadding * 2,
        align: 'center',
      });
      x += columnWidth;
    }

    // Data row
    const dataY = tableTop + cellHeight;
    const data = [
      summary.totalGewogs,
      summary.totalThromdes,
      summary.totalChiwogs,
      summary.totalLaps,
      summary.urbanEAs,
      summary.ruralEAs,
    ];
    x = margin;

    doc.font('Helvetica').fontSize(8).fillColor('black');
    for (const value of data) {
      // Draw border rectangle
      doc
        .rect(x, dataY, columnWidth, cellHeight)
        .stroke('#cccccc');
      // Draw text
      doc.text(String(value), x + cellPadding, dataY + cellPadding, {
        width: columnWidth - cellPadding * 2,
        align: 'center',
      });
      x += columnWidth;
    }

    doc.y = dataY + cellHeight + 5;
  }

  /**
   * Build EA table
   */
  private buildEATable(
    doc: PDFKit.PDFDocument,
    eas: any[],
    isUrban: boolean,
  ): void {
    const tableTop = doc.y;
    const cellHeight = 18;
    const cellPadding = 5;
    const pageWidth = doc.page.width;
    const margin = 40;
    const tableWidth = pageWidth - (margin * 2);

    // Column widths: EA Code (auto), EA Name (*), Zone (*), SubZone (*)
    const codeWidth = 80;
    const remainingWidth = tableWidth - codeWidth;
    const nameWidth = remainingWidth / 3;
    const zoneWidth = remainingWidth / 3;
    const subZoneWidth = remainingWidth / 3;

    // Headers
    const headers = isUrban
      ? ['EA Code', 'EA Name', 'Thromde', 'LAP']
      : ['EA Code', 'EA Name', 'Gewog', 'Chiwog'];

    let x = margin;
    const widths = [codeWidth, nameWidth, zoneWidth, subZoneWidth];

    doc.font('Helvetica-Bold').fontSize(9);
    for (let i = 0; i < headers.length; i++) {
      // Draw filled rectangle for header background
      doc
        .rect(x, tableTop, widths[i], cellHeight)
        .fill('#34495e');
      // Draw text in white
      doc.fillColor('#ffffff');
      doc.text(headers[i], x + cellPadding, tableTop + cellPadding, {
        width: widths[i] - cellPadding * 2,
        align: 'left',
      });
      x += widths[i];
    }

    // Data rows
    doc.font('Helvetica').fontSize(8).fillColor('black');
    let currentY = tableTop + cellHeight;

    for (const ea of eas) {
      // Check if we need a new page
      if (currentY > 750) {
        doc.addPage();
        currentY = doc.page.margins.top;
        // Redraw headers on new page
        x = margin;
        doc.font('Helvetica-Bold').fontSize(9);
        for (let i = 0; i < headers.length; i++) {
          // Draw filled rectangle for header background
          doc
            .rect(x, currentY, widths[i], cellHeight)
            .fill('#34495e');
          // Draw text in white
          doc.fillColor('#ffffff');
          doc.text(headers[i], x + cellPadding, currentY + cellPadding, {
            width: widths[i] - cellPadding * 2,
            align: 'left',
          });
          x += widths[i];
        }
        currentY += cellHeight;
        doc.font('Helvetica').fontSize(8).fillColor('black');
      }

      const rowData = [
        ea.eaCode,
        ea.eaName,
        `${ea.administrativeZone.name} (${ea.administrativeZone.code})`,
        `${ea.subAdministrativeZone.name} (${ea.subAdministrativeZone.code})`,
      ];

      x = margin;
      for (let i = 0; i < rowData.length; i++) {
        doc
          .rect(x, currentY, widths[i], cellHeight)
          .stroke('#cccccc');
        doc.text(rowData[i], x + cellPadding, currentY + cellPadding, {
          width: widths[i] - cellPadding * 2,
          align: 'left',
        });
        x += widths[i];
      }

      currentY += cellHeight;
    }

    doc.y = currentY + 5;
  }
}
