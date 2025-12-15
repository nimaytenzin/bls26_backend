import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone } from '../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { DzongkhagAnnualStats } from '../annual statistics/dzongkhag-annual-statistics/entities/dzongkhag-annual-stats.entity';
import { AZAnnualStats } from '../annual statistics/administrative-zone-annual-statistics/entities/az-annual-stats.entity';
import { SAZAnnualStats } from '../annual statistics/sub-administrative-zone-annual-statistics/entities/saz-annual-stats.entity';
import { EAAnnualStats } from '../annual statistics/ea-annual-statistics/entities/ea-annual-stats.entity';
import { Sequelize, QueryTypes } from 'sequelize';

@Injectable()
export class PublicApiService {
  constructor(
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('DZONGKHAG_ANNUAL_STATS_REPOSITORY')
    private readonly dzongkhagAnnualStatsRepository: typeof DzongkhagAnnualStats,
    @Inject('AZ_ANNUAL_STATS_REPOSITORY')
    private readonly azAnnualStatsRepository: typeof AZAnnualStats,
    @Inject('SAZ_ANNUAL_STATS_REPOSITORY')
    private readonly sazAnnualStatsRepository: typeof SAZAnnualStats,
    @Inject('EA_ANNUAL_STATS_REPOSITORY')
    private readonly eaAnnualStatsRepository: typeof EAAnnualStats,
  ) {}

  /**
   * Get current year
   */
  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // ============ NATIONAL LEVEL ============

  /**
   * Get all dzongkhags as GeoJSON
   */
  async getNationalGeoJson(): Promise<any> {
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

    return data[0][0].jsonb_build_object || {
      type: 'FeatureCollection',
      features: [],
    };
  }

  /**
   * Get all dzongkhags as KML
   */
  async getNationalKml(): Promise<string> {
    const geoJson = await this.getNationalGeoJson();
    return this.convertGeoJsonToKml(geoJson, 'National Dzongkhags');
  }

  /**
   * Get national statistics
   */
  async getNationalStats(): Promise<{
    households: number;
    eas: number;
  }> {
    const currentYear = this.getCurrentYear();

    // Aggregate from all dzongkhag annual stats for current year
    const nationalStats = await this.dzongkhagAnnualStatsRepository.sequelize.query(
      `SELECT 
        SUM("totalHouseholds") as total_households,
        SUM("eaCount") as total_eas
       FROM "DzongkhagAnnualStats"
       WHERE year = ${currentYear};`,
      { type: QueryTypes.SELECT },
    );

    return {
      households: (nationalStats[0] as any)?.total_households || 0,
      eas: (nationalStats[0] as any)?.total_eas || 0,
    };
  }

  // ============ DZONGKHAG LEVEL ============

