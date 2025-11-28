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
  ) {}

  /**
   * Create a new household listing
   * @param createDto
   */
  async create(
    createDto: CreateSurveyEnumerationAreaHouseholdListingDto,
  ): Promise<SurveyEnumerationAreaHouseholdListing> {
    try {
      return await this.householdListingRepository.create(createDto as any);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Household with serial number ${createDto.householdSerialNumber} already exists for this survey enumeration area`,
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
          model: SurveyEnumerationArea,
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['name', 'phoneNumber', 'cid', 'id'],
            },
            {
              model: User,
              as: 'validator',
              attributes: ['name', 'phoneNumber', 'cid', 'id'],
            },
          ],
        },
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
    const { rows, count } = await this.householdListingRepository.findAndCountAll(
      {
        where: { surveyEnumerationAreaId },
        include: [
          {
            model: User,
            as: 'submitter',
            attributes: ['id', 'name', 'cid', 'phoneNumber'],
          },
          {
            model: SurveyEnumerationArea,
            include: [
              {
                model: User,
                as: 'submitter',
                attributes: ['name', 'phoneNumber', 'cid', 'id'],
              },
              {
                model: User,
                as: 'validator',
                attributes: ['name', 'phoneNumber', 'cid', 'id'],
              },
            ],
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

    // Get existing listings to determine next serial number
    const existingListings = await this.householdListingRepository.findAll({
      where: { surveyEnumerationAreaId },
      attributes: ['householdSerialNumber'],
      order: [['householdSerialNumber', 'DESC']],
      limit: 1,
    });

    // Determine starting serial number
    const nextSerialNumber =
      existingListings.length > 0
        ? existingListings[0].householdSerialNumber + 1
        : 1;

    // Default remarks
    const defaultRemarks =
      dto.remarks || 'No data available - Historical survey entry';

    // Create blank entries
    const listingsToCreate: any[] = [];
    for (let i = 0; i < dto.count; i++) {
      const serialNumber = nextSerialNumber + i;
      listingsToCreate.push({
        surveyEnumerationAreaId,
        structureNumber: `STR-${serialNumber.toString().padStart(4, '0')}`,
        householdIdentification: `HH-${serialNumber.toString().padStart(4, '0')}`,
        householdSerialNumber: serialNumber,
        nameOfHOH: 'Not Available',
        totalMale: 0,
        totalFemale: 0,
        phoneNumber: null,
        remarks: defaultRemarks,
        submittedBy: userId,
      });
    }

    // Bulk create all entries
    const created = await this.householdListingRepository.bulkCreate(
      listingsToCreate,
    );

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
          as: 'submitter',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
        },
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

      // Step 4: Check validation status
      if (surveyEA.isValidated) {
        // VALIDATED - Fetch household listings
        const households = await this.householdListingRepository.findAll({
          where: { surveyEnumerationAreaId: surveyEA.id },
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
            message: `Survey "${surveyEA.survey.name}" (${surveyEA.survey.year}) is validated but contains no household listings for this enumeration area`,
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
                validatedDate: surveyEA.validationDate,
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

        // SUCCESS - Return validated data
        return {
          status: CurrentHouseholdListingStatus.SUCCESS,
          message: `Found validated household data from survey "${surveyEA.survey.name}" (${surveyEA.survey.year})`,
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
              validatedDate: surveyEA.validationDate,
            },
          },
          metadata: {
            totalSurveysChecked,
          },
        };
      } else if (surveyEA.isSubmitted && !surveyEA.isValidated) {
        // PENDING VALIDATION - Skip and continue to next survey
        if (latestSurveyInfo && !latestSurveyInfo.reason) {
          latestSurveyInfo.reason = 'Data submitted but pending validation';
        }
        continue;
      } else {
        // NOT SUBMITTED - Skip and continue to next survey
        if (latestSurveyInfo && !latestSurveyInfo.reason) {
          latestSurveyInfo.reason = 'Data not submitted';
        }
        continue;
      }
    }

    // Step 5: No validated data found in any survey
    return {
      status: CurrentHouseholdListingStatus.NO_DATA,
      message: `All ${totalSurveysChecked} survey(s) checked, but none have validated household data for this enumeration area`,
      metadata: {
        latestSurvey: latestSurveyInfo,
        totalSurveysChecked,
      },
    };
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
              attributes: ['id', 'name', 'areaCode', 'subAdministrativeZoneId'],
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
      enumerationAreas.map((ea) => [
        ea.id,
        {
          ea,
          saz: ea.subAdministrativeZone,
          az: ea.subAdministrativeZone?.administrativeZone,
          dzongkhag: ea.subAdministrativeZone?.administrativeZone?.dzongkhag,
        },
      ]),
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
        listing.structureNumber || '',
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
    const saz = ea?.subAdministrativeZone;
    const az = saz?.administrativeZone;
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
        listing.structureNumber || '',
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
    const saz = ea?.subAdministrativeZone;
    const az = saz?.administrativeZone;
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
    metadata += `Submitted: ${surveyEA.isSubmitted ? 'Yes' : 'No'}\n`;
    if (surveyEA.isSubmitted && surveyEA.submitter) {
      metadata += `Submitted By: ${surveyEA.submitter.name} (${surveyEA.submitter.cid || 'N/A'})\n`;
      metadata += `Submission Date: ${surveyEA.submissionDate ? new Date(surveyEA.submissionDate).toISOString().split('T')[0] : 'N/A'}\n`;
    }
    metadata += `Validated: ${surveyEA.isValidated ? 'Yes' : 'No'}\n`;
    if (surveyEA.isValidated && surveyEA.validator) {
      metadata += `Validated By: ${surveyEA.validator.name} (${surveyEA.validator.cid || 'N/A'})\n`;
      metadata += `Validation Date: ${surveyEA.validationDate ? new Date(surveyEA.validationDate).toISOString().split('T')[0] : 'N/A'}\n`;
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
      const dzongkhag = ea.subAdministrativeZone?.administrativeZone?.dzongkhag;
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
}
