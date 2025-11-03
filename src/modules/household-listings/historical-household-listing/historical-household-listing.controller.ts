import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { HistoricalHouseholdListingService } from './historical-household-listing.service';
import { CreateHistoricalHouseholdListingDto } from './dto/create-historical-household-listing.dto';
import { UpdateHistoricalHouseholdListingDto } from './dto/update-historical-household-listing.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('historical-household-listing')
export class HistoricalHouseholdListingController {
  constructor(
    private readonly historicalHouseholdListingService: HistoricalHouseholdListingService,
  ) {}

  /**
   * Create a new historical household listing
   * @access Protected - Admin, Supervisor, Enumerator
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  async create(
    @Body()
    createHistoricalHouseholdListingDto: CreateHistoricalHouseholdListingDto,
  ) {
    return this.historicalHouseholdListingService.create(
      createHistoricalHouseholdListingDto,
    );
  }

  /**
   * Get all historical household listings ordered by year ascending
   * @access Public
   * @query enumerationAreaId - Optional filter by enumeration area
   *
   * @example
   * GET /historical-household-listing
   * GET /historical-household-listing?enumerationAreaId=1
   */
  @Get()
  async findAll(@Query('enumerationAreaId') enumerationAreaId?: string) {
    if (enumerationAreaId) {
      return this.historicalHouseholdListingService.findByEnumerationArea(
        +enumerationAreaId,
      );
    }
    return this.historicalHouseholdListingService.findAll();
  }

  /**
   * Get historical household listings by enumeration area
   * @access Public
   * @param enumerationAreaId - Enumeration Area ID
   */
  @Get('by-enumeration-area/:enumerationAreaId')
  async findByEnumerationArea(
    @Param('enumerationAreaId') enumerationAreaId: string,
  ) {
    return this.historicalHouseholdListingService.findByEnumerationArea(
      +enumerationAreaId,
    );
  }

  /**
   * Get single historical household listing by ID
   * @access Public
   * @param id - Historical Household Listing ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.historicalHouseholdListingService.findOne(+id);
  }

  /**
   * Update historical household listing
   * @access Protected - Admin, Supervisor, Enumerator
   * @param id - Historical Household Listing ID
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  async update(
    @Param('id') id: string,
    @Body()
    updateHistoricalHouseholdListingDto: UpdateHistoricalHouseholdListingDto,
  ) {
    return this.historicalHouseholdListingService.update(
      +id,
      updateHistoricalHouseholdListingDto,
    );
  }

  /**
   * Remove historical household listing
   * @access Protected - Admin only
   * @param id - Historical Household Listing ID
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.historicalHouseholdListingService.remove(+id);
  }
}
