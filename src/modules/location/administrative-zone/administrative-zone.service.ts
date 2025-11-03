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
      geom: Sequelize.fn('ST_GeomFromGeoJSON', geomString),
    });

    return administrativeZone;
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

  async remove(id: number): Promise<number> {
    return await this.administrativeZoneRepository.destroy({
      where: { id },
    });
  }
}
