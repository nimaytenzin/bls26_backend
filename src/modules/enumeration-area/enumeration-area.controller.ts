import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { EnumerationAreaService } from './enumeration-area.service';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { UpdateEnumerationAreaStatusDto } from './dto/update-enumeration-area-status.dto';
import { EnumerationAreaStatus } from './enums/enumeration-area-status.enum';

@Controller('enumeration-areas')
export class EnumerationAreaController {
  constructor(
    private readonly enumerationAreaService: EnumerationAreaService,
  ) {}

  @Post()
  create(@Body() createEnumerationAreaDto: CreateEnumerationAreaDto) {
    return this.enumerationAreaService.create(createEnumerationAreaDto);
  }

  @Get()
  async findAll(
    @Query('dzongkhagId') dzongkhagId?: string,
    @Query('status') status?: string,
  ) {
    let dzongkhagIdNum: number | undefined;
    if (dzongkhagId) {
      dzongkhagIdNum = parseInt(dzongkhagId, 10);
      if (isNaN(dzongkhagIdNum)) {
        throw new BadRequestException('Invalid dzongkhagId');
      }
    }
    let statusEnum: EnumerationAreaStatus | undefined;
    if (status && Object.values(EnumerationAreaStatus).includes(status as EnumerationAreaStatus)) {
      statusEnum = status as EnumerationAreaStatus;
    }
    return this.enumerationAreaService.findAll(dzongkhagIdNum, statusEnum);
  }

  @Get(':id/progress')
  getProgress(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.getProgress(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEnumerationAreaStatusDto,
  ) {
    return this.enumerationAreaService.updateStatus(id, dto.status);
  }

  @Patch(':id/geom')
  updateGeom(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.enumerationAreaService.updateGeom(id);
  }

  @Get('geom/update/all')
  updateAllGeom() {
    return this.enumerationAreaService.updateAllGeom();
  }

  @Post(':id/complete')
  complete(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.complete(id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
    
  ) {
    return this.enumerationAreaService.findOne(
      id,
      
    );
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.remove(id);
  }
}
