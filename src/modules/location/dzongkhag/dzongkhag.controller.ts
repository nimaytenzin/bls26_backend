import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DzongkhagService } from './dzongkhag.service';
import { CreateDzongkhagDto } from './dto/create-dzongkhag.dto';
import { UpdateDzongkhagDto } from './dto/update-dzongkhag.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('dzongkhag')
export class DzongkhagController {
  constructor(private readonly dzongkhagService: DzongkhagService) {}

  // ============ PUBLIC ROUTES (Read-only) ============

  /**
   * Get all dzongkhags
   * @access Public
   * @query withGeom - Include geometry (default: false)
   * @query includeAdminZones - Include administrative zones (default: false)
   * @query includeSubAdminZones - Include sub-administrative zones (default: false)
   * @query includeEAs - Include enumeration areas (default: false)
   *
   * @example
   * GET /dzongkhag?withGeom=false
   * GET /dzongkhag?includeAdminZones=true
   * GET /dzongkhag?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
   */
  @Get('')
  async findAllPublic(
    @Query('withGeom') withGeom?: string,
    @Query('includeAdminZones') includeAdminZones?: string,
    @Query('includeSubAdminZones') includeSubAdminZones?: string,
    @Query('includeEAs') includeEAs?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeAdminZone = includeAdminZones === 'true';
    const includeSubAdminZone = includeSubAdminZones === 'true';
    const includeEA = includeEAs === 'true';

    return this.dzongkhagService.findAll(
      includeGeom,
      includeAdminZone,
      includeSubAdminZone,
      includeEA,
    );
  }

  /**
   * Get all dzongkhags as GeoJSON
   * @access Public
   * @returns GeoJSON FeatureCollection with all dzongkhags
   */
  @Get('geojson/all')
  async findAllAsGeoJson() {
    return this.dzongkhagService.findAllAsGeoJson();
  }

  /**
   * Get enumeration areas by dzongkhag with full hierarchy
   * @access Public
   * @param id - Dzongkhag ID
   * @query withGeom - Include geometry for enumeration areas (default: false)
   * @query includeHierarchy - Include full hierarchy (dzongkhag->admin zone->sub-admin zone) (default: true)
   * @returns Hierarchical structure: dzongkhag -> administrative zones -> sub-administrative zones -> enumeration areas
   *
   * @example
   * GET /dzongkhag/1/enumeration-areas
   * GET /dzongkhag/1/enumeration-areas?withGeom=true
   * GET /dzongkhag/1/enumeration-areas?includeHierarchy=false (flat list)
   */
  @Get(':id/enumeration-areas')
  async getEnumerationAreasByDzongkhag(@Param('id') id: string) {
    return this.dzongkhagService.getEnumerationAreasByDzongkhag(+id);
  }

  /**
   * Get single dzongkhag by ID
   * @access Public
   * @param id - Dzongkhag ID
   * @query withGeom - Include geometry (default: false)
   * @query includeAdminZones - Include administrative zones (default: false)
   * @query includeSubAdminZones - Include sub-administrative zones (default: false)
   * @query includeEAs - Include enumeration areas (default: false)
   *
   * @example
   * GET /dzongkhag/1
   * GET /dzongkhag/1?withGeom=true
   * GET /dzongkhag/1?includeAdminZones=true&includeSubAdminZones=true
   */
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('withGeom') withGeom?: string,
    @Query('includeAdminZones') includeAdminZones?: string,
    @Query('includeSubAdminZones') includeSubAdminZones?: string,
    @Query('includeEAs') includeEAs?: string,
  ) {
    const includeGeom = withGeom === 'true';
    const includeAdminZone = includeAdminZones === 'true';
    const includeSubAdminZone = includeSubAdminZones === 'true';
    const includeEA = includeEAs === 'true';

    return this.dzongkhagService.findOne(
      +id,
      includeGeom,
      includeAdminZone,
      includeSubAdminZone,
      includeEA,
    );
  }

  // ============ ADMIN ROUTES (Only Admin) ============

  /**
   * Create Dzongkhag
   * @access Admin
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async create(@Body() createDzongkhagDto: CreateDzongkhagDto) {
    return this.dzongkhagService.create(createDzongkhagDto);
  }

  /**
   * upload geojson file to update dzongkhag geometry
   * @param dzongkhagId - Dzongkhag ID
   * @param file - Uploaded GeoJSON file
   * @access Admin
   */
  @Post('upload-geojson/:dzongkhagId')
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
  async uploadGeoJsonFile(
    @Param('dzongkhagId') dzongkhagId: string,
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

      const result = await this.dzongkhagService.updateGeometry(
        +dzongkhagId,
        geometry,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async update(
    @Param('id') id: string,
    @Body() updateDzongkhagDto: UpdateDzongkhagDto,
  ) {
    return this.dzongkhagService.update(+id, updateDzongkhagDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.dzongkhagService.remove(+id);
  }
}
