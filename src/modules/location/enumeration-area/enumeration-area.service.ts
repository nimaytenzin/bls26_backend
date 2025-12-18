import { Inject, Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
import { EnumerationAreaLineage, OperationType } from './entities/enumeration-area-lineage.entity';
import { SplitEnumerationAreaDto } from './dto/split-enumeration-area.dto';
import { MergeEnumerationAreasDto } from './dto/merge-enumeration-areas.dto';
import { EaLineageResponseDto, EaLineageNodeDto, EaOperationDto } from './dto/ea-lineage-response.dto';
import { EaHistoryResponseDto, EaHistoryNodeDto } from './dto/ea-history-response.dto';
import { Op } from 'sequelize';
import {
  PaginationUtil,
  PaginationQueryDto,
  PaginatedResponse,
} from '../../../common/utils/pagination.util';

@Injectable()
export class EnumerationAreaService {
  constructor(
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('ENUMERATION_AREA_SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly junctionRepository: typeof EnumerationAreaSubAdministrativeZone,
    @Inject('ENUMERATION_AREA_LINEAGE_REPOSITORY')
    private readonly lineageRepository: typeof EnumerationAreaLineage,
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
  ) {}

  async create(
    createEnumerationAreaDto: CreateEnumerationAreaDto,
  ): Promise<EnumerationArea> {
    const { subAdministrativeZoneIds, ...eaData } = createEnumerationAreaDto;
    
    // Create the enumeration area
    const enumerationArea = await this.enumerationAreaRepository.create({
      ...eaData,
    });

    // Validate that the EA was created with a valid ID
    if (!enumerationArea.id || isNaN(enumerationArea.id) || !isFinite(enumerationArea.id)) {
      throw new Error(`Failed to create enumeration area - invalid ID: ${enumerationArea.id}`);
    }

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
   * By default, only returns active EAs (isActive = true)
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
   * @param includeInactive - Include inactive EAs (default: false)
   */
  async findAll(
    withGeom = false,
    includeSubAdminZone = false,
    includeInactive = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      where: includeInactive ? {} : { isActive: true },
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
   * Find all active enumeration areas
   */
  async findAllActive(
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    return this.findAll(withGeom, includeSubAdminZone, false);
  }

  /**
   * Find all inactive enumeration areas
   */
  async findAllInactive(
    withGeom = false,
    includeSubAdminZone = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      where: { isActive: false },
    };

    if (includeSubAdminZone) {
      options.include = [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
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
    // Validate ID to prevent NaN errors
    if (!id || isNaN(id) || !isFinite(id)) {
      throw new Error(`Invalid ID provided to findOne: ${id}`);
    }

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
   * By default, only returns active EAs (isActive = true)
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include sub-administrative zones via junction table (default: false)
   * @param includeInactive - Include inactive EAs (default: false)
   */
  async findBySubAdministrativeZone(
    subAdministrativeZoneId: number,
    withGeom = false,
    includeSubAdminZone = false,
    includeInactive = false,
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
      where: includeInactive ? {} : { isActive: true },
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
   * By default, only returns active EAs (isActive = true)
   * @param administrativeZoneId - Administrative Zone ID
   * @param withGeom - Include geometry (default: false)
   * @param includeSubAdminZone - Include parent sub-administrative zone (default: false)
   * @param includeInactive - Include inactive EAs (default: false)
   */
  async findByAdministrativeZone(
    administrativeZoneId: number,
    withGeom = false,
    includeSubAdminZone = false,
    includeInactive = false,
  ): Promise<EnumerationArea[]> {
    const options: any = {
      where: includeInactive ? {} : { isActive: true },
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
    includeInactive = false,
  ): Promise<any> {
    const inactiveFilter = includeInactive ? '' : 'AND ea."isActive" = true';
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
          ${inactiveFilter}
          ORDER BY ea.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async findAllAsGeoJson(includeInactive = false): Promise<any> {
    const inactiveFilter = includeInactive ? '' : 'WHERE "isActive" = true';
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
        FROM (SELECT * FROM "EnumerationAreas" ${inactiveFilter} ORDER BY id) inputs
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

  /**
   * Migrate existing subAdministrativeZoneId relationships to junction table
   * This method is idempotent - safe to run multiple times
   * @returns Migration statistics
   */
  async migrateToJunctionTable(): Promise<{
    message: string;
    totalEAs: number;
    migrated: number;
    skipped: number;
    alreadyExists: number;
    errors: Array<{ eaId: number; error: string }>;
  }> {
    console.log('[Migration] Starting migration to junction table...');
    
    // Find all EAs with non-null subAdministrativeZoneId
    console.log('[Migration] Fetching enumeration areas with subAdministrativeZoneId...');
    const easWithOldId = await this.enumerationAreaRepository.findAll();

    console.log(`[Migration] Found ${easWithOldId.length} enumeration areas with subAdministrativeZoneId`);

    const totalEAs = easWithOldId.length;
    let migrated = 0;
    let skipped = 0;
    let alreadyExists = 0;
    const errors: Array<{ eaId: number; error: string }> = [];

    for (const ea of easWithOldId) {
      const eaId = ea.id;
      const sazId = ea.subAdministrativeZoneId;

   
      // Skip if no subAdministrativeZoneId
      if (!sazId || sazId === null || sazId === undefined) {
        console.log(`[Migration] Skipping EA ${eaId} - no subAdministrativeZoneId`);
        skipped++;
        continue;
      }

      // Validate SAZ ID
      if (isNaN(sazId) || !isFinite(sazId)) {
        console.error(`[Migration] Invalid SAZ ID: ${sazId} for EA ${eaId}`);
        errors.push({
          eaId,
          error: `Invalid SAZ ID: ${sazId}`,
        });
        skipped++;
        continue;
      }

      console.log(`[Migration] Processing EA ${eaId} (${ea.name || ea.areaCode}) with SAZ ${sazId}`);

      // Check if junction table entry already exists
      try {
        const existingJunction = await this.junctionRepository.findOne({
          where: {
            enumerationAreaId: eaId,
            subAdministrativeZoneId: sazId,
          },
        });

        if (existingJunction) {
          console.log(`[Migration] Junction entry already exists for EA ${eaId} -> SAZ ${sazId}`);
          alreadyExists++;
          continue;
        }

        // Create junction table entry
        console.log(`[Migration] Creating junction entry for EA ${eaId} -> SAZ ${sazId}`);
        await this.junctionRepository.create({
          enumerationAreaId: eaId,
          subAdministrativeZoneId: sazId,
        });
        migrated++;
        console.log(`[Migration] ✓ Successfully created junction entry for EA ${eaId} -> SAZ ${sazId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[Migration] ✗ Error processing EA ${eaId} -> SAZ ${sazId}:`, errorMessage);
        console.error(`[Migration] Error details:`, error);
        errors.push({
          eaId,
          error: errorMessage,
        });
        // If creation fails (e.g., duplicate key), count as already exists
        alreadyExists++;
      }
    }

    console.log('[Migration] ========================================');
    console.log('[Migration] Migration Summary:');
    console.log(`[Migration]   Total EAs processed: ${totalEAs}`);
    console.log(`[Migration]   Successfully migrated: ${migrated}`);
    console.log(`[Migration]   Skipped: ${skipped}`);
    console.log(`[Migration]   Already exists: ${alreadyExists}`);
    console.log(`[Migration]   Errors: ${errors.length}`);
    if (errors.length > 0) {
      console.log('[Migration]   Error details:', errors);
    }
    console.log('[Migration] ========================================');

    return {
      message: 'Migration completed successfully',
      totalEAs,
      migrated,
      skipped,
      alreadyExists,
      errors,
    };
  }

  /**
   * Create two SAZs from GeoJSON files and a single EA that links to both
   * Uses transaction for rollback on any failure
   * @param saz1Data - SAZ1 form data (name, areaCode, type, administrativeZoneId)
   * @param saz1Geometry - SAZ1 GeoJSON geometry
   * @param saz2Data - SAZ2 form data (name, areaCode, type, administrativeZoneId)
   * @param saz2Geometry - SAZ2 GeoJSON geometry
   * @returns Created SAZs and EA
   */
  async createTwoSazsWithEa(
    saz1Data: {
      name: string;
      areaCode: string;
      type: 'chiwog' | 'lap';
      administrativeZoneId: number;
    },
    saz1Geometry: any,
    saz2Data: {
      name: string;
      areaCode: string;
      type: 'chiwog' | 'lap';
      administrativeZoneId: number;
    },
    saz2Geometry: any,
  ): Promise<{
    subAdministrativeZone1: SubAdministrativeZone;
    subAdministrativeZone2: SubAdministrativeZone;
    enumerationArea: EnumerationArea;
  }> {
    // Validate both SAZs have same administrativeZoneId
    if (saz1Data.administrativeZoneId !== saz2Data.administrativeZoneId) {
      throw new BadRequestException(
        'Both SAZs must belong to the same Administrative Zone',
      );
    }

    // Validate administrative zone exists
    const adminZone = await this.administrativeZoneRepository.findByPk(
      saz1Data.administrativeZoneId,
    );
    if (!adminZone) {
      throw new NotFoundException(
        `Administrative Zone with ID ${saz1Data.administrativeZoneId} not found`,
      );
    }

    // Validate types
    if (!['chiwog', 'lap'].includes(saz1Data.type.toLowerCase())) {
      throw new BadRequestException('SAZ1 type must be "chiwog" or "lap"');
    }
    if (!['chiwog', 'lap'].includes(saz2Data.type.toLowerCase())) {
      throw new BadRequestException('SAZ2 type must be "chiwog" or "lap"');
    }

    // Check if SAZ1 already exists (by areaCode + administrativeZoneId)
    const existingSAZ1 = await this.subAdministrativeZoneRepository.findOne({
      where: {
        areaCode: saz1Data.areaCode,
        administrativeZoneId: saz1Data.administrativeZoneId,
      },
    });
    if (existingSAZ1) {
      throw new BadRequestException(
        `SAZ1 with areaCode "${saz1Data.areaCode}" already exists in Administrative Zone ${saz1Data.administrativeZoneId}`,
      );
    }

    // Check if SAZ2 already exists (by areaCode + administrativeZoneId)
    const existingSAZ2 = await this.subAdministrativeZoneRepository.findOne({
      where: {
        areaCode: saz2Data.areaCode,
        administrativeZoneId: saz2Data.administrativeZoneId,
      },
    });
    if (existingSAZ2) {
      throw new BadRequestException(
        `SAZ2 with areaCode "${saz2Data.areaCode}" already exists in Administrative Zone ${saz2Data.administrativeZoneId}`,
      );
    }

    // Use transaction for rollback on any failure
    const transaction = await this.enumerationAreaRepository.sequelize.transaction();

    try {
      // Convert GeoJSON geometries to PostGIS format
      const saz1GeomString = JSON.stringify(saz1Geometry);
      const saz2GeomString = JSON.stringify(saz2Geometry);
      const saz1GeomValue = Sequelize.fn('ST_GeomFromGeoJSON', saz1GeomString);
      const saz2GeomValue = Sequelize.fn('ST_GeomFromGeoJSON', saz2GeomString);

      // Create SAZ1
      const subAdministrativeZone1 =
        await this.subAdministrativeZoneRepository.create(
          {
            administrativeZoneId: saz1Data.administrativeZoneId,
            name: saz1Data.name,
            areaCode: saz1Data.areaCode,
            type: saz1Data.type.toLowerCase() as 'chiwog' | 'lap',
            geom: saz1GeomValue,
          },
          { transaction },
        );

      // Create SAZ2
      const subAdministrativeZone2 =
        await this.subAdministrativeZoneRepository.create(
          {
            administrativeZoneId: saz2Data.administrativeZoneId,
            name: saz2Data.name,
            areaCode: saz2Data.areaCode,
            type: saz2Data.type.toLowerCase() as 'chiwog' | 'lap',
            geom: saz2GeomValue,
          },
          { transaction },
        );

      // Combine geometries using ST_Union
      // Escape single quotes in GeoJSON strings for SQL
      const escapedSaz1Geom = saz1GeomString.replace(/'/g, "''");
      const escapedSaz2Geom = saz2GeomString.replace(/'/g, "''");

      // Check if EA with areaCode "01" already exists for this SAZ combination
      // Use junction table query to avoid subAdministrativeZoneId column issues
      const existingEAs = await this.junctionRepository.findAll({
        where: {
          subAdministrativeZoneId: {
            [Op.in]: [subAdministrativeZone1.id, subAdministrativeZone2.id],
          },
        },
        attributes: ['enumerationAreaId'],
        transaction,
      });

      if (existingEAs.length > 0) {
        // Get unique EA IDs
        const eaIds = [...new Set(existingEAs.map((j) => j.enumerationAreaId))];

        // Check if any of these EAs have areaCode "01" and are linked to both SAZs
        for (const eaId of eaIds) {
          const ea = await this.enumerationAreaRepository.findOne({
            where: {
              id: eaId,
              areaCode: '01',
            },
            attributes: { 
              exclude: ['subAdministrativeZoneId'], // Explicitly exclude if column doesn't exist
              include: ['id', 'areaCode'],
            },
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',
                attributes: ['id', 'areaCode'],
                through: { attributes: [] },
              },
            ],
            transaction,
          });

          if (ea) {
            // Check if it has exactly these two SAZs
            const linkedSAZIds = ea.subAdministrativeZones?.map((saz) => saz.id) || [];
            const expectedIds = [subAdministrativeZone1.id, subAdministrativeZone2.id].sort();
            const actualIds = linkedSAZIds.sort();

            if (
              expectedIds.length === actualIds.length &&
              expectedIds.every((id, idx) => id === actualIds[idx])
            ) {
              await transaction.rollback();
              throw new BadRequestException(
                `EA with areaCode "01" already exists for SAZ combination (${subAdministrativeZone1.areaCode}, ${subAdministrativeZone2.areaCode})`,
              );
            }
          }
        }
      }

      // Combine geometries using ST_Union
      const combinedGeometry = Sequelize.literal(
        `ST_Union(
          ST_GeomFromGeoJSON('${escapedSaz1Geom}'),
          ST_GeomFromGeoJSON('${escapedSaz2Geom}')
        )`,
      );

      // Create EA with combined geometry
      // Use fields option to explicitly specify only the columns that exist
      // subAdministrativeZoneId is nullable and won't be set
      const enumerationArea = await this.enumerationAreaRepository.create(
        {
          name: 'EA1',
          areaCode: '01',
          description: `EA for ${saz1Data.name} and ${saz2Data.name}`,
          geom: combinedGeometry,
          // subAdministrativeZoneId is not set - will remain null
        },
        {
          transaction,
          fields: ['name', 'areaCode', 'description', 'geom'], // Only insert these fields
        },
      );

      // Link EA to both SAZs via junction table
      await this.junctionRepository.bulkCreate(
        [
          {
            enumerationAreaId: enumerationArea.id,
            subAdministrativeZoneId: subAdministrativeZone1.id,
          },
          {
            enumerationAreaId: enumerationArea.id,
            subAdministrativeZoneId: subAdministrativeZone2.id,
          },
        ],
        { transaction },
      );

      // Commit transaction
      await transaction.commit();

      // Reload EA with SAZs
      const eaWithSAZs = await this.findOne(
        enumerationArea.id,
        false,
        true,
      );

      return {
        subAdministrativeZone1,
        subAdministrativeZone2,
        enumerationArea: eaWithSAZs,
      };
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Split an enumeration area into multiple new EAs
   * Marks the source EA as inactive and creates lineage records
   */
  async splitEnumerationArea(
    sourceEaId: number,
    splitData: SplitEnumerationAreaDto['newEas'],
    reason?: string,
  ): Promise<EnumerationArea[]> {
    // Start transaction
    const transaction = await this.enumerationAreaRepository.sequelize.transaction();

    try {
      // Validate source EA exists and is active
      const sourceEa = await this.enumerationAreaRepository.findByPk(sourceEaId, {
        transaction,
      });

      if (!sourceEa) {
        throw new NotFoundException(`Enumeration area with ID ${sourceEaId} not found`);
      }

      if (!sourceEa.isActive) {
        throw new BadRequestException(
          `Cannot split inactive enumeration area with ID ${sourceEaId}`,
        );
      }

      // Validate new areaCodes are unique
      const newAreaCodes = splitData.map((ea) => ea.areaCode);
      const existingEAs = await this.enumerationAreaRepository.findAll({
        where: {
          areaCode: { [Op.in]: newAreaCodes },
        },
        transaction,
      });

      if (existingEAs.length > 0) {
        throw new BadRequestException(
          `Area codes already exist: ${existingEAs.map((ea) => ea.areaCode).join(', ')}`,
        );
      }

      // Mark source EA as inactive
      await this.enumerationAreaRepository.update(
        {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedReason: reason || `Split into ${splitData.length} new enumeration areas`,
        },
        {
          where: { id: sourceEaId },
          transaction,
        },
      );

      // Create new EAs
      const newEAs: EnumerationArea[] = [];
      for (const eaData of splitData) {
        const { subAdministrativeZoneIds, geom, ...restData } = eaData;

        // Convert GeoJSON geometry to PostGIS format
        const geomString = JSON.stringify(JSON.parse(geom));
        const geomValue = Sequelize.fn('ST_GeomFromGeoJSON', geomString);

        // Create EA
        const newEa = await this.enumerationAreaRepository.create(
          {
            ...restData,
            geom: geomValue,
            isActive: true,
          },
          {
            transaction,
            fields: ['name', 'areaCode', 'description', 'geom', 'isActive'],
          },
        );

        // Link to SAZs via junction table
        if (subAdministrativeZoneIds && subAdministrativeZoneIds.length > 0) {
          await this.junctionRepository.bulkCreate(
            subAdministrativeZoneIds.map((sazId) => ({
              enumerationAreaId: newEa.id,
              subAdministrativeZoneId: sazId,
            })),
            { transaction },
          );
        }

        // Create lineage record
        await this.lineageRepository.create(
          {
            parentEaId: sourceEaId,
            childEaId: newEa.id,
            operationType: OperationType.SPLIT,
            operationDate: new Date(),
            reason: reason,
          },
          { transaction },
        );

        newEAs.push(newEa);
      }

      // Commit transaction
      await transaction.commit();

      // Reload EAs with SAZs
      const result: EnumerationArea[] = [];
      for (const ea of newEAs) {
        const loadedEa = await this.findOne(ea.id, false, true);
        result.push(loadedEa);
      }

      return result;
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Merge multiple enumeration areas into one new EA
   * Marks all source EAs as inactive and creates lineage records
   */
  async mergeEnumerationAreas(
    sourceEaIds: number[],
    mergedEaData: MergeEnumerationAreasDto['mergedEa'],
    reason?: string,
  ): Promise<EnumerationArea> {
    // Start transaction
    const transaction = await this.enumerationAreaRepository.sequelize.transaction();

    try {
      // Validate all source EAs exist and are active
      const sourceEAs = await this.enumerationAreaRepository.findAll({
        where: {
          id: { [Op.in]: sourceEaIds },
        },
        transaction,
      });

      if (sourceEAs.length !== sourceEaIds.length) {
        const foundIds = sourceEAs.map((ea) => ea.id);
        const missingIds = sourceEaIds.filter((id) => !foundIds.includes(id));
        throw new NotFoundException(
          `Enumeration areas not found: ${missingIds.join(', ')}`,
        );
      }

      // Check if any are inactive
      const inactiveEAs = sourceEAs.filter((ea) => !ea.isActive);
      if (inactiveEAs.length > 0) {
        throw new BadRequestException(
          `Cannot merge inactive enumeration areas: ${inactiveEAs.map((ea) => ea.id).join(', ')}`,
        );
      }

      // Validate new areaCode is unique (allow reusing area code from source EAs)
      // First check if any of the source EAs already have this area code
      const sourceEaWithSameCode = sourceEAs.find(
        (ea) => ea.areaCode === mergedEaData.areaCode,
      );

      if (!sourceEaWithSameCode) {
        // If none of the source EAs have this code, check if it exists elsewhere
        const existingEa = await this.enumerationAreaRepository.findOne({
          where: {
            areaCode: mergedEaData.areaCode,
            isActive: true, // Only check active EAs
          },
          transaction,
        });

        if (existingEa) {
          // Area code exists on a different active EA - not allowed
          throw new BadRequestException(
            `Area code "${mergedEaData.areaCode}" already exists on an active enumeration area`,
          );
        }
      }
      // If a source EA has this area code, it's allowed - it will be deactivated below

      // Mark all source EAs as inactive
      await this.enumerationAreaRepository.update(
        {
          isActive: false,
          deactivatedAt: new Date(),
          deactivatedReason: reason || `Merged into new enumeration area`,
        },
        {
          where: { id: { [Op.in]: sourceEaIds } },
          transaction,
        },
      );

      // Create merged EA
      const { subAdministrativeZoneIds, geom, ...restData } = mergedEaData;

      // Convert GeoJSON geometry to PostGIS format
      const geomString = JSON.stringify(JSON.parse(geom));
      const geomValue = Sequelize.fn('ST_GeomFromGeoJSON', geomString);

      const mergedEa = await this.enumerationAreaRepository.create(
        {
          ...restData,
          geom: geomValue,
          isActive: true,
        },
        {
          transaction,
          fields: ['name', 'areaCode', 'description', 'geom', 'isActive'],
        },
      );

      // Link to SAZs via junction table
      if (subAdministrativeZoneIds && subAdministrativeZoneIds.length > 0) {
        await this.junctionRepository.bulkCreate(
          subAdministrativeZoneIds.map((sazId) => ({
            enumerationAreaId: mergedEa.id,
            subAdministrativeZoneId: sazId,
          })),
          { transaction },
        );
      }

      // Create lineage records for each source EA
      for (const sourceEaId of sourceEaIds) {
        await this.lineageRepository.create(
          {
            parentEaId: sourceEaId,
            childEaId: mergedEa.id,
            operationType: OperationType.MERGE,
            operationDate: new Date(),
            reason: reason,
          },
          { transaction },
        );
      }

      // Commit transaction
      await transaction.commit();

      // Reload EA with SAZs
      return await this.findOne(mergedEa.id, false, true);
    } catch (error) {
      // Rollback transaction on any error
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * Get EA lineage (ancestors and/or descendants)
   * @param eaId - Enumeration Area ID
   * @param direction - 'ancestors', 'descendants', or 'both'
   */
  async getEaLineage(
    eaId: number,
    direction: 'ancestors' | 'descendants' | 'both' = 'both',
  ): Promise<EaLineageResponseDto> {
    // Get the EA
    const ea = await this.enumerationAreaRepository.findByPk(eaId);
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${eaId} not found`);
    }

    const ancestors: EaLineageNodeDto[] = [];
    const descendants: EaLineageNodeDto[] = [];
    const operations: EaOperationDto[] = [];

    // Helper function to recursively get ancestors
    const getAncestors = async (currentEaId: number): Promise<EaLineageNodeDto[]> => {
      const lineages = await this.lineageRepository.findAll({
        where: { childEaId: currentEaId },
        include: [
          {
            model: EnumerationArea,
            as: 'parentEa',
            attributes: { exclude: ['geom'] },
          },
        ],
        order: [['operationDate', 'DESC']],
      });

      const nodes: EaLineageNodeDto[] = [];

      for (const lineage of lineages) {
        const operation: EaOperationDto = {
          type: lineage.operationType,
          date: lineage.operationDate,
          reason: lineage.reason,
          parentEaId: lineage.parentEaId,
          childEaId: lineage.childEaId,
        };

        operations.push(operation);

        // Recursively get ancestors of this parent
        const parentAncestors = await getAncestors(lineage.parentEaId);

        const node: EaLineageNodeDto = {
          ea: lineage.parentEa,
          operation,
          children: [],
          parents: parentAncestors,
        };

        nodes.push(node);
      }

      return nodes;
    };

    // Helper function to recursively get descendants
    const getDescendants = async (currentEaId: number): Promise<EaLineageNodeDto[]> => {
      const lineages = await this.lineageRepository.findAll({
        where: { parentEaId: currentEaId },
        include: [
          {
            model: EnumerationArea,
            as: 'childEa',
            attributes: { exclude: ['geom'] },
          },
        ],
        order: [['operationDate', 'DESC']],
      });

      const nodes: EaLineageNodeDto[] = [];

      for (const lineage of lineages) {
        const operation: EaOperationDto = {
          type: lineage.operationType,
          date: lineage.operationDate,
          reason: lineage.reason,
          parentEaId: lineage.parentEaId,
          childEaId: lineage.childEaId,
        };

        operations.push(operation);

        // Recursively get descendants of this child
        const childDescendants = await getDescendants(lineage.childEaId);

        const node: EaLineageNodeDto = {
          ea: lineage.childEa,
          operation,
          children: childDescendants,
          parents: [],
        };

        nodes.push(node);
      }

      return nodes;
    };

    // Get ancestors if requested
    if (direction === 'ancestors' || direction === 'both') {
      const ancestorNodes = await getAncestors(eaId);
      ancestors.push(...ancestorNodes);
    }

    // Get descendants if requested
    if (direction === 'descendants' || direction === 'both') {
      const descendantNodes = await getDescendants(eaId);
      descendants.push(...descendantNodes);
    }

    return {
      ea,
      ancestors,
      descendants,
      operations: Array.from(
        new Map(
          operations.map((op) => [`${op.parentEaId}-${op.childEaId}`, op])
        ).values()
      ),
    };
  }

  /**
   * Get complete EA history tree (both ancestors and descendants)
   * Optimized for frontend visualization
   */
  async getEaHistory(eaId: number): Promise<EaHistoryResponseDto> {
    // Get the EA
    const ea = await this.enumerationAreaRepository.findByPk(eaId, {
      attributes: { exclude: ['geom'] },
    });
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${eaId} not found`);
    }

    // Helper function to build history tree recursively
    const buildHistoryTree = async (
      currentEaId: number,
      direction: 'up' | 'down',
    ): Promise<EaHistoryNodeDto[]> => {
      let lineages;
      if (direction === 'up') {
        // Get ancestors (where this EA came from)
        lineages = await this.lineageRepository.findAll({
          where: { childEaId: currentEaId },
          include: [
            {
              model: EnumerationArea,
              as: 'parentEa',
              attributes: { exclude: ['geom'] },
            },
          ],
          order: [['operationDate', 'DESC']],
        });
      } else {
        // Get descendants (what this EA became)
        lineages = await this.lineageRepository.findAll({
          where: { parentEaId: currentEaId },
          include: [
            {
              model: EnumerationArea,
              as: 'childEa',
              attributes: { exclude: ['geom'] },
            },
          ],
          order: [['operationDate', 'DESC']],
        });
      }

      const nodes: EaHistoryNodeDto[] = [];

      for (const lineage of lineages) {
        const targetEa = direction === 'up' ? lineage.parentEa : lineage.childEa;

        const operation = {
          type: lineage.operationType,
          date: lineage.operationDate,
          reason: lineage.reason,
        };

        // Recursively build tree
        const children = direction === 'down' ? await buildHistoryTree(targetEa.id, 'down') : [];
        const parents = direction === 'up' ? await buildHistoryTree(targetEa.id, 'up') : [];

        const node: EaHistoryNodeDto = {
          ea: targetEa,
          operation,
          children,
          parents,
        };

        nodes.push(node);
      }

      return nodes;
    };

    // Build complete history tree
    const ancestors = await buildHistoryTree(eaId, 'up');
    const descendants = await buildHistoryTree(eaId, 'down');

    return {
      currentEa: ea,
      history: {
        ancestors,
        descendants,
      },
    };
  }

  /**
   * Get all enumeration areas that were split, ordered by latest, paginated
   * @param query - Pagination query parameters
   * @returns Paginated list of split enumeration areas
   */
  async findAllSplitPaginated(
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<EnumerationArea>> {
    const options = PaginationUtil.normalizePaginationOptions(query);
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Find all unique parent EAs from SPLIT operations with their latest operation date
    const splitLineages = await this.lineageRepository.findAll({
      where: {
        operationType: OperationType.SPLIT,
      },
      attributes: [
        'parentEaId',
        [Sequelize.fn('MAX', Sequelize.col('operationDate')), 'latestDate'],
      ],
      group: ['parentEaId'],
      raw: true,
    });

    if (splitLineages.length === 0) {
      return PaginationUtil.createPaginatedResponse([], 0, options);
    }

    // Sort by operation date DESC and get paginated IDs
    const sortedLineages = (splitLineages as any[]).sort((a, b) => {
      const dateA = new Date(a.latestDate).getTime();
      const dateB = new Date(b.latestDate).getTime();
      return dateB - dateA;
    });

    const totalItems = sortedLineages.length;
    const paginatedLineages = sortedLineages.slice(offset, offset + limit);
    const paginatedEaIds = (paginatedLineages as any[]).map((l: any) => l.parentEaId);

    // If no IDs to fetch, return empty result
    if (paginatedEaIds.length === 0) {
      return PaginationUtil.createPaginatedResponse([], totalItems, options);
    }

    // Get the EAs for the paginated IDs
    const rows = await this.enumerationAreaRepository.findAll({
      where: {
        id: { [Op.in]: paginatedEaIds },
      },
      attributes: { exclude: ['geom'] },
    });

    // Maintain the order from paginatedLineages
    const orderedRows = paginatedEaIds.map(id => 
      rows.find(ea => ea.id === id)
    ).filter(Boolean) as EnumerationArea[];

    return PaginationUtil.createPaginatedResponse(orderedRows, totalItems, options);
  }

  /**
   * Get all enumeration areas that were merged, ordered by latest, paginated
   * @param query - Pagination query parameters
   * @returns Paginated list of merged enumeration areas
   */
  async findAllMergedPaginated(
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<EnumerationArea>> {
    const options = PaginationUtil.normalizePaginationOptions(query);
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Find all unique child EAs from MERGE operations with their latest operation date
    const mergeLineages = await this.lineageRepository.findAll({
      where: {
        operationType: OperationType.MERGE,
      },
      attributes: [
        'childEaId',
        [Sequelize.fn('MAX', Sequelize.col('operationDate')), 'latestDate'],
      ],
      group: ['childEaId'],
      raw: true,
    });

    if (mergeLineages.length === 0) {
      return PaginationUtil.createPaginatedResponse([], 0, options);
    }

    // Sort by operation date DESC and get paginated IDs
    const sortedLineages = (mergeLineages as any[]).sort((a, b) => {
      const dateA = new Date(a.latestDate).getTime();
      const dateB = new Date(b.latestDate).getTime();
      return dateB - dateA;
    });

    const totalItems = sortedLineages.length;
    const paginatedLineages = sortedLineages.slice(offset, offset + limit);
    const paginatedEaIds = (paginatedLineages as any[]).map((l: any) => l.childEaId);

    // If no IDs to fetch, return empty result
    if (paginatedEaIds.length === 0) {
      return PaginationUtil.createPaginatedResponse([], totalItems, options);
    }

    // Get the EAs for the paginated IDs
    const rows = await this.enumerationAreaRepository.findAll({
      where: {
        id: { [Op.in]: paginatedEaIds },
      },
      attributes: { exclude: ['geom'] },
    });

    // Maintain the order from paginatedLineages
    const orderedRows = paginatedEaIds.map(id => 
      rows.find(ea => ea.id === id)
    ).filter(Boolean) as EnumerationArea[];

    return PaginationUtil.createPaginatedResponse(orderedRows, totalItems, options);
  }

}
