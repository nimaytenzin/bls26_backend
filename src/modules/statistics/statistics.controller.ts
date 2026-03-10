import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { StatisticsService } from './statistics.service';

@Controller('statistics')
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  @Get('enumerator/:userId')
  getEnumeratorStats(@Param('userId', ParseIntPipe) userId: number) {
    return this.statisticsService.getEnumeratorStats(userId);
  }

  @Get('export')
  async exportData(
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    const data = await this.statisticsService.exportData(fmt);
    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="household-listings-${Date.now()}.csv"`,
      );
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Get('download/ea-summary')
  async downloadEaSummary(
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('dzongkhagId') dzongkhagId?: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    const dzId =
      dzongkhagId != null ? Number.parseInt(dzongkhagId, 10) : undefined;

    const data = await this.statisticsService.exportEaSummary({
      dzongkhagId: Number.isNaN(dzId) ? undefined : dzId,
      format: fmt,
    });

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ea-summary-${Date.now()}.csv"`,
      );
      res.send(data);
    } else {
      res.json(data);
    }
  }

  @Get('download/households')
  async downloadHouseholds(
    @Res() res: Response,
    @Query('format') format?: string,
    @Query('dzongkhagId') dzongkhagId?: string,
    @Query('eaId') eaId?: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    const dzId =
      dzongkhagId != null ? Number.parseInt(dzongkhagId, 10) : undefined;
    const ea =
      eaId != null ? Number.parseInt(eaId, 10) : undefined;

    const data = await this.statisticsService.exportHouseholdDetails({
      dzongkhagId: Number.isNaN(dzId) ? undefined : dzId,
      eaId: Number.isNaN(ea) ? undefined : ea,
      format: fmt,
    });

    if (fmt === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="households-${Date.now()}.csv"`,
      );
      res.send(data);
    } else {
      res.json(data);
    }
  }
}
