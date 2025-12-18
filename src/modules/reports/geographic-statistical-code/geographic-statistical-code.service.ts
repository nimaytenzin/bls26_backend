import { Injectable, Inject } from '@nestjs/common';
import { DzongkhagService } from '../../location/dzongkhag/dzongkhag.service';
import { EnumerationAreaService } from '../../location/enumeration-area/enumeration-area.service';
import {
  GeographicStatisticalCodeResponse,
  DzongkhagReportData,
  EnumerationAreaReportRow,
  DzongkhagSummary,
} from './geographic-statistical-code.dto';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone, AdministrativeZoneType } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone, SubAdministrativeZoneType } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { Op } from 'sequelize';

@Injectable()
export class GeographicStatisticalCodeService {
  constructor(
    private readonly dzongkhagService: DzongkhagService,
    private readonly enumerationAreaService: EnumerationAreaService,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
  ) {}

  /**
   * Get complete report data for all dzongkhags
   */
  async getReportData(): Promise<GeographicStatisticalCodeResponse> {
    // Fetch all dzongkhags with full hierarchy
    const dzongkhags = await this.dzongkhagService.findAll(
      false, // no geometry
      true, // include admin zones
      true, // include sub admin zones
      true, // include EAs
    );

    // Sort dzongkhags by area code (ascending)
    dzongkhags.sort((a, b) => a.areaCode.localeCompare(b.areaCode));

    // Sort administrative zones and sub-administrative zones within each dzongkhag
    for (const dzongkhag of dzongkhags) {
      if (dzongkhag.administrativeZones) {
        // Sort administrative zones by area code (ascending)
        dzongkhag.administrativeZones.sort((a, b) => a.areaCode.localeCompare(b.areaCode));
        
        // Sort sub-administrative zones within each administrative zone by area code (ascending)
        for (const adminZone of dzongkhag.administrativeZones) {
          if (adminZone.subAdministrativeZones) {
            adminZone.subAdministrativeZones.sort((a, b) => a.areaCode.localeCompare(b.areaCode));
          }
        }
      }
    }

    const dzongkhagReportData: DzongkhagReportData[] = [];
    let totalEAs = 0;
    let totalUrbanEAs = 0;
    let totalRuralEAs = 0;

    for (const dzongkhag of dzongkhags) {
      const reportData = await this.getDzongkhagReportData(dzongkhag);
      dzongkhagReportData.push(reportData);
      totalEAs += reportData.summary.totalEAs;
      totalUrbanEAs += reportData.summary.urbanEAs;
      totalRuralEAs += reportData.summary.ruralEAs;
    }

    return {
      generatedAt: new Date().toISOString(),
      totalDzongkhags: dzongkhags.length,
      totalEAs,
      totalUrbanEAs,
      totalRuralEAs,
      dzongkhags: dzongkhagReportData,
    };
  }

