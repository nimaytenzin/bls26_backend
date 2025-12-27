import {
  Injectable,
  Inject,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateSurveyEnumeratorDto } from './dto/create-survey-enumerator.dto';
import { UpdateSurveyEnumeratorDto } from './dto/update-survey-enumerator.dto';
import { SurveyEnumerator } from './entities/survey-enumerator.entity';
import { User, UserRole } from 'src/modules/auth/entities/user.entity';
import { Survey } from '../survey/entities/survey.entity';
import { Dzongkhag } from 'src/modules/location/dzongkhag/entities/dzongkhag.entity';
import * as bcrypt from 'bcrypt';
import { EnumeratorCsvRowDto } from './dto/bulk-assign-csv.dto';
import { SupervisorHelperService } from '../../auth/services/supervisor-helper.service';
import { Op } from 'sequelize';

@Injectable()
export class SurveyEnumeratorService {
  constructor(
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
    @Inject('USER_REPOSITORY')
    private readonly userRepository: typeof User,
    @Inject('DZONGKHAG_REPOSITORY')
    private readonly dzongkhagRepository: typeof Dzongkhag,
    private readonly supervisorHelperService: SupervisorHelperService,
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
   * Creates users if they don't exist and assigns them to the survey with dzongkhag assignment
   * @param surveyId
   * @param enumerators - Array of enumerator data from CSV (includes dzongkhagCode)
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
        // Normalize dzongkhag code (convert to two-character string if numeric)
        const normalizeCode = (code: string | number): string => {
          const strValue = String(code || '').trim();
          if (!strValue) return '';
          if (/^\d+$/.test(strValue)) {
            return strValue.padStart(2, '0');
          }
          return strValue;
        };

        const dzongkhagCode = normalizeCode(enumeratorData.dzongkhagCode);

        // Find dzongkhag by code
        let dzongkhagId: number | null = null;
        if (dzongkhagCode) {
          const dzongkhag = await this.dzongkhagRepository.findOne({
            where: { areaCode: dzongkhagCode },
          });
          if (!dzongkhag) {
            errors.push({
              enumerator: enumeratorData,
              error: `Dzongkhag with code "${dzongkhagCode}" not found`,
            });
            continue;
          }
          dzongkhagId = dzongkhag.id;
        }

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

        // Assign user to survey with dzongkhag
        const assignment = await this.surveyEnumeratorRepository.create({
          userId: user.id,
          surveyId,
          dzongkhagId: dzongkhagId || null,
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
   * Template includes: Name, CID, Email Address, Phone Number, Password, Dzongkhag Code
   * @returns CSV template string
   */
  async generateCSVTemplate(): Promise<string> {
    const headers = [
      'Name',
      'CID',
      'Email Address',
      'Phone Number',
      'Password',
      'Dzongkhag Code',
    ];

    // Add example row
    const exampleRow = [
      'Nima Yoezer', // Example name
      '12345678901', // Example CID
      'nima.yoezer@example.com', // Example email (optional)
      '17123456', // Example phone number (optional)
      '', // Password (optional - will use CID if not provided)
      '01', // Example Dzongkhag Code (e.g., "01", "02", "10")
    ];

    return `${headers.join(',')}\n${exampleRow.join(',')}`;
  }

  /**
   * Get enumerators by survey for supervisor (scoped to supervisor's dzongkhags)
   * @param supervisorId
   * @param surveyId
   */
  async findBySurveyForSupervisor(
    supervisorId: number,
    surveyId: number,
  ): Promise<SurveyEnumerator[]> {
    const dzongkhagIds = await this.supervisorHelperService.getSupervisorDzongkhagIds(
      supervisorId,
    );
    if (dzongkhagIds.length === 0) {
      return [];
    }

    return this.surveyEnumeratorRepository.findAll({
      where: {
        surveyId,
        dzongkhagId: { [Op.in]: dzongkhagIds },
      },
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
        {
          model: Dzongkhag,
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });
  }

  /**
   * Bulk upload enumerators from CSV for supervisor (with dzongkhag verification)
   * @param supervisorId
   * @param surveyId
   * @param enumerators
   */
  async bulkAssignFromCsvForSupervisor(
    supervisorId: number,
    surveyId: number,
    enumerators: EnumeratorCsvRowDto[],
  ) {
    const supervisorDzongkhagIds =
      await this.supervisorHelperService.getSupervisorDzongkhagIds(supervisorId);

    // Verify each enumerator's dzongkhag is in supervisor's dzongkhags
    for (const enumerator of enumerators) {
      const normalizeCode = (code: string | number): string => {
        const strValue = String(code || '').trim();
        if (!strValue) return '';
        if (/^\d+$/.test(strValue)) {
          return strValue.padStart(2, '0');
        }
        return strValue;
      };

      const dzongkhagCode = normalizeCode(enumerator.dzongkhagCode);
      if (dzongkhagCode) {
        const dzongkhag = await this.dzongkhagRepository.findOne({
          where: { areaCode: dzongkhagCode },
        });
        if (!dzongkhag || !supervisorDzongkhagIds.includes(dzongkhag.id)) {
          throw new ForbiddenException(
            `You do not have access to dzongkhag ${dzongkhagCode}`,
          );
        }
      }
    }

    // Proceed with bulk assignment using existing logic
    return this.bulkAssignFromCsv(surveyId, enumerators);
  }

  /**
   * Edit enumerator details for supervisor (verify enumerator belongs to supervisor's dzongkhag)
   * @param supervisorId
   * @param userId
   * @param updateDto - Can contain user fields (name, emailAddress, phoneNumber) or assignment fields (surveyId, dzongkhagId)
   */
  async updateEnumeratorForSupervisor(
    supervisorId: number,
    userId: number,
    updateDto: any, // Accept any to allow user fields
  ) {
    // Verify enumerator belongs to supervisor
    const belongsToSupervisor =
      await this.supervisorHelperService.verifyEnumeratorBelongsToSupervisor(
        supervisorId,
        userId,
      );

    if (!belongsToSupervisor) {
      throw new ForbiddenException(
        'You do not have access to this enumerator',
      );
    }

    // Get user to update
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Update user fields if provided
    if (updateDto.name !== undefined) {
      user.name = updateDto.name;
    }
    if (updateDto.emailAddress !== undefined) {
      user.emailAddress = updateDto.emailAddress;
    }
    if (updateDto.phoneNumber !== undefined) {
      user.phoneNumber = updateDto.phoneNumber;
    }

    await user.save();

    // Update survey enumerator assignments if provided
    if (updateDto.surveyId !== undefined && updateDto.dzongkhagId !== undefined) {
      const assignment = await this.surveyEnumeratorRepository.findOne({
        where: { userId, surveyId: updateDto.surveyId },
      });

      if (assignment) {
        // Verify new dzongkhag is in supervisor's dzongkhags
        const hasAccess =
          await this.supervisorHelperService.verifySupervisorAccessToDzongkhag(
            supervisorId,
            updateDto.dzongkhagId,
          );

        if (!hasAccess) {
          throw new ForbiddenException(
            'You do not have access to this dzongkhag',
          );
        }

        assignment.dzongkhagId = updateDto.dzongkhagId;
        await assignment.save();
      }
    }

    return { message: 'Enumerator updated successfully', user };
  }

  /**
   * Reset password for enumerator (verify enumerator belongs to supervisor's dzongkhag)
   * @param supervisorId
   * @param userId
   * @param newPassword
   */
  async resetEnumeratorPasswordForSupervisor(
    supervisorId: number,
    userId: number,
    newPassword: string,
  ) {
    // Verify enumerator belongs to supervisor
    const belongsToSupervisor =
      await this.supervisorHelperService.verifyEnumeratorBelongsToSupervisor(
        supervisorId,
        userId,
      );

    if (!belongsToSupervisor) {
      throw new ForbiddenException(
        'You do not have access to this enumerator',
      );
    }

    // Get user
    const user = await this.userRepository.findByPk(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Hash and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    return {
      message: 'Password has been reset successfully',
      user: {
        id: user.id,
        name: user.name,
        emailAddress: user.emailAddress,
        role: user.role,
      },
    };
  }

  /**
   * Delete enumerator for supervisor (with access check)
   * @param supervisorId
   * @param userId
   * @param surveyId
   */
  async removeForSupervisor(
    supervisorId: number,
    userId: number,
    surveyId: number,
  ) {
    // Verify enumerator belongs to supervisor
    const belongsToSupervisor =
      await this.supervisorHelperService.verifyEnumeratorBelongsToSupervisor(
        supervisorId,
        userId,
      );

    if (!belongsToSupervisor) {
      throw new ForbiddenException(
        'You do not have access to this enumerator',
      );
    }

    return this.remove(userId, surveyId);
  }
}
