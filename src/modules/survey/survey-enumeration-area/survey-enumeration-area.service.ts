import {
  Inject,
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  CreateSurveyEnumerationAreaDto,
  SubmitSurveyEnumerationAreaDto,
  ValidateSurveyEnumerationAreaDto,
} from './dto/create-survey-enumeration-area.dto';
import { UpdateSurveyEnumerationAreaDto } from './dto/update-survey-enumeration-area.dto';
import { SurveyEnumerationArea } from './entities/survey-enumeration-area.entity';
import { Survey } from '../survey/entities/survey.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { User } from '../../auth/entities/user.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SubAdministrativeZone } from 'src/modules/location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from 'src/modules/location/administrative-zone/entities/administrative-zone.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';

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
   * @param isSubmitted - Optional filter by submission status
   * @param isValidated - Optional filter by validation status
   */
  async findAll(
    surveyId?: number,
    enumerationAreaId?: number,
    isSubmitted?: boolean,
    isValidated?: boolean,
  ) {
    const whereClause: any = {};

    if (surveyId !== undefined) whereClause.surveyId = surveyId;
    if (enumerationAreaId !== undefined)
      whereClause.enumerationAreaId = enumerationAreaId;
    if (isSubmitted !== undefined) whereClause.isSubmitted = isSubmitted;
    if (isValidated !== undefined) whereClause.isValidated = isValidated;

    return await this.surveyEnumerationAreaRepository.findAll({
      where: whereClause,
      include: [
        {
          model: Survey,
          attributes: ['id', 'name', 'year', 'status'],
        },
        {
          model: EnumerationArea,
          attributes: ['id', 'name', 'areaCode', 'areaSqKm'],
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'validator',
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
          attributes: ['id', 'name', 'areaCode', 'areaSqKm'],
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'role'],
        },
        {
          model: User,
          as: 'validator',
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
    // Step 1: Get all survey enumeration areas with basic EA info
    const surveyEAs = await this.surveyEnumerationAreaRepository.findAll({
      where: { surveyId },
      include: [
        {
          model: EnumerationArea,
          attributes: { exclude: ['geom'] },
        },
        {
          model: User,
          as: 'submitter',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
        {
          model: User,
          as: 'validator',
          attributes: ['id', 'name', 'cid', 'phoneNumber'],
          required: false,
        },
      ],
    });

    if (surveyEAs.length === 0) {
      return [];
    }

    // Step 2: Get unique SAZ IDs
    const sazIds = [
      ...new Set(
        surveyEAs.map((sea) => sea.enumerationArea.subAdministrativeZoneId),
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
      const saz = sazMap.get(ea.subAdministrativeZoneId);
      if (!saz) continue;

      const az = saz.administrativeZone;
      const dzongkhag = az.dzongkhag;

      // Get or create Dzongkhag
      if (!dzongkhagMap.has(dzongkhag.id)) {
        dzongkhagMap.set(dzongkhag.id, {
          id: dzongkhag.id,
          name: dzongkhag.name,
          areaCode: dzongkhag.areaCode,
          areaSqKm: dzongkhag.areaSqKm,
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
          areaSqKm: az.areaSqKm,
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
          areaSqKm: saz.areaSqKm,
          enumerationAreas: [],
        };
        azObj.subAdministrativeZones.push(sazObj);
      }

      // Get or create EA
      let eaObj = sazObj.enumerationAreas.find((e) => e.id === ea.id);
      if (!eaObj) {
        eaObj = {
          id: ea.id,
          subAdministrativeZoneId: ea.subAdministrativeZoneId,
          name: ea.name,
          description: ea.description,
          areaCode: ea.areaCode,
          areaSqKm: ea.areaSqKm,
          surveyEnumerationAreas: [],
        };
        sazObj.enumerationAreas.push(eaObj);
      }

      // Add survey enumeration area data
      eaObj.surveyEnumerationAreas.push({
        id: surveyEA.id,
        surveyId: surveyEA.surveyId,
        enumerationAreaId: surveyEA.enumerationAreaId,
        isSubmitted: surveyEA.isSubmitted,
        submittedBy: surveyEA.submittedBy,
        submissionDate: surveyEA.submissionDate,
        isValidated: surveyEA.isValidated,
        validatedBy: surveyEA.validatedBy,
        validationDate: surveyEA.validationDate,
        comments: surveyEA.comments,
        submitter: surveyEA.submitter,
        validator: surveyEA.validator,
        createdAt: surveyEA.createdAt,
        updatedAt: surveyEA.updatedAt,
      });
    }

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
   * Submit data for a survey enumeration area (Supervisor only)
   * @param id - Survey Enumeration Area ID
   * @param submitDto - Submission data
   */
  async submitData(id: number, submitDto: SubmitSurveyEnumerationAreaDto) {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(id);

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    if (surveyEA.isSubmitted) {
      throw new BadRequestException('Data has already been submitted');
    }

    if (surveyEA.isValidated) {
      throw new BadRequestException(
        'Data has already been validated and cannot be resubmitted',
      );
    }

    // Check if there are any household listings for this survey enumeration area
    const householdListingsCount = await this.householdListingRepository.count({
      where: { surveyEnumerationAreaId: id },
    });

    if (householdListingsCount === 0) {
      throw new BadRequestException(
        'Cannot submit enumeration area with no household listings. Please add household data before submitting.',
      );
    }

    // Update submission fields
    surveyEA.isSubmitted = true;
    surveyEA.submittedBy = submitDto.submittedBy;
    surveyEA.submissionDate = new Date();

    await surveyEA.save();

    return this.findOne(id);
  }

  /**
   * Validate submitted data (Admin only)
   * @param id - Survey Enumeration Area ID
   * @param validateDto - Validation data
   */
  async validateData(
    id: number,
    validateDto: ValidateSurveyEnumerationAreaDto,
  ) {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(id);

    if (!surveyEA) {
      throw new BadRequestException(
        `Survey Enumeration Area with ID ${id} not found`,
      );
    }

    if (!surveyEA.isSubmitted) {
      throw new BadRequestException('Data must be submitted before validation');
    }

    if (surveyEA.isValidated) {
      throw new BadRequestException('Data has already been validated');
    }

    // If rejected, reset submission status
    if (!validateDto.isApproved) {
      surveyEA.isSubmitted = false;
      surveyEA.submittedBy = null;
      surveyEA.submissionDate = null;
      surveyEA.isValidated = false;
      surveyEA.comments = validateDto.comments || 'Rejected by admin';
    } else {
      // If approved, mark as validated
      surveyEA.isValidated = true;
      surveyEA.validatedBy = validateDto.validatedBy;
      surveyEA.validationDate = new Date();
      if (validateDto.comments) {
        surveyEA.comments = validateDto.comments;
      }
    }

    await surveyEA.save();

    // Check if all EAs are validated and update survey flag
    if (validateDto.isApproved) {
      await this.updateSurveyValidationStatus(surveyEA.surveyId);
    }

    return this.findOne(id);
  }

  /**
   * Check if all enumeration areas are validated and update survey flag
   * @param surveyId
   */
  private async updateSurveyValidationStatus(surveyId: number): Promise<void> {
    const stats = await this.getSubmissionStatistics(surveyId);

    // Update survey isFullyValidated flag
    const survey = await this.surveyRepository.findByPk(surveyId);
    if (survey) {
      survey.isFullyValidated =
        stats.total > 0 && stats.validated === stats.total;
      await survey.save();
    }
  }

  /**
   * Get submission statistics for a survey
   * @param surveyId
   */
  async getSubmissionStatistics(surveyId: number) {
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
    const submitted = allSurveyEAs.filter((ea) => ea.isSubmitted).length;
    const validated = allSurveyEAs.filter((ea) => ea.isValidated).length;
    const pending = total - submitted;
    const awaitingValidation = submitted - validated;

    return {
      total,
      submitted,
      validated,
      pending,
      awaitingValidation,
      submissionRate:
        total > 0 ? ((submitted / total) * 100).toFixed(2) : '0.00',
      validationRate:
        total > 0 ? ((validated / total) * 100).toFixed(2) : '0.00',
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
}
