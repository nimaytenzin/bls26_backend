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
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { EnumerationAreaService } from './enumeration-area.service';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { CreateEnumerationAreaGeoJsonDto } from './dto/create-enumeration-area-geojson.dto';
import { UpdateEnumerationAreaDto } from './dto/update-enumeration-area.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('enumeration-area')
export class EnumerationAreaController {
  constructor(
    private readonly enumerationAreaService: EnumerationAreaService,
  ) {}

  // ============ PUBLIC ROUTES (Read-only) ============

  /**
   * Get all enumeration areas
   * @access Public
   * @query withGeom - Include geometry (default: false)
   * @query subAdministrativeZoneId - Filter by sub-administrative zone
   * @query includeSubAdminZone - Include parent sub-administrative zone (default: false)
   *
   * @example
   * GET /enumeration-area
   * GET /enumeration-area?withGeom=true
   * GET /enumeration-area?subAdministrativeZoneId=1
   * GET /enumeration-area?includeSubAdminZone=true
   */
  @Get()
  async findAll(
    @Query('withGeom') withGeom?: string,
    @Query('subAdministrativeZoneId') subAdministrativeZoneId?: string,
    @Query('includeSubAdminZone') includeSubAdminZone?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeSubAdmin = includeSubAdminZone === 'true';

    if (subAdministrativeZoneId) {
      const sazId = parseInt(subAdministrativeZoneId, 10);
      if (isNaN(sazId)) {
        throw new BadRequestException('Invalid subAdministrativeZoneId parameter');
      }
      return this.enumerationAreaService.findBySubAdministrativeZone(
        sazId,
        includeGeom,
        includeSubAdmin,
      );
    }
    return this.enumerationAreaService.findAll(includeGeom, includeSubAdmin);
  }

  /**
   * Get all enumeration areas as GeoJSON
   * @access Public
   * @returns GeoJSON FeatureCollection
   */
  @Get('geojson/all')
  async findAllAsGeoJson() {
    return this.enumerationAreaService.findAllAsGeoJson();
  }

  /**
   * Get single enumeration area as GeoJSON
   * @access Public
   * @param id - Enumeration Area ID
   * @returns GeoJSON Feature
   */
  @Get('geojson/:id')
  async findOneAsGeoJson(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.findOneAsGeoJson(id);
  }

  /**
   * Get single enumeration area by ID
   * @access Public
   * @param id - Enumeration Area ID
   * @query withGeom - Include geometry (default: false)
   * @query includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
   *
   * @example
   * GET /enumeration-area/1
   * GET /enumeration-area/1?withGeom=true
   * GET /enumeration-area/1?includeSubAdminZone=true
   */
  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @Query('withGeom') withGeom?: string,
    @Query('includeSubAdminZone') includeSubAdminZone?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeSubAdmin = includeSubAdminZone === 'true';

    return this.enumerationAreaService.findOne(
      id,
      includeGeom,
      includeSubAdmin,
    );
  }

  // ============ AADMIN ROUTES (Protected) ============

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createEnumerationAreaDto: CreateEnumerationAreaDto) {
    return this.enumerationAreaService.create(createEnumerationAreaDto);
  }

  @Post('geojson')
  async createFromGeoJson(@Body() geoJsonDto: CreateEnumerationAreaGeoJsonDto) {
    return this.enumerationAreaService.createFromGeoJson(geoJsonDto);
  }

  @Post('bulk-upload-geojson')
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
  async bulkUploadGeoJson(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    try {
      // Parse the GeoJSON file
      const geoJsonData = JSON.parse(file.buffer.toString('utf-8'));

      // Validate it's a FeatureCollection
      if (geoJsonData.type !== 'FeatureCollection') {
        throw new BadRequestException(
          'Invalid GeoJSON format. Must be a FeatureCollection.',
        );
      }

      if (!geoJsonData.features || geoJsonData.features.length === 0) {
        throw new BadRequestException(
          'FeatureCollection contains no features.',
        );
      }

      // Process the bulk upload
      const result = await this.enumerationAreaService.bulkCreateFromGeoJson(
        geoJsonData.features,
      );

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }

  /**
   * Migrate existing subAdministrativeZoneId relationships to junction table
   * This endpoint is idempotent - safe to run multiple times
   * @access Admin only
   * @returns Migration statistics
   */
  @Post('migrate-to-junction-table')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async migrateToJunctionTable() {
    return this.enumerationAreaService.migrateToJunctionTable();
  }

  @Post('upload-geojson/:enumerationAreaId')
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
    @Param('enumerationAreaId', ParseIntPipe) enumerationAreaId: number,
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

      const result = await this.enumerationAreaService.updateGeometry(
        enumerationAreaId,
        geometry,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }

  @Get('by-sub-administrative-zone/:subAdministrativeZoneId')
  async findBySubAdministrativeZone(
    @Param('subAdministrativeZoneId', ParseIntPipe) subAdministrativeZoneId: number,
  ) {
    return this.enumerationAreaService.findBySubAdministrativeZone(
      subAdministrativeZoneId,
    );
  }

  @Get('geojson/by-sub-administrative-zone/:subAdministrativeZoneId')
  async findAllAsGeoJsonBySubAdministrativeZone(
    @Param('subAdministrativeZoneId', ParseIntPipe) subAdministrativeZoneId: number,
  ) {
    return this.enumerationAreaService.findAllAsGeoJsonBySubAdministrativeZone(
      subAdministrativeZoneId,
    );
  }

  /**
   * Get enumeration areas by administrative zone
   * @access Public
   * @param administrativeZoneId - Administrative Zone ID
   * @query withGeom - Include geometry (default: false)
   * @query includeSubAdminZone - Include parent sub-administrative zone (default: false)
   *
   * @example
   * GET /enumeration-area/by-administrative-zone/1
   * GET /enumeration-area/by-administrative-zone/1?withGeom=true
   * GET /enumeration-area/by-administrative-zone/1?includeSubAdminZone=true
   */
  @Get('by-administrative-zone/:administrativeZoneId')
  async findByAdministrativeZone(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @Query('withGeom') withGeom?: string,
    @Query('includeSubAdminZone') includeSubAdminZone?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeSubAdmin = includeSubAdminZone === 'true';

    return this.enumerationAreaService.findByAdministrativeZone(
      administrativeZoneId,
      includeGeom,
      includeSubAdmin,
    );
  }

  /**
   * Get enumeration areas by administrative zone as GeoJSON
   * @access Public
   * @param administrativeZoneId - Administrative Zone ID
   * @returns GeoJSON FeatureCollection
   */
  @Get('geojson/by-administrative-zone/:administrativeZoneId')
  async findAllAsGeoJsonByAdministrativeZone(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
  ) {
    return this.enumerationAreaService.findAllAsGeoJsonByAdministrativeZone(
      administrativeZoneId,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateEnumerationAreaDto: UpdateEnumerationAreaDto,
  ) {
    return this.enumerationAreaService.update(id, updateEnumerationAreaDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.remove(id);
  }

}
