import { Inject, Injectable } from '@nestjs/common';
import { Building } from './entities/building.entity';
import { UpdateBuildingDto } from './dto/update-building.dto';
import { instanceToPlain } from 'class-transformer';
import { QueryTypes } from 'sequelize';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class BuildingsService {
  constructor(
    @Inject('BUILDING_REPOSITORY')
    private readonly buildingRepository: typeof Building,
    @Inject('SEQUELIZE')
    private readonly sequelize: Sequelize,
  ) {}

  /**
   * Find all buildings in enumeration area(s) as GeoJSON
   * @param enumerationAreaIds - Array of Enumeration Area IDs
   * @returns GeoJSON FeatureCollection
   */
  async findByEnumerationArea(enumerationAreaIds: number[]): Promise<any> {
    if (!enumerationAreaIds || enumerationAreaIds.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    const data: any = await this.sequelize.query(
      `SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', COALESCE(jsonb_agg(features.feature), '[]'::jsonb)
      )
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (
          SELECT * FROM public."buildingGeom" 
          WHERE "eaId" = ANY(ARRAY[${enumerationAreaIds.join(',')}])
        ) inputs
      ) features;`,
      {
        type: QueryTypes.SELECT,
      },
    );

    // Extract the GeoJSON FeatureCollection from the query result
    // When using QueryTypes.SELECT, result is array of rows, each row has jsonb_build_object key
    const result = data[0]?.jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };

    return result;
  }

  /**
   * Find single building by ID
   * @param id - Building ID
   */
  async findOne(id: number): Promise<Building> {
    return await this.buildingRepository.findOne<Building>({
      where: { id },
      include: ['enumerationArea'],
    });
  }

  /**
   * Update building
   * @param id - Building ID
   * @param updateBuildingDto - Update data
   */
  async update(id: number, updateBuildingDto: UpdateBuildingDto) {
    const [numRows] = await this.buildingRepository.update(
      instanceToPlain(updateBuildingDto),
      {
        where: { id },
      },
    );

    if (numRows === 0) {
      throw new Error(`Building with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  /**
   * Get all buildings in an enumeration area as GeoJSON FeatureCollection
   * @param enumerationAreaId - Enumeration Area ID
   */
  async findAsGeoJsonByEnumerationArea(
    enumerationAreaId: number,
  ): Promise<any> {
    const data: any = await this.buildingRepository.sequelize.query(
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
        FROM (SELECT * FROM "Buildings" WHERE "enumerationAreaId" = ${enumerationAreaId} ORDER BY "structureId") inputs
      ) features;`,
    );

    return (
      data[0][0].jsonb_build_object || {
        type: 'FeatureCollection',
        features: [],
      }
    );
  }

  /**
   * Get all buildings as GeoJSON FeatureCollection
   */
  async findAllAsGeoJson(): Promise<any> {
    const data: any = await this.buildingRepository.sequelize.query(
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
        FROM (SELECT * FROM "Buildings" ORDER BY "structureId") inputs
      ) features;`,
    );

    return (
      data[0][0].jsonb_build_object || {
        type: 'FeatureCollection',
        features: [],
      }
    );
  }
}
