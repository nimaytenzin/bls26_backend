import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { AZAnnualStats } from './entities/az-annual-stats.entity';
import { CreateAZAnnualStatsDto } from './dto/create-az-annual-stats.dto';
import { UpdateAZAnnualStatsDto } from './dto/update-az-annual-stats.dto';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import {
  AZByDzongkhagGeoJsonResponse,
  AZStatsFeature,
  AZStatsProperties,
  DzongkhagAZSummary,
} from './dto/az-stats-geojson.dto';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class AZAnnualStatsService {
  private readonly logger = new Logger(AZAnnualStatsService.name);

  constructor(
    @Inject('AZ_ANNUAL_STATS_REPOSITORY')
    private readonly azAnnualStatsRepository: typeof AZAnnualStats,
  ) {}

  async findAll(year?: number): Promise<AZAnnualStats[]> {
    const where = year ? { year } : {};
    return this.azAnnualStatsRepository.findAll({
      where,
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
      order: [
        ['year', 'DESC'],
        ['administrativeZoneId', 'ASC'],
      ],
    });
  }

  async findOne(id: number): Promise<AZAnnualStats> {
    const stat = await this.azAnnualStatsRepository.findByPk(id, {
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
    });

    if (!stat) {
      throw new NotFoundException(`AZ Annual Stats with ID ${id} not found`);
    }

    return stat;
  }

  async getHistoricalRecords(
    administrativeZoneId: number,
  ): Promise<AZAnnualStats[]> {
    return this.azAnnualStatsRepository.findAll({
      where: { administrativeZoneId },
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
      order: [['year', 'ASC']],
    });
  }

  async create(createDto: CreateAZAnnualStatsDto): Promise<AZAnnualStats> {
    const [stat] = await this.azAnnualStatsRepository.upsert(createDto);
    return this.findOne(stat.id);
  }

  async update(
    id: number,
    updateDto: UpdateAZAnnualStatsDto,
  ): Promise<AZAnnualStats> {
    const stat = await this.findOne(id);
    await stat.update(updateDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const stat = await this.findOne(id);
    await stat.destroy();
  }

  /**
   * Get all Administrative Zones for a specific Dzongkhag with annual statistics as GeoJSON
   * Combines geographic boundaries with demographic statistics
   * Includes summary statistics for the entire Dzongkhag
   *
   * @param dzongkhagId - ID of the Dzongkhag to filter by
   * @param year - Statistical year (defaults to current year)
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  async getCurrentAZStatsByDzongkhagAsGeoJson(
    dzongkhagId: number,
  ): Promise<AZByDzongkhagGeoJsonResponse> {
    const statsYear = new Date().getFullYear();

    // Fetch all Administrative Zones for the specified Dzongkhag with geometry
    const administrativeZones = await AdministrativeZone.findAll({
      where: { dzongkhagId },
      attributes: [
        'id',
        'name',
        'areaCode',
        'type',
        'areaSqKm',
        'dzongkhagId',
        [
          Sequelize.fn(
            'ST_AsGeoJSON',
            Sequelize.col('AdministrativeZone.geom'),
          ),
          'geomGeoJSON',
        ],
      ],
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhag',
          attributes: ['id', 'name'],
        },
      ],
      raw: false,
    });

    if (administrativeZones.length === 0) {
      throw new NotFoundException(
        `No Administrative Zones found for Dzongkhag ID ${dzongkhagId}`,
      );
    }

    // Get the Dzongkhag name from the first AZ
    const dzongkhagName =
      (administrativeZones[0] as any).dzongkhag?.name || 'Unknown';

    // Fetch annual statistics for all AZs in this Dzongkhag for the specified year
    const azIds = administrativeZones.map((az) => az.id);
    const annualStats = await this.azAnnualStatsRepository.findAll({
      where: {
        administrativeZoneId: azIds,
        year: statsYear,
      },
    });

    // Create a map for quick lookup: azId -> stats
    const statsMap = new Map<number, AZAnnualStats>();
    annualStats.forEach((stat) => {
      statsMap.set(stat.administrativeZoneId, stat);
    });

    // Initialize summary statistics
    let totalPopulation = 0;
    let urbanPopulation = 0; // Thromde population
    let ruralPopulation = 0; // Gewog population
    let totalHouseholds = 0;
    let urbanHouseholds = 0;
    let ruralHouseholds = 0;
    let totalSAZs = 0;
    let totalEAs = 0;
    let thromdeCount = 0;
    let gewogCount = 0;

    // Build GeoJSON features
    const features: AZStatsFeature[] = administrativeZones.map((az) => {
      const stats = statsMap.get(az.id);
      const hasData = !!stats;

      // Extract geometry from geomGeoJSON
      const geomData = (az as any).dataValues.geomGeoJSON;
      const geometry = geomData ? JSON.parse(geomData) : null;

      const totalMale = stats?.totalMale || 0;
      const totalFemale = stats?.totalFemale || 0;
      const population = totalMale + totalFemale;
      const households = stats?.totalHouseholds || 0;
      const sazCount = stats?.sazCount || 0;
      const eaCount = stats?.eaCount || 0;

      // Calculate metrics
      const populationDensity = az.areaSqKm > 0 ? population / az.areaSqKm : 0;
      const averageHouseholdSize = households > 0 ? population / households : 0;
      const genderRatio = totalFemale > 0 ? (totalMale / totalFemale) * 100 : 0;
      const malePercentage =
        population > 0 ? (totalMale / population) * 100 : 0;
      const femalePercentage =
        population > 0 ? (totalFemale / population) * 100 : 0;

      // Accumulate summary statistics
      totalPopulation += population;
      totalHouseholds += households;
      totalSAZs += sazCount;
      totalEAs += eaCount;

      if (az.type === 'Thromde') {
        thromdeCount++;
        urbanPopulation += population;
        urbanHouseholds += households;
      } else {
        gewogCount++;
        ruralPopulation += population;
        ruralHouseholds += households;
      }

      const properties: AZStatsProperties = {
        id: az.id,
        name: az.name,
        areaCode: az.areaCode,
        type: az.type,
        areaSqKm: az.areaSqKm,
        dzongkhagId: az.dzongkhagId,
        dzongkhagName,
        year: statsYear,
        sazCount,
        eaCount,
        totalHouseholds: households,
        totalPopulation: population,
        totalMale,
        totalFemale,
        populationDensity: Math.round(populationDensity * 100) / 100,
        averageHouseholdSize: Math.round(averageHouseholdSize * 100) / 100,
        genderRatio: Math.round(genderRatio * 100) / 100,
        malePercentage: Math.round(malePercentage * 100) / 100,
        femalePercentage: Math.round(femalePercentage * 100) / 100,
        hasData,
        lastUpdated: stats?.updatedAt
          ? stats.updatedAt.toISOString()
          : new Date().toISOString(),
      };

      const feature: AZStatsFeature = {
        type: 'Feature',
        id: az.id,
        geometry,
        properties,
      };

      return feature;
    });

    // Calculate urbanization rate
    const urbanizationRate =
      totalPopulation > 0 ? (urbanPopulation / totalPopulation) * 100 : 0;

    // Build Dzongkhag summary
    const summary: DzongkhagAZSummary = {
      dzongkhagId,
      dzongkhagName,
      year: statsYear,
      totalAZs: administrativeZones.length,
      thromdeCount,
      gewogCount,
      totalPopulation,
      urbanPopulation,
      ruralPopulation,
      totalHouseholds,
      urbanHouseholds,
      ruralHouseholds,
      totalSAZs,
      totalEAs,
      urbanizationRate: Math.round(urbanizationRate * 100) / 100,
    };

    // Build response
    const response: AZByDzongkhagGeoJsonResponse = {
      type: 'FeatureCollection',
      metadata: {
        year: statsYear,
        dzongkhagId,
        dzongkhagName,
        generatedAt: new Date().toISOString(),
        summary,
      },
      features,
    };

    return response;
  }
}
