import { Inject, Injectable } from '@nestjs/common';
import { Dzongkhag } from './entities/dzongkhag.entity';
import { CreateDzongkhagDto } from './dto/create-dzongkhag.dto';
import { UpdateDzongkhagDto } from './dto/update-dzongkhag.dto';
import { CreateDzongkhagGeoJsonDto } from './dto/create-dzongkhag-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize, QueryTypes } from 'sequelize';
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

        // If EAs requested, nest them
        if (includeEAs) {
          subAdminZoneInclude.include = [
            {
              model: EnumerationArea,
              as: 'enumerationAreas',
              attributes: { exclude: withGeom ? [] : ['geom'] },
            },
          ];
        }

        adminZoneInclude.include = [subAdminZoneInclude];
      }

      options.include = [adminZoneInclude];
    }

    return await this.dzongkhagRepository.findAll<Dzongkhag>(options);
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

        // If EAs requested, nest them
        if (includeEAs) {
          subAdminZoneInclude.include = [
            {
              model: EnumerationArea,
              as: 'enumerationAreas',
              attributes: { exclude: withGeom ? [] : ['geom'] },
            },
          ];
        }

        adminZoneInclude.include = [subAdminZoneInclude];
      }

      options.include = [adminZoneInclude];
    }

    return await this.dzongkhagRepository.findOne<Dzongkhag>(options);
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
                include: [
                  {
                    model: EnumerationArea,
                    separate: true,
                    as: 'enumerationAreas',
                    attributes: { exclude: withGeom ? [] : ['geom'] },
                  },
                ],
              },
            ],
          },
        ],
      });

      if (!dzongkhag) {
        throw new Error(`Dzongkhag with ID ${dzongkhagId} not found`);
      }

      return dzongkhag;
    } else {
      // Return flat list of enumeration areas only
      const result = await this.dzongkhagRepository.sequelize.query(
        `
        SELECT 
          ea.id,
          ea."subAdministrativeZoneId",
          ea.name,
          ea."areaCode",
          ea.description,
          ea."areaSqKm",
          ea."createdAt",
          ea."updatedAt"
          ${withGeom ? ', ea.geom' : ''}
        FROM "EnumerationAreas" ea
        JOIN "SubAdministrativeZones" saz ON ea."subAdministrativeZoneId" = saz.id
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
