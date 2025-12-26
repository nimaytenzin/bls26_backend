import { Injectable, Inject, NotFoundException, Logger, forwardRef } from '@nestjs/common';
import { DzongkhagAnnualStats } from './entities/dzongkhag-annual-stats.entity';
import { CreateDzongkhagAnnualStatsDto } from './dto/create-dzongkhag-annual-stats.dto';
import { UpdateDzongkhagAnnualStatsDto } from './dto/update-dzongkhag-annual-stats.dto';
import {
  DzongkhagStatsGeoJsonResponse,
  DzongkhagStatsFeature,
  DzongkhagStatsProperties,
} from './dto/dzongkhag-stats-geojson.dto';
import {
  DzongkhagStatsSimplifiedGeoJsonResponse,
  DzongkhagStatsSimplifiedFeature,
  DzongkhagStatsSimplifiedProperties,
} from './dto/dzongkhag-stats-simplified-geojson.dto';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import {
  AdministrativeZone,
  AdministrativeZoneType,
} from '../../location/administrative-zone/entities/administrative-zone.entity';
import {
  SubAdministrativeZone,
  SubAdministrativeZoneType,
} from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { EAAnnualStats } from '../ea-annual-statistics/entities/ea-annual-stats.entity';
import { SAZAnnualStatsService } from '../sub-administrative-zone-annual-statistics/saz-annual-stats.service';
import { AZAnnualStatsService } from '../administrative-zone-annual-statistics/az-annual-stats.service';
import { EAAnnualStatsService } from '../ea-annual-statistics/ea-annual-stats.service';
import { Cron } from '@nestjs/schedule';
import { QueryTypes } from 'sequelize';
import { SurveyEnumerationArea } from '../../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';

@Injectable()
export class DzongkhagAnnualStatsService {
  private readonly logger = new Logger(DzongkhagAnnualStatsService.name);

  constructor(
    @Inject('DZONGKHAG_ANNUAL_STATS_REPOSITORY')
    private readonly dzongkhagAnnualStatsRepository: typeof DzongkhagAnnualStats,
    private readonly sazAnnualStatsService: SAZAnnualStatsService,
    private readonly azAnnualStatsService: AZAnnualStatsService,
    @Inject(forwardRef(() => EAAnnualStatsService))
    private readonly eaAnnualStatsService: EAAnnualStatsService,
  ) {}

  async findAll(year?: number): Promise<DzongkhagAnnualStats[]> {
    const where = year ? { year } : {};
    return this.dzongkhagAnnualStatsRepository.findAll({
      where,
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
      order: [
        ['year', 'DESC'],
        ['dzongkhagId', 'ASC'],
      ],
    });
  }

