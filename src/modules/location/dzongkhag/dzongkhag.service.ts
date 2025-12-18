import { Inject, Injectable } from '@nestjs/common';
import { Dzongkhag } from './entities/dzongkhag.entity';
import { CreateDzongkhagDto } from './dto/create-dzongkhag.dto';
import { UpdateDzongkhagDto } from './dto/update-dzongkhag.dto';
import { CreateDzongkhagGeoJsonDto } from './dto/create-dzongkhag-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize, QueryTypes, Op } from 'sequelize';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';

@Injectable()
export class DzongkhagService {
  constructor(
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
  ) {}

  async findAll(
    withGeom: boolean = false,
    includeAdminZones: boolean = false,
    includeSubAdminZones: boolean = false,
    includeEAs: boolean = false,
  ): Promise<Dzongkhag[]> {
    const options: any = {};

    // Exclude geometry by default unless explicitly requested
    if (!withGeom) {
      options.attributes = { exclude: ['geom'] };
    }

    // Build nested includes based on parameters
    if (includeAdminZones) {
      const adminZoneInclude: any = {
        model: AdministrativeZone,
        as: 'administrativeZones',
        attributes: { exclude: withGeom ? [] : ['geom'] },
      };

      // If sub-admin zones requested, nest them
      if (includeSubAdminZones) {
        const subAdminZoneInclude: any = {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          attributes: { exclude: withGeom ? [] : ['geom'] },
        };

        // If EAs requested, we'll load them separately to avoid nested BelongsToMany conflicts
        // EAs will be loaded after the main query
        if (includeEAs) {
          // Don't include EAs in nested query - will load separately
        }

        adminZoneInclude.include = [subAdminZoneInclude];
      }

      options.include = [adminZoneInclude];
    }

    const dzongkhags = await this.dzongkhagRepository.findAll<Dzongkhag>(options);

    // If EAs were requested, load them separately to avoid nested BelongsToMany conflicts
    if (includeEAs && includeAdminZones && includeSubAdminZones) {
      // Collect all SAZ IDs from all dzongkhags
      const sazIds: number[] = [];
      dzongkhags.forEach((dzongkhag) => {
        dzongkhag.administrativeZones?.forEach((az) => {
          az.subAdministrativeZones?.forEach((saz) => {
            sazIds.push(saz.id);
          });
        });
      });

      if (sazIds.length > 0) {
        // Get all EAs linked to these SAZs via junction table (only active EAs)
        const enumerationAreas = await EnumerationArea.findAll({
          attributes: withGeom ? undefined : { exclude: ['geom'] },
          where: { isActive: true },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              through: { attributes: [] },
              where: { id: { [Op.in]: sazIds } },
              required: true,
            },
          ],
        });

        // Group EAs by SAZ ID
        const eaMap = new Map<number, EnumerationArea[]>();
        enumerationAreas.forEach((ea) => {
          ea.subAdministrativeZones?.forEach((saz) => {
            if (sazIds.includes(saz.id)) {
              if (!eaMap.has(saz.id)) {
                eaMap.set(saz.id, []);
              }
              const sazEAs = eaMap.get(saz.id);
              if (sazEAs && !sazEAs.find((e) => e.id === ea.id)) {
                sazEAs.push(ea);
              }
            }
          });
        });

        // Attach EAs to their respective SAZs
        dzongkhags.forEach((dzongkhag) => {
          dzongkhag.administrativeZones?.forEach((az) => {
            az.subAdministrativeZones?.forEach((saz) => {
              (saz as any).enumerationAreas = eaMap.get(saz.id) || [];
            });
          });
        });
      }
    }

    return dzongkhags;
  }

  async findAllAsGeoJson(): Promise<any> {
    const data: any = await this.dzongkhagRepository.sequelize.query(
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
        FROM (SELECT * FROM "Dzongkhags" ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async findOneAsGeoJson(id: number): Promise<any> {
    const data: any = await this.dzongkhagRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         inputs.id,
        'geometry',   ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'geom'
      ) AS feature
      FROM (SELECT * FROM "Dzongkhags" WHERE id = ${id}) inputs;`,
    );

    if (!data[0] || !data[0][0] || !data[0][0].feature) {
      throw new Error(`Dzongkhag with ID ${id} not found`);
    }

    return data[0][0].feature;
  }

  /**
   * Get all administrative zones for a dzongkhag
   * @param dzongkhagId - Dzongkhag ID
   * @param withGeom - Include geometry
   * @param includeSubAdminZones - Include sub-administrative zones
   * @param includeEAs - Include enumeration areas
   */
  async getAdministrativeZonesByDzongkhag(
    dzongkhagId: number,
    withGeom = false,
    includeSubAdminZones = false,
    includeEAs = false,
  ): Promise<AdministrativeZone[]> {
    const options: any = {
      where: { dzongkhagId },
      attributes: withGeom ? undefined : { exclude: ['geom'] },
    };

    if (includeSubAdminZones) {
      const subAdminInclude: any = {
        model: SubAdministrativeZone,
        as: 'subAdministrativeZones',
        attributes: { exclude: withGeom ? [] : ['geom'] },
      };

      if (includeEAs) {
        subAdminInclude.include = [
          {
            model: EnumerationArea,
            as: 'enumerationAreas',
            attributes: { exclude: withGeom ? [] : ['geom'] },
          },
        ];
      }

      options.include = [subAdminInclude];
    }

    return await AdministrativeZone.findAll(options);
  }

  /**
   * Get all sub-administrative zones for a dzongkhag
   * @param dzongkhagId - Dzongkhag ID
   * @param withGeom - Include geometry
   * @param includeEAs - Include enumeration areas
   */
  async getSubAdministrativeZonesByDzongkhag(
    dzongkhagId: number,
    withGeom = false,
    includeEAs = false,
  ): Promise<SubAdministrativeZone[]> {
    const options: any = {
      attributes: withGeom ? undefined : { exclude: ['geom'] },
      include: [
        {
          model: AdministrativeZone,
          where: { dzongkhagId },
          attributes: { exclude: ['geom'] },
        },
      ],
    };

    if (includeEAs) {
      options.include.push({
        model: EnumerationArea,
        as: 'enumerationAreas',  // Via junction table
        through: { attributes: [] },
        attributes: { exclude: withGeom ? [] : ['geom'] },
      });
    }

    return await SubAdministrativeZone.findAll(options);
  }

  /**
   * Get all sub-administrative zones for a dzongkhag as GeoJSON
   * @param dzongkhagId - Dzongkhag ID
   */
  async getSubAdministrativeZonesGeoJsonByDzongkhag(
    dzongkhagId: number,
  ): Promise<any> {
    const data: any = await this.dzongkhagRepository.sequelize.query(
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

    return data[0][0].jsonb_build_object;
  }

  /**
   * Get all enumeration areas for a dzongkhag as GeoJSON
   * @param dzongkhagId - Dzongkhag ID
   */
  async getEnumerationAreasGeoJsonByDzongkhag(
    dzongkhagId: number,
  ): Promise<any> {
    const data: any = await this.dzongkhagRepository.sequelize.query(
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
          SELECT DISTINCT ea.* 
          FROM "EnumerationAreas" ea
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          JOIN "SubAdministrativeZones" saz ON junction."subAdministrativeZoneId" = saz.id
          JOIN "AdministrativeZones" az ON saz."administrativeZoneId" = az.id
          WHERE az."dzongkhagId" = ${dzongkhagId}
          ORDER BY ea.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object;
  }

  async findOne(
    id: number,
    withGeom: boolean = false,
    includeAdminZones: boolean = false,
    includeSubAdminZones: boolean = false,
    includeEAs: boolean = false,
  ): Promise<Dzongkhag> {
    const options: any = {
      where: { id },
    };

    // Exclude geometry by default unless explicitly requested
    if (!withGeom) {
      options.attributes = { exclude: ['geom'] };
    }

    // Build nested includes based on parameters
    if (includeAdminZones) {
      const adminZoneInclude: any = {
        model: AdministrativeZone,
        as: 'administrativeZones',
        attributes: { exclude: withGeom ? [] : ['geom'] },
      };

      // If sub-admin zones requested, nest them
      if (includeSubAdminZones) {
        const subAdminZoneInclude: any = {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          attributes: { exclude: withGeom ? [] : ['geom'] },
        };

        // If EAs requested, we'll load them separately to avoid nested BelongsToMany conflicts
        if (includeEAs) {
          // Don't include EAs in nested query - will load separately
        }

        adminZoneInclude.include = [subAdminZoneInclude];
      }

      options.include = [adminZoneInclude];
    }

    const dzongkhag = await this.dzongkhagRepository.findOne<Dzongkhag>(options);

    // If EAs were requested, load them separately to avoid nested BelongsToMany conflicts
    if (includeEAs && includeAdminZones && includeSubAdminZones && dzongkhag) {
      // Collect all SAZ IDs
      const sazIds: number[] = [];
      dzongkhag.administrativeZones?.forEach((az) => {
        az.subAdministrativeZones?.forEach((saz) => {
          sazIds.push(saz.id);
        });
      });

      if (sazIds.length > 0) {
        // Get all EAs linked to these SAZs via junction table (only active EAs)
        const enumerationAreas = await EnumerationArea.findAll({
          attributes: withGeom ? undefined : { exclude: ['geom'] },
          where: { isActive: true },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              through: { attributes: [] },
              where: { id: { [Op.in]: sazIds } },
              required: true,
            },
          ],
        });

        // Group EAs by SAZ ID
        const eaMap = new Map<number, EnumerationArea[]>();
        enumerationAreas.forEach((ea) => {
          ea.subAdministrativeZones?.forEach((saz) => {
            if (sazIds.includes(saz.id)) {
              if (!eaMap.has(saz.id)) {
                eaMap.set(saz.id, []);
              }
              const sazEAs = eaMap.get(saz.id);
              if (sazEAs && !sazEAs.find((e) => e.id === ea.id)) {
                sazEAs.push(ea);
              }
            }
          });
        });

        // Attach EAs to their respective SAZs
        dzongkhag.administrativeZones?.forEach((az) => {
          az.subAdministrativeZones?.forEach((saz) => {
            (saz as any).enumerationAreas = eaMap.get(saz.id) || [];
          });
        });
      }
    }

    return dzongkhag;
  }

  /**
   * Get enumeration areas by dzongkhag with full hierarchy
   * @param dzongkhagId - Dzongkhag ID
   * @param withGeom - Include geometry for enumeration areas
   * @param includeHierarchy - Include full hierarchy structure
   * @returns Hierarchical structure or flat list based on includeHierarchy
   */
  async getEnumerationAreasByDzongkhag(
    dzongkhagId: number,
    withGeom: boolean = false,
    includeHierarchy: boolean = true,
  ): Promise<any> {
    if (includeHierarchy) {
      // Return full hierarchy: dzongkhag -> admin zones -> sub-admin zones -> enumeration areas
      // Load hierarchy first without EAs to avoid nested BelongsToMany conflicts
      const dzongkhag = await this.dzongkhagRepository.findOne({
        where: { id: dzongkhagId },
        attributes: withGeom ? undefined : { exclude: ['geom'] },
        include: [
          {
            model: AdministrativeZone,
            as: 'administrativeZones',
            attributes: { exclude: withGeom ? [] : ['geom'] },
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',
                attributes: { exclude: withGeom ? [] : ['geom'] },
                // Don't include EAs here - will load separately
              },
            ],
          },
        ],
      });

      if (!dzongkhag) {
        throw new Error(`Dzongkhag with ID ${dzongkhagId} not found`);
      }

      // Collect all SAZ IDs from the loaded hierarchy
      const sazIds: number[] = [];
      dzongkhag.administrativeZones?.forEach((az) => {
        az.subAdministrativeZones?.forEach((saz) => {
          sazIds.push(saz.id);
        });
      });

      // Initialize enumerationAreas as empty array for all SAZs
      const eaMap = new Map<number, EnumerationArea[]>();
      sazIds.forEach((sazId) => {
        eaMap.set(sazId, []);
      });

      // Load enumeration areas separately via junction table
      if (sazIds.length > 0) {
        const enumerationAreas = await EnumerationArea.findAll({
          attributes: withGeom 
            ? ['id', 'name', 'description', 'areaCode', 'geom']
            : ['id', 'name', 'description', 'areaCode'],
          where: { isActive: true },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              through: { attributes: [] },
              where: { id: { [Op.in]: sazIds } },
              required: true,
            },
          ],
        });

        // Group EAs by SAZ ID (an EA can appear under multiple SAZs)
        enumerationAreas.forEach((ea) => {
          ea.subAdministrativeZones?.forEach((saz) => {
            if (sazIds.includes(saz.id)) {
              const sazEAs = eaMap.get(saz.id);
              if (sazEAs && !sazEAs.find((e) => e.id === ea.id)) {
                sazEAs.push(ea as EnumerationArea);
              }
            }
          });
        });
      }

      // Convert to plain object and attach EAs to their respective SAZs
      const dzongkhagPlain = dzongkhag.toJSON() as any;
      
      dzongkhagPlain.administrativeZones?.forEach((az: any) => {
        az.subAdministrativeZones?.forEach((saz: any) => {
          const eas = eaMap.get(saz.id) || [];
          // Convert EA models to plain objects
          saz.enumerationAreas = eas.map((ea) => {
            const eaPlain = ea.toJSON();
            // Remove the subAdministrativeZones from EA to avoid circular reference
            delete eaPlain.subAdministrativeZones;
            return eaPlain;
          });
        });
      });

      return dzongkhagPlain;
    } else {
      // Return flat list of enumeration areas only
      const result = await this.dzongkhagRepository.sequelize.query(
        `
        SELECT DISTINCT
          ea.id,
          ea.name,
          ea."areaCode",
          ea.description,
          ea."createdAt",
          ea."updatedAt"
          ${withGeom ? ', ea.geom' : ''}
        FROM "EnumerationAreas" ea
        INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
          ON ea.id = junction."enumerationAreaId"
        JOIN "SubAdministrativeZones" saz ON junction."subAdministrativeZoneId" = saz.id
        JOIN "AdministrativeZones" az ON saz."administrativeZoneId" = az.id
        WHERE az."dzongkhagId" = :dzongkhagId
        ORDER BY ea.id
        `,
        {
          replacements: { dzongkhagId },
          type: QueryTypes.SELECT,
        },
      );

      return {
        dzongkhagId,
        enumerationAreas: result,
        totalCount: result.length,
      };
    }
  }

  async create(createDzongkhagDto: CreateDzongkhagDto): Promise<Dzongkhag> {
    return await this.dzongkhagRepository.create(
      instanceToPlain(createDzongkhagDto),
    );
  }
  async update(id: number, updateDzongkhagDto: UpdateDzongkhagDto) {
    const [numRows, updatedRows] = await this.dzongkhagRepository.update(
      instanceToPlain(updateDzongkhagDto),
      {
        where: { id },
        returning: true,
      },
    );

    if (numRows === 0) {
      throw new Error(`Dzongkhag with ID ${id} not found`);
    }

    return this.findOne(id);
  }

  async updateGeometry(id: number, geometry: any): Promise<Dzongkhag> {
    // First check if the dzongkhag exists
    const dzongkhag = await this.dzongkhagRepository.findByPk(id);
    if (!dzongkhag) {
      throw new Error(`Dzongkhag with ID ${id} not found`);
    }

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    await this.dzongkhagRepository.update(
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
    return await this.dzongkhagRepository.destroy({
      where: { id },
    });
  }
}
