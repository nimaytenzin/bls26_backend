import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { StructureService } from './structure.service';
import { CreateStructureDto } from './dto/create-structure.dto';
import { UpdateStructureDto } from './dto/update-structure.dto';
import { BulkCreateStructureDto } from './dto/bulk-create-structure.dto';

@Controller('structures')
export class StructureController {
  constructor(private readonly structureService: StructureService) {}

  @Post()
  create(@Body() createStructureDto: CreateStructureDto) {
    return this.structureService.create(createStructureDto);
  }

  @Post('bulk')
  bulkCreate(@Body() body: BulkCreateStructureDto) {
    return this.structureService.bulkCreate(body.structures);
  }

  @Get()
  findAll(@Query('enumerationAreaId') enumerationAreaId?: string) {
    const eaId = enumerationAreaId
      ? parseInt(enumerationAreaId, 10)
      : undefined;
    if (enumerationAreaId && isNaN(eaId)) {
      throw new BadRequestException('Invalid enumerationAreaId');
    }
    return this.structureService.findAll(eaId);
  }

  @Get(':id/next-structure-number')
  getNextStructureNumber(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.getNextStructureNumberForStructure(id);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStructureDto: UpdateStructureDto,
  ) {
    return this.structureService.update(id, updateStructureDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.remove(id);
  }
}
