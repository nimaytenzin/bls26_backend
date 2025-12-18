import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { GeographicStatisticalCodeResponse } from './geographic-statistical-code.dto';

@Injectable()
export class ExcelGeneratorService {
  /**
   * Generate Excel workbook buffer from report data
   */
  async generateExcel(reportData: GeographicStatisticalCodeResponse): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Geographic Statistical Code Report');

    // Set up columns
    worksheet.columns = [
      { header: 'Dzongkhag Name', key: 'dzongkhagName', width: 20 },
      { header: 'Dzongkhag Code', key: 'dzongkhagCode', width: 15 },
      { header: 'Type', key: 'type', width: 10 },
      { header: 'Gewog/Thromde', key: 'adminZone', width: 20 },
      { header: 'GewogCode/ThromdeCode', key: 'adminZoneCode', width: 20 },
      { header: 'Chiwog/LAP', key: 'subAdminZone', width: 20 },
      { header: 'ChiwogCode/LAPCode', key: 'subAdminZoneCode', width: 20 },
      { header: 'EA Name', key: 'eaName', width: 25 },
      { header: 'EA Code', key: 'eaCode', width: 15 },
    ];

    // Style header row
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF3498DB' },
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    headerRow.height = 25;

    // Freeze header row
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    let rowNumber = 2;

    // Process each dzongkhag
    for (const dzongkhag of reportData.dzongkhags) {
      // Add summary row for dzongkhag
      const summaryRow = worksheet.addRow({
        dzongkhagName: `${dzongkhag.name} - Summary`,
        dzongkhagCode: dzongkhag.code,
        type: 'Summary',
        adminZone: `Gewogs: ${dzongkhag.summary.totalGewogs}, Thromdes: ${dzongkhag.summary.totalThromdes}`,
        adminZoneCode: `Chiwogs: ${dzongkhag.summary.totalChiwogs}, LAPs: ${dzongkhag.summary.totalLaps}`,
        subAdminZone: `Total EAs: ${dzongkhag.summary.totalEAs}`,
        subAdminZoneCode: `Urban: ${dzongkhag.summary.urbanEAs}, Rural: ${dzongkhag.summary.ruralEAs}`,
        eaName: '',
        eaCode: '',
      });

      summaryRow.font = { bold: true, color: { argb: 'FF2C3E50' } };
      summaryRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFECF0F1' },
      };
      rowNumber++;

      // Add Urban EAs
      for (const ea of dzongkhag.urbanEAs) {
        const row = worksheet.addRow({
          dzongkhagName: dzongkhag.name,
          dzongkhagCode: dzongkhag.code,
          type: 'Urban',
          adminZone: ea.administrativeZone.name,
          adminZoneCode: ea.administrativeZone.code,
          subAdminZone: ea.subAdministrativeZone.name,
          subAdminZoneCode: ea.subAdministrativeZone.code,
          eaName: ea.eaName,
          eaCode: ea.eaCode,
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

      // Add Rural EAs
      for (const ea of dzongkhag.ruralEAs) {
        const row = worksheet.addRow({
          dzongkhagName: dzongkhag.name,
          dzongkhagCode: dzongkhag.code,
          type: 'Rural',
          adminZone: ea.administrativeZone.name,
          adminZoneCode: ea.administrativeZone.code,
          subAdminZone: ea.subAdministrativeZone.name,
          subAdminZoneCode: ea.subAdministrativeZone.code,
          eaName: ea.eaName,
          eaCode: ea.eaCode,
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

      // Add empty row between dzongkhags
      worksheet.addRow({});
      rowNumber++;
    }

    // Add borders to all cells with data
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    });

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}

