import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { SurveySamplingConfig, SamplingMethod } from './entities/survey-sampling-config.entity';
import { UpdateSurveySamplingConfigDto } from './dto/update-survey-sampling-config.dto';
import { Survey } from '../survey/survey/entities/survey.entity';
import { RunEnumerationAreaSamplingDto } from './dto/run-enumeration-area-sampling.dto';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationAreaSampling } from './entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from './entities/survey-enumeration-area-household-sample.entity';
import { EnumerationArea } from '../location/enumeration-area/entities/enumeration-area.entity';
import { RunSamplingResponseDto } from './dto/run-sampling-response.dto';
import { SubAdministrativeZone } from '../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import {
  AdministrativeZone,
  AdministrativeZoneType,
} from '../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { SamplingEnumerationHierarchyDto } from './dto/sampling-enumeration-hierarchy-response.dto';

interface SamplingResult {
  indices: number[];
  metadata: Record<string, any>;
  samplingInterval?: number;
  randomStart?: number;
  wrapAroundCount?: number;
}

@Injectable()
export class SamplingService {
  constructor(
    @Inject('SURVEY_SAMPLING_CONFIG_REPOSITORY')
    private readonly surveySamplingConfigRepository: typeof SurveySamplingConfig,
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_EA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_EA_SAMPLING_REPOSITORY')
    private readonly surveyEnumerationAreaSamplingRepository: typeof SurveyEnumerationAreaSampling,
    @Inject('SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY')
    private readonly householdSampleRepository: typeof SurveyEnumerationAreaHouseholdSample,
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
  ) {}

  async getSurveySamplingConfig(surveyId: number) {
    await this.ensureSurveyExists(surveyId);
    return this.surveySamplingConfigRepository.findOne({ where: { surveyId } });
  }

  async upsertSurveySamplingConfig(
    surveyId: number,
    dto: UpdateSurveySamplingConfigDto,
    userId?: number,
  ) {
    await this.ensureSurveyExists(surveyId);
    const existing = await this.surveySamplingConfigRepository.findOne({
      where: { surveyId },
    });

    if (existing) {
      await existing.update({
        ...dto,
        updatedBy: userId ?? existing.updatedBy,
      });
      return existing;
    }

    return this.surveySamplingConfigRepository.create({
      surveyId,
      ...dto,
      createdBy: userId,
      updatedBy: userId,
    });
  }

