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
   * Whether all enumeration areas have been published
   */
  isFullyPublished: boolean;

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
   * Workflow Progress
   */

  /**
   * Number of enumeration areas that have been enumerated
   */
  enumeratedEnumerationAreas: number;

  /**
   * Number of enumeration areas that have been sampled
   */
  sampledEnumerationAreas: number;

  /**
   * Number of enumeration areas that have been published
   */
  publishedEnumerationAreas: number;

  /**
   * Number of enumeration areas pending enumeration
   */
  pendingEnumerationAreas: number;

  /**
   * Percentage of enumeration areas enumerated (as string with 2 decimal places)
   */
  enumerationPercentage: string;

  /**
   * Percentage of enumerated areas sampled (as string with 2 decimal places)
   */
  samplingPercentage: string;

  /**
   * Percentage of sampled areas published (as string with 2 decimal places)
   */
  publishingPercentage: string;

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
