import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EAAnnualStats } from './entities/ea-annual-stats.entity';
import { CreateEAAnnualStatsDto } from './dto/create-ea-annual-stats.dto';
import { UpdateEAAnnualStatsDto } from './dto/update-ea-annual-stats.dto';
import {
  ListEAAnnualStatsQueryDto,
  AggregateStatsQueryDto,
  EAAnnualStatsResponseDto,
  AggregatedStatsResponseDto,
  PaginatedEAAnnualStatsResponseDto,
  AggregationLevel,
} from './dto/ea-annual-stats-query.dto';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { Survey } from '../../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from '../../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SAZAnnualStatsService } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.service';
import { AZAnnualStatsService } from '../administrative-zone-annual-statistics/az-annual-stats.service';
import { DzongkhagAnnualStatsService } from '../dzongkhag-annual-statistics/dzongkhag-annual-stats.service';
import { Sequelize } from 'sequelize-typescript';
import { QueryTypes } from 'sequelize';
import { Op } from 'sequelize';

@Injectable()
export class EAAnnualStatsService {
  private readonly logger = new Logger(EAAnnualStatsService.name);
  constructor(
    @Inject('EA_ANNUAL_STATS_REPOSITORY')
    private readonly eaAnnualStatsRepository: typeof EAAnnualStats,
    @Inject('SEQUELIZE')
    private readonly sequelize: Sequelize,
    private readonly sazAnnualStatsService: SAZAnnualStatsService,
    private readonly azAnnualStatsService: AZAnnualStatsService,
    private readonly dzongkhagAnnualStatsService: DzongkhagAnnualStatsService,
  ) {}

