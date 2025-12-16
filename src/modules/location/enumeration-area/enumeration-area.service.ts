import { Inject, Injectable } from '@nestjs/common';
import { EnumerationArea } from './entities/enumeration-area.entity';
import { CreateEnumerationAreaDto } from './dto/create-enumeration-area.dto';
import { UpdateEnumerationAreaDto } from './dto/update-enumeration-area.dto';
import { CreateEnumerationAreaGeoJsonDto } from './dto/create-enumeration-area-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize } from 'sequelize';
import { SubAdministrativeZone } from '../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { EnumerationAreaSubAdministrativeZone } from './entities/enumeration-area-sub-administrative-zone.entity';
import { Op } from 'sequelize';

@Injectable()
export class EnumerationAreaService {
  constructor(
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('ENUMERATION_AREA_SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly junctionRepository: typeof EnumerationAreaSubAdministrativeZone,
  ) {}

  async create(
    createEnumerationAreaDto: CreateEnumerationAreaDto,
  ): Promise<EnumerationArea> {
    const { subAdministrativeZoneIds, ...eaData } = createEnumerationAreaDto;
    
    // Create the enumeration area
    const enumerationArea = await this.enumerationAreaRepository.create({
      ...eaData,
    });

    // Add all SAZs via junction table
    if (subAdministrativeZoneIds && subAdministrativeZoneIds.length > 0) {
      await this.junctionRepository.bulkCreate(
        subAdministrativeZoneIds.map(sazId => ({
          enumerationAreaId: enumerationArea.id,
          subAdministrativeZoneId: sazId,
        }))
      );
    }

    // Return with SAZs loaded from junction table
    return this.findOne(enumerationArea.id, false, true);
  }

  async createFromGeoJson(
    geoJsonDto: CreateEnumerationAreaGeoJsonDto,
  ): Promise<EnumerationArea> {
    const { properties, geometry } = geoJsonDto;

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    // Create the enumeration area
    const enumerationArea = await this.enumerationAreaRepository.create({
      name: properties.name,
      areaCode: properties.areaCode,
      description: properties.description,
      geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
    });

    // Add all SAZs via junction table
    if (properties.subAdministrativeZoneIds && properties.subAdministrativeZoneIds.length > 0) {
      await this.junctionRepository.bulkCreate(
        properties.subAdministrativeZoneIds.map(sazId => ({
          enumerationAreaId: enumerationArea.id,
          subAdministrativeZoneId: sazId,
        }))
      );
    }

    return this.findOne(enumerationArea.id, false, true);
  }

  async bulkCreateFromGeoJson(features: any[]): Promise<{
    success: number;
    skipped: number;
    created: EnumerationArea[];
    skippedItems: Array<{
      areaCode: string;
      subAdministrativeZoneIds: number[];
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
      subAdministrativeZoneIds: number[];
      reason: string;
    }> = [];
    const errors: Array<{ feature: any; error: string }> = [];

    for (const feature of features) {
      console.log('========================================');
      console.log('feature', feature);
      console.log('========================================');
      try {
        if (feature.type !== 'Feature') {
          errors.push({
            feature,
            error: 'Invalid feature type. Must be a Feature.',
          });
          continue;
        }

        const { properties, geometry } = feature;

        // Get SAZ IDs from properties
        const sazIds: number[] = properties.subAdministrativeZoneIds 
          ? (Array.isArray(properties.subAdministrativeZoneIds) 
              ? properties.subAdministrativeZoneIds 
              : [properties.subAdministrativeZoneIds])
          : [];

        // Validate required properties
        if (
          sazIds.length === 0 ||
          !properties.name ||
          !properties.areaCode
        ) {
          errors.push({
            feature,
            error:
              'Missing required properties: subAdministrativeZoneIds (array), name, or areaCode',
          });
          continue;
        }

        console.log('========================================');
        console.log('properties.areaCode', properties.areaCode);
        console.log('========================================');
        // Check if EA already exists with the same areaCode AND subAdministrativeZoneId combination
        // Since EA can have multiple SAZs, we need to check the combination of areaCode + SAZ ID
        const existingEA = await this.enumerationAreaRepository.findOne({
          where: {
            areaCode: properties.areaCode,
          },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              where: {
                id: {
                  [Op.in]: sazIds,
                },
              },
              through: { attributes: [] },
              required: true,
            },
          ],
        });

        if (existingEA) {
          skippedItems.push({
            areaCode: properties.areaCode,
            subAdministrativeZoneIds: sazIds,
            reason: 'Enumeration Area with this areaCode and SubAdministrativeZoneId combination already exists',
          });
          continue;
        }

        // Convert GeoJSON geometry to PostGIS format
        const geomString = JSON.stringify(geometry);

        // Create the enumeration area
        const enumerationArea = await this.enumerationAreaRepository.create({
          name: properties.name,
          areaCode: properties.areaCode,
          description: properties.description || '',
          geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
        });

        // Add all SAZs via junction table
        if (sazIds.length > 0) {
          await this.junctionRepository.bulkCreate(
            sazIds.map(sazId => ({
              enumerationAreaId: enumerationArea.id,
              subAdministrativeZoneId: sazId,
            }))
          );
        }

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
   * @param includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
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
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          through: { attributes: [] },
          attributes: { exclude: withGeom ? [] : ['geom'] },
          include: [
            {
              model: AdministrativeZone,
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: Dzongkhag,
                  attributes: { exclude: ['geom'] },
                },
              ],
            },
          ],
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
   * @param includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
   */
  async findOne(
    id: number,
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea> {
    const include: any[] = [];

    if (includeSubAdminZone) {
      include.push({
        model: SubAdministrativeZone,
        as: 'subAdministrativeZones',  // Via junction table
        through: { attributes: [] },
        attributes: { exclude: ['geom'] },
        include: [
          {
            model: AdministrativeZone,
            attributes: { exclude: ['geom'] },
            include: [
              {
                model: Dzongkhag,
                attributes: { exclude: ['geom'] },
              },
            ],
          },
        ],
      });
    }

    return await this.enumerationAreaRepository.findOne({
      where: { id },
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      include,
    });
  }

  /**
   * Find enumeration areas by sub-administrative zone with optional associations
   * Uses junction table to find all EAs where the SAZ is linked
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
   */
  async findBySubAdministrativeZone(
    subAdministrativeZoneId: number,
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    const include: any[] = [
      {
        model: SubAdministrativeZone,
        as: 'subAdministrativeZones',  // Via junction table
        where: { id: subAdministrativeZoneId },
        through: { attributes: [] },
        ...(includeSubAdminZone && {
          attributes: { exclude: withGeom ? [] : ['geom'] },
          include: [
            {
              model: AdministrativeZone,
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: Dzongkhag,
                  attributes: { exclude: ['geom'] },
                },
              ],
            },
          ],
        }),
      },
    ];

