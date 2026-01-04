import { Injectable, Inject, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Survey, SurveyStatus } from './entities/survey.entity';
import { Op } from 'sequelize';

@Injectable()
export class SurveySchedulerService {
  private readonly logger = new Logger(SurveySchedulerService.name);

  constructor(
    @Inject('SURVEY_REPOSITORY')
    private readonly surveyRepository: typeof Survey,
  ) {}

  /**
   * Cron job that runs daily at midnight (00:00:00) to mark expired surveys as ENDED
   * Checks for surveys where:
   * - endDate <= today (end date has passed or is today)
   * - status = ACTIVE (not already ended)
   * 
   * This runs automatically every day to ensure surveys are marked as ended
   * when their end date has passed.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async markExpiredSurveysAsEnded() {
    this.logger.log('Starting cron job: Marking expired surveys as ENDED...');
    const startTime = Date.now();

    try {
      // Get today's date (start of day, UTC)
      // We'll mark surveys as ended if endDate <= today (including today)
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);

      // Find all active surveys where endDate <= today (end date has passed or is today)
      const expiredSurveys = await this.surveyRepository.findAll({
        where: {
          status: SurveyStatus.ACTIVE,
          endDate: {
            [Op.lte]: today,
          },
        },
      });

      if (expiredSurveys.length === 0) {
        this.logger.log('No expired surveys found to mark as ENDED');
        return {
          message: 'No expired surveys found',
          surveysUpdated: 0,
        };
      }

      // Update all expired surveys to ENDED status
      const updateResult = await this.surveyRepository.update(
        {
          status: SurveyStatus.ENDED,
        },
        {
          where: {
            status: SurveyStatus.ACTIVE,
            endDate: {
              [Op.lte]: today,
            },
          },
        },
      );

      const surveysUpdated = updateResult[0]; // Number of affected rows

      const duration = Date.now() - startTime;
      this.logger.log(
        `Cron job completed: Marked ${surveysUpdated} survey(s) as ENDED in ${duration}ms`,
      );

      return {
        message: `Successfully marked ${surveysUpdated} survey(s) as ENDED`,
        surveysUpdated,
        surveyIds: expiredSurveys.map((s) => s.id),
      };
    } catch (error) {
      this.logger.error(
        `Error in markExpiredSurveysAsEnded cron job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }


}

