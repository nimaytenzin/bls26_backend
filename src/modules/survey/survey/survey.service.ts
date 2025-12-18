import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateSurveyDto } from './dto/create-survey.dto';
import { UpdateSurveyDto } from './dto/update-survey.dto';
import { SurveyStatisticsResponseDto } from './dto/survey-statistics-response.dto';
import { SurveyEnumerationHierarchyDto } from './dto/survey-enumeration-hierarchy-response.dto';
import { Survey, SurveyStatus } from './entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { User } from '../../auth/entities/user.entity';
import { instanceToPlain } from 'class-transformer';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerator } from '../survey-enumerator/entities/survey-enumerator.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationAreaHouseholdListingService } from '../survey-enumeration-area-household-listing/survey-enumeration-area-household-listing.service';
import { SurveyEnumerationAreaStructure } from '../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';
import { BulkHouseholdUploadDto } from './dto/bulk-household-upload.dto';
import { BulkHouseholdUploadResponseDto } from './dto/bulk-household-upload-response.dto';
import {
  PaginationUtil,
  PaginationQueryDto,
  PaginatedResponse,
} from '../../../common/utils/pagination.util';
import { Op } from 'sequelize';

@Injectable()
export class SurveyService {
  constructor(
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_ENUMERATION_AREA_STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof SurveyEnumerationAreaStructure,
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    private readonly householdListingService: SurveyEnumerationAreaHouseholdListingService,
  ) {}

  async create(createSurveyDto: CreateSurveyDto): Promise<Survey> {
    const { enumerationAreaIds, ...surveyData } = createSurveyDto;

    // Create the survey
    const survey = await this.surveyRepository.create(
      instanceToPlain(surveyData),
    );

    // Associate enumeration areas if provided
    if (enumerationAreaIds && enumerationAreaIds.length > 0) {
      const surveyEAs = enumerationAreaIds.map((eaId) => ({
        surveyId: survey.id,
        enumerationAreaId: eaId,
      }));
      await this.surveyEnumerationAreaRepository.bulkCreate(surveyEAs);
    }

    return this.findOne(survey.id);
  }

  async findAll(): Promise<Survey[]> {
    return await this.surveyRepository.findAll<Survey>({
      include: ['enumerationAreas'],
    });
  }

  /**
   * Get all active surveys (no pagination)
   * @returns Array of active surveys
   */
  async findAllActive(): Promise<Survey[]> {
    return await this.surveyRepository.findAll<Survey>({
      where: { status: SurveyStatus.ACTIVE },
      include: ['enumerationAreas'],
      order: [['startDate', 'DESC']],
    });
  }

