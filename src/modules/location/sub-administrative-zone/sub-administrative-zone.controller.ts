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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { SubAdministrativeZoneService } from './sub-administrative-zone.service';
import { CreateSubAdministrativeZoneDto } from './dto/create-sub-administrative-zone.dto';
import { CreateSubAdministrativeZoneGeoJsonDto } from './dto/create-sub-administrative-zone-geojson.dto';
import { UpdateSubAdministrativeZoneDto } from './dto/update-sub-administrative-zone.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('sub-administrative-zone')
export class SubAdministrativeZoneController {
  constructor(
    private readonly subAdministrativeZoneService: SubAdministrativeZoneService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(
    @Body() createSubAdministrativeZoneDto: CreateSubAdministrativeZoneDto,
  ) {
    return this.subAdministrativeZoneService.create(
      createSubAdministrativeZoneDto,
    );
  }

  @Post('geojson')
  async createFromGeoJson(
    @Body() geoJsonDto: CreateSubAdministrativeZoneGeoJsonDto,
  ) {
    return this.subAdministrativeZoneService.createFromGeoJson(geoJsonDto);
  }

  @Post('upload-geojson/:subAdministrativeZoneId')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'application/json' ||
          file.mimetype === 'application/geo+json' ||
          file.originalname.endsWith('.geojson') ||
          file.originalname.endsWith('.json')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only .json or .geojson files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  async uploadGeoJsonFile(
    @Param('subAdministrativeZoneId') subAdministrativeZoneId: string,
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse the GeoJSON file
      const geoJsonData = JSON.parse(file.buffer.toString('utf-8'));

      let geometry;

      // Handle different GeoJSON formats
      if (geoJsonData.type === 'Feature' && geoJsonData.geometry) {
        // Single Feature
        geometry = geoJsonData.geometry;
      } else if (
        geoJsonData.type === 'FeatureCollection' &&
        geoJsonData.features &&
        geoJsonData.features.length > 0
      ) {
        // FeatureCollection - use the first feature's geometry
        geometry = geoJsonData.features[0].geometry;
      } else if (
        geoJsonData.type &&
        [
          'Point',
          'LineString',
          'Polygon',
          'MultiPoint',
          'MultiLineString',
          'MultiPolygon',
          'GeometryCollection',
        ].includes(geoJsonData.type)
      ) {
        // Direct Geometry object
        geometry = geoJsonData;
      } else {
        throw new BadRequestException(
          'Invalid GeoJSON format. Must be a Feature, FeatureCollection, or Geometry object.',
        );
      }

      if (!geometry) {
        throw new BadRequestException(
          'No geometry found in the uploaded file.',
        );
      }

      const result = await this.subAdministrativeZoneService.updateGeometry(
        +subAdministrativeZoneId,
        geometry,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }

  @Get()
  async findAll(@Query('administrativeZoneId') administrativeZoneId?: string) {
    if (administrativeZoneId) {
      return this.subAdministrativeZoneService.findByAdministrativeZone(
        +administrativeZoneId,
      );
    }
    return this.subAdministrativeZoneService.findAll();
  }

  @Get('by-administrative-zone/:administrativeZoneId')
  async findByAdministrativeZone(
    @Param('administrativeZoneId') administrativeZoneId: string,
  ) {
    return this.subAdministrativeZoneService.findByAdministrativeZone(
      +administrativeZoneId,
    );
  }

  @Get('geojson/by-administrative-zone/:administrativeZoneId')
  async findAllAsGeoJsonByAdministrativeZone(
    @Param('administrativeZoneId') administrativeZoneId: string,
  ) {
    return this.subAdministrativeZoneService.findAllAsGeoJsonByAdministrativeZone(
      +administrativeZoneId,
    );
  }

  @Get('geojson/all')
  async findAllAsGeoJson() {
    return this.subAdministrativeZoneService.findAllAsGeoJson();
  }

  /**
   * Get single sub-administrative zone as GeoJSON
   * @access Public
   * @param id - Sub-administrative zone ID
   * @returns GeoJSON Feature
   */
  @Get('geojson/:id')
  async findOneAsGeoJson(@Param('id') id: string) {
    return this.subAdministrativeZoneService.findOneAsGeoJson(+id);
  }

  /**
   * Get single sub-administrative zone by ID
   * @param id - Sub-administrative zone ID
   * @param withoutGeom - Exclude geometry data (default: false)
   * @param includeEnumerationAreas - Include enumeration areas (default: false)
   *
   * @example
   * GET /sub-administrative-zone/1
   * GET /sub-administrative-zone/1?withoutGeom=true
   * GET /sub-administrative-zone/1?includeEnumerationAreas=true
   * GET /sub-administrative-zone/1?withoutGeom=true&includeEnumerationAreas=true
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('withoutGeom') withoutGeom?: string,
    @Query('includeEnumerationAreas') includeEnumerationAreas?: string,
  ) {
    const includeEAs = includeEnumerationAreas === 'true';

    if (withoutGeom === 'true') {
      return this.subAdministrativeZoneService.findOneWithoutGeom(
        +id,
        includeEAs,
      );
    }
    return this.subAdministrativeZoneService.findOne(+id, includeEAs);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateSubAdministrativeZoneDto: UpdateSubAdministrativeZoneDto,
  ) {
    return this.subAdministrativeZoneService.update(
      +id,
      updateSubAdministrativeZoneDto,
    );
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.subAdministrativeZoneService.remove(+id);
  }
}
