import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { DzongkhagAnnualStatsService } from '../dzongkhag-annual-statistics/dzongkhag-annual-stats.service';
import { AZAnnualStatsService } from '../administrative-zone-annual-statistics/az-annual-stats.service';
import { SAZAnnualStatsService } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.service';
import { EAAnnualStatsService } from '../ea-annual-statistics/ea-annual-stats.service';
import { DzongkhagAnnualStats } from '../dzongkhag-annual-statistics/entities/dzongkhag-annual-stats.entity';
import { AZAnnualStats } from '../administrative-zone-annual-statistics/entities/az-annual-stats.entity';
import { SAZAnnualStats } from '../sub-administrative-zone-annual-statistics/entities/saz-annual-stats.entity';
import { EAAnnualStats } from '../ea-annual-statistics/entities/ea-annual-stats.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';

@Injectable()
export class AnnualStatisticsDownloadService {
  constructor(
    @Inject('SEQUELIZE')
    private readonly sequelize: Sequelize,
    private readonly dzongkhagAnnualStatsService: DzongkhagAnnualStatsService,
    private readonly azAnnualStatsService: AZAnnualStatsService,
    private readonly sazAnnualStatsService: SAZAnnualStatsService,
    private readonly eaAnnualStatsService: EAAnnualStatsService,
  ) {}

  /**
   * Get the latest year from all annual statistics tables
   */
  async getLatestYear(): Promise<number> {
    // Get table names using Sequelize's getTableName method
    const dzongkhagTableName = DzongkhagAnnualStats.getTableName();
    const azTableName = AZAnnualStats.getTableName();
    const sazTableName = SAZAnnualStats.getTableName();
    const eaTableName = EAAnnualStats.getTableName();

    // Query each table separately to get max year, then find the overall max
    const [dzongkhagMax] = await this.sequelize.query(
      `SELECT MAX(year) as max_year FROM "${dzongkhagTableName}"`,
      { type: QueryTypes.SELECT },
    );
    const [azMax] = await this.sequelize.query(
      `SELECT MAX(year) as max_year FROM "${azTableName}"`,
      { type: QueryTypes.SELECT },
    );
    const [sazMax] = await this.sequelize.query(
      `SELECT MAX(year) as max_year FROM "${sazTableName}"`,
      { type: QueryTypes.SELECT },
    );
    const [eaMax] = await this.sequelize.query(
      `SELECT MAX(year) as max_year FROM "${eaTableName}"`,
      { type: QueryTypes.SELECT },
    );

    const years = [
      dzongkhagMax,
      azMax,
      sazMax,
      eaMax,
    ]
      .map((result: any) => (result?.max_year ? parseInt(result.max_year, 10) : null))
      .filter((year): year is number => year !== null);

    if (years.length === 0) {
      throw new NotFoundException('No annual statistics found in database');
    }

    return Math.max(...years);
  }

  /**
   * Resolve year - use provided year or get latest
   */
  private async resolveYear(year?: number): Promise<number> {
    if (year) {
      return year;
    }
    return this.getLatestYear();
  }

