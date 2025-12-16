import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { SubAdministrativeZone } from './entities/sub-administrative-zone.entity';
import { CreateSubAdministrativeZoneDto } from './dto/create-sub-administrative-zone.dto';
import { UpdateSubAdministrativeZoneDto } from './dto/update-sub-administrative-zone.dto';
import { CreateSubAdministrativeZoneGeoJsonDto } from './dto/create-sub-administrative-zone-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize } from 'sequelize';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { EnumerationAreaSubAdministrativeZone } from '../enumeration-area/entities/enumeration-area-sub-administrative-zone.entity';

@Injectable()
export class SubAdministrativeZoneService {
  constructor(
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
    @Inject('ENUMERATION_AREA_SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly junctionRepository: typeof EnumerationAreaSubAdministrativeZone,
  ) {}

  async create(
    createSubAdministrativeZoneDto: CreateSubAdministrativeZoneDto,
  ): Promise<SubAdministrativeZone> {
    return await this.subAdministrativeZoneRepository.create(
      instanceToPlain(createSubAdministrativeZoneDto),
    );
  }

  async createFromGeoJson(
    geoJsonDto: CreateSubAdministrativeZoneGeoJsonDto,
  ): Promise<SubAdministrativeZone> {
    const { properties, geometry } = geoJsonDto;

    // Prepare geometry - only convert if it exists
    const geomValue = geometry
      ? Sequelize.fn('ST_GeomFromGeoJSON', JSON.stringify(geometry))
      : null;

    const subAdministrativeZone =
      await this.subAdministrativeZoneRepository.create({
        administrativeZoneId: properties.administrativeZoneId,
        name: properties.name,
        areaCode: properties.areaCode,
        type: properties.type,
        geom: geomValue,
      });

    return subAdministrativeZone;
  }

  /**
   * Bulk create sub-administrative zones from GeoJSON FeatureCollection
   * @param features - Array of GeoJSON features
   * @param administrativeZoneId - Optional administrative zone ID to filter/assign to all features
   * @returns Summary of created, skipped, and error items
   */
  async bulkCreateFromGeoJson(
    features: any[],
    administrativeZoneId?: number,
  ): Promise<{
    success: number;
    skipped: number;
    created: SubAdministrativeZone[];
    skippedItems: Array<{
      areaCode: string;
      administrativeZoneId: number;
      reason: string;
    }>;
    errors: Array<{
      feature: any;
      error: string;
    }>;
  }> {
    const created: SubAdministrativeZone[] = [];
    const skippedItems: Array<{
      areaCode: string;
      administrativeZoneId: number;
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

        // Use administrativeZoneId from parameter if provided, otherwise from properties
        const finalAdministrativeZoneId =
          administrativeZoneId || properties.administrativeZoneId;

        // Validate required properties
        if (
          !finalAdministrativeZoneId ||
          !properties.name ||
          !properties.areaCode
        ) {
          errors.push({
            feature,
            error:
              'Missing required properties: administrativeZoneId, name, or areaCode',
          });
          continue;
        }

        // Validate type if provided
        if (
          properties.type &&
          !['chiwog', 'lap'].includes(properties.type.toLowerCase())
        ) {
          errors.push({
            feature,
            error: 'Invalid type. Must be "chiwog" or "lap".',
          });
          continue;
        }

        // Check if sub-administrative zone already exists by areaCode and administrativeZoneId
        const existingSAZ =
          await this.subAdministrativeZoneRepository.findOne({
            where: {
              areaCode: properties.areaCode,
              administrativeZoneId: finalAdministrativeZoneId,
            },
          });

        if (existingSAZ) {
          skippedItems.push({
            areaCode: properties.areaCode,
            administrativeZoneId: finalAdministrativeZoneId,
            reason: 'Sub-Administrative Zone already exists',
          });
          continue;
        }

        // Convert GeoJSON geometry to PostGIS format
        const geomString = JSON.stringify(geometry);

        // Create the sub-administrative zone
        const subAdministrativeZone =
          await this.subAdministrativeZoneRepository.create({
            administrativeZoneId: finalAdministrativeZoneId,
            name: properties.name,
            areaCode: properties.areaCode,
            type: properties.type
              ? (properties.type.toLowerCase() as 'chiwog' | 'lap')
              : 'chiwog', // Default to chiwog if not specified
            geom: geometry
              ? Sequelize.fn('ST_GeomFromGeoJSON', geomString)
              : null,
          });

        created.push(subAdministrativeZone);
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

  async findAll(): Promise<SubAdministrativeZone[]> {
    return await this.subAdministrativeZoneRepository.findAll<SubAdministrativeZone>(
      {
        include: ['administrativeZone'],
      },
    );
  }

  async findOne(
    id: number,
    includeEnumerationAreas = false,
  ): Promise<SubAdministrativeZone> {
    const includeOptions: any[] = [
      {
        model: AdministrativeZone,
        include: [{ model: Dzongkhag }],
      },
    ];

    if (includeEnumerationAreas) {
      includeOptions.push({
        model: EnumerationArea,
        as: 'enumerationAreas',  // Via junction table
        through: { attributes: [] },
      });
    }

    return await this.subAdministrativeZoneRepository.findOne<SubAdministrativeZone>(
      {
        where: { id },
        include: includeOptions,
      },
    );
  }

  async findOneWithoutGeom(
    id: number,
    includeEnumerationAreas = false,
  ): Promise<SubAdministrativeZone> {
    const includeOptions: any[] = [
      {
        association: 'administrativeZone',
        include: ['dzongkhag'],
      },
    ];

    if (includeEnumerationAreas) {
      includeOptions.push({
        model: EnumerationArea,
        as: 'enumerationAreas',  // Via junction table
        through: { attributes: [] },
      });
    }

    return await this.subAdministrativeZoneRepository.findOne<SubAdministrativeZone>(
      {
        where: { id },
        include: includeOptions,
        attributes: { exclude: ['geom'] },
      },
    );
  }

  async findByAdministrativeZone(
    administrativeZoneId: number,
  ): Promise<SubAdministrativeZone[]> {
    return await this.subAdministrativeZoneRepository.findAll<SubAdministrativeZone>(
      {
        where: { administrativeZoneId },
      },
    );
  }

  /**
   * Find all sub-administrative zones by dzongkhag ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Array of sub-administrative zones
   */
  async findByDzongkhag(
    dzongkhagId: number,
  ): Promise<SubAdministrativeZone[]> {
    return await this.subAdministrativeZoneRepository.findAll<SubAdministrativeZone>(
      {
        include: [
          {
            model: AdministrativeZone,
            where: { dzongkhagId },
            attributes: ['id', 'name', 'type', 'dzongkhagId'],
          },
        ],
        order: [['id', 'ASC']],
      },
    );
  }

  async findAllAsGeoJsonByAdministrativeZone(
    administrativeZoneId: number,
  ): Promise<any> {
    const data: any =
      await this.subAdministrativeZoneRepository.sequelize.query(
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
        FROM (SELECT * FROM "SubAdministrativeZones" WHERE "administrativeZoneId" = ${administrativeZoneId} ORDER BY id) inputs
      ) features;`,
      );

    return data[0][0].jsonb_build_object;
  }

  /**
   * Find all sub-administrative zones by dzongkhag ID as GeoJSON
   * @param dzongkhagId - Dzongkhag ID
   * @returns GeoJSON FeatureCollection
   */
  async findAllAsGeoJsonByDzongkhag(dzongkhagId: number): Promise<any> {
    const data: any =
      await this.subAdministrativeZoneRepository.sequelize.query(
        `SELECT jsonb_build_object(
        'type',     'FeatureCollection',
        'features', jsonb_agg(features.feature)
      )
      FROM (
        SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (
          SELECT saz.* 
          FROM "SubAdministrativeZones" saz
          JOIN "AdministrativeZones" az ON saz."administrativeZoneId" = az.id
          WHERE az."dzongkhagId" = ${dzongkhagId}
          ORDER BY saz.id
        ) inputs
      ) features;`,
      );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  async findAllAsGeoJson(): Promise<any> {
    const data: any =
      await this.subAdministrativeZoneRepository.sequelize.query(
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
        FROM (SELECT * FROM "SubAdministrativeZones" ORDER BY id) inputs
      ) features;`,
      );

    return data[0][0].jsonb_build_object;
  }

  async findOneAsGeoJson(id: number): Promise<any> {
    const data: any =
      await this.subAdministrativeZoneRepository.sequelize.query(
        `SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (SELECT * FROM "SubAdministrativeZones" WHERE id = ${id}) inputs;`,
      );

    if (!data[0] || !data[0][0] || !data[0][0].feature) {
      throw new Error(`Sub-administrative zone with ID ${id} not found`);
    }

    return data[0][0].feature;
  }

  async update(
    id: number,
    updateSubAdministrativeZoneDto: UpdateSubAdministrativeZoneDto,
  ) {
    const [numRows, updatedRows] =
      await this.subAdministrativeZoneRepository.update(
        instanceToPlain(updateSubAdministrativeZoneDto),
        {
          where: { id },
          returning: true,
        },
      );

    if (numRows === 0) {
      throw new Error(`Sub-administrative zone with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  async updateGeometry(
    id: number,
    geometry: any,
  ): Promise<SubAdministrativeZone> {
    // First check if the sub-administrative zone exists
    const subAdministrativeZone =
      await this.subAdministrativeZoneRepository.findByPk(id);
    if (!subAdministrativeZone) {
      throw new Error(`Sub-administrative zone with ID ${id} not found`);
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    await this.subAdministrativeZoneRepository.update(
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
    return await this.subAdministrativeZoneRepository.destroy({
      where: { id },
    });
  }

  /**
   * Create a single SAZ with its corresponding EA (EA1) in one operation
   * SAZ and EA share the same geometry from the GeoJSON file
   * EA is created with hardcoded values: name="EA1", areaCode="01"
   * 
   * @param administrativeZoneId - Administrative Zone ID
   * @param name - SAZ name
   * @param areaCode - SAZ area code
   * @param type - SAZ type ('chiwog' or 'lap')
   * @param geometry - GeoJSON geometry (from parsed file)
   * @returns Object containing both created SAZ and EA
   */
  async createSazWithEa(
    administrativeZoneId: number,
    name: string,
    areaCode: string,
    type: 'chiwog' | 'lap',
    geometry: any,
  ): Promise<{
    subAdministrativeZone: SubAdministrativeZone;
    enumerationArea: EnumerationArea;
  }> {
    // Validate administrative zone exists
    const adminZone = await this.administrativeZoneRepository.findByPk(
      administrativeZoneId,
    );
    if (!adminZone) {
      throw new NotFoundException(
        `Administrative Zone with ID ${administrativeZoneId} not found`,
      );
    }

    // Validate type
    if (!['chiwog', 'lap'].includes(type.toLowerCase())) {
      throw new BadRequestException('Type must be "chiwog" or "lap"');
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);
    const geomValue = Sequelize.fn('ST_GeomFromGeoJSON', geomString);

    // Create SAZ
    const subAdministrativeZone =
      await this.subAdministrativeZoneRepository.create({
        administrativeZoneId,
        name,
        areaCode,
        type: type.toLowerCase() as 'chiwog' | 'lap',
        geom: geomValue,
      });

    // Create EA with hardcoded values and same geometry
    const enumerationArea = await this.enumerationAreaRepository.create({
      name: 'EA1',
      areaCode: '01',
      description: `Enumeration Area for ${name}`,
      geom: geomValue,
    });

    // Link SAZ to EA via junction table
    await this.junctionRepository.create({
      enumerationAreaId: enumerationArea.id,
      subAdministrativeZoneId: subAdministrativeZone.id,
    });

    return {
      subAdministrativeZone,
      enumerationArea,
    };
  }
}
