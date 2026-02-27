import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { HouseholdListingService } from './household-listing.service';
import { CreateHouseholdListingDto } from './dto/create-household-listing.dto';
import { UpdateHouseholdListingDto } from './dto/update-household-listing.dto';
import { BulkCreateHouseholdListingDto } from './dto/bulk-create-household-listing.dto';

@Controller('household-listings')
export class HouseholdListingController {
  constructor(
    private readonly householdListingService: HouseholdListingService,
  ) {}

  @Post()
  create(@Body() createHouseholdListingDto: CreateHouseholdListingDto) {
    return this.householdListingService.create(createHouseholdListingDto);
  }

  @Post('bulk')
  bulkCreate(@Body() body: BulkCreateHouseholdListingDto) {
    return this.householdListingService.bulkCreate(body.householdListings);
  }

  @Get()
  async findAll(
    @Query('eaId') eaId?: string,
    @Query('userId') userId?: string,
    @Query('structureId') structureId?: string,
  ) {
    const filters: { eaId?: number; userId?: number; structureId?: number } = {};
    if (eaId) {
      const n = parseInt(eaId, 10);
      if (isNaN(n)) throw new BadRequestException('Invalid eaId');
      filters.eaId = n;
    }
    if (userId) {
      const n = parseInt(userId, 10);
      if (isNaN(n)) throw new BadRequestException('Invalid userId');
      filters.userId = n;
    }
    if (structureId) {
      const n = parseInt(structureId, 10);
      if (isNaN(n)) throw new BadRequestException('Invalid structureId');
      filters.structureId = n;
    }
    return this.householdListingService.findAll(filters);
  }

  @Get('user/:userId')
  findByUser(@Param('userId', ParseIntPipe) userId: number) {
    return this.householdListingService.findByUser(userId);
  }

  @Get('structure/:structureId')
  findByStructure(@Param('structureId', ParseIntPipe) structureId: number) {
    return this.householdListingService.findByStructure(structureId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.householdListingService.findOne(id);
  }

  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHouseholdListingDto: UpdateHouseholdListingDto,
  ) {
    return this.householdListingService.update(id, updateHouseholdListingDto);
  }

  @Patch(':id')
  patch(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateHouseholdListingDto: UpdateHouseholdListingDto,
  ) {
    return this.householdListingService.update(id, updateHouseholdListingDto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.householdListingService.remove(id);
  }
}
