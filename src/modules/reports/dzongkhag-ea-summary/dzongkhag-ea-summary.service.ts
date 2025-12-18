import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { Sequelize, Op, QueryTypes } from 'sequelize';
import { DzongkhagService } from '../../location/dzongkhag/dzongkhag.service';
import { AdministrativeZoneService } from '../../location/administrative-zone/administrative-zone.service';
import { SubAdministrativeZoneService } from '../../location/sub-administrative-zone/sub-administrative-zone.service';
import { EnumerationAreaService } from '../../location/enumeration-area/enumeration-area.service';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone, AdministrativeZoneType } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone, SubAdministrativeZoneType } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import {
  DzongkhagEaSummaryResponse,
  DzongkhagReportData,
  GewogReportData,
  ChiwogReportData,
  EnumerationAreaReportData,
  DzongkhagSummary,
  MapFeatureCollection,
  GeoJSONFeature,
} from './dzongkhag-ea-summary.dto';

@Injectable()
export class DzongkhagEaSummaryService {
  constructor(
    private readonly dzongkhagService: DzongkhagService,
    private readonly administrativeZoneService: AdministrativeZoneService,
    private readonly subAdministrativeZoneService: SubAdministrativeZoneService,
    private readonly enumerationAreaService: EnumerationAreaService,
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
  ) {}

  /**
   * Get complete report data for a dzongkhag
   */
  async getReportData(dzongkhagId: number): Promise<DzongkhagEaSummaryResponse> {
    // Fetch dzongkhag with geometry
    const dzongkhag = await this.getDzongkhagWithGeometry(dzongkhagId);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    // Fetch only Gewogs (exclude Thromdes)
    const gewogs = await this.getGewogsForDzongkhag(dzongkhagId);

    // Build hierarchical structure
    const gewogReportData: GewogReportData[] = [];

    for (const gewog of gewogs) {
      // Get chiwogs for this gewog (only chiwogs, exclude LAPs)
      const chiwogs = await this.getChiwogsForGewog(gewog.id);

      const chiwogReportData: ChiwogReportData[] = [];

      for (const chiwog of chiwogs) {
        // Get EAs for this chiwog (only active)
        const eas = await this.getEAsForChiwog(chiwog.id);

        const eaReportData: EnumerationAreaReportData[] = eas.map((ea) => ({
          id: ea.id,
          name: ea.name,
          code: ea.areaCode,
          geometry: this.convertGeometryToGeoJSON(ea.geom, ea.id, ea.name),
        }));

        chiwogReportData.push({
          id: chiwog.id,
          name: chiwog.name,
          code: chiwog.areaCode,
          geometry: chiwog.geom
            ? this.convertGeometryToGeoJSON(chiwog.geom, chiwog.id, chiwog.name)
            : undefined,
          summary: {
            totalEAs: eaReportData.length,
          },
          enumerationAreas: eaReportData,
        });
      }

      gewogReportData.push({
        id: gewog.id,
        name: gewog.name,
        code: gewog.areaCode,
        geometry: this.convertGeometryToGeoJSON(gewog.geom, gewog.id, gewog.name),
        summary: {
          totalChiwogs: chiwogReportData.length,
          totalEAs: chiwogReportData.reduce((sum, c) => sum + c.summary.totalEAs, 0),
        },
        chiwogs: chiwogReportData,
      });
    }

    // Calculate summary
    const summary = this.calculateSummary(gewogReportData);

    return {
      generatedAt: new Date().toISOString(),
      dzongkhag: {
        id: dzongkhag.id,
        name: dzongkhag.name,
        code: dzongkhag.areaCode,
        geometry: this.convertGeometryToGeoJSON(dzongkhag.geom, dzongkhag.id, dzongkhag.name),
      },
      summary,
      gewogs: gewogReportData,
    };
  }

