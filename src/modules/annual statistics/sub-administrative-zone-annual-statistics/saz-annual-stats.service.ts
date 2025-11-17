import { Injectable, Inject, NotFoundException, Logger } from '@nestjs/common';
import { SAZAnnualStats } from './entities/saz-annual-stats.entity';
import { CreateSAZAnnualStatsDto } from './dto/create-saz-annual-stats.dto';
import { UpdateSAZAnnualStatsDto } from './dto/update-saz-annual-stats.dto';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import {
  SAZByAdministrativeZoneGeoJsonResponse,
  SAZByDzongkhagGeoJsonResponse,
  SAZStatsFeature,
  SAZStatsProperties,
  AdministrativeZoneSAZSummary,
  DzongkhagSAZSummary,
} from './dto/saz-stats-geojson.dto';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class SAZAnnualStatsService {
  private readonly logger = new Logger(SAZAnnualStatsService.name);

  constructor(
    @Inject('SAZ_ANNUAL_STATS_REPOSITORY')
    private readonly sazAnnualStatsRepository: typeof SAZAnnualStats,
  ) {}

  async findAll(year?: number): Promise<SAZAnnualStats[]> {
    const where = year ? { year } : {};
    return this.sazAnnualStatsRepository.findAll({
      where,
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
      order: [
        ['year', 'DESC'],
        ['subAdministrativeZoneId', 'ASC'],
      ],
    });
  }

  async findOne(id: number): Promise<SAZAnnualStats> {
    const stat = await this.sazAnnualStatsRepository.findByPk(id, {
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
    });

    if (!stat) {
      throw new NotFoundException(`SAZ Annual Stats with ID ${id} not found`);
    }

    return stat;
  }

  async getHistoricalRecords(
    subAdministrativeZoneId: number,
  ): Promise<SAZAnnualStats[]> {
    return this.sazAnnualStatsRepository.findAll({
      where: { subAdministrativeZoneId },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZone',
          attributes: ['id', 'name', 'areaCode', 'type'],
        },
      ],
      order: [['year', 'ASC']],
    });
  }

  async create(createDto: CreateSAZAnnualStatsDto): Promise<SAZAnnualStats> {
    const [stat] = await this.sazAnnualStatsRepository.upsert(createDto);
    return this.findOne(stat.id);
  }

  async update(
    id: number,
    updateDto: UpdateSAZAnnualStatsDto,
  ): Promise<SAZAnnualStats> {
    const stat = await this.findOne(id);
    await stat.update(updateDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const stat = await this.findOne(id);
    await stat.destroy();
  }

  /**
   * Get all SAZs for a specific Administrative Zone with annual statistics as GeoJSON
   * @param administrativeZoneId - ID of the Administrative Zone to filter by
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  async getCurrentSAZStatsByAdministrativeZoneAsGeoJson(
    administrativeZoneId: number,
  ): Promise<SAZByAdministrativeZoneGeoJsonResponse> {
    const statsYear = new Date().getFullYear();

    // Fetch all SAZs for the specified Administrative Zone with geometry
    const subAdministrativeZones = await SubAdministrativeZone.findAll({
      where: { administrativeZoneId },
      attributes: [
        'id',
        'name',
        'areaCode',
        'type',
        'areaSqKm',
        'administrativeZoneId',
        [
          Sequelize.fn(
            'ST_AsGeoJSON',
            Sequelize.col('SubAdministrativeZone.geom'),
          ),
          'geomGeoJSON',
        ],
      ],
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          attributes: ['id', 'name', 'type', 'dzongkhagId'],
          include: [
            {
              model: Dzongkhag,
              as: 'dzongkhag',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      raw: false,
    });

    if (subAdministrativeZones.length === 0) {
      throw new NotFoundException(
        `No Sub-Administrative Zones found for Administrative Zone ID ${administrativeZoneId}`,
      );
    }

    // Get parent information
    const firstSAZ = subAdministrativeZones[0] as any;
    const administrativeZoneName =
      firstSAZ.administrativeZone?.name || 'Unknown';
    const administrativeZoneType = firstSAZ.administrativeZone?.type || 'Gewog';
    const dzongkhagId = firstSAZ.administrativeZone?.dzongkhagId || 0;
    const dzongkhagName =
      firstSAZ.administrativeZone?.dzongkhag?.name || 'Unknown';

    // Fetch annual statistics for all SAZs
    const sazIds = subAdministrativeZones.map((saz) => saz.id);
    const annualStats = await this.sazAnnualStatsRepository.findAll({
      where: {
        subAdministrativeZoneId: sazIds,
        year: statsYear,
      },
    });

    // Create stats map
    const statsMap = new Map<number, SAZAnnualStats>();
    annualStats.forEach((stat) => {
      statsMap.set(stat.subAdministrativeZoneId, stat);
    });

    // Initialize summary
    let totalPopulation = 0;
    let totalHouseholds = 0;
    let totalEAs = 0;
    let totalMale = 0;
    let totalFemale = 0;

    // Build GeoJSON features
    const features: SAZStatsFeature[] = subAdministrativeZones.map((saz) => {
      const stats = statsMap.get(saz.id);
      const hasData = !!stats;

      const geomData = (saz as any).dataValues.geomGeoJSON;
      const geometry = geomData ? JSON.parse(geomData) : null;

      const male = stats?.totalMale || 0;
      const female = stats?.totalFemale || 0;
      const population = male + female;
      const households = stats?.totalHouseholds || 0;
      const eaCount = stats?.eaCount || 0;

      // Calculate metrics
      const populationDensity =
        saz.areaSqKm > 0 ? population / saz.areaSqKm : 0;
      const averageHouseholdSize = households > 0 ? population / households : 0;
      const genderRatio = female > 0 ? (male / female) * 100 : 0;
      const malePercentage = population > 0 ? (male / population) * 100 : 0;
      const femalePercentage = population > 0 ? (female / population) * 100 : 0;

      // Accumulate summary
      totalPopulation += population;
      totalHouseholds += households;
      totalEAs += eaCount;
      totalMale += male;
      totalFemale += female;

      const properties: SAZStatsProperties = {
        id: saz.id,
        name: saz.name,
        areaCode: saz.areaCode,
        type: saz.type,
        areaSqKm: saz.areaSqKm,
        administrativeZoneId,
        administrativeZoneName,
        administrativeZoneType,
        dzongkhagId,
        dzongkhagName,
        year: statsYear,
        eaCount,
        totalHouseholds: households,
        totalPopulation: population,
        totalMale: male,
        totalFemale: female,
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

      return {
        type: 'Feature',
        id: saz.id,
        geometry,
        properties,
      };
    });

    // Build summary
    const summary: AdministrativeZoneSAZSummary = {
      administrativeZoneId,
      administrativeZoneName,
      administrativeZoneType,
      dzongkhagId,
      dzongkhagName,
      year: statsYear,
      totalSAZs: subAdministrativeZones.length,
      totalEAs,
      totalPopulation,
      totalHouseholds,
      totalMale,
      totalFemale,
    };

    return {
      type: 'FeatureCollection',
      metadata: {
        year: statsYear,
        administrativeZoneId,
        administrativeZoneName,
        administrativeZoneType,
        dzongkhagId,
        dzongkhagName,
        generatedAt: new Date().toISOString(),
        summary,
      },
      features,
    };
  }

  /**
   * Get all SAZs for a specific Dzongkhag with annual statistics as GeoJSON
   * @param dzongkhagId - ID of the Dzongkhag to filter by
   * @returns GeoJSON FeatureCollection with statistics embedded in properties
   */
  async getCurrentSAZStatsByDzongkhagAsGeoJson(
    dzongkhagId: number,
  ): Promise<SAZByDzongkhagGeoJsonResponse> {
    const statsYear = new Date().getFullYear();

    // Fetch all SAZs for the specified Dzongkhag (through AZ)
    const subAdministrativeZones = await SubAdministrativeZone.findAll({
      attributes: [
        'id',
        'name',
        'areaCode',
        'type',
        'areaSqKm',
        'administrativeZoneId',
        [
          Sequelize.fn(
            'ST_AsGeoJSON',
            Sequelize.col('SubAdministrativeZone.geom'),
          ),
          'geomGeoJSON',
        ],
      ],
      include: [
        {
          model: AdministrativeZone,
          as: 'administrativeZone',
          where: { dzongkhagId },
          attributes: ['id', 'name', 'type', 'dzongkhagId'],
          include: [
            {
              model: Dzongkhag,
              as: 'dzongkhag',
              attributes: ['id', 'name'],
            },
          ],
        },
      ],
      raw: false,
    });

    if (subAdministrativeZones.length === 0) {
      throw new NotFoundException(
        `No Sub-Administrative Zones found for Dzongkhag ID ${dzongkhagId}`,
      );
    }

    // Get Dzongkhag name
    const firstSAZ = subAdministrativeZones[0] as any;
    const dzongkhagName =
      firstSAZ.administrativeZone?.dzongkhag?.name || 'Unknown';

    // Fetch annual statistics
    const sazIds = subAdministrativeZones.map((saz) => saz.id);
    const annualStats = await this.sazAnnualStatsRepository.findAll({
      where: {
        subAdministrativeZoneId: sazIds,
        year: statsYear,
      },
    });

    // Create stats map
    const statsMap = new Map<number, SAZAnnualStats>();
    annualStats.forEach((stat) => {
      statsMap.set(stat.subAdministrativeZoneId, stat);
    });

    // Track AZs for summary
    const azSet = new Set<number>();
    const thromdeSet = new Set<number>();
    const gewogSet = new Set<number>();

    // Initialize summary
    let totalPopulation = 0;
    let urbanPopulation = 0; // Laps
    let ruralPopulation = 0; // Chiwogs
    let totalHouseholds = 0;
    let urbanHouseholds = 0;
    let ruralHouseholds = 0;
    let totalEAs = 0;
    let urbanSAZCount = 0;
    let ruralSAZCount = 0;

    // Build GeoJSON features
    const features: SAZStatsFeature[] = subAdministrativeZones.map((saz) => {
      const stats = statsMap.get(saz.id);
      const hasData = !!stats;

      const geomData = (saz as any).dataValues.geomGeoJSON;
      const geometry = geomData ? JSON.parse(geomData) : null;

      const azData = (saz as any).administrativeZone;
      const administrativeZoneId = azData?.id || 0;
      const administrativeZoneName = azData?.name || 'Unknown';
      const administrativeZoneType = azData?.type || 'Gewog';

      // Track unique AZs
      azSet.add(administrativeZoneId);
      if (administrativeZoneType === 'Thromde') {
        thromdeSet.add(administrativeZoneId);
      } else {
        gewogSet.add(administrativeZoneId);
      }

      const male = stats?.totalMale || 0;
      const female = stats?.totalFemale || 0;
      const population = male + female;
      const households = stats?.totalHouseholds || 0;
      const eaCount = stats?.eaCount || 0;

      // Calculate metrics
      const populationDensity =
        saz.areaSqKm > 0 ? population / saz.areaSqKm : 0;
      const averageHouseholdSize = households > 0 ? population / households : 0;
      const genderRatio = female > 0 ? (male / female) * 100 : 0;
      const malePercentage = population > 0 ? (male / population) * 100 : 0;
      const femalePercentage = population > 0 ? (female / population) * 100 : 0;

      // Accumulate summary
      totalPopulation += population;
      totalHouseholds += households;
      totalEAs += eaCount;

      if (saz.type === 'lap') {
        urbanSAZCount++;
        urbanPopulation += population;
        urbanHouseholds += households;
      } else {
        ruralSAZCount++;
        ruralPopulation += population;
        ruralHouseholds += households;
      }

      const properties: SAZStatsProperties = {
        id: saz.id,
        name: saz.name,
        areaCode: saz.areaCode,
        type: saz.type,
        areaSqKm: saz.areaSqKm,
        administrativeZoneId,
        administrativeZoneName,
        administrativeZoneType,
        dzongkhagId,
        dzongkhagName,
        year: statsYear,
        eaCount,
        totalHouseholds: households,
        totalPopulation: population,
        totalMale: male,
        totalFemale: female,
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

      return {
        type: 'Feature',
        id: saz.id,
        geometry,
        properties,
      };
    });

    // Calculate urbanization rate
    const urbanizationRate =
      totalPopulation > 0 ? (urbanPopulation / totalPopulation) * 100 : 0;

    // Build summary
    const summary: DzongkhagSAZSummary = {
      dzongkhagId,
      dzongkhagName,
      year: statsYear,
      totalAZs: azSet.size,
      thromdeCount: thromdeSet.size,
      gewogCount: gewogSet.size,
      totalSAZs: subAdministrativeZones.length,
      urbanSAZCount,
      ruralSAZCount,
      totalEAs,
      totalPopulation,
      urbanPopulation,
      ruralPopulation,
      totalHouseholds,
      urbanHouseholds,
      ruralHouseholds,
      urbanizationRate: Math.round(urbanizationRate * 100) / 100,
    };

    return {
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
  }
}
