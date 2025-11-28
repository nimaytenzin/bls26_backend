/**
 * Response DTO for household listing statistics
 * Used for both enumeration area-level and survey-level statistics
 */
export class HouseholdListingStatisticsResponseDto {
  /**
   * Total number of households
   */
  totalHouseholds: number;

  /**
   * Total male population
   */
  totalMale: number;

  /**
   * Total female population
   */
  totalFemale: number;

  /**
   * Total population (male + female)
   */
  totalPopulation: number;

  /**
   * Number of households with phone numbers
   */
  householdsWithPhone: number;

  /**
   * Average household size (as string with 2 decimal places)
   */
  averageHouseholdSize: string;

  /**
   * Total number of enumeration areas (only present for survey-level statistics)
   */
  totalEnumerationAreas?: number;
}

