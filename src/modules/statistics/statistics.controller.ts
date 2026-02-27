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
}