    return await this.enumerationAreaRepository.findAll<EnumerationArea>({
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      include,
    });
  }

  async findAllAsGeoJsonBySubAdministrativeZone(
    subAdministrativeZoneId: number,
  ): Promise<any> {
    // Use junction table to find EAs linked to this SAZ
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
        FROM (
          SELECT ea.* 
          FROM "EnumerationAreas" ea
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          WHERE junction."subAdministrativeZoneId" = ${subAdministrativeZoneId}
          ORDER BY ea.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  /**
   * Find enumeration areas by administrative zone with optional associations
   * Uses junction table to find all EAs linked to SAZs in the given administrative zone
   * @param administrativeZoneId - Administrative Zone ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   */
  async findByAdministrativeZone(
    administrativeZoneId: number,
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      where: {},
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          where: { administrativeZoneId },
          through: { attributes: [] },
          attributes: { exclude: withGeom ? [] : ['geom'] },
          required: true,
        },
      ],
    };

    if (includeSubAdminZone) {
      options.include[0].include = [
        {
          model: AdministrativeZone,
          attributes: { exclude: withGeom ? [] : ['geom'] },
        },
      ];
    }

    return await this.enumerationAreaRepository.findAll<EnumerationArea>(
      options,
    );
  }

  async findAllAsGeoJsonByAdministrativeZone(
    administrativeZoneId: number,
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
        FROM (
          SELECT DISTINCT ea.* 
          FROM "EnumerationAreas" ea
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          INNER JOIN "SubAdministrativeZones" saz ON junction."subAdministrativeZoneId" = saz.id
          WHERE saz."administrativeZoneId" = ${administrativeZoneId}
          ORDER BY ea.id
        ) inputs
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

  async findOneAsGeoJson(id: number): Promise<any> {
    const data: any = await this.enumerationAreaRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         inputs.id,
        'geometry',   ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'geom'
      ) AS feature
      FROM (SELECT * FROM "EnumerationAreas" WHERE id = ${id}) inputs;`,
    );

    if (!data[0] || !data[0][0] || !data[0][0].feature) {
      throw new Error(`Enumeration area with ID ${id} not found`);
    }

    return data[0][0].feature;
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
