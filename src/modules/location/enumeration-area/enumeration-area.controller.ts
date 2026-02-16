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
  UploadedFiles,
  BadRequestException,
  NotFoundException,
  ParseIntPipe,
  Header,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { EnumerationAreaService } from './enumeration-area.service';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { CreateEnumerationAreaGeoJsonDto } from './dto/create-enumeration-area-geojson.dto';
import { UpdateEnumerationAreaDto } from './dto/update-enumeration-area.dto';
import { SplitEnumerationAreaDto } from './dto/split-enumeration-area.dto';
import { MergeEnumerationAreasDto } from './dto/merge-enumeration-areas.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import {
  PaginationQueryDto,
} from '../../../common/utils/pagination.util';

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
        throw new BadRequestException(
          'Invalid subAdministrativeZoneId parameter',
        );
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
  async migrateToJunctionTable() {
    return this.enumerationAreaService.migrateToJunctionTable();
  }

  /**
   * Create multiple SAZs from GeoJSON files and a single EA that links to all of them
   *
   * @access Admin only
   * @route POST /enumeration-area/create-multiple-sazs-with-ea
   * @form multipart/form-data with fields:
   *   - files: GeoJSON files (2-20 files, one per SAZ, required)
   *   - sazDataArray: JSON string with array of SAZ data objects
   *     [{ name, areaCode, type, administrativeZoneId }, ...]
   *   - eaData: JSON string with { name, areaCode, description? }
   *
   * @returns Object with created subAdministrativeZones array and enumerationArea
   */
  @Post('create-multiple-sazs-with-ea')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file
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
  async createMultipleSazsWithEa(
    @UploadedFiles() files: any[],
    @Body()
    body: {
      sazDataArray: string; // JSON string with array of SAZ data
      eaData: string; // JSON string with EA data
    },
  ) {
    if (!files || files.length < 2) {
      throw new BadRequestException('At least 2 GeoJSON files are required');
    }

    if (files.length > 20) {
      throw new BadRequestException('Maximum 20 GeoJSON files are allowed');
    }

    if (!body.sazDataArray || !body.eaData) {
      throw new BadRequestException(
        'Both sazDataArray and eaData are required',
      );
    }

    try {
      // Parse form data
      const sazDataArray = JSON.parse(body.sazDataArray);
      const eaData = JSON.parse(body.eaData);

      // Validate sazDataArray is an array
      if (!Array.isArray(sazDataArray)) {
        throw new BadRequestException('sazDataArray must be an array');
      }

      // Validate number of files matches number of SAZs
      if (files.length !== sazDataArray.length) {
        throw new BadRequestException(
          `Number of files (${files.length}) must match number of SAZs (${sazDataArray.length})`,
        );
      }

      // Validate minimum 2 SAZs
      if (sazDataArray.length < 2) {
        throw new BadRequestException('At least 2 SAZs are required');
      }

      // Validate EA data
      if (!eaData.name || !eaData.areaCode) {
        throw new BadRequestException(
          'EA data missing required fields: name, areaCode',
        );
      }

      // Validate each SAZ data
      for (let i = 0; i < sazDataArray.length; i++) {
        const sazData = sazDataArray[i];
        if (
          !sazData.name ||
          !sazData.areaCode ||
          !sazData.type ||
          !sazData.administrativeZoneId
        ) {
          throw new BadRequestException(
            `SAZ ${
              i + 1
            } data missing required fields: name, areaCode, type, administrativeZoneId`,
          );
        }
      }

      // Parse GeoJSON files and extract geometries
      const geometries: any[] = [];
      for (let i = 0; i < files.length; i++) {
        const geoJsonData = JSON.parse(files[i].buffer.toString('utf-8'));
        let geometry;

        // Extract geometry from GeoJSON
        if (geoJsonData.type === 'Feature' && geoJsonData.geometry) {
          geometry = geoJsonData.geometry;
        } else if (
          geoJsonData.type === 'FeatureCollection' &&
          geoJsonData.features &&
          geoJsonData.features.length > 0
        ) {
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
          geometry = geoJsonData;
        } else {
          throw new BadRequestException(
            `File ${
              i + 1
            } GeoJSON: Invalid format. Must be a Feature, FeatureCollection, or Geometry object.`,
          );
        }

        if (!geometry) {
          throw new BadRequestException(`No geometry found in file ${i + 1}`);
        }

        geometries.push(geometry);
      }

      // Prepare SAZ data array for service
      const sazDataForService = sazDataArray.map((sazData, index) => ({
        name: sazData.name,
        areaCode: sazData.areaCode,
        type: sazData.type.toLowerCase() as 'chiwog' | 'lap',
        administrativeZoneId: parseInt(sazData.administrativeZoneId, 10),
        geometry: geometries[index],
      }));

      // Call service method
      const result = await this.enumerationAreaService.createMultipleSazsWithEa(
        sazDataForService,
        {
          name: eaData.name,
          areaCode: eaData.areaCode,
          description: eaData.description,
        },
      );

      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process request: ${error.message}`,
      );
    }
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
    @Param('subAdministrativeZoneId', ParseIntPipe)
    subAdministrativeZoneId: number,
  ) {
    return this.enumerationAreaService.findBySubAdministrativeZone(
      subAdministrativeZoneId,
    );
  }

  @Get('geojson/by-sub-administrative-zone/:subAdministrativeZoneId')
  async findAllAsGeoJsonBySubAdministrativeZone(
    @Param('subAdministrativeZoneId', ParseIntPipe)
    subAdministrativeZoneId: number,
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

  /**
   * Split an enumeration area into multiple new EAs
   * @access Admin only
   * @param id - Source Enumeration Area ID
   * @form multipart/form-data with fields:
   *   - eaData: JSON string with { newEas: [{name, areaCode, description, subAdministrativeZoneIds}], reason? }
   *   - files: GeoJSON files (one per new EA, in same order as newEas array)
   */
  @Post(':id/split')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit per file
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
  async split(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: any[],
    @Body() body: { eaData: string; reason?: string },
  ) {
    if (!body.eaData) {
      throw new BadRequestException('eaData is required');
    }

    if (!files || files.length === 0) {
      throw new BadRequestException('At least one GeoJSON file is required');
    }

    try {
      // Parse form data
      const eaData = JSON.parse(body.eaData);

      if (!eaData.newEas || !Array.isArray(eaData.newEas)) {
        throw new BadRequestException(
          'eaData.newEas is required and must be an array',
        );
      }

      if (eaData.newEas.length < 2) {
        throw new BadRequestException(
          'At least 2 new EAs are required for a split',
        );
      }

      if (files.length !== eaData.newEas.length) {
        throw new BadRequestException(
          `Number of GeoJSON files (${files.length}) must match number of new EAs (${eaData.newEas.length})`,
        );
      }

      // Parse GeoJSON files and attach geometry to each EA
      const newEasWithGeometry = eaData.newEas.map((ea: any, index: number) => {
        const geoJsonFile = files[index];
        let geometry;

        try {
          const geoJsonData = JSON.parse(geoJsonFile.buffer.toString('utf-8'));

          // Extract geometry from GeoJSON
          if (geoJsonData.type === 'Feature' && geoJsonData.geometry) {
            geometry = geoJsonData.geometry;
          } else if (
            geoJsonData.type === 'FeatureCollection' &&
            geoJsonData.features &&
            geoJsonData.features.length > 0
          ) {
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
            geometry = geoJsonData;
          } else {
            throw new BadRequestException(
              `Invalid GeoJSON format in file ${
                index + 1
              }. Must be a Feature, FeatureCollection, or Geometry object.`,
            );
          }
        } catch (error) {
          throw new BadRequestException(
            `Failed to parse GeoJSON file ${index + 1}: ${error.message}`,
          );
        }

        return {
          ...ea,
          geom: JSON.stringify(geometry),
        };
      });

      return this.enumerationAreaService.splitEnumerationArea(
        id,
        newEasWithGeometry,
        body.reason || eaData.reason,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process split request: ${error.message}`,
      );
    }
  }

  /**
   * Merge multiple enumeration areas into one new EA
   * @access Admin only
   * @form multipart/form-data with fields:
   *   - mergeData: JSON string with { sourceEaIds: [number[]], mergedEa: {name, areaCode, description, subAdministrativeZoneIds}, reason? }
   *   - file: Single GeoJSON file for the merged EA
   */
  @Post('merge')
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
  async merge(
    @UploadedFile() file: any,
    @Body() body: { mergeData: string; reason?: string },
  ) {
    if (!body.mergeData) {
      throw new BadRequestException('mergeData is required');
    }

    if (!file) {
      throw new BadRequestException('GeoJSON file is required');
    }

    try {
      // Parse form data
      const mergeData = JSON.parse(body.mergeData);

      if (!mergeData.sourceEaIds || !Array.isArray(mergeData.sourceEaIds)) {
        throw new BadRequestException(
          'mergeData.sourceEaIds is required and must be an array',
        );
      }

      if (mergeData.sourceEaIds.length < 2) {
        throw new BadRequestException(
          'At least 2 source EAs are required for a merge',
        );
      }

      if (!mergeData.mergedEa) {
        throw new BadRequestException('mergeData.mergedEa is required');
      }

      // Parse GeoJSON file
      let geometry;
      try {
        const geoJsonData = JSON.parse(file.buffer.toString('utf-8'));

        // Extract geometry from GeoJSON
        if (geoJsonData.type === 'Feature' && geoJsonData.geometry) {
          geometry = geoJsonData.geometry;
        } else if (
          geoJsonData.type === 'FeatureCollection' &&
          geoJsonData.features &&
          geoJsonData.features.length > 0
        ) {
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
          geometry = geoJsonData;
        } else {
          throw new BadRequestException(
            'Invalid GeoJSON format. Must be a Feature, FeatureCollection, or Geometry object.',
          );
        }
      } catch (error) {
        throw new BadRequestException(
          `Failed to parse GeoJSON file: ${error.message}`,
        );
      }

      const mergedEaWithGeometry = {
        ...mergeData.mergedEa,
        geom: JSON.stringify(geometry),
      };

      return this.enumerationAreaService.mergeEnumerationAreas(
        mergeData.sourceEaIds,
        mergedEaWithGeometry,
        body.reason || mergeData.reason,
      );
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process merge request: ${error.message}`,
      );
    }
  }

  /**
   * Get EA lineage (ancestors and/or descendants)
   * @access Public
   * @param id - Enumeration Area ID
   * @query direction - 'ancestors', 'descendants', or 'both' (default: 'both')
   */
  @Get(':id/lineage')
  async getLineage(
    @Param('id', ParseIntPipe) id: number,
    @Query('direction') direction?: 'ancestors' | 'descendants' | 'both',
  ) {
    return this.enumerationAreaService.getEaLineage(id, direction || 'both');
  }

  /**
   * Get complete EA history tree (both ancestors and descendants)
   * @access Public
   * @param id - Enumeration Area ID
   */
  @Get(':id/history')
  async getHistory(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.getEaHistory(id);
  }

  /**
   * Get all inactive enumeration areas
   * @access Public
   * @query withGeom - Include geometry (default: false)
   * @query includeSubAdminZone - Include sub-administrative zones (default: false)
   */
  @Get('inactive')
  async findAllInactive(
    @Query('withGeom') withGeom?: string,
    @Query('includeSubAdminZone') includeSubAdminZone?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeSubAdmin = includeSubAdminZone === 'true';
    return this.enumerationAreaService.findAllInactive(
      includeGeom,
      includeSubAdmin,
    );
  }

  /**
   * Get all active enumeration areas (default behavior)
   * @access Public
   * @query withGeom - Include geometry (default: false)
   * @query includeSubAdminZone - Include sub-administrative zones (default: false)
   */
  @Get('active')
  async findAllActive(
    @Query('withGeom') withGeom?: string,
    @Query('includeSubAdminZone') includeSubAdminZone?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeSubAdmin = includeSubAdminZone === 'true';
    return this.enumerationAreaService.findAllActive(
      includeGeom,
      includeSubAdmin,
    );
  }

  /**
   * Get all enumeration areas that were split, ordered by latest, paginated
   * @access Public
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: operationDate)
   * @query sortOrder - Sort order: ASC or DESC (default: DESC)
   *
   * @example
   * GET /enumeration-area/split/paginated/all
   * GET /enumeration-area/split/paginated/all?page=1&limit=20
   */
  @Get('split/paginated/all')
  async findAllSplit(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const query: PaginationQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.enumerationAreaService.findAllSplitPaginated(query);
  }

  /**
   * Get all enumeration areas that were merged, ordered by latest, paginated
   * @access Public
   * @query page - Page number (default: 1)
   * @query limit - Items per page (default: 10, max: 100)
   * @query sortBy - Field to sort by (default: operationDate)
   * @query sortOrder - Sort order: ASC or DESC (default: DESC)
   *
   * @example
   * GET /enumeration-area/merge/paginated/all
   * GET /enumeration-area/merge/paginated/all?page=1&limit=20
   */
  @Get('merge/paginated/all')
  async findAllMerged(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const query: PaginationQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.enumerationAreaService.findAllMergedPaginated(query);
  }

  /**
   * Get all RBA enumeration areas, paginated
   * @access Admin
   * @query page, limit, sortBy, sortOrder
   */
  @Get('rba/paginated/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllRba(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const query: PaginationQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.enumerationAreaService.findAllRbaPaginated(query);
  }

  /**
   * Get all Urban RBA enumeration areas (Thromde), paginated
   * @access Admin
   * @query page, limit, sortBy, sortOrder
   */
  @Get('rba/urban/paginated/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllUrbanRba(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const query: PaginationQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.enumerationAreaService.findAllUrbanRbaPaginated(query);
  }

  /**
   * Get all Rural RBA enumeration areas (Gewog), paginated
   * @access Admin
   * @query page, limit, sortBy, sortOrder
   */
  @Get('rba/rural/paginated/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async findAllRuralRba(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC',
  ) {
    const query: PaginationQueryDto = {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      sortBy,
      sortOrder,
    };
    return this.enumerationAreaService.findAllRuralRbaPaginated(query);
  }

  /**
   * Download all RBA enumeration areas as Excel
   * @access Admin
   */
  @Get('rba/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadRbaExcel(@Res() res: Response) {
    const buffer = await this.enumerationAreaService.getRbaExcelBuffer();
    const filename = `rba-enumeration-areas-${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Download Urban RBA enumeration areas as Excel
   * @access Admin
   */
  @Get('rba/urban/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadUrbanRbaExcel(@Res() res: Response) {
    const buffer = await this.enumerationAreaService.getUrbanRbaExcelBuffer();
    const filename = `rba-urban-enumeration-areas-${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Download Rural RBA enumeration areas as Excel
   * @access Admin
   */
  @Get('rba/rural/excel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async downloadRuralRbaExcel(@Res() res: Response) {
    const buffer = await this.enumerationAreaService.getRuralRbaExcelBuffer();
    const filename = `rba-rural-enumeration-areas-${Date.now()}.xlsx`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  /**
   * Mark enumeration area as RBA
   * @access Admin
   */
  @Patch(':id/mark-rba')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async markAsRba(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.markAsRba(id);
  }

  /**
   * Unmark enumeration area as RBA
   * @access Admin
   */
  @Patch(':id/unmark-rba')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.OK)
  async unmarkAsRba(@Param('id', ParseIntPipe) id: number) {
    return this.enumerationAreaService.unmarkAsRba(id);
  }

  /**
   * Bulk upload enumeration areas by Sub-Administrative Zone
   * @access Public
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID (automatically assigned to all EAs)
   * @form multipart/form-data with field:
   *   - file: GeoJSON FeatureCollection file (required)
   *     Each Feature must have:
   *     - geometry: GeoJSON geometry object (required)
   *     - properties: Object with name, description, areaCode (all required)
   *
   * @returns Object with success count, skipped items, created EAs, and errors
   *
   * @example
   * POST /enumeration-area/by-sub-administrative-zone/1/bulk-upload-geojson
   */
  @Post('by-sub-administrative-zone/:subAdministrativeZoneId/bulk-upload-geojson')
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
  async bulkUploadGeoJsonBySubAdministrativeZone(
    @Param('subAdministrativeZoneId', ParseIntPipe) subAdministrativeZoneId: number,
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

      // Process the bulk upload with automatic subAdministrativeZoneId assignment
      const result = await this.enumerationAreaService.bulkCreateFromGeoJsonBySubAdministrativeZone(
        subAdministrativeZoneId,
        geoJsonData.features,
      );

      return result;
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }
}
