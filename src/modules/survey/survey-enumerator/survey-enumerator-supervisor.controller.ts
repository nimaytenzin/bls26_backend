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
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { SurveyEnumeratorService } from './survey-enumerator.service';
import { UpdateSurveyEnumeratorDto } from './dto/update-survey-enumerator.dto';
import { CreateSingleEnumeratorDto } from './dto/create-single-enumerator.dto';
import { EnumeratorCsvRowDto } from './dto/bulk-assign-csv.dto';
import { ResetEnumeratorPasswordDto } from '../../supervisor/dto/reset-enumerator-password.dto';
import { UpdateEnumeratorDto } from '../../supervisor/dto/update-enumerator.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';
import { SupervisorHelperService } from '../../auth/services/supervisor-helper.service';
import { ForbiddenException } from '@nestjs/common';

@Controller('supervisor/survey-enumerator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SurveyEnumeratorSupervisorController {
  constructor(
    private readonly surveyEnumeratorService: SurveyEnumeratorService,
    private readonly supervisorHelperService: SupervisorHelperService,
  ) {}

  /**
   * Get enumerators by survey (scoped to supervisor's dzongkhags)
   * @param surveyId
   * @param req
   */
  @Get('by-survey/:surveyId')
  findBySurvey(
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumeratorService.findBySurveyForSupervisor(
      supervisorId,
      surveyId,
    );
  }

  /**
   * Create a single enumerator with dzongkhag assignments (with access check)
   * Creates user if they don't exist and assigns them to the survey
   * Verifies all dzongkhags are accessible to supervisor
   * 
   * @param createDto - Enumerator data with dzongkhag assignments
   * @param req
   */
  @Post('single')
  async createSingleEnumerator(
    @Body() createDto: CreateSingleEnumeratorDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;

    // Verify all dzongkhags are accessible to supervisor
    for (const dzongkhagId of createDto.dzongkhagIds) {
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

    return this.surveyEnumeratorService.createSingleEnumerator(createDto);
  }

  /**
   * Bulk upload enumerator for their enumeration area from CSV (with dzongkhag verification)
   * @param file
   * @param surveyId
   * @param req
   */
  @Post('bulk-assign-csv')
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
    @Request() req,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const supervisorId = req.user?.id;
    const surveyIdNum = parseInt(surveyId, 10);

    if (!surveyIdNum || isNaN(surveyIdNum)) {
      throw new BadRequestException('surveyId is required');
    }

    // Parse CSV content
    const csvContent = file.buffer.toString('utf-8');
    const enumerators = this.parseCsv(csvContent);

    return this.surveyEnumeratorService.bulkAssignFromCsvForSupervisor(
      supervisorId,
      surveyIdNum,
      enumerators,
    );
  }

  /**
   * Parse CSV content to EnumeratorCsvRowDto array
   * Validates required headers and returns clear error messages
   * @param csvContent
   */
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

  /**
   * Get CSV template for bulk upload
   */
  @Get('template/csv')
  @Header('Content-Type', 'text/csv')
  @Header(
    'Content-Disposition',
    'attachment; filename="enumerator_upload_template.csv"',
  )
  async getCSVTemplate(@Res() res: Response) {
    const template = await this.surveyEnumeratorService.generateCSVTemplate();
    res.send(template);
  }

  /**
   * Reset password for their enumerators (with access check)
   * @param userId
   * @param dto
   * @param req
   */
  @Post(':userId/reset-password')
  resetPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: ResetEnumeratorPasswordDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumeratorService.resetEnumeratorPasswordForSupervisor(
      supervisorId,
      userId,
      dto.newPassword,
    );
  }

  /**
   * Edit details for their enumerators (with access check)
   * Can update: name, emailAddress, phoneNumber, or assignment (surveyId, dzongkhagIds)
   * When dzongkhagIds is provided with surveyId, replaces all existing assignments with the new ones (no comparison, simple replace)
   * @param userId
   * @param dto - Update data
   * @param dto.name - Enumerator name (optional)
   * @param dto.emailAddress - Email address (optional)
   * @param dto.phoneNumber - Phone number (optional)
   * @param dto.surveyId - Survey ID (required when updating assignments)
   * @param dto.dzongkhagIds - Array of dzongkhag IDs to replace all assignments (optional)
   * @param req
   */
  @Patch(':userId')
  updateEnumerator(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateEnumeratorDto,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumeratorService.updateEnumeratorForSupervisor(
      supervisorId,
      userId,
      dto,
    );
  }

  /**
   * Soft delete their enumerators (set isActive to false) with access check
   * @param userId
   * @param surveyId
   * @param req
   */
  @Delete(':userId/:surveyId')
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    return this.surveyEnumeratorService.removeForSupervisor(
      supervisorId,
      userId,
      surveyId,
    );
  }

  /**
   * Soft delete a specific enumerator assignment (set isActive to false) with access check
   * @param userId
   * @param surveyId
   * @param dzongkhagId
   * @param req
   */
  @Delete(':userId/:surveyId/:dzongkhagId/soft')
  async softDelete(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Param('dzongkhagId', ParseIntPipe) dzongkhagId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    
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

    await this.surveyEnumeratorService.softDelete(userId, surveyId, dzongkhagId);
    return { message: 'Enumerator assignment soft deleted successfully' };
  }

  /**
   * Soft delete all enumerator assignments for a user-survey combination (with access check)
   * @param userId
   * @param surveyId
   * @param req
   */
  @Delete(':userId/:surveyId/soft')
  async softDeleteAll(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    
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
   * Reactivate user - Restore all soft-deleted enumerator assignments for a user-survey combination (set isActive to true) with access check
   * @param userId
   * @param surveyId
   * @param req
   */
  @Post(':userId/:surveyId/restore')
  async reactivateUser(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
    @Request() req,
  ) {
    const supervisorId = req.user?.id;
    
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

    const count = await this.surveyEnumeratorService.restoreAllForUserAndSurvey(
      userId,
      surveyId,
    );
    return {
      message: 'All enumerator assignments restored successfully',
      restoredCount: count,
    };
  }


}

