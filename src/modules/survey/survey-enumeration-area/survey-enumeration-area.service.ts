import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateSurveyEnumerationAreaDto,
  CompleteEnumerationDto,
} from './dto/create-survey-enumeration-area.dto';
import {
  PublishSurveyEnumerationAreaDto,
  BulkPublishDto,
} from './dto/publish-survey-enumeration-area.dto';
import { UpdateSurveyEnumerationAreaDto } from './dto/update-survey-enumeration-area.dto';
import { SurveyEnumerationArea } from './entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { User } from '../../auth/entities/user.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SubAdministrativeZone } from 'src/modules/location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from 'src/modules/location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';
import { BulkUploadEaResponseDto } from './dto/bulk-upload-ea.dto';
import {
  BulkMatchEaResponseDto,
  BulkMatchEaRowMatch,
  BulkMatchEaRowError,
} from './dto/bulk-match-ea.dto';
import { EAAnnualStatsService } from '../../annual statistics/ea-annual-statistics/ea-annual-stats.service';
import { DzongkhagAnnualStatsService } from '../../annual statistics/dzongkhag-annual-statistics/dzongkhag-annual-stats.service';
import { SupervisorHelperService } from '../../auth/services/supervisor-helper.service';
import { Op } from 'sequelize';

@Injectable()
export class SurveyEnumerationAreaService {
  constructor(
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    private readonly eaAnnualStatsService: EAAnnualStatsService,
    private readonly dzongkhagAnnualStatsService: DzongkhagAnnualStatsService,
    private readonly supervisorHelperService: SupervisorHelperService,
  ) {}

  /**
   * Create a new survey enumeration area assignment
   * @param createSurveyEnumerationAreaDto
   */
  async create(createSurveyEnumerationAreaDto: CreateSurveyEnumerationAreaDto) {
    return await this.surveyEnumerationAreaRepository.create({
      surveyId: createSurveyEnumerationAreaDto.surveyId,
      enumerationAreaId: createSurveyEnumerationAreaDto.enumerationAreaId,
      comments: createSurveyEnumerationAreaDto.comments,
    });
  }

