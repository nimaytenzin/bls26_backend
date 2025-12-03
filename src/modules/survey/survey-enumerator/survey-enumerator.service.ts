import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateSurveyEnumeratorDto } from './dto/create-survey-enumerator.dto';
import { UpdateSurveyEnumeratorDto } from './dto/update-survey-enumerator.dto';
import { SurveyEnumerator } from './entities/survey-enumerator.entity';
import { User, UserRole } from 'src/modules/auth/entities/user.entity';
import { Survey } from '../survey/entities/survey.entity';
import * as bcrypt from 'bcrypt';
import { EnumeratorCsvRowDto } from './dto/bulk-assign-csv.dto';

@Injectable()
export class SurveyEnumeratorService {
  constructor(
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
  ) {}

  async create(
    createSurveyEnumeratorDto: CreateSurveyEnumeratorDto,
  ): Promise<SurveyEnumerator> {
    try {
      const surveyEnumerator = await this.surveyEnumeratorRepository.create(
        createSurveyEnumeratorDto,
      );
      return surveyEnumerator;
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          'This enumerator is already assigned to this survey',
        );
      }
      throw error;
    }
  }

  async findAll(): Promise<SurveyEnumerator[]> {
    return this.surveyEnumeratorRepository.findAll({
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'emailAddress', 'cid', 'phoneNumber', 'role'],
        },
        {
          model: Survey,
          attributes: [
            'id',
            'name',
            'description',
            'startDate',
            'endDate',
            'year',
            'status',
            'isFullyValidated',
          ],
        },
      ],
    });
  }

  async findBySurvey(surveyId: number): Promise<SurveyEnumerator[]> {
    return this.surveyEnumeratorRepository.findAll({
      where: { surveyId },
      include: [
        {
          model: User,
        },
      ],
    });
  }

  async findByEnumerator(userId: number): Promise<SurveyEnumerator[]> {
    return this.surveyEnumeratorRepository.findAll({
      where: { userId },
      include: [
        {
          model: Survey,
          attributes: [
            'id',
            'name',
            'description',
            'startDate',
            'endDate',
            'year',
            'status',
            'isFullyValidated',
          ],
        },
      ],
    });
  }

  async findOne(userId: number, surveyId: number): Promise<SurveyEnumerator> {
    const surveyEnumerator = await this.surveyEnumeratorRepository.findOne({
      where: { userId, surveyId },
      include: [
        {
          model: User,
          attributes: ['id', 'name', 'emailAddress', 'cid', 'phoneNumber', 'role'],
        },
        {
          model: Survey,
          attributes: [
            'id',
            'name',
            'description',
            'startDate',
            'endDate',
            'year',
            'status',
            'isFullyValidated',
          ],
        },
      ],
    });

    if (!surveyEnumerator) {
      throw new NotFoundException('Survey enumerator assignment not found');
    }

    return surveyEnumerator;
  }

  async remove(userId: number, surveyId: number): Promise<void> {
    const surveyEnumerator = await this.findOne(userId, surveyId);
    await surveyEnumerator.destroy();
  }

  async bulkCreate(
    surveyId: number,
    userIds: number[],
  ): Promise<SurveyEnumerator[]> {
    const surveyEnumerators = userIds.map((userId) => ({
      userId,
      surveyId,
    }));

    try {
      return await this.surveyEnumeratorRepository.bulkCreate(
        surveyEnumerators,
        {
          ignoreDuplicates: true, // Skip duplicates instead of throwing error
        },
      );
    } catch (error) {
      throw error;
    }
  }

  async removeMultiple(surveyId: number, userIds: number[]): Promise<number> {
    const deleted = await this.surveyEnumeratorRepository.destroy({
      where: {
        surveyId,
        userId: userIds,
      },
    });
    return deleted;
  }

  /**
   * Bulk assign enumerators from CSV data
   * Creates users if they don't exist and assigns them to the survey
   * @param surveyId
   * @param enumerators - Array of enumerator data from CSV
   */
  async bulkAssignFromCsv(
    surveyId: number,
    enumerators: EnumeratorCsvRowDto[],
  ): Promise<{
    success: number;
    failed: number;
    created: number;
    existing: number;
    assignments: SurveyEnumerator[];
    errors: any[];
  }> {
    const assignments: SurveyEnumerator[] = [];
    const errors: any[] = [];
    let createdUsers = 0;
    let existingUsers = 0;

    for (const enumeratorData of enumerators) {
      try {
        // Check if user exists by CID
        let user = await this.userRepository.findOne({
          where: { cid: enumeratorData.cid },
        });

        // Create user if doesn't exist
        if (!user) {
          // Generate dummy email if not provided
          const email =
            enumeratorData.emailAddress ||
            `${enumeratorData.cid}@dummy.nsb.gov.bt`;

          // Use CID as password if not provided
          const password = enumeratorData.password || enumeratorData.cid;
          const hashedPassword = await bcrypt.hash(password, 10);

          user = await this.userRepository.create({
            name: enumeratorData.name,
            cid: enumeratorData.cid,
            emailAddress: email,
            phoneNumber: enumeratorData.phoneNumber || null,
            password: hashedPassword,
            role: UserRole.ENUMERATOR, // Auto-assign ENUMERATOR role
          });

          createdUsers++;
        } else {
          existingUsers++;
        }

        // Assign user to survey
        const assignment = await this.surveyEnumeratorRepository.create({
          userId: user.id,
          surveyId,
        });

        assignments.push(assignment);
      } catch (error) {
        errors.push({
          enumerator: enumeratorData,
          error:
            error.name === 'SequelizeUniqueConstraintError'
              ? 'User already assigned to this survey or duplicate CID'
              : error.message,
        });
      }
    }

    return {
      success: assignments.length,
      failed: errors.length,
      created: createdUsers,
      existing: existingUsers,
      assignments,
      errors,
    };
  }

  /**
   * Generate CSV template for bulk upload of enumerators
   * Template includes: Name, CID, Email Address, Phone Number, Password
   * @returns CSV template string
   */
  async generateCSVTemplate(): Promise<string> {
    const headers = [
      'Name',
      'CID',
      'Email Address',
      'Phone Number',
      'Password',
    ];

    // Add example row
    const exampleRow = [
      'Nima Yoezer', // Example name
      '12345678901', // Example CID
      'nima.yoezer@example.com', // Example email (optional)
      '17123456', // Example phone number (optional)
      '', // Password (optional - will use CID if not provided)
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}`;
  }
}
