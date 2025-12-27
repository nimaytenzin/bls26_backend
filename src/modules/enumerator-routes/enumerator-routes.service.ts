import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { SurveyEnumerator } from '../survey/survey-enumerator/entities/survey-enumerator.entity';
import { Survey } from '../survey/survey/entities/survey.entity';
import { SurveyEnumerationArea } from '../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { EnumerationArea } from '../location/enumeration-area/entities/enumeration-area.entity';
import { SubAdministrativeZone } from '../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../location/dzongkhag/entities/dzongkhag.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey/survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from '../survey/survey-enumeration-area-household-listing/dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from '../survey/survey-enumeration-area-household-listing/dto/update-survey-enumeration-area-household-listing.dto';
import { SurveySubmissionStatusResponseDto } from './dto/survey-submission-status.dto';
import { SurveyEnumerationAreaSampling } from '../sampling/entities/survey-enumeration-area-sampling.entity';
import { SurveyEnumerationAreaHouseholdSample } from '../sampling/entities/survey-enumeration-area-household-sample.entity';
import { SurveyEnumerationAreaStructure } from '../survey/survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';

@Injectable()
export class EnumeratorRoutesService {
  constructor(
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY')
    private readonly householdSampleRepository: typeof SurveyEnumerationAreaHouseholdSample,
  ) {}