  /**
   * Get report data for a single dzongkhag
   */
  async getDzongkhagReportData(dzongkhag: Dzongkhag): Promise<DzongkhagReportData> {
    const urbanEAs: EnumerationAreaReportRow[] = [];
    const ruralEAs: EnumerationAreaReportRow[] = [];

    // Collect all sub-admin zone IDs to fetch EAs in batch
    const subAdminZoneIds: number[] = [];
    const subAdminZoneMap = new Map<number, { adminZone: AdministrativeZone; subAdminZone: SubAdministrativeZone }>();

    if (dzongkhag.administrativeZones) {
      for (const adminZone of dzongkhag.administrativeZones) {
        if (adminZone.subAdministrativeZones) {
          for (const subAdminZone of adminZone.subAdministrativeZones) {
            subAdminZoneIds.push(subAdminZone.id);
            subAdminZoneMap.set(subAdminZone.id, { adminZone, subAdminZone });
          }
        }
      }
    }

    // Fetch EAs linked to any of these sub-admin zones using repository injection
    const eas = await this.getEAsForSubAdminZones(subAdminZoneIds);

    // Process EAs and organize by Urban/Rural
    for (const ea of eas) {
      if (ea.subAdministrativeZones) {
        for (const saz of ea.subAdministrativeZones) {
          const mapping = subAdminZoneMap.get(saz.id);
          if (mapping) {
            const { adminZone, subAdminZone } = mapping;
            const row: EnumerationAreaReportRow = {
              eaId: ea.id,
              eaName: ea.name,
              eaCode: ea.areaCode,
              administrativeZone: {
                id: adminZone.id,
                name: adminZone.name,
                code: adminZone.areaCode,
                type: adminZone.type,
              },
              subAdministrativeZone: {
                id: subAdminZone.id,
                name: subAdminZone.name,
                code: subAdminZone.areaCode,
                type: subAdminZone.type,
              },
            };

            // Classify as Urban or Rural
            if (this.isUrban(adminZone.type, subAdminZone.type)) {
              urbanEAs.push(row);
            } else {
              ruralEAs.push(row);
            }
          }
        }
      }
    }

    // Sort EAs by full hierarchy: Administrative Zone code -> Sub-Administrative Zone code -> EA code
    urbanEAs.sort((a, b) => {
      // First compare by Administrative Zone code
      const adminZoneCompare = a.administrativeZone.code.localeCompare(b.administrativeZone.code);
      if (adminZoneCompare !== 0) return adminZoneCompare;
      
      // Then compare by Sub-Administrative Zone code
      const subAdminZoneCompare = a.subAdministrativeZone.code.localeCompare(b.subAdministrativeZone.code);
      if (subAdminZoneCompare !== 0) return subAdminZoneCompare;
      
      // Finally compare by EA code
      return a.eaCode.localeCompare(b.eaCode);
    });
    
    ruralEAs.sort((a, b) => {
      // First compare by Administrative Zone code
      const adminZoneCompare = a.administrativeZone.code.localeCompare(b.administrativeZone.code);
      if (adminZoneCompare !== 0) return adminZoneCompare;
      
      // Then compare by Sub-Administrative Zone code
      const subAdminZoneCompare = a.subAdministrativeZone.code.localeCompare(b.subAdministrativeZone.code);
      if (subAdminZoneCompare !== 0) return subAdminZoneCompare;
      
      // Finally compare by EA code
      return a.eaCode.localeCompare(b.eaCode);
    });

    // Calculate summary
    const summary = await this.calculateDzongkhagSummary(dzongkhag.id, urbanEAs.length, ruralEAs.length);

    return {
      id: dzongkhag.id,
      name: dzongkhag.name,
      code: dzongkhag.areaCode,
      summary,
      urbanEAs,
      ruralEAs,
    };
  }

  /**
   * Calculate summary statistics for a dzongkhag
   */
  async calculateDzongkhagSummary(
    dzongkhagId: number,
    urbanEAsCount: number,
    ruralEAsCount: number,
  ): Promise<DzongkhagSummary> {
    // Fetch dzongkhag with admin zones and sub-admin zones to count
    const dzongkhag = await this.dzongkhagService.findOne(dzongkhagId, false, true, true);

    let totalGewogs = 0;
    let totalThromdes = 0;
    let totalChiwogs = 0;
    let totalLaps = 0;

    if (dzongkhag.administrativeZones) {
      for (const adminZone of dzongkhag.administrativeZones) {
        if (adminZone.type === AdministrativeZoneType.GEWOG) {
          totalGewogs++;
        } else if (adminZone.type === AdministrativeZoneType.THROMDE) {
          totalThromdes++;
        }

        if (adminZone.subAdministrativeZones) {
          for (const subAdminZone of adminZone.subAdministrativeZones) {
            if (subAdminZone.type === SubAdministrativeZoneType.CHIWOG) {
              totalChiwogs++;
            } else if (subAdminZone.type === SubAdministrativeZoneType.LAP) {
              totalLaps++;
            }
          }
        }
      }
    }

    return {
      totalGewogs,
      totalThromdes,
      totalChiwogs,
      totalLaps,
      totalEAs: urbanEAsCount + ruralEAsCount,
      urbanEAs: urbanEAsCount,
      ruralEAs: ruralEAsCount,
    };
  }

  /**
   * Get enumeration areas for multiple sub-administrative zones (active only)
   */
  private async getEAsForSubAdminZones(subAdminZoneIds: number[]): Promise<EnumerationArea[]> {
    if (subAdminZoneIds.length === 0) {
      return [];
    }

    return await this.enumerationAreaRepository.findAll({
      where: {
        isActive: true,
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          where: {
            id: { [Op.in]: subAdminZoneIds },
          },
          required: true,
        },
      ],
      attributes: { exclude: ['geom'] },
    });
  }

  /**
   * Determine if an EA is Urban based on admin zone and sub-admin zone types
   * Urban: Thromde OR LAP
   * Rural: Gewog AND Chiwog
   */
  private isUrban(
    adminZoneType: AdministrativeZoneType,
    subAdminZoneType: SubAdministrativeZoneType,
  ): boolean {
    return (
      adminZoneType === AdministrativeZoneType.THROMDE ||
      subAdminZoneType === SubAdministrativeZoneType.LAP
    );
  }
}