  /**
   * Get all survey enumeration area assignments with optional filters
   * @param surveyId - Optional filter by survey
   * @param enumerationAreaId - Optional filter by enumeration area
   * @param isEnumerated - Optional filter by enumeration status
   * @param isSampled - Optional filter by sampling status
   * @param isPublished - Optional filter by publishing status
   */
  async findAll(
    surveyId?: number,
    enumerationAreaId?: number,
    isEnumerated?: boolean,
    isSampled?: boolean,
    isPublished?: boolean,
  ) {
    const whereClause: any = {};

    if (surveyId !== undefined) whereClause.surveyId = surveyId;
    if (enumerationAreaId !== undefined)
      whereClause.enumerationAreaId = enumerationAreaId;
    if (isEnumerated !== undefined) whereClause.isEnumerated = isEnumerated;
    if (isSampled !== undefined) whereClause.isSampled = isSampled;
    if (isPublished !== undefined) whereClause.isPublished = isPublished;

    return await this.surveyEnumerationAreaRepository.findAll({
      where: whereClause,
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year', 'status'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode'],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'role'],
        },
      ],
      order: [['createdAt', 'DESC']],
    });
  }

  /**
   * Get single survey enumeration area by ID
   * @param id
   */
  async findOne(id: number) {
    return await this.surveyEnumerationAreaRepository.findByPk(id, {
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year', 'status'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode'],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'role'],
        },
      ],
    });
  }

  /**
   * Get survey enumeration areas by survey
   * Returns hierarchical structure: Dzongkhag -> Admin Zone -> SAZ -> Enumeration Areas (with survey data)
   * Only includes Dzongkhags/Admin Zones/SAZs that contain enumeration areas for this survey
   * @param surveyId
   */
  async findBySurveyWithEnumerationAreas(surveyId: number) {
    // Step 1: Get all survey enumeration areas with EA info and SAZs via junction table
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      include: [
        {
          model: EnumerationArea,
          attributes: { exclude: ['geom'] },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',  // Via junction table
              through: { attributes: [] },
              attributes: { exclude: ['geom'] },
            },
          ],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
      ],
    });

    if (surveyEAs.length === 0) {
      return [];
    }

    // Step 2: Get unique SAZ IDs from junction table (handle multiple SAZs per EA)
    const sazIds = [
      ...new Set(
        surveyEAs.flatMap((sea) => 
          sea.enumerationArea.subAdministrativeZones?.map((saz) => saz.id) || []
        ),
      ),
    ];

    // Step 3: Get all SAZs with their parent AZ and Dzongkhag
    const sazs = await SubAdministrativeZone.findAll({
      where: { id: sazIds },
      attributes: { exclude: ['geom'] },
      include: [
        {
          model: AdministrativeZone,
          attributes: { exclude: ['geom'] },
          include: [
            {
              model: Dzongkhag,
              attributes: { exclude: ['geom'] },
            },
          ],
        },
      ],
    });

    // Step 4: Build maps for quick lookup
    const sazMap = new Map(sazs.map((saz) => [saz.id, saz]));

    // Step 5: Build hierarchical structure
    const dzongkhagMap = new Map();

    for (const surveyEA of surveyEAs) {
      const ea = surveyEA.enumerationArea;
      
      // Handle multiple SAZs per EA via junction table
      const sazIds = ea.subAdministrativeZones?.map((saz) => saz.id) || [];
      
      // Process each SAZ linked to this EA
      for (const sazId of sazIds) {
        const saz = sazMap.get(sazId);
        if (!saz) continue;

        const az = saz.administrativeZone;
        const dzongkhag = az.dzongkhag;

      // Get or create Dzongkhag
      if (!dzongkhagMap.has(dzongkhag.id)) {
        dzongkhagMap.set(dzongkhag.id, {
          id: dzongkhag.id,
          name: dzongkhag.name,
          areaCode: dzongkhag.areaCode,
          administrativeZones: [],
        });
      }
      const dzongkhagObj = dzongkhagMap.get(dzongkhag.id);

      // Get or create Administrative Zone
      let azObj = dzongkhagObj.administrativeZones.find((a) => a.id === az.id);
      if (!azObj) {
        azObj = {
          id: az.id,
          dzongkhagId: az.dzongkhagId,
          name: az.name,
          areaCode: az.areaCode,
          type: az.type,
          subAdministrativeZones: [],
        };
        dzongkhagObj.administrativeZones.push(azObj);
      }

      // Get or create SAZ
      let sazObj = azObj.subAdministrativeZones.find((s) => s.id === saz.id);
      if (!sazObj) {
        sazObj = {
          id: saz.id,
          administrativeZoneId: saz.administrativeZoneId,
          name: saz.name,
          type: saz.type,
          areaCode: saz.areaCode,
          enumerationAreas: [],
        };
        azObj.subAdministrativeZones.push(sazObj);
      }

      // Get or create EA
      let eaObj = sazObj.enumerationAreas.find((e) => e.id === ea.id);
      if (!eaObj) {
        eaObj = {
          id: ea.id,
          subAdministrativeZoneIds: ea.subAdministrativeZones?.map((saz) => saz.id) || [],  // Via junction table
          name: ea.name,
          description: ea.description,
          areaCode: ea.areaCode,
          surveyEnumerationAreas: [],
        };
        sazObj.enumerationAreas.push(eaObj);
      }

      // Add survey enumeration area data
      eaObj.surveyEnumerationAreas.push({
        id: surveyEA.id,
        surveyId: surveyEA.surveyId,
        enumerationAreaId: surveyEA.enumerationAreaId,
        isEnumerated: surveyEA.isEnumerated,
        enumeratedBy: surveyEA.enumeratedBy,
        enumerationDate: surveyEA.enumerationDate,
        isSampled: surveyEA.isSampled,
        sampledBy: surveyEA.sampledBy,
        sampledDate: surveyEA.sampledDate,
        isPublished: surveyEA.isPublished,
        publishedBy: surveyEA.publishedBy,
        publishedDate: surveyEA.publishedDate,
        comments: surveyEA.comments,
        enumerator: surveyEA.enumerator,
        sampler: surveyEA.sampler,
        publisher: surveyEA.publisher,
        createdAt: surveyEA.createdAt,
        updatedAt: surveyEA.updatedAt,
      });
      } // Close sazIds for loop
    } // Close surveyEAs for loop

    return Array.from(dzongkhagMap.values());
  }

  /**
   * Get survey enumeration areas by enumeration area
   * @param enumerationAreaId
   */
  async findByEnumerationArea(enumerationAreaId: number) {
    return this.findAll(undefined, enumerationAreaId);
  }

  /**
   * Complete enumeration for a survey enumeration area (Enumerator only)
   * @param id - Survey Enumeration Area ID
   * @param completeDto - Enumeration completion data
   */
  async completeEnumeration(
    id: number,
    completeDto: CompleteEnumerationDto,
  ) {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(id);

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    if (surveyEA.isEnumerated) {
      throw new BadRequestException('Enumeration has already been completed');
    }

    // Check if there are any household listings for this survey enumeration area
    const householdListingsCount = await this.householdListingRepository.count({
      where: { surveyEnumerationAreaId: id },
    });

    if (householdListingsCount === 0) {
      throw new BadRequestException(
        'Cannot complete enumeration area with no household listings. Please add household data before completing.',
      );
    }

    // Update enumeration fields
    surveyEA.isEnumerated = true;
    surveyEA.enumeratedBy = completeDto.enumeratedBy;
    surveyEA.enumerationDate = new Date();

    await surveyEA.save();

    return this.findOne(id);
  }

  /**
   * Publish sampled data for a survey enumeration area (Admin only)
   * @param id - Survey Enumeration Area ID
   * @param publishDto - Publishing data
   */
  async publishData(id: number, publishDto: PublishSurveyEnumerationAreaDto) {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(id);

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    if (!surveyEA.isSampled) {
      throw new BadRequestException(
        'Data must be sampled before publishing',
      );
    }

    if (surveyEA.isPublished) {
      throw new BadRequestException('Data has already been published');
    }

    // Update publishing fields
    surveyEA.isPublished = true;
    surveyEA.publishedBy = publishDto.publishedBy;
    surveyEA.publishedDate = new Date();
    if (publishDto.comments) {
      surveyEA.comments = publishDto.comments;
    }

    await surveyEA.save();

    // Trigger annual statistics computation for the survey's year
    const survey = await this.surveyRepository.findByPk(surveyEA.surveyId, {
      attributes: ['id', 'year'],
    });

    if (survey) {
      const surveyYear = survey.year;
      const currentYear = new Date().getFullYear();

      // Only trigger stats computation if survey year is valid
      if (surveyYear >= 2000 && surveyYear <= currentYear + 1) {
        // Trigger annual statistics computation asynchronously (fire and forget)
        this.triggerAnnualStatsComputation(surveyYear).catch((error) => {
          console.error(
            `Error computing annual statistics for year ${surveyYear} after publishing:`,
            error,
          );
        });
      } else {
        console.warn(
          `Skipping annual stats computation: Survey year ${surveyYear} is outside valid range (2000-${currentYear + 1})`,
        );
      }
    }

    return this.findOne(id);
  }

  /**
   * Bulk publish sampled data for multiple enumeration areas (Admin only)
   * @param bulkPublishDto - Bulk publishing data
   */
  async bulkPublish(bulkPublishDto: BulkPublishDto) {
    const whereClause: any = {
      surveyId: bulkPublishDto.surveyId,
      isSampled: true,
      isPublished: false,
    };

    if (
      bulkPublishDto.enumerationAreaIds &&
      bulkPublishDto.enumerationAreaIds.length > 0
    ) {
      whereClause.id = bulkPublishDto.enumerationAreaIds;
    }

    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: whereClause,
      attributes: ['id', 'surveyId'],
    });

    if (surveyEAs.length === 0) {
      throw new BadRequestException(
        'No enumeration areas found that are sampled and ready for publishing',
      );
    }

    // Publish all in a transaction
    const publishedIds: number[] = [];
    for (const surveyEA of surveyEAs) {
      surveyEA.isPublished = true;
      surveyEA.publishedBy = bulkPublishDto.publishedBy;
      surveyEA.publishedDate = new Date();
      await surveyEA.save();
      publishedIds.push(surveyEA.id);
    }

    // Trigger annual statistics computation once for the survey's year
    const survey = await this.surveyRepository.findByPk(bulkPublishDto.surveyId, {
      attributes: ['id', 'year'],
    });

    if (survey) {
      const surveyYear = survey.year;
      const currentYear = new Date().getFullYear();

      if (surveyYear >= 2000 && surveyYear <= currentYear + 1) {
        this.triggerAnnualStatsComputation(surveyYear).catch((error) => {
          console.error(
            `Error computing annual statistics for year ${surveyYear} after bulk publishing:`,
            error,
          );
        });
      }
    }

    return {
      success: true,
      message: `Successfully published ${publishedIds.length} enumeration area(s)`,
      publishedCount: publishedIds.length,
      publishedIds,
    };
  }

  /**
   * Get enumeration areas that are enumerated and ready for sampling
   * @param surveyId - Survey ID
   */
  async getEnumeratedForSampling(surveyId: number) {
    return await this.surveyEnumerationAreaRepository.findAll({
      where: {
        surveyId,
        isEnumerated: true,
        isSampled: false,
      },
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode'],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name'],
        },
      ],
      order: [['enumerationDate', 'ASC']],
    });
  }

  /**
   * Get enumeration areas that are sampled and ready for publishing
   * @param surveyId - Survey ID
   */
  async getReadyForPublishing(surveyId: number) {
    return await this.surveyEnumerationAreaRepository.findAll({
      where: {
        surveyId,
        isSampled: true,
        isPublished: false,
      },
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode'],
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name'],
        },
      ],
      order: [['sampledDate', 'ASC']],
    });
  }

  /**
   * Get sampling status and progress for a survey
   * @param surveyId - Survey ID
   */
  async getSamplingStatus(surveyId: number) {
    const hierarchicalData = await this.findBySurveyWithEnumerationAreas(
      surveyId,
    );

    // Flatten the hierarchy to get all survey enumeration areas
    const allSurveyEAs = [];
    for (const dzongkhag of hierarchicalData) {
      for (const adminZone of dzongkhag.administrativeZones || []) {
        for (const saz of adminZone.subAdministrativeZones || []) {
          for (const ea of saz.enumerationAreas || []) {
            for (const surveyEA of ea.surveyEnumerationAreas || []) {
              allSurveyEAs.push(surveyEA);
            }
          }
        }
      }
    }

    const total = allSurveyEAs.length;
    const enumerated = allSurveyEAs.filter((ea) => ea.isEnumerated).length;
    const sampled = allSurveyEAs.filter((ea) => ea.isSampled).length;
    const published = allSurveyEAs.filter((ea) => ea.isPublished).length;
    const readyForSampling = enumerated - sampled;
    const readyForPublishing = sampled - published;

    return {
      total,
      enumerated,
      sampled,
      published,
      readyForSampling,
      readyForPublishing,
      enumerationRate:
        total > 0 ? ((enumerated / total) * 100).toFixed(2) : '0.00',
      samplingRate:
        enumerated > 0 ? ((sampled / enumerated) * 100).toFixed(2) : '0.00',
      publishingRate:
        sampled > 0 ? ((published / sampled) * 100).toFixed(2) : '0.00',
    };
  }

  /**
   * Trigger annual statistics computation asynchronously for a specific year
   * Called after successful publishing to update statistics
   * @param year - The survey year to compute statistics for
   */
  private async triggerAnnualStatsComputation(year: number): Promise<void> {
    try {
      // First compute EA-level stats for the survey year
      await this.eaAnnualStatsService.computeYearStats(year);
      
      // Then aggregate up the hierarchy for that year
      await this.dzongkhagAnnualStatsService.computeAnnualStatisticsForYear(year);
    } catch (error) {
      console.error(`Error in annual statistics computation for year ${year}:`, error);
      throw error;
    }
  }

  /**
   * Get submission statistics for a survey (kept for backward compatibility)
   * @param surveyId
   */
  async getSubmissionStatistics(surveyId: number) {
    const status = await this.getSamplingStatus(surveyId);

    // Map to old format for backward compatibility
    return {
      total: status.total,
      submitted: status.enumerated,
      validated: status.published,
      pending: status.total - status.enumerated,
      awaitingValidation: status.readyForPublishing,
      submissionRate: status.enumerationRate,
      validationRate: status.publishingRate,
    };
  }

  /**
   * Update survey enumeration area
   * @param id
   * @param updateSurveyEnumerationAreaDto
   */
  async update(
    id: number,
    updateSurveyEnumerationAreaDto: UpdateSurveyEnumerationAreaDto,
  ) {
    const [numRows] = await this.surveyEnumerationAreaRepository.update(
      updateSurveyEnumerationAreaDto,
      { where: { id } },
    );

    if (numRows === 0) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    return this.findOne(id);
  }

  /**
   * Remove survey enumeration area assignment
   * @param id
   */
  async remove(id: number) {
    const deleted = await this.surveyEnumerationAreaRepository.destroy({
      where: { id },
    });

    if (deleted === 0) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    return { deleted: true };
  }

  /**
   * Remove enumeration areas from a survey
   * @param surveyId - Survey ID
   * @param enumerationAreaIds - Array of enumeration area IDs to remove
   */
  async removeEnumerationAreasFromSurvey(
    surveyId: number,
    enumerationAreaIds: number[],
  ) {
    // Verify survey exists
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      throw new BadRequestException(`Survey with ID ${surveyId} not found`);
    }

    // Remove enumeration areas from survey
    const deleted = await this.surveyEnumerationAreaRepository.destroy({
      where: {
        surveyId,
        enumerationAreaId: { [Op.in]: enumerationAreaIds },
      },
    });

    return {
      deleted: true,
      deletedCount: deleted,
      surveyId,
      enumerationAreaIds,
    };
  }

  /**
   * Generate CSV template for bulk upload of enumeration areas
   * Template includes: Dzongkhag Code, Gewog/Thromde Code, Chiwog/Lap Code, Enumeration Code
   * @returns CSV template string
   */
  async generateCSVTemplate(): Promise<string> {
    const headers = [
      'Dzongkhag Code',
      'Gewog/Thromde Code',
      'Chiwog/Lap Code',
      'Enumeration Code',
    ];

    // Add example row
    const exampleRow = [
      '01', // Example dzongkhag code
      '01', // Example gewog/thromde code (admin zone)
      '01', // Example chiwog/lap code (sub admin zone)
      '01', // Example enumeration code
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}`;
  }

  /**
   * Parse CSV file and find enumeration areas by codes
   * @param csvContent - CSV file content as string
   * @returns Array of parsed rows
   */
  private parseCSV(csvContent: string): Array<{
    dzongkhagCode: string;
    adminZoneCode: string;
    subAdminZoneCode: string;
    enumerationCode: string;
    fullEaCode?: string;
  }> {
    console.log('[CSV Parse] Starting CSV parsing...');
    console.log('[CSV Parse] CSV content length:', csvContent.length);
    console.log('[CSV Parse] First 200 chars:', csvContent.substring(0, 200));

    const lines = csvContent.split('\n').filter((line) => line.trim());
    console.log('[CSV Parse] Total lines after filtering:', lines.length);
    
    if (lines.length < 2) {
      throw new BadRequestException('CSV file must contain at least a header and one data row');
    }

    // Parse header - handle quoted CSV values
    const headerLine = lines[0].trim();
    console.log('[CSV Parse] Header line:', headerLine);
    
    // Simple CSV parsing - split by comma and trim, remove quotes if present
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
    console.log('[CSV Parse] Parsed headers:', headers);

    // Find column indices - try exact match first, then partial match
    const findColumnIndex = (exactMatches: string[], partialChecks: ((h: string) => boolean)[]): number => {
      // Try exact matches first (case-insensitive)
      for (const exact of exactMatches) {
        const index = headers.findIndex((h) => h.toLowerCase() === exact.toLowerCase());
        if (index !== -1) {
          console.log(`[CSV Parse] Found exact match for "${exact}" at index ${index}`);
          return index;
        }
      }
      
      // Fall back to partial matching
      for (const check of partialChecks) {
        const index = headers.findIndex((h) => check(h.toLowerCase()));
        if (index !== -1) {
          console.log(`[CSV Parse] Found partial match at index ${index}`);
          return index;
        }
      }
      
      console.log(`[CSV Parse] No match found for column`);
      return -1;
    };

    const dzongkhagIndex = findColumnIndex(
      ['Dzongkhag Code', 'dzongkhag code', 'DzongkhagCode'],
      [(h) => h.includes('dzongkhag')]
    );
    console.log('[CSV Parse] Dzongkhag Code index:', dzongkhagIndex);

    const adminZoneIndex = findColumnIndex(
      [
        'Admin Zone Code',
        'admin zone code',
        'AdminZoneCode',
        'Administrative Zone Code',
        'Gewog/Thromde Code',
        'gewog/thromde code',
      ],
      [
        (h) =>
          (h.includes('admin') && h.includes('zone') && !h.includes('sub')) ||
          h.includes('gewog') ||
          h.includes('thromde'),
      ],
    );
    console.log('[CSV Parse] Admin Zone Code index:', adminZoneIndex);

    const subAdminZoneIndex = findColumnIndex(
      [
        'Sub Admin Zone Code',
        'sub admin zone code',
        'SubAdminZoneCode',
        'Sub Administrative Zone Code',
        'Chiwog/Lap Code',
        'chiwog/lap code',
      ],
      [
        (h) =>
          (h.includes('sub') && h.includes('admin') && h.includes('zone')) ||
          h.includes('chiwog') ||
          h.includes('lap'),
      ],
    );
    console.log('[CSV Parse] Sub Admin Zone Code index:', subAdminZoneIndex);

    const enumerationIndex = findColumnIndex(
      ['Enumeration Code', 'enumeration code', 'EnumerationCode', 'Enumeration Area Code'],
      [(h) => h.includes('enumeration')]
    );
    console.log('[CSV Parse] Enumeration Code index:', enumerationIndex);

    const fullEaIndex = findColumnIndex(
      ['Full EA Code', 'full ea code', 'FullEACode'],
      [(h) => h.includes('full') && h.includes('ea')]
    );
    console.log('[CSV Parse] Full EA Code index:', fullEaIndex);

    if (
      dzongkhagIndex === -1 ||
      adminZoneIndex === -1 ||
      subAdminZoneIndex === -1 ||
      enumerationIndex === -1
    ) {
      console.error('[CSV Parse] Missing required columns!');
      console.error('[CSV Parse] Dzongkhag:', dzongkhagIndex, 'Admin:', adminZoneIndex, 'Sub:', subAdminZoneIndex, 'Enum:', enumerationIndex);
      throw new BadRequestException(
        `CSV must contain columns: Dzongkhag Code, Admin Zone Code, Sub Admin Zone Code, Enumeration Code. Found headers: ${headers.join(', ')}`,
      );
    }

    const normalizeCode = (value: string | number): string => {
      // Convert to string first (handles both string and number inputs from CSV)
      const strValue = String(value || '').trim();
      if (!strValue) {
        return '';
      }
      // If purely numeric, ensure it's a two-character string
      // 1-9 => "01"-"09", 10+ => "10", "11", etc. (padStart only pads if length < 2)
      if (/^\d+$/.test(strValue)) {
        return strValue.padStart(2, '0');
      }
      return strValue;
    };

    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        console.log(`[CSV Parse] Skipping empty line ${i + 1}`);
        continue;
      }

      // Simple CSV parsing - split by comma and trim, remove quotes if present
      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
      console.log(`[CSV Parse] Row ${i + 1} values:`, values);
      
      if (values.length < 4) {
        console.log(`[CSV Parse] Skipping row ${i + 1} - insufficient values (${values.length})`);
        continue;
      }

      const rowData = {
        dzongkhagCode: normalizeCode(values[dzongkhagIndex] || ''),
        adminZoneCode: normalizeCode(values[adminZoneIndex] || ''),
        subAdminZoneCode: normalizeCode(values[subAdminZoneIndex] || ''),
        enumerationCode: normalizeCode(values[enumerationIndex] || ''),
        fullEaCode:
          fullEaIndex !== -1
            ? normalizeCode(values[fullEaIndex] || '') || undefined
            : undefined,
      };
      
      console.log(`[CSV Parse] Row ${i + 1} parsed:`, rowData);
      rows.push(rowData);
    }

    console.log('[CSV Parse] Total rows parsed:', rows.length);
    return rows;
  }

  /**
   * Find enumeration area by hierarchical codes
   * @param dzongkhagCode - Dzongkhag area code
   * @param adminZoneCode - Administrative zone area code
   * @param subAdminZoneCode - Sub-administrative zone area code
   * @param enumerationCode - Enumeration area code
   * @returns Enumeration area or null
   */
  private async findEnumerationAreaByCodes(
    dzongkhagCode: string,
    adminZoneCode: string,
    subAdminZoneCode: string,
    enumerationCode: string,
  ): Promise<EnumerationArea | null> {
    console.log('[EA Lookup] Searching for EA with codes:', {
      dzongkhagCode,
      adminZoneCode,
      subAdminZoneCode,
      enumerationCode,
    });

    // Step 1: Find dzongkhag
    console.log('[EA Lookup] Step 1: Looking for Dzongkhag with code:', dzongkhagCode);
    const dzongkhag = await this.dzongkhagRepository.findOne({
      where: { areaCode: dzongkhagCode },
    });

    if (!dzongkhag) {
      console.log('[EA Lookup] ❌ Dzongkhag not found with code:', dzongkhagCode);
      return null;
    }
    console.log('[EA Lookup] ✅ Found Dzongkhag:', dzongkhag.id, dzongkhag.name);

    // Step 2: Find administrative zone
    console.log('[EA Lookup] Step 2: Looking for Admin Zone with code:', adminZoneCode, 'in Dzongkhag:', dzongkhag.id);
    const adminZone = await AdministrativeZone.findOne({
      where: {
        areaCode: adminZoneCode,
        dzongkhagId: dzongkhag.id,
      },
    });

    if (!adminZone) {
      console.log('[EA Lookup] ❌ Admin Zone not found with code:', adminZoneCode, 'in Dzongkhag:', dzongkhag.id);
      return null;
    }
    console.log('[EA Lookup] ✅ Found Admin Zone:', adminZone.id, adminZone.name);

    // Step 3: Find sub-administrative zone
    console.log('[EA Lookup] Step 3: Looking for Sub Admin Zone with code:', subAdminZoneCode, 'in Admin Zone:', adminZone.id);
    const subAdminZone = await SubAdministrativeZone.findOne({
      where: {
        areaCode: subAdminZoneCode,
        administrativeZoneId: adminZone.id,
      },
    });

    if (!subAdminZone) {
      console.log('[EA Lookup] ❌ Sub Admin Zone not found with code:', subAdminZoneCode, 'in Admin Zone:', adminZone.id);
      return null;
    }
    console.log('[EA Lookup] ✅ Found Sub Admin Zone:', subAdminZone.id, subAdminZone.name);

    // Step 4: Find enumeration area via junction table
    console.log('[EA Lookup] Step 4: Looking for Enumeration Area with code:', enumerationCode, 'in Sub Admin Zone:', subAdminZone.id);
    const enumerationArea = await EnumerationArea.findOne({
      where: {
        areaCode: enumerationCode,
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',  // Via junction table
          where: { id: subAdminZone.id },
          through: { attributes: [] },
        },
      ],
    });

    if (!enumerationArea) {
      console.log('[EA Lookup] ❌ Enumeration Area not found with code:', enumerationCode, 'in Sub Admin Zone:', subAdminZone.id);
      return null;
    }
    console.log('[EA Lookup] ✅ Found Enumeration Area:', enumerationArea.id, enumerationArea.name);

    return enumerationArea;
  }

  /**
   * Bulk upload enumeration areas from CSV file
   * @param surveyId - Survey ID
   * @param csvContent - CSV file content as string
   * @returns Upload result with success/failure statistics
   */
  async bulkUploadFromCSV(
    surveyId: number,
    csvContent: string,
  ): Promise<BulkUploadEaResponseDto> {
    console.log('[Bulk Upload] ========================================');
    console.log('[Bulk Upload] Starting bulk upload for survey:', surveyId);
    console.log('[Bulk Upload] ========================================');

    // Verify survey exists
    console.log('[Bulk Upload] Verifying survey exists...');
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (!survey) {
      console.error('[Bulk Upload] ❌ Survey not found:', surveyId);
      throw new BadRequestException(`Survey with ID ${surveyId} not found`);
    }
    console.log('[Bulk Upload] ✅ Survey found:', survey.id, survey.name);

    // Parse CSV
    console.log('[Bulk Upload] Parsing CSV...');
    const rows = this.parseCSV(csvContent);
    console.log('[Bulk Upload] Parsed rows:', rows.length);
    
    if (rows.length === 0) {
      console.error('[Bulk Upload] ❌ No data rows found in CSV');
      throw new BadRequestException('CSV file contains no data rows');
    }

    const result: BulkUploadEaResponseDto = {
      success: true,
      totalRows: rows.length,
      successful: 0,
      failed: 0,
      errors: [],
      created: 0,
      skipped: 0,
    };

    // Get existing survey enumeration areas to avoid duplicates
    console.log('[Bulk Upload] Checking for existing enumeration areas...');
    const existingSurveyEAs = await this.surveyEnumerationAreaRepository.findAll(
      {
        where: { surveyId },
        attributes: ['enumerationAreaId'],
      },
    );
    const existingEaIds = new Set(
      existingSurveyEAs.map((sea) => sea.enumerationAreaId),
    );
    console.log('[Bulk Upload] Found', existingEaIds.size, 'existing enumeration areas');

    // Process each row
    console.log('[Bulk Upload] Processing', rows.length, 'rows...');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is header
      
      console.log(`[Bulk Upload] --- Processing row ${rowNumber} ---`);

      try {
        // Validate required fields
        if (
          !row.dzongkhagCode ||
          !row.adminZoneCode ||
          !row.subAdminZoneCode ||
          !row.enumerationCode
        ) {
          console.log(`[Bulk Upload] ❌ Row ${rowNumber}: Missing required codes`);
          result.errors.push({
            row: rowNumber,
            codes: `${row.dzongkhagCode || ''}-${row.adminZoneCode || ''}-${row.subAdminZoneCode || ''}-${row.enumerationCode || ''}`,
            error: 'Missing required codes',
          });
          result.failed++;
          continue;
        }

        // Find enumeration area
        console.log(`[Bulk Upload] Row ${rowNumber}: Looking up enumeration area...`);
        const enumerationArea = await this.findEnumerationAreaByCodes(
          row.dzongkhagCode,
          row.adminZoneCode,
          row.subAdminZoneCode,
          row.enumerationCode,
        );

        if (!enumerationArea) {
          console.log(`[Bulk Upload] ❌ Row ${rowNumber}: Enumeration area not found`);
          result.errors.push({
            row: rowNumber,
            codes: `${row.dzongkhagCode}-${row.adminZoneCode}-${row.subAdminZoneCode}-${row.enumerationCode}`,
            error: 'Enumeration area not found with these codes',
          });
          result.failed++;
          continue;
        }

        // Check if already exists
        if (existingEaIds.has(enumerationArea.id)) {
          console.log(`[Bulk Upload] ⚠️ Row ${rowNumber}: Already exists, skipping`);
          result.skipped++;
          result.successful++;
          continue;
        }

        // Create survey enumeration area
        console.log(`[Bulk Upload] Row ${rowNumber}: Creating survey enumeration area...`);
        await this.surveyEnumerationAreaRepository.create({
          surveyId,
          enumerationAreaId: enumerationArea.id,
        });

        console.log(`[Bulk Upload] ✅ Row ${rowNumber}: Successfully created`);
        result.created++;
        result.successful++;
        existingEaIds.add(enumerationArea.id); // Add to set to avoid duplicates in same batch
      } catch (error) {
        console.error(`[Bulk Upload] ❌ Row ${rowNumber}: Error:`, error.message);
        console.error(`[Bulk Upload] Error stack:`, error.stack);
        result.errors.push({
          row: rowNumber,
          codes: `${row.dzongkhagCode || ''}-${row.adminZoneCode || ''}-${row.subAdminZoneCode || ''}-${row.enumerationCode || ''}`,
          error: error.message || 'Unknown error',
        });
        result.failed++;
      }
    }

    result.success = result.failed === 0;
    console.log('[Bulk Upload] ========================================');
    console.log('[Bulk Upload] Upload complete!');
    console.log('[Bulk Upload] Result:', result);
    console.log('[Bulk Upload] ========================================');
    return result;
  }

  /**
   * Find enumeration area with full hierarchy information by codes
   * Used for bulk matching to return detailed information
   * @param dzongkhagCode - Dzongkhag area code
   * @param adminZoneCode - Administrative zone area code
   * @param subAdminZoneCode - Sub-administrative zone area code
   * @param enumerationCode - Enumeration area code
   * @returns Enumeration area with hierarchy or null
   */
  private async findEnumerationAreaByCodesWithHierarchy(
    dzongkhagCode: string,
    adminZoneCode: string,
    subAdminZoneCode: string,
    enumerationCode: string,
  ): Promise<{
    enumerationArea: EnumerationArea;
    subAdminZone: SubAdministrativeZone;
    adminZone: AdministrativeZone;
    dzongkhag: Dzongkhag;
  } | null> {
    // Step 1: Find dzongkhag
    const dzongkhag = await this.dzongkhagRepository.findOne({
      where: { areaCode: dzongkhagCode },
    });

    if (!dzongkhag) {
      return null;
    }

    // Step 2: Find administrative zone
    const adminZone = await AdministrativeZone.findOne({
      where: {
        areaCode: adminZoneCode,
        dzongkhagId: dzongkhag.id,
      },
    });

    if (!adminZone) {
      return null;
    }

    // Step 3: Find sub-administrative zone
    const subAdminZone = await SubAdministrativeZone.findOne({
      where: {
        areaCode: subAdminZoneCode,
        administrativeZoneId: adminZone.id,
      },
    });

    if (!subAdminZone) {
      return null;
    }

    // Step 4: Find enumeration area via junction table
    const enumerationArea = await EnumerationArea.findOne({
      where: {
        areaCode: enumerationCode,
      },
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones', // Via junction table
          where: { id: subAdminZone.id },
          through: { attributes: [] },
        },
      ],
    });

    if (!enumerationArea) {
      return null;
    }

    return {
      enumerationArea,
      subAdminZone,
      adminZone,
      dzongkhag,
    };
  }

  /**
   * Bulk match enumeration areas from CSV file (without survey ID)
   * Used during survey creation workflow to validate and match enumeration areas
   * before survey is created. Returns matched enumeration areas with full hierarchy.
   * @param csvContent - CSV file content as string
   * @returns Match result with matched enumeration areas and errors
   */
  async bulkMatchFromCSV(
    csvContent: string,
  ): Promise<BulkMatchEaResponseDto> {
    console.log('[Bulk Match] ========================================');
    console.log('[Bulk Match] Starting bulk match (no survey ID)');
    console.log('[Bulk Match] ========================================');

    // Parse CSV
    console.log('[Bulk Match] Parsing CSV...');
    const rows = this.parseCSV(csvContent);
    console.log('[Bulk Match] Parsed rows:', rows.length);

    if (rows.length === 0) {
      console.error('[Bulk Match] ❌ No data rows found in CSV');
      throw new BadRequestException('CSV file contains no data rows');
    }

    const result: BulkMatchEaResponseDto = {
      success: true,
      totalRows: rows.length,
      matched: 0,
      failed: 0,
      errors: [],
      matches: [],
      matchedEnumerationAreaIds: [],
    };

    const matchedEaIds = new Set<number>();

    // Process each row
    console.log('[Bulk Match] Processing', rows.length, 'rows...');
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 because row 1 is header

      console.log(`[Bulk Match] --- Processing row ${rowNumber} ---`);

      try {
        // Validate required fields
        if (
          !row.dzongkhagCode ||
          !row.adminZoneCode ||
          !row.subAdminZoneCode ||
          !row.enumerationCode
        ) {
          console.log(`[Bulk Match] ❌ Row ${rowNumber}: Missing required codes`);
          const error: BulkMatchEaRowError = {
            row: rowNumber,
            dzongkhagCode: row.dzongkhagCode || '',
            gewogThromdeCode: row.adminZoneCode || '',
            chiwogLapCode: row.subAdminZoneCode || '',
            eaCode: row.enumerationCode || '',
            error: 'Missing required codes',
          };
          result.errors.push(error);
          result.failed++;
          continue;
        }

        // Find enumeration area with hierarchy
        console.log(`[Bulk Match] Row ${rowNumber}: Looking up enumeration area with hierarchy...`);
        const hierarchy = await this.findEnumerationAreaByCodesWithHierarchy(
          row.dzongkhagCode,
          row.adminZoneCode,
          row.subAdminZoneCode,
          row.enumerationCode,
        );

        if (!hierarchy) {
          console.log(`[Bulk Match] ❌ Row ${rowNumber}: Enumeration area not found`);
          const error: BulkMatchEaRowError = {
            row: rowNumber,
            dzongkhagCode: row.dzongkhagCode,
            gewogThromdeCode: row.adminZoneCode,
            chiwogLapCode: row.subAdminZoneCode,
            eaCode: row.enumerationCode,
            error: 'Enumeration area not found with these codes',
          };
          result.errors.push(error);
          result.failed++;
          continue;
        }

        const { enumerationArea, subAdminZone, adminZone, dzongkhag } = hierarchy;

        // Create match record
        const match: BulkMatchEaRowMatch = {
          row: rowNumber,
          enumerationAreaId: enumerationArea.id,
          enumerationAreaName: enumerationArea.name,
          enumerationAreaCode: enumerationArea.areaCode,
          subAdminZoneName: subAdminZone.name,
          adminZoneName: adminZone.name,
          dzongkhagName: dzongkhag.name,
          codes: {
            dzongkhagCode: row.dzongkhagCode,
            adminZoneCode: row.adminZoneCode,
            subAdminZoneCode: row.subAdminZoneCode,
            enumerationCode: row.enumerationCode,
          },
        };

        console.log(`[Bulk Match] ✅ Row ${rowNumber}: Successfully matched`);
        result.matches.push(match);
        result.matched++;
        matchedEaIds.add(enumerationArea.id);
      } catch (error) {
        console.error(`[Bulk Match] ❌ Row ${rowNumber}: Error:`, error.message);
        console.error(`[Bulk Match] Error stack:`, error.stack);
        const errorRecord: BulkMatchEaRowError = {
          row: rowNumber,
          dzongkhagCode: row.dzongkhagCode || '',
          gewogThromdeCode: row.adminZoneCode || '',
          chiwogLapCode: row.subAdminZoneCode || '',
          eaCode: row.enumerationCode || '',
          error: error.message || 'Unknown error',
        };
        result.errors.push(errorRecord);
        result.failed++;
      }
    }

    // Convert Set to Array for matched IDs
    result.matchedEnumerationAreaIds = Array.from(matchedEaIds);

    result.success = result.failed === 0;
    console.log('[Bulk Match] ========================================');
    console.log('[Bulk Match] Match complete!');
    console.log('[Bulk Match] Result:', {
      totalRows: result.totalRows,
      matched: result.matched,
      failed: result.failed,
      uniqueEAs: result.matchedEnumerationAreaIds.length,
    });
    console.log('[Bulk Match] ========================================');
    return result;
  }

  /**
   * Get survey enumeration areas by survey for supervisor (scoped to supervisor's dzongkhags)
   * @param supervisorId
   * @param surveyId
   */
  async findBySurveyForSupervisor(
    supervisorId: number,
    surveyId: number,
  ) {
    const dzongkhagIds = await this.supervisorHelperService.getSupervisorDzongkhagIds(
      supervisorId,
    );
    if (dzongkhagIds.length === 0) {
      return [];
    }

    // Get all survey enumeration areas with EA info and SAZs via junction table
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      include: [
        {
          model: EnumerationArea,
          attributes: { exclude: ['geom'] },
          include: [
            {
              model: SubAdministrativeZone,
              as: 'subAdministrativeZones',
              through: { attributes: [] },
              attributes: { exclude: ['geom'] },
              include: [
                {
                  model: AdministrativeZone,
                  attributes: { exclude: ['geom'] },
                  where: { dzongkhagId: { [Op.in]: dzongkhagIds } },
                  required: true,
                },
              ],
            },
          ],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
      ],
    });

    if (surveyEAs.length === 0) {
      return [];
    }

    // Filter to only include EAs that have at least one SAZ in supervisor's dzongkhags
    const filteredSurveyEAs = surveyEAs.filter((surveyEA) => {
      const ea = surveyEA.enumerationArea;
      if (!ea || !ea.subAdministrativeZones) {
        return false;
      }
      return ea.subAdministrativeZones.some((saz) => {
        const az = saz.administrativeZone;
        return az && dzongkhagIds.includes(az.dzongkhagId);
      });
    });

    // Get unique SAZ IDs from filtered results
    const sazIds = [
      ...new Set(
        filteredSurveyEAs.flatMap((sea) =>
          sea.enumerationArea.subAdministrativeZones
            ?.map((saz) => saz.id)
            .filter((id) => id !== undefined) || [],
        ),
      ),
    ];

    // Get all SAZs with their parent AZ and Dzongkhag
    const sazs = await SubAdministrativeZone.findAll({
      where: { id: sazIds },
      attributes: { exclude: ['geom'] },
      include: [
        {
          model: AdministrativeZone,
          attributes: { exclude: ['geom'] },
          include: [
            {
              model: Dzongkhag,
              attributes: { exclude: ['geom'] },
            },
          ],
        },
      ],
    });

    // Build maps for quick lookup
    const sazMap = new Map(sazs.map((saz) => [saz.id, saz]));

    // Build hierarchical structure (same as findBySurveyWithEnumerationAreas)
    const dzongkhagMap = new Map();

    for (const surveyEA of filteredSurveyEAs) {
      const ea = surveyEA.enumerationArea;
      const sazIds = ea.subAdministrativeZones?.map((saz) => saz.id) || [];

      for (const sazId of sazIds) {
        const saz = sazMap.get(sazId);
        if (!saz) continue;

        const az = saz.administrativeZone;
        const dzongkhag = az.dzongkhag;

        // Only include if dzongkhag is in supervisor's dzongkhags
        if (!dzongkhagIds.includes(dzongkhag.id)) {
          continue;
        }

        // Get or create Dzongkhag
        if (!dzongkhagMap.has(dzongkhag.id)) {
          dzongkhagMap.set(dzongkhag.id, {
            id: dzongkhag.id,
            name: dzongkhag.name,
            areaCode: dzongkhag.areaCode,
            administrativeZones: [],
          });
        }
        const dzongkhagObj = dzongkhagMap.get(dzongkhag.id);

        // Get or create Administrative Zone
        let azObj = dzongkhagObj.administrativeZones.find((a) => a.id === az.id);
        if (!azObj) {
          azObj = {
            id: az.id,
            dzongkhagId: az.dzongkhagId,
            name: az.name,
            areaCode: az.areaCode,
            type: az.type,
            subAdministrativeZones: [],
          };
          dzongkhagObj.administrativeZones.push(azObj);
        }

        // Get or create SAZ
        let sazObj = azObj.subAdministrativeZones.find((s) => s.id === saz.id);
        if (!sazObj) {
          sazObj = {
            id: saz.id,
            administrativeZoneId: saz.administrativeZoneId,
            name: saz.name,
            type: saz.type,
            areaCode: saz.areaCode,
            enumerationAreas: [],
          };
          azObj.subAdministrativeZones.push(sazObj);
        }

        // Get or create EA
        let eaObj = sazObj.enumerationAreas.find((e) => e.id === ea.id);
        if (!eaObj) {
          eaObj = {
            id: ea.id,
            subAdministrativeZoneIds:
              ea.subAdministrativeZones?.map((saz) => saz.id) || [],
            name: ea.name,
            description: ea.description,
            areaCode: ea.areaCode,
            surveyEnumerationAreas: [],
          };
          sazObj.enumerationAreas.push(eaObj);
        }

        // Add survey enumeration area data
        eaObj.surveyEnumerationAreas.push({
          id: surveyEA.id,
          surveyId: surveyEA.surveyId,
          enumerationAreaId: surveyEA.enumerationAreaId,
          isEnumerated: surveyEA.isEnumerated,
          enumeratedBy: surveyEA.enumeratedBy,
          enumerationDate: surveyEA.enumerationDate,
          isSampled: surveyEA.isSampled,
          sampledBy: surveyEA.sampledBy,
          sampledDate: surveyEA.sampledDate,
          isPublished: surveyEA.isPublished,
          publishedBy: surveyEA.publishedBy,
          publishedDate: surveyEA.publishedDate,
          comments: surveyEA.comments,
          enumerator: surveyEA.enumerator,
          sampler: surveyEA.sampler,
          publisher: surveyEA.publisher,
          createdAt: surveyEA.createdAt,
          updatedAt: surveyEA.updatedAt,
        });
      }
    }

    return Array.from(dzongkhagMap.values());
  }

  /**
   * Get single SurveyEA for supervisor (with access check)
   * @param supervisorId
   * @param id
   */
  async findOneForSupervisor(supervisorId: number, id: number) {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(id, {
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year', 'status'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode'],
        },
        {
          model: User,
          as: 'enumerator',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'sampler',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'publisher',
          attributes: ['id', 'name', 'role'],
        },
      ],
    });

    if (!surveyEA) {
      throw new BadRequestException('Survey enumeration area not found');
    }

    // Verify access
    const hasAccess = await this.supervisorHelperService.verifySupervisorAccessToSurveyEA(
      supervisorId,
      id,
    );

    if (!hasAccess) {
      throw new ForbiddenException(
        'You do not have access to this enumeration area',
      );
    }

    return surveyEA;
  }
}
