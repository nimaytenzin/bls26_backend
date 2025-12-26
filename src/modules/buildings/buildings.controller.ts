import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Query,
} from '@nestjs/common';
import { BuildingsService } from './buildings.service';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/entities/user.entity';

@Controller('buildings')
export class BuildingsController {
  constructor(private readonly buildingsService: BuildingsService) {}

  /**
   * Get buildings by enumeration area ID(s)
   * @access Public
   * @param enumerationAreaId - Enumeration Area ID(s) - can be a single ID or comma-separated IDs (e.g., "1,2,3")
   */
  @Get('by-enumeration-area/:enumerationAreaId')
  async findByEnumerationArea(
    @Param('enumerationAreaId') enumerationAreaId: string,
  ) {
    const eaIds = enumerationAreaId
      .split(',')
      .map((id) => +id.trim())
      .filter((id) => !isNaN(id) && id > 0);
    
    return this.buildingsService.findByEnumerationArea(eaIds);
  }

  /**
   * Get buildings as GeoJSON by enumeration area ID
   * @access Public
   * @param enumerationAreaId - Enumeration Area ID
   * @returns GeoJSON FeatureCollection
   */
  @Get('geojson/by-enumeration-area/:enumerationAreaId')
  async findAsGeoJsonByEnumerationArea(
    @Param('enumerationAreaId') enumerationAreaId: string,
  ) {
    return this.buildingsService.findAsGeoJsonByEnumerationArea(
      +enumerationAreaId,
    );
  }

  /**
   * Get all buildings as GeoJSON
   * @access Public
   * @returns GeoJSON FeatureCollection
   */
  @Get('geojson/all')
  async findAllAsGeoJson() {
    return this.buildingsService.findAllAsGeoJson();
  }

  /**
   * Get single building by ID
   * @access Public
   * @param id - Building ID
   */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.buildingsService.findOne(+id);
  }

  /**
   * Update building
   * @access Protected - Admin only
   * @param id - Building ID
   * @param updateBuildingDto - Update data
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateBuildingDto: UpdateBuildingDto,
  ) {
    return this.buildingsService.update(+id, updateBuildingDto);
  }
}