  /**
   * Download national statistics (all Dzongkhags)
   * @param year - Optional year (defaults to latest)
   * @param includeAZ - Include Administrative Zone breakdown
   * @param includeSAZ - Include Sub-Administrative Zone breakdown (requires includeAZ)
   */
  async downloadNationalStats(
    year?: number,
    includeAZ: boolean = false,
    includeSAZ: boolean = false,
  ): Promise<string> {
    const resolvedYear = await this.resolveYear(year);

    // If no breakdown requested, return simple Dzongkhag-level data
    if (!includeAZ && !includeSAZ) {
      const stats = await DzongkhagAnnualStats.findAll({
        where: { year: resolvedYear },
        include: [
          {
            model: Dzongkhag,
            as: 'dzongkhag',
            attributes: ['id', 'name', 'areaCode'],
          },
        ],
        order: [['dzongkhagId', 'ASC']],
      });

      const rows: string[] = [];
      rows.push(
        'Dzongkhag Name,Dzongkhag Code,EA Count,Household Count,Total Population',
      );

      for (const stat of stats) {
        const dzongkhag = stat.dzongkhag;
        const totalPopulation = (stat.totalMale || 0) + (stat.totalFemale || 0);
        rows.push(
          `"${dzongkhag?.name || 'N/A'}","${dzongkhag?.areaCode || 'N/A'}",${stat.eaCount || 0},${stat.totalHouseholds || 0},${totalPopulation}`,
        );
      }

      return rows.join('\n');
    }

    // If breakdown requested, get all Dzongkhags and their hierarchies
    const dzongkhags = await Dzongkhag.findAll({
      attributes: ['id', 'name', 'areaCode'],
      order: [['id', 'ASC']],
    });

    const rows: string[] = [];

    if (includeSAZ) {
      // Include SAZ breakdown: Dzongkhag → AZ → SAZ
      rows.push(
        'Dzongkhag Name,Gewog/Thromde,Chiwog/LAP,EA Count,Household Count',
      );

      for (const dzongkhag of dzongkhags) {
        const administrativeZones = await AdministrativeZone.findAll({
          where: { dzongkhagId: dzongkhag.id },
          attributes: ['id', 'name', 'areaCode', 'type'],
          order: [['id', 'ASC']],
        });

        for (const az of administrativeZones) {
          const sazs = await SubAdministrativeZone.findAll({
            where: { administrativeZoneId: az.id },
            attributes: ['id', 'name', 'areaCode'],
            order: [['id', 'ASC']],
          });

          for (const saz of sazs) {
            const sazStats = await SAZAnnualStats.findOne({
              where: { subAdministrativeZoneId: saz.id, year: resolvedYear },
            });

            rows.push(
              `"${dzongkhag.name}","${az.name}","${saz.name}",${sazStats?.eaCount || 0},${sazStats?.totalHouseholds || 0}`,
            );
          }

          // If no SAZs, show AZ row
          if (sazs.length === 0) {
            const azStats = await AZAnnualStats.findOne({
              where: { administrativeZoneId: az.id, year: resolvedYear },
            });
            rows.push(
              `"${dzongkhag.name}","${az.name}","N/A",${azStats?.eaCount || 0},${azStats?.totalHouseholds || 0}`,
            );
          }
        }
      }
    } else if (includeAZ) {
      // Include AZ breakdown only: Dzongkhag → AZ
      rows.push('Dzongkhag Name,Gewog/Thromde,EA Count,Household Count');

      for (const dzongkhag of dzongkhags) {
        const administrativeZones = await AdministrativeZone.findAll({
          where: { dzongkhagId: dzongkhag.id },
          attributes: ['id', 'name', 'areaCode', 'type'],
          order: [['id', 'ASC']],
        });

        for (const az of administrativeZones) {
          const azStats = await AZAnnualStats.findOne({
            where: { administrativeZoneId: az.id, year: resolvedYear },
          });

          rows.push(
            `"${dzongkhag.name}","${az.name}",${azStats?.eaCount || 0},${azStats?.totalHouseholds || 0}`,
          );
        }
      }
    }

    return rows.join('\n');
  }

