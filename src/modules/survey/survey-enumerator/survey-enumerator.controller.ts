import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { SurveyEnumeratorService } from './survey-enumerator.service';
import { CreateSurveyEnumeratorDto } from './dto/create-survey-enumerator.dto';
import { BulkAssignFromCsvDto } from './dto/bulk-assign-csv.dto';
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

  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  create(@Body() createSurveyEnumeratorDto: CreateSurveyEnumeratorDto) {
    return this.surveyEnumeratorService.create(createSurveyEnumeratorDto);
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

  @Get(':userId/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.ENUMERATOR)
  findOne(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.surveyEnumeratorService.findOne(userId, surveyId);
  }

  @Delete(':userId/:surveyId')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  remove(
    @Param('userId', ParseIntPipe) userId: number,
    @Param('surveyId', ParseIntPipe) surveyId: number,
  ) {
    return this.surveyEnumeratorService.remove(userId, surveyId);
  }

  @Post('bulk-assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  bulkCreate(@Body() body: { surveyId: number; userIds: number[] }) {
    return this.surveyEnumeratorService.bulkCreate(body.surveyId, body.userIds);
  }

  @Post('bulk-assign-csv')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  bulkAssignFromCsv(@Body() bulkAssignDto: BulkAssignFromCsvDto) {
    return this.surveyEnumeratorService.bulkAssignFromCsv(
      bulkAssignDto.surveyId,
      bulkAssignDto.enumerators,
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
}
