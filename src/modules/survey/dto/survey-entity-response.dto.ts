/**
 * Complete Entity Response DTOs for Survey Module
 * These DTOs represent the full structure of entities with all relationships
 */

import { SurveyStatus } from '../survey/entities/survey.entity';

/**
 * Survey Entity Response DTO
 */
export class SurveyResponseDto {
  id: number;
  name: string;
  description: string;
  startDate: Date;
  endDate: Date;
  year: number;
  status: SurveyStatus;
  isFullyValidated: boolean;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relationships
  enumerationAreas?: EnumerationAreaResponseDto[];
  surveyEnumerationAreas?: SurveyEnumerationAreaResponseDto[];
}

/**
 * Survey Enumeration Area Response DTO
 */
export class SurveyEnumerationAreaResponseDto {
  id: number;
  surveyId: number;
  enumerationAreaId: number;
  
  // Enumeration Workflow Fields
  isEnumerated: boolean;
  enumeratedBy: number | null;
  enumerationDate: Date | null;
  
  // Sampling Workflow Fields
  isSampled: boolean;
  sampledBy: number | null;
  sampledDate: Date | null;
  
  // Publishing Workflow Fields
  isPublished: boolean;
  publishedBy: number | null;
  publishedDate: Date | null;
  
  // Optional fields
  comments: string | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relationships
  survey?: SurveyResponseDto;
  enumerationArea?: EnumerationAreaResponseDto;
  enumerator?: UserResponseDto;
  sampler?: UserResponseDto;
  publisher?: UserResponseDto;
  structures?: SurveyEnumerationAreaStructureResponseDto[];
  householdListings?: SurveyEnumerationAreaHouseholdListingResponseDto[];
}

/**
 * Survey Enumeration Area Structure Response DTO
 */
export class SurveyEnumerationAreaStructureResponseDto {
  id: number;
  surveyEnumerationAreaId: number;
  structureNumber: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relationships
  surveyEnumerationArea?: SurveyEnumerationAreaResponseDto;
  householdListings?: SurveyEnumerationAreaHouseholdListingResponseDto[];
}

/**
 * Survey Enumeration Area Household Listing Response DTO
 */
export class SurveyEnumerationAreaHouseholdListingResponseDto {
  id: number;
  surveyEnumerationAreaId: number;
  structureId: number | null;
  structureNumber: string | null; // TODO: Remove after migration
  householdIdentification: string;
  householdSerialNumber: number;
  nameOfHOH: string;
  totalMale: number;
  totalFemale: number;
  phoneNumber: string | null;
  remarks: string | null;
  submittedBy: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relationships
  surveyEnumerationArea?: SurveyEnumerationAreaResponseDto;
  structure?: SurveyEnumerationAreaStructureResponseDto;
  submitter?: UserResponseDto;
}

/**
 * Survey Enumerator Response DTO
 */
export class SurveyEnumeratorResponseDto {
  userId: number;
  surveyId: number;
  createdAt: Date;
  updatedAt: Date;
  
  // Optional relationships
  user?: UserResponseDto;
  survey?: SurveyResponseDto;
}

/**
 * Enumeration Area Response DTO (from location module)
 */
export class EnumerationAreaResponseDto {
  id: number;
  name: string;
  areaCode: string;
  subAdministrativeZoneIds: number[];  // Via junction table (array of SAZ IDs)
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Response DTO (from auth module)
 */
export class UserResponseDto {
  id: number;
  name: string;
  cid: string | null;
  phoneNumber: string | null;
  emailAddress: string | null;
  role: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Complete Survey with Full Hierarchy Response DTO
 */
export class CompleteSurveyResponseDto {
  survey: SurveyResponseDto;
  enumerationAreas: Array<{
    surveyEnumerationArea: SurveyEnumerationAreaResponseDto;
    enumerationArea: EnumerationAreaResponseDto;
    structures: SurveyEnumerationAreaStructureResponseDto[];
    householdListings: SurveyEnumerationAreaHouseholdListingResponseDto[];
  }>;
  enumerators: SurveyEnumeratorResponseDto[];
}

