import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from './dto/update-survey-enumeration-area-household-listing.dto';
import { CreateBlankHouseholdListingsDto } from './dto/create-blank-household-listings.dto';
import {
  CurrentHouseholdListingResponseDto,
  CurrentHouseholdListingStatus,
} from './dto/current-household-listing-response.dto';
import { HouseholdListingStatisticsResponseDto } from './dto/household-listing-statistics-response.dto';
import { SurveyEnumerationAreaHouseholdListing } from './entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationAreaStructure } from '../survey-enumeration-area-structure/entities/survey-enumeration-area-structure.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from '../../location/dzongkhag/entities/dzongkhag.entity';
import { User, UserRole } from 'src/modules/auth/entities/user.entity';
import {
  PaginationUtil,
  PaginationQueryDto,
  PaginatedResponse,
} from '../../../common/utils/pagination.util';
import * as archiver from 'archiver';
import { SupervisorHelperService } from '../../auth/services/supervisor-helper.service';
import { ForbiddenException } from '@nestjs/common';
import { SurveyEnumerationAreaHouseholdSample } from '../../sampling/entities/survey-enumeration-area-household-sample.entity';
import { SurveyEnumerationAreaSampling } from '../../sampling/entities/survey-enumeration-area-sampling.entity';
import { Op } from 'sequelize';

@Injectable()
export class SurveyEnumerationAreaHouseholdListingService {
  constructor(
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('SURVEY_ENUMERATION_AREA_STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof SurveyEnumerationAreaStructure,
    @Inject('SURVEY_EA_SAMPLING_REPOSITORY')
    private readonly surveyEnumerationAreaSamplingRepository: typeof SurveyEnumerationAreaSampling,
    @Inject('SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY')
    private readonly householdSampleRepository: typeof SurveyEnumerationAreaHouseholdSample,
    @Inject('ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly administrativeZoneRepository: typeof AdministrativeZone,
    @Inject('SUB_ADMINISTRATIVE_ZONE_REPOSITORY')
    private readonly subAdministrativeZoneRepository: typeof SubAdministrativeZone,
    private readonly supervisorHelperService: SupervisorHelperService,
  ) {}

  /**
   * Create a new household listing
   * @param createDto
   */
  async create(
    createDto: CreateSurveyEnumerationAreaHouseholdListingDto,
  ): Promise<SurveyEnumerationAreaHouseholdListing> {
    // If householdSerialNumber is not provided, auto-generate it per structure
    if (!createDto.householdSerialNumber && createDto.structureId) {
      // Get the maximum household serial number for this structure in this survey enumeration area
      const existingListings = await this.householdListingRepository.findAll({
        where: {
          surveyEnumerationAreaId: createDto.surveyEnumerationAreaId,
          structureId: createDto.structureId,
        },
        attributes: ['householdSerialNumber'],
        order: [['householdSerialNumber', 'DESC']],
        limit: 1,
      });

      // Determine next serial number (starts from 1 for each structure)
      createDto.householdSerialNumber =
        existingListings.length > 0
          ? existingListings[0].householdSerialNumber + 1
          : 1;
    }

    try {
      return await this.householdListingRepository.create(createDto as any);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Household with serial number ${createDto.householdSerialNumber} already exists for structure ${createDto.structureId} in this survey enumeration area`,
        );
      }
      throw error;
    }
  }

  /**
   * Get all household listings with optional filters
   * @param surveyEnumerationAreaId
   */
  async findAll(
    surveyEnumerationAreaId?: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    const whereClause: any = {};

    if (surveyEnumerationAreaId !== undefined) {
      whereClause.surveyEnumerationAreaId = surveyEnumerationAreaId;
    }

    return await this.householdListingRepository.findAll({
      where: whereClause,
      include: [
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
        },
        {
          model: SurveyEnumerationAreaStructure,
          attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
        },
      ],
      order: [['householdSerialNumber', 'ASC']],
    });
  }

  /**
   * Get household listings by survey enumeration area
   * @param surveyEnumerationAreaId
   */
  async findBySurveyEnumerationArea(
    surveyEnumerationAreaId: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    return this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId: surveyEnumerationAreaId },
      include: [
        {
          model: User,
          as: 'submitter',
        },
        {
          model: SurveyEnumerationAreaStructure,
          attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
        },
      
        {
          model:SurveyEnumerationAreaStructure
        }
      ],
    });
  }

  /**
   * Get paginated household listings by survey enumeration area
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @param query - Pagination query parameters
   * @returns Paginated response with household listings
   */
  async findBySurveyEnumerationAreaPaginated(
    surveyEnumerationAreaId: number,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<SurveyEnumerationAreaHouseholdListing>> {
    // Normalize pagination options
    const options = PaginationUtil.normalizePaginationOptions(query);

    // Calculate offset and limit
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Build order clause - default to createdAt DESC (latest to oldest)
    const order = options.sortBy
      ? PaginationUtil.buildOrderClause(options, 'createdAt')
      : [['createdAt', 'DESC']];

    // Fetch data with count
    // Note: SurveyEnumerationAreaStructure is excluded to avoid Sequelize eager loading error
    // with SurveyEnumerationArea's multiple User associations (enumerator, sampler, publisher)
    const { rows, count } = await this.householdListingRepository.findAndCountAll(
      {
        where: { surveyEnumerationAreaId },
        include: [
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'name', 'phoneNumber', 'cid'],
          },
        ],
        order,
        offset,
        limit,
        distinct: true, // Count distinct household listings, not rows from JOIN
      },
    );

    // Return paginated response
    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }

  /**
   * Get all household listings for a survey (across all enumeration areas)
   * @param surveyId
   */
  async findBySurvey(
    surveyId: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    return await this.householdListingRepository.findAll({
      include: [
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
          where: { surveyId },
          required: true,
        },
      ],
      order: [
        [
          { model: SurveyEnumerationArea, as: 'surveyEnumerationArea' },
          'enumerationAreaId',
          'ASC',
        ],
        ['householdSerialNumber', 'ASC'],
      ],
    });
  }

  /**
   * Get paginated household listings for a survey (across all enumeration areas)
   * @param surveyId - Survey ID
   * @param query - Pagination query parameters
   * @returns Paginated response with household listings
   */
  async findBySurveyPaginated(
    surveyId: number,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<SurveyEnumerationAreaHouseholdListing>> {
    // Normalize pagination options
    const options = PaginationUtil.normalizePaginationOptions(query);

    // Calculate offset and limit
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Build order clause - default to createdAt DESC (latest to oldest)
    const order = options.sortBy
      ? PaginationUtil.buildOrderClause(options, 'createdAt')
      : [['createdAt', 'DESC']];

    // Fetch data with count
    const { rows, count } = await this.householdListingRepository.findAndCountAll(
      {
        include: [
          {
            model: SurveyEnumerationArea,
            attributes: ['id', 'surveyId', 'enumerationAreaId'],
            where: { surveyId },
            required: true,
          },
        ],
        order,
        offset,
        limit,
        distinct: true, // Count distinct household listings, not rows from JOIN
      },
    );

    // Return paginated response
    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }

  /**
   * Get statistics for an entire survey for supervisor (with access check)
   * Only includes households from enumeration areas the supervisor has access to
   * @param supervisorId
   * @param surveyId
   * @returns Household listing statistics for the survey
   */
  async getStatisticsBySurveyForSupervisor(
    supervisorId: number,
    surveyId: number,
  ): Promise<HouseholdListingStatisticsResponseDto> {
    // Get supervisor's dzongkhag IDs
    const dzongkhagIds =
      await this.supervisorHelperService.getSupervisorDzongkhagIds(supervisorId);

    if (dzongkhagIds.length === 0) {
      throw new ForbiddenException(
        'You do not have access to any dzongkhags',
      );
    }

    // Get all enumeration areas in the survey
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: ['id', 'enumerationAreaId'],
    });

    if (surveyEAs.length === 0) {
      return {
        totalHouseholds: 0,
        totalMale: 0,
        totalFemale: 0,
        totalPopulation: 0,
        householdsWithPhone: 0,
        averageHouseholdSize: '0.00',
        totalEnumerationAreas: 0,
      };
    }

    // Get enumeration area IDs and check which ones belong to supervisor's dzongkhags
    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);
    const enumerationAreas = await this.enumerationAreaRepository.findAll({
      where: { id: enumerationAreaIds },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          include: [
            {
              model: AdministrativeZone,
              attributes: ['id', 'dzongkhagId'],
            },
          ],
        },
      ],
    });

    // Filter to only EAs that belong to supervisor's dzongkhags
    const accessibleEAIds = new Set<number>();
    enumerationAreas.forEach((ea) => {
      const hasAccess = ea.subAdministrativeZones?.some((saz) => {
        const az = saz.administrativeZone;
        return az && dzongkhagIds.includes(az.dzongkhagId);
      });
      if (hasAccess) {
        accessibleEAIds.add(ea.id);
      }
    });

    // Get survey EA IDs that the supervisor has access to
    const accessibleSurveyEAIds = surveyEAs
      .filter((sea) => accessibleEAIds.has(sea.enumerationAreaId))
      .map((sea) => sea.id);

    if (accessibleSurveyEAIds.length === 0) {
      return {
        totalHouseholds: 0,
        totalMale: 0,
        totalFemale: 0,
        totalPopulation: 0,
        householdsWithPhone: 0,
        averageHouseholdSize: '0.00',
        totalEnumerationAreas: 0,
      };
    }

    // Get household listings for accessible survey EAs
    const listings = await this.householdListingRepository.findAll({
      where: {
        surveyEnumerationAreaId: { [Op.in]: accessibleSurveyEAIds },
      },
      include: [
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'enumerationAreaId'],
        },
      ],
    });

    const totalHouseholds = listings.length;
    const totalMale = listings.reduce((sum, h) => sum + h.totalMale, 0);
    const totalFemale = listings.reduce((sum, h) => sum + h.totalFemale, 0);
    const totalPopulation = totalMale + totalFemale;

    const householdsWithPhone = listings.filter(
      (h) => h.phoneNumber && h.phoneNumber.trim() !== '',
    ).length;

    // Count unique enumeration areas
    const uniqueEAs = new Set(
      listings.map((l) => l.surveyEnumerationArea?.enumerationAreaId).filter(Boolean),
    );

    return {
      totalHouseholds,
      totalMale,
      totalFemale,
      totalPopulation,
      householdsWithPhone,
      averageHouseholdSize:
        totalHouseholds > 0
          ? (totalPopulation / totalHouseholds).toFixed(2)
          : '0.00',
      totalEnumerationAreas: uniqueEAs.size,
    };
  }

  /**
   * Get single household listing by ID
   * @param id
   */
  async findOne(id: number): Promise<SurveyEnumerationAreaHouseholdListing> {
    const listing = await this.householdListingRepository.findByPk(id, {
      include: [
        {
          model: SurveyEnumerationArea,
        },
      ],
    });

    if (!listing) {
      throw new BadRequestException(
        `Household listing with ID ${id} not found`,
      );
    }

    return listing;
  }

  /**
   * Get household listings by structure ID
   * @param structureId - Structure ID
   * @returns Array of household listings for the structure
   */
  async findByStructure(
    structureId: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    return this.householdListingRepository.findAll({
      where: { structureId },
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'phoneNumber', 'cid'],
        },
        {
          model: SurveyEnumerationAreaStructure,
          attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
        },
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
        },
      ],
      order: [['householdSerialNumber', 'ASC']],
    });
  }

  /**
   * Get statistics for a survey enumeration area
   * @param surveyEnumerationAreaId
   * @returns Household listing statistics for the enumeration area
   */
  async getStatistics(
    surveyEnumerationAreaId: number,
  ): Promise<HouseholdListingStatisticsResponseDto> {
    const listings = await this.findBySurveyEnumerationArea(
      surveyEnumerationAreaId,
    );

    const totalHouseholds = listings.length;
    const totalMale = listings.reduce((sum, h) => sum + h.totalMale, 0);
    const totalFemale = listings.reduce((sum, h) => sum + h.totalFemale, 0);
    const totalPopulation = totalMale + totalFemale;

    const householdsWithPhone = listings.filter(
      (h) => h.phoneNumber && h.phoneNumber.trim() !== '',
    ).length;

    return {
      totalHouseholds,
      totalMale,
      totalFemale,
      totalPopulation,
      householdsWithPhone,
      averageHouseholdSize:
        totalHouseholds > 0
          ? (totalPopulation / totalHouseholds).toFixed(2)
          : '0.00',
    };
  }

  /**
   * Get statistics for an entire survey (across all enumeration areas)
   * @param surveyId
   * @returns Household listing statistics for the entire survey
   */
  async getStatisticsBySurvey(
    surveyId: number,
  ): Promise<HouseholdListingStatisticsResponseDto> {
    const listings = await this.findBySurvey(surveyId);

    const totalHouseholds = listings.length;
    const totalMale = listings.reduce((sum, h) => sum + h.totalMale, 0);
    const totalFemale = listings.reduce((sum, h) => sum + h.totalFemale, 0);
    const totalPopulation = totalMale + totalFemale;

    const householdsWithPhone = listings.filter(
      (h) => h.phoneNumber && h.phoneNumber.trim() !== '',
    ).length;

    // Count unique enumeration areas
    const uniqueEAs = new Set(
      listings.map((l) => l.surveyEnumerationArea.enumerationAreaId),
    );

    return {
      totalHouseholds,
      totalMale,
      totalFemale,
      totalPopulation,
      householdsWithPhone,
      averageHouseholdSize:
        totalHouseholds > 0
          ? (totalPopulation / totalHouseholds).toFixed(2)
          : '0.00',
      totalEnumerationAreas: uniqueEAs.size,
    };
  }

  /**
   * Update household listing
   * @param id
   * @param updateDto
   */
  async update(
    id: number,
    updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
  ): Promise<SurveyEnumerationAreaHouseholdListing> {
    try {
      const [numRows] = await this.householdListingRepository.update(
        updateDto as any,
        { where: { id } },
      );

      if (numRows === 0) {
        throw new BadRequestException(
          `Household listing with ID ${id} not found`,
        );
      }

      return this.findOne(id);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Household with this serial number already exists for this survey enumeration area`,
        );
      }
      throw error;
    }
  }

