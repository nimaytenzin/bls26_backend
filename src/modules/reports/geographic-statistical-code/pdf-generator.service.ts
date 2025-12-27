import { Injectable } from '@nestjs/common';
import { GeographicStatisticalCodeResponse } from './geographic-statistical-code.dto';
import * as path from 'path';
import * as fs from 'fs';

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
          size: 'A4', // A4 size: 210mm x 297mm (8.27" x 11.69")
          margins: {
            top: 50,
            bottom: 50,
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
          // Add cover page first
          this.buildCoverPage(doc);
          // Then add main content
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
   * Build cover page - ensures content fits on single A4 page
   */
  private buildCoverPage(doc: PDFKit.PDFDocument): void {
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const topMargin = 50;
    const bottomMargin = 50;
    const availableHeight = pageHeight - topMargin - bottomMargin;

    // Get current month and year
    const now = new Date();
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const currentMonthYear = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

    // Start from top margin
    let currentY = topMargin;

    // Add NSB logo
    try {
      const logoPath = path.join(process.cwd(), 'fonts', 'logo.png');
      if (fs.existsSync(logoPath)) {
        // Center logo horizontally
        const logoWidth = 100; // Reduced from 120 to fit better
        const logoHeight = 100; // Reduced from 120 to fit better
        const logoX = (pageWidth - logoWidth) / 2;
        const logoY = currentY;

        doc.image(logoPath, logoX, logoY, {
          width: logoWidth,
          height: logoHeight,
          fit: [logoWidth, logoHeight],
        });

        // Move down after logo
        currentY = logoY + logoHeight + 30; // Reduced spacing from 40 to 30
      } else {
        // If logo not found, start from top margin
        currentY = topMargin + 20;
      }
    } catch (error) {
      // If logo loading fails, continue without it
      currentY = topMargin + 20;
    }

    // Set Y position for text
    doc.y = currentY;

    // Title: BHUTAN STANDARD STATISTICAL GEOGRAPHIC CODE
    // Reduced font size slightly and spacing to ensure it fits
    doc
      .fontSize(22) // Reduced from 24
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('BHUTAN STANDARD', {
        align: 'center',
      })
      .moveDown(0.4); // Reduced from 0.5

    doc
      .fontSize(22) // Reduced from 24
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('STATISTICAL GEOGRAPHIC', {
        align: 'center',
      })
      .moveDown(0.4); // Reduced from 0.5

    doc
      .fontSize(22) // Reduced from 24
      .font('Helvetica-Bold')
      .fillColor('#2c3e50')
      .text('CODE', {
        align: 'center',
      })
      .moveDown(1.5); // Reduced from 2

    // Current month and year
    doc
      .fontSize(13) // Reduced from 14
      .font('Helvetica')
      .fillColor('#34495e')
      .text(currentMonthYear, {
        align: 'center',
      })
      .moveDown(2); // Reduced from 3

    // Footer: National Statistics Bureau, Royal Government of Bhutan, www.nsb.gov.bt
    // Position footer at bottom margin
    const footerY = pageHeight - bottomMargin - 50; // Reserve 50px for footer content
    doc.y = footerY;
    
    doc
      .fontSize(10) // Reduced from 11
      .font('Helvetica')
      .fillColor('#34495e')
      .text('National Statistics Bureau', {
        align: 'center',
      })
      .moveDown(0.25); // Reduced from 0.3

    doc
      .fontSize(10) // Reduced from 11
      .font('Helvetica')
      .fillColor('#34495e')
      .text('Royal Government of Bhutan', {
        align: 'center',
      })
      .moveDown(0.25); // Reduced from 0.3

    doc
      .fontSize(10) // Reduced from 11
      .font('Helvetica')
      .fillColor('#2980b9')
      .text('www.nsb.gov.bt', {
        align: 'center',
      });

    // Ensure we don't exceed page height - add new page for main content
    // Check if content would exceed page, if so, adjust
    if (doc.y > pageHeight - bottomMargin) {
      // If footer would exceed, move it up slightly
      doc.y = pageHeight - bottomMargin - 40;
    }

    // Add new page for main content
    doc.addPage();
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

      // Add spacing above Dzongkhag title
      doc.moveDown(1);

      // Dzongkhag header - Format: "Bumthang | Dzongkhag Code 01" - Left aligned
      doc
        .fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#2980b9')
        .text(`${dz.name} | Dzongkhag Code ${dz.code}`, { align: 'left' })
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
   * Build EA table with dynamic columns: Thromde/Gewog, Thromde/Gewog Code, Chiwog/LAP, Chiwog/LAP Code, EA, EA Code
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

    // Determine column headers based on type (dynamic)
    const adminZoneLabel = isUrban ? 'Thromde' : 'Gewog';
    const adminZoneCodeLabel = isUrban ? 'Thromde Code' : 'Gewog Code';
    const subZoneLabel = isUrban ? 'LAP' : 'Chiwog';
    const subZoneCodeLabel = isUrban ? 'LAP Code' : 'Chiwog Code';

    // Column widths: 6 columns total
    // Thromde/Gewog, Thromde/Gewog Code, Chiwog/LAP, Chiwog/LAP Code, EA, EA Code
    const columnWidth = tableWidth / 6;
    const widths = [
      columnWidth, // Thromde/Gewog
      columnWidth, // Thromde/Gewog Code
      columnWidth, // Chiwog/LAP
      columnWidth, // Chiwog/LAP Code
      columnWidth, // EA
      columnWidth, // EA Code
    ];

    // Headers
    const headers = [
      adminZoneLabel,
      adminZoneCodeLabel,
      subZoneLabel,
      subZoneCodeLabel,
      'EA',
      'EA Code',
    ];

    let x = margin;

    doc.font('Helvetica-Bold').fontSize(9);
    for (let i = 0; i < headers.length; i++) {
      // Draw filled rectangle for header background
      doc
        .rect(x, tableTop, widths[i], cellHeight)
        .fill('#34495e');
      // Draw text in white - all headers left-aligned
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
          // Draw text in white - all headers left-aligned
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

      // Row data: Thromde/Gewog, Thromde/Gewog Code, Chiwog/LAP, Chiwog/LAP Code, EA, EA Code
      const rowData = [
        ea.administrativeZone.name, // Thromde/Gewog
        ea.administrativeZone.code, // Thromde/Gewog Code
        ea.subAdministrativeZone.name, // Chiwog/LAP
        ea.subAdministrativeZone.code, // Chiwog/LAP Code
        ea.eaName, // EA
        ea.eaCode, // EA Code
      ];

      x = margin;
      for (let i = 0; i < rowData.length; i++) {
        doc
          .rect(x, currentY, widths[i], cellHeight)
          .stroke('#cccccc');
        // EA column (index 4) should be right-aligned
        const textAlign = i === 4 ? 'right' : 'left';
        doc.text(String(rowData[i]), x + cellPadding, currentY + cellPadding, {
          width: widths[i] - cellPadding * 2,
          align: textAlign,
        });
        x += widths[i];
      }

      currentY += cellHeight;
    }

    doc.y = currentY + 5;
  }
}
