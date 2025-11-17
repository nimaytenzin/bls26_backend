import {
  Inject,
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { CreateSurveyEnumerationAreaHouseholdListingDto } from './dto/create-survey-enumeration-area-household-listing.dto';
import { UpdateSurveyEnumerationAreaHouseholdListingDto } from './dto/update-survey-enumeration-area-household-listing.dto';
import {
  CurrentHouseholdListingResponseDto,
  CurrentHouseholdListingStatus,
} from './dto/current-household-listing-response.dto';
import { SurveyEnumerationAreaHouseholdListing } from './entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { User } from 'src/modules/auth/entities/user.entity';

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
   */
  async getStatistics(surveyEnumerationAreaId: number) {
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
   */
  async getStatisticsBySurvey(surveyId: number) {
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
}