  async runSamplingForEnumerationArea(
    surveyId: number,
    surveyEnumerationAreaId: number,
    dto: RunEnumerationAreaSamplingDto,
    userId?: number,
  ) {
    await this.ensureSurveyExists(surveyId);

    const surveyEnumerationArea =
      await this.surveyEnumerationAreaRepository.findOne({
        where: { id: surveyEnumerationAreaId, surveyId },
        include: [
          {
            model: EnumerationArea,
            include: [
              {
                model: SubAdministrativeZone,
                include: [AdministrativeZone],
              },
            ],
          },
        ],
      });

    if (!surveyEnumerationArea) {
      throw new NotFoundException(
        'Survey enumeration area not found for this survey',
      );
    }

    // Check that enumeration is completed before sampling
    if (!surveyEnumerationArea.isEnumerated) {
      throw new BadRequestException(
        'Enumeration area must be enumerated before sampling can be performed',
      );
    }

    const households = await this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId },
      order: [
        ['householdSerialNumber', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    if (!households.length) {
      throw new BadRequestException(
        'No household listings found for this enumeration area',
      );
    }

    const config = await this.surveySamplingConfigRepository.findOne({
      where: { surveyId },
    });

    const populationSize = households.length;
    const method =
      dto.method || config?.defaultMethod || SamplingMethod.CSS;

    const sampleSize = this.determineSampleSize({
      overrideSampleSize: dto.sampleSize,
      config,
      enumerationArea: surveyEnumerationArea.enumerationArea,
      populationSize,
    });

    const existingSampling =
      await this.surveyEnumerationAreaSamplingRepository.findOne({
        where: { surveyEnumerationAreaId },
      });

    if (existingSampling && !dto.overwriteExisting) {
      throw new BadRequestException(
        'Sampling already exists for this enumeration area. Set overwriteExisting to true to re-run.',
      );
    }

    // If overwrite is requested, delete existing sample households and sampling record
    if (existingSampling && dto.overwriteExisting) {
      // Delete all household samples associated with this sampling
      await this.householdSampleRepository.destroy({
        where: { surveyEnumerationAreaSamplingId: existingSampling.id },
      });
      // Delete the sampling record itself
      await existingSampling.destroy();
    }

    const isFullSelection = populationSize <= sampleSize;
    let samplingResult: SamplingResult | null = null;

    if (!isFullSelection) {
      if (method === SamplingMethod.CSS) {
        samplingResult = this.runCssSampling({
          populationSize,
          sampleSize,
          randomStart: dto.randomStart,
        });
      } else {
        samplingResult = this.runSrsSampling({
          populationSize,
          sampleSize,
        });
      }
    }

    const indices = isFullSelection
      ? households.map((_, index) => index + 1)
      : samplingResult?.indices || [];

    const selectedHouseholds = indices.map((index) => {
      const household = households[index - 1];
      if (!household) {
        throw new BadRequestException(
          `Calculated index ${index} is out of bounds`,
        );
      }
      return household;
    });

    const samplingRecord =
      await this.surveyEnumerationAreaSamplingRepository.create({
        surveyId,
        surveyEnumerationAreaId,
        method,
        sampleSize,
        populationSize,
        samplingInterval: samplingResult?.samplingInterval ?? null,
        randomStart: samplingResult?.randomStart ?? null,
        wrapAroundCount: samplingResult?.wrapAroundCount ?? 0,
        selectedIndices: indices,
        metadata: samplingResult?.metadata ?? {
          isFullSelection,
        },
        isFullSelection,
        executedBy: userId ?? null,
        executedAt: new Date(),
      });

    const sampleRows = selectedHouseholds.map((household, index) => ({
      surveyEnumerationAreaSamplingId: samplingRecord.id,
      householdListingId: household.id,
      selectionOrder: index + 1,
      isReplacement: false,
    }));

    await this.householdSampleRepository.bulkCreate(sampleRows);

    // Update survey enumeration area to mark as sampled
    surveyEnumerationArea.isSampled = true;
    surveyEnumerationArea.sampledBy = userId ?? null;
    surveyEnumerationArea.sampledDate = new Date();
    await surveyEnumerationArea.save();

    // Return simple status response for the enumeration area
    const response: RunSamplingResponseDto = {
      success: true,
      message: `Sampling completed successfully for enumeration area ${surveyEnumerationAreaId}`,
      data: {
        samplingId: samplingRecord.id,
        surveyEnumerationAreaId,
        method: samplingRecord.method,
        sampleSize: samplingRecord.sampleSize,
        populationSize: samplingRecord.populationSize,
        isFullSelection: samplingRecord.isFullSelection,
        executedAt: samplingRecord.executedAt,
      },
    };

    return response;
  }

  async getSamplingSummary(samplingId: number) {
    const sampling = await this.surveyEnumerationAreaSamplingRepository.findByPk(
      samplingId,
      {
        include: [
          {
            model: SurveyEnumerationAreaHouseholdSample,
            include: [SurveyEnumerationAreaHouseholdListing],
            order: [['selectionOrder', 'ASC']],
          },
        ],
      },
    );

    if (!sampling) {
      throw new NotFoundException('Sampling record not found');
    }

    return sampling;
  }

  /**
   * Get sampling results (selected households) for an enumeration area
   * Returns full details of the sampling including all selected households
   */
  async getSamplingResults(
    surveyId: number,
    surveyEnumerationAreaId: number,
  ) {
    await this.ensureSurveyExists(surveyId);

    const sampling = await this.surveyEnumerationAreaSamplingRepository.findOne({
      where: {
        surveyId,
        surveyEnumerationAreaId,
      },
      include: [
        {
          model: SurveyEnumerationAreaHouseholdSample,
          as: 'samples',
          include: [
            {
              model: SurveyEnumerationAreaHouseholdListing,
              as: 'householdListing',
              attributes: [
                'id',
                'structureNumber',
                'householdIdentification',
                'householdSerialNumber',
                'nameOfHOH',
                'totalMale',
                'totalFemale',
                'phoneNumber',
                'remarks',
                'createdAt',
              ],
            },
          ],
          order: [['selectionOrder', 'ASC']],
        },
        {
          model: SurveyEnumerationArea,
          include: [
            {
              model: EnumerationArea,
              attributes: ['id', 'name', 'areaCode'],
              include: [
                {
                  model: SubAdministrativeZone,
                  attributes: ['id', 'name', 'areaCode', 'type'],
                  include: [
                    {
                      model: AdministrativeZone,
                      attributes: ['id', 'name', 'areaCode', 'type'],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });

    if (!sampling) {
      throw new NotFoundException(
        'No sampling results found for this enumeration area',
      );
    }

    return {
      success: true,
      message: 'Sampling results retrieved successfully',
      data: {
        sampling: {
          id: sampling.id,
          method: sampling.method,
          sampleSize: sampling.sampleSize,
          populationSize: sampling.populationSize,
          samplingInterval: sampling.samplingInterval,
          randomStart: sampling.randomStart,
          wrapAroundCount: sampling.wrapAroundCount,
          isFullSelection: sampling.isFullSelection,
          selectedIndices: sampling.selectedIndices,
          metadata: sampling.metadata,
          executedAt: sampling.executedAt,
          executedBy: sampling.executedBy,
        },
        enumerationArea: {
          id: sampling.surveyEnumerationArea?.enumerationArea?.id,
          name: sampling.surveyEnumerationArea?.enumerationArea?.name,
          areaCode: sampling.surveyEnumerationArea?.enumerationArea?.areaCode,
          subAdminZone: {
            name: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.name,
            areaCode: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.areaCode,
            type: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.type,
          },
          adminZone: {
            name: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.administrativeZone?.name,
            areaCode: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.administrativeZone?.areaCode,
            type: sampling.surveyEnumerationArea?.enumerationArea?.subAdministrativeZone?.administrativeZone?.type,
          },
        },
        selectedHouseholds: sampling.samples?.map((sample) => ({
          selectionOrder: sample.selectionOrder,
          isReplacement: sample.isReplacement,
          household: {
            id: sample.householdListing?.id,
            householdIdentification: sample.householdListing?.householdIdentification,
            householdSerialNumber: sample.householdListing?.householdSerialNumber,
            nameOfHOH: sample.householdListing?.nameOfHOH,
            totalMale: sample.householdListing?.totalMale,
            totalFemale: sample.householdListing?.totalFemale,
            totalPopulation:
              (sample.householdListing?.totalMale || 0) +
              (sample.householdListing?.totalFemale || 0),
            phoneNumber: sample.householdListing?.phoneNumber,
            remarks: sample.householdListing?.remarks,
            createdAt: sample.householdListing?.createdAt,
          },
        })) || [],
      },
    };
  }

  /**
   * Get selected household listing IDs for a survey enumeration area
   * Used by UI to mark which households were selected for sample
   * @param surveyId - The survey ID
   * @param surveyEnumerationAreaId - The survey enumeration area ID
   * @returns Array of household listing IDs that were selected, or empty array if no sampling exists
   */
  async getSelectedHouseholdsByEnumerationArea(
    surveyId: number,
    surveyEnumerationAreaId: number,
  ) {
    await this.ensureSurveyExists(surveyId);

    // Find the sampling for this enumeration area
    const sampling = await this.surveyEnumerationAreaSamplingRepository.findOne({
      where: {
        surveyId,
        surveyEnumerationAreaId,
      },
      attributes: ['id'],
    });

    // If no sampling exists, return empty array
    if (!sampling) {
      return [];
    }

    // Get all household listing IDs for this sampling
    const householdSamples = await this.householdSampleRepository.findAll({
      where: {
        surveyEnumerationAreaSamplingId: sampling.id,
      },
      attributes: ['householdListingId'],
      order: [['selectionOrder', 'ASC']],
    });

    // Return just the array of household listing IDs
    return householdSamples.map((sample) => sample.householdListingId);
  }

  /**
   * Check if sampling already exists for an enumeration area
   * Used by frontend to prompt user before overwriting
   */
  async checkSamplingExists(
    surveyId: number,
    surveyEnumerationAreaId: number,
  ) {
    await this.ensureSurveyExists(surveyId);

    const sampling = await this.surveyEnumerationAreaSamplingRepository.findOne({
      where: {
        surveyId,
        surveyEnumerationAreaId,
      },
    });

    if (!sampling) {
      return {
        exists: false,
        message: 'No sampling found for this enumeration area',
        data: null,
      };
    }

    return {
      exists: true,
      message: 'Sampling already exists for this enumeration area',
      data: {
        samplingId: sampling.id,
        surveyEnumerationAreaId: sampling.surveyEnumerationAreaId,
        method: sampling.method,
        sampleSize: sampling.sampleSize,
        populationSize: sampling.populationSize,
        isFullSelection: sampling.isFullSelection,
        executedAt: sampling.executedAt,
        executedBy: sampling.executedBy,
      },
    };
  }

  private async ensureSurveyExists(surveyId: number) {
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }
  }

  private determineSampleSize({
    overrideSampleSize,
    config,
    enumerationArea,
    populationSize,
  }: {
    overrideSampleSize?: number;
    config?: SurveySamplingConfig | null;
    enumerationArea?: EnumerationArea;
    populationSize: number;
  }): number {
    if (overrideSampleSize && overrideSampleSize > 0) {
      return overrideSampleSize;
    }

    if (!config) {
      throw new BadRequestException(
        'Sample size is required when no survey sampling config exists',
      );
    }

    const adminZoneType =
      enumerationArea?.subAdministrativeZone?.administrativeZone?.type;

    if (
      adminZoneType === AdministrativeZoneType.THROMDE &&
      config.urbanSampleSize
    ) {
      return config.urbanSampleSize;
    }

    if (adminZoneType !== AdministrativeZoneType.THROMDE) {
      if (config.ruralSampleSize) {
        return config.ruralSampleSize;
      }
    }

    if (config.defaultSampleSize) {
      return config.defaultSampleSize;
    }

    return populationSize;
  }

  private runCssSampling({
    populationSize,
    sampleSize,
    randomStart,
  }: {
    populationSize: number;
    sampleSize: number;
    randomStart?: number;
  }): SamplingResult {
    const interval = Math.floor(populationSize / sampleSize);
    const samplingInterval = interval <= 0 ? 1 : interval;

    let start =
      randomStart ??
      this.generateRandomInt({
        min: 1,
        max: populationSize,
      });

    if (start < 1 || start > populationSize) {
      throw new BadRequestException(
        `Random start must be between 1 and ${populationSize}`,
      );
    }

    const indices: number[] = [];
    let wrapAroundCount = 0;

    for (let i = 0; i < sampleSize; i++) {
      let index = start + i * samplingInterval;
      while (index > populationSize) {
        index -= populationSize;
        wrapAroundCount += 1;
      }
      indices.push(index);
    }

    return {
      indices,
      samplingInterval,
      randomStart: start,
      wrapAroundCount,
      metadata: {
        method: SamplingMethod.CSS,
        samplingInterval,
        randomStart: start,
        wrapAroundCount,
      },
    };
  }

  private runSrsSampling({
    populationSize,
    sampleSize,
  }: {
    populationSize: number;
    sampleSize: number;
  }): SamplingResult {
    const indices = new Set<number>();
    const metadata: Record<string, any> = {
      method: SamplingMethod.SRS,
      strategy: '',
    };

    if (sampleSize < populationSize / 2) {
      metadata.strategy = 'rejection-sampling';
      while (indices.size < sampleSize) {
        indices.add(
          this.generateRandomInt({
            min: 1,
            max: populationSize,
          }),
        );
      }
    } else {
      metadata.strategy = 'partial-fisher-yates';
      const allIndices = Array.from(
        { length: populationSize },
        (_, index) => index + 1,
      );
      for (let i = 0; i < sampleSize; i++) {
        const j = this.generateRandomInt({ min: i, max: populationSize - 1 });
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
      }
      for (let i = 0; i < sampleSize; i++) {
        indices.add(allIndices[i]);
      }
    }

    const sortedIndices = Array.from(indices).sort((a, b) => a - b);

    return {
      indices: sortedIndices,
      metadata,
    };
  }

  private generateRandomInt({
    min,
    max,
  }: {
    min: number;
    max: number;
  }): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Get enumeration hierarchy with sampling status for a survey
   */
  async getSamplingEnumerationHierarchy(
    surveyId: number,
  ): Promise<SamplingEnumerationHierarchyDto> {
    // Verify survey exists
    const survey = await this.surveyRepository.findByPk(surveyId, {
      attributes: ['id', 'name', 'year'],
    });

    if (!survey) {
      throw new NotFoundException(`Survey with ID ${surveyId} not found`);
    }

    // Step 1: Get all survey enumeration areas with workflow status
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId: surveyId },
      attributes: [
        'id',
        'enumerationAreaId',
        'isEnumerated',
        'enumeratedBy',
        'enumerationDate',
        'isSampled',
        'sampledBy',
        'sampledDate',
        'isPublished',
        'publishedBy',
        'publishedDate',
      ],
    });

    if (surveyEAs.length === 0) {
      return {
        survey: {
          id: survey.id,
          name: survey.name,
          year: survey.year,
        },
        summary: {
          totalDzongkhags: 0,
          totalAdministrativeZones: 0,
          totalSubAdministrativeZones: 0,
          totalEnumerationAreas: 0,
          totalWithSampling: 0,
          totalWithoutSampling: 0,
        },
        hierarchy: [],
      };
    }

    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);
    const surveyEAIds = surveyEAs.map((sea) => sea.id);

    // Step 2: Get all sampling records for these survey enumeration areas
    const samplingRecords = await this.surveyEnumerationAreaSamplingRepository.findAll({
      where: { surveyEnumerationAreaId: surveyEAIds },
      attributes: [
        'id',
        'surveyEnumerationAreaId',
        'method',
        'sampleSize',
        'populationSize',
        'isFullSelection',
        'executedAt',
        'executedBy',
      ],
    });

    // Create a map of surveyEAId -> sampling data
    const samplingMap = new Map(
      samplingRecords.map((sampling) => [
        sampling.surveyEnumerationAreaId,
        {
          id: sampling.id,
          method: sampling.method,
          sampleSize: sampling.sampleSize,
          populationSize: sampling.populationSize,
          isFullSelection: sampling.isFullSelection,
          executedAt: sampling.executedAt,
          executedBy: sampling.executedBy,
        },
      ]),
    );

    // Step 3: Get enumeration areas with their associations separately
    const enumerationAreas = await EnumerationArea.findAll({
      where: { id: enumerationAreaIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    const subAdminZoneIds = [
      ...new Set(enumerationAreas.map((ea) => ea.subAdministrativeZoneId)),
    ];

    // Step 4: Get sub-administrative zones
    const subAdminZones = await SubAdministrativeZone.findAll({
      where: { id: subAdminZoneIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    const adminZoneIds = [
      ...new Set(subAdminZones.map((saz) => saz.administrativeZoneId)),
    ];

    // Step 5: Get administrative zones
    const adminZones = await AdministrativeZone.findAll({
      where: { id: adminZoneIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    const dzongkhagIds = [...new Set(adminZones.map((az) => az.dzongkhagId))];

    // Step 6: Get dzongkhags
    const dzongkhags = await this.dzongkhagRepository.findAll({
      where: { id: dzongkhagIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    // Create lookup maps for efficient access
    const dzongkhagMap = new Map(dzongkhags.map((d) => [d.id, d]));
    const adminZoneMap = new Map(adminZones.map((az) => [az.id, az]));
    const subAdminZoneMap = new Map(subAdminZones.map((saz) => [saz.id, saz]));
    const enumerationAreaMap = new Map(
      enumerationAreas.map((ea) => [ea.id, ea]),
    );
    const surveyEAMap = new Map(
      surveyEAs.map((sea) => [sea.enumerationAreaId, sea.id]),
    );
    const surveyEADataMap = new Map(
      surveyEAs.map((sea) => [
        sea.enumerationAreaId,
        {
          id: sea.id,
          isEnumerated: sea.isEnumerated,
          enumeratedBy: sea.enumeratedBy,
          enumerationDate: sea.enumerationDate,
          isSampled: sea.isSampled,
          sampledBy: sea.sampledBy,
          sampledDate: sea.sampledDate,
          isPublished: sea.isPublished,
          publishedBy: sea.publishedBy,
          publishedDate: sea.publishedDate,
        },
      ]),
    );

    // Get household counts for each survey enumeration area
    const householdCounts = new Map<number, number>();
    
    if (surveyEAIds.length > 0) {
      const households = await this.householdListingRepository.findAll({
        where: { surveyEnumerationAreaId: surveyEAIds },
        attributes: ['surveyEnumerationAreaId'],
      });

      // Count households per survey enumeration area
      households.forEach((household) => {
        const currentCount = householdCounts.get(household.surveyEnumerationAreaId) || 0;
        householdCounts.set(household.surveyEnumerationAreaId, currentCount + 1);
      });
    }

    // Build hierarchical structure: Dzongkhag → AdminZone → SubAdminZone → EA
    const hierarchyMap = new Map<
      number,
      {
        id: number;
        name: string;
        areaCode: string;
        areaSqKm: number;
        administrativeZones: Map<
          number,
          {
            id: number;
            name: string;
            areaCode: string;
            type: AdministrativeZoneType;
            subAdministrativeZones: Map<
              number,
              {
                id: number;
                name: string;
                areaCode: string;
                type: string;
                enumerationAreas: any[];
              }
            >;
          }
        >;
      }
    >();
    let totalWithSampling = 0;
    let totalWithoutSampling = 0;

    enumerationAreas.forEach((ea) => {
      const subAdminZone = subAdminZoneMap.get(ea.subAdministrativeZoneId);
      if (!subAdminZone) return;

      const adminZone = adminZoneMap.get(subAdminZone.administrativeZoneId);
      if (!adminZone) return;

      const dzongkhag = dzongkhagMap.get(adminZone.dzongkhagId);
      if (!dzongkhag) return;

      // Get or create dzongkhag entry
      if (!hierarchyMap.has(dzongkhag.id)) {
        hierarchyMap.set(dzongkhag.id, {
          id: dzongkhag.id,
          name: dzongkhag.name,
          areaCode: dzongkhag.areaCode,
          areaSqKm: dzongkhag.areaSqKm,
          administrativeZones: new Map(),
        });
      }

      const dzongkhagData = hierarchyMap.get(dzongkhag.id);

      // Get or create administrative zone entry
      if (!dzongkhagData.administrativeZones.has(adminZone.id)) {
        dzongkhagData.administrativeZones.set(adminZone.id, {
          id: adminZone.id,
          name: adminZone.name,
          areaCode: adminZone.areaCode,
          type: adminZone.type,
          subAdministrativeZones: new Map(),
        });
      }

      const adminZoneData = dzongkhagData.administrativeZones.get(adminZone.id);

      // Get or create sub-administrative zone entry
      if (!adminZoneData.subAdministrativeZones.has(subAdminZone.id)) {
        adminZoneData.subAdministrativeZones.set(subAdminZone.id, {
          id: subAdminZone.id,
          name: subAdminZone.name,
          areaCode: subAdminZone.areaCode,
          type: subAdminZone.type,
          enumerationAreas: [],
        });
      }

      const subAdminZoneData = adminZoneData.subAdministrativeZones.get(
        subAdminZone.id,
      );

      // Add enumeration area with sampling status
      const surveyEAId = surveyEAMap.get(ea.id);
      const householdCount = householdCounts.get(surveyEAId) || 0;
      const sampling = samplingMap.get(surveyEAId);
      const seaData = surveyEADataMap.get(ea.id);
      
      if (sampling) {
        totalWithSampling++;
      } else {
        totalWithoutSampling++;
      }

      subAdminZoneData.enumerationAreas.push({
        id: ea.id,
        name: ea.name,
        areaCode: ea.areaCode,
        surveyEnumerationAreaId: surveyEAId,
        totalHouseholdCount: householdCount,
        isEnumerated: seaData?.isEnumerated || false,
        enumeratedBy: seaData?.enumeratedBy || null,
        enumerationDate: seaData?.enumerationDate || null,
        isSampled: seaData?.isSampled || false,
        sampledBy: seaData?.sampledBy || null,
        sampledDate: seaData?.sampledDate || null,
        isPublished: seaData?.isPublished || false,
        publishedBy: seaData?.publishedBy || null,
        publishedDate: seaData?.publishedDate || null,
        hasSampling: !!sampling,
        sampling: sampling || null,
      });
    });

    // Convert maps to arrays for JSON response
    const hierarchy = Array.from(hierarchyMap.values()).map((dzongkhag) => ({
      id: dzongkhag.id,
      name: dzongkhag.name,
      areaCode: dzongkhag.areaCode,
      areaSqKm: dzongkhag.areaSqKm,
      administrativeZones: Array.from(
        dzongkhag.administrativeZones.values(),
      ).map((adminZone) => ({
        id: adminZone.id,
        name: adminZone.name,
        areaCode: adminZone.areaCode,
        type: adminZone.type,
        subAdministrativeZones: Array.from(
          adminZone.subAdministrativeZones.values(),
        ).map((subAdminZone) => ({
          id: subAdminZone.id,
          name: subAdminZone.name,
          areaCode: subAdminZone.areaCode,
          type: subAdminZone.type,
          enumerationAreas: subAdminZone.enumerationAreas,
        })),
      })),
    }));

    // Calculate summary
    const uniqueDzongkhags = new Set(dzongkhags.map((d) => d.id)).size;
    const uniqueAdminZones = new Set(adminZones.map((az) => az.id)).size;
    const uniqueSubAdminZones = new Set(subAdminZones.map((saz) => saz.id)).size;

    return {
      survey: {
        id: survey.id,
        name: survey.name,
        year: survey.year,
      },
      summary: {
        totalDzongkhags: uniqueDzongkhags,
        totalAdministrativeZones: uniqueAdminZones,
        totalSubAdministrativeZones: uniqueSubAdminZones,
        totalEnumerationAreas: surveyEAs.length,
        totalWithSampling,
        totalWithoutSampling,
      },
      hierarchy,
    };
  }
}

