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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createFromGeoJson(
    @Body() geoJsonDto: CreateAdministrativeZoneGeoJsonDto,
  ) {
    return this.administrativeZoneService.createFromGeoJson(geoJsonDto);
  }

  /**
   * Bulk upload administrative zones from GeoJSON file by dzongkhag
   * Accepts a GeoJSON FeatureCollection file and processes all features
   * @param dzongkhagId - Dzongkhag ID (optional, can also be in feature properties)
   * @param file - GeoJSON file (FeatureCollection)
   * @access Admin only
   */
  @Post('bulk-upload-geojson/by-dzongkhag/:dzongkhagId')
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
  async bulkUploadGeoJsonByDzongkhag(
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
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

      // Process the bulk upload with dzongkhagId
      const result = await this.administrativeZoneService.bulkCreateFromGeoJson(
        geoJsonData.features,
        dzongkhagId,
      );

      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
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

  @Patch('geojson/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateGeoJson(
    @Param('id') id: string,
    @Body() geoJsonDto: CreateAdministrativeZoneGeoJsonDto,
  ) {
    return this.administrativeZoneService.updateGeoJsonById(+id, geoJsonDto);
  }

  /**
   * Upload GeoJSON file to update only the geometry of an administrative zone
   * Accepts Feature, FeatureCollection, or Geometry object
   * @param administrativeZoneId - Administrative Zone ID
   * @param file - GeoJSON file
   * @access Admin only
   */
  @Post('upload-geojson/:administrativeZoneId')
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
    @Param('administrativeZoneId', ParseIntPipe) administrativeZoneId: number,
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

      const result = await this.administrativeZoneService.updateGeometry(
        administrativeZoneId,
        geometry,
      );
      return result;
    } catch (error) {
      throw new BadRequestException(
        `Failed to process GeoJSON file: ${error.message}`,
      );
    }
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    return this.administrativeZoneService.remove(+id);
  }
}
