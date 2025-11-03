import { Inject, Injectable } from '@nestjs/common';
import { SubAdministrativeZone } from './entities/sub-administrative-zone.entity';
import { CreateSubAdministrativeZoneDto } from './dto/create-sub-administrative-zone.dto';
import { UpdateSubAdministrativeZoneDto } from './dto/update-sub-administrative-zone.dto';
import { CreateSubAdministrativeZoneGeoJsonDto } from './dto/create-sub-administrative-zone-geojson.dto';
import { instanceToPlain } from 'class-transformer';
import { Sequelize } from 'sequelize';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';

@Injectable()
export class SubAdministrativeZoneService {
  constructor(
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
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

    // Convert GeoJSON geometry to PostGIS format
    const geomString = JSON.stringify(geometry);

    const subAdministrativeZone =
      await this.subAdministrativeZoneRepository.create({
        administrativeZoneId: properties.administrativeZoneId,
        name: properties.name,
        areaCode: properties.areaCode,
        type: properties.type,
        geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
      });

    return subAdministrativeZone;
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
    return await this.subAdministrativeZoneRepository.findOne<SubAdministrativeZone>(
      {
        where: { id },
        include: [
          {
            model: AdministrativeZone,
            include: [{ model: Dzongkhag }],
          },
          {
            model: EnumerationArea,
          },
        ],
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
      includeOptions.push('enumerationAreas');
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
}
