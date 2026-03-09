import { Controller, Get, Param, Query } from '@nestjs/common';
import { TownService } from './town.service';

@Controller('towns')
export class TownController {
  constructor(private readonly townService: TownService) {}

  @Get()
  findAll(@Query('dzongkhagId') dzongkhagId?: string) {
    return this.townService.findAll(
      dzongkhagId ? parseInt(dzongkhagId) : undefined,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.townService.findOne(+id);
  }
}
