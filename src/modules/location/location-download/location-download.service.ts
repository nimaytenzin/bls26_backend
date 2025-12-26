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
   * Transform GeoJSON to add Type columns and rename to combined Name/Code format
   * Format matches CSV structure: Type (R/U), Combined Name, Combined Code
   * Includes full hierarchy information in properties
   */
  private transformGeoJsonForPublicDashboard(
    geoJson: any,
    entityType: 'dzongkhag' | 'administrativeZone' | 'subAdministrativeZone' | 'enumerationArea',
  ): any {
    if (!geoJson || !geoJson.features) {
      return geoJson;
    }

    const transformedFeatures = geoJson.features.map((feature: any) => {
      if (!feature.properties) {
        return feature;
      }

      const props = { ...feature.properties };
      const areaCode = props.areaCode;
      const name = props.name;
      const type = props.type;

      // Remove original areaCode (will be replaced with formatted versions)
      delete props.areaCode;

      // Transform based on entity type, including hierarchical information
      switch (entityType) {
        case 'dzongkhag':
          // Dzongkhag level: Just rename
          props['Dzongkhag Name'] = name;
          props['Dzongkhag Code'] = areaCode;
          break;

        case 'administrativeZone':
          // Administrative Zone level: Dzongkhag → Gewog/Thromde
          // Add Location: R for Gewog, U for Thromde
          const azType = type === 'Gewog' ? 'R' : type === 'Thromde' ? 'U' : '';
          props['Dzongkhag Name'] = props.dzongkhagName || '';
          props['Dzongkhag Code'] = props.dzongkhagCode || '';
          props['Location'] = azType;
          props['Gewog/Thromde Name'] = name;
          props['Gewog/Thromde Code'] = areaCode;
          // Clean up original hierarchical fields
          delete props.dzongkhagName;
          delete props.dzongkhagCode;
          break;

        case 'subAdministrativeZone':
          // Sub-Administrative Zone level: Dzongkhag → Gewog/Thromde → Chiwog/LAP
          // Add Location: R for Gewog, U for Thromde
          // Determine Administrative Zone Location based on whether it's a Gewog or Thromde
          const hasGewog = props.gewogName || props.gewogCode;
          const azType2 = hasGewog ? 'R' : 'U'; // Gewog = R, Thromde = U
          
          props['Dzongkhag Name'] = props.dzongkhagName || '';
          props['Dzongkhag Code'] = props.dzongkhagCode || '';
          props['Location'] = azType2; // Administrative Zone Location (Gewog/Thromde)
          props['Gewog/Thromde Name'] = props.gewogName || props.thromdeName || '';
          props['Gewog/Thromde Code'] = props.gewogCode || props.thromdeCode || '';
          props['Chiwog/LAP Name'] = name;
          props['Chiwog/LAP Code'] = areaCode;
          // Clean up original hierarchical fields
          delete props.dzongkhagName;
          delete props.dzongkhagCode;
          delete props.gewogName;
          delete props.gewogCode;
          delete props.thromdeName;
          delete props.thromdeCode;
          delete props.chiwogCode;
          delete props.lapCode;
          break;

        case 'enumerationArea':
          // Enumeration Area level: Full hierarchy Dzongkhag → Gewog/Thromde → Chiwog/LAP → EA
          // Determine Location based on hierarchical information
          const hasGewog2 = props.gewogName || props.gewogCode;
          const azType3 = hasGewog2 ? 'R' : 'U'; // Gewog = R, Thromde = U
          
          props['Dzongkhag Name'] = props.dzongkhagName || '';
          props['Dzongkhag Code'] = props.dzongkhagCode || '';
          props['Location'] = azType3; // Administrative Zone Location (Gewog/Thromde)
          props['Gewog/Thromde Name'] = props.gewogName || props.thromdeName || '';
          props['Gewog/Thromde Code'] = props.gewogCode || props.thromdeCode || '';
          props['Chiwog/LAP Name'] = props.sazName || '';
          props['Chiwog/LAP Code'] = props.chiwogCode || props.lapCode || '';
          props['EA Name'] = name;
          props['EA Code'] = areaCode;
          // Clean up original hierarchical fields
          delete props.dzongkhagName;
          delete props.dzongkhagCode;
          delete props.gewogName;
          delete props.gewogCode;
          delete props.thromdeName;
          delete props.thromdeCode;
          delete props.sazName;
          delete props.sazType;
          delete props.chiwogCode;
          delete props.lapCode;
          break;
      }

      return {
        ...feature,
        properties: props,
      };
    });

    return {
      ...geoJson,
      features: transformedFeatures,
    };
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'enumerationArea',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'subAdministrativeZone',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'administrativeZone',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'dzongkhag',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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

    // Get enumeration areas for these sub-admin zones via junction table
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
        FROM (
          SELECT DISTINCT ea.* 
          FROM "EnumerationAreas" ea
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          WHERE junction."subAdministrativeZoneId" = ANY(ARRAY[${subAdminZoneIds.join(',')}])
            AND ea."isActive" = true
          ORDER BY ea.id
        ) inputs
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'enumerationArea',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'administrativeZone',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'subAdministrativeZone',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'subAdministrativeZone',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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

    // Get enumeration areas for these sub-admin zones via junction table
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
        FROM (
          SELECT DISTINCT ea.* 
          FROM "EnumerationAreas" ea
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          WHERE junction."subAdministrativeZoneId" = ANY(ARRAY[${subAdminZoneIds.join(',')}])
            AND ea."isActive" = true
          ORDER BY ea.id
        ) inputs
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'enumerationArea',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
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
    const transformedGeoJson = this.transformGeoJsonForPublicDashboard(
      geoJson,
      'enumerationArea',
    );
    return this.convertGeoJsonToKml(transformedGeoJson);
  }
}

