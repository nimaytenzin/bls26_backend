import { Injectable, Inject } from '@nestjs/common';
import { SupervisorDzongkhag } from '../entities/supervisor-dzongkhag.entity';
import { EnumerationArea } from '../../location/enumeration-area/entities/enumeration-area.entity';
import { SurveyEnumerationArea } from '../../survey/survey-enumeration-area/entities/survey-enumeration-area.entity';
import { SubAdministrativeZone } from '../../location/sub-administrative-zone/entities/sub-administrative-zone.entity';
import { AdministrativeZone } from '../../location/administrative-zone/entities/administrative-zone.entity';
import { SurveyEnumerator } from '../../survey/survey-enumerator/entities/survey-enumerator.entity';
import { Op } from 'sequelize';

@Injectable()
export class SupervisorHelperService {
  constructor(
    @Inject('SUPERVISOR_DZONGKHAG_REPOSITORY')
    private readonly supervisorDzongkhagRepository: typeof SupervisorDzongkhag,
    @Inject('ENUMERATION_AREA_REPOSITORY')
    private readonly enumerationAreaRepository: typeof EnumerationArea,
    @Inject('SURVEY_ENUMERATION_AREA_REPOSITORY')
    private readonly surveyEnumerationAreaRepository: typeof SurveyEnumerationArea,
    @Inject('SURVEY_ENUMERATOR_REPOSITORY')
    private readonly surveyEnumeratorRepository: typeof SurveyEnumerator,
  ) {}

  /**
   * Get supervisor's dzongkhag IDs from SupervisorDzongkhag table
   * @param supervisorId
   * @returns Array of dzongkhag IDs
   */
  async getSupervisorDzongkhagIds(supervisorId: number): Promise<number[]> {
    const assignments = await this.supervisorDzongkhagRepository.findAll({
      where: { supervisorId },
      attributes: ['dzongkhagId'],
    });
    return assignments.map((a) => a.dzongkhagId);
  }

  /**
   * Verify EA belongs to supervisor's dzongkhag
   * Checks via EA -> SAZ (junction) -> AZ -> Dzongkhag
   * @param supervisorId
   * @param enumerationAreaId
   * @returns true if EA belongs to supervisor's dzongkhag
   */
  async verifySupervisorAccessToEA(
    supervisorId: number,
    enumerationAreaId: number,
  ): Promise<boolean> {
    const dzongkhagIds = await this.getSupervisorDzongkhagIds(supervisorId);
    if (dzongkhagIds.length === 0) {
      return false;
    }

    // Get EA with SAZs and their AZs
    const ea = await this.enumerationAreaRepository.findByPk(enumerationAreaId, {
      include: [
        {
          model: SubAdministrativeZone,
          as: 'subAdministrativeZones',
          through: { attributes: [] },
          include: [
            {
              model: AdministrativeZone,
              attributes: ['id', 'dzongkhagId'],
            },
          ],
        },
      ],
    });

    if (!ea) {
      return false;
    }

    // Check if any SAZ's AZ belongs to supervisor's dzongkhags
    const hasAccess = ea.subAdministrativeZones?.some((saz) => {
      const az = saz.administrativeZone;
      return az && dzongkhagIds.includes(az.dzongkhagId);
    });

    return hasAccess || false;
  }

  /**
   * Verify SurveyEA's EA belongs to supervisor's dzongkhag
   * @param supervisorId
   * @param surveyEnumerationAreaId
   * @returns true if SurveyEA's EA belongs to supervisor's dzongkhag
   */
  async verifySupervisorAccessToSurveyEA(
    supervisorId: number,
    surveyEnumerationAreaId: number,
  ): Promise<boolean> {
    const surveyEA = await this.surveyEnumerationAreaRepository.findByPk(
      surveyEnumerationAreaId,
      {
        attributes: ['enumerationAreaId'],
      },
    );

    if (!surveyEA) {
      return false;
    }

    return this.verifySupervisorAccessToEA(
      supervisorId,
      surveyEA.enumerationAreaId,
    );
  }

  /**
   * Verify supervisor has access to specific dzongkhag
   * @param supervisorId
   * @param dzongkhagId
   * @returns true if supervisor has access to dzongkhag
   */
  async verifySupervisorAccessToDzongkhag(
    supervisorId: number,
    dzongkhagId: number,
  ): Promise<boolean> {
    const dzongkhagIds = await this.getSupervisorDzongkhagIds(supervisorId);
    return dzongkhagIds.includes(dzongkhagId);
  }

  /**
   * Verify enumerator belongs to supervisor's dzongkhags
   * Checks via SurveyEnumerator.dzongkhagId
   * @param supervisorId
   * @param enumeratorUserId
   * @returns true if enumerator's dzongkhag matches supervisor's dzongkhags
   */
  async verifyEnumeratorBelongsToSupervisor(
    supervisorId: number,
    enumeratorUserId: number,
  ): Promise<boolean> {
    const dzongkhagIds = await this.getSupervisorDzongkhagIds(supervisorId);
    if (dzongkhagIds.length === 0) {
      return false;
    }

    // Check if enumerator has any assignment with dzongkhagId in supervisor's dzongkhags
    const enumeratorAssignment = await this.surveyEnumeratorRepository.findOne({
      where: {
        userId: enumeratorUserId,
        dzongkhagId: { [Op.in]: dzongkhagIds },
      },
    });

    return !!enumeratorAssignment;
  }
}