  async findOne(id: number): Promise<DzongkhagAnnualStats> {
    const stat = await this.dzongkhagAnnualStatsRepository.findByPk(id, {
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (!stat) {
      throw new NotFoundException(
        `Dzongkhag Annual Stats with ID ${id} not found`,
      );
    }

    return stat;
  }

  async getHistoricalRecords(
    dzongkhagId: number,
  ): Promise<DzongkhagAnnualStats[]> {
    return this.dzongkhagAnnualStatsRepository.findAll({
      where: { dzongkhagId },
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
      order: [['year', 'ASC']],
    });
  }

  async create(
    createDto: CreateDzongkhagAnnualStatsDto,
  ): Promise<DzongkhagAnnualStats> {
    const [stat] = await this.dzongkhagAnnualStatsRepository.upsert(createDto);
    return this.findOne(stat.id);
  }

  async update(
    id: number,
    updateDto: UpdateDzongkhagAnnualStatsDto,
  ): Promise<DzongkhagAnnualStats> {
    const stat = await this.findOne(id);
    await stat.update(updateDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const stat = await this.findOne(id);
    await stat.destroy();
  }

  /**
   * Compute annual statistics for all geographic levels using hierarchical aggregation
   * Starting from Dzongkhag level and aggregating down through AZ -> SAZ -> EA
   *
   * This method:
   * 1. Gets all Dzongkhags
   * 2. For each Dzongkhag, gets all Administrative Zones
   * 3. For each AZ, gets all Sub-Administrative Zones
   * 4. For each SAZ, gets all Enumeration Areas
   * 5. For each EA, gets the latest EA annual stats for the given year
   * 6. Aggregates up the hierarchy with urban/rural segregation
   *
   * Urban/Rural determination:
   * - Thromde (urban AZ) -> Lap (urban SAZ) -> Urban EA
   * - Gewog (rural AZ) -> Chiwog (rural SAZ) -> Rural EA
   */
  // @Cron('*/1 * * * *', {
  //   name: 'compute-current-year-stats',
  // })
  async computeCurrentAnnualStatistics(): Promise<{
    message: string;
    year: number;
    dzongkhagCount: number;
    azCount: number;
    sazCount: number;
    eaCount: number;
    totalHouseholds: number;
    urbanHouseholds: number;
    ruralHouseholds: number;
  }> {
    const year = new Date().getFullYear();
    this.logger.log(`Starting hierarchical aggregation for year ${year}...`);
    const startTime = Date.now();

    let dzongkhagCount = 0;
    let azCount = 0;
    let sazCount = 0;
    let eaCount = 0;
    let totalHouseholds = 0;
    let totalUrbanHouseholds = 0;
    let totalRuralHouseholds = 0;

    // Step 1: Pre-fetch all EA survey data in bulk to avoid N+1 queries
    this.logger.log('Pre-fetching all EA survey data...');
    const eaSurveyDataMap = new Map<number, { households: number; male: number; female: number }>();
    
    const bulkSurveyData = await SurveyEnumerationAreaHouseholdListing.sequelize.query(
      `SELECT 
        sea."enumerationAreaId",
        COALESCE(COUNT(hl.id), 0) as households_count,
        COALESCE(SUM(hl."totalMale"), 0) as total_male,
        COALESCE(SUM(hl."totalFemale"), 0) as total_female
      FROM (
        SELECT DISTINCT ON ("enumerationAreaId")
          id,
          "enumerationAreaId"
        FROM "SurveyEnumerationAreas"
        WHERE "isPublished" = true
        ORDER BY "enumerationAreaId", "publishedDate" DESC NULLS LAST
      ) latest_sea
      INNER JOIN "SurveyEnumerationAreas" sea ON latest_sea.id = sea.id
      LEFT JOIN "SurveyEnumerationAreaHouseholdListings" hl ON sea.id = hl."surveyEnumerationAreaId"
      GROUP BY sea."enumerationAreaId"`,
      {
        type: QueryTypes.SELECT,
      },
    ) as Array<{
      enumerationAreaId: number;
      households_count: string;
      total_male: string;
      total_female: string;
    }>;

    for (const row of bulkSurveyData) {
      eaSurveyDataMap.set(row.enumerationAreaId, {
        households: parseInt(row.households_count) || 0,
        male: parseInt(row.total_male) || 0,
        female: parseInt(row.total_female) || 0,
      });
    }
    this.logger.log(`Pre-fetched survey data for ${eaSurveyDataMap.size} EAs`);

    // Step 2: Get all Dzongkhags
    const dzongkhags = await Dzongkhag.findAll();
    this.logger.log(`Processing ${dzongkhags.length} Dzongkhags`);

    // Step 3: Iterate through each Dzongkhag
    for (const dzongkhag of dzongkhags) {
      // Dzongkhag-level accumulators
      let dzTotalHouseholds = 0;
      let dzTotalMale = 0;
      let dzTotalFemale = 0;
      let dzUrbanHouseholds = 0;
      let dzRuralHouseholds = 0;
      let dzUrbanMale = 0;
      let dzRuralMale = 0;
      let dzUrbanFemale = 0;
      let dzRuralFemale = 0;
      let dzEACount = 0;
      let dzUrbanEACount = 0;
      let dzRuralEACount = 0;
      let dzSAZCount = 0;
      let dzUrbanSAZCount = 0;
      let dzRuralSAZCount = 0;
      let dzAZCount = 0;
      let dzUrbanAZCount = 0;
      let dzRuralAZCount = 0;

      // Step 3: Get all Administrative Zones for this Dzongkhag
      const administrativeZones = await AdministrativeZone.findAll({
        where: { dzongkhagId: dzongkhag.id },
      });

      for (const az of administrativeZones) {
        const isUrbanAZ = az.type === AdministrativeZoneType.THROMDE;
        dzAZCount++;
        if (isUrbanAZ) {
          dzUrbanAZCount++;
        } else {
          dzRuralAZCount++;
        }

        // AZ-level accumulators
        let azTotalHouseholds = 0;
        let azTotalMale = 0;
        let azTotalFemale = 0;
        let azEACount = 0;
        let azSAZCount = 0;

        // Step 4: Get all Sub-Administrative Zones for this AZ
        const subAdministrativeZones = await SubAdministrativeZone.findAll({
          where: { administrativeZoneId: az.id },
        });

        for (const saz of subAdministrativeZones) {
          dzSAZCount++;
          azSAZCount++;
          if (isUrbanAZ) {
            dzUrbanSAZCount++;
          } else {
            dzRuralSAZCount++;
          }

          // SAZ-level accumulators
          let sazTotalHouseholds = 0;
          let sazTotalMale = 0;
          let sazTotalFemale = 0;
          let sazEACount = 0;

          // Step 5: Get all Enumeration Areas for this SAZ via junction table
          const enumerationAreas = await EnumerationArea.findAll({
            where: { isActive: true },
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',  // Via junction table
                where: { id: saz.id },
                through: { attributes: [] },
              },
            ],
          });

          for (const ea of enumerationAreas) {
            dzEACount++;
            azEACount++;
            sazEACount++;

            if (isUrbanAZ) {
              dzUrbanEACount++;
            } else {
              dzRuralEACount++;
            }

            // Step 7: Get survey data from pre-fetched map (no database query needed)
            const surveyData = eaSurveyDataMap.get(ea.id) || { households: 0, male: 0, female: 0 };
            const householdsCount = surveyData.households;
            const totalMale = surveyData.male;
            const totalFemale = surveyData.female;

            // Create/Update EA Annual Stats record (always create entry even with zero values)
            await this.eaAnnualStatsService.create({
              enumerationAreaId: ea.id,
              year,
              totalHouseholds: householdsCount,
              totalMale,
              totalFemale,
            });

            // Aggregate to SAZ level if there's data
            if (householdsCount > 0 || totalMale > 0 || totalFemale > 0) {
              eaCount++;
              sazTotalHouseholds += householdsCount;
              sazTotalMale += totalMale;
              sazTotalFemale += totalFemale;
            }
          }

          // Save SAZ annual stats (always create entry even with zero values)
          await this.sazAnnualStatsService.create({
            subAdministrativeZoneId: saz.id,
            year,
            eaCount: sazEACount,
            totalHouseholds: sazTotalHouseholds,
            totalMale: sazTotalMale,
            totalFemale: sazTotalFemale,
          });
          sazCount++;

          // Aggregate to AZ level
          azTotalHouseholds += sazTotalHouseholds;
          azTotalMale += sazTotalMale;
          azTotalFemale += sazTotalFemale;
        }

        // Save AZ annual stats (always create entry even with zero values)
        await this.azAnnualStatsService.create({
          administrativeZoneId: az.id,
          year,
          eaCount: azEACount,
          sazCount: azSAZCount,
          totalHouseholds: azTotalHouseholds,
          totalMale: azTotalMale,
          totalFemale: azTotalFemale,
        });
        azCount++;

        // Aggregate to Dzongkhag level
        dzTotalHouseholds += azTotalHouseholds;
        dzTotalMale += azTotalMale;
        dzTotalFemale += azTotalFemale;

        // Urban/Rural segregation based on AZ type
        if (isUrbanAZ) {
          dzUrbanHouseholds += azTotalHouseholds;
          dzUrbanMale += azTotalMale;
          dzUrbanFemale += azTotalFemale;
        } else {
          dzRuralHouseholds += azTotalHouseholds;
          dzRuralMale += azTotalMale;
          dzRuralFemale += azTotalFemale;
        }
      }

      // Save Dzongkhag annual stats (always create entry even with zero values)
      await this.dzongkhagAnnualStatsRepository.upsert({
        dzongkhagId: dzongkhag.id,
        year,
        eaCount: dzEACount,
        urbanEACount: dzUrbanEACount,
        ruralEACount: dzRuralEACount,
        sazCount: dzSAZCount,
        urbanSAZCount: dzUrbanSAZCount,
        ruralSAZCount: dzRuralSAZCount,
        azCount: dzAZCount,
        urbanAZCount: dzUrbanAZCount,
        ruralAZCount: dzRuralAZCount,
        totalHouseholds: dzTotalHouseholds,
        urbanHouseholdCount: dzUrbanHouseholds,
        ruralHouseholdCount: dzRuralHouseholds,
        totalMale: dzTotalMale,
        urbanMale: dzUrbanMale,
        ruralMale: dzRuralMale,
        totalFemale: dzTotalFemale,
        urbanFemale: dzUrbanFemale,
        ruralFemale: dzRuralFemale,
      });
      dzongkhagCount++;
      // Aggregate overall household totals across all dzongkhags
      totalHouseholds += dzTotalHouseholds;
      totalUrbanHouseholds += dzUrbanHouseholds;
      totalRuralHouseholds += dzRuralHouseholds;
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `Hierarchical aggregation completed in ${executionTime}ms: ` +
        `${dzongkhagCount} Dzongkhags, ${azCount} AZs, ${sazCount} SAZs, ${eaCount} EAs with data, ` +
        `Households: ${totalHouseholds} (Urban: ${totalUrbanHouseholds}, Rural: ${totalRuralHouseholds})`,
    );

    return {
      message: `Successfully computed annual stats for year ${year}. Households: ${totalHouseholds} (Urban: ${totalUrbanHouseholds}, Rural: ${totalRuralHouseholds})`,
      year,
      dzongkhagCount,
      azCount,
      sazCount,
      eaCount,
      totalHouseholds,
      urbanHouseholds: totalUrbanHouseholds,
      ruralHouseholds: totalRuralHouseholds,
    };
  }

  /**
   * Compute annual statistics for all geographic levels for a specific year
   * This is a wrapper that accepts a year parameter instead of using current year
   *
   * @param year - The year to compute statistics for
   */
  async computeAnnualStatisticsForYear(year: number): Promise<{
    message: string;
    year: number;
    dzongkhagCount: number;
    azCount: number;
    sazCount: number;
    eaCount: number;
  }> {
    this.logger.log(`Starting hierarchical aggregation for year ${year}...`);
    const startTime = Date.now();

    let dzongkhagCount = 0;
    let azCount = 0;
    let sazCount = 0;
    let eaCount = 0;

    // Step 1: Pre-fetch all EA survey data in bulk to avoid N+1 queries
    this.logger.log('Pre-fetching all EA survey data...');
    const eaSurveyDataMap = new Map<number, { households: number; male: number; female: number }>();
    
    const bulkSurveyData = await SurveyEnumerationAreaHouseholdListing.sequelize.query(
      `SELECT 
        sea."enumerationAreaId",
        COALESCE(COUNT(hl.id), 0) as households_count,
        COALESCE(SUM(hl."totalMale"), 0) as total_male,
        COALESCE(SUM(hl."totalFemale"), 0) as total_female
      FROM (
        SELECT DISTINCT ON ("enumerationAreaId")
          id,
          "enumerationAreaId"
        FROM "SurveyEnumerationAreas"
        WHERE "isPublished" = true
        ORDER BY "enumerationAreaId", "publishedDate" DESC NULLS LAST
      ) latest_sea
      INNER JOIN "SurveyEnumerationAreas" sea ON latest_sea.id = sea.id
      LEFT JOIN "SurveyEnumerationAreaHouseholdListings" hl ON sea.id = hl."surveyEnumerationAreaId"
      GROUP BY sea."enumerationAreaId"`,
      {
        type: QueryTypes.SELECT,
      },
    ) as Array<{
      enumerationAreaId: number;
      households_count: string;
      total_male: string;
      total_female: string;
    }>;

    for (const row of bulkSurveyData) {
      eaSurveyDataMap.set(row.enumerationAreaId, {
        households: parseInt(row.households_count) || 0,
        male: parseInt(row.total_male) || 0,
        female: parseInt(row.total_female) || 0,
      });
    }
    this.logger.log(`Pre-fetched survey data for ${eaSurveyDataMap.size} EAs`);

    // Step 2: Get all Dzongkhags
    const dzongkhags = await Dzongkhag.findAll();
    this.logger.log(`Processing ${dzongkhags.length} Dzongkhags`);

    // Step 3: Iterate through each Dzongkhag
    for (const dzongkhag of dzongkhags) {
      // Dzongkhag-level accumulators
      let dzTotalHouseholds = 0;
      let dzTotalMale = 0;
      let dzTotalFemale = 0;
      let dzUrbanHouseholds = 0;
      let dzRuralHouseholds = 0;
      let dzUrbanMale = 0;
      let dzRuralMale = 0;
      let dzUrbanFemale = 0;
      let dzRuralFemale = 0;
      let dzEACount = 0;
      let dzUrbanEACount = 0;
      let dzRuralEACount = 0;
      let dzSAZCount = 0;
      let dzUrbanSAZCount = 0;
      let dzRuralSAZCount = 0;
      let dzAZCount = 0;
      let dzUrbanAZCount = 0;
      let dzRuralAZCount = 0;

      // Step 3: Get all Administrative Zones for this Dzongkhag
      const administrativeZones = await AdministrativeZone.findAll({
        where: { dzongkhagId: dzongkhag.id },
      });

      for (const az of administrativeZones) {
        const isUrbanAZ = az.type === AdministrativeZoneType.THROMDE;
        dzAZCount++;

        if (isUrbanAZ) {
          dzUrbanAZCount++;
        } else {
          dzRuralAZCount++;
        }

        // AZ-level accumulators
        let azTotalHouseholds = 0;
        let azTotalMale = 0;
        let azTotalFemale = 0;
        let azEACount = 0;
        let azSAZCount = 0;

        // Step 4: Get all Sub-Administrative Zones for this AZ
        const subAdministrativeZones = await SubAdministrativeZone.findAll({
          where: { administrativeZoneId: az.id },
        });

        for (const saz of subAdministrativeZones) {
          dzSAZCount++;
          azSAZCount++;

          if (isUrbanAZ) {
            dzUrbanSAZCount++;
          } else {
            dzRuralSAZCount++;
          }

          // SAZ-level accumulators
          let sazTotalHouseholds = 0;
          let sazTotalMale = 0;
          let sazTotalFemale = 0;
          let sazEACount = 0;

          // Step 5: Get all Enumeration Areas for this SAZ via junction table
          const enumerationAreas = await EnumerationArea.findAll({
            where: { isActive: true },
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',  // Via junction table
                where: { id: saz.id },
                through: { attributes: [] },
              },
            ],
          });

          for (const ea of enumerationAreas) {
            dzEACount++;
            azEACount++;
            sazEACount++;

            if (isUrbanAZ) {
              dzUrbanEACount++;
            } else {
              dzRuralEACount++;
            }

            // Step 7: Get survey data from pre-fetched map (no database query needed)
            const surveyData = eaSurveyDataMap.get(ea.id) || { households: 0, male: 0, female: 0 };
            const householdsCount = surveyData.households;
            const totalMale = surveyData.male;
            const totalFemale = surveyData.female;

            // Create/Update EA Annual Stats record (always create entry even with zero values)
            await this.eaAnnualStatsService.create({
              enumerationAreaId: ea.id,
              year,
              totalHouseholds: householdsCount,
              totalMale,
              totalFemale,
            });

            // Aggregate to SAZ level if there's data
            if (householdsCount > 0 || totalMale > 0 || totalFemale > 0) {
              eaCount++;
              sazTotalHouseholds += householdsCount;
              sazTotalMale += totalMale;
              sazTotalFemale += totalFemale;
            }
          }

          // Save SAZ annual stats (always create entry even with zero values)
          await this.sazAnnualStatsService.create({
            subAdministrativeZoneId: saz.id,
            year,
            eaCount: sazEACount,
            totalHouseholds: sazTotalHouseholds,
            totalMale: sazTotalMale,
            totalFemale: sazTotalFemale,
          });

          sazCount++;

          // Aggregate to AZ level
          azTotalHouseholds += sazTotalHouseholds;
          azTotalMale += sazTotalMale;
          azTotalFemale += sazTotalFemale;
        }

        // Save AZ annual stats (always create entry even with zero values)
        await this.azAnnualStatsService.create({
          administrativeZoneId: az.id,
          year,
          eaCount: azEACount,
          sazCount: azSAZCount,
          totalHouseholds: azTotalHouseholds,
          totalMale: azTotalMale,
          totalFemale: azTotalFemale,
        });

        azCount++;

        // Aggregate to Dzongkhag level
        dzTotalHouseholds += azTotalHouseholds;
        dzTotalMale += azTotalMale;
        dzTotalFemale += azTotalFemale;

        // Urban/Rural segregation based on AZ type
        if (isUrbanAZ) {
          dzUrbanHouseholds += azTotalHouseholds;
          dzUrbanMale += azTotalMale;
          dzUrbanFemale += azTotalFemale;
        } else {
          dzRuralHouseholds += azTotalHouseholds;
          dzRuralMale += azTotalMale;
          dzRuralFemale += azTotalFemale;
        }
      }

      // Save Dzongkhag annual stats (always create entry even with zero values)
      await this.dzongkhagAnnualStatsRepository.upsert({
        dzongkhagId: dzongkhag.id,
        year,
        eaCount: dzEACount,
        urbanEACount: dzUrbanEACount,
        ruralEACount: dzRuralEACount,
        sazCount: dzSAZCount,
        urbanSAZCount: dzUrbanSAZCount,
        ruralSAZCount: dzRuralSAZCount,
        azCount: dzAZCount,
        urbanAZCount: dzUrbanAZCount,
        ruralAZCount: dzRuralAZCount,
        totalHouseholds: dzTotalHouseholds,
        urbanHouseholdCount: dzUrbanHouseholds,
        ruralHouseholdCount: dzRuralHouseholds,
        totalMale: dzTotalMale,
        urbanMale: dzUrbanMale,
        ruralMale: dzRuralMale,
        totalFemale: dzTotalFemale,
        urbanFemale: dzUrbanFemale,
        ruralFemale: dzRuralFemale,
      });

      dzongkhagCount++;
    }