  /**
   * Find one EA annual stat by ID
   */
  async findOne(id: number): Promise<EAAnnualStatsResponseDto> {
    const stat = await this.eaAnnualStatsRepository.findByPk(id, {
      include: [
        {
          model: EnumerationArea,
          as: 'enumerationArea',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!stat) {
      throw new NotFoundException(`EA Annual Stats with ID ${id} not found`);
    }

    return {
      id: stat.id,
      enumerationAreaId: stat.enumerationAreaId,
      year: stat.year,
      totalHouseholds: stat.totalHouseholds,
      totalMale: stat.totalMale,
      totalFemale: stat.totalFemale,
      totalPopulation: stat.totalMale + stat.totalFemale,
      createdAt: stat.createdAt,
      updatedAt: stat.updatedAt,
      enumerationArea: stat.enumerationArea
        ? {
            id: stat.enumerationArea.id,
            name: stat.enumerationArea.name,
            areaCode: stat.enumerationArea.areaCode,
          }
        : undefined,
    };
  }

  /**
   * Get historical records for a specific Enumeration Area
   * Returns all annual statistics ordered by year ascending
   */
  async getHistoricalRecords(
    enumerationAreaId: number,
  ): Promise<EAAnnualStats[]> {
    const stats = await this.eaAnnualStatsRepository.findAll({
      where: { enumerationAreaId },
      include: [
        {
          model: EnumerationArea,
          as: 'enumerationArea',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
      order: [['year', 'ASC']],
    });

    return stats;
  }

  /**
   * Create or upsert an EA annual stat
   */
  async create(
    createDto: CreateEAAnnualStatsDto,
  ): Promise<EAAnnualStatsResponseDto> {
    // Check if record already exists
    const existing = await this.eaAnnualStatsRepository.findOne({
      where: {
        enumerationAreaId: createDto.enumerationAreaId,
        year: createDto.year,
      },
    });

    let stat: EAAnnualStats;

    if (existing) {
      // Update existing record
      await existing.update(createDto);
      stat = existing;
    } else {
      // Create new record
      stat = await this.eaAnnualStatsRepository.create(createDto);
    }

    return this.findOne(stat.id);
  }

  /**
   * Update an EA annual stat by ID
   */
  async update(
    id: number,
    updateDto: UpdateEAAnnualStatsDto,
  ): Promise<EAAnnualStatsResponseDto> {
    const stat = await this.eaAnnualStatsRepository.findByPk(id);

    if (!stat) {
      throw new NotFoundException(`EA Annual Stats with ID ${id} not found`);
    }

    await stat.update(updateDto);
    return this.findOne(id);
  }

  /**
   * Delete an EA annual stat by ID
   */
  async remove(id: number): Promise<void> {
    const stat = await this.eaAnnualStatsRepository.findByPk(id);

    if (!stat) {
      throw new NotFoundException(`EA Annual Stats with ID ${id} not found`);
    }

    await stat.destroy();
  }

  /**
   * Compute annual statistics for all EAs for the current year
   * This method processes all enumeration areas and computes stats from their latest validated surveys
   *
   * Process:
   * 1. Identify all Enumeration Areas
   * 2. For each EA, find the latest validated survey for current year
   * 3. Aggregate household data from those surveys
   * 4. Upsert results into EAAnnualStats table
   *
   * Runs automatically every 10 minutes via cron job
   */
  async computeCurrentYearStats(): Promise<{
    message: string;
    year: number;
    totalEAs: number;
    recordsProcessed: number;
    recordsWithData: number;
  }> {
    this.logger.log(
      'Starting cron job: Computing current year EA statistics...',
    );
    const startTime = Date.now();

    const currentYear = new Date().getFullYear();

    // Step 1: Get all Enumeration Areas
    const allEAs = await EnumerationArea.findAll({
      attributes: ['id'],
      raw: true,
    });

    const totalEAs = allEAs.length;
    let recordsProcessed = 0;
    let recordsWithData = 0;

    // Step 2 & 3: For each EA, find latest validated survey and aggregate data
    for (const ea of allEAs) {
      // Find the latest validated survey enumeration area for this EA in current year
      const latestSurveyEA = await SurveyEnumerationArea.findOne({
        where: {
          enumerationAreaId: ea.id,
          isValidated: true,
        },
        include: [
          {
            model: Survey,
            as: 'survey',
            where: {
              year: currentYear,
            },
            required: true,
          },
        ],
        order: [
          ['validationDate', 'DESC NULLS LAST'],
          ['updatedAt', 'DESC'],
        ],
        limit: 1,
      });

      let totalHouseholds = 0;
      let totalMale = 0;
      let totalFemale = 0;

      // Step 3: If we found a validated survey, aggregate household data
      if (latestSurveyEA) {
        const householdListings =
          await SurveyEnumerationAreaHouseholdListing.findAll({
            where: {
              surveyEnumerationAreaId: latestSurveyEA.id,
            },
            attributes: ['totalMale', 'totalFemale'],
            raw: true,
          });

        totalHouseholds = householdListings.length;
        totalMale = householdListings.reduce(
          (sum, hl) => sum + (hl.totalMale || 0),
          0,
        );
        totalFemale = householdListings.reduce(
          (sum, hl) => sum + (hl.totalFemale || 0),
          0,
        );

        if (totalHouseholds > 0) {
          recordsWithData++;
        }
      }

      // Step 4: Upsert into EAAnnualStats
      await this.eaAnnualStatsRepository.upsert({
        enumerationAreaId: ea.id,
        year: currentYear,
        totalHouseholds,
        totalMale,
        totalFemale,
      });

      recordsProcessed++;
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `Cron job completed: Processed ${recordsProcessed} EAs (${recordsWithData} with data) in ${executionTime}ms`,
    );

    // Step 5: Aggregate up the hierarchy
    await this.aggregateHierarchyStats(currentYear);

    return {
      message: `Successfully computed annual stats for all EAs for year ${currentYear}`,
      year: currentYear,
      totalEAs,
      recordsProcessed,
      recordsWithData,
    };
  }

  /**
   * Compute annual statistics for all EAs for a specific year
   * This method processes all enumeration areas and computes stats from their latest validated surveys for the given year
   *
   * @param year - The year to compute statistics for
   */
  async computeYearStats(year: number): Promise<{
    message: string;
    year: number;
    totalEAs: number;
    recordsProcessed: number;
    recordsWithData: number;
  }> {
    this.logger.log(
      `Computing EA statistics for year ${year}...`,
    );
    const startTime = Date.now();

    // Step 1: Get all Enumeration Areas
    const allEAs = await EnumerationArea.findAll({
      attributes: ['id'],
      raw: true,
    });

    const totalEAs = allEAs.length;
    let recordsProcessed = 0;
    let recordsWithData = 0;

    // Step 2 & 3: For each EA, find latest validated survey and aggregate data
    for (const ea of allEAs) {
      // Find the latest validated survey enumeration area for this EA in the specified year
      const latestSurveyEA = await SurveyEnumerationArea.findOne({
        where: {
          enumerationAreaId: ea.id,
          isValidated: true,
        },
        include: [
          {
            model: Survey,
            as: 'survey',
            where: {
              year: year,
            },
            required: true,
          },
        ],
        order: [
          ['validationDate', 'DESC NULLS LAST'],
          ['updatedAt', 'DESC'],
        ],
        limit: 1,
      });

      let totalHouseholds = 0;
      let totalMale = 0;
      let totalFemale = 0;

      // Step 3: If we found a validated survey, aggregate household data
      if (latestSurveyEA) {
        const householdListings =
          await SurveyEnumerationAreaHouseholdListing.findAll({
            where: {
              surveyEnumerationAreaId: latestSurveyEA.id,
            },
            attributes: ['totalMale', 'totalFemale'],
            raw: true,
          });

        totalHouseholds = householdListings.length;
        totalMale = householdListings.reduce(
          (sum, hl) => sum + (hl.totalMale || 0),
          0,
        );
        totalFemale = householdListings.reduce(
          (sum, hl) => sum + (hl.totalFemale || 0),
          0,
        );

        if (totalHouseholds > 0) {
          recordsWithData++;
        }
      }

      // Step 4: Upsert into EAAnnualStats
      await this.eaAnnualStatsRepository.upsert({
        enumerationAreaId: ea.id,
        year: year,
        totalHouseholds,
        totalMale,
        totalFemale,
      });

      recordsProcessed++;
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `Completed: Processed ${recordsProcessed} EAs (${recordsWithData} with data) for year ${year} in ${executionTime}ms`,
    );

    // Step 5: Aggregate up the hierarchy
    await this.aggregateHierarchyStats(year);

    return {
      message: `Successfully computed annual stats for all EAs for year ${year}`,
      year: year,
      totalEAs,
      recordsProcessed,
      recordsWithData,
    };
  }

  /**
   * Aggregate statistics up the geographic hierarchy
   * EA -> SAZ -> AZ -> Dzongkhag
   */
  private async aggregateHierarchyStats(year: number): Promise<void> {
    this.logger.log('Aggregating statistics up the hierarchy...');
    const hierarchyStartTime = Date.now();

    // Step 1: Aggregate EA stats to SubAdministrativeZone level
    const sazAggregates = await this.sequelize.query(
      `
      SELECT 
        ea."subAdministrativeZoneId",
        :year as year,
        SUM(eas."totalHouseholds") as "totalHouseholds",
        SUM(eas."totalMale") as "totalMale",
        SUM(eas."totalFemale") as "totalFemale"
      FROM "EAAnnualStats" eas
      JOIN "EnumerationAreas" ea ON eas."enumerationAreaId" = ea.id
      WHERE eas.year = :year
      GROUP BY ea."subAdministrativeZoneId"
      `,
      {
        replacements: { year },
        type: QueryTypes.SELECT,
      },
    );

    for (const sazAggregate of sazAggregates as any[]) {
      await this.sazAnnualStatsService.create({
        subAdministrativeZoneId: sazAggregate.subAdministrativeZoneId,
        year: sazAggregate.year,
        totalHouseholds: parseInt(sazAggregate.totalHouseholds),
        totalMale: parseInt(sazAggregate.totalMale),
        totalFemale: parseInt(sazAggregate.totalFemale),
      });
    }
    this.logger.log(`Aggregated ${sazAggregates.length} SAZ records`);

    // Step 2: Aggregate SAZ stats to AdministrativeZone level
    const azAggregates = await this.sequelize.query(
      `
      SELECT 
        saz."administrativeZoneId",
        :year as year,
        SUM(sazs."totalHouseholds") as "totalHouseholds",
        SUM(sazs."totalMale") as "totalMale",
        SUM(sazs."totalFemale") as "totalFemale"
      FROM "SubAdministrativeZoneAnnualStats" sazs
      JOIN "SubAdministrativeZones" saz ON sazs."subAdministrativeZoneId" = saz.id
      WHERE sazs.year = :year
      GROUP BY saz."administrativeZoneId"
      `,
      {
        replacements: { year },
        type: QueryTypes.SELECT,
      },
    );

    for (const azAggregate of azAggregates as any[]) {
      await this.azAnnualStatsService.create({
        administrativeZoneId: azAggregate.administrativeZoneId,
        year: azAggregate.year,
        totalHouseholds: parseInt(azAggregate.totalHouseholds),
        totalMale: parseInt(azAggregate.totalMale),
        totalFemale: parseInt(azAggregate.totalFemale),
      });
    }
    this.logger.log(`Aggregated ${azAggregates.length} AZ records`);

    // Step 3: Aggregate AZ stats to Dzongkhag level
    const dzongkhagAggregates = await this.sequelize.query(
      `
      SELECT 
        az."dzongkhagId",
        :year as year,
        SUM(azs."totalHouseholds") as "totalHouseholds",
        SUM(azs."totalMale") as "totalMale",
        SUM(azs."totalFemale") as "totalFemale"
      FROM "AdministrativeZoneAnnualStats" azs
      JOIN "AdministrativeZones" az ON azs."administrativeZoneId" = az.id
      WHERE azs.year = :year
      GROUP BY az."dzongkhagId"
      `,
      {
        replacements: { year },
        type: QueryTypes.SELECT,
      },
    );

    for (const dzongkhagAggregate of dzongkhagAggregates as any[]) {
      await this.dzongkhagAnnualStatsService.create({
        dzongkhagId: dzongkhagAggregate.dzongkhagId,
        year: dzongkhagAggregate.year,
        totalHouseholds: parseInt(dzongkhagAggregate.totalHouseholds),
        totalMale: parseInt(dzongkhagAggregate.totalMale),
        totalFemale: parseInt(dzongkhagAggregate.totalFemale),
      });
    }
    this.logger.log(
      `Aggregated ${dzongkhagAggregates.length} Dzongkhag records`,
    );

    const hierarchyExecutionTime = Date.now() - hierarchyStartTime;
    this.logger.log(
      `Hierarchy aggregation completed in ${hierarchyExecutionTime}ms`,
    );
  }
}