  /**
   * Get all active surveys assigned to an enumerator
   * @param enumeratorId - User ID of the enumerator
   * @returns Array of surveys assigned to the enumerator
   */
  async getActiveSurveysByEnumerator(enumeratorId: number) {
    // Find all survey assignments for this enumerator
    const assignments = await this.surveyEnumeratorRepository.findAll({
      where: { userId: enumeratorId },
    });

    if (!assignments || assignments.length === 0) {
      return [];
    }

    // Extract survey IDs
    const surveyIds = assignments.map((assignment) => assignment.surveyId);

    // Fetch the surveys without any includes
    const surveys = await this.surveyRepository.findAll({
      where: {
        id: surveyIds,
        status: 'ACTIVE', // Only active surveys
      },

      order: [
        ['year', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    return surveys;
  }

  /**
   * Get survey details with enumeration areas assigned to an enumerator
   * Filters enumeration areas based on the enumerator's dzongkhag assignment
   * @param enumeratorId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Survey with enumeration area details (filtered by assigned dzongkhag)
   */
  async getSurveyDetailsWithEnumerationAreas(
    enumeratorId: number,
    surveyId: number,
  ) {
    // Verify the enumerator is assigned to this survey and get dzongkhag assignment
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId: enumeratorId,
        surveyId: surveyId,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Survey not found or not assigned to this enumerator',
      );
    }

    // Get the survey basic info
    const survey = await this.surveyRepository.findByPk(surveyId);

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    // Step 1: Get all survey enumeration areas for this survey (basic EA info only)
    const allSurveyEnumerationAreas =
      await this.surveyEnumerationAreaRepository.findAll({
        where: { surveyId },
        include: [
          {
            model: EnumerationArea,
            attributes: {
              exclude: ['geom'],
            },
          },
        ],
      });

    // Step 2: Extract all EnumerationArea IDs
    const enumerationAreaIds = allSurveyEnumerationAreas.map(
      (sea) => sea.enumerationAreaId,
    );

    // Step 3: Load EnumerationAreas with full hierarchy (SAZ via junction -> AZ -> DZ)
    // Filter SAZs by dzongkhagId at the AdministrativeZone level
    const enumerationAreas = await EnumerationArea.findAll({
      where: { id: enumerationAreaIds },
      attributes: {
        exclude: ['geom'],
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          attributes: {
            exclude: ['geom'],
          },
          include: [
            {
              model: AdministrativeZone,
              attributes: {
                exclude: ['geom'],
              },
              where: {
                dzongkhagId: assignment.dzongkhagId,
              },
              required: true, // INNER JOIN to filter by dzongkhagId
            },
          ],
        },
      ],
    });

    // Step 4: Load Dzongkhag separately
    const dzongkhag = await Dzongkhag.findByPk(assignment.dzongkhagId, {
      attributes: {
        exclude: ['geom'],
      },
    });

    // Step 5: Create a map of EnumerationArea ID -> EnumerationArea with hierarchy
    const enumerationAreaMap = new Map();
    enumerationAreas.forEach((ea) => {
      // Attach Dzongkhag to each AdministrativeZone
      ea.subAdministrativeZones?.forEach((saz) => {
        if (saz.administrativeZone && dzongkhag) {
          // Attach the Dzongkhag model instance so it gets serialized properly
          (saz.administrativeZone as any).dzongkhag = dzongkhag;
        }
      });
      enumerationAreaMap.set(ea.id, ea);
    });

    // Step 6: Filter SurveyEnumerationAreas and attach enriched EnumerationArea data
    // Only include SurveyEnumerationAreas whose EA has at least one SAZ in the assigned dzongkhag
    const filteredSurveyEAs = allSurveyEnumerationAreas
      .filter((surveyEA) => {
        const ea = enumerationAreaMap.get(surveyEA.enumerationAreaId);
        return ea && ea.subAdministrativeZones && ea.subAdministrativeZones.length > 0;
      })
      .map((surveyEA) => {
        // Attach the enriched EnumerationArea with hierarchy
        const enrichedEA = enumerationAreaMap.get(surveyEA.enumerationAreaId);
        (surveyEA as any).enumerationArea = enrichedEA;
        return surveyEA;
      });

    // Step 7: Convert to JSON format, ensuring Dzongkhag is included
    const enrichedSurveyEAs = filteredSurveyEAs.map((surveyEA) => {
      const surveyEAJson = surveyEA.toJSON();
      const eaJson = surveyEA.enumerationArea?.toJSON();
      
      // Ensure Dzongkhag is included in each AdministrativeZone
      if (eaJson?.subAdministrativeZones) {
        eaJson.subAdministrativeZones = eaJson.subAdministrativeZones.map((saz: any) => {
          if (saz.administrativeZone && dzongkhag) {
            saz.administrativeZone.dzongkhag = dzongkhag.toJSON();
          }
          return saz;
        });
      }
      
      return {
        ...surveyEAJson,
        enumerationArea: eaJson,
      };
    });

    // Combine the results
    return {
      ...survey.toJSON(),
      surveyEnumerationAreas: enrichedSurveyEAs,
    };
  }

  /**
   * Get survey enumeration area details by survey enumeration area ID
   * @param enumeratorId - User ID of the enumerator
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Survey enumeration area with full location hierarchy
   */
  async getSurveyEnumerationAreaDetails(
    enumeratorId: number,
    surveyEnumerationAreaId: number,
  ) {
    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
    );

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Verify the enumerator is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId: enumeratorId,
        surveyId: surveyEA.surveyId,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Survey enumeration area not found or not assigned to this enumerator',
      );
    }

    // Get full location hierarchy for the enumeration area
    const enumerationArea = await EnumerationArea.findByPk(
      surveyEA.enumerationAreaId,
      {
        attributes: {
          exclude: ['geom'],
        },
        include: [
          {
            model: SubAdministrativeZone,
            as: 'subAdministrativeZones',  // Via junction table
            through: { attributes: [] },
            attributes: {
              exclude: ['geom'],
            },
            include: [
              {
                model: AdministrativeZone,
                attributes: {
                  exclude: ['geom'],
                },
                include: [
                  {
                    model: Dzongkhag,
                    attributes: {
                      exclude: ['geom'],
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    );

    // Get the survey info
    const survey = await this.surveyRepository.findByPk(surveyEA.surveyId, {
      attributes: [
        'id',
        'name',
        'description',
        'year',
        'status',
        'startDate',
        'endDate',
      ],
    });

    return {
      ...surveyEA.toJSON(),
      enumerationArea: enumerationArea?.toJSON(),
      survey: survey?.toJSON(),
    };
  }

  /**
   * Create a household listing entry
   * @param userId - User ID of the enumerator/admin/supervisor
   * @param createDto - Household listing data
   * @returns Created household listing
   */
  async createHouseholdListing(
    userId: number,
    createDto: CreateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      createDto.surveyEnumerationAreaId,
    );

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Verify the user is assigned to this survey (for enumerators)
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId,
        surveyId: surveyEA.surveyId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to this survey enumeration area',
      );
    }

    // Prevent adding household listings to published enumeration areas
    if (surveyEA.isPublished) {
      throw new BadRequestException(
        'Cannot add household listing to a published survey enumeration area',
      );
    }

    // Create the household listing
    const householdListing = await this.householdListingRepository.create({
      ...createDto,
      submittedBy: userId,
    });

    // If EA is sampled but not published, reset sampling status (resample required)
    // The sampling record will be overwritten when resampling is performed
    if (surveyEA.isSampled && !surveyEA.isPublished) {
      await surveyEA.update({
        isSampled: false,
        // Keep sampledBy and sampledDate for audit trail
      });
    }

    return householdListing;
  }

  /**
   * Update a household listing entry
   * @param userId - User ID of the enumerator/admin/supervisor
   * @param id - Household listing ID
   * @param updateDto - Updated household listing data
   * @returns Updated household listing
   */
  async updateHouseholdListing(
    userId: number,
    id: number,
    updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
  ) {
    const householdListing = await this.householdListingRepository.findByPk(id);

    if (!householdListing) {
      throw new NotFoundException('Household listing not found');
    }

    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      householdListing.surveyEnumerationAreaId,
    );

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Check if the survey EA is already enumerated
    if (surveyEA.isEnumerated) {
      throw new BadRequestException(
        'Cannot edit household listing in an enumerated survey enumeration area',
      );
    }

    // Verify the user is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId,
        surveyId: surveyEA.surveyId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to this survey enumeration area',
      );
    }

    // Verify the user is the one who created it (enumerators can only edit their own entries)
    if (householdListing.submittedBy !== userId) {
      throw new ForbiddenException(
        'You can only edit household listings you created',
      );
    }

    // Update the household listing
    await householdListing.update(updateDto);

    return householdListing;
  }

  /**
   * Delete a household listing entry
   * @param userId - User ID of the enumerator/admin/supervisor
   * @param id - Household listing ID
   * @returns Deletion confirmation
   */
  async deleteHouseholdListing(userId: number, id: number) {
    const householdListing = await this.householdListingRepository.findByPk(id);

    if (!householdListing) {
      throw new NotFoundException('Household listing not found');
    }

    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      householdListing.surveyEnumerationAreaId,
    );

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Prevent deleting household listings from published enumeration areas
    if (surveyEA.isPublished) {
      throw new BadRequestException(
        'Cannot delete household listing from a published survey enumeration area',
      );
    }

    // Verify the user is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId,
        surveyId: surveyEA.surveyId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to this survey enumeration area',
      );
    }

    // Verify the user is the one who created it
    if (householdListing.submittedBy !== userId) {
      throw new ForbiddenException(
        'You can only delete household listings you created',
      );
    }

    // Delete all related household samples first (to avoid foreign key constraint violation)
    await this.householdSampleRepository.destroy({
      where: { householdListingId: id },
    });

    // Delete the household listing
    await householdListing.destroy();

    // If EA is sampled but not published, reset sampling status (resample required)
    // The sampling record will be overwritten when resampling is performed
    if (surveyEA.isSampled && !surveyEA.isPublished) {
      await surveyEA.update({
        isSampled: false,
        // Keep sampledBy and sampledDate for audit trail
      });
    }

    return { deleted: true, message: 'Household listing deleted successfully' };
  }

  /**
   * Get household listings by survey enumeration area for the enumerator
   * @param userId - User ID of the enumerator
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns List of household listings
   */
  async getHouseholdListingsBySurveyEA(
    userId: number,
    surveyEnumerationAreaId: number,
  ) {
    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
    );

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Verify the user is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId,
        surveyId: surveyEA.surveyId,
      },
    });

    if (!assignment) {
      throw new ForbiddenException(
        'You are not assigned to this survey enumeration area',
      );
    }

    // Get household listings
    const householdListings = await this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId },
      order: [['householdSerialNumber', 'ASC']],
    });

    return householdListings;
  }

  /**
   * Get survey submission status with enumeration areas grouped by geographic hierarchy
   * @param enumeratorId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Hierarchical submission status data
   */
  async getSurveySubmissionStatus(
    enumeratorId: number,
    surveyId: number,
  ): Promise<SurveySubmissionStatusResponseDto> {
    // Verify the enumerator is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId: enumeratorId,
        surveyId: surveyId,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Survey not found or not assigned to this enumerator',
      );
    }

    // Get survey details
    const survey = await this.surveyRepository.findByPk(surveyId, {
      attributes: ['id', 'name', 'year', 'status', 'startDate', 'endDate'],
    });

    if (!survey) {
      throw new NotFoundException('Survey not found');
    }

    // Step 1: Get all survey enumeration areas with submission status
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: [
        'id',
        'enumerationAreaId',
        'isEnumerated',
        'isSampled',
        'isPublished',
        'enumerationDate',
        'sampledDate',
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
          startDate: survey.startDate,
          endDate: survey.endDate,
        },
        overallSummary: {
          totalDzongkhags: 0,
          totalAdministrativeZones: 0,
          totalSubAdministrativeZones: 0,
          totalEnumerationAreas: 0,
          enumeratedEnumerationAreas: 0,
          sampledEnumerationAreas: 0,
          publishedEnumerationAreas: 0,
          pendingEnumerationAreas: 0,
          enumerationPercentage: '0.00',
          samplingPercentage: '0.00',
          publishingPercentage: '0.00',
          totalHouseholds: 0,
          totalMale: 0,
          totalFemale: 0,
          totalPopulation: 0,
        },
        hierarchy: [],
      };
    }

    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);

    // Step 2: Get household counts for each survey enumeration area
    const surveyEAIds = surveyEAs.map((sea) => sea.id);
    const householdListings = await this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId: surveyEAIds },
      attributes: ['surveyEnumerationAreaId', 'totalMale', 'totalFemale'],
    });

    // Group household data by survey enumeration area
    const householdDataMap = new Map<
      number,
      { count: number; totalMale: number; totalFemale: number }
    >();
    householdListings.forEach((hh) => {
      const existing = householdDataMap.get(hh.surveyEnumerationAreaId) || {
        count: 0,
        totalMale: 0,
        totalFemale: 0,
      };
      householdDataMap.set(hh.surveyEnumerationAreaId, {
        count: existing.count + 1,
        totalMale: existing.totalMale + (hh.totalMale || 0),
        totalFemale: existing.totalFemale + (hh.totalFemale || 0),
      });
    });

    // Step 3: Get enumeration areas with SAZs via junction table
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
    const dzongkhags = await Dzongkhag.findAll({
      where: { id: dzongkhagIds },
      attributes: {
        exclude: ['geom'],
      },
    });

    // Create lookup maps
    const dzongkhagMap = new Map(dzongkhags.map((d) => [d.id, d]));
    const adminZoneMap = new Map(adminZones.map((az) => [az.id, az]));
    const subAdminZoneMap = new Map(subAdminZones.map((saz) => [saz.id, saz]));
    const enumerationAreaMap = new Map(
      enumerationAreas.map((ea) => [ea.id, ea]),
    );
    const surveyEAMap = new Map(
      surveyEAs.map((sea) => [sea.enumerationAreaId, sea]),
    );

    // Build hierarchical structure with submission status
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

      const surveyEA = surveyEAMap.get(ea.id);
      if (!surveyEA) return;

      const householdData = householdDataMap.get(surveyEA.id) || {
        count: 0,
        totalMale: 0,
        totalFemale: 0,
      };

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

      // Add enumeration area with submission data
      subAdminZoneData.enumerationAreas.push({
        id: ea.id,
        name: ea.name,
        areaCode: ea.areaCode,
        surveyEnumerationAreaId: surveyEA.id,
        isEnumerated: surveyEA.isEnumerated,
        isSampled: surveyEA.isSampled,
        isPublished: surveyEA.isPublished,
        enumerationDate: surveyEA.enumerationDate,
        sampledDate: surveyEA.sampledDate,
        publishedDate: surveyEA.publishedDate,
        householdCount: householdData.count,
        totalMale: householdData.totalMale,
        totalFemale: householdData.totalFemale,
        totalPopulation: householdData.totalMale + householdData.totalFemale,
      });
      }); // Close sazIds.forEach
    }); // Close enumerationAreas.forEach

    // Convert maps to arrays and calculate summaries
    const hierarchy = Array.from(hierarchyMap.values()).map((dzongkhag) => {
      const administrativeZones = Array.from(
        dzongkhag.administrativeZones.values(),
      ).map((adminZone: any) => {
        const subAdministrativeZones = Array.from(
          adminZone.subAdministrativeZones.values(),
        ).map((subAdminZone: any) => {
          // Calculate sub-admin zone summary
          const subAdminSummary = {
            totalEnumerationAreas: subAdminZone.enumerationAreas.length,
            enumeratedEnumerationAreas: subAdminZone.enumerationAreas.filter(
              (ea: any) => ea.isEnumerated,
            ).length,
            sampledEnumerationAreas: subAdminZone.enumerationAreas.filter(
              (ea: any) => ea.isSampled,
            ).length,
            publishedEnumerationAreas: subAdminZone.enumerationAreas.filter(
              (ea: any) => ea.isPublished,
            ).length,
            totalHouseholds: subAdminZone.enumerationAreas.reduce(
              (sum: number, ea: any) => sum + ea.householdCount,
              0,
            ),
            totalPopulation: subAdminZone.enumerationAreas.reduce(
              (sum: number, ea: any) => sum + (ea.totalPopulation || 0),
              0,
            ),
          };

          return {
            ...subAdminZone,
            summary: subAdminSummary,
          };
        });

        // Calculate admin zone summary
        const adminSummary = {
          totalSubAdministrativeZones: subAdministrativeZones.length,
          totalEnumerationAreas: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.totalEnumerationAreas,
            0,
          ),
          enumeratedEnumerationAreas: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.enumeratedEnumerationAreas,
            0,
          ),
          sampledEnumerationAreas: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.sampledEnumerationAreas,
            0,
          ),
          publishedEnumerationAreas: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.publishedEnumerationAreas,
            0,
          ),
          totalHouseholds: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.totalHouseholds,
            0,
          ),
          totalPopulation: subAdministrativeZones.reduce(
            (sum, saz) => sum + saz.summary.totalPopulation,
            0,
          ),
        };

        return {
          id: adminZone.id,
          name: adminZone.name,
          areaCode: adminZone.areaCode,
          type: adminZone.type,
          subAdministrativeZones,
          summary: adminSummary,
        };
      });

      // Calculate dzongkhag summary
      const dzongkhagSummary = {
        totalAdministrativeZones: administrativeZones.length,
        totalSubAdministrativeZones: administrativeZones.reduce(
          (sum, az) => sum + az.summary.totalSubAdministrativeZones,
          0,
        ),
        totalEnumerationAreas: administrativeZones.reduce(
          (sum, az) => sum + az.summary.totalEnumerationAreas,
          0,
        ),
        enumeratedEnumerationAreas: administrativeZones.reduce(
          (sum, az) => sum + az.summary.enumeratedEnumerationAreas,
          0,
        ),
        sampledEnumerationAreas: administrativeZones.reduce(
          (sum, az) => sum + az.summary.sampledEnumerationAreas,
          0,
        ),
        publishedEnumerationAreas: administrativeZones.reduce(
          (sum, az) => sum + az.summary.publishedEnumerationAreas,
          0,
        ),
        totalHouseholds: administrativeZones.reduce(
          (sum, az) => sum + az.summary.totalHouseholds,
          0,
        ),
        totalPopulation: administrativeZones.reduce(
          (sum, az) => sum + az.summary.totalPopulation,
          0,
        ),
      };

      return {
        id: dzongkhag.id,
        name: dzongkhag.name,
        areaCode: dzongkhag.areaCode,
        administrativeZones,
        summary: dzongkhagSummary,
      };
    });

    // Calculate overall summary
    const totalEAs = surveyEAs.length;
    const enumeratedEAs = surveyEAs.filter((sea) => sea.isEnumerated).length;
    const sampledEAs = surveyEAs.filter((sea) => sea.isSampled).length;
    const publishedEAs = surveyEAs.filter((sea) => sea.isPublished).length;
    const totalHouseholds = hierarchy.reduce(
      (sum, d) => sum + d.summary.totalHouseholds,
      0,
    );
    const totalPopulation = hierarchy.reduce(
      (sum, d) => sum + d.summary.totalPopulation,
      0,
    );

    let totalMale = 0;
    let totalFemale = 0;
    householdDataMap.forEach((data) => {
      totalMale += data.totalMale;
      totalFemale += data.totalFemale;
    });

    const overallSummary = {
      totalDzongkhags: hierarchy.length,
      totalAdministrativeZones: hierarchy.reduce(
        (sum, d) => sum + d.summary.totalAdministrativeZones,
        0,
      ),
      totalSubAdministrativeZones: hierarchy.reduce(
        (sum, d) => sum + d.summary.totalSubAdministrativeZones,
        0,
      ),
      totalEnumerationAreas: totalEAs,
      enumeratedEnumerationAreas: enumeratedEAs,
      sampledEnumerationAreas: sampledEAs,
      publishedEnumerationAreas: publishedEAs,
      pendingEnumerationAreas: totalEAs - enumeratedEAs,
      enumerationPercentage:
        totalEAs > 0 ? ((enumeratedEAs / totalEAs) * 100).toFixed(2) : '0.00',
      samplingPercentage:
        enumeratedEAs > 0 ? ((sampledEAs / enumeratedEAs) * 100).toFixed(2) : '0.00',
      publishingPercentage:
        sampledEAs > 0 ? ((publishedEAs / sampledEAs) * 100).toFixed(2) : '0.00',
      totalHouseholds,
      totalMale,
      totalFemale,
      totalPopulation,
    };

    return {
      survey: {
        id: survey.id,
        name: survey.name,
        year: survey.year,
        status: survey.status,
        startDate: survey.startDate,
        endDate: survey.endDate,
      },
      overallSummary,
      hierarchy,
    };
  }

  /**
   * Get sampling results for an enumeration area with structure geolocation
   * @param enumeratorId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Sampling results with selected households and structure coordinates
   */
  async getSamplingResultsForEnumerator(
    enumeratorId: number,
    surveyId: number,
    surveyEnumerationAreaId: number,
  ) {
    // Verify the enumerator is assigned to this survey
    const assignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId: enumeratorId,
        surveyId: surveyId,
      },
    });

    if (!assignment) {
      throw new NotFoundException(
        'Survey not found or not assigned to this enumerator',
      );
    }

    // Get the survey enumeration area
    const surveyEA = await this.surveyEnumerationAreaRepository.findOne({
      where: {
        id: surveyEnumerationAreaId,
        surveyId,
      },
    });

    if (!surveyEA) {
      throw new NotFoundException('Survey enumeration area not found');
    }

    // Check if sampling exists
    const sampling = await SurveyEnumerationAreaSampling.findOne({
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
                'structureId',
                'householdIdentification',
                'householdSerialNumber',
                'nameOfHOH',
                'totalMale',
                'totalFemale',
                'phoneNumber',
                'remarks',
              ],
            },
          ],
          order: [['selectionOrder', 'ASC']],
        },
      ],
    });

    if (!sampling) {
      throw new NotFoundException(
        'No sampling results found for this enumeration area',
      );
    }

    // Get structure geolocation for each selected household
    const selectedHouseholdsWithGeolocation = await Promise.all(
      sampling.samples.map(async (sample) => {
        const household = sample.householdListing;

        // Get structure data if structureId exists
        let structure = null;
        if (household.structureId) {
          structure = await SurveyEnumerationAreaStructure.findByPk(
            household.structureId,
            {
              attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
            },
          );
        } 

        return {
          selectionOrder: sample.selectionOrder,
          isReplacement: sample.isReplacement,
          household: {
            id: household.id,
            householdIdentification: household.householdIdentification,
            householdSerialNumber: household.householdSerialNumber,
            nameOfHOH: household.nameOfHOH,
            totalMale: household.totalMale,
            totalFemale: household.totalFemale,
            phoneNumber: household.phoneNumber,
            remarks: household.remarks,
          },
          structure: structure
            ? {
                id: structure.id,
                structureNumber: structure.structureNumber,
                latitude: structure.latitude ? parseFloat(structure.latitude.toString()) : null,
                longitude: structure.longitude ? parseFloat(structure.longitude.toString()) : null,
              }
            : null,
        };
      }),
    );

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
          executedAt: sampling.executedAt,
          executedBy: sampling.executedBy,
        },
        selectedHouseholds: selectedHouseholdsWithGeolocation,
      },
    };
  }
}
