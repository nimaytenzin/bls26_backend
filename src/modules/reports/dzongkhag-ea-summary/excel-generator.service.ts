import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { DzongkhagEaSummaryResponse } from './dzongkhag-ea-summary.dto';

@Injectable()
export class ExcelGeneratorService {
  /**
   * Generate Excel workbook buffer from report data
   */
  async generateExcel(reportData: DzongkhagEaSummaryResponse): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    // Sheet 1: Summary
    this.createSummarySheet(workbook, reportData);

    // Sheet 2: Hierarchy
    this.createHierarchySheet(workbook, reportData);

    // Sheet 3: EAs by Gewog
    this.createEAsByGewogSheet(workbook, reportData);

    // Sheet 4: All EAs
    this.createAllEAsSheet(workbook, reportData);

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  /**
   * Create Summary sheet
   */
  private createSummarySheet(
    workbook: ExcelJS.Workbook,
    reportData: DzongkhagEaSummaryResponse,
  ): void {
    const worksheet = workbook.addWorksheet('Summary');

    // Dzongkhag Information
    worksheet.addRow(['Dzongkhag EA Summary Report']);
    worksheet.addRow(['Generated:', new Date(reportData.generatedAt).toLocaleString()]);
    worksheet.addRow([]);
    worksheet.addRow(['Dzongkhag Information']);
    worksheet.addRow(['Name:', reportData.dzongkhag.name]);
    worksheet.addRow(['Code:', reportData.dzongkhag.code]);
    worksheet.addRow([]);

    // Summary Statistics
    worksheet.addRow(['Summary Statistics']);
    worksheet.addRow(['Total Gewogs:', reportData.summary.totalGewogs]);
    worksheet.addRow(['Total Chiwogs:', reportData.summary.totalChiwogs]);
    worksheet.addRow(['Total Enumeration Areas:', reportData.summary.totalEAs]);
    if (reportData.summary.totalHouseholds) {
      worksheet.addRow(['Total Households:', reportData.summary.totalHouseholds]);
    }
    if (reportData.summary.totalPopulation) {
      worksheet.addRow(['Total Population:', reportData.summary.totalPopulation]);
    }

    // Style header
    worksheet.getRow(1).font = { bold: true, size: 14 };
    worksheet.getRow(4).font = { bold: true };
    worksheet.getRow(9).font = { bold: true };

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = 25;
    });
  }

  /**
   * Create Hierarchy sheet
   */
  private createHierarchySheet(
    workbook: ExcelJS.Workbook,
    reportData: DzongkhagEaSummaryResponse,
  ): void {
    const worksheet = workbook.addWorksheet('Hierarchy');

    // Headers
    worksheet.columns = [
      { header: 'Level', key: 'level', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Code', key: 'code', width: 20 },
      { header: 'Parent Code', key: 'parentCode', width: 20 },
      { header: 'EA Count', key: 'eaCount', width: 12 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    let rowNumber = 2;

    // Add Dzongkhag
    worksheet.addRow({
      level: 'Dzongkhag',
      name: reportData.dzongkhag.name,
      code: reportData.dzongkhag.code,
      parentCode: '',
      eaCount: reportData.summary.totalEAs,
    });
    rowNumber++;

    // Add Gewogs and Chiwogs
    for (const gewog of reportData.gewogs) {
      worksheet.addRow({
        level: 'Gewog',
        name: gewog.name,
        code: gewog.code,
        parentCode: reportData.dzongkhag.code,
        eaCount: gewog.summary.totalEAs,
      });
      rowNumber++;

      for (const chiwog of gewog.chiwogs) {
        worksheet.addRow({
          level: 'Chiwog',
          name: chiwog.name,
          code: chiwog.code,
          parentCode: gewog.code,
          eaCount: chiwog.summary.totalEAs,
        });
        rowNumber++;

        // Add EAs
        for (const ea of chiwog.enumerationAreas) {
          worksheet.addRow({
            level: 'EA',
            name: ea.name,
            code: ea.code,
            parentCode: chiwog.code,
            eaCount: '',
          });
          rowNumber++;
        }
      }
    }

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  /**
   * Create EAs by Gewog sheet
   */
  private createEAsByGewogSheet(
    workbook: ExcelJS.Workbook,
    reportData: DzongkhagEaSummaryResponse,
  ): void {
    const worksheet = workbook.addWorksheet('EAs by Gewog');

    // Headers
    worksheet.columns = [
      { header: 'Gewog Name', key: 'gewogName', width: 20 },
      { header: 'Gewog Code', key: 'gewogCode', width: 15 },
      { header: 'Chiwog Name', key: 'chiwogName', width: 20 },
      { header: 'Chiwog Code', key: 'chiwogCode', width: 15 },
      { header: 'EA Name', key: 'eaName', width: 25 },
      { header: 'EA Code', key: 'eaCode', width: 15 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    let rowNumber = 2;

    // Add data grouped by Gewog
    for (const gewog of reportData.gewogs) {
      // Add summary row for gewog
      const gewogRow = worksheet.addRow({
        gewogName: `${gewog.name} - Summary`,
        gewogCode: gewog.code,
        chiwogName: `Total Chiwogs: ${gewog.summary.totalChiwogs}`,
        chiwogCode: `Total EAs: ${gewog.summary.totalEAs}`,
        eaName: '',
        eaCode: '',
      });
      gewogRow.font = { bold: true, color: { argb: 'FF2C3E50' } };
      gewogRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFECF0F1' },
      };
      rowNumber++;

      // Add chiwogs and EAs
      for (const chiwog of gewog.chiwogs) {
        for (const ea of chiwog.enumerationAreas) {
          const row = worksheet.addRow({
            gewogName: gewog.name,
            gewogCode: gewog.code,
            chiwogName: chiwog.name,
            chiwogCode: chiwog.code,
            eaName: ea.name,
            eaCode: ea.code,
          });

          // Alternate row colors
          if (rowNumber % 2 === 0) {
            row.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF9F9F9' },
            };
          }
          rowNumber++;
        }
      }

      // Add empty row between gewogs
      worksheet.addRow({});
      rowNumber++;
    }

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }

  /**
   * Create All EAs sheet
   */
  private createAllEAsSheet(
    workbook: ExcelJS.Workbook,
    reportData: DzongkhagEaSummaryResponse,
  ): void {
    const worksheet = workbook.addWorksheet('All EAs');

    // Headers
    worksheet.columns = [
      { header: 'EA Name', key: 'eaName', width: 25 },
      { header: 'EA Code', key: 'eaCode', width: 15 },
      { header: 'Gewog', key: 'gewog', width: 20 },
      { header: 'Chiwog', key: 'chiwog', width: 20 },
    ];

    // Style header
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    // Freeze header
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Collect all EAs and sort
    const allEAs: Array<{
      eaName: string;
      eaCode: string;
      gewog: string;
      chiwog: string;
    }> = [];

    for (const gewog of reportData.gewogs) {
      for (const chiwog of gewog.chiwogs) {
        for (const ea of chiwog.enumerationAreas) {
          allEAs.push({
            eaName: ea.name,
            eaCode: ea.code,
            gewog: gewog.name,
            chiwog: chiwog.name,
          });
        }
      }
    }

    // Sort by gewog, then chiwog, then EA code
    allEAs.sort((a, b) => {
      if (a.gewog !== b.gewog) return a.gewog.localeCompare(b.gewog);
      if (a.chiwog !== b.chiwog) return a.chiwog.localeCompare(b.chiwog);
      return a.eaCode.localeCompare(b.eaCode);
    });

    // Add rows
    let rowNumber = 2;
    for (const ea of allEAs) {
      const row = worksheet.addRow(ea);

      // Alternate row colors
      if (rowNumber % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9F9F9' },
        };
      }
      rowNumber++;
    }

    // Add borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });
  }
}
