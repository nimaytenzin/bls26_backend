import {
  Inject,
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateSurveyEnumerationAreaStructureDto } from './dto/create-survey-enumeration-area-structure.dto';
import { UpdateSurveyEnumerationAreaStructureDto } from './dto/update-survey-enumeration-area-structure.dto';
import { SurveyEnumerationAreaStructure } from './entities/survey-enumeration-area-structure.entity';
import { SurveyEnumerationArea } from '../survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SurveyEnumerationAreaHouseholdListing } from '../survey-enumeration-area-household-listing/entities/survey-enumeration-area-household-listing.entity';
import { SurveyEnumerationAreaHouseholdSample } from '../../sampling/entities/survey-enumeration-area-household-sample.entity';
import { User } from '../../auth/entities/user.entity';
import { Op } from 'sequelize';

@Injectable()
export class SurveyEnumerationAreaStructureService {
  constructor(
    @Inject('SURVEY_ENUMERATION_AREA_STRUCTURE_REPOSITORY')
    private readonly structureRepository: typeof SurveyEnumerationAreaStructure,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_ENUMERATION_AREA_HOUSEHOLD_LISTING_REPOSITORY')
    private readonly householdListingRepository: typeof SurveyEnumerationAreaHouseholdListing,
    @Inject('SURVEY_EA_HOUSEHOLD_SAMPLE_REPOSITORY')
    private readonly householdSampleRepository: typeof SurveyEnumerationAreaHouseholdSample,
  ) {}

  /**
   * Create a new structure point
   * @param createDto
   */
  async create(
    createDto: CreateSurveyEnumerationAreaStructureDto,
  ): Promise<SurveyEnumerationAreaStructure> {
    // Verify survey enumeration area exists
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      createDto.surveyEnumerationAreaId,
    );
    if (!surveyEA) {
      throw new NotFoundException(
        `Survey enumeration area with ID ${createDto.surveyEnumerationAreaId} not found`,
      );
    }

    try {
      return await this.structureRepository.create(createDto as any);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Structure with number ${createDto.structureNumber} already exists for this survey enumeration area`,
        );
      }
      throw error;
    }
  }

  /**
   * Get all structures with optional filters
   * @param surveyEnumerationAreaId - Optional filter by survey enumeration area
   */
  async findAll(
    surveyEnumerationAreaId?: number,
  ): Promise<SurveyEnumerationAreaStructure[]> {
    const whereClause: any = {};

    if (surveyEnumerationAreaId !== undefined) {
      whereClause.surveyEnumerationAreaId = surveyEnumerationAreaId;
    }

    return await this.structureRepository.findAll({
      where: whereClause,
      include: [
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
        },
      ],
      order: [['structureNumber', 'ASC']],
    });
  }

  /**
   * Get structure by ID
   * @param id
   */
  async findOne(id: number): Promise<SurveyEnumerationAreaStructure> {
    const structure = await this.structureRepository.findByPk(id, {
      include: [
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
        },
        {
          model: SurveyEnumerationAreaHouseholdListing,
          attributes: ['id', 'householdSerialNumber', 'householdIdentification', 'nameOfHOH'],
        },
      ],
    });

    if (!structure) {
      throw new NotFoundException(`Structure with ID ${id} not found`);
    }

    return structure;
  }

  /**
   * Get structures for a specific survey enumeration area with household listings
   * Returns all structures with their associated household listings grouped by structure
   * Perfect for displaying household listings grouped by structure
   * @param surveyEnumerationAreaId - Survey Enumeration Area ID
   * @returns Array of structures, each containing its household listings
   */
  async findBySurveyEnumerationArea(
    surveyEnumerationAreaId: number,
  ): Promise<SurveyEnumerationAreaStructure[]> {
    // Verify survey enumeration area exists
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
    );
    if (!surveyEA) {
      throw new NotFoundException(
        `Survey enumeration area with ID ${surveyEnumerationAreaId} not found`,
      );
    }

    return await this.structureRepository.findAll({
      where: { surveyEnumerationAreaId },
      include: [
        {
          model: SurveyEnumerationAreaHouseholdListing,
          attributes: [
            'id',
            'householdIdentification',
            'householdSerialNumber',
            'nameOfHOH',
            'totalMale',
            'totalFemale',
            'phoneNumber',
            'remarks',
            'submittedBy',
            'createdAt',
            'updatedAt',
          ],
          include: [
            {
              model: User,
              as: 'submitter',
              attributes: ['id', 'name', 'cid', 'emailAddress', 'phoneNumber'],
            },
          ],
          order: [['householdSerialNumber', 'ASC']],
        },
        {
          model: SurveyEnumerationArea,
          attributes: ['id', 'surveyId', 'enumerationAreaId'],
        },
      ],
      order: [['structureNumber', 'ASC']],
    });
  }

  /**
   * Update a structure
   * @param id
   * @param updateDto
   */
  async update(
    id: number,
    updateDto: UpdateSurveyEnumerationAreaStructureDto,
  ): Promise<SurveyEnumerationAreaStructure> {
    const structure = await this.findOne(id);

    // If updating surveyEnumerationAreaId, verify it exists
    if (updateDto.surveyEnumerationAreaId) {
      const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
        updateDto.surveyEnumerationAreaId,
      );
      if (!surveyEA) {
        throw new NotFoundException(
          `Survey enumeration area with ID ${updateDto.surveyEnumerationAreaId} not found`,
        );
      }
    }

    try {
      await structure.update(updateDto);
      return await this.findOne(id);
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          `Structure with number ${updateDto.structureNumber} already exists for this survey enumeration area`,
        );
      }
      throw error;
    }
  }

  /**
   * Delete a structure
   * @param id
   */
  async remove(id: number): Promise<void> {
    const structure = await this.findOne(id);

    // Check if structure has associated households
    const householdCount = await this.householdListingRepository.count({
      where: { structureId: id },
    });

    if (householdCount > 0) {
      throw new BadRequestException(
        `Cannot delete structure with ID ${id}. It has ${householdCount} associated household(s). Please remove or reassign households first.`,
      );
    }

    await structure.destroy();
  }

  /**
   * Force delete a structure and all its associated household listings (and their samples).
   * Deletes in order: household samples → household listings → structure.
   */
  async removeForce(id: number): Promise<void> {
    const structure = await this.structureRepository.findByPk(id);
    if (!structure) {
      throw new NotFoundException(`Structure with ID ${id} not found`);
    }

    const listings = await this.householdListingRepository.findAll({
      where: { structureId: id },
      attributes: ['id'],
    });
    const listingIds = listings.map((l) => l.id);

    if (listingIds.length > 0) {
      await this.householdSampleRepository.destroy({
        where: { householdListingId: { [Op.in]: listingIds } },
      });
      await this.householdListingRepository.destroy({
        where: { structureId: id },
      });
    }

    await structure.destroy();
  }
}