  /**
   * Get map data as GeoJSON FeatureCollection
   */
  async getMapData(dzongkhagId: number): Promise<MapFeatureCollection> {
    const dzongkhag = await this.getDzongkhagWithGeometry(dzongkhagId);
    if (!dzongkhag) {
      throw new NotFoundException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    const features: MapFeatureCollection['features'] = [];

    // Add dzongkhag boundary
    if (dzongkhag.geom) {
      const dzongkhagFeature = this.convertGeometryToGeoJSON(
        dzongkhag.geom,
        dzongkhag.id,
        dzongkhag.name,
      );
      features.push({
        type: 'Feature',
        geometry: dzongkhagFeature.geometry,
        properties: {
          layer: 'dzongkhag',
          id: dzongkhag.id,
          name: dzongkhag.name,
          code: dzongkhag.areaCode,
        },
      });
    }

    // Get gewogs
    const gewogs = await this.getGewogsForDzongkhag(dzongkhagId);

    // Add gewog boundaries
    for (const gewog of gewogs) {
      if (gewog.geom) {
        const gewogFeature = this.convertGeometryToGeoJSON(
          gewog.geom,
          gewog.id,
          gewog.name,
        );
        features.push({
          type: 'Feature',
          geometry: gewogFeature.geometry,
          properties: {
            layer: 'gewog',
            id: gewog.id,
            name: gewog.name,
            code: gewog.areaCode,
            dzongkhagId: dzongkhag.id,
          },
        });
      }

      // Get chiwogs for this gewog
      const chiwogs = await this.getChiwogsForGewog(gewog.id);

      // Get all EAs for all chiwogs in this gewog
      for (const chiwog of chiwogs) {
        const eas = await this.getEAsForChiwog(chiwog.id);

        // Add EA boundaries
        for (const ea of eas) {
          if (ea.geom) {
            const eaFeature = this.convertGeometryToGeoJSON(ea.geom, ea.id, ea.name);
            features.push({
              type: 'Feature',
              geometry: eaFeature.geometry,
              properties: {
                layer: 'enumerationArea',
                id: ea.id,
                name: ea.name,
                code: ea.areaCode,
                dzongkhagId: dzongkhag.id,
                gewogId: gewog.id,
                chiwogId: chiwog.id,
              },
            });
          }
        }
      }
    }

    return {
      type: 'FeatureCollection',
      features,
    };
  }

  /**
   * Get dzongkhag with geometry as GeoJSON
   */
  private async getDzongkhagWithGeometry(dzongkhagId: number): Promise<any> {
    const result: any = await this.dzongkhagRepository.sequelize.query(
      `SELECT 
        id, name, "areaCode",
        ST_AsGeoJSON(geom)::jsonb as geom
      FROM "Dzongkhags"
      WHERE id = :dzongkhagId`,
      {
        replacements: { dzongkhagId },
        type: QueryTypes.SELECT,
      },
    );

    if (!result || result.length === 0) {
      return null;
    }

    const dzongkhag = result[0];
    return {
      id: dzongkhag.id,
      name: dzongkhag.name,
      areaCode: dzongkhag.areaCode,
      geom: dzongkhag.geom,
    };
  }

  /**
   * Get only Gewogs for a dzongkhag (exclude Thromdes)
   */
  private async getGewogsForDzongkhag(dzongkhagId: number): Promise<any[]> {
    const result: any = await this.administrativeZoneRepository.sequelize.query(
      `SELECT 
        id, name, "areaCode", type,
        ST_AsGeoJSON(geom)::jsonb as geom
      FROM "AdministrativeZones"
      WHERE "dzongkhagId" = :dzongkhagId AND type = 'Gewog'`,
      {
        replacements: { dzongkhagId },
        type: QueryTypes.SELECT,
      },
    );

    return result.map((gewog: any) => ({
      id: gewog.id,
      name: gewog.name,
      areaCode: gewog.areaCode,
      type: gewog.type,
      geom: gewog.geom,
    }));
  }

  /**
   * Get only Chiwogs for a gewog (exclude LAPs)
   */
  private async getChiwogsForGewog(gewogId: number): Promise<any[]> {
    const result: any = await this.subAdministrativeZoneRepository.sequelize.query(
      `SELECT 
        id, name, "areaCode", type,
        ST_AsGeoJSON(geom)::jsonb as geom
      FROM "SubAdministrativeZones"
      WHERE "administrativeZoneId" = :gewogId AND type = 'chiwog'`,
      {
        replacements: { gewogId },
        type: QueryTypes.SELECT,
      },
    );

    return result.map((chiwog: any) => ({
      id: chiwog.id,
      name: chiwog.name,
      areaCode: chiwog.areaCode,
      type: chiwog.type,
      geom: chiwog.geom,
    }));
  }

  /**
   * Get active EAs for a chiwog
   */
  private async getEAsForChiwog(chiwogId: number): Promise<any[]> {
    const result: any = await this.enumerationAreaRepository.sequelize.query(
      `SELECT DISTINCT
        ea.id, ea.name, ea."areaCode",
        ST_AsGeoJSON(ea.geom)::jsonb as geom
      FROM "EnumerationAreas" ea
      INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
        ON ea.id = junction."enumerationAreaId"
      WHERE junction."subAdministrativeZoneId" = :chiwogId
        AND ea."isActive" = true`,
      {
        replacements: { chiwogId },
        type: QueryTypes.SELECT,
      },
    );

    return result.map((ea: any) => ({
      id: ea.id,
      name: ea.name,
      areaCode: ea.areaCode,
      geom: ea.geom,
    }));
  }

  /**
   * Convert PostGIS geometry to GeoJSON Feature
   */
  private convertGeometryToGeoJSON(
    geom: any,
    id: number,
    name: string,
  ): GeoJSONFeature {
    if (!geom) {
      throw new Error('Geometry is required');
    }

    // Geometry from ST_AsGeoJSON is already a GeoJSON geometry object
    return {
      type: 'Feature',
      geometry: geom,
      properties: {
        id,
        name,
      },
    };
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(gewogs: GewogReportData[]): DzongkhagSummary {
    const totalGewogs = gewogs.length;
    const totalChiwogs = gewogs.reduce((sum, g) => sum + g.summary.totalChiwogs, 0);
    const totalEAs = gewogs.reduce((sum, g) => sum + g.summary.totalEAs, 0);

    return {
      totalGewogs,
      totalChiwogs,
      totalEAs,
    };
  }
}
