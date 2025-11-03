import { Inject, Injectable } from '@nestjs/common';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { UpdateEnumerationAreaDto } from './dto/update-enumeration-area.dto';
import { CreateEnumerationAreaGeoJsonDto } from './dto/create-enumeration-area-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize } from 'sequelize';

@Injectable()
export class EnumerationAreaService {
  constructor(
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
  ) {}

  async create(
    createEnumerationAreaDto: CreateEnumerationAreaDto,
  ): Promise<EnumerationArea> {
    return await this.enumerationAreaRepository.create(
      instanceToPlain(createEnumerationAreaDto),
    );
  }

  async createFromGeoJson(
    geoJsonDto: CreateEnumerationAreaGeoJsonDto,
  ): Promise<EnumerationArea> {
    const { properties, geometry } = geoJsonDto;

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    const enumerationArea = await this.enumerationAreaRepository.create({
      subAdministrativeZoneId: properties.subAdministrativeZoneId,
      name: properties.name,
      areaCode: properties.areaCode,
      description: properties.description,
      geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
    });

    return enumerationArea;
  }

  async bulkCreateFromGeoJson(features: any[]): Promise<{
    success: number;
    skipped: number;
    created: EnumerationArea[];
    skippedItems: Array<{
      areaCode: string;
      subAdministrativeZoneId: number;
      reason: string;
    }>;
    errors: Array<{
      feature: any;
      error: string;
    }>;
  }> {
    const created: EnumerationArea[] = [];
    const skippedItems: Array<{
      areaCode: string;
      subAdministrativeZoneId: number;
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

        // Validate required properties
        if (
          !properties.subAdministrativeZoneId ||
          !properties.name ||
          !properties.areaCode
        ) {
          errors.push({
            feature,
            error:
              'Missing required properties: subAdministrativeZoneId, name, or areaCode',
          });
          continue;
        }

        // Check if EA already exists by composite key (areaCode + subAdministrativeZoneId)
        const existingEA = await this.enumerationAreaRepository.findOne({
          where: {
            areaCode: properties.areaCode,
            subAdministrativeZoneId: properties.subAdministrativeZoneId,
          },
        });

        if (existingEA) {
          skippedItems.push({
            areaCode: properties.areaCode,
            subAdministrativeZoneId: properties.subAdministrativeZoneId,
            reason: 'Enumeration Area already exists',
          });
          continue;
        }

        // Convert GeoJSON geometry to PostGIS format
        const geomString = JSON.stringify(geometry);

        // Create the enumeration area
        const enumerationArea = await this.enumerationAreaRepository.create({
          subAdministrativeZoneId: properties.subAdministrativeZoneId,
          name: properties.name,
          areaCode: properties.areaCode,
          description: properties.description || '',
          areaSqKm: properties.areaSqKm || 0,
          geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
        });

        created.push(enumerationArea);
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

  /**
   * Find all enumeration areas with optional associations
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   */
  async findAll(
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      attributes: withGeom ? undefined : { exclude: ['geom'] },
    };

    if (includeSubAdminZone) {
      options.include = [
        {
          association: 'subAdministrativeZone',
          attributes: { exclude: withGeom ? [] : ['geom'] },
        },
      ];
    }

    return await this.enumerationAreaRepository.findAll<EnumerationArea>(
      options,
    );
  }

  /**
   * Find single enumeration area by ID with optional associations
   * @param id - Enumeration Area ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   */
  async findOne(
    id: number,
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea> {
    const options: any = {
      where: { id },
      attributes: withGeom ? undefined : { exclude: ['geom'] },
    };

    if (includeSubAdminZone) {
      options.include = [
        {
          association: 'subAdministrativeZone',
          attributes: { exclude: withGeom ? [] : ['geom'] },
        },
      ];
    }

    return await this.enumerationAreaRepository.findOne<EnumerationArea>(
      options,
    );
  }

  /**
   * Find enumeration areas by sub-administrative zone with optional associations
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   */
  async findBySubAdministrativeZone(
    subAdministrativeZoneId: number,
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      where: { subAdministrativeZoneId },
      attributes: withGeom ? undefined : { exclude: ['geom'] },
    };

    if (includeSubAdminZone) {
      options.include = [
        {
          association: 'subAdministrativeZone',
          attributes: { exclude: withGeom ? [] : ['geom'] },
        },
      ];
    }

    return await this.enumerationAreaRepository.findAll<EnumerationArea>(
      options,
    );
  }

  async findAllAsGeoJsonBySubAdministrativeZone(
    subAdministrativeZoneId: number,
  ): Promise<any> {
    const data: any = await this.enumerationAreaRepository.sequelize.query(
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
        FROM (SELECT * FROM "EnumerationAreas" WHERE "subAdministrativeZoneId" = ${subAdministrativeZoneId} ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async findAllAsGeoJson(): Promise<any> {
    const data: any = await this.enumerationAreaRepository.sequelize.query(
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
        FROM (SELECT * FROM "EnumerationAreas" ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async update(id: number, updateEnumerationAreaDto: UpdateEnumerationAreaDto) {
    const [numRows, updatedRows] = await this.enumerationAreaRepository.update(
      instanceToPlain(updateEnumerationAreaDto),
      {
        where: { id },
        returning: true,
      },
    );

    if (numRows === 0) {
      throw new Error(`Enumeration area with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  async updateGeometry(id: number, geometry: any): Promise<EnumerationArea> {
    // First check if the enumeration area exists
    const enumerationArea = await this.enumerationAreaRepository.findByPk(id);
    if (!enumerationArea) {
      throw new Error(`Enumeration area with ID ${id} not found`);
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    await this.enumerationAreaRepository.update(
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
    return await this.enumerationAreaRepository.destroy({
      where: { id },
    });
  }
}