  /**
   * Get dzongkhag with administrative zones as GeoJSON
   */
  async getDzongkhagGeoJson(dzongkhagId: number): Promise<any> {
    // Get dzongkhag
    const dzongkhag = await this.dzongkhagRepository.findByPk(dzongkhagId);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    // Get dzongkhag as GeoJSON
    const dzongkhagGeoJson: any = await this.dzongkhagRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         inputs.id,
        'geometry',   ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'geom'
      ) AS feature
      FROM (SELECT * FROM "Dzongkhags" WHERE id = ${dzongkhagId}) inputs;`,
    );

    // Get administrative zones as GeoJSON for this dzongkhag
    const adminZonesGeoJson: any =
      await this.administrativeZoneRepository.sequelize.query(
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

    // Combine dzongkhag and administrative zones
    const features: any[] = [];

    // Add dzongkhag
    if (dzongkhagGeoJson[0]?.[0]?.feature) {
      features.push(dzongkhagGeoJson[0][0].feature);
    }

    // Add administrative zones
    const adminZonesCollection = adminZonesGeoJson[0]?.[0]?.jsonb_build_object;
    if (adminZonesCollection?.features) {
      features.push(...adminZonesCollection.features);
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get dzongkhag as KML
   */
  async getDzongkhagKml(dzongkhagId: number): Promise<string> {
    const dzongkhag = await this.dzongkhagRepository.findByPk(dzongkhagId);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    const geoJson = await this.getDzongkhagGeoJson(dzongkhagId);
    return this.convertGeoJsonToKml(geoJson, `Dzongkhag: ${dzongkhag.name}`);
  }

  /**
   * Get dzongkhag statistics
   */
  async getDzongkhagStats(dzongkhagId: number): Promise<{
    households: number;
    eas: number;
  }> {
    const dzongkhag = await this.dzongkhagRepository.findByPk(dzongkhagId);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    const currentYear = this.getCurrentYear();

    // Get stats from DzongkhagAnnualStats for current year
    const dzongkhagStats = await this.dzongkhagAnnualStatsRepository.findOne({
      where: {
        dzongkhagId,
        year: currentYear,
      },
    });

    if (!dzongkhagStats) {
      // Return zeros if no stats found for current year
      return {
        households: 0,
        eas: 0,
      };
    }

    return {
      households: dzongkhagStats.totalHouseholds || 0,
      eas: dzongkhagStats.eaCount || 0,
    };
  }

  // ============ ADMINISTRATIVE ZONE LEVEL ============

  /**
   * Get administrative zone with SAZs as GeoJSON
   */
  async getAdministrativeZoneGeoJson(
    administrativeZoneId: number,
  ): Promise<any> {
    const az = await this.administrativeZoneRepository.findByPk(
      administrativeZoneId,
    );
    if (!az) {
      throw new NotFoundException(
        `Administrative Zone with ID ${administrativeZoneId} not found`,
      );
    }

    // Get administrative zone as GeoJSON
    const azGeoJson: any =
      await this.administrativeZoneRepository.sequelize.query(
        `SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (SELECT * FROM "AdministrativeZones" WHERE id = ${administrativeZoneId}) inputs;`,
      );

    // Get SAZs as GeoJSON for this administrative zone
    const sazsGeoJson: any =
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

    // Combine administrative zone and SAZs
    const features: any[] = [];

    // Add administrative zone
    if (azGeoJson[0]?.[0]?.feature) {
      features.push(azGeoJson[0][0].feature);
    }

    // Add SAZs
    const sazsCollection = sazsGeoJson[0]?.[0]?.jsonb_build_object;
    if (sazsCollection?.features) {
      features.push(...sazsCollection.features);
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get administrative zone as KML
   */
  async getAdministrativeZoneKml(administrativeZoneId: number): Promise<string> {
    const az = await this.administrativeZoneRepository.findByPk(
      administrativeZoneId,
    );
    if (!az) {
      throw new NotFoundException(
        `Administrative Zone with ID ${administrativeZoneId} not found`,
      );
    }

    const geoJson = await this.getAdministrativeZoneGeoJson(
      administrativeZoneId,
    );
    return this.convertGeoJsonToKml(geoJson, `Administrative Zone: ${az.name}`);
  }

  /**
   * Get administrative zone statistics
   */
  async getAdministrativeZoneStats(
    administrativeZoneId: number,
  ): Promise<{
    households: number;
    eas: number;
  }> {
    const az = await this.administrativeZoneRepository.findByPk(
      administrativeZoneId,
    );
    if (!az) {
      throw new NotFoundException(
        `Administrative Zone with ID ${administrativeZoneId} not found`,
      );
    }

    const currentYear = this.getCurrentYear();

    // Get stats from AZAnnualStats for current year
    const azStats = await this.azAnnualStatsRepository.findOne({
      where: {
        administrativeZoneId,
        year: currentYear,
      },
    });

    if (!azStats) {
      // Return zeros if no stats found for current year
      return {
        households: 0,
        eas: 0,
      };
    }

    return {
      households: azStats.totalHouseholds || 0,
      eas: azStats.eaCount || 0,
    };
  }

  // ============ SUB-ADMINISTRATIVE ZONE LEVEL ============

  /**
   * Get SAZ with EAs as GeoJSON
   */
  async getSubAdministrativeZoneGeoJson(
    subAdministrativeZoneId: number,
  ): Promise<any> {
    const saz = await this.subAdministrativeZoneRepository.findByPk(
      subAdministrativeZoneId,
    );
    if (!saz) {
      throw new NotFoundException(
        `Sub-Administrative Zone with ID ${subAdministrativeZoneId} not found`,
      );
    }

    // Get SAZ as GeoJSON
    const sazGeoJson: any =
      await this.subAdministrativeZoneRepository.sequelize.query(
        `SELECT jsonb_build_object(
          'type',       'Feature',
          'id',         inputs.id,
          'geometry',   ST_AsGeoJSON(geom)::jsonb,
          'properties', to_jsonb(inputs) - 'geom'
        ) AS feature
        FROM (SELECT * FROM "SubAdministrativeZones" WHERE id = ${subAdministrativeZoneId}) inputs;`,
      );

    // Get EAs as GeoJSON for this SAZ
    const easGeoJson: any = await this.enumerationAreaRepository.sequelize.query(
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
        FROM (SELECT * FROM "EnumerationAreas" WHERE "subAdministrativeZoneId" = ${subAdministrativeZoneId} ORDER BY id) inputs
      ) features;`,
    );

    // Combine SAZ and EAs
    const features: any[] = [];

    // Add SAZ
    if (sazGeoJson[0]?.[0]?.feature) {
      features.push(sazGeoJson[0][0].feature);
    }

    // Add EAs
    const easCollection = easGeoJson[0]?.[0]?.jsonb_build_object;
    if (easCollection?.features) {
      features.push(...easCollection.features);
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get SAZ as KML
   */
  async getSubAdministrativeZoneKml(
    subAdministrativeZoneId: number,
  ): Promise<string> {
    const saz = await this.subAdministrativeZoneRepository.findByPk(
      subAdministrativeZoneId,
    );
    if (!saz) {
      throw new NotFoundException(
        `Sub-Administrative Zone with ID ${subAdministrativeZoneId} not found`,
      );
    }

    const geoJson = await this.getSubAdministrativeZoneGeoJson(
      subAdministrativeZoneId,
    );
    return this.convertGeoJsonToKml(
      geoJson,
      `Sub-Administrative Zone: ${saz.name}`,
    );
  }

  /**
   * Get SAZ statistics
   */
  async getSubAdministrativeZoneStats(
    subAdministrativeZoneId: number,
  ): Promise<{
    households: number;
    eas: number;
  }> {
    const saz = await this.subAdministrativeZoneRepository.findByPk(
      subAdministrativeZoneId,
    );
    if (!saz) {
      throw new NotFoundException(
        `Sub-Administrative Zone with ID ${subAdministrativeZoneId} not found`,
      );
    }

    const currentYear = this.getCurrentYear();

    // Get stats from SAZAnnualStats for current year
    const sazStats = await this.sazAnnualStatsRepository.findOne({
      where: {
        subAdministrativeZoneId,
        year: currentYear,
      },
    });

    if (!sazStats) {
      // Return zeros if no stats found for current year
      return {
        households: 0,
        eas: 0,
      };
    }

    return {
      households: sazStats.totalHouseholds || 0,
      eas: sazStats.eaCount || 0,
    };
  }

  // ============ ENUMERATION AREA LEVEL ============

  /**
   * Get EA as GeoJSON
   */
  async getEnumerationAreaGeoJson(enumerationAreaId: number): Promise<any> {
    const ea = await this.enumerationAreaRepository.findByPk(enumerationAreaId);
    if (!ea) {
      throw new NotFoundException(
        `Enumeration Area with ID ${enumerationAreaId} not found`,
      );
    }

    const data: any = await this.enumerationAreaRepository.sequelize.query(
      `SELECT jsonb_build_object(
        'type',       'Feature',
        'id',         inputs.id,
        'geometry',   ST_AsGeoJSON(geom)::jsonb,
        'properties', to_jsonb(inputs) - 'geom'
      ) AS feature
      FROM (SELECT * FROM "EnumerationAreas" WHERE id = ${enumerationAreaId}) inputs;`,
    );

    if (!data[0] || !data[0][0] || !data[0][0].feature) {
      throw new NotFoundException(
        `Enumeration Area with ID ${enumerationAreaId} not found`,
      );
    }

    return data[0][0].feature;
  }

  /**
   * Get EA as KML
   */
  async getEnumerationAreaKml(enumerationAreaId: number): Promise<string> {
    const ea = await this.enumerationAreaRepository.findByPk(enumerationAreaId);
    if (!ea) {
      throw new NotFoundException(
        `Enumeration Area with ID ${enumerationAreaId} not found`,
      );
    }

    const geoJson = await this.getEnumerationAreaGeoJson(enumerationAreaId);
    const featureCollection = {
      type: 'FeatureCollection',
      features: [geoJson],
    };
    return this.convertGeoJsonToKml(featureCollection, `EA: ${ea.name}`);
  }

  /**
   * Get EA statistics
   */
  async getEnumerationAreaStats(enumerationAreaId: number): Promise<{
    households: number;
    eas: number;
  }> {
    const ea = await this.enumerationAreaRepository.findByPk(enumerationAreaId);
    if (!ea) {
      throw new NotFoundException(
        `Enumeration Area with ID ${enumerationAreaId} not found`,
      );
    }

    const currentYear = this.getCurrentYear();

    // Get stats from EAAnnualStats for current year
    const eaStats = await this.eaAnnualStatsRepository.findOne({
      where: {
        enumerationAreaId,
        year: currentYear,
      },
    });

    if (!eaStats) {
      // Return zeros if no stats found for current year
      return {
        households: 0,
        eas: 1, // Always 1 for a single EA
      };
    }

    return {
      households: eaStats.totalHouseholds || 0,
      eas: 1, // Always 1 for a single EA
    };
  }

  // ============ KML CONVERSION UTILITY ============

  /**
   * Convert GeoJSON to KML format
   */
  private convertGeoJsonToKml(geoJson: any, name: string): string {
    let kml = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${this.escapeXml(name)}</name>
    <description>Generated from GeoJSON</description>`;

    if (geoJson.type === 'FeatureCollection' && geoJson.features) {
      for (const feature of geoJson.features) {
        kml += this.featureToKml(feature);
      }
    } else if (geoJson.type === 'Feature') {
      kml += this.featureToKml(geoJson);
    }

    kml += `
  </Document>
</kml>`;

    return kml;
  }

  /**
   * Convert a GeoJSON feature to KML Placemark
   */
  private featureToKml(feature: any): string {
    if (!feature.geometry) {
      return '';
    }

    const name = feature.properties?.name || feature.id || 'Unnamed';
    const description = this.buildDescription(feature.properties);

    const geom = feature.geometry;
    let placemarkContent = `
      <name>${this.escapeXml(String(name))}</name>
      <description>${this.escapeXml(description)}</description>`;

    if (geom.type === 'Point') {
      const coords = this.coordinatesToKml(geom.coordinates, 'Point');
      placemarkContent += `
      <Point>
        <coordinates>${coords}</coordinates>
      </Point>`;
    } else if (geom.type === 'LineString') {
      const coords = this.coordinatesToKml(geom.coordinates, 'LineString');
      placemarkContent += `
      <LineString>
        <coordinates>${coords}</coordinates>
      </LineString>`;
    } else if (geom.type === 'Polygon') {
      // Polygon: first ring is outer boundary, rest are inner boundaries
      const outerRing = this.coordinatesToKml(geom.coordinates[0], 'Polygon');
      placemarkContent += `
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${outerRing}</coordinates>
          </LinearRing>
        </outerBoundaryIs>`;
      
      // Add inner boundaries if any
      for (let i = 1; i < geom.coordinates.length; i++) {
        const innerRing = this.coordinatesToKml(geom.coordinates[i], 'Polygon');
        placemarkContent += `
        <innerBoundaryIs>
          <LinearRing>
            <coordinates>${innerRing}</coordinates>
          </LinearRing>
        </innerBoundaryIs>`;
      }
      
      placemarkContent += `
      </Polygon>`;
    } else if (geom.type === 'MultiPolygon') {
      // MultiPolygon: multiple polygons
      for (const polygon of geom.coordinates) {
        if (polygon && polygon[0]) {
          const outerRing = this.coordinatesToKml(polygon[0], 'Polygon');
          placemarkContent += `
      <Polygon>
        <outerBoundaryIs>
          <LinearRing>
            <coordinates>${outerRing}</coordinates>
          </LinearRing>
        </outerBoundaryIs>`;
          
          // Add inner boundaries if any
          for (let i = 1; i < polygon.length; i++) {
            const innerRing = this.coordinatesToKml(polygon[i], 'Polygon');
            placemarkContent += `
        <innerBoundaryIs>
          <LinearRing>
            <coordinates>${innerRing}</coordinates>
          </LinearRing>
        </innerBoundaryIs>`;
          }
          
          placemarkContent += `
      </Polygon>`;
        }
      }
    }

    return `
    <Placemark>${placemarkContent}
    </Placemark>`;
  }

  /**
   * Convert coordinates array to KML format
   */
  private coordinatesToKml(coords: any[], type: string): string {
    if (type === 'Point') {
      return `${coords[0]},${coords[1]},0`;
    }

    // For LineString and Polygon rings, flatten and format coordinates
    const formatCoord = (coord: any[]): string => {
      if (Array.isArray(coord[0])) {
        // Nested array - recurse
        return coord.map(formatCoord).join(' ');
      }
      // [lon, lat] or [lon, lat, alt]
      return `${coord[0]},${coord[1]},${coord[2] || 0}`;
    };

    return formatCoord(coords);
  }

  /**
   * Build description from properties
   */
  private buildDescription(properties: any): string {
    if (!properties) {
      return '';
    }

    const props = Object.entries(properties)
      .map(([key, value]) => `${key}: ${value}`)
      .join('<br/>');

    return props || '';
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

