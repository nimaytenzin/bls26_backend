import { SurveyStatus } from '../entities/survey.entity';

/**
 * Response DTO for comprehensive survey statistics
 * Provides overview of survey progress, coverage, and data collection metrics
 */
export class SurveyStatisticsResponseDto {
  /**
   * Survey identification
   */
  surveyId: number;

  /**
   * Survey name
   */
  surveyName: string;

  /**
   * Current survey status (ACTIVE or ENDED)
   */
  surveyStatus: SurveyStatus;

  /**
   * Survey year
   */
  surveyYear: number;

  /**
   * Whether all enumeration areas have been validated
   */
  isFullyValidated: boolean;

  /**
   * Geographic Coverage
   */

  /**
   * Total number of unique dzongkhags covered by the survey
   */
  totalDzongkhags: number;

  /**
   * Total number of enumeration areas in the survey
   */
  totalEnumerationAreas: number;

  /**
   * Submission Progress
   */

  /**
   * Number of enumeration areas that have been submitted
   */
  submittedEnumerationAreas: number;

  /**
   * Number of enumeration areas that have been validated
   */
  validatedEnumerationAreas: number;

  /**
   * Number of enumeration areas pending submission
   */
  pendingEnumerationAreas: number;

  /**
   * Percentage of enumeration areas submitted (as string with 2 decimal places)
   */
  submissionPercentage: string;

  /**
   * Percentage of enumeration areas validated (as string with 2 decimal places)
   */
  validationPercentage: string;

  /**
   * Resource Allocation
   */

  /**
   * Total number of enumerators assigned to the survey
   */
  totalEnumerators: number;

  /**
   * Household and Population Data
   */

  /**
   * Total number of household listings collected
   */
  totalHouseholds: number;

  /**
   * Total male population counted
   */
  totalMale: number;

  /**
   * Total female population counted
   */
  totalFemale: number;

  /**
   * Total population (male + female)
   */
  totalPopulation: number;

  /**
   * Average household size (as string with 2 decimal places)
   */
  averageHouseholdSize: string;
}