  /**
   * Download statistics by Dzongkhag with breakdown by AZ → SAZ
   */
  async downloadDzongkhagStats(
    dzongkhagId: number,
    year?: number,
  ): Promise<string> {
    const resolvedYear = await this.resolveYear(year);

    // Get Dzongkhag info
    const dzongkhagStats = await DzongkhagAnnualStats.findOne({
      where: { dzongkhagId, year: resolvedYear },
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!dzongkhagStats) {
      throw new NotFoundException(
        `No statistics found for Dzongkhag ${dzongkhagId} for year ${resolvedYear}`,
      );
    }

    // Get all Administrative Zones for this Dzongkhag
    const administrativeZones = await AdministrativeZone.findAll({
      where: { dzongkhagId },
      attributes: ['id', 'name', 'areaCode', 'type'],
      order: [['id', 'ASC']],
    });

    const rows: string[] = [];
    rows.push(
      'Dzongkhag Name,Gewog/Thromde,Chiwog/LAP,EA Count,Household Count',
    );

    // For each Administrative Zone, get its SAZs and their stats
    for (const az of administrativeZones) {
      const azStats = await AZAnnualStats.findOne({
        where: { administrativeZoneId: az.id, year: resolvedYear },
      });

      // Get SAZs for this AZ
      const sazs = await SubAdministrativeZone.findAll({
        where: { administrativeZoneId: az.id },
        attributes: ['id', 'name', 'areaCode'],
        order: [['id', 'ASC']],
      });

      for (const saz of sazs) {
        const sazStats = await SAZAnnualStats.findOne({
          where: { subAdministrativeZoneId: saz.id, year: resolvedYear },
        });

        rows.push(
          `"${dzongkhagStats.dzongkhag?.name || 'N/A'}","${az.name}","${saz.name}",${sazStats?.eaCount || 0},${sazStats?.totalHouseholds || 0}`,
        );
      }

      // If no SAZs, still show the AZ row
      if (sazs.length === 0) {
        rows.push(
          `"${dzongkhagStats.dzongkhag?.name || 'N/A'}","${az.name}","N/A",${azStats?.eaCount || 0},${azStats?.totalHouseholds || 0}`,
        );
      }
    }

    return rows.join('\n');
  }

  /**
   * Download statistics by Administrative Zone with breakdown by SAZ
   */
  async downloadAdministrativeZoneStats(
    administrativeZoneId: number,
    year?: number,
  ): Promise<string> {
    const resolvedYear = await this.resolveYear(year);

    // Get Administrative Zone info
    const az = await AdministrativeZone.findByPk(administrativeZoneId, {
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!az) {
      throw new NotFoundException(
        `Administrative Zone ${administrativeZoneId} not found`,
      );
    }

    const rows: string[] = [];
    rows.push('Gewog/Thromde,Chiwog/LAP,EA Count,Household Count');

    // Get all SAZs for this Administrative Zone
    const sazs = await SubAdministrativeZone.findAll({
      where: { administrativeZoneId },
      attributes: ['id', 'name', 'areaCode'],
      order: [['id', 'ASC']],
    });

    for (const saz of sazs) {
      const sazStats = await SAZAnnualStats.findOne({
        where: { subAdministrativeZoneId: saz.id, year: resolvedYear },
      });

      rows.push(
        `"${az.name}","${saz.name}",${sazStats?.eaCount || 0},${sazStats?.totalHouseholds || 0}`,
      );
    }

    // If no SAZs, show just the AZ row
    if (sazs.length === 0) {
      const azStats = await AZAnnualStats.findOne({
        where: { administrativeZoneId, year: resolvedYear },
      });
      rows.push(
        `"${az.name}","N/A",${azStats?.eaCount || 0},${azStats?.totalHouseholds || 0}`,
      );
    }

    return rows.join('\n');
  }

  /**
   * Download statistics by Sub-Administrative Zone
   */
  async downloadSubAdministrativeZoneStats(
    subAdministrativeZoneId: number,
    year?: number,
  ): Promise<string> {
    const resolvedYear = await this.resolveYear(year);

    // Get Sub-Administrative Zone info
    const saz = await SubAdministrativeZone.findByPk(subAdministrativeZoneId, {
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!saz) {
      throw new NotFoundException(
        `Sub-Administrative Zone ${subAdministrativeZoneId} not found`,
      );
    }

    const sazStats = await SAZAnnualStats.findOne({
      where: { subAdministrativeZoneId, year: resolvedYear },
    });

    const rows: string[] = [];
    rows.push('Chiwog/LAP,EA Count,Household Count');

    rows.push(
      `"${saz.name}",${sazStats?.eaCount || 0},${sazStats?.totalHouseholds || 0}`,
    );

    return rows.join('\n');
  }
}

