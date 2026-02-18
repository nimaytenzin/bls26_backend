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
import { Op, QueryTypes } from 'sequelize';
import * as ExcelJS from 'exceljs';
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
   * Bulk create enumeration areas from GeoJSON features for a specific Sub-Administrative Zone
   * Automatically assigns the provided subAdministrativeZoneId to all created EAs
   * @param subAdministrativeZoneId - Sub-Administrative Zone ID to assign to all EAs
   * @param features - Array of GeoJSON Feature objects
   * @returns Bulk creation result with success count, skipped items, and errors
   */
  async bulkCreateFromGeoJsonBySubAdministrativeZone(
    subAdministrativeZoneId: number,
    features: any[],
  ): Promise<{
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
    // Validate subAdministrativeZoneId exists
    const saz = await this.subAdministrativeZoneRepository.findByPk(subAdministrativeZoneId);
    if (!saz) {
      throw new NotFoundException(
        `Sub-Administrative Zone with ID ${subAdministrativeZoneId} not found`,
      );
    }

    const created: EnumerationArea[] = [];
    const skippedItems: Array<{
      areaCode: string;
      subAdministrativeZoneIds: number[];
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

        // Validate required properties (name, description, areaCode)
        if (!properties.name || !properties.areaCode || !properties.description) {
          errors.push({
            feature,
            error: 'Missing required properties: name, areaCode, or description',
          });
          continue;
        }

        // Check if EA already exists with the same areaCode AND subAdministrativeZoneId combination
        const existingEA = await this.enumerationAreaRepository.findOne({
          where: {
            areaCode: properties.areaCode,
          },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              where: {
                id: subAdministrativeZoneId,
              },
              through: { attributes: [] },
              required: true,
            },
          ],
        });

        if (existingEA) {
          skippedItems.push({
            areaCode: properties.areaCode,
            subAdministrativeZoneIds: [subAdministrativeZoneId],
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
          description: properties.description,
          geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
        });

        // Assign the subAdministrativeZoneId via junction table
        await this.junctionRepository.create({
          enumerationAreaId: enumerationArea.id,
          subAdministrativeZoneId: subAdministrativeZoneId,
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
   * Convert tile Z/X/Y (TMS/XYZ) to WGS84 bbox (lon_min, lat_min, lon_max, lat_max).
   */
  private tileZxyToBbox(z: number, x: number, y: number): {
    lon_min: number;
    lat_min: number;
    lon_max: number;
    lat_max: number;
  } {
    const n = Math.pow(2, z);
    const lon_min = (x / n) * 360 - 180;
    const lon_max = ((x + 1) / n) * 360 - 180;
    const lat_max_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n)));
    const lat_min_rad = Math.atan(Math.sinh(Math.PI * (1 - (2 * (y + 1)) / n)));
    const lat_max = (lat_max_rad * 180) / Math.PI;
    const lat_min = (lat_min_rad * 180) / Math.PI;
    return { lon_min, lat_min, lon_max, lat_max };
  }

  /**
   * Get Mapbox Vector Tile (MVT) for enumeration areas in a given tile.
   * Optional filters: dzongkhagId, administrativeZoneId, subAdministrativeZoneId.
   * Only active EAs are included. Geometry is in WGS84 (4326); tile is built with PostGIS ST_AsMVT.
   */
  async getVectorTile(
    z: number,
    x: number,
    y: number,
    filters?: {
      dzongkhagId?: number;
      administrativeZoneId?: number;
      subAdministrativeZoneId?: number;
    },
  ): Promise<Buffer> {
    const { dzongkhagId, administrativeZoneId, subAdministrativeZoneId } = filters ?? {};
    const { lon_min, lat_min, lon_max, lat_max } = this.tileZxyToBbox(z, x, y);

    const baseWith =
      `WITH bbox AS (
         SELECT ST_MakeEnvelope(:lon_min, :lat_min, :lon_max, :lat_max, 4326) AS env
       ),
       tile AS (
         SELECT ea.id, ea.name, ea.description, ea."areaCode",
           ST_AsMVTGeom(
             ST_CurveToLine(
               ST_Intersection(ST_MakeValid(ea.geom), bbox.env)
             )::geometry,
             bbox.env::box2d,
             4096, 256, true
           ) AS geom
         FROM "EnumerationAreas" ea`;

    const baseWhere =
      ` ea."isActive" = true
           AND ea.geom IS NOT NULL
           AND ST_Intersects(ST_MakeValid(ea.geom), bbox.env)
       )
       SELECT ST_AsMVT(tile, 'enumeration_areas', 4096, 'geom') AS mvt FROM tile`;

    const needsAz = dzongkhagId != null || administrativeZoneId != null;
    const needsJ = subAdministrativeZoneId != null || needsAz;

    let fromClause: string;
    const conditions: string[] = [];

    if (needsAz) {
      fromClause = `
             INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
             INNER JOIN "SubAdministrativeZones" saz ON j."subAdministrativeZoneId" = saz.id
             INNER JOIN "AdministrativeZones" az ON saz."administrativeZoneId" = az.id
             CROSS JOIN bbox`;
      if (subAdministrativeZoneId != null) conditions.push('j."subAdministrativeZoneId" = :subAdministrativeZoneId');
      if (administrativeZoneId != null) conditions.push('az.id = :administrativeZoneId');
      if (dzongkhagId != null) conditions.push('az."dzongkhagId" = :dzongkhagId');
    } else if (needsJ) {
      fromClause = `
             INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
             CROSS JOIN bbox`;
      conditions.push('j."subAdministrativeZoneId" = :subAdministrativeZoneId');
    } else {
      fromClause = `
             CROSS JOIN bbox`;
    }

    const whereClause =
      conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') + ' AND' : ' WHERE';

    const query = baseWith + fromClause + whereClause + baseWhere;

    const replacements: Record<string, number> = {
      lon_min,
      lat_min,
      lon_max,
      lat_max,
    };
    if (subAdministrativeZoneId != null) replacements.subAdministrativeZoneId = subAdministrativeZoneId;
    if (administrativeZoneId != null) replacements.administrativeZoneId = administrativeZoneId;
    if (dzongkhagId != null) replacements.dzongkhagId = dzongkhagId;

    const rows: { mvt: Buffer }[] = await this.enumerationAreaRepository.sequelize.query(query, {
      type: QueryTypes.SELECT,
      replacements,
    });

    const mvt = rows?.[0]?.mvt;
    return Buffer.isBuffer(mvt) ? mvt : Buffer.alloc(0);
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
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT DISTINCT ON (ea.id)
            ea.id,
            ea.geom,
            jsonb_build_object(
              'name', ea.name,
              'areaCode', ea."areaCode",
              'sazName', saz.name,
              'sazType', saz.type,
              'chiwogCode', CASE WHEN saz.type = 'chiwog' THEN saz."areaCode" ELSE NULL END,
              'lapCode', CASE WHEN saz.type = 'lap' THEN saz."areaCode" ELSE NULL END,
              'gewogName', CASE WHEN az.type = 'Gewog' THEN az.name ELSE NULL END,
              'gewogCode', CASE WHEN az.type = 'Gewog' THEN az."areaCode" ELSE NULL END,
              'thromdeName', CASE WHEN az.type = 'Thromde' THEN az.name ELSE NULL END,
              'thromdeCode', CASE WHEN az.type = 'Thromde' THEN az."areaCode" ELSE NULL END,
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "EnumerationAreas" ea
          LEFT JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          LEFT JOIN "SubAdministrativeZones" saz 
            ON junction."subAdministrativeZoneId" = saz.id
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE 1=1 ${inactiveFilter}
          ORDER BY ea.id, saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
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
  async createMultipleSazsWithEa(
    sazDataArray: Array<{
      name: string;
      areaCode: string;
      type: 'chiwog' | 'lap';
      administrativeZoneId: number;
      geometry: any;
    }>,
    eaData: {
      name: string;
      areaCode: string;
      description?: string;
    },
  ): Promise<{
    subAdministrativeZones: SubAdministrativeZone[];
    enumerationArea: EnumerationArea;
  }> {
    // Validate all SAZs have same administrativeZoneId
    const firstAdminZoneId = sazDataArray[0].administrativeZoneId;
    const allSameAdminZone = sazDataArray.every(
      (saz) => saz.administrativeZoneId === firstAdminZoneId,
    );
    if (!allSameAdminZone) {
      throw new BadRequestException(
        'All SAZs must belong to the same Administrative Zone',
      );
    }

    // Validate administrative zone exists
    const adminZone = await this.administrativeZoneRepository.findByPk(
      firstAdminZoneId,
    );
    if (!adminZone) {
      throw new NotFoundException(
        `Administrative Zone with ID ${firstAdminZoneId} not found`,
      );
    }

    // Validate types and check for duplicates
    const areaCodes = new Set<string>();
    for (let i = 0; i < sazDataArray.length; i++) {
      const sazData = sazDataArray[i];
      
      if (!['chiwog', 'lap'].includes(sazData.type.toLowerCase())) {
        throw new BadRequestException(
          `SAZ ${i + 1} type must be "chiwog" or "lap"`,
        );
      }

      // Check for duplicate area codes in the request
      const areaCodeKey = `${sazData.areaCode}-${sazData.administrativeZoneId}`;
      if (areaCodes.has(areaCodeKey)) {
        throw new BadRequestException(
          `Duplicate areaCode "${sazData.areaCode}" found in SAZ ${i + 1}`,
        );
      }
      areaCodes.add(areaCodeKey);

      // Check if SAZ already exists (by areaCode + administrativeZoneId)
      const existingSAZ = await this.subAdministrativeZoneRepository.findOne({
        where: {
          areaCode: sazData.areaCode,
          administrativeZoneId: sazData.administrativeZoneId,
        },
      });
      if (existingSAZ) {
        throw new BadRequestException(
          `SAZ ${i + 1} with areaCode "${sazData.areaCode}" already exists in Administrative Zone ${sazData.administrativeZoneId}`,
        );
      }
    }

    // Validate EA areaCode is unique within each SAZ being created
    // EA areaCodes must be unique per SAZ (not globally unique)
    // Check if any of the SAZs being created already exist, and if they have an EA with this areaCode
    
    // First, find existing SAZs that match the areaCodes being created
    const sazAreaCodes = sazDataArray.map(saz => saz.areaCode);
    const existingSAZs = await this.subAdministrativeZoneRepository.findAll({
      where: {
        areaCode: { [Op.in]: sazAreaCodes },
        administrativeZoneId: firstAdminZoneId,
      },
      attributes: ['id', 'name', 'areaCode'],
    });

    // If there are existing SAZs with matching areaCodes, check if any of them have an EA with the same areaCode
    if (existingSAZs.length > 0) {
      const existingSAZIds = existingSAZs.map(saz => saz.id);
      
      // Find EAs with the same areaCode that are linked to any of these existing SAZs
      const conflictingEAs = await this.enumerationAreaRepository.findAll({
        where: {
          areaCode: eaData.areaCode,
          isActive: true,
        },
        include: [
          {
            model: SubAdministrativeZone,
            as: 'subAdministrativeZones',
            through: { attributes: [] },
            attributes: ['id', 'name', 'areaCode'],
            where: {
              id: { [Op.in]: existingSAZIds },
            },
            required: true,
          },
        ],
      });

      if (conflictingEAs.length > 0) {
        // Build error message showing which SAZs already have an EA with this areaCode
        const conflictingSAZs = conflictingEAs.flatMap(ea => 
          ea.subAdministrativeZones?.map(saz => ({
            id: saz.id,
            name: saz.name,
            areaCode: saz.areaCode,
            eaId: ea.id,
            eaName: ea.name,
          })) || []
        );
        
        // Group by SAZ to show which ones conflict (remove duplicates)
        const sazConflictMap = new Map();
        conflictingSAZs.forEach(item => {
          if (!sazConflictMap.has(item.id)) {
            sazConflictMap.set(item.id, item);
          }
        });

        // Create a clear error message
        const conflictList = Array.from(sazConflictMap.values())
          .map(saz => `SAZ "${saz.name}" (areaCode: ${saz.areaCode}) already has EA "${saz.eaName}" (ID: ${saz.eaId}) with areaCode "${eaData.areaCode}"`)
          .join('. ');

        throw new BadRequestException(
          `EA with areaCode "${eaData.areaCode}" already exists in one or more of the specified SAZs. ${conflictList}. EA areaCodes must be unique within each SAZ.`,
        );
      }
    }

    // Use transaction for rollback on any failure
    const transaction = await this.enumerationAreaRepository.sequelize.transaction();

    try {
      // Convert GeoJSON geometries to PostGIS format and create SAZs
      const createdSAZs: SubAdministrativeZone[] = [];
      const escapedGeomStrings: string[] = [];

      for (const sazData of sazDataArray) {
        const geomString = JSON.stringify(sazData.geometry);
        const escapedGeom = geomString.replace(/'/g, "''");
        escapedGeomStrings.push(escapedGeom);
        const geomValue = Sequelize.fn('ST_GeomFromGeoJSON', geomString);

        const subAdministrativeZone =
          await this.subAdministrativeZoneRepository.create(
            {
              administrativeZoneId: sazData.administrativeZoneId,
              name: sazData.name,
              areaCode: sazData.areaCode,
              type: sazData.type.toLowerCase() as 'chiwog' | 'lap',
              geom: geomValue,
            },
            { transaction },
          );

        createdSAZs.push(subAdministrativeZone);
      }

      // Combine geometries using nested ST_Union
      // Build nested ST_Union: ST_Union(ST_Union(ST_Union(geom1, geom2), geom3), ...)
      let combinedGeometrySql = `ST_GeomFromGeoJSON('${escapedGeomStrings[0]}')`;
      for (let i = 1; i < escapedGeomStrings.length; i++) {
        combinedGeometrySql = `ST_Union(${combinedGeometrySql}, ST_GeomFromGeoJSON('${escapedGeomStrings[i]}'))`;
      }

      const combinedGeometry = Sequelize.literal(combinedGeometrySql);

      // Create EA with combined geometry
      // Use fields option to explicitly specify only the columns that exist
      // subAdministrativeZoneId is nullable and won't be set
      const sazNames = sazDataArray.map((saz) => saz.name).join(', ');
      const enumerationArea = await this.enumerationAreaRepository.create(
        {
          name: eaData.name,
          areaCode: eaData.areaCode,
          description: eaData.description || `EA for ${sazNames}`,
          geom: combinedGeometry,
          // subAdministrativeZoneId is not set - will remain null
        },
        {
          transaction,
          fields: ['name', 'areaCode', 'description', 'geom'], // Only insert these fields
        },
      );

      // Link EA to all SAZs via junction table
      await this.junctionRepository.bulkCreate(
        createdSAZs.map((saz) => ({
          enumerationAreaId: enumerationArea.id,
          subAdministrativeZoneId: saz.id,
        })),
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
        subAdministrativeZones: createdSAZs,
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
      // Load source EAs WITH their SAZ relationships to collect all SAZ IDs
      const sourceEAs = await this.enumerationAreaRepository.findAll({
        where: {
          id: { [Op.in]: sourceEaIds },
        },
        include: [
          {
            model: SubAdministrativeZone,
            as: 'subAdministrativeZones',
            through: { attributes: [] },
          },
        ],
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

      // Collect all unique SAZ IDs from all source EAs
      const sourceSazIds = new Set(
        sourceEAs.flatMap(
          (ea) => ea.subAdministrativeZones?.map((saz) => saz.id) || [],
        ),
      );

      // Merge with user-provided SAZ IDs (union operation - ensures all are included)
      const userProvidedSazIds = mergedEaData.subAdministrativeZoneIds || [];
      const finalSazIds = Array.from(
        new Set([...sourceSazIds, ...userProvidedSazIds]),
      );

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
      const { geom, ...restData } = mergedEaData;

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

      // Link to ALL SAZs via junction table (from source EAs + user-provided)
      // This ensures the merged EA is linked to all source SAZs, preventing data loss
      if (finalSazIds.length > 0) {
        await this.junctionRepository.bulkCreate(
          finalSazIds.map((sazId) => ({
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

  /**
   * Get all RBA enumeration areas, paginated
   */
  async findAllRbaPaginated(
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<EnumerationArea>> {
    const options = PaginationUtil.normalizePaginationOptions(query);
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
    const order = PaginationUtil.buildOrderClause(options, 'id');

    const { rows, count } = await this.enumerationAreaRepository.findAndCountAll({
      where: { isRBA: true, isActive: true },
      attributes: { exclude: ['geom'] },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          required: false,
          attributes: { exclude: ['geom'] },
          include: [
            {
              model: AdministrativeZone,
              as: 'administrativeZone',
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: Dzongkhag,
                  as: 'dzongkhag',
                  attributes: { exclude: ['geom'] },
                },
              ],
            },
          ],
        },
      ],
      offset,
      limit,
      order,
    });

    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }

  /**
   * Get all Urban RBA enumeration areas (EAs in Thromde), paginated
   * Uses raw SQL for ID lookup to avoid Sequelize findAndCountAll + nested BelongsToMany SQL bug
   */
  async findAllUrbanRbaPaginated(
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<EnumerationArea>> {
    const options = PaginationUtil.normalizePaginationOptions(query);
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
    const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = options.sortBy && ['id', 'name', 'areaCode'].includes(options.sortBy) ? options.sortBy : 'id';

    // Subquery: DISTINCT ON (ea.id) so ORDER BY must start with ea.id; outer query orders by sort column (PostgreSQL: SELECT DISTINCT requires ORDER BY cols in select list)
    const idRows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT id FROM (
         SELECT DISTINCT ON (ea.id) ea.id, ea."${sortBy}" AS sort_col
         FROM "EnumerationAreas" ea
         INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
         INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
         INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
         WHERE ea."isRBA" = true AND ea."isActive" = true AND az.type = 'Thromde'
         ORDER BY ea.id, ea."${sortBy}" ${sortOrder}
       ) sub
       ORDER BY sort_col ${sortOrder}`,
      { type: QueryTypes.SELECT },
    );

    const eaIds = (idRows as { id: number }[]).map(r => r.id);
    const totalItems = eaIds.length;
    const paginatedIds = eaIds.slice(offset, offset + limit);

    if (paginatedIds.length === 0) {
      return PaginationUtil.createPaginatedResponse([], totalItems, options);
    }

    const rows = await this.enumerationAreaRepository.findAll({
      where: { id: { [Op.in]: paginatedIds } },
      attributes: { exclude: ['geom'] },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          attributes: { exclude: ['geom'] },
          required: false,
          include: [
            {
              model: AdministrativeZone,
              as: 'administrativeZone',
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: Dzongkhag,
                  as: 'dzongkhag',
                  attributes: { exclude: ['geom'] },
                },
              ],
            },
          ],
        },
      ],
      order: PaginationUtil.buildOrderClause(options, 'id'),
    });

    const orderedRows = paginatedIds.map(id => rows.find(ea => ea.id === id)).filter(Boolean) as EnumerationArea[];
    return PaginationUtil.createPaginatedResponse(orderedRows, totalItems, options);
  }

  /**
   * Get all Rural RBA enumeration areas (EAs in Gewog), paginated
   * Uses raw SQL for ID lookup to avoid Sequelize findAndCountAll + nested BelongsToMany SQL bug
   */
  async findAllRuralRbaPaginated(
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<EnumerationArea>> {
    const options = PaginationUtil.normalizePaginationOptions(query);
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);
    const sortOrder = options.sortOrder === 'ASC' ? 'ASC' : 'DESC';
    const sortBy = options.sortBy && ['id', 'name', 'areaCode'].includes(options.sortBy) ? options.sortBy : 'id';

    const idRows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT id FROM (
         SELECT DISTINCT ON (ea.id) ea.id, ea."${sortBy}" AS sort_col
         FROM "EnumerationAreas" ea
         INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
         INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
         INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
         WHERE ea."isRBA" = true AND ea."isActive" = true AND az.type = 'Gewog'
         ORDER BY ea.id, ea."${sortBy}" ${sortOrder}
       ) sub
       ORDER BY sort_col ${sortOrder}`,
      { type: QueryTypes.SELECT },
    );

    const eaIds = (idRows as { id: number }[]).map(r => r.id);
    const totalItems = eaIds.length;
    const paginatedIds = eaIds.slice(offset, offset + limit);

    if (paginatedIds.length === 0) {
      return PaginationUtil.createPaginatedResponse([], totalItems, options);
    }

    const rows = await this.enumerationAreaRepository.findAll({
      where: { id: { [Op.in]: paginatedIds } },
      attributes: { exclude: ['geom'] },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          attributes: { exclude: ['geom'] },
          required: false,
          include: [
            {
              model: AdministrativeZone,
              as: 'administrativeZone',
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: Dzongkhag,
                  as: 'dzongkhag',
                  attributes: { exclude: ['geom'] },
                },
              ],
            },
          ],
        },
      ],
      order: PaginationUtil.buildOrderClause(options, 'id'),
    });

    const orderedRows = paginatedIds.map(id => rows.find(ea => ea.id === id)).filter(Boolean) as EnumerationArea[];
    return PaginationUtil.createPaginatedResponse(orderedRows, totalItems, options);
  }

  /**
   * Mark an enumeration area as RBA
   */
  async markAsRba(id: number): Promise<EnumerationArea> {
    const ea = await this.enumerationAreaRepository.findByPk(id);
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${id} not found`);
    }
    await this.enumerationAreaRepository.update(
      { isRBA: true },
      { where: { id } },
    );
    return this.findOne(id, false, true);
  }

  /**
   * Unmark an enumeration area as RBA
   */
  async unmarkAsRba(id: number): Promise<EnumerationArea> {
    const ea = await this.enumerationAreaRepository.findByPk(id);
    if (!ea) {
      throw new NotFoundException(`Enumeration area with ID ${id} not found`);
    }
    await this.enumerationAreaRepository.update(
      { isRBA: false },
      { where: { id } },
    );
    return this.findOne(id, false, true);
  }

  /**
   * Mark an enumeration area as RBA by geographic codes (Dzongkhag, Administrative Zone, Sub Administrative Zone, EA code).
   */
  async markAsRbaByGeoCodes(
    dzongkhagCode: string,
    administrativeZoneCode: string,
    subAdministrativeZoneCode: string,
    eaCode: string,
  ): Promise<EnumerationArea> {
    const rows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT ea.id
       FROM "EnumerationAreas" ea
       INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
       INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
       INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
       INNER JOIN "Dzongkhags" dz ON dz.id = az."dzongkhagId"
       WHERE dz."areaCode" = :dzongkhagCode
         AND az."areaCode" = :administrativeZoneCode
         AND saz."areaCode" = :subAdministrativeZoneCode
         AND ea."areaCode" = :eaCode
         AND ea."isActive" = true
       LIMIT 1`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          dzongkhagCode,
          administrativeZoneCode,
          subAdministrativeZoneCode,
          eaCode,
        },
      },
    );
    const eaId = rows?.[0]?.id;
    if (eaId == null) {
      throw new NotFoundException(
        `Enumeration area not found for the given codes (Dzongkhag: ${dzongkhagCode}, Administrative Zone: ${administrativeZoneCode}, Sub Administrative Zone: ${subAdministrativeZoneCode}, EA: ${eaCode})`,
      );
    }
    await this.enumerationAreaRepository.update(
      { isRBA: true },
      { where: { id: eaId } },
    );
    return this.findOne(eaId, false, true);
  }

  /**
   * Update an EA by geographic codes (Dzongkhag, Administrative Zone, Sub Administrative Zone, EA code).
   * Uses the same geo-code resolution logic as markAsRbaByGeoCodes, but applies a generic update payload.
   */
  async updateByGeoCodes(
    dzongkhagCode: string,
    administrativeZoneCode: string,
    subAdministrativeZoneCode: string,
    eaCode: string,
    updateEnumerationAreaDto: UpdateEnumerationAreaDto,
  ): Promise<EnumerationArea> {
    const rows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT ea.id
       FROM "EnumerationAreas" ea
       INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
       INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
       INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
       INNER JOIN "Dzongkhags" dz ON dz.id = az."dzongkhagId"
       WHERE dz."areaCode" = :dzongkhagCode
         AND az."areaCode" = :administrativeZoneCode
         AND saz."areaCode" = :subAdministrativeZoneCode
         AND ea."areaCode" = :eaCode
         AND ea."isActive" = true
       LIMIT 1`,
      {
        type: QueryTypes.SELECT,
        replacements: {
          dzongkhagCode,
          administrativeZoneCode,
          subAdministrativeZoneCode,
          eaCode,
        },
      },
    );

    const eaId = rows?.[0]?.id;
    if (eaId == null) {
      throw new NotFoundException(
        `Enumeration area not found for the given codes (Dzongkhag: ${dzongkhagCode}, Administrative Zone: ${administrativeZoneCode}, Sub Administrative Zone: ${subAdministrativeZoneCode}, EA: ${eaCode})`,
      );
    }

    const [numRows] = await this.enumerationAreaRepository.update(
      instanceToPlain(updateEnumerationAreaDto),
      { where: { id: eaId } },
    );

    if (numRows === 0) {
      throw new Error(
        `Failed to update enumeration area for codes Dzongkhag: ${dzongkhagCode}, Administrative Zone: ${administrativeZoneCode}, Sub Administrative Zone: ${subAdministrativeZoneCode}, EA: ${eaCode}`,
      );
    }

    return this.findOne(eaId);
  }

  private rbaInclude() {
    return [
      {
        model: SubAdministrativeZone,
        as: 'subAdministrativeZones',
        through: { attributes: [] },
        attributes: { exclude: ['geom'] },
        required: false,
        include: [
          {
            model: AdministrativeZone,
            as: 'administrativeZone',
            attributes: { exclude: ['geom'] },
            include: [
              {
                model: Dzongkhag,
                as: 'dzongkhag',
                attributes: { exclude: ['geom'] },
              },
            ],
          },
        ],
      },
    ];
  }

  /** Get all RBA EAs (no pagination) for Excel export */
  async findAllRbaForExcel(): Promise<EnumerationArea[]> {
    return this.enumerationAreaRepository.findAll({
      where: { isRBA: true, isActive: true },
      attributes: { exclude: ['geom'] },
      include: this.rbaInclude(),
      order: [['id', 'ASC']],
    });
  }

  /** Get all Urban RBA EAs for Excel export */
  async findAllUrbanRbaForExcel(): Promise<EnumerationArea[]> {
    const idRows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT ea.id FROM "EnumerationAreas" ea
       INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
       INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
       INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
       WHERE ea."isRBA" = true AND ea."isActive" = true AND az.type = 'Thromde'
       GROUP BY ea.id ORDER BY ea.id`,
      { type: QueryTypes.SELECT },
    );
    const ids = (idRows as { id: number }[]).map(r => r.id);
    if (ids.length === 0) return [];
    return this.enumerationAreaRepository.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: { exclude: ['geom'] },
      include: this.rbaInclude(),
      order: [['id', 'ASC']],
    });
  }

  /** Get all Rural RBA EAs for Excel export */
  async findAllRuralRbaForExcel(): Promise<EnumerationArea[]> {
    const idRows = await this.enumerationAreaRepository.sequelize.query<{ id: number }>(
      `SELECT ea.id FROM "EnumerationAreas" ea
       INNER JOIN "EnumerationAreaSubAdministrativeZones" j ON j."enumerationAreaId" = ea.id
       INNER JOIN "SubAdministrativeZones" saz ON saz.id = j."subAdministrativeZoneId"
       INNER JOIN "AdministrativeZones" az ON az.id = saz."administrativeZoneId"
       WHERE ea."isRBA" = true AND ea."isActive" = true AND az.type = 'Gewog'
       GROUP BY ea.id ORDER BY ea.id`,
      { type: QueryTypes.SELECT },
    );
    const ids = (idRows as { id: number }[]).map(r => r.id);
    if (ids.length === 0) return [];
    return this.enumerationAreaRepository.findAll({
      where: { id: { [Op.in]: ids } },
      attributes: { exclude: ['geom'] },
      include: this.rbaInclude(),
      order: [['id', 'ASC']],
    });
  }

  private async buildRbaExcelBuffer(eas: EnumerationArea[], sheetName: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName, { pageSetup: { fitToPage: true } });

    // Headers aligned with PrimeNG p-table: Dzongkhag, Dzongkhag Code, Thromde/Gewog, Thromde/Gewog Code, LAP/Chiwog, LAP/Chiwog Code, EA Code, Description
    worksheet.columns = [
      { header: 'Dzongkhag', key: 'dzongkhag', width: 20 },
      { header: 'Dzongkhag Code', key: 'dzongkhagCode', width: 14 },
      { header: 'Thromde/Gewog', key: 'thromdeGewog', width: 22 },
      { header: 'Thromde/Gewog Code', key: 'thromdeGewogCode', width: 18 },
      { header: 'LAP/Chiwog', key: 'lapChiwog', width: 22 },
      { header: 'LAP/Chiwog Code', key: 'lapChiwogCode', width: 14 },
      { header: 'EA Code', key: 'eaCode', width: 14 },
      { header: 'Description', key: 'description', width: 36 },
    ];

    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];

    for (const ea of eas) {
      const sazs = (ea as any).subAdministrativeZones || [];
      if (sazs.length === 0) {
        worksheet.addRow({
          dzongkhag: '',
          dzongkhagCode: '',
          thromdeGewog: '',
          thromdeGewogCode: '',
          lapChiwog: '',
          lapChiwogCode: '',
          eaCode: ea.areaCode,
          description: ea.description || '',
        });
      } else {
        for (const saz of sazs) {
          const az = (saz as any).administrativeZone;
          const dz = az?.dzongkhag;
          worksheet.addRow({
            dzongkhag: dz?.name || '',
            dzongkhagCode: dz?.areaCode || '',
            thromdeGewog: az?.name || '',
            thromdeGewogCode: az?.areaCode || '',
            lapChiwog: saz.name || '',
            lapChiwogCode: saz.areaCode || '',
            eaCode: ea.areaCode,
            description: ea.description || '',
          });
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getRbaExcelBuffer(): Promise<Buffer> {
    const eas = await this.findAllRbaForExcel();
    return this.buildRbaExcelBuffer(eas, 'All RBA EAs');
  }

  async getUrbanRbaExcelBuffer(): Promise<Buffer> {
    const eas = await this.findAllUrbanRbaForExcel();
    return this.buildRbaExcelBuffer(eas, 'Urban RBA EAs');
  }

  async getRuralRbaExcelBuffer(): Promise<Buffer> {
    const eas = await this.findAllRuralRbaForExcel();
    return this.buildRbaExcelBuffer(eas, 'Rural RBA EAs');
  }

}
