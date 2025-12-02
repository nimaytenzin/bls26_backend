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
   * Get structures for a specific survey enumeration area
   * @access Admin, Supervisor, Enumerator
   */
  @Get('survey-ea/structures/:seaId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findBySurveyEnumerationArea(@Param('seaId', ParseIntPipe) seaId: number) {
    return this.structureService.findBySurveyEnumerationArea(seaId);
  }

  /**
   * Update a structure
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
   * Delete a structure
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