  /**
   * Get paginated surveys
   * @param query - Pagination query parameters
   * @returns Paginated response with surveys
   */
  async findAllPaginated(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Survey>> {
    // Normalize pagination options
    const options = PaginationUtil.normalizePaginationOptions(query);

    // Calculate offset and limit
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Build order clause (default sort by 'startDate' descending)
    const order = PaginationUtil.buildOrderClause(options, 'startDate');

    // Fetch data with count
    const { rows, count } = await this.surveyRepository.findAndCountAll({
      offset,
      limit,
      order,
      include: ['enumerationAreas'],
      distinct: true, // Count distinct surveys, not rows from JOIN
    });

    // Return paginated response
    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }

  async findOne(id: number): Promise<Survey> {
    return await this.surveyRepository.findOne<Survey>({
      where: { id },
      include: ['enumerationAreas'],
    });
  }

  async update(id: number, updateSurveyDto: UpdateSurveyDto): Promise<Survey> {
    const { enumerationAreaIds, ...surveyData } = updateSurveyDto;

    // Update survey data
    const [numRows] = await this.surveyRepository.update(
      instanceToPlain(surveyData),
      {
        where: { id },
      },
    );

    if (numRows === 0) {
      throw new Error(`Survey with ID ${id} not found`);
    }

    // Update enumeration areas if provided
    if (enumerationAreaIds !== undefined) {
      // Remove existing associations
      await this.surveyEnumerationAreaRepository.destroy({
        where: { surveyId: id },
      });

      // Add new associations
      if (enumerationAreaIds.length > 0) {
        const surveyEAs = enumerationAreaIds.map((eaId) => ({
          surveyId: id,
          enumerationAreaId: eaId,
        }));
        await this.surveyEnumerationAreaRepository.bulkCreate(surveyEAs);
      }
    }

    return this.findOne(id);
  }

  async remove(id: number): Promise<number> {
    // Delete associated enumeration areas first
    await this.surveyEnumerationAreaRepository.destroy({
      where: { surveyId: id },
    });

    // Delete the survey
    return await this.surveyRepository.destroy({
      where: { id },
    });
  }

  /**
   * Update survey status (ACTIVE/ENDED)
   * @param id - Survey ID
   * @param status - New status
   */
  async updateStatus(id: number, status: SurveyStatus): Promise<Survey> {
    const survey = await this.surveyRepository.findByPk(id);

    if (!survey) {
      throw new Error(`Survey with ID ${id} not found`);
    }

    // Prevent closing survey if not fully validated
    if (status === SurveyStatus.ENDED && !survey.isFullyValidated) {
      throw new Error(
        'Cannot close survey. Not all enumeration areas have been validated.',
      );
    }

    survey.status = status;
    await survey.save();

    return this.findOne(id);
  }

  async addEnumerationAreas(
    surveyId: number,
    enumerationAreaIds: number[],
  ): Promise<Survey> {
    const surveyEAs = enumerationAreaIds.map((eaId) => ({
      surveyId,
      enumerationAreaId: eaId,
    }));

    await this.surveyEnumerationAreaRepository.bulkCreate(surveyEAs, {
      ignoreDuplicates: true,
    });

    return this.findOne(surveyId);
  }

  async removeEnumerationAreas(
    surveyId: number,
    enumerationAreaIds: number[],
  ): Promise<Survey> {
    await this.surveyEnumerationAreaRepository.destroy({
      where: {
        surveyId,
        enumerationAreaId: enumerationAreaIds,
      },
    });

    return this.findOne(surveyId);
  }

  /**
   * Get all supervisors assigned to a survey
   * Based on the relationship: Survey → EnumerationAreas → SubAdminZones → AdminZones → Dzongkhags → Supervisors
   */
  async getSupervisorsForSurvey(surveyId: number) {
    // Step 1: Get the survey to verify it exists
    const survey = await this.surveyRepository.findByPk(surveyId);

    if (!survey) {
      throw new Error(`Survey with ID ${surveyId} not found`);
    }

    // Step 2: Get enumeration area IDs for this survey
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: ['enumerationAreaId'],
    });

    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);

    if (enumerationAreaIds.length === 0) {
      return [];
    }

    // Step 3: Get enumeration areas with their complete geographic hierarchy via junction table
    const enumerationAreas = await EnumerationArea.findAll({
      where: { id: enumerationAreaIds },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          through: { attributes: [] },
          include: [
            {
              model: AdministrativeZone,
              include: [
                {
                  model: Dzongkhag,
                  attributes: ['id', 'name', 'areaCode'],
                },
              ],
            },
          ],
        },
      ],
    });

    // Step 4: Collect unique dzongkhag IDs from the enumeration areas
    const dzongkhagIds = new Set<number>();
    const dzongkhagMap = new Map();

    enumerationAreas.forEach((ea) => {
      // Handle multiple SAZs per EA - use first SAZ for dzongkhag lookup
      const firstSAZ = ea.subAdministrativeZones?.[0];
      const dzongkhag = firstSAZ?.administrativeZone?.dzongkhag;
      if (dzongkhag) {
        dzongkhagIds.add(dzongkhag.id);
        if (!dzongkhagMap.has(dzongkhag.id)) {
          dzongkhagMap.set(dzongkhag.id, {
            id: dzongkhag.id,
            name: dzongkhag.name,
            areaCode: dzongkhag.areaCode,
          });
        }
      }
    });

    if (dzongkhagIds.size === 0) {
      return [];
    }

    // Step 5: Fetch all dzongkhags with their supervisors
    const dzongkhags = await Dzongkhag.findAll({
      where: { id: Array.from(dzongkhagIds) },
      include: [
        {
          model: User,
          as: 'supervisors',
          through: { attributes: [] },
          attributes: [
            'id',
            'name',
            'cid',
            'emailAddress',
            'phoneNumber',
            'role',
          ],
        },
      ],
    });

    // Step 6: Build the response with unique supervisors and their dzongkhags
    const supervisorsMap = new Map();

    dzongkhags.forEach((dzongkhag) => {
      const dzongkhagData = dzongkhagMap.get(dzongkhag.id);

      if (dzongkhag.supervisors) {
        dzongkhag.supervisors.forEach((supervisor) => {
          if (!supervisorsMap.has(supervisor.id)) {
            supervisorsMap.set(supervisor.id, {
              id: supervisor.id,
              name: supervisor.name,
              cid: supervisor.cid,
              emailAddress: supervisor.emailAddress,
              phoneNumber: supervisor.phoneNumber,
              role: supervisor.role,
              dzongkhags: [],
            });
          }

          // Add dzongkhag to supervisor's list
          const supervisorData = supervisorsMap.get(supervisor.id);
          const dzongkhagExists = supervisorData.dzongkhags.some(
            (d) => d.id === dzongkhagData.id,
          );

          if (!dzongkhagExists && dzongkhagData) {
            supervisorData.dzongkhags.push(dzongkhagData);
          }
        });
      }
    });

    return Array.from(supervisorsMap.values());
  }

  /**
   * Get active surveys for a supervisor based on their assigned dzongkhags
   * Relationship: Supervisor → Dzongkhags → AdministrativeZones → SubAdministrativeZones → EnumerationAreas → Surveys
   */
  async getActiveSurveysForSupervisor(supervisorId: number) {
    // Step 1: Get dzongkhags assigned to this supervisor
    const supervisor = await User.findByPk(supervisorId, {
      include: [
        {
          model: Dzongkhag,
          as: 'dzongkhags',
          through: { attributes: [] },
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });

    if (
      !supervisor ||
      !supervisor.dzongkhags ||
      supervisor.dzongkhags.length === 0
    ) {
      return [];
    }

    const dzongkhagIds = supervisor.dzongkhags.map((d) => d.id);

    // Step 2: Get all enumeration areas that belong to these dzongkhags via junction table
    // EA → SubAdminZone (via junction) → AdminZone → Dzongkhag
    // Only get active EAs (not survey-linked, so filter by isActive)
    const enumerationAreas = await EnumerationArea.findAll({
      where: { isActive: true },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          through: { attributes: [] },
          required: true,
          include: [
            {
              model: AdministrativeZone,
              required: true,
              include: [
                {
                  model: Dzongkhag,
                  required: true,
                  where: { id: dzongkhagIds },
                  attributes: ['id', 'name', 'areaCode'],
                },
              ],
              attributes: ['id', 'name'],
            },
          ],
          attributes: ['id', 'name'],
        },
      ],
      attributes: ['id', 'name', 'areaCode'],
    });

    if (enumerationAreas.length === 0) {
      return [];
    }

    const enumerationAreaIds = enumerationAreas.map((ea) => ea.id);

    // Step 3: Get surveys that have these enumeration areas and are ACTIVE
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { enumerationAreaId: enumerationAreaIds },
      attributes: ['surveyId', 'enumerationAreaId'],
    });

    if (surveyEAs.length === 0) {
      return [];
    }

    // Group enumeration areas by survey
    const surveyEAMap = new Map<number, number[]>();
    surveyEAs.forEach((sea) => {
      if (!surveyEAMap.has(sea.surveyId)) {
        surveyEAMap.set(sea.surveyId, []);
      }
      surveyEAMap.get(sea.surveyId).push(sea.enumerationAreaId);
    });

    const surveyIds = Array.from(surveyEAMap.keys());

    // Step 4: Get active surveys with their details
    const surveys = await this.surveyRepository.findAll({
      where: {
        id: surveyIds,
        status: 'ACTIVE',
      },

      order: [['startDate', 'DESC']],
    });

    // Step 5: Build the response with enumeration areas and their geographic hierarchy
    const result = surveys.map((survey) => {
      const surveyEAIds = surveyEAMap.get(survey.id) || [];
      const surveyEnumerationAreas = enumerationAreas.filter((ea) =>
        surveyEAIds.includes(ea.id),
      );

      // Group by dzongkhag for better organization
      const dzongkhagMap = new Map();

      surveyEnumerationAreas.forEach((ea) => {
        // Handle multiple SAZs per EA - use first SAZ for grouping
        const firstSAZ = ea.subAdministrativeZones?.[0];
        const dzongkhag = firstSAZ?.administrativeZone?.dzongkhag;
        if (dzongkhag) {
          if (!dzongkhagMap.has(dzongkhag.id)) {
            dzongkhagMap.set(dzongkhag.id, {
              id: dzongkhag.id,
              name: dzongkhag.name,
              areaCode: dzongkhag.areaCode,
              enumerationAreas: [],
            });
          }

          dzongkhagMap.get(dzongkhag.id).enumerationAreas.push({
            id: ea.id,
            name: ea.name,
            areaCode: ea.areaCode,
            subAdministrativeZone: firstSAZ ? {
              id: firstSAZ.id,
              name: firstSAZ.name,
              administrativeZone: {
                id: firstSAZ.administrativeZone.id,
                name: firstSAZ.administrativeZone.name,
              },
            } : null,
          });
        }
      });

      return {
        id: survey.id,
        name: survey.name,
        description: survey.description,
        startDate: survey.startDate,
        endDate: survey.endDate,
        year: survey.year,
        status: survey.status,

        dzongkhags: Array.from(dzongkhagMap.values()),
        totalEnumerationAreas: surveyEnumerationAreas.length,
      };
    });

    return result;
  }

  /**
   * Get comprehensive statistics for a survey
   * @param surveyId - Survey ID
   * @returns SurveyStatisticsResponseDto
   */
  async getSurveyStatistics(
    surveyId: number,
  ): Promise<SurveyStatisticsResponseDto> {
    // Verify survey exists
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      throw new Error(`Survey with ID ${surveyId} not found`);
    }

    // Get all survey enumeration areas for this survey
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: ['id', 'enumerationAreaId', 'isEnumerated', 'isSampled', 'isPublished'],
    });

    const totalEnumerationAreas = surveyEAs.length;
    const enumeratedEAs = surveyEAs.filter((ea) => ea.isEnumerated).length;
    const sampledEAs = surveyEAs.filter((ea) => ea.isSampled).length;
    const publishedEAs = surveyEAs.filter((ea) => ea.isPublished).length;

    // Calculate enumeration, sampling, and publishing percentages
    const enumerationPercentage =
      totalEnumerationAreas > 0
        ? ((enumeratedEAs / totalEnumerationAreas) * 100).toFixed(2)
        : '0.00';
    const samplingPercentage =
      enumeratedEAs > 0
        ? ((sampledEAs / enumeratedEAs) * 100).toFixed(2)
        : '0.00';
    const publishingPercentage =
      sampledEAs > 0
        ? ((publishedEAs / sampledEAs) * 100).toFixed(2)
        : '0.00';

    // Get enumeration area IDs
    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);

    // Get unique dzongkhags
    let totalDzongkhags = 0;
    if (enumerationAreaIds.length > 0) {
      const enumerationAreas = await EnumerationArea.findAll({
        where: { id: enumerationAreaIds },
        include: [
          {
            model: SubAdministrativeZone,
            as: 'subAdministrativeZones',  // Via junction table
            through: { attributes: [] },
            attributes: ['id'],
            include: [
              {
                model: AdministrativeZone,
                attributes: ['id'],
                include: [
                  {
                    model: Dzongkhag,
                    attributes: ['id'],
                  },
                ],
              },
            ],
          },
        ],
      });

      // Count unique dzongkhags
      const dzongkhagIds = new Set<number>();
      enumerationAreas.forEach((ea) => {
        // Handle multiple SAZs per EA - use first SAZ for dzongkhag lookup
        const firstSAZ = ea.subAdministrativeZones?.[0];
        const dzongkhag = firstSAZ?.administrativeZone?.dzongkhag;
        if (dzongkhag) {
          dzongkhagIds.add(dzongkhag.id);
        }
      });
      totalDzongkhags = dzongkhagIds.size;
    }

    // Get total enumerators assigned to this survey
    const totalEnumerators = await this.surveyEnumeratorRepository.count({
      where: { surveyId },
    });

    // Get household statistics
    const surveyEAIds = surveyEAs.map((sea) => sea.id);
    let totalHouseholds = 0;
    let totalPopulation = 0;
    let totalMale = 0;
    let totalFemale = 0;

    if (surveyEAIds.length > 0) {
      const households = await this.householdListingRepository.findAll({
        where: { surveyEnumerationAreaId: surveyEAIds },
        attributes: ['totalMale', 'totalFemale'],
      });

      totalHouseholds = households.length;
      totalMale = households.reduce((sum, h) => sum + (h.totalMale || 0), 0);
      totalFemale = households.reduce(
        (sum, h) => sum + (h.totalFemale || 0),
        0,
      );
      totalPopulation = totalMale + totalFemale;
    }

    return {
      surveyId: survey.id,
      surveyName: survey.name,
      surveyStatus: survey.status,
      surveyYear: survey.year,
      isFullyPublished: survey.isFullyValidated, // TODO: Rename entity field to isFullyPublished after migration
      totalDzongkhags,
      totalEnumerationAreas,
      enumeratedEnumerationAreas: enumeratedEAs,
      sampledEnumerationAreas: sampledEAs,
      publishedEnumerationAreas: publishedEAs,
      pendingEnumerationAreas: totalEnumerationAreas - enumeratedEAs,
      enumerationPercentage,
      samplingPercentage,
      publishingPercentage,
      totalEnumerators,
      totalHouseholds,
      totalMale,
      totalFemale,
      totalPopulation,
      averageHouseholdSize:
        totalHouseholds > 0
          ? (totalPopulation / totalHouseholds).toFixed(2)
          : '0.00',
    };
  }

  /**
   * Get enumeration hierarchy for a survey (for dropdown/selection purposes)
   * Returns: Dzongkhag → Administrative Zone → Sub-Administrative Zone → Enumeration Areas
   * @param surveyId - Survey ID
   */
  async getSurveyEnumerationHierarchy(
    surveyId: number,
  ): Promise<SurveyEnumerationHierarchyDto> {
    // Verify survey exists
    const survey = await this.surveyRepository.findByPk(surveyId, {
      attributes: ['id', 'name', 'year', 'status'],
    });

    if (!survey) {
      throw new Error(`Survey with ID ${surveyId} not found`);
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
          status: survey.status,
        },
        summary: {
          totalDzongkhags: 0,
          totalAdministrativeZones: 0,
          totalSubAdministrativeZones: 0,
          totalEnumerationAreas: 0,
        },
        hierarchy: [],
      };
    }

    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);

    // Step 2: Get enumeration areas with their SAZs via junction table
    const enumerationAreas = await EnumerationArea.findAll({
      where: { id: enumerationAreaIds },
      attributes: {
        exclude: ['geom'],
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          through: { attributes: [] },
          attributes: { exclude: ['geom'] },
        },
      ],
    });

    // Collect all unique SAZ IDs from junction table (handle multiple SAZs per EA)
    const subAdminZoneIds = [
      ...new Set(
        enumerationAreas.flatMap((ea) => 
          ea.subAdministrativeZones?.map((saz) => saz.id) || []
        )
      ),
    ];

    // Step 3: Get sub-administrative zones
    const subAdminZones = await SubAdministrativeZone.findAll({
      where: { id: subAdminZoneIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    const adminZoneIds = [
      ...new Set(subAdminZones.map((saz) => saz.administrativeZoneId)),
    ];

    // Step 4: Get administrative zones
    const adminZones = await AdministrativeZone.findAll({
      where: { id: adminZoneIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    const dzongkhagIds = [...new Set(adminZones.map((az) => az.dzongkhagId))];

    // Step 5: Get dzongkhags
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
    const surveyEAIds = surveyEAs.map((sea) => sea.id);
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
    const hierarchyMap = new Map();

    enumerationAreas.forEach((ea) => {
      // Handle multiple SAZs per EA via junction table
      const sazIds = ea.subAdministrativeZones?.map((saz) => saz.id) || [];
      
      // Process each SAZ linked to this EA
      sazIds.forEach((sazId) => {
        const subAdminZone = subAdminZoneMap.get(sazId);
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

      // Add enumeration area
      const seaData = surveyEADataMap.get(ea.id);
      const surveyEAId = surveyEAMap.get(ea.id);
      const householdCount = householdCounts.get(surveyEAId) || 0;
      
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
      });
      }); // Close sazIds.forEach
    }); // Close enumerationAreas.forEach

    // Convert maps to arrays for JSON response
    const hierarchy = Array.from(hierarchyMap.values()).map((dzongkhag) => ({
      id: dzongkhag.id,
      name: dzongkhag.name,
      areaCode: dzongkhag.areaCode,
      administrativeZones: Array.from(
        dzongkhag.administrativeZones.values(),
      ).map((adminZone: any) => ({
        id: adminZone.id,
        name: adminZone.name,
        areaCode: adminZone.areaCode,
        type: adminZone.type,
        subAdministrativeZones: Array.from(
          adminZone.subAdministrativeZones.values(),
        ).map((subAdminZone: any) => ({
          id: subAdminZone.id,
          name: subAdminZone.name,
          areaCode: subAdminZone.areaCode,
          type: subAdminZone.type,
          enumerationAreas: subAdminZone.enumerationAreas,
        })),
      })),
    }));

    // Calculate summary statistics
    let totalAdminZones = 0;
    let totalSubAdminZones = 0;
    let totalEnumerationAreas = 0;

    hierarchy.forEach((dzongkhag) => {
      totalAdminZones += dzongkhag.administrativeZones.length;
      dzongkhag.administrativeZones.forEach((adminZone) => {
        totalSubAdminZones += adminZone.subAdministrativeZones.length;
        adminZone.subAdministrativeZones.forEach((subAdminZone) => {
          totalEnumerationAreas += subAdminZone.enumerationAreas.length;
        });
      });
    });

    return {
      survey: {
        id: survey.id,
        name: survey.name,
        year: survey.year,
        status: survey.status,
      },
      summary: {
        totalDzongkhags: hierarchy.length,
        totalAdministrativeZones: totalAdminZones,
        totalSubAdministrativeZones: totalSubAdminZones,
        totalEnumerationAreas,
      },
      hierarchy,
    };
  }

  /**
   * Bulk upload household counts for multiple EA-survey combinations
   * 
   * Creates SurveyEnumerationArea if it doesn't exist and creates blank household listings.
   * If data already exists for the same EA-Survey combination, existing records are
   * deleted and replaced (not appended). All uploaded data is automatically published.
   * 
   * @param dto - Bulk upload DTO containing items with enumerationAreaId, surveyId, and householdCount
   * @param userId - User ID for submittedBy and publishedBy fields
   * @returns Summary of created/skipped items and errors
   */
  async bulkUploadHouseholdCounts(
    dto: BulkHouseholdUploadDto,
    userId: number,
  ): Promise<BulkHouseholdUploadResponseDto> {
    const response: BulkHouseholdUploadResponseDto = {
      totalItems: dto.items.length,
      created: 0,
      skipped: 0,
      householdListingsCreated: 0,
      errors: [],
    };

    // Validate and get unique EA and Survey IDs
    const enumerationAreaIds = [
      ...new Set(dto.items.map((item) => item.enumerationAreaId)),
    ];
    const surveyIds = [...new Set(dto.items.map((item) => item.surveyId))];

    // Validate enumeration areas exist (only active EAs for bulk upload)
    const enumerationAreas = await EnumerationArea.findAll({
      where: { id: enumerationAreaIds, isActive: true },
      attributes: ['id'],
    });
    const validEAIds = new Set(enumerationAreas.map((ea) => ea.id));

    // Validate surveys exist
    const surveys = await this.surveyRepository.findAll({
      where: { id: surveyIds },
      attributes: ['id'],
    });
    const validSurveyIds = new Set(surveys.map((s) => s.id));

    // Process each item
    for (const item of dto.items) {
      try {
        // Skip if householdCount is 0
        if (item.householdCount === 0) {
          response.skipped++;
          continue;
        }

        // Validate enumeration area exists
        if (!validEAIds.has(item.enumerationAreaId)) {
          response.errors.push({
            enumerationAreaId: item.enumerationAreaId,
            surveyId: item.surveyId,
            householdCount: item.householdCount,
            reason: `Enumeration area with ID ${item.enumerationAreaId} not found`,
          });
          continue;
        }

        // Validate survey exists
        if (!validSurveyIds.has(item.surveyId)) {
          response.errors.push({
            enumerationAreaId: item.enumerationAreaId,
            surveyId: item.surveyId,
            householdCount: item.householdCount,
            reason: `Survey with ID ${item.surveyId} not found`,
          });
          continue;
        }

        // Check if SurveyEnumerationArea exists
        let surveyEA = await this.surveyEnumerationAreaRepository.findOne({
          where: {
            surveyId: item.surveyId,
            enumerationAreaId: item.enumerationAreaId,
          },
        });

        // Create SurveyEnumerationArea if it doesn't exist
        if (!surveyEA) {
          try {
            surveyEA = await this.surveyEnumerationAreaRepository.create({
              surveyId: item.surveyId,
              enumerationAreaId: item.enumerationAreaId,
            });
            response.created++;
          } catch (error) {
            response.errors.push({
              enumerationAreaId: item.enumerationAreaId,
              surveyId: item.surveyId,
              householdCount: item.householdCount,
              reason: `Failed to create SurveyEnumerationArea: ${error.message}`,
            });
            continue;
          }
        }

        // If data already exists for this EA-Survey combination, delete existing records (replace, not append)
        const existingListings = await this.householdListingRepository.findAll({
          where: { surveyEnumerationAreaId: surveyEA.id },
          attributes: ['id', 'structureId'],
        });

        if (existingListings.length > 0) {
          // Get unique structure IDs
          const structureIds = [
            ...new Set(
              existingListings
                .map((listing) => listing.structureId)
                .filter((id) => id !== null && id !== undefined),
            ),
          ];

          // Delete household listings first (to avoid foreign key constraint issues)
          await this.householdListingRepository.destroy({
            where: { surveyEnumerationAreaId: surveyEA.id },
          });

          // Delete associated structures
          if (structureIds.length > 0) {
            await this.structureRepository.destroy({
              where: { id: structureIds },
            });
          }
        }

        // Create household listings using the existing createBlankHouseholdListings method
        try {
          const result = await this.householdListingService.createBlankHouseholdListings(
            surveyEA.id,
            {
              count: item.householdCount,
              remarks: 'Auto-uploaded household data',
            },
            userId,
          );

          response.householdListingsCreated += result.created;

          // Mark the SurveyEnumerationArea as published
          surveyEA.isPublished = true;
          surveyEA.publishedBy = userId;
          surveyEA.publishedDate = new Date();
          await surveyEA.save();
        } catch (error) {
          response.errors.push({
            enumerationAreaId: item.enumerationAreaId,
            surveyId: item.surveyId,
            householdCount: item.householdCount,
            reason: `Failed to create household listings: ${error.message}`,
          });
          // Continue processing other items even if this one fails
        }
      } catch (error) {
        // Catch any unexpected errors
        response.errors.push({
          enumerationAreaId: item.enumerationAreaId,
          surveyId: item.surveyId,
          householdCount: item.householdCount,
          reason: `Unexpected error: ${error.message}`,
        });
      }
    }

    return response;
  }

  /**
   * Bulk upload household counts via CSV (codes-based EA lookup)
   * CSV headers (tab or comma):
   * dzongkhag, dzongkhagCode, adminZone, adminZoneCode, subAdminZone, subAdminZoneCode, ea, eaCode, surveyId1, surveyId2, ...
   * Any column starting with "surveyId" is treated as a survey id; its value is householdCount.
   */
  async bulkUploadHouseholdCountsFromCsv(
    fileBuffer: Buffer,
    userId: number,
  ): Promise<{
    parseErrors: Array<{ row: number; reason: string }>;
    bulkResult: BulkHouseholdUploadResponseDto | null;
  }> {
    const csvText = fileBuffer.toString('utf-8');
    const lines = csvText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return {
        parseErrors: [{ row: 1, reason: 'CSV must include header and at least one data row' }],
        bulkResult: null,
      };
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const splitRow = (row: string) =>
      row
        .split(delimiter)
        .map((c) => c.trim().replace(/^"|"$/g, ''));

    const headers = splitRow(lines[0]).map((h) => h.toLowerCase());

    const requiredHeaders = [
      'dzongkhagcode',
      'adminzonecode',
      'subadminzonecode',
      'eacode',
    ];

    const missing = requiredHeaders.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      return {
        parseErrors: [
          {
            row: 1,
            reason: `Missing required headers: ${missing.join(', ')}`,
          },
        ],
        bulkResult: null,
      };
    }

    const surveyIdColumns = headers
      .map((h, idx) => ({ h, idx }))
      .filter(({ h }) => h.startsWith('surveyid'))
      .map(({ h, idx }) => {
        const match = h.match(/surveyid\s*(\d+)/);
        const surveyId = match ? parseInt(match[1], 10) : NaN;
        return { surveyId, idx };
      })
      .filter(({ surveyId }) => !isNaN(surveyId));

    const items: BulkHouseholdUploadDto['items'] = [];
    const parseErrors: Array<{ row: number; reason: string }> = [];

    for (let i = 1; i < lines.length; i++) {
      const row = splitRow(lines[i]);
      const rowNumber = i + 1;

      const getVal = (header: string) => row[headers.indexOf(header)] || '';

      const dzCode = getVal('dzongkhagcode');
      const azCode = getVal('adminzonecode');
      const sazCode = getVal('subadminzonecode');
      const eaCode = getVal('eacode');

      if (!dzCode || !azCode || !sazCode || !eaCode) {
        parseErrors.push({
          row: rowNumber,
          reason: 'Missing one of dzongkhagCode/adminZoneCode/subAdminZoneCode/eaCode',
        });
        continue;
      }

      const eaId = await this.resolveEnumerationAreaByCodes(
        dzCode,
        azCode,
        sazCode,
        eaCode,
      );

      if (!eaId) {
        parseErrors.push({
          row: rowNumber,
          reason: `Enumeration area not found for codes dzongkhag=${dzCode}, admin=${azCode}, subAdmin=${sazCode}, ea=${eaCode}`,
        });
        continue;
      }

      for (const { surveyId, idx } of surveyIdColumns) {
        const raw = row[idx];
        if (raw === undefined || raw === null || raw === '') continue;
        const count = Number(raw);
        if (!Number.isFinite(count) || count < 0) continue;
        if (count === 0) continue;

        items.push({
          enumerationAreaId: eaId,
          surveyId,
          householdCount: count,
        });
      }
    }

    if (items.length === 0) {
      return {
        parseErrors:
          parseErrors.length > 0
            ? parseErrors
            : [{ row: 0, reason: 'No valid items found in CSV (counts must be > 0)' }],
        bulkResult: null,
      };
    }

    // Reject the whole upload if any EA resolution failed
    if (parseErrors.length > 0) {
      return {
        parseErrors,
        bulkResult: null,
      };
    }

    const bulkResult = await this.bulkUploadHouseholdCounts({ items }, userId);
    return {
      parseErrors,
      bulkResult,
    };
  }

  private async resolveEnumerationAreaByCodes(
    dzongkhagCode: string,
    adminZoneCode: string,
    subAdminZoneCode: string,
    eaCode: string,
  ): Promise<number | null> {
    const dz = await Dzongkhag.findOne({
      where: { areaCode: { [Op.or]: this.codeVariants(dzongkhagCode) } },
    });
    if (!dz) return null;

    const az = await AdministrativeZone.findOne({
      where: {
        dzongkhagId: dz.id,
        areaCode: { [Op.or]: this.codeVariants(adminZoneCode) },
      },
    });
    if (!az) return null;

    const saz = await SubAdministrativeZone.findOne({
      where: {
        administrativeZoneId: az.id,
        areaCode: { [Op.or]: this.codeVariants(subAdminZoneCode) },
      },
    });
    if (!saz) return null;

    // Find EA by areaCode and check if it's linked to this SAZ via junction table
    // Only get active EAs (not survey-linked, so filter by isActive)
    const ea = await EnumerationArea.findOne({
      where: {
        areaCode: { [Op.or]: this.codeVariants(eaCode) },
        isActive: true,
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          where: { id: saz.id },
          through: { attributes: [] },
        },
      ],
    });
    if (!ea) return null;

    return ea.id;
  }

  /**
   * Generate lookup variants to tolerate Excel-stripped leading zeros.
   * Includes:
   * - trimmed raw
   * - left-padded to length 2, 3, 4
   * - stripped-leading-zeros version
   */
  private codeVariants(code: string): string[] {
    const raw = (code ?? '').trim();
    const noZeros = raw.replace(/^0+/, '') || '0';
    const variants = new Set<string>();
    variants.add(raw);
    variants.add(noZeros);
    variants.add(raw.padStart(2, '0'));
    variants.add(raw.padStart(3, '0'));
    variants.add(raw.padStart(4, '0'));
    return Array.from(variants);
  }
}
