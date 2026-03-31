import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export interface ColumnDefinition {
  header: string;
  key: string;
  width?: number;
}

@Injectable()
export class ExcelService {
  /**
   * Tạo tệp Excel và trả về Buffer
   */
  async createExcelBuffer(
    columns: ColumnDefinition[],
    data: any[],
    sheetName = 'Sheet1',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    this.styleHeader(worksheet);

    worksheet.addRows(data);
    this.styleCells(worksheet);

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer as any);
  }

  /**
   * Gửi trực tiếp file Excel qua Response
   */
  async downloadExcel(
    res: Response,
    fileName: string,
    columns: ColumnDefinition[],
    data: any[],
    sheetName = 'Sheet1',
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(fileName)}.xlsx"`,
    );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((col) => ({
      header: col.header,
      key: col.key,
      width: col.width || 20,
    }));

    this.styleHeader(worksheet);

    data.forEach((item) => {
      worksheet.addRow(item);
    });

    this.styleCells(worksheet);

    await workbook.xlsx.write(res);
    res.end();
  }

  /**
   * Đọc file Excel từ Buffer và trả về mảng object
   */
  async parseExcel<T>(buffer: Buffer): Promise<T[]> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) return [];

    const data: T[] = [];
    const headers: Record<number, string> = {};

    // Lấy header từ dòng đầu tiên
    const headerRow = worksheet.getRow(1);
    headerRow.eachCell((cell, colNumber) => {
      headers[colNumber] = cell.text?.trim();
    });

    // Duyệt từ dòng thứ 2
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;

      const rowData: any = {};
      let hasData = false;
      row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        const header = headers[colNumber];
        if (header) {
          rowData[header] = cell.value;
          if (cell.value !== null && cell.value !== undefined) hasData = true;
        }
      });
      if (hasData) {
        data.push(rowData as T);
      }
    });

    return data;
  }

  private styleHeader(worksheet: ExcelJS.Worksheet) {
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0F766E' }, // Theme primary color
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
  }

  private styleCells(worksheet: ExcelJS.Worksheet) {
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
