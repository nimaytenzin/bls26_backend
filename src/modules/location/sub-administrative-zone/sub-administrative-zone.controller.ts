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
  NotFoundException,
  ParseIntPipe,
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createFromGeoJson(
    @Body() geoJsonDto: CreateSubAdministrativeZoneGeoJsonDto,
  ) {
    return this.subAdministrativeZoneService.createFromGeoJson(geoJsonDto);
  }

  /**
   * Bulk upload sub-administrative zones from GeoJSON file by administrative zone
   * Accepts a GeoJSON FeatureCollection file and processes all features
   * @param administrativeZoneId - Administrative Zone ID
   * @param file - GeoJSON file (FeatureCollection)
   * @access Admin only
   */
  @Post('bulk-upload-geojson/by-administrative-zone/:administrativeZoneId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  async bulkUploadGeoJsonByAdministrativeZone(
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
    @UploadedFile() file: any,
  ) {
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

      // Process the bulk upload with administrativeZoneId
      const result =
        await this.subAdministrativeZoneService.bulkCreateFromGeoJson(
          geoJsonData.features,
          administrativeZoneId,
        );

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
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

  /**
   * Upload single SAZ with EA (EA1) via multipart form data
   * 
   * Creates a Sub-Administrative Zone and its corresponding Enumeration Area in one operation.
   * The EA is created with hardcoded values: name="EA1", areaCode="01", areaSqKm=22.22
   * Both SAZ and EA share the same geometry from the uploaded GeoJSON file.
   * 
   * @access Admin only
   * @route POST /sub-administrative-zone/upload-saz-ea
   * @form multipart/form-data with fields:
   *   - administrativeZoneId: number (required)
   *   - name: string (SAZ name, required)
   *   - areaCode: string (SAZ area code, required)
   *   - type: string ('chiwog' or 'lap', required)
   *   - areaSqKm: number (SAZ area in sq km, required)
   *   - file: GeoJSON file (required, used for both SAZ and EA geometry)
   * 
   * @returns Object with created subAdministrativeZone and enumerationArea
   */
  @Post('upload-saz-ea')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
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
  async uploadSazWithEa(
    @Body() body: {
      administrativeZoneId: string;
      name: string;
      areaCode: string;
      type: string;
      areaSqKm: string;
    },
    @UploadedFile() file: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate required fields
    if (
      !body.administrativeZoneId ||
      !body.name ||
      !body.areaCode ||
      !body.type ||
      !body.areaSqKm
    ) {
      throw new BadRequestException(
        'Missing required fields: administrativeZoneId, name, areaCode, type, areaSqKm',
      );
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

      // Parse numeric values
      const administrativeZoneId = parseInt(body.administrativeZoneId, 10);
      const areaSqKm = parseFloat(body.areaSqKm);

      if (isNaN(administrativeZoneId)) {
        throw new BadRequestException('administrativeZoneId must be a number');
      }
      if (isNaN(areaSqKm)) {
        throw new BadRequestException('areaSqKm must be a number');
      }

      // Validate type
      if (!['chiwog', 'lap'].includes(body.type.toLowerCase())) {
        throw new BadRequestException('Type must be "chiwog" or "lap"');
      }

      const result = await this.subAdministrativeZoneService.createSazWithEa(
        administrativeZoneId,
        body.name,
        body.areaCode,
        body.type.toLowerCase() as 'chiwog' | 'lap',
        areaSqKm,
        geometry,
      );

      return result;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process upload: ${error.message}`,
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

  /**
   * Get all sub-administrative zones by dzongkhag ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Array of sub-administrative zones
   * @access Public
   */
  @Get('by-dzongkhag/:dzongkhagId')
  async findByDzongkhag(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    return this.subAdministrativeZoneService.findByDzongkhag(dzongkhagId);
  }

  @Get('geojson/by-administrative-zone/:administrativeZoneId')
  async findAllAsGeoJsonByAdministrativeZone(
    @Param('administrativeZoneId') administrativeZoneId: string,
  ) {
    return this.subAdministrativeZoneService.findAllAsGeoJsonByAdministrativeZone(
      +administrativeZoneId,
    );
  }

  /**
   * Get all sub-administrative zones by dzongkhag ID as GeoJSON
   * @param dzongkhagId - Dzongkhag ID
   * @returns GeoJSON FeatureCollection
   * @access Public
   */
  @Get('geojson/by-dzongkhag/:dzongkhagId')
  async findAllAsGeoJsonByDzongkhag(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    return this.subAdministrativeZoneService.findAllAsGeoJsonByDzongkhag(
      dzongkhagId,
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
  async findOneAsGeoJson(@Param('id', ParseIntPipe) id: number) {
    return this.subAdministrativeZoneService.findOneAsGeoJson(id);
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
    @Param('id', ParseIntPipe) id: number,
    @Query('withoutGeom') withoutGeom?: string,
    @Query('includeEnumerationAreas') includeEnumerationAreas?: string,
  ) {
    const includeEAs = includeEnumerationAreas === 'true';

    if (withoutGeom === 'true') {
      return this.subAdministrativeZoneService.findOneWithoutGeom(
        id,
        includeEAs,
      );
    }
    return this.subAdministrativeZoneService.findOne(id, includeEAs);
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
