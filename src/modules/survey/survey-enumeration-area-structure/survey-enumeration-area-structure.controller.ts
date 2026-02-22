import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Put,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { SurveyEnumerationAreaStructureService } from './survey-enumeration-area-structure.service';
import { CreateSurveyEnumerationAreaStructureDto } from './dto/create-survey-enumeration-area-structure.dto';
import { UpdateSurveyEnumerationAreaStructureDto } from './dto/update-survey-enumeration-area-structure.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from '../survey-enumeration-area-household-listing/dto/create-survey-enumeration-area-household-listing.dto';
import { SurveyEnumerationAreaHouseholdListingService } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.service';

@Controller('survey-enumeration-area-structure')
export class SurveyEnumerationAreaStructureController {
  constructor(
    private readonly structureService: SurveyEnumerationAreaStructureService,
    private readonly householdListingService: SurveyEnumerationAreaHouseholdListingService,
  ) {}

  /**
   * Create a new structure point
   * @access Admin, Supervisor, Enumerator
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createDto: CreateSurveyEnumerationAreaStructureDto) {
    return this.structureService.create(createDto);
  }


  /**
   * Get structure by ID
   * @access Admin, Supervisor, Enumerator
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.findOne(id);
  }

  /**
   * Get all structures with household listings for a survey enumeration area
   * 
   * Returns structures grouped with their associated household listings.
   * Perfect for displaying household listings grouped by structure in the UI.
   * 
   * @param seaId - Survey Enumeration Area ID
   * @returns Array of structures, each containing:
   *   - Structure details (id, structureNumber, latitude, longitude)
   *   - Household listings array (grouped by structure)
   *   - Survey enumeration area info
   * 
   * @example Response:
   * [
   *   {
   *     "id": 1,
   *     "structureNumber": "STR-0001",
   *     "latitude": 27.1234,
   *     "longitude": 89.5678,
   *     "householdListings": [
   *       {
   *         "id": 1,
   *         "householdSerialNumber": 1,
   *         "nameOfHOH": "John Doe",
   *         "totalMale": 2,
   *         "totalFemale": 3,
   *         ...
   *       }
   *     ]
   *   }
   * ]
   * 
   * @access Admin, Supervisor, Enumerator
   */
  @Get('survey-ea/structures/:seaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findBySurveyEnumerationArea(@Param('seaId', ParseIntPipe) seaId: number) {
    return this.structureService.findBySurveyEnumerationArea(seaId);
  }

  /**
   * Update a structure (partial update)
   * @access Admin, Supervisor, Enumerator
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSurveyEnumerationAreaStructureDto,
  ) {
    return this.structureService.update(id, updateDto);
  }

  /**
   * Update a structure (full update - same as PATCH)
   * @access Admin, Supervisor, Enumerator
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  updateWithPut(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateSurveyEnumerationAreaStructureDto,
  ) {
    return this.structureService.update(id, updateDto);
  }

  /**
   * Force delete a structure and all associated households (and their samples).
   * Use when you need to remove a structure regardless of household count.
   * @access Admin, Supervisor
   */
  @Delete(':id/force')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeForce(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.removeForce(id);
  }

  /**
   * Delete a structure (fails if it has associated households; use force route to delete anyway)
   * @access Admin, Supervisor
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR,UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.structureService.remove(id);
  }

  /**
   * Add a new household to an existing structure point
   * Creates a new household listing linked to the specified structure
   * @access Admin, Supervisor, Enumerator
   */
  @Post(':structureId/add-household')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  @HttpCode(HttpStatus.CREATED)
  async addHousehold(
    @Param('structureId', ParseIntPipe) structureId: number,
    @Body() householdDto: Omit<CreateSurveyEnumerationAreaHouseholdListingDto, 'structureId'>,
    @Request() req,
  ) {
    // Verify structure exists
    const structure = await this.structureService.findOne(structureId);

    // Create household listing with structureId from URL param
    const createDto: CreateSurveyEnumerationAreaHouseholdListingDto = {
      ...householdDto,
      structureId: structureId,
      surveyEnumerationAreaId: structure.surveyEnumerationAreaId,
    } as CreateSurveyEnumerationAreaHouseholdListingDto;

    return this.householdListingService.create(createDto);
  }
}

