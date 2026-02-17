import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Patch,
  UseGuards,
  ParseIntPipe,
  Header,
  Res,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SurveyEnumeratorService } from './survey-enumerator.service';
import { CreateSurveyEnumeratorDto } from './dto/create-survey-enumerator.dto';
import { CreateSingleEnumeratorDto } from './dto/create-single-enumerator.dto';
import { BulkAssignFromCsvDto } from './dto/bulk-assign-csv.dto';
import { UpdateEnumeratorDto } from '../../supervisor/dto/update-enumerator.dto';
import { EnumeratorCsvRowDto } from './dto/bulk-assign-csv.dto';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guards/roles.guard';
import { Roles } from 'src/modules/auth/decorators/roles.decorator';
import { UserRole } from 'src/modules/auth/entities/user.entity';

@Controller('survey-enumerator')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SurveyEnumeratorController {
  constructor(
    private readonly surveyEnumeratorService: SurveyEnumeratorService,
  ) {}

  /**
   * Create enumerator assignment(s) to a survey
   * Supports both single and multiple dzongkhag assignments
   * 
   * @param createSurveyEnumeratorDto - Assignment data
   * @param createSurveyEnumeratorDto.userId - User ID of the enumerator
   * @param createSurveyEnumeratorDto.surveyId - Survey ID
   * @param createSurveyEnumeratorDto.dzongkhagId - Single dzongkhag ID (optional, use dzongkhagIds for multiple)
   * @param createSurveyEnumeratorDto.dzongkhagIds - Comma-separated dzongkhag IDs (e.g., "1,2,3") (optional)
   * 
   * @returns Single SurveyEnumerator if one dzongkhag, array if multiple dzongkhags
   * 
   * @example Single assignment
   * POST /survey-enumerator
   * { "userId": 1, "surveyId": 1, "dzongkhagId": 5 }
   * 
   * @example Multiple assignments
   * POST /survey-enumerator
   * { "userId": 1, "surveyId": 1, "dzongkhagIds": "5,6,7" }
   */
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@Body() createSurveyEnumeratorDto: CreateSurveyEnumeratorDto) {
    return this.surveyEnumeratorService.create(createSurveyEnumeratorDto);
  }

  /**
   * Create a single enumerator with dzongkhag assignments
   * Creates user if they don't exist and assigns them to the survey
   * 
   * @param createDto - Enumerator data with dzongkhag assignments
   * @param createDto.name - Enumerator name (required)
   * @param createDto.cid - Citizen ID (required, unique)
   * @param createDto.emailAddress - Email address (optional, defaults to {cid}@nsb.gov.bt)
   * @param createDto.phoneNumber - Phone number (optional)
   * @param createDto.password - Password (optional, defaults to CID)
   * @param createDto.surveyId - Survey ID (required)
   * @param createDto.dzongkhagIds - Array of dzongkhag IDs (required, at least one)
   * 
   * @returns Object with user, created flag, and assignments
   * 
   * @example
   * POST /survey-enumerator/single
   * {
   *   "name": "Nima Yoezer",
   *   "cid": "12345678901",
   *   "emailAddress": "nima@example.com",
   *   "phoneNumber": "17123456",
   *   "password": "Bhutan123",
   *   "surveyId": 1,
   *   "dzongkhagIds": [5, 6, 7]
   * }
   */
  @Post('single')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  createSingleEnumerator(@Body() createDto: CreateSingleEnumeratorDto) {
    return this.surveyEnumeratorService.createSingleEnumerator(createDto);
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findAll() {
    return this.surveyEnumeratorService.findAll();
  }

  @Get('by-survey/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  findBySurvey(@Param('surveyId', ParseIntPipe) surveyId: number) {
    return this.surveyEnumeratorService.findBySurvey(surveyId);
  }

  @Get('by-enumerator/:userId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findByEnumerator(@Param('userId', ParseIntPipe) userId: number) {
    return this.surveyEnumeratorService.findByEnumerator(userId);
  }

  /**
   * Generate CSV template for bulk upload of enumerators
   * Template includes: Name, CID, Email Address, Phone Number, Password, Dzongkhag Codes
   * Supports comma-separated dzongkhag codes for multiple assignments
   *
   * @returns CSV template file
   *
   * @example Template format
   * Name,CID,Email Address,Phone Number,Password,Dzongkhag Codes
   * Nima Yoezer,12345678901,nima.yoezer@example.com,17123456,,01,02
   *
   * @access Admin, Supervisor
   */
  @Get('template/csv')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="enumerator_upload_template.csv"',
  )
  async getCSVTemplate(@Res() res: Response): Promise<void> {
    const template = await this.surveyEnumeratorService.generateCSVTemplate();
    res.send(template);
  }

  /**
   * Get all enumerator assignments for a user-survey combination
   * Returns all dzongkhag assignments for the specified enumerator and survey
   * 
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Array of SurveyEnumerator objects (one per dzongkhag assignment)
   * 
   * @example
   * GET /survey-enumerator/1/1
   * Returns all assignments for user 1 in survey 1
   */
  @Get(':userId/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findAllByUserAndSurvey(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.surveyEnumeratorService.findAllByUserAndSurvey(userId, surveyId);
  }

  /**
   * Get a specific enumerator assignment
   * Returns a single assignment for user-survey-dzongkhag combination
   * 
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Single SurveyEnumerator object
   * 
   * @example
   * GET /survey-enumerator/1/1/5
   * Returns the assignment for user 1, survey 1, dzongkhag 5
   */
  @Get(':userId/:surveyId/:dzongkhagId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    return this.surveyEnumeratorService.findOne(userId, surveyId, dzongkhagId);
  }

  /**
   * Delete all enumerator assignments for a user-survey combination
   * Removes all dzongkhag assignments for the specified enumerator and survey
   * 
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Number of deleted records
   * 
   * @example
   * DELETE /survey-enumerator/1/1
   * Removes all assignments for user 1 in survey 1
   */
  @Delete(':userId/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  removeAll(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.surveyEnumeratorService.removeAllForUserAndSurvey(userId, surveyId);
  }

  /**
   * Delete a specific enumerator assignment
   * Removes a single assignment for user-survey-dzongkhag combination
   * 
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Success message
   * 
   * @example
   * DELETE /survey-enumerator/1/1/5
   * Removes the assignment for user 1, survey 1, dzongkhag 5
   */
  @Delete(':userId/:surveyId/:dzongkhagId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    return this.surveyEnumeratorService.remove(userId, surveyId, dzongkhagId);
  }

  /**
   * Bulk assign enumerators to a survey with dzongkhag assignments
   * Supports both single and multiple dzongkhag assignments per user
   * 
   * @param body.surveyId - Survey ID
   * @param body.assignments - Array of assignment objects
   * @param body.assignments[].userId - User ID of the enumerator
   * @param body.assignments[].dzongkhagId - Single dzongkhag ID (optional)
   * @param body.assignments[].dzongkhagIds - Comma-separated dzongkhag IDs (e.g., "1,2,3") (optional)
   * 
   * @returns Array of created SurveyEnumerator objects
   * 
   * @example
   * POST /survey-enumerator/bulk-assign
   * {
   *   "surveyId": 1,
   *   "assignments": [
   *     { "userId": 1, "dzongkhagId": 5 },
   *     { "userId": 2, "dzongkhagIds": "5,6,7" }
   *   ]
   * }
   */
  @Post('bulk-assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  bulkCreate(
    @Body()
    body: {
      surveyId: number;
      assignments: Array<{
        userId: number;
        dzongkhagId?: number;
        dzongkhagIds?: string; // Comma-separated dzongkhag IDs (e.g., "1,2,3")
      }>;
    },
  ) {
    // Transform assignments to handle both single and multiple dzongkhags
    const transformedAssignments: Array<{ userId: number; dzongkhagId: number }> =
      [];
    for (const assignment of body.assignments) {
      if (assignment.dzongkhagIds) {
        // Parse comma-separated IDs
        const ids = assignment.dzongkhagIds
          .split(',')
          .map((id) => parseInt(id.trim(), 10))
          .filter((id) => !isNaN(id));
        ids.forEach((dzongkhagId) => {
          transformedAssignments.push({
            userId: assignment.userId,
            dzongkhagId,
          });
        });
      } else if (assignment.dzongkhagId) {
        transformedAssignments.push({
          userId: assignment.userId,
          dzongkhagId: assignment.dzongkhagId,
        });
      }
    }
    return this.surveyEnumeratorService.bulkCreate(
      body.surveyId,
      transformedAssignments,
    );
  }

  /**
   * Bulk assign enumerators from CSV file upload
   * Creates users if they don't exist and assigns them to the survey
   * Supports comma-separated dzongkhag codes for multiple assignments per enumerator
   * 
   * Required CSV headers: Name, CID, Dzongkhag Codes
   * Optional CSV headers: Email Address, Phone Number, Password
   * 
   * @param file - CSV file to upload
   * @param surveyId - Survey ID (from form data)
   * @returns Object with success count, failed count, created users, existing users, assignments, and errors
   * 
   * @example CSV format
   * Name,CID,Email Address,Phone Number,Password,Dzongkhag Codes
   * Nima Yoezer,12345678901,nima@example.com,17123456,,01,02
   * 
   * @throws BadRequestException if required headers are missing or file is invalid
   */
  @Post('bulk-assign-csv')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
      fileFilter: (req, file, cb) => {
        if (
          file.mimetype === 'text/csv' ||
          file.mimetype === 'application/vnd.ms-excel' ||
          file.originalname.endsWith('.csv')
        ) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              'Invalid file type. Only CSV files are allowed.',
            ),
            false,
          );
        }
      },
    }),
  )
  bulkAssignFromCsv(
    @UploadedFile() file: any,
    @Body('surveyId') surveyId: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const surveyIdNum = parseInt(surveyId, 10);

    if (!surveyIdNum || isNaN(surveyIdNum)) {
      throw new BadRequestException('surveyId is required');
    }

    // Parse CSV content
    const csvContent = file.buffer.toString('utf-8');
    const enumerators = this.parseCsv(csvContent);

    return this.surveyEnumeratorService.bulkAssignFromCsv(
      surveyIdNum,
      enumerators,
    );
  }

  @Delete('bulk-remove/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  removeMultiple(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() body: { userIds: number[] },
  ) {
    return this.surveyEnumeratorService.removeMultiple(surveyId, body.userIds);
  }

  /**
   * Soft delete a specific enumerator assignment (set isActive to false)
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Success message
   */
  @Delete(':userId/:surveyId/:dzongkhagId/soft')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async softDelete(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    await this.surveyEnumeratorService.softDelete(userId, surveyId, dzongkhagId);
    return { message: 'Enumerator assignment soft deleted successfully' };
  }

  /**
   * Soft delete all enumerator assignments for a user-survey combination
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Success message with count of deleted assignments
   */
  @Delete(':userId/:surveyId/soft')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async softDeleteAll(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    const count = await this.surveyEnumeratorService.softDeleteAllForUserAndSurvey(
      userId,
      surveyId,
    );
    return {
      message: 'All enumerator assignments soft deleted successfully',
      deletedCount: count,
    };
  }

  /**
   * Restore a soft-deleted enumerator assignment (set isActive to true)
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param dzongkhagId - Dzongkhag ID
   * @returns Success message
   */
  @Post(':userId/:surveyId/:dzongkhagId/restore')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async restore(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
  ) {
    await this.surveyEnumeratorService.restore(userId, surveyId, dzongkhagId);
    return { message: 'Enumerator assignment restored successfully' };
  }

  /**
   * Reactivate user - Restore all soft-deleted enumerator assignments for a user-survey combination (set isActive to true)
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @returns Success message with count of restored assignments
   */
  @Post(':userId/:surveyId/restore')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async reactivateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    const count = await this.surveyEnumeratorService.restoreAllForUserAndSurvey(
      userId,
      surveyId,
    );
    return {
      message: 'All enumerator assignments restored successfully',
      restoredCount: count,
    };
  }

  /**
   * Add dzongkhag assignment(s) to an enumerator for a survey
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param body.dzongkhagIds - Array of dzongkhag IDs to add
   * @returns Array of created/restored SurveyEnumerator objects
   */
  @Post(':userId/:surveyId/dzongkhags/add')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async addDzongkhagAssignments(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() body: { dzongkhagIds: number[] },
  ) {
    return this.surveyEnumeratorService.addDzongkhagAssignments(
      userId,
      surveyId,
      body.dzongkhagIds,
    );
  }

  /**
   * Remove dzongkhag assignment(s) from an enumerator for a survey (soft delete)
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param body.dzongkhagIds - Array of dzongkhag IDs to remove
   * @returns Success message with count of removed assignments
   */
  @Post(':userId/:surveyId/dzongkhags/remove')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async removeDzongkhagAssignments(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() body: { dzongkhagIds: number[] },
  ) {
    const count = await this.surveyEnumeratorService.removeDzongkhagAssignments(
      userId,
      surveyId,
      body.dzongkhagIds,
    );
    return {
      message: 'Dzongkhag assignments removed successfully',
      removedCount: count,
    };
  }

  /**
   * Update dzongkhag assignments for an enumerator in a survey
   * Replaces all existing assignments with the new ones
   * @param userId - User ID of the enumerator
   * @param surveyId - Survey ID
   * @param body.dzongkhagIds - Array of dzongkhag IDs (replaces all existing assignments)
   * @returns Array of all active SurveyEnumerator objects for the user-survey combination
   */
  @Patch(':userId/:surveyId/dzongkhags')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  async updateDzongkhagAssignments(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Body() body: { dzongkhagIds: number[] },
  ) {
    return this.surveyEnumeratorService.updateDzongkhagAssignments(
      userId,
      surveyId,
      body.dzongkhagIds,
    );
  }

  /**
   * Edit enumerator details and assignments
   * Can update: name, emailAddress, phoneNumber, or assignment (surveyId, dzongkhagIds)
   * When dzongkhagIds is provided with surveyId, replaces all existing assignments with the new ones
   * @param userId - User ID of the enumerator
   * @param dto - Update data
   * @param dto.name - Enumerator name (optional)
   * @param dto.emailAddress - Email address (optional)
   * @param dto.phoneNumber - Phone number (optional)
   * @param dto.surveyId - Survey ID (required when updating assignments)
   * @param dto.dzongkhagIds - Array of dzongkhag IDs to replace all assignments (optional)
   * @returns Updated user and assignments if provided
   */
  @Patch(':userId')
  @Roles(UserRole.ADMIN)
  async updateEnumerator(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateEnumeratorDto,
  ) {
    return this.surveyEnumeratorService.updateEnumeratorForAdmin(userId, dto);
  }

  /**
   * Parse a CSV line respecting quoted fields that may contain commas
   * @param line - CSV line to parse
   * @returns Array of field values
   */
  private parseCsvLine(line: string): string[] {
    const values: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Escaped quote (double quote)
          current += '"';
          i++; // Skip next quote
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        // Field separator (only if not in quotes)
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add the last field
    values.push(current.trim());

    // Remove surrounding quotes from each value
    return values.map((v) => v.replace(/^"|"$/g, ''));
  }

  /**
   * Parse CSV content to EnumeratorCsvRowDto array
   * Validates required headers and returns clear error messages
   * @param csvContent - CSV file content as string
   * @returns Array of EnumeratorCsvRowDto
   */
  private parseCsv(csvContent: string): EnumeratorCsvRowDto[] {
    const lines = csvContent.split('\n').filter((line) => line.trim());
    if (lines.length < 2) {
      throw new BadRequestException(
        'CSV file must contain at least a header and one data row',
      );
    }

    // Parse header
    const headerLine = lines[0].trim();
    const headers = this.parseCsvLine(headerLine);

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

    // Required headers
    const nameIndex = findColumnIndex(
      ['Name', 'name'],
      [(h) => h.includes('name')],
    );
    const cidIndex = findColumnIndex(
      ['CID', 'cid'],
      [(h) => h.includes('cid')],
    );
    const dzongkhagCodesIndex = findColumnIndex(
      ['Dzongkhag Codes', 'dzongkhagCodes', 'DzongkhagCodes'],
      [(h) => h.includes('dzongkhag') && h.includes('codes')],
    );

    // Optional headers
    const emailIndex = findColumnIndex(
      ['Email Address', 'emailAddress', 'EmailAddress', 'Email'],
      [(h) => h.includes('email')],
    );
    const phoneIndex = findColumnIndex(
      ['Phone Number', 'phoneNumber', 'PhoneNumber', 'Phone'],
      [(h) => h.includes('phone')],
    );
    const passwordIndex = findColumnIndex(
      ['Password', 'password'],
      [(h) => h.includes('password')],
    );

    // Validate required headers
    const missingHeaders: string[] = [];
    if (nameIndex < 0) {
      missingHeaders.push('Name');
    }
    if (cidIndex < 0) {
      missingHeaders.push('CID');
    }
    if (dzongkhagCodesIndex < 0) {
      missingHeaders.push('Dzongkhag Codes');
    }

    if (missingHeaders.length > 0) {
      throw new BadRequestException(
        `CSV file is missing required headers: ${missingHeaders.join(', ')}. ` +
        `Required headers are: Name, CID, Dzongkhag Codes`,
      );
    }

    // Parse data rows
    const enumerators: EnumeratorCsvRowDto[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Use proper CSV parsing that handles quoted fields with commas
      const values = this.parseCsvLine(line);

      if (cidIndex < 0 || !values[cidIndex]) {
        continue; // Skip rows without CID
      }

      const enumerator: EnumeratorCsvRowDto = {
        name: values[nameIndex] || '',
        cid: values[cidIndex],
        emailAddress:
          emailIndex >= 0 && values[emailIndex] ? values[emailIndex] : undefined,
        phoneNumber:
          phoneIndex >= 0 && values[phoneIndex] ? values[phoneIndex] : undefined,
        password:
          passwordIndex >= 0 && values[passwordIndex]
            ? values[passwordIndex]
            : undefined,
        dzongkhagCodes: values[dzongkhagCodesIndex] || '',
      };

      enumerators.push(enumerator);
    }

    return enumerators;
  }
}
