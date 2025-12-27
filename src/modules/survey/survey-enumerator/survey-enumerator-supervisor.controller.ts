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
import { EnumeratorCsvRowDto } from './dto/bulk-assign-csv.dto';
import { ResetEnumeratorPasswordDto } from '../../supervisor/dto/reset-enumerator-password.dto';
import { UpdateEnumeratorDto } from '../../supervisor/dto/update-enumerator.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { UserRole } from '../../auth/entities/user.entity';

@Controller('supervisor/survey-enumerator')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPERVISOR)
export class SurveyEnumeratorSupervisorController {
  constructor(
    private readonly surveyEnumeratorService: SurveyEnumeratorService,
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
   * @param csvContent
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
    const headers = headerLine.split(',').map((h) => h.trim().replace(/^"|"$/g, ''));

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

    const nameIndex = findColumnIndex(
      ['Name', 'name'],
      [(h) => h.includes('name')],
    );
    const cidIndex = findColumnIndex(
      ['CID', 'cid'],
      [(h) => h.includes('cid')],
    );
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
    const dzongkhagCodeIndex = findColumnIndex(
      ['Dzongkhag Code', 'dzongkhagCode', 'DzongkhagCode'],
      [(h) => h.includes('dzongkhag')],
    );

    // Parse data rows
    const enumerators: EnumeratorCsvRowDto[] = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));

      if (cidIndex < 0 || !values[cidIndex]) {
        continue; // Skip rows without CID
      }

      const enumerator: EnumeratorCsvRowDto = {
        name: nameIndex >= 0 && values[nameIndex] ? values[nameIndex] : '',
        cid: values[cidIndex],
        emailAddress:
          emailIndex >= 0 && values[emailIndex] ? values[emailIndex] : undefined,
        phoneNumber:
          phoneIndex >= 0 && values[phoneIndex] ? values[phoneIndex] : undefined,
        password:
          passwordIndex >= 0 && values[passwordIndex]
            ? values[passwordIndex]
            : undefined,
        dzongkhagCode:
          dzongkhagCodeIndex >= 0 && values[dzongkhagCodeIndex]
            ? values[dzongkhagCodeIndex]
            : '',
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
   * Can update: name, emailAddress, phoneNumber, or assignment (surveyId, dzongkhagId)
   * @param userId
   * @param dto
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
   * Delete their enumerators (with access check)
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
}

