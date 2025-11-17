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
import { AdministrativeZoneService } from './administrative-zone.service';
import { CreateAdministrativeZoneDto } from './dto/create-administrative-zone.dto';
import { CreateAdministrativeZoneGeoJsonDto } from './dto/create-administrative-zone-geojson.dto';
import { UpdateAdministrativeZoneDto } from './dto/update-administrative-zone.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('administrative-zone')
export class AdministrativeZoneController {
  constructor(
    private readonly administrativeZoneService: AdministrativeZoneService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createAdministrativeZoneDto: CreateAdministrativeZoneDto,
  ) {
    return this.administrativeZoneService.create(createAdministrativeZoneDto);
  }

  @Post('geojson')
  async createFromGeoJson(
    @Body() geoJsonDto: CreateAdministrativeZoneGeoJsonDto,
  ) {
    return this.administrativeZoneService.createFromGeoJson(geoJsonDto);
  }

  @Get()
  async findAll(@Query('dzongkhagId') dzongkhagId?: string) {
    if (dzongkhagId) {
      return this.administrativeZoneService.findByDzongkhag(+dzongkhagId);
    }
    return this.administrativeZoneService.findAll();
  }

  @Get('by-dzongkhag/:id')
  async findByDzongkhag(@Param('id') dzongkhagId: string) {
    return this.administrativeZoneService.findByDzongkhag(+dzongkhagId);
  }

  @Get('geojson/by-dzongkhag/:dzongkhagId')
  async findAllAsGeoJsonByDzongkhag(@Param('dzongkhagId') dzongkhagId: string) {
    console.log('hi');
    return this.administrativeZoneService.findAllAsGeoJsonByDzongkhag(
      +dzongkhagId,
    );
  }

  @Get('geojson/all')
  async findAllAsGeoJson() {
    return this.administrativeZoneService.findAllAsGeoJson();
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('withoutGeom') withoutGeom?: string,
  ) {
    if (withoutGeom === 'true') {
      return this.administrativeZoneService.findOneWithoutGeom(+id);
    }
    return this.administrativeZoneService.findOne(+id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateAdministrativeZoneDto: UpdateAdministrativeZoneDto,
  ) {
    return this.administrativeZoneService.update(
      +id,
      updateAdministrativeZoneDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.administrativeZoneService.remove(+id);
  }
}
