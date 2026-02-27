import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DzongkhagService } from './dzongkhag.service';

@Controller('dzongkhags')
export class DzongkhagController {
  constructor(private readonly dzongkhagService: DzongkhagService) {}

  @Get()
  findAll() {
    return this.dzongkhagService.findAll();
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.dzongkhagService.getStatistics(id);
  }

  @Get(':id/enumeration-areas')
  getEnumerationAreasByDzongkhag(@Param('id', ParseIntPipe) id: number) {
    return this.dzongkhagService.getEnumerationAreasByDzongkhag(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.dzongkhagService.findOne(id);
  }
}
