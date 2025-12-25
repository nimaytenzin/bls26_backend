import { Injectable, Inject, NotFoundException, Logger, forwardRef } from '@nestjs/common';
import { DzongkhagAnnualStats } from './entities/dzongkhag-annual-stats.entity';
import { CreateDzongkhagAnnualStatsDto } from './dto/create-dzongkhag-annual-stats.dto';
import { UpdateDzongkhagAnnualStatsDto } from './dto/update-dzongkhag-annual-stats.dto';
import {
  DzongkhagStatsGeoJsonResponse,
  DzongkhagStatsFeature,
  DzongkhagStatsProperties,
} from './dto/dzongkhag-stats-geojson.dto';
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

    // Step 1: Get all Dzongkhags
    const dzongkhags = await Dzongkhag.findAll();
    this.logger.log(`Processing ${dzongkhags.length} Dzongkhags`);

    // Step 2: Iterate through each Dzongkhag
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

            // Step 6: Get latest published survey data and create EA Annual Stats
            const latestPublishedSurveyEA = await SurveyEnumerationArea.findOne({
              where: { enumerationAreaId: ea.id, isPublished: true },
              order: [['publishedDate', 'DESC']],
            });

            let householdsCount = 0;
            let totalMale = 0;
            let totalFemale = 0;

            if (latestPublishedSurveyEA) {
              householdsCount =
                (await SurveyEnumerationAreaHouseholdListing.count({
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
              totalMale =
                (await SurveyEnumerationAreaHouseholdListing.sum('totalMale', {
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
              totalFemale =
                (await SurveyEnumerationAreaHouseholdListing.sum('totalFemale', {
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
            }

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

    // Step 1: Get all Dzongkhags
    const dzongkhags = await Dzongkhag.findAll();
    this.logger.log(`Processing ${dzongkhags.length} Dzongkhags`);

    // Step 2: Iterate through each Dzongkhag
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

            // Step 6: Get latest published survey data and create EA Annual Stats
            const latestPublishedSurveyEA = await SurveyEnumerationArea.findOne({
              where: { enumerationAreaId: ea.id, isPublished: true },
              order: [['publishedDate', 'DESC']],
            });

            let householdsCount = 0;
            let totalMale = 0;
            let totalFemale = 0;

            if (latestPublishedSurveyEA) {
              householdsCount =
                (await SurveyEnumerationAreaHouseholdListing.count({
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
              totalMale =
                (await SurveyEnumerationAreaHouseholdListing.sum('totalMale', {
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
              totalFemale =
                (await SurveyEnumerationAreaHouseholdListing.sum('totalFemale', {
                  where: { surveyEnumerationAreaId: latestPublishedSurveyEA.id },
                })) || 0;
            }

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
   * Get all Dzongkhags with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic/household statistics
   *
   * @param year - Statistical year (defaults to current year)
   * @returns GeoJSON FeatureCollection with statistics in properties
   */
  async getDzongkhagStatsAsGeoJson(
    year?: number,
  ): Promise<DzongkhagStatsGeoJsonResponse> {
    const statsYear = year || new Date().getFullYear();
    this.logger.log(
      `Fetching Dzongkhag statistics GeoJSON for year ${statsYear}`,
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
    let nationalTotalPopulation = 0;
    let nationalTotalHouseholds = 0;
    let nationalUrbanPopulation = 0;
    let nationalRuralPopulation = 0;
    let urbanizationRateSum = 0;
    let dzongkhagsWithData = 0;

    const features: DzongkhagStatsFeature[] = dzongkhags.map((dzongkhag) => {
      const stats = statsMap.get(dzongkhag.id);
      const hasData = !!stats;

      let properties: DzongkhagStatsProperties;

      if (hasData && stats) {
        const totalPopulation = stats.totalMale + stats.totalFemale;
        const urbanPopulation = stats.urbanMale + stats.urbanFemale;
        const ruralPopulation = stats.ruralMale + stats.ruralFemale;
        const urbanizationRate =
          totalPopulation > 0 ? (urbanPopulation / totalPopulation) * 100 : 0;
        const averageHouseholdSize =
          stats.totalHouseholds > 0
            ? totalPopulation / stats.totalHouseholds
            : 0;
        const genderRatio =
          stats.totalFemale > 0
            ? (stats.totalMale / stats.totalFemale) * 100
            : 0;
        const urbanGenderRatio =
          stats.urbanFemale > 0
            ? (stats.urbanMale / stats.urbanFemale) * 100
            : 0;
        const ruralGenderRatio =
          stats.ruralFemale > 0
            ? (stats.ruralMale / stats.ruralFemale) * 100
            : 0;
        const urbanHouseholdPercentage =
          stats.totalHouseholds > 0
            ? (stats.urbanHouseholdCount / stats.totalHouseholds) * 100
            : 0;
        const ruralHouseholdPercentage =
          stats.totalHouseholds > 0
            ? (stats.ruralHouseholdCount / stats.totalHouseholds) * 100
            : 0;

        // Accumulate national statistics
        nationalTotalPopulation += totalPopulation;
        nationalTotalHouseholds += stats.totalHouseholds;
        nationalUrbanPopulation += urbanPopulation;
        nationalRuralPopulation += ruralPopulation;
        urbanizationRateSum += urbanizationRate;
        dzongkhagsWithData++;

        properties = {
          id: dzongkhag.id,
          name: dzongkhag.name,
          areaCode: dzongkhag.areaCode,
          year: statsYear,
          azCount: stats.azCount,
          urbanAZCount: stats.urbanAZCount,
          ruralAZCount: stats.ruralAZCount,
          sazCount: stats.sazCount,
          urbanSAZCount: stats.urbanSAZCount,
          ruralSAZCount: stats.ruralSAZCount,
          eaCount: stats.eaCount,
          urbanEACount: stats.urbanEACount,
          ruralEACount: stats.ruralEACount,
          totalHouseholds: stats.totalHouseholds,
          urbanHouseholdCount: stats.urbanHouseholdCount,
          ruralHouseholdCount: stats.ruralHouseholdCount,
          urbanHouseholdPercentage:
            Math.round(urbanHouseholdPercentage * 100) / 100,
          ruralHouseholdPercentage:
            Math.round(ruralHouseholdPercentage * 100) / 100,
          totalPopulation,
          totalMale: stats.totalMale,
          totalFemale: stats.totalFemale,
          urbanPopulation,
          urbanMale: stats.urbanMale,
          urbanFemale: stats.urbanFemale,
          ruralPopulation,
          ruralMale: stats.ruralMale,
          ruralFemale: stats.ruralFemale,
          urbanizationRate: Math.round(urbanizationRate * 100) / 100,
          averageHouseholdSize: Math.round(averageHouseholdSize * 100) / 100,
          genderRatio: Math.round(genderRatio * 100) / 100,
          urbanGenderRatio: Math.round(urbanGenderRatio * 100) / 100,
          ruralGenderRatio: Math.round(ruralGenderRatio * 100) / 100,
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
          azCount: 0,
          urbanAZCount: 0,
          ruralAZCount: 0,
          sazCount: 0,
          urbanSAZCount: 0,
          ruralSAZCount: 0,
          eaCount: 0,
          urbanEACount: 0,
          ruralEACount: 0,
          totalHouseholds: 0,
          urbanHouseholdCount: 0,
          ruralHouseholdCount: 0,
          urbanHouseholdPercentage: 0,
          ruralHouseholdPercentage: 0,
          totalPopulation: 0,
          totalMale: 0,
          totalFemale: 0,
          urbanPopulation: 0,
          urbanMale: 0,
          urbanFemale: 0,
          ruralPopulation: 0,
          ruralMale: 0,
          ruralFemale: 0,
          urbanizationRate: 0,
          averageHouseholdSize: 0,
          genderRatio: 0,
          urbanGenderRatio: 0,
          ruralGenderRatio: 0,
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
    });

    const nationalUrbanizationRate =
      nationalTotalPopulation > 0
        ? (nationalUrbanPopulation / nationalTotalPopulation) * 100
        : 0;
    const averageUrbanizationRate =
      dzongkhagsWithData > 0 ? urbanizationRateSum / dzongkhagsWithData : 0;

    return {
      type: 'FeatureCollection',
      metadata: {
        year: statsYear,
        totalDzongkhags: dzongkhags.length,
        generatedAt: new Date().toISOString(),
        nationalSummary: {
          totalPopulation: nationalTotalPopulation,
          totalHouseholds: nationalTotalHouseholds,
          urbanPopulation: nationalUrbanPopulation,
          ruralPopulation: nationalRuralPopulation,
          nationalUrbanizationRate:
            Math.round(nationalUrbanizationRate * 100) / 100,
          averageUrbanizationRate:
            Math.round(averageUrbanizationRate * 100) / 100,
        },
      },
      features,
    };
  }
}