  /**
   * Remove household listing
   * @param id
   */
  async remove(id: number): Promise<{ deleted: boolean }> {
    const deleted = await this.householdListingRepository.destroy({
      where: { id },
    });

    if (deleted === 0) {
      throw new BadRequestException(
        `Household listing with ID ${id} not found`,
      );
    }

    return { deleted: true };
  }

  /**
   * Bulk create household listings
   * @param listings
   */
  async bulkCreate(
    listings: CreateSurveyEnumerationAreaHouseholdListingDto[],
  ): Promise<{
    success: number;
    failed: number;
    created: SurveyEnumerationAreaHouseholdListing[];
    errors: any[];
  }> {
    const created: SurveyEnumerationAreaHouseholdListing[] = [];
    const errors: any[] = [];

    for (const listing of listings) {
      try {
        const result = await this.create(listing);
        created.push(result);
      } catch (error) {
        errors.push({
          listing,
          error: error.message,
        });
      }
    }

    return {
      success: created.length,
      failed: errors.length,
      created,
      errors,
    };
  }

  /**
   * Create blank household listing entries for historical surveys
   * Creates placeholder entries with sequential serial numbers
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @param dto - DTO containing count and optional remarks
   * @param userId - User ID creating the entries
   */
  async createBlankHouseholdListings(
    surveyEnumerationAreaId: number,
    dto: CreateBlankHouseholdListingsDto,
    userId: number,
  ): Promise<{
    success: boolean;
    message: string;
    created: number;
    listings: SurveyEnumerationAreaHouseholdListing[];
  }> {
    // Verify survey enumeration area exists
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
      {
        attributes: ['id', 'surveyId', 'enumerationAreaId'],
      },
    );

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey enumeration area with ID ${surveyEnumerationAreaId} not found`,
      );
    }

    // Default remarks
    const defaultRemarks =
      dto.remarks || 'No data available - Historical survey entry';

    // Create structures and household listings
    const created: SurveyEnumerationAreaHouseholdListing[] = [];
    
    for (let i = 0; i < dto.count; i++) {
      // Each structure gets a unique structure number, but household serial numbers start at 1 per structure
      const structureCounter = i + 1;
      const structureNumber = `STR-${structureCounter.toString().padStart(4, '0')}`;
      
      // Create structure first
      const structure = await this.structureRepository.create({
        surveyEnumerationAreaId,
        structureNumber,
        latitude: null,
        longitude: null,
      } as any);

      // Get the maximum household serial number for this structure (should be 0 for new structure)
      const existingListings = await this.householdListingRepository.findAll({
        where: {
          surveyEnumerationAreaId,
          structureId: structure.id,
        },
        attributes: ['householdSerialNumber'],
        order: [['householdSerialNumber', 'DESC']],
        limit: 1,
      });

      // Determine next serial number for this structure (starts from 1 for each structure)
      const householdSerialNumber =
        existingListings.length > 0
          ? existingListings[0].householdSerialNumber + 1
          : 1;

      // Create household listing linked to structure
      const listing = await this.householdListingRepository.create({
        surveyEnumerationAreaId,
        structureId: structure.id,
        householdIdentification: `HH-${structureCounter.toString().padStart(4, '0')}`,
        householdSerialNumber: householdSerialNumber,
        nameOfHOH: 'Not Available',
        totalMale: 0,
        totalFemale: 0,
        phoneNumber: null,
        remarks: defaultRemarks,
        submittedBy: userId,
      } as any);

      created.push(listing);
    }

    return {
      success: true,
      message: `Successfully created ${dto.count} blank household listing entries`,
      created: created.length,
      listings: created,
    };
  }

  /**
   * Generate CSV template for household listing submission
   * Pre-populated with surveyEnumerationAreaId
   * @param surveyEnumerationAreaId - The survey enumeration area ID to pre-populate
   */
  async generateCSVTemplate(surveyEnumerationAreaId: number): Promise<string> {
    // Fetch the survey enumeration area to get surveyId
    const surveyEA = await SurveyEnumerationArea.findByPk(
      surveyEnumerationAreaId,
      {
        attributes: ['id', 'surveyId', 'enumerationAreaId'],
      },
    );

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${surveyEnumerationAreaId} not found`,
      );
    }

    const headers = [
      'surveyEnumerationAreaId',
      'surveyId',
      'enumerationAreaId',
      'structureId',
      'structureNumber',
      'householdIdentification',
      'householdSerialNumber',
      'nameOfHOH',
      'totalMale',
      'totalFemale',
      'phoneNumber',
      'remarks',
    ];

    // Pre-populate first row with IDs
    const prePopulatedRow = [
      surveyEA.id,
      surveyEA.surveyId,
      surveyEA.enumerationAreaId,
      '', // structureId
      '', // structureNumber
      '', // householdIdentification
      '', // householdSerialNumber
      '', // nameOfHOH
      '', // totalMale
      '', // totalFemale
      '', // phoneNumber
      '', // remarks
    ];

    return `${headers.join(',')}\n${prePopulatedRow.join(',')}`;
  }

  /**
   * Get current (most recent validated) household listings for an enumeration area
   * Implements workflow: Find all surveys → Order by newest → Return first validated data
   * @param enumerationAreaId - The enumeration area ID
   * @returns CurrentHouseholdListingResponseDto with status and data
   */
  async getCurrentHouseholdListings(
    enumerationAreaId: number,
  ): Promise<CurrentHouseholdListingResponseDto> {
    // Step 1: Find all surveys containing this enumeration area
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { enumerationAreaId },
      include: [
        {
          model: Survey,
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
        },
        {
          model:SurveyEnumerationAreaStructure
        }
      ],
      order: [[{ model: Survey, as: 'survey' }, 'startDate', 'DESC']],
    });

    // Step 2: Check if any surveys found
    if (!surveyEAs || surveyEAs.length === 0) {
      return {
        status: CurrentHouseholdListingStatus.NO_DATA,
        message: 'No surveys available for this enumeration area',
        metadata: {
          totalSurveysChecked: 0,
        },
      };
    }

    let totalSurveysChecked = 0;
    let latestSurveyInfo = null;

    // Step 3: Loop through surveys (newest to oldest)
    for (const surveyEA of surveyEAs) {
      totalSurveysChecked++;

      // Save info about the latest survey for metadata
      if (!latestSurveyInfo && surveyEA.survey) {
        latestSurveyInfo = {
          surveyName: surveyEA.survey.name,
          year: surveyEA.survey.year,
          status: surveyEA.survey.status,
          reason: '',
        };
      }

      // Step 4: Check publishing status
      if (surveyEA.isPublished) {
        // PUBLISHED - Fetch household listings
        const households = await this.householdListingRepository.findAll({
          where: { surveyEnumerationAreaId: surveyEA.id },
          include: [
            {
              model: SurveyEnumerationAreaStructure,
              attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
            },
          ],
          order: [['householdSerialNumber', 'ASC']],
        });

        // Get enumeration area details
        const enumerationArea = await this.enumerationAreaRepository.findByPk(
          enumerationAreaId,
        );

        // Check if households exist
        if (!households || households.length === 0) {
          return {
            status: CurrentHouseholdListingStatus.VALIDATED_BUT_EMPTY,
            message: `Survey "${surveyEA.survey.name}" (${surveyEA.survey.year}) is published but contains no household listings for this enumeration area`,
            data: {
              survey: surveyEA.survey,
              enumerationArea: enumerationArea,
              surveyEnumerationArea: surveyEA,
              householdListings: [],
              statistics: {
                totalHouseholds: 0,
                totalMale: 0,
                totalFemale: 0,
                totalPopulation: 0,
                averageHouseholdSize: '0.00',
                validatedDate: surveyEA.publishedDate,
              },
            },
            metadata: {
              totalSurveysChecked,
            },
          };
        }

        // Calculate statistics
        const totalHouseholds = households.length;
        const totalMale = households.reduce(
          (sum, h) => sum + (h.totalMale || 0),
          0,
        );
        const totalFemale = households.reduce(
          (sum, h) => sum + (h.totalFemale || 0),
          0,
        );
        const totalPopulation = totalMale + totalFemale;

        console.log(surveyEA);

        // SUCCESS - Return published data
        return {
          status: CurrentHouseholdListingStatus.SUCCESS,
          message: `Found published household data from survey "${surveyEA.survey.name}" (${surveyEA.survey.year})`,
          data: {
            survey: surveyEA.survey,
            surveyEnumerationArea: surveyEA,
            enumerationArea: enumerationArea,
            householdListings: households,
            statistics: {
              totalHouseholds,
              totalMale,
              totalFemale,
              totalPopulation,
              averageHouseholdSize:
                totalHouseholds > 0
                  ? (totalPopulation / totalHouseholds).toFixed(2)
                  : '0.00',
              validatedDate: surveyEA.publishedDate,
            },
          },
          metadata: {
            totalSurveysChecked,
          },
        };
      } else {
        // NOT PUBLISHED - Skip and continue to next survey
        if (latestSurveyInfo && !latestSurveyInfo.reason) {
          latestSurveyInfo.reason = 'Data not published';
        }
        continue;
      }
    }

    // Step 5: No published data found in any survey
    return {
      status: CurrentHouseholdListingStatus.NO_DATA,
      message: `All ${totalSurveysChecked} survey(s) checked, but none have published household data for this enumeration area`,
      metadata: {
        latestSurvey: latestSurveyInfo,
        totalSurveysChecked,
      },
    };
  }

  /**
   * Get current (most recent published) structures for an enumeration area
   * Returns structures from the latest published survey
   * @param enumerationAreaId - The enumeration area ID
   * @returns Array of SurveyEnumerationAreaStructure from the latest published survey
   */
  async getCurrentEnumerationAreaStructures(
    enumerationAreaId: number,
  ): Promise<SurveyEnumerationAreaStructure[]> {
    // Step 1: Find all surveys containing this enumeration area
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { enumerationAreaId },
      include: [
        {
          model: Survey,
        },
      ],
      order: [[{ model: Survey, as: 'survey' }, 'startDate', 'DESC']],
    });

    // Step 2: Check if any surveys found
    if (!surveyEAs || surveyEAs.length === 0) {
      return [];
    }

    // Step 3: Loop through surveys (newest to oldest) to find first published one
    for (const surveyEA of surveyEAs) {
      // Step 4: Check publishing status
      if (surveyEA.isPublished) {
        // PUBLISHED - Fetch structures
        const structures = await this.structureRepository.findAll({
          where: { surveyEnumerationAreaId: surveyEA.id },
          order: [['structureNumber', 'ASC']],
        });

        return structures;
      }
    }

    // Step 5: No published data found in any survey
    return [];
  }

  /**
   * Generate CSV export for all household listings in a survey
   * @param surveyId - Survey ID
   * @returns CSV content as string
   */
  async generateSurveyCSVExport(surveyId: number): Promise<string> {
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      throw new BadRequestException(`Survey with ID ${surveyId} not found`);
    }

    // Get all household listings with full hierarchy
    // Using separate includes to avoid duplicate table alias issues
    const listings = await this.householdListingRepository.findAll({
      include: [
        {
          model: SurveyEnumerationArea,
          where: { surveyId },
          required: true,
          include: [
            {
              model: EnumerationArea,
              attributes: ['id', 'name', 'areaCode'],
            },
            {
              model: Survey,
              attributes: ['id', 'name', 'year', 'startDate', 'endDate', 'status'],
            },
          ],
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
        },
        {
          model: SurveyEnumerationAreaStructure,
          attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
        },
      ],
      order: [
        [
          { model: SurveyEnumerationArea, as: 'surveyEnumerationArea' },
          'enumerationAreaId',
          'ASC',
        ],
        ['householdSerialNumber', 'ASC'],
      ],
    });

    // Fetch hierarchy data separately to avoid nested include conflicts
    const enumerationAreaIds = [
      ...new Set(
        listings.map((l) => l.surveyEnumerationArea?.enumerationAreaId).filter(Boolean),
      ),
    ];

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
              include: [Dzongkhag],
            },
          ],
        },
      ],
    });

    // Create a map for quick lookup
    const eaMap = new Map(
      enumerationAreas.map((ea) => {
        const firstSAZ = ea.subAdministrativeZones?.[0];
        return [
          ea.id,
          {
            ea,
            saz: firstSAZ,
            az: firstSAZ?.administrativeZone,
            dzongkhag: firstSAZ?.administrativeZone?.dzongkhag,
          },
        ];
      }),
    );

    // Calculate duration
    const startDate = new Date(survey.startDate);
    const endDate = new Date(survey.endDate);
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // CSV Headers
    const headers = [
      'ID',
      'Dzongkhag Name',
      'Dzongkhag Code',
      'Area Type',
      'Gewog/Thromde Name',
      'Gewog/Thromde Code',
      'Chiwog/Lap Name',
      'Chiwog/Lap Code',
      'Enumeration Area Name',
      'Full EA Code',
      'Structure Number',
      'Household Identification',
      'Household Serial Number',
      'Name of HOH',
      'Total Male',
      'Total Female',
      'Total Population',
      'Phone Number',
      'Remarks',
      'Submitted By',
      'Submitted Date',
    ];

    // Build CSV rows with serial number
    const rows = listings.map((listing, index) => {
      const sea = listing.surveyEnumerationArea;
      const eaId = sea?.enumerationAreaId;
      const hierarchy = eaMap.get(eaId);
      const ea = hierarchy?.ea;
      const saz = hierarchy?.saz;
      const az = hierarchy?.az;
      const dzongkhag = hierarchy?.dzongkhag;
      const submitter = listing.submitter;

      // Determine area type (Urban if THROMDE, Rural if GEWOG)
      const areaType = az?.type === 'Thromde' ? 'Urban' : 'Rural';

      // Build Full EA Code: Dzongkhag (2) + Admin Zone (2) + Sub Admin Zone (2) + EA (2) = 8 digits
      const dzongkhagCode = (dzongkhag?.areaCode || '').padStart(2, '0');
      const adminZoneCode = (az?.areaCode || '').padStart(2, '0');
      const subAdminZoneCode = (saz?.areaCode || '').padStart(2, '0');
      const eaCode = (ea?.areaCode || sea?.enumerationArea?.areaCode || '').padStart(2, '0');
      const fullEaCode = `${dzongkhagCode}${adminZoneCode}${subAdminZoneCode}${eaCode}`;

      return [
        (index + 1).toString(), // ID - serial number starting from 1
        dzongkhag?.name || '',
        dzongkhagCode,
        areaType,
        az?.name || '',
        adminZoneCode,
        saz?.name || '',
        subAdminZoneCode,
        ea?.name || sea?.enumerationArea?.name || '',
        fullEaCode,
        listing.householdIdentification || '',
        listing.householdSerialNumber?.toString() || '',
        listing.nameOfHOH || '',
        listing.totalMale?.toString() || '0',
        listing.totalFemale?.toString() || '0',
        (listing.totalMale + listing.totalFemale).toString(),
        listing.phoneNumber || '',
        listing.remarks || '',
        submitter?.name || '',
        listing.createdAt ? new Date(listing.createdAt).toISOString().split('T')[0] : '',
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(',');
    });

    return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  }

  /**
   * Generate metadata TXT file for survey export
   * @param surveyId - Survey ID
   * @param totalHouseholds - Total number of households
   * @returns Metadata content as string
   */
  async generateSurveyMetadataTXT(
    surveyId: number,
    totalHouseholds: number,
  ): Promise<string> {
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      throw new BadRequestException(`Survey with ID ${surveyId} not found`);
    }

    const statistics = await this.getStatisticsBySurvey(surveyId);
    const supervisors = await this.getSupervisorsForSurvey(surveyId);

    const startDate = new Date(survey.startDate);
    const endDate = new Date(survey.endDate);
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    let metadata = `HOUSEHOLD LISTING EXPORT - SURVEY LEVEL\n`;
    metadata += `==========================================\n\n`;
    metadata += `Export Date: ${new Date().toISOString().split('T')[0]}\n`;
    metadata += `Export Time: ${new Date().toLocaleTimeString()}\n\n`;
    metadata += `SURVEY INFORMATION\n`;
    metadata += `-------------------\n`;
    metadata += `Survey Name: ${survey.name}\n`;
    metadata += `Survey Year: ${survey.year}\n`;
    metadata += `Start Date: ${survey.startDate ? new Date(survey.startDate).toISOString().split('T')[0] : 'N/A'}\n`;
    metadata += `End Date: ${survey.endDate ? new Date(survey.endDate).toISOString().split('T')[0] : 'N/A'}\n`;
    metadata += `Duration: ${durationDays} days\n`;
    metadata += `Status: ${survey.status}\n`;
    metadata += `Description: ${survey.description || 'N/A'}\n\n`;
    metadata += `SUPERVISORS\n`;
    metadata += `-----------\n`;
    if (supervisors.length > 0) {
      supervisors.forEach((supervisor, index) => {
        metadata += `${index + 1}. ${supervisor.name}\n`;
        metadata += `   CID: ${supervisor.cid || 'N/A'}\n`;
        metadata += `   Phone: ${supervisor.phoneNumber || 'N/A'}\n`;
        metadata += `   Email: ${supervisor.emailAddress || 'N/A'}\n`;
        metadata += `   Dzongkhags: ${supervisor.dzongkhags?.map((d) => d.name).join(', ') || 'N/A'}\n\n`;
      });
    } else {
      metadata += `No supervisors assigned\n\n`;
    }
    metadata += `STATISTICS\n`;
    metadata += `----------\n`;
    metadata += `Total Households: ${statistics.totalHouseholds}\n`;
    metadata += `Total Enumeration Areas: ${statistics.totalEnumerationAreas || 0}\n`;
    metadata += `Total Male Population: ${statistics.totalMale}\n`;
    metadata += `Total Female Population: ${statistics.totalFemale}\n`;
    metadata += `Total Population: ${statistics.totalPopulation}\n`;
    metadata += `Households with Phone: ${statistics.householdsWithPhone}\n`;
    metadata += `Average Household Size: ${statistics.averageHouseholdSize}\n\n`;
    metadata += `FILE INFORMATION\n`;
    metadata += `-----------------\n`;
    metadata += `CSV File: household_listings_survey_${surveyId}.csv\n`;
    metadata += `Total Records: ${totalHouseholds}\n`;
    metadata += `Export Format: CSV with geographic hierarchy and household details\n`;
    metadata += `CSV Columns: ID, Dzongkhag, Area Type, Gewog/Thromde, Chiwog/Lap, Enumeration Area, Full EA Code, Household Details\n`;

    return metadata;
  }

  /**
   * Generate CSV export for household listings in a survey enumeration area
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns CSV content as string
   */
  async generateEnumerationAreaCSVExport(
    surveyEnumerationAreaId: number,
  ): Promise<string> {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
      {
        include: [
          {
            model: EnumerationArea,
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',  // Via junction table
                through: { attributes: [] },
                include: [
                  {
                    model: AdministrativeZone,
                    include: [Dzongkhag],
                  },
                ],
              },
            ],
          },
          {
            model: Survey,
          },
          {
            model: User,
            as: 'enumerator',
            attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
          },
          {
            model: User,
            as: 'sampler',
            attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
          },
          {
            model: User,
            as: 'publisher',
            attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
          },
        ],
      },
    );

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${surveyEnumerationAreaId} not found`,
      );
    }

    const survey = surveyEA.survey;
    const ea = surveyEA.enumerationArea;
    const firstSAZ = ea?.subAdministrativeZones?.[0];
    const saz = firstSAZ;
    const az = firstSAZ?.administrativeZone;
    const dzongkhag = az?.dzongkhag;

    // Get supervisors for this dzongkhag
    const dzongkhagWithSupervisors = await Dzongkhag.findByPk(dzongkhag?.id, {
      include: [
        {
          model: User,
          as: 'supervisors',
          through: { attributes: [] },
          attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
        },
      ],
    });

    // Get all household listings
    const listings = await this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId },
      include: [
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
        },
        {
          model: SurveyEnumerationAreaStructure,
          attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
        },
      ],
      order: [['householdSerialNumber', 'ASC']],
    });

    // Calculate duration
    const startDate = new Date(survey.startDate);
    const endDate = new Date(survey.endDate);
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // CSV Headers
    const headers = [
      'ID',
      'Dzongkhag Name',
      'Dzongkhag Code',
      'Area Type',
      'Gewog/Thromde Name',
      'Gewog/Thromde Code',
      'Chiwog/Lap Name',
      'Chiwog/Lap Code',
      'Enumeration Area Name',
      'Full EA Code',
      'Structure Number',
      'Household Identification',
      'Household Serial Number',
      'Name of HOH',
      'Total Male',
      'Total Female',
      'Total Population',
      'Phone Number',
      'Remarks',
      'Submitted By',
      'Submitted Date',
    ];

    // Build CSV rows with serial number
    const rows = listings.map((listing, index) => {
      const submitter = listing.submitter;

      // Determine area type (Urban if THROMDE, Rural if GEWOG)
      const areaType = az?.type === 'Thromde' ? 'Urban' : 'Rural';

      // Build Full EA Code: Dzongkhag (2) + Admin Zone (2) + Sub Admin Zone (2) + EA (2) = 8 digits
      const dzongkhagCode = (dzongkhag?.areaCode || '').padStart(2, '0');
      const adminZoneCode = (az?.areaCode || '').padStart(2, '0');
      const subAdminZoneCode = (saz?.areaCode || '').padStart(2, '0');
      const eaCode = (ea?.areaCode || '').padStart(2, '0');
      const fullEaCode = `${dzongkhagCode}${adminZoneCode}${subAdminZoneCode}${eaCode}`;

      return [
        (index + 1).toString(), // ID - serial number starting from 1
        dzongkhag?.name || '',
        dzongkhagCode,
        areaType,
        az?.name || '',
        adminZoneCode,
        saz?.name || '',
        subAdminZoneCode,
        ea?.name || '',
        fullEaCode,
        listing.householdIdentification || '',
        listing.householdSerialNumber?.toString() || '',
        listing.nameOfHOH || '',
        listing.totalMale?.toString() || '0',
        listing.totalFemale?.toString() || '0',
        (listing.totalMale + listing.totalFemale).toString(),
        listing.phoneNumber || '',
        listing.remarks || '',
        submitter?.name || '',
        listing.createdAt ? new Date(listing.createdAt).toISOString().split('T')[0] : '',
      ]
        .map((field) => `"${String(field).replace(/"/g, '""')}"`)
        .join(',');
    });

    return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\n');
  }

  /**
   * Generate metadata TXT file for enumeration area export
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @param totalHouseholds - Total number of households
   * @returns Metadata content as string
   */
  async generateEnumerationAreaMetadataTXT(
    surveyEnumerationAreaId: number,
    totalHouseholds: number,
  ): Promise<string> {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
      {
        include: [
          {
            model: EnumerationArea,
            include: [
              {
                model: SubAdministrativeZone,
                as: 'subAdministrativeZones',  // Via junction table
                through: { attributes: [] },
                include: [
                  {
                    model: AdministrativeZone,
                    include: [Dzongkhag],
                  },
                ],
              },
            ],
          },
          {
            model: Survey,
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
          },
          {
            model: User,
            as: 'validator',
            attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress'],
          },
        ],
      },
    );

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${surveyEnumerationAreaId} not found`,
      );
    }

    const survey = surveyEA.survey;
    const ea = surveyEA.enumerationArea;
    const firstSAZ = ea?.subAdministrativeZones?.[0];
    const saz = firstSAZ;
    const az = firstSAZ?.administrativeZone;
    const dzongkhag = az?.dzongkhag;
    const dzongkhagId = dzongkhag?.id || az?.dzongkhagId;

    // Get supervisors for this dzongkhag
    // Fetch dzongkhag separately to ensure supervisors relationship loads correctly
    let supervisors: any[] = [];
    if (dzongkhagId) {
      try {
        const dzongkhagWithSupervisors = await Dzongkhag.findByPk(dzongkhagId, {
          include: [
            {
              model: User,
              as: 'supervisors',
              through: { attributes: [] },
              where: { role: UserRole.SUPERVISOR },
              required: false,
              attributes: ['id', 'name', 'cid', 'phoneNumber', 'emailAddress', 'role'],
            },
          ],
        });

        // Get supervisors (already filtered by role in where clause)
        supervisors = dzongkhagWithSupervisors?.supervisors || [];
      } catch (error) {
        console.error(`Error fetching supervisors for dzongkhag ${dzongkhagId}:`, error);
        supervisors = [];
      }
    }
    const statistics = await this.getStatistics(surveyEnumerationAreaId);

    const startDate = new Date(survey.startDate);
    const endDate = new Date(survey.endDate);
    const durationDays =
      Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Build Full EA Code for metadata
    const dzongkhagCode = (dzongkhag?.areaCode || '').padStart(2, '0');
    const adminZoneCode = (az?.areaCode || '').padStart(2, '0');
    const subAdminZoneCode = (saz?.areaCode || '').padStart(2, '0');
    const eaCode = (ea?.areaCode || '').padStart(2, '0');
    const fullEaCode = `${dzongkhagCode}${adminZoneCode}${subAdminZoneCode}${eaCode}`;

    let metadata = `HOUSEHOLD LISTING EXPORT - ENUMERATION AREA LEVEL\n`;
    metadata += `==================================================\n\n`;
    metadata += `Export Date: ${new Date().toISOString().split('T')[0]}\n`;
    metadata += `Export Time: ${new Date().toLocaleTimeString()}\n\n`;
    metadata += `SURVEY INFORMATION\n`;
    metadata += `-------------------\n`;
    metadata += `Survey Name: ${survey.name}\n`;
    metadata += `Survey Year: ${survey.year}\n`;
    metadata += `Start Date: ${survey.startDate ? new Date(survey.startDate).toISOString().split('T')[0] : 'N/A'}\n`;
    metadata += `End Date: ${survey.endDate ? new Date(survey.endDate).toISOString().split('T')[0] : 'N/A'}\n`;
    metadata += `Duration: ${durationDays} days\n`;
    metadata += `Status: ${survey.status}\n`;
    metadata += `Description: ${survey.description || 'N/A'}\n\n`;
    metadata += `GEOGRAPHIC HIERARCHY\n`;
    metadata += `-------------------\n`;
    metadata += `Dzongkhag: ${dzongkhag?.name || 'N/A'} (${dzongkhagCode})\n`;
    metadata += `Admin Zone: ${az?.name || 'N/A'} (${adminZoneCode}) - ${az?.type || 'N/A'}\n`;
    metadata += `Sub Admin Zone: ${saz?.name || 'N/A'} (${subAdminZoneCode}) - ${saz?.type || 'N/A'}\n`;
    metadata += `Enumeration Area: ${ea?.name || 'N/A'} (${eaCode})\n`;
    metadata += `Full EA Code: ${fullEaCode}\n`;
    metadata += `Area Type: ${az?.type === 'Thromde' ? 'Urban' : 'Rural'}\n\n`;
    metadata += `SUPERVISORS\n`;
    metadata += `-----------\n`;
    if (supervisors.length > 0) {
      supervisors.forEach((supervisor, index) => {
        metadata += `${index + 1}. ${supervisor.name}\n`;
        metadata += `   CID: ${supervisor.cid || 'N/A'}\n`;
        metadata += `   Phone: ${supervisor.phoneNumber || 'N/A'}\n`;
        metadata += `   Email: ${supervisor.emailAddress || 'N/A'}\n\n`;
      });
    } else {
      metadata += `No supervisors assigned\n\n`;
    }
    metadata += `WORKFLOW STATUS\n`;
    metadata += `---------------\n`;
    metadata += `Enumerated: ${surveyEA.isEnumerated ? 'Yes' : 'No'}\n`;
    if (surveyEA.isEnumerated && surveyEA.enumerator) {
      metadata += `Enumerated By: ${surveyEA.enumerator.name} (${surveyEA.enumerator.cid || 'N/A'})\n`;
      metadata += `Enumeration Date: ${surveyEA.enumerationDate ? new Date(surveyEA.enumerationDate).toISOString().split('T')[0] : 'N/A'}\n`;
    }
    metadata += `Sampled: ${surveyEA.isSampled ? 'Yes' : 'No'}\n`;
    if (surveyEA.isSampled && surveyEA.sampler) {
      metadata += `Sampled By: ${surveyEA.sampler.name} (${surveyEA.sampler.cid || 'N/A'})\n`;
      metadata += `Sampled Date: ${surveyEA.sampledDate ? new Date(surveyEA.sampledDate).toISOString().split('T')[0] : 'N/A'}\n`;
    }
    metadata += `Published: ${surveyEA.isPublished ? 'Yes' : 'No'}\n`;
    if (surveyEA.isPublished && surveyEA.publisher) {
      metadata += `Published By: ${surveyEA.publisher.name} (${surveyEA.publisher.cid || 'N/A'})\n`;
      metadata += `Published Date: ${surveyEA.publishedDate ? new Date(surveyEA.publishedDate).toISOString().split('T')[0] : 'N/A'}\n`;
    }
    metadata += `\n`;
    metadata += `STATISTICS\n`;
    metadata += `----------\n`;
    metadata += `Total Households: ${statistics.totalHouseholds}\n`;
    metadata += `Total Male Population: ${statistics.totalMale}\n`;
    metadata += `Total Female Population: ${statistics.totalFemale}\n`;
    metadata += `Total Population: ${statistics.totalPopulation}\n`;
    metadata += `Households with Phone: ${statistics.householdsWithPhone}\n`;
    metadata += `Average Household Size: ${statistics.averageHouseholdSize}\n\n`;
    metadata += `FILE INFORMATION\n`;
    metadata += `-----------------\n`;
    metadata += `CSV File: household_listings_ea_${surveyEnumerationAreaId}.csv\n`;
    metadata += `Total Records: ${totalHouseholds}\n`;
    metadata += `Export Format: CSV with geographic hierarchy and household details\n`;
    metadata += `CSV Columns: ID, Dzongkhag, Area Type, Gewog/Thromde, Chiwog/Lap, Enumeration Area, Full EA Code, Household Details\n`;

    return metadata;
  }

  /**
   * Get supervisors for a survey (helper method)
   * @param surveyId - Survey ID
   * @returns Array of supervisors
   */
  private async getSupervisorsForSurvey(surveyId: number): Promise<any[]> {
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: ['enumerationAreaId'],
    });

    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);
    if (enumerationAreaIds.length === 0) {
      return [];
    }

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
              include: [Dzongkhag],
            },
          ],
        },
      ],
    });

    const dzongkhagIds = new Set<number>();
    enumerationAreas.forEach((ea) => {
      const firstSAZ = ea.subAdministrativeZones?.[0];
      const dzongkhag = firstSAZ?.administrativeZone?.dzongkhag;
      if (dzongkhag) {
        dzongkhagIds.add(dzongkhag.id);
      }
    });

    if (dzongkhagIds.size === 0) {
      return [];
    }

    const dzongkhags = await Dzongkhag.findAll({
      where: { id: Array.from(dzongkhagIds) },
      include: [
        {
          model: User,
          as: 'supervisors',
          through: { attributes: [] },
          attributes: ['id', 'name', 'cid', 'emailAddress', 'phoneNumber', 'role'],
        },
      ],
    });

    const supervisorsMap = new Map();
    dzongkhags.forEach((dzongkhag) => {
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
            });
          }
        });
      }
    });

    return Array.from(supervisorsMap.values());
  }

  /**
   * Generate ZIP file with CSV and metadata TXT for survey export
   * @param surveyId - Survey ID
   * @returns Buffer containing ZIP file
   */
  async generateSurveyExportZIP(surveyId: number): Promise<Buffer> {
    const csvContent = await this.generateSurveyCSVExport(surveyId);
    const listings = await this.findBySurvey(surveyId);
    const metadataContent = await this.generateSurveyMetadataTXT(
      surveyId,
      listings.length,
    );

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks as any)));
      archive.on('error', (err) => reject(err));

      archive.append(csvContent, {
        name: `household_listings_survey_${surveyId}.csv`,
      });
      archive.append(metadataContent, {
        name: `metadata_survey_${surveyId}.txt`,
      });

      archive.finalize();
    });
  }

  /**
   * Generate ZIP file with CSV and metadata TXT for enumeration area export
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Buffer containing ZIP file
   */
  async generateEnumerationAreaExportZIP(
    surveyEnumerationAreaId: number,
  ): Promise<Buffer> {
    const csvContent = await this.generateEnumerationAreaCSVExport(
      surveyEnumerationAreaId,
    );
    const listings = await this.findBySurveyEnumerationArea(surveyEnumerationAreaId);
    const metadataContent = await this.generateEnumerationAreaMetadataTXT(
      surveyEnumerationAreaId,
      listings.length,
    );

    return new Promise((resolve, reject) => {
      const archive = archiver('zip', { zlib: { level: 9 } });
      const chunks: Buffer[] = [];

      archive.on('data', (chunk) => chunks.push(chunk));
      archive.on('end', () => resolve(Buffer.concat(chunks as any)));
      archive.on('error', (err) => reject(err));

      archive.append(csvContent, {
        name: `household_listings_ea_${surveyEnumerationAreaId}.csv`,
      });
      archive.append(metadataContent, {
        name: `metadata_ea_${surveyEnumerationAreaId}.txt`,
      });

      archive.finalize();
    });
  }

  /**
   * Get household listings by survey enumeration area for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   */
  async findBySurveyEnumerationAreaForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.findBySurveyEnumerationArea(surveyEnumerationAreaId);
  }

  /**
   * Get paginated household listings by survey enumeration area for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   * @param query
   */
  async findBySurveyEnumerationAreaPaginatedForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<SurveyEnumerationAreaHouseholdListing>> {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.findBySurveyEnumerationAreaPaginated(
      surveyEnumerationAreaId,
      query,
    );
  }

  /**
   * Get sampled households by survey enumeration area for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   */
  async findSampledHouseholdsBySurveyEAForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ): Promise<SurveyEnumerationAreaHouseholdListing[]> {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    // Get sampling record for this EA
    const sampling = await this.surveyEnumerationAreaSamplingRepository.findOne({
      where: { surveyEnumerationAreaId },
    });

    if (!sampling) {
      return [];
    }

    // Get household samples
    const samples = await this.householdSampleRepository.findAll({
      where: { surveyEnumerationAreaSamplingId: sampling.id },
      include: [
        {
          model: SurveyEnumerationAreaHouseholdListing,
          include: [
            {
              model: User,
              as: 'submitter',
            },
            {
              model: SurveyEnumerationAreaStructure,
              attributes: ['id', 'structureNumber', 'latitude', 'longitude'],
            },
          ],
        },
      ],
      order: [['selectionOrder', 'ASC']],
    });

    return samples.map((sample) => sample.householdListing);
  }

  /**
   * Create blank household listings for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   * @param dto
   */
  async createBlankHouseholdListingsForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
    dto: CreateBlankHouseholdListingsDto,
  ) {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.createBlankHouseholdListings(
      surveyEnumerationAreaId,
      dto,
      supervisorId,
    );
  }

  /**
   * Bulk upload households from CSV for supervisor (with EA access verification)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   * @param csvContent
   */
  async bulkUploadFromCsvForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
    csvContent: string,
  ) {
    // Verify SurveyEA belongs to supervisor
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    // Parse CSV content
    const households = this.parseHouseholdCsv(csvContent, surveyEnumerationAreaId);

    // Create household listings
    const createDtos = households.map((h) => ({
      ...h,
      surveyEnumerationAreaId,
    }));

    return this.bulkCreate(createDtos);
  }

  /**
   * Parse household CSV content
   * @param csvContent
   * @param surveyEnumerationAreaId
   */
  private parseHouseholdCsv(
    csvContent: string,
    surveyEnumerationAreaId: number,
  ): CreateSurveyEnumerationAreaHouseholdListingDto[] {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException(
        'CSV file must contain at least a header and one data row',
      );
    }

    // Parse header
    const headerLine = lines[0].trim();
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

    // Find column indices
    const findColumnIndex = (
      exactMatches: string[],
      partialChecks: ((h: string) => boolean)[],
    ): number => {
      for (const exact of exactMatches) {
        const index = headers.findIndex(
          (h) => h.toLowerCase() === exact.toLowerCase(),
        );
        if (index !== -1) return index;
      }
      for (const check of partialChecks) {
        const index = headers.findIndex((h) => check(h.toLowerCase()));
        if (index !== -1) return index;
      }
      return -1;
    };

    const structureIdIndex = findColumnIndex(
      ['Structure ID', 'structureId', 'StructureId'],
      [(h) => h.includes('structure')],
    );
    const householdIdentificationIndex = findColumnIndex(
      ['Household Identification', 'householdIdentification', 'HouseholdIdentification'],
      [(h) => h.includes('household') && h.includes('identification')],
    );
    const householdSerialNumberIndex = findColumnIndex(
      ['Household Serial Number', 'householdSerialNumber', 'HouseholdSerialNumber'],
      [(h) => h.includes('household') && h.includes('serial')],
    );
    const nameOfHOHIndex = findColumnIndex(
      ['Name of HOH', 'nameOfHOH', 'NameOfHOH', 'Head of Household'],
      [(h) => h.includes('hoh') || (h.includes('head') && h.includes('household'))],
    );
    const totalMaleIndex = findColumnIndex(
      ['Total Male', 'totalMale', 'TotalMale'],
      [(h) => h.includes('male')],
    );
    const totalFemaleIndex = findColumnIndex(
      ['Total Female', 'totalFemale', 'TotalFemale'],
      [(h) => h.includes('female')],
    );
    const phoneNumberIndex = findColumnIndex(
      ['Phone Number', 'phoneNumber', 'PhoneNumber'],
      [(h) => h.includes('phone')],
    );
    const remarksIndex = findColumnIndex(
      ['Remarks', 'remarks'],
      [(h) => h.includes('remark')],
    );

    // Parse data rows
    const households: CreateSurveyEnumerationAreaHouseholdListingDto[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

      const household: CreateSurveyEnumerationAreaHouseholdListingDto = {
        surveyEnumerationAreaId,
        structureId:
          structureIdIndex >= 0 && values[structureIdIndex]
            ? parseInt(values[structureIdIndex], 10)
            : undefined,
        householdIdentification:
          householdIdentificationIndex >= 0 && values[householdIdentificationIndex]
            ? values[householdIdentificationIndex]
            : `HH-${i}`,
        householdSerialNumber:
          householdSerialNumberIndex >= 0 && values[householdSerialNumberIndex]
            ? parseInt(values[householdSerialNumberIndex], 10)
            : undefined,
        nameOfHOH:
          nameOfHOHIndex >= 0 && values[nameOfHOHIndex]
            ? values[nameOfHOHIndex]
            : '',
        totalMale:
          totalMaleIndex >= 0 && values[totalMaleIndex]
            ? parseInt(values[totalMaleIndex], 10) || 0
            : 0,
        totalFemale:
          totalFemaleIndex >= 0 && values[totalFemaleIndex]
            ? parseInt(values[totalFemaleIndex], 10) || 0
            : 0,
        phoneNumber:
          phoneNumberIndex >= 0 && values[phoneNumberIndex]
            ? values[phoneNumberIndex]
            : undefined,
        remarks:
          remarksIndex >= 0 && values[remarksIndex]
            ? values[remarksIndex]
            : undefined,
      };

      households.push(household);
    }

    return households;
  }

  /**
   * Update household listing for supervisor (with access check)
   * @param supervisorId
   * @param id
   * @param updateDto
   */
  async updateForSupervisor(
    supervisorId: number,
    id: number,
    updateDto: UpdateSurveyEnumerationAreaHouseholdListingDto,
  ): Promise<SurveyEnumerationAreaHouseholdListing> {
    // Get household listing to check access
    const listing = await this.findOne(id);
    if (!listing) {
      throw new BadRequestException('Household listing not found');
    }

    // Verify access to the SurveyEA
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        listing.surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.update(id, updateDto);
  }

  /**
   * Export household listings by EA for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   */
  async exportHouseholdListingsByEAForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ): Promise<Buffer> {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.generateEnumerationAreaExportZIP(surveyEnumerationAreaId);
  }

  /**
   * Generate CSV export for household listings in a survey enumeration area for supervisor (with access check)
   * @param supervisorId - Supervisor ID
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns CSV content as string
   */
  async generateEnumerationAreaCSVExportForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ): Promise<string> {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return this.generateEnumerationAreaCSVExport(surveyEnumerationAreaId);
  }

  /**
   * Export household count by EA for supervisor (with access check)
   * @param supervisorId
   * @param surveyEnumerationAreaId
   */
  async exportHouseholdCountByEAForSupervisor(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ) {
    // Verify access
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
        supervisorId,
        surveyEnumerationAreaId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    const statistics = await this.getStatistics(surveyEnumerationAreaId);
    return {
      surveyEnumerationAreaId,
      totalHouseholds: statistics.totalHouseholds,
      totalMale: statistics.totalMale,
      totalFemale: statistics.totalFemale,
      totalPopulation: statistics.totalPopulation,
      averageHouseholdSize: statistics.averageHouseholdSize,
    };
  }

  /**
   * Export household count aggregated by gewog/thromde, chiwog/lap, EA for supervisor's dzongkhag
   * Returns CSV content with household counts by EA
   * @param supervisorId
   * @param dzongkhagId
   */
  async exportHouseholdCountByDzongkhagForSupervisor(
    supervisorId: number,
    dzongkhagId: number,
  ): Promise<string> {
    // Verify access to dzongkhag
    const hasAccess =
      await this.supervisorHelperService.verifySupervisorAccessToDzongkhag(
        supervisorId,
        dzongkhagId,
      );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this dzongkhag',
      );
    }

    // Get all EAs in this dzongkhag via EA -> SAZ -> AZ -> Dzongkhag
    const dzongkhagIds = await this.supervisorHelperService.getSupervisorDzongkhagIds(
      supervisorId,
    );
    if (!dzongkhagIds.includes(dzongkhagId)) {
      throw new ForbiddenException(
        'You do not have access to this dzongkhag',
      );
    }

    // Fetch Dzongkhag to get name and code
    const dzongkhag = await Dzongkhag.findByPk(dzongkhagId, {
      attributes: ['id', 'name', 'areaCode'],
    });

    if (!dzongkhag) {
      throw new BadRequestException(`Dzongkhag with ID ${dzongkhagId} not found`);
    }

    // CSV Headers (capitalized)
    const headers = [
      'Dzongkhag',
      'Dzongkhag Code',
      'Gewog/Thromde',
      'Gewog/Thromde Code',
      'Chiwog/LAP',
      'ChiwogLAP Code',
      'EA',
      'EA Code',
      'Households',
    ];

    // Prepare CSV rows
    const csvRows: string[] = [];

    // Get administrative zones for this dzongkhag
    const administrativeZones = await this.administrativeZoneRepository.findAll({
      where: { dzongkhagId },
      include: [
        {
          model: SubAdministrativeZone,
          include: [
            {
              model: EnumerationArea,
              as: 'enumerationAreas',
              through: { attributes: [] },
              attributes: ['id', 'name', 'areaCode'],
            },
          ],
        },
      ],
    });

    // Iterate through hierarchy to build CSV rows
    for (const az of administrativeZones) {
      for (const saz of az.subAdministrativeZones || []) {
        for (const ea of saz.enumerationAreas || []) {
          // Get survey enumeration areas for this EA
          const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
            where: { enumerationAreaId: ea.id },
            include: [
              {
                model: SurveyEnumerationAreaHouseholdListing,
                attributes: ['id'],
              },
            ],
          });

          // Count total households across all surveys for this EA
          let totalHouseholds = 0;
          for (const surveyEA of surveyEAs) {
            const listings = surveyEA.householdListings || [];
            totalHouseholds += listings.length;
          }

          // Build CSV row
          const row = [
            dzongkhag.name || '',
            dzongkhag.areaCode || '',
            az.name || '',
            az.areaCode || '',
            saz.name || '',
            saz.areaCode || '',
            ea.name || '',
            ea.areaCode || '',
            totalHouseholds.toString(),
          ]
            .map((field) => `"${String(field).replace(/"/g, '""')}"`)
            .join(',');

          csvRows.push(row);
        }
      }
    }

    // Combine headers and rows
    const csvContent = [
      headers.map((h) => `"${h}"`).join(','),
      ...csvRows,
    ].join('\n');

    return csvContent;
  }

  /**
   * Get paginated household listings for a survey for supervisor (with access check)
   * Only returns households from enumeration areas the supervisor has access to
   * @param supervisorId - Supervisor ID
   * @param surveyId - Survey ID
   * @param query - Pagination query parameters
   * @returns Paginated response with household listings
   */
  async findBySurveyPaginatedForSupervisor(
    supervisorId: number,
    surveyId: number,
    query: PaginationQueryDto = {},
  ): Promise<PaginatedResponse<SurveyEnumerationAreaHouseholdListing>> {
    // Get supervisor's dzongkhag IDs
    const dzongkhagIds =
      await this.supervisorHelperService.getSupervisorDzongkhagIds(supervisorId);

    if (dzongkhagIds.length === 0) {
      throw new ForbiddenException(
        'You do not have access to any dzongkhags',
      );
    }

    // Get all enumeration areas in the survey
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      attributes: ['id', 'enumerationAreaId'],
    });

    if (surveyEAs.length === 0) {
      // Return empty paginated response
      const options = PaginationUtil.normalizePaginationOptions(query);
      return PaginationUtil.createPaginatedResponse([], 0, options);
    }

    // Get enumeration area IDs and check which ones belong to supervisor's dzongkhags
    const enumerationAreaIds = surveyEAs.map((sea) => sea.enumerationAreaId);
    const enumerationAreas = await this.enumerationAreaRepository.findAll({
      where: { id: enumerationAreaIds },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          include: [
            {
              model: AdministrativeZone,
              attributes: ['id', 'dzongkhagId'],
            },
          ],
        },
      ],
    });

    // Filter to only EAs that belong to supervisor's dzongkhags
    const accessibleEAIds = new Set<number>();
    enumerationAreas.forEach((ea) => {
      const hasAccess = ea.subAdministrativeZones?.some((saz) => {
        const az = saz.administrativeZone;
        return az && dzongkhagIds.includes(az.dzongkhagId);
      });
      if (hasAccess) {
        accessibleEAIds.add(ea.id);
      }
    });

    if (accessibleEAIds.size === 0) {
      // Return empty paginated response
      const options = PaginationUtil.normalizePaginationOptions(query);
      return PaginationUtil.createPaginatedResponse([], 0, options);
    }

    // Get survey EA IDs that the supervisor has access to
    const accessibleSurveyEAIds = surveyEAs
      .filter((sea) => accessibleEAIds.has(sea.enumerationAreaId))
      .map((sea) => sea.id);

    // Normalize pagination options
    const options = PaginationUtil.normalizePaginationOptions(query);

    // Calculate offset and limit
    const { offset, limit } = PaginationUtil.calculateOffsetLimit(options);

    // Build order clause - default to createdAt DESC (latest to oldest)
    const order = options.sortBy
      ? PaginationUtil.buildOrderClause(options, 'createdAt')
      : [['createdAt', 'DESC']];

    // Fetch data with count, filtered to accessible survey EAs
    const { rows, count } = await this.householdListingRepository.findAndCountAll(
      {
        where: {
          surveyEnumerationAreaId: { [Op.in]: accessibleSurveyEAIds },
        },
        include: [
          {
            model: SurveyEnumerationArea,
            attributes: ['id', 'surveyId', 'enumerationAreaId'],
            where: { surveyId },
            required: true,
          },
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'name', 'phoneNumber', 'cid'],
          },
          {
            model:SurveyEnumerationAreaStructure
          }
        ],
        order,
        offset,
        limit,
        distinct: true, // Count distinct household listings, not rows from JOIN
      },
    );

    // Return paginated response
    return PaginationUtil.createPaginatedResponse(rows, count, options);
  }
}
