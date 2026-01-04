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
import { CreateSingleEnumeratorDto } from './dto/create-single-enumerator.dto';
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
  ): Promise<SurveyEnumerator | SurveyEnumerator[]> {
    try {
      const { dzongkhagId, dzongkhagIds, userId, surveyId } =
        createSurveyEnumeratorDto;

      // Parse comma-separated dzongkhagIds if provided
      let dzongkhagIdArray: number[] = [];
      if (dzongkhagIds) {
        dzongkhagIdArray = dzongkhagIds
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));
      } else if (dzongkhagId) {
        dzongkhagIdArray = [dzongkhagId];
      }

      if (dzongkhagIdArray.length === 0) {
        throw new BadRequestException(
          'Either dzongkhagId or dzongkhagIds must be provided',
        );
      }

      // If multiple dzongkhags, use createMultiple
      if (dzongkhagIdArray.length > 1) {
        const assignments = await this.createMultiple(
          userId,
          surveyId,
          dzongkhagIdArray,
        );
        return assignments;
      }

      // Single dzongkhag - create single assignment
      const surveyEnumerator = await this.surveyEnumeratorRepository.create({
        userId,
        surveyId,
        dzongkhagId: dzongkhagIdArray[0],
        isActive: true,
      });

      return this.findOne(
        surveyEnumerator.userId,
        surveyEnumerator.surveyId,
        surveyEnumerator.dzongkhagId,
      );
    } catch (error) {
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new ConflictException(
          'This enumerator is already assigned to this survey and dzongkhag',
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
        {
          model: Dzongkhag,
          attributes: ['id', 'name', 'areaCode'],
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
          attributes: ['id', 'name', 'emailAddress', 'cid', 'phoneNumber', 'role'],
        },
        {
          model: Dzongkhag,
          attributes: ['id', 'name', 'areaCode'],
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
        {
          model: Dzongkhag,
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });
  }

  /**
   * Find a specific assignment by userId, surveyId, and dzongkhagId
   */
  async findOne(
    userId: number,
    surveyId: number,
    dzongkhagId: number,
  ): Promise<SurveyEnumerator> {
    const surveyEnumerator = await this.surveyEnumeratorRepository.findOne({
      where: { userId, surveyId, dzongkhagId },
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

    if (!surveyEnumerator) {
      throw new NotFoundException('Survey enumerator assignment not found');
    }

    return surveyEnumerator;
  }

  /**
   * Get all assignments for a user-survey combination
   */
  async findAllByUserAndSurvey(
    userId: number,
    surveyId: number,
  ): Promise<SurveyEnumerator[]> {
    return this.surveyEnumeratorRepository.findAll({
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
        {
          model: Dzongkhag,
          attributes: ['id', 'name', 'areaCode'],
        },
      ],
    });
  }

  /**
   * Get all dzongkhag IDs for an enumerator in a survey
   */
  async getDzongkhagIdsForEnumerator(
    userId: number,
    surveyId: number,
  ): Promise<number[]> {
    const assignments = await this.surveyEnumeratorRepository.findAll({
      where: { userId, surveyId },
      attributes: ['dzongkhagId'],
    });
    return assignments.map((a) => a.dzongkhagId);
  }

  /**
   * Remove a specific assignment (requires dzongkhagId)
   */
  async remove(
    userId: number,
    surveyId: number,
    dzongkhagId: number,
  ): Promise<void> {
    const surveyEnumerator = await this.findOne(userId, surveyId, dzongkhagId);
    await surveyEnumerator.destroy();
  }

  /**
   * Remove all assignments for a user-survey combination
   */
  async removeAllForUserAndSurvey(
    userId: number,
    surveyId: number,
  ): Promise<number> {
    return this.surveyEnumeratorRepository.destroy({
      where: { userId, surveyId },
    });
  }

  /**
   * Bulk create assignments (requires dzongkhagId for each)
   * @param surveyId
   * @param assignments - Array of {userId, dzongkhagId}
   */
  async bulkCreate(
    surveyId: number,
    assignments: Array<{ userId: number; dzongkhagId: number }>,
  ): Promise<SurveyEnumerator[]> {
    const surveyEnumerators = assignments.map((assignment) => ({
      userId: assignment.userId,
      surveyId,
      dzongkhagId: assignment.dzongkhagId,
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

  /**
   * Create multiple assignments for a single user-survey with multiple dzongkhags
   */
  async createMultiple(
    userId: number,
    surveyId: number,
    dzongkhagIds: number[],
  ): Promise<SurveyEnumerator[]> {
    const assignments = dzongkhagIds.map((dzongkhagId) => ({
      userId,
      surveyId,
      dzongkhagId,
      isActive: true,
    }));

    try {
      return await this.surveyEnumeratorRepository.bulkCreate(assignments, {
        ignoreDuplicates: true,
      });
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
   * Creates users if they don't exist and assigns them to the survey with dzongkhag assignment(s)
   * Supports both single dzongkhagCode (backward compatible) and comma-separated dzongkhagCodes
   * @param surveyId
   * @param enumerators - Array of enumerator data from CSV (includes dzongkhagCode or dzongkhagCodes)
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
      console.log('enumeratorData', enumeratorData);
      console.log('enumeratorData.dzongkhagCodes', enumeratorData.dzongkhagCodes);
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

        // Validate dzongkhagCodes is provided
        if (!enumeratorData.dzongkhagCodes || !enumeratorData.dzongkhagCodes.trim()) {
          errors.push({
            enumerator: enumeratorData,
            error: 'Dzongkhag Codes is required',
          });
          continue;
        }

        // Parse comma-separated dzongkhag codes
        const codesString = enumeratorData.dzongkhagCodes.trim();
        const dzongkhagCodes = codesString
          .split(',')
          .map((c) => normalizeCode(c.trim()))
          .filter((c) => c);

        if (dzongkhagCodes.length === 0) {
          errors.push({
            enumerator: enumeratorData,
            error: 'At least one valid dzongkhag code is required in Dzongkhag Codes',
          });
          continue;
        }

        // Find dzongkhags by codes
        const dzongkhagIds: number[] = [];
        for (const code of dzongkhagCodes) {
          const dzongkhag = await this.dzongkhagRepository.findOne({
            where: { areaCode: code },
          });
          if (!dzongkhag) {
            errors.push({
              enumerator: enumeratorData,
              error: `Dzongkhag with code "${code}" not found`,
            });
            continue;
          }
          dzongkhagIds.push(dzongkhag.id);
        }

        if (dzongkhagIds.length === 0) {
          errors.push({
            enumerator: enumeratorData,
            error: 'No valid dzongkhags found',
          });
          continue;
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
            `${enumeratorData.cid}@nsb.gov.bt`;

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

        // Create multiple assignments (one per dzongkhag)
        const newAssignments = await this.createMultiple(
          user.id,
          surveyId,
          dzongkhagIds,
        );

        assignments.push(...newAssignments);
      } catch (error) {
        errors.push({
          enumerator: enumeratorData,
          error:
            error.name === 'SequelizeUniqueConstraintError'
              ? 'User already assigned to this survey and dzongkhag'
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
   * Template includes: Name, CID, Email Address, Phone Number, Password, Dzongkhag Codes (comma-separated)
   * @returns CSV template string
   */
  async generateCSVTemplate(): Promise<string> {
    const headers = [
      'Name',
      'CID',
      'Email Address',
      'Phone Number',
      'Password',
      'Dzongkhag Codes', // Changed to plural to support multiple
    ];

    // Add example row
    const exampleRow = [
      'Nima Yoezer', // Example name
      '12345678901', // Example CID
      'nima.yoezer@example.com', // Example email (optional)
      '17123456', // Example phone number (optional)
      '', // Password (optional - will use CID if not provided)
      '01,02', // Example Dzongkhag Codes (comma-separated, e.g., "01", "01,02", "01,02,03")
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

    // Verify each enumerator's dzongkhag codes are in supervisor's dzongkhags
    for (const enumerator of enumerators) {
      if (!enumerator.dzongkhagCodes || !enumerator.dzongkhagCodes.trim()) {
        throw new BadRequestException(
          'Dzongkhag Codes is required for all enumerators',
        );
      }

      const normalizeCode = (code: string | number): string => {
        const strValue = String(code || '').trim();
        if (!strValue) return '';
        if (/^\d+$/.test(strValue)) {
          return strValue.padStart(2, '0');
        }
        return strValue;
      };

      // Parse comma-separated codes
      const codesString = enumerator.dzongkhagCodes.trim();
      const dzongkhagCodes = codesString
        .split(',')
        .map((c) => normalizeCode(c.trim()))
        .filter((c) => c);

      for (const code of dzongkhagCodes) {
        const dzongkhag = await this.dzongkhagRepository.findOne({
          where: { areaCode: code },
        });
        if (!dzongkhag || !supervisorDzongkhagIds.includes(dzongkhag.id)) {
          throw new ForbiddenException(
            `You do not have access to dzongkhag ${code}`,
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
    // Only support dzongkhagIds array - replaces all existing assignments without comparison
    if (updateDto.surveyId !== undefined && updateDto.dzongkhagIds !== undefined && Array.isArray(updateDto.dzongkhagIds)) {
      // Verify all dzongkhags are accessible to supervisor
      for (const dzongkhagId of updateDto.dzongkhagIds) {
        const hasAccess =
          await this.supervisorHelperService.verifySupervisorAccessToDzongkhag(
            supervisorId,
            dzongkhagId,
          );

        if (!hasAccess) {
          throw new ForbiddenException(
            `You do not have access to dzongkhag ${dzongkhagId}`,
          );
        }
      }

      // Remove all existing assignments for this user-survey (hard delete)
      await this.surveyEnumeratorRepository.destroy({
        where: {
          userId,
          surveyId: updateDto.surveyId,
        },
      });

      // Create new assignments
      let assignments: SurveyEnumerator[] = [];
      if (updateDto.dzongkhagIds.length > 0) {
        assignments = await this.createMultiple(
          userId,
          updateDto.surveyId,
          updateDto.dzongkhagIds,
        );
      }

      return {
        message: 'Enumerator updated successfully',
        user,
        assignments,
      };
    }

    return { message: 'Enumerator updated successfully', user };
  }

  /**
   * Update enumerator details and assignments (admin only, no access checks)
   * Can update: name, emailAddress, phoneNumber, or assignment (surveyId, dzongkhagIds)
   * When dzongkhagIds is provided with surveyId, replaces all existing assignments with the new ones
   * @param userId
   * @param updateDto - Can contain user fields (name, emailAddress, phoneNumber) or assignment fields (surveyId, dzongkhagIds)
   */
  async updateEnumeratorForAdmin(
    userId: number,
    updateDto: any,
  ) {
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
    if (updateDto.surveyId !== undefined && updateDto.dzongkhagIds !== undefined && Array.isArray(updateDto.dzongkhagIds)) {
      // Remove all existing assignments for this user-survey (hard delete)
      await this.surveyEnumeratorRepository.destroy({
        where: {
          userId,
          surveyId: updateDto.surveyId,
        },
      });

      // Create new assignments
      let assignments: SurveyEnumerator[] = [];
      if (updateDto.dzongkhagIds.length > 0) {
        assignments = await this.createMultiple(
          userId,
          updateDto.surveyId,
          updateDto.dzongkhagIds,
        );
      }

      return {
        message: 'Enumerator updated successfully',
        user,
        assignments,
      };
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
   * Soft deletes all assignments for the user-survey combination (sets isActive to false)
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

    return this.softDeleteAllForUserAndSurvey(userId, surveyId);
  }

  /**
   * Soft delete enumerator assignment (set isActive to false)
   * @param userId
   * @param surveyId
   * @param dzongkhagId
   */
  async softDelete(
    userId: number,
    surveyId: number,
    dzongkhagId: number,
  ): Promise<void> {
    const surveyEnumerator = await this.findOne(userId, surveyId, dzongkhagId);
    surveyEnumerator.isActive = false;
    await surveyEnumerator.save();
  }

  /**
   * Soft delete all enumerator assignments for a user-survey combination
   * @param userId
   * @param surveyId
   */
  async softDeleteAllForUserAndSurvey(
    userId: number,
    surveyId: number,
  ): Promise<number> {
    const [affectedRows] = await this.surveyEnumeratorRepository.update(
      { isActive: false },
      {
        where: { userId, surveyId },
      },
    );
    return affectedRows;
  }

  /**
   * Restore soft-deleted enumerator assignment (set isActive to true)
   * @param userId
   * @param surveyId
   * @param dzongkhagId
   */
  async restore(
    userId: number,
    surveyId: number,
    dzongkhagId: number,
  ): Promise<void> {
    const surveyEnumerator = await this.surveyEnumeratorRepository.findOne({
      where: { userId, surveyId, dzongkhagId },
    });

    if (!surveyEnumerator) {
      throw new NotFoundException('Survey enumerator assignment not found');
    }

    surveyEnumerator.isActive = true;
    await surveyEnumerator.save();
  }

  /**
   * Restore all soft-deleted enumerator assignments for a user-survey combination (set isActive to true)
   * @param userId
   * @param surveyId
   */
  async restoreAllForUserAndSurvey(
    userId: number,
    surveyId: number,
  ): Promise<number> {
    const [affectedRows] = await this.surveyEnumeratorRepository.update(
      { isActive: true },
      {
        where: { userId, surveyId },
      },
    );
    return affectedRows;
  }

  /**
   * Add dzongkhag assignment(s) to an enumerator for a survey
   * @param userId
   * @param surveyId
   * @param dzongkhagIds - Array of dzongkhag IDs to add
   */
  async addDzongkhagAssignments(
    userId: number,
    surveyId: number,
    dzongkhagIds: number[],
  ): Promise<SurveyEnumerator[]> {
    const newAssignments: SurveyEnumerator[] = [];

    for (const dzongkhagId of dzongkhagIds) {
      // Check if assignment already exists
      const existing = await this.surveyEnumeratorRepository.findOne({
        where: { userId, surveyId, dzongkhagId },
      });

      if (existing) {
        // If exists but inactive, restore it
        if (!existing.isActive) {
          existing.isActive = true;
          await existing.save();
          newAssignments.push(existing);
        }
        // If exists and active, skip (already assigned)
      } else {
        // Create new assignment
        const assignment = await this.surveyEnumeratorRepository.create({
          userId,
          surveyId,
          dzongkhagId,
          isActive: true,
        });
        newAssignments.push(assignment);
      }
    }

    return newAssignments;
  }

  /**
   * Remove dzongkhag assignment(s) from an enumerator for a survey (soft delete)
   * @param userId
   * @param surveyId
   * @param dzongkhagIds - Array of dzongkhag IDs to remove
   */
  async removeDzongkhagAssignments(
    userId: number,
    surveyId: number,
    dzongkhagIds: number[],
  ): Promise<number> {
    const [affectedRows] = await this.surveyEnumeratorRepository.update(
      { isActive: false },
      {
        where: {
          userId,
          surveyId,
          dzongkhagId: { [Op.in]: dzongkhagIds },
        },
      },
    );
    return affectedRows;
  }

  /**
   * Update dzongkhag assignments for an enumerator in a survey
   * This replaces all existing assignments with the new ones
   * @param userId
   * @param surveyId
   * @param dzongkhagIds - Array of dzongkhag IDs (replaces all existing assignments)
   */
  async updateDzongkhagAssignments(
    userId: number,
    surveyId: number,
    dzongkhagIds: number[],
  ): Promise<SurveyEnumerator[]> {
    // Get all current assignments
    const currentAssignments = await this.surveyEnumeratorRepository.findAll({
      where: { userId, surveyId },
    });

    const currentDzongkhagIds = currentAssignments.map((a) => a.dzongkhagId);
    const dzongkhagIdsSet = new Set(dzongkhagIds);

    // Soft delete assignments that are not in the new list
    const toRemove = currentDzongkhagIds.filter(
      (id) => !dzongkhagIdsSet.has(id),
    );
    if (toRemove.length > 0) {
      await this.removeDzongkhagAssignments(userId, surveyId, toRemove);
    }

    // Add new assignments (or restore if they exist but are inactive)
    const toAdd = dzongkhagIds.filter((id) => !currentDzongkhagIds.includes(id));
    const toRestore = currentAssignments
      .filter((a) => !a.isActive && dzongkhagIdsSet.has(a.dzongkhagId))
      .map((a) => a.dzongkhagId);

    // Restore inactive assignments
    for (const dzongkhagId of toRestore) {
      await this.restore(userId, surveyId, dzongkhagId);
    }

    // Add new assignments
    const newAssignments =
      toAdd.length > 0
        ? await this.addDzongkhagAssignments(userId, surveyId, toAdd)
        : [];

    // Return all active assignments
    return this.findAllByUserAndSurvey(userId, surveyId);
  }

  /**
   * Create a single enumerator with dzongkhag assignments
   * Creates user if they don't exist and assigns them to the survey
   * @param createDto - Enumerator data with dzongkhag assignments
   */
  async createSingleEnumerator(
    createDto: CreateSingleEnumeratorDto,
  ): Promise<{
    user: User;
    created: boolean;
    assignments: SurveyEnumerator[];
  }> {
    // Check if user exists by CID
    let user = await this.userRepository.findOne({
      where: { cid: createDto.cid },
    });

    let created = false;

    // Create user if doesn't exist
    if (!user) {
      // Generate email if not provided
      const email =
        createDto.emailAddress || `${createDto.cid}@nsb.gov.bt`;

      // Use CID as password if not provided
      const password = createDto.password || createDto.cid;
      const hashedPassword = await bcrypt.hash(password, 10);

      user = await this.userRepository.create({
        name: createDto.name,
        cid: createDto.cid,
        emailAddress: email,
        phoneNumber: createDto.phoneNumber || null,
        password: hashedPassword,
        role: UserRole.ENUMERATOR,
      });

      created = true;
    } else {
      // Update user details if provided
      if (createDto.name && user.name !== createDto.name) {
        user.name = createDto.name;
      }
      if (createDto.emailAddress && user.emailAddress !== createDto.emailAddress) {
        user.emailAddress = createDto.emailAddress;
      }
      if (createDto.phoneNumber && user.phoneNumber !== createDto.phoneNumber) {
        user.phoneNumber = createDto.phoneNumber;
      }
      if (createDto.password) {
        const hashedPassword = await bcrypt.hash(createDto.password, 10);
        user.password = hashedPassword;
      }
      await user.save();
    }

    // Verify dzongkhag IDs exist
    const dzongkhags = await this.dzongkhagRepository.findAll({
      where: { id: { [Op.in]: createDto.dzongkhagIds } },
    });

    if (dzongkhags.length !== createDto.dzongkhagIds.length) {
      const foundIds = dzongkhags.map((d) => d.id);
      const missingIds = createDto.dzongkhagIds.filter(
        (id) => !foundIds.includes(id),
      );
      throw new BadRequestException(
        `Dzongkhag IDs not found: ${missingIds.join(', ')}`,
      );
    }

    // Create assignments (one per dzongkhag)
    const assignments = await this.createMultiple(
      user.id,
      createDto.surveyId,
      createDto.dzongkhagIds,
    );

    // Remove password from user response
    const { password, ...userWithoutPassword } = user.toJSON();

    return {
      user: userWithoutPassword as User,
      created,
      assignments,
    };
  }
}
