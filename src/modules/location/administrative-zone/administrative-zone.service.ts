import { Inject, Injectable } from '@nestjs/common';
import { AdministrativeZone } from './entities/administrative-zone.entity';
import { CreateAdministrativeZoneDto } from './dto/create-administrative-zone.dto';
import { UpdateAdministrativeZoneDto } from './dto/update-administrative-zone.dto';
import { CreateAdministrativeZoneGeoJsonDto } from './dto/create-administrative-zone-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize } from 'sequelize';

@Injectable()
export class AdministrativeZoneService {
  constructor(
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
  ) {}

  async create(
    createAdministrativeZoneDto: CreateAdministrativeZoneDto,
  ): Promise<AdministrativeZone> {
    return await this.administrativeZoneRepository.create(
      instanceToPlain(createAdministrativeZoneDto),
    );
  }

  async createFromGeoJson(
    geoJsonDto: CreateAdministrativeZoneGeoJsonDto,
  ): Promise<AdministrativeZone> {
    const { properties, geometry } = geoJsonDto;

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    const administrativeZone = await this.administrativeZoneRepository.create({
      dzongkhagId: properties.dzongkhagId,
      name: properties.name,
      areaCode: properties.areaCode,
      type: properties.type,
      areaSqKm: properties.areaSqKm,
      geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
    });

    return administrativeZone;
  }

  /**
   * Bulk create administrative zones from GeoJSON FeatureCollection
   * @param features - Array of GeoJSON features
   * @param dzongkhagId - Optional dzongkhag ID to filter/assign to all features
   * @returns Summary of created, skipped, and error items
   */
  async bulkCreateFromGeoJson(
    features: any[],
    dzongkhagId?: number,
  ): Promise<{
    success: number;
    skipped: number;
    created: AdministrativeZone[];
    skippedItems: Array<{
      areaCode: string;
      dzongkhagId: number;
      reason: string;
    }>;
    errors: Array<{
      feature: any;
      error: string;
    }>;
  }> {
    const created: AdministrativeZone[] = [];
    const skippedItems: Array<{
      areaCode: string;
      dzongkhagId: number;
      reason: string;
    }> = [];
    const errors: Array<{ feature: any; error: string }> = [];

    for (const feature of features) {
      try {
        if (feature.type !== 'Feature') {
          errors.push({
            feature,
            error: 'Invalid feature type. Must be a Feature.',
          });
          continue;
        }

        const { properties, geometry } = feature;

        // Use dzongkhagId from parameter if provided, otherwise from properties
        const finalDzongkhagId = dzongkhagId || properties.dzongkhagId;

        // Validate required properties
        if (!finalDzongkhagId || !properties.name || !properties.areaCode) {
          errors.push({
            feature,
            error:
              'Missing required properties: dzongkhagId, name, or areaCode',
          });
          continue;
        }

        // Validate type if provided
        if (properties.type && !['Gewog', 'Thromde'].includes(properties.type)) {
          errors.push({
            feature,
            error: 'Invalid type. Must be "Gewog" or "Thromde".',
          });
          continue;
        }

        // Check if administrative zone already exists by areaCode and dzongkhagId
        const existingAZ = await this.administrativeZoneRepository.findOne({
          where: {
            areaCode: properties.areaCode,
            dzongkhagId: finalDzongkhagId,
          },
        });

        if (existingAZ) {
          skippedItems.push({
            areaCode: properties.areaCode,
            dzongkhagId: finalDzongkhagId,
            reason: 'Administrative Zone already exists',
          });
          continue;
        }

        // Convert GeoJSON geometry to PostGIS format
        const geomString = JSON.stringify(geometry);

        // Create the administrative zone
        const administrativeZone =
          await this.administrativeZoneRepository.create({
            dzongkhagId: finalDzongkhagId,
            name: properties.name,
            areaCode: properties.areaCode,
            type: properties.type || 'Gewog', // Default to Gewog if not specified
            areaSqKm: properties.areaSqKm || 0,
            geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
          });

        created.push(administrativeZone);
      } catch (error) {
        errors.push({
          feature,
          error: error.message,
        });
      }
    }

    return {
      success: created.length,
      skipped: skippedItems.length,
      created,
      skippedItems,
      errors,
    };
  }

