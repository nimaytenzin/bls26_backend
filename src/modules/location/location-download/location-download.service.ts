import { Inject, Injectable } from '@nestjs/common';
import { EnumerationArea } from '../enumeration-area/entities/enumeration-area.entity';
import { SubAdministrativeZone } from '../sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../dzongkhag/entities/dzongkhag.entity';
import { EnumerationAreaService } from '../enumeration-area/enumeration-area.service';
import { SubAdministrativeZoneService } from '../sub-administrative-zone/sub-administrative-zone.service';
import { AdministrativeZoneService } from '../administrative-zone/administrative-zone.service';
import { DzongkhagService } from '../dzongkhag/dzongkhag.service';
import * as tokml from 'tokml';
import { addBlueBordersToKml } from './utils/kml-styler.util';

@Injectable()
export class LocationDownloadService {
  constructor(
    private readonly enumerationAreaService: EnumerationAreaService,
    private readonly subAdministrativeZoneService: SubAdministrativeZoneService,
    private readonly administrativeZoneService: AdministrativeZoneService,
    private readonly dzongkhagService: DzongkhagService,
  ) {}

  /**
   * Convert GeoJSON to KML
   */
  private convertGeoJsonToKml(geoJson: any): string {
    const kml = tokml(geoJson);
    // Apply blue borders to the KML content
    return addBlueBordersToKml(kml);
  }

  /**
   * NATIONAL DATA DOWNLOADS
   */

  /**
   * Download all Enumeration Areas as GeoJSON
   */
  async downloadAllEAsAsGeoJson(): Promise<any> {
    return await this.enumerationAreaService.findAllAsGeoJson();
  }