    const executionTime = Date.now() - startTime;
    this.logger.log(
      `Hierarchical aggregation completed in ${executionTime}ms: ` +
        `${dzongkhagCount} Dzongkhags, ${azCount} AZs, ${sazCount} SAZs, ${eaCount} EAs with data`,
    );

    return {
      message: `Successfully computed annual stats for year ${year}`,
      year,
      dzongkhagCount,
      azCount,
      sazCount,
      eaCount,
    };
  }


  /**
   * Get all Dzongkhags with simplified annual statistics as GeoJSON
   * Returns only essential fields: EA counts, household counts, and population statistics
   *
   * @param year - Statistical year (defaults to current year)
   * @returns Simplified GeoJSON FeatureCollection with essential statistics in properties
   */
  async getDzongkhagStatsSimplifiedAsGeoJson(
    year?: number,
  ): Promise<DzongkhagStatsSimplifiedGeoJsonResponse> {
    const statsYear = year || new Date().getFullYear();
    this.logger.log(
      `Fetching simplified Dzongkhag statistics GeoJSON for year ${statsYear}`,
    );

    // Get all dzongkhags with geometry
    const dzongkhags = await Dzongkhag.findAll({
      attributes: ['id', 'name', 'areaCode', 'geom'],
    });

    // Get all statistics for the specified year
    const allStats = await this.dzongkhagAnnualStatsRepository.findAll({
      where: { year: statsYear },
    });

    // Create a map for quick lookup
    const statsMap = new Map(allStats.map((stat) => [stat.dzongkhagId, stat]));

    // National summary accumulators
    let nationalTotalEA = 0;
    let nationalUrbanEA = 0;
    let nationalRuralEA = 0;
    let nationalTotalHousehold = 0;
    let nationalUrbanHousehold = 0;
    let nationalRuralHousehold = 0;
    let nationalTotalPopulation = 0;
    let nationalUrbanPopulation = 0;
    let nationalRuralPopulation = 0;

    const features: DzongkhagStatsSimplifiedFeature[] = dzongkhags.map(
      (dzongkhag) => {
        const stats = statsMap.get(dzongkhag.id);
        const hasData = !!stats;

        let properties: DzongkhagStatsSimplifiedProperties;

        if (hasData && stats) {
          const totalPopulation = stats.totalMale + stats.totalFemale;
          const urbanPopulation = stats.urbanMale + stats.urbanFemale;
          const ruralPopulation = stats.ruralMale + stats.ruralFemale;

          // Accumulate national statistics
          nationalTotalEA += stats.eaCount;
          nationalUrbanEA += stats.urbanEACount;
          nationalRuralEA += stats.ruralEACount;
          nationalTotalHousehold += stats.totalHouseholds;
          nationalUrbanHousehold += stats.urbanHouseholdCount;
          nationalRuralHousehold += stats.ruralHouseholdCount;
          nationalTotalPopulation += totalPopulation;
          nationalUrbanPopulation += urbanPopulation;
          nationalRuralPopulation += ruralPopulation;

          properties = {
            id: dzongkhag.id,
            name: dzongkhag.name,
            areaCode: dzongkhag.areaCode,
            year: statsYear,
            totalEA: stats.eaCount,
            urbanEA: stats.urbanEACount,
            ruralEA: stats.ruralEACount,
            totalHousehold: stats.totalHouseholds,
            urbanHousehold: stats.urbanHouseholdCount,
            ruralHousehold: stats.ruralHouseholdCount,
            totalPopulation,
            urbanPopulation,
            ruralPopulation,
            hasData: true,
            lastUpdated: stats.updatedAt.toISOString(),
          };
        } else {
          // No statistics available for this year
          properties = {
            id: dzongkhag.id,
            name: dzongkhag.name,
            areaCode: dzongkhag.areaCode,
            year: statsYear,
            totalEA: 0,
            urbanEA: 0,
            ruralEA: 0,
            totalHousehold: 0,
            urbanHousehold: 0,
            ruralHousehold: 0,
            totalPopulation: 0,
            urbanPopulation: 0,
            ruralPopulation: 0,
            hasData: false,
            lastUpdated: new Date().toISOString(),
          };
        }

        return {
          type: 'Feature',
          id: dzongkhag.id,
          geometry: dzongkhag.geom as any,
          properties,
        };
      },
    );

    return {
      type: 'FeatureCollection',
      metadata: {
        year: statsYear,
        totalDzongkhags: dzongkhags.length,
        generatedAt: new Date().toISOString(),
        nationalSummary: {
          totalEA: nationalTotalEA,
          urbanEA: nationalUrbanEA,
          ruralEA: nationalRuralEA,
          totalHousehold: nationalTotalHousehold,
          urbanHousehold: nationalUrbanHousehold,
          ruralHousehold: nationalRuralHousehold,
          totalPopulation: nationalTotalPopulation,
          urbanPopulation: nationalUrbanPopulation,
          ruralPopulation: nationalRuralPopulation,
        },
      },
      features,
    };
  }
}