  async findAll(): Promise<AdministrativeZone[]> {
    return await this.administrativeZoneRepository.findAll<AdministrativeZone>({
      include: ['dzongkhag', 'subAdministrativeZones'],
    });
  }

  async findOne(id: number): Promise<AdministrativeZone> {
    return await this.administrativeZoneRepository.findOne<AdministrativeZone>({
      where: { id },
      include: ['dzongkhag', 'subAdministrativeZones'],
    });
  }

  async findOneWithoutGeom(id: number): Promise<AdministrativeZone> {
    return await this.administrativeZoneRepository.findOne<AdministrativeZone>({
      where: { id },
      include: ['dzongkhag'],
      attributes: { exclude: ['geom'] },
    });
  }

  async findByDzongkhag(dzongkhagId: number): Promise<AdministrativeZone[]> {
    return await this.administrativeZoneRepository.findAll<AdministrativeZone>({
      where: { dzongkhagId },
      include: ['subAdministrativeZones'],
    });
  }

  async findByDzongkhagCode(
    dzongkhagCode: string,
  ): Promise<AdministrativeZone[]> {
    return await this.administrativeZoneRepository.findAll<AdministrativeZone>({
      where: { dzongkhagCode },
      include: ['subAdministrativeZones'],
    });
  }

  async findAllAsGeoJsonByDzongkhag(dzongkhagId: number): Promise<any> {
    const data: any = await this.administrativeZoneRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', jsonb_agg(features.feature)
      )
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (SELECT * FROM "AdministrativeZones" WHERE "dzongkhagId" = ${dzongkhagId} ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async findAllAsGeoJson(): Promise<any> {
    const data: any = await this.administrativeZoneRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', jsonb_agg(features.feature)
      )
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (SELECT * FROM "AdministrativeZones" ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async update(
    id: number,
    updateAdministrativeZoneDto: UpdateAdministrativeZoneDto,
  ) {
    const [numRows, updatedRows] =
      await this.administrativeZoneRepository.update(
        instanceToPlain(updateAdministrativeZoneDto),
        {
          where: { id },
          returning: true,
        },
      );

    if (numRows === 0) {
      throw new Error(`Administrative zone with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  async updateGeoJsonById(
    id: number,
    geoJsonDto: CreateAdministrativeZoneGeoJsonDto,
  ): Promise<AdministrativeZone> {
    const { properties, geometry } = geoJsonDto;

    // Check if administrative zone exists
    const existingZone = await this.administrativeZoneRepository.findByPk(id);
    if (!existingZone) {
      throw new Error(`Administrative zone with ID ${id} not found`);
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    await this.administrativeZoneRepository.update(
      {
        dzongkhagId: properties.dzongkhagId,
        name: properties.name,
        areaCode: properties.areaCode,
        type: properties.type,
        areaSqKm: properties.areaSqKm,
        geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
      },
      {
        where: { id },
      },
    );

    return this.findOne(id);
  }

  async updateGeometry(
    id: number,
    geometry: any,
  ): Promise<AdministrativeZone> {
    // First check if the administrative zone exists
    const administrativeZone =
      await this.administrativeZoneRepository.findByPk(id);
    if (!administrativeZone) {
      throw new Error(`Administrative zone with ID ${id} not found`);
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    await this.administrativeZoneRepository.update(
      {
        geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
      },
      {
        where: { id },
      },
    );

    return this.findOne(id);
  }

  async remove(id: number): Promise<number> {
    return await this.administrativeZoneRepository.destroy({
      where: { id },
    });
  }
}