  /**
   * Download all Enumeration Areas as KML
   */
  async downloadAllEAsAsKml(): Promise<string> {
    const geoJson = await this.enumerationAreaService.findAllAsGeoJson();
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download all Sub-Administrative Zones as GeoJSON
   */
  async downloadAllSAZsAsGeoJson(): Promise<any> {
    return await this.subAdministrativeZoneService.findAllAsGeoJson();
  }

  /**
   * Download all Sub-Administrative Zones as KML
   */
  async downloadAllSAZsAsKml(): Promise<string> {
    const geoJson = await this.subAdministrativeZoneService.findAllAsGeoJson();
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download all Administrative Zones as GeoJSON
   */
  async downloadAllAZsAsGeoJson(): Promise<any> {
    return await this.administrativeZoneService.findAllAsGeoJson();
  }

  /**
   * Download all Administrative Zones as KML
   */
  async downloadAllAZsAsKml(): Promise<string> {
    const geoJson = await this.administrativeZoneService.findAllAsGeoJson();
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download all Dzongkhags as GeoJSON
   */
  async downloadAllDzongkhagsAsGeoJson(): Promise<any> {
    return await this.dzongkhagService.findAllAsGeoJson();
  }

  /**
   * Download all Dzongkhags as KML
   */
  async downloadAllDzongkhagsAsKml(): Promise<string> {
    const geoJson = await this.dzongkhagService.findAllAsGeoJson();
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * DZONGKHAG DATA DOWNLOADS
   */

  /**
   * Download Enumeration Areas by Dzongkhag as GeoJSON
   */
  async downloadEAsByDzongkhagAsGeoJson(
    dzongkhagId: number,
  ): Promise<any> {
    // Get administrative zones for this dzongkhag
    const adminZones = await this.administrativeZoneService.findByDzongkhag(
      dzongkhagId,
    );
    const adminZoneIds = adminZones.map((az) => az.id);

    if (adminZoneIds.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Get sub-administrative zones for these admin zones
    const subAdminZones: SubAdministrativeZone[] = [];
    for (const adminZoneId of adminZoneIds) {
      const sazs = await this.subAdministrativeZoneService.findByAdministrativeZone(
        adminZoneId,
      );
      subAdminZones.push(...sazs);
    }

    const subAdminZoneIds = subAdminZones.map((saz) => saz.id);

    if (subAdminZoneIds.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Get enumeration areas for these sub-admin zones
    const enumerationAreaRepo = (this.enumerationAreaService as any).enumerationAreaRepository;
    const data: any = await enumerationAreaRepo.sequelize.query(
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
        FROM (SELECT * FROM "EnumerationAreas" WHERE "subAdministrativeZoneId" = ANY(ARRAY[${subAdminZoneIds.join(',')}]) ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download Enumeration Areas by Dzongkhag as KML
   */
  async downloadEAsByDzongkhagAsKml(dzongkhagId: number): Promise<string> {
    const geoJson = await this.downloadEAsByDzongkhagAsGeoJson(dzongkhagId);
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download Administrative Zones by Dzongkhag as GeoJSON
   */
  async downloadAZsByDzongkhagAsGeoJson(
    dzongkhagId: number,
  ): Promise<any> {
    return await this.administrativeZoneService.findAllAsGeoJsonByDzongkhag(
      dzongkhagId,
    );
  }

  /**
   * Download Administrative Zones by Dzongkhag as KML
   */
  async downloadAZsByDzongkhagAsKml(dzongkhagId: number): Promise<string> {
    const geoJson = await this.downloadAZsByDzongkhagAsGeoJson(dzongkhagId);
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download Sub-Administrative Zones by Dzongkhag as GeoJSON
   */
  async downloadSAZsByDzongkhagAsGeoJson(
    dzongkhagId: number,
  ): Promise<any> {
    // Get administrative zones for this dzongkhag
    const adminZones = await this.administrativeZoneService.findByDzongkhag(
      dzongkhagId,
    );
    const adminZoneIds = adminZones.map((az) => az.id);

    if (adminZoneIds.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Build query for all SAZs in these admin zones
    const subAdminZoneRepo = (this.subAdministrativeZoneService as any).subAdministrativeZoneRepository;
    const data: any = await subAdminZoneRepo.sequelize.query(
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
        FROM (SELECT * FROM "SubAdministrativeZones" WHERE "administrativeZoneId" = ANY(ARRAY[${adminZoneIds.join(',')}]) ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download Sub-Administrative Zones by Dzongkhag as KML
   */
  async downloadSAZsByDzongkhagAsKml(dzongkhagId: number): Promise<string> {
    const geoJson = await this.downloadSAZsByDzongkhagAsGeoJson(dzongkhagId);
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * ADMINISTRATIVE ZONE DATA DOWNLOADS
   */

  /**
   * Download Sub-Administrative Zones by Administrative Zone as GeoJSON
   */
  async downloadSAZsByAdministrativeZoneAsGeoJson(
    administrativeZoneId: number,
  ): Promise<any> {
    return await this.subAdministrativeZoneService.findAllAsGeoJsonByAdministrativeZone(
      administrativeZoneId,
    );
  }

  /**
   * Download Sub-Administrative Zones by Administrative Zone as KML
   */
  async downloadSAZsByAdministrativeZoneAsKml(
    administrativeZoneId: number,
  ): Promise<string> {
    const geoJson = await this.downloadSAZsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * Download Enumeration Areas by Administrative Zone as GeoJSON
   */
  async downloadEAsByAdministrativeZoneAsGeoJson(
    administrativeZoneId: number,
  ): Promise<any> {
    // Get sub-administrative zones for this admin zone
    const subAdminZones = await this.subAdministrativeZoneService.findByAdministrativeZone(
      administrativeZoneId,
    );
    const subAdminZoneIds = subAdminZones.map((saz) => saz.id);

    if (subAdminZoneIds.length === 0) {
      return {
        type: 'FeatureCollection',
        features: [],
      };
    }

    // Get enumeration areas for these sub-admin zones
    const enumerationAreaRepo = (this.enumerationAreaService as any).enumerationAreaRepository;
    const data: any = await enumerationAreaRepo.sequelize.query(
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
        FROM (SELECT * FROM "EnumerationAreas" WHERE "subAdministrativeZoneId" = ANY(ARRAY[${subAdminZoneIds.join(',')}]) ORDER BY id) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download Enumeration Areas by Administrative Zone as KML
   */
  async downloadEAsByAdministrativeZoneAsKml(
    administrativeZoneId: number,
  ): Promise<string> {
    const geoJson = await this.downloadEAsByAdministrativeZoneAsGeoJson(
      administrativeZoneId,
    );
    return this.convertGeoJsonToKml(geoJson);
  }

  /**
   * SUB-ADMINISTRATIVE ZONE DATA DOWNLOADS
   */

  /**
   * Download Enumeration Areas by Sub-Administrative Zone as GeoJSON
   */
  async downloadEAsBySubAdministrativeZoneAsGeoJson(
    subAdministrativeZoneId: number,
  ): Promise<any> {
    return await this.enumerationAreaService.findAllAsGeoJsonBySubAdministrativeZone(
      subAdministrativeZoneId,
    );
  }

  /**
   * Download Enumeration Areas by Sub-Administrative Zone as KML
   */
  async downloadEAsBySubAdministrativeZoneAsKml(
    subAdministrativeZoneId: number,
  ): Promise<string> {
    const geoJson = await this.downloadEAsBySubAdministrativeZoneAsGeoJson(
      subAdministrativeZoneId,
    );
    return this.convertGeoJsonToKml(geoJson);
  }
}

