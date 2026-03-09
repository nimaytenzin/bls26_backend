import { Controller, Get, Param, Query } from '@nestjs/common';
import { LapService } from './lap.service';

@Controller('laps')
export class LapController {
  constructor(private readonly lapService: LapService) {}

  @Get()
  findAll(@Query('townId') townId?: string) {
    return this.lapService.findAll(townId ? parseInt(townId) : undefined);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.lapService.findOne(+id);
  }
}
