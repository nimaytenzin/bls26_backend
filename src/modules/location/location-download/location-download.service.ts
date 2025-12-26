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
    // Sanitize GeoJSON properties to ensure all values are strings or numbers (not undefined/null)
    const sanitizedGeoJson = this.sanitizeGeoJsonProperties(geoJson);
    const kml = tokml(sanitizedGeoJson);
    // Apply blue borders to the KML content
    return addBlueBordersToKml(kml);
  }

  /**
   * Sanitize GeoJSON properties to ensure all values are strings or numbers
   * This prevents errors when converting to KML format
   */
  private sanitizeGeoJsonProperties(geoJson: any): any {
    if (!geoJson || !geoJson.features) {
      return geoJson;
    }

    const sanitizedFeatures = geoJson.features.map((feature: any) => {
      if (!feature.properties) {
        return feature;
      }

      const sanitizedProps: any = {};
      for (const [key, value] of Object.entries(feature.properties)) {
        // Convert undefined/null to empty string, keep other values as-is
        if (value === undefined || value === null) {
          sanitizedProps[key] = '';
        } else if (typeof value === 'object') {
          // Convert objects to JSON string
          sanitizedProps[key] = JSON.stringify(value);
        } else {
          // Keep strings, numbers, booleans as-is
          sanitizedProps[key] = value;
        }
      }

      return {
        ...feature,
        properties: sanitizedProps,
      };
    });

    return {
      ...geoJson,
      features: sanitizedFeatures,
    };
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
      const areaCode = props.areaCode || '';
      const name = props.name || '';
      const type = props.type || '';

      // Remove original areaCode (will be replaced with formatted versions)
      delete props.areaCode;

      // Transform based on entity type, including hierarchical information
      switch (entityType) {
        case 'dzongkhag':
          // Dzongkhag level: Just rename
          props['Dzongkhag Name'] = String(name);
          props['Dzongkhag Code'] = String(areaCode);
          break;

        case 'administrativeZone':
          // Administrative Zone level: Dzongkhag → Gewog/Thromde
          // Add Location: R for Gewog, U for Thromde
          const azType = type === 'Gewog' ? 'R' : type === 'Thromde' ? 'U' : '';
          props['Dzongkhag Name'] = String(props.dzongkhagName || '');
          props['Dzongkhag Code'] = String(props.dzongkhagCode || '');
          props['Location'] = String(azType);
          props['Gewog/Thromde Name'] = String(name);
          props['Gewog/Thromde Code'] = String(areaCode);
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
          
          props['Dzongkhag Name'] = String(props.dzongkhagName || '');
          props['Dzongkhag Code'] = String(props.dzongkhagCode || '');
          props['Location'] = String(azType2); // Administrative Zone Location (Gewog/Thromde)
          props['Gewog/Thromde Name'] = String(props.gewogName || props.thromdeName || '');
          props['Gewog/Thromde Code'] = String(props.gewogCode || props.thromdeCode || '');
          props['Chiwog/LAP Name'] = String(name);
          props['Chiwog/LAP Code'] = String(areaCode);
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
          
          props['Dzongkhag Name'] = String(props.dzongkhagName || '');
          props['Dzongkhag Code'] = String(props.dzongkhagCode || '');
          props['Location'] = String(azType3); // Administrative Zone Location (Gewog/Thromde)
          props['Gewog/Thromde Name'] = String(props.gewogName || props.thromdeName || '');
          props['Gewog/Thromde Code'] = String(props.gewogCode || props.thromdeCode || '');
          props['Chiwog/LAP Name'] = String(props.sazName || '');
          props['Chiwog/LAP Code'] = String(props.chiwogCode || props.lapCode || '');
          props['EA Name'] = String(name);
          props['EA Code'] = String(areaCode);
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

      // Final cleanup: ensure all remaining properties are strings (not undefined/null)
      const cleanedProps: any = {};
      for (const [key, value] of Object.entries(props)) {
        if (value === undefined || value === null) {
          cleanedProps[key] = '';
        } else if (typeof value === 'object') {
          cleanedProps[key] = JSON.stringify(value);
        } else {
          cleanedProps[key] = String(value);
        }
      }

      return {
        ...feature,
        properties: cleanedProps,
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
    // Get enumeration areas with hierarchy information (same pattern as dzongkhag download)
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
          WHERE ea."isActive" = true
          ORDER BY ea.id, saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download all Enumeration Areas as KML
   */
  async downloadAllEAsAsKml(): Promise<string> {
    const geoJson = await this.downloadAllEAsAsGeoJson();
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
    // Get all SAZs with hierarchy information (same pattern as dzongkhag download)
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
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT 
            saz.id,
            saz.geom,
            jsonb_build_object(
              'name', saz.name,
              'type', saz.type,
              'areaCode', saz."areaCode",
              'chiwogCode', CASE WHEN saz.type = 'chiwog' THEN saz."areaCode" ELSE NULL END,
              'lapCode', CASE WHEN saz.type = 'lap' THEN saz."areaCode" ELSE NULL END,
              'gewogName', CASE WHEN az.type = 'Gewog' THEN az.name ELSE NULL END,
              'gewogCode', CASE WHEN az.type = 'Gewog' THEN az."areaCode" ELSE NULL END,
              'thromdeName', CASE WHEN az.type = 'Thromde' THEN az.name ELSE NULL END,
              'thromdeCode', CASE WHEN az.type = 'Thromde' THEN az."areaCode" ELSE NULL END,
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "SubAdministrativeZones" saz
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          ORDER BY saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download all Sub-Administrative Zones as KML
   */
  async downloadAllSAZsAsKml(): Promise<string> {
    const geoJson = await this.downloadAllSAZsAsGeoJson();
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
    // Get enumeration areas with hierarchy information for this dzongkhag
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
          WHERE dz.id = ${dzongkhagId}
            AND ea."isActive" = true
          ORDER BY ea.id, saz.id
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
    const adminZoneRepo = (this.administrativeZoneService as any).administrativeZoneRepository;
    const data: any = await adminZoneRepo.sequelize.query(
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
          SELECT 
            az.id,
            az.geom,
            jsonb_build_object(
              'name', az.name,
              'type', az.type,
              'areaCode', az."areaCode",
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "AdministrativeZones" az
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE az."dzongkhagId" = ${dzongkhagId}
          ORDER BY az.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
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

    // Build query for all SAZs in these admin zones with hierarchy information
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
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT 
            saz.id,
            saz.geom,
            jsonb_build_object(
              'name', saz.name,
              'type', saz.type,
              'areaCode', saz."areaCode",
              'chiwogCode', CASE WHEN saz.type = 'chiwog' THEN saz."areaCode" ELSE NULL END,
              'lapCode', CASE WHEN saz.type = 'lap' THEN saz."areaCode" ELSE NULL END,
              'gewogName', CASE WHEN az.type = 'Gewog' THEN az.name ELSE NULL END,
              'gewogCode', CASE WHEN az.type = 'Gewog' THEN az."areaCode" ELSE NULL END,
              'thromdeName', CASE WHEN az.type = 'Thromde' THEN az.name ELSE NULL END,
              'thromdeCode', CASE WHEN az.type = 'Thromde' THEN az."areaCode" ELSE NULL END,
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "SubAdministrativeZones" saz
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE saz."administrativeZoneId" = ANY(ARRAY[${adminZoneIds.join(',')}])
          ORDER BY saz.id
        ) inputs
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
    // Build query with hierarchy information
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
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT 
            saz.id,
            saz.geom,
            jsonb_build_object(
              'name', saz.name,
              'type', saz.type,
              'areaCode', saz."areaCode",
              'chiwogCode', CASE WHEN saz.type = 'chiwog' THEN saz."areaCode" ELSE NULL END,
              'lapCode', CASE WHEN saz.type = 'lap' THEN saz."areaCode" ELSE NULL END,
              'gewogName', CASE WHEN az.type = 'Gewog' THEN az.name ELSE NULL END,
              'gewogCode', CASE WHEN az.type = 'Gewog' THEN az."areaCode" ELSE NULL END,
              'thromdeName', CASE WHEN az.type = 'Thromde' THEN az.name ELSE NULL END,
              'thromdeCode', CASE WHEN az.type = 'Thromde' THEN az."areaCode" ELSE NULL END,
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "SubAdministrativeZones" saz
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE saz."administrativeZoneId" = ${administrativeZoneId}
          ORDER BY saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
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
   * Download Chiwogs by Administrative Zone as GeoJSON
   */
  async downloadChiwogsByAdministrativeZoneAsGeoJson(
    administrativeZoneId: number,
  ): Promise<any> {
    // Build query for Chiwogs (SAZs of type 'chiwog') with hierarchy information
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
          'geometry',   ST_AsGeoJSON(inputs.geom)::jsonb,
          'properties', inputs.properties
        ) AS feature
        FROM (
          SELECT 
            saz.id,
            saz.geom,
            jsonb_build_object(
              'name', saz.name,
              'type', saz.type,
              'areaCode', saz."areaCode",
              'chiwogCode', saz."areaCode",
              'gewogName', CASE WHEN az.type = 'Gewog' THEN az.name ELSE NULL END,
              'gewogCode', CASE WHEN az.type = 'Gewog' THEN az."areaCode" ELSE NULL END,
              'thromdeName', CASE WHEN az.type = 'Thromde' THEN az.name ELSE NULL END,
              'thromdeCode', CASE WHEN az.type = 'Thromde' THEN az."areaCode" ELSE NULL END,
              'dzongkhagName', dz.name,
              'dzongkhagCode', dz."areaCode"
            ) AS properties
          FROM "SubAdministrativeZones" saz
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE saz."administrativeZoneId" = ${administrativeZoneId}
            AND saz.type = 'chiwog'
          ORDER BY saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Download Chiwogs by Administrative Zone as KML
   */
  async downloadChiwogsByAdministrativeZoneAsKml(
    administrativeZoneId: number,
  ): Promise<string> {
    const geoJson = await this.downloadChiwogsByAdministrativeZoneAsGeoJson(
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
    // Get enumeration areas with hierarchy information for this administrative zone
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
          WHERE az.id = ${administrativeZoneId}
            AND ea."isActive" = true
          ORDER BY ea.id, saz.id
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
    // Get enumeration areas with hierarchy information for this sub-administrative zone
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
          INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
            ON ea.id = junction."enumerationAreaId"
          LEFT JOIN "SubAdministrativeZones" saz 
            ON junction."subAdministrativeZoneId" = saz.id
          LEFT JOIN "AdministrativeZones" az 
            ON saz."administrativeZoneId" = az.id
          LEFT JOIN "Dzongkhags" dz 
            ON az."dzongkhagId" = dz.id
          WHERE junction."subAdministrativeZoneId" = ${subAdministrativeZoneId}
            AND ea."isActive" = true
          ORDER BY ea.id, saz.id
        ) inputs
      ) features;`,
    );

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
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

