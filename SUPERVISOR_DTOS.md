# Supervisor Routes DTOs Documentation

This document provides detailed information about all Data Transfer Objects (DTOs) used in supervisor routes.

---

## 1. Household Listing DTOs

### CreateBlankHouseholdListingsDto

**File:** `src/modules/survey/survey-enumeration-area-household-listing/dto/create-blank-household-listings.dto.ts`

**Used in:** `POST /supervisor/survey-enumeration-area-household-listing/by-survey-ea/:surveyEnumerationAreaId/create-blank`

**Description:** DTO for creating blank household listing entries for historical surveys.

```typescript
export class CreateBlankHouseholdListingsDto {
  @IsInt()
  @Min(1)
  @Max(10000) // Reasonable upper limit
  count: number;

  @IsOptional()
  @IsString()
  remarks?: string; // Optional custom remarks, defaults to "No data available - Historical survey"
}
```

**Fields:**
- `count` (required, integer, min: 1, max: 10000): Number of blank household entries to create
- `remarks` (optional, string): Custom remarks for the entries. If not provided, defaults to "No data available - Historical survey entry"

**Validation Rules:**
- `count` must be a positive integer between 1 and 10000
- `remarks` is optional and can be any string

**Example:**
```json
{
  "count": 10,
  "remarks": "Historical data entry for 2020 survey"
}
```

---

### UpdateSurveyEnumerationAreaHouseholdListingDto

**File:** `src/modules/survey/survey-enumeration-area-household-listing/dto/update-survey-enumeration-area-household-listing.dto.ts`

**Used in:** `PATCH /supervisor/survey-enumeration-area-household-listing/:id`

**Description:** DTO for updating household listing information. All fields are optional.

```typescript
export class UpdateSurveyEnumerationAreaHouseholdListingDto extends PartialType(
  CreateSurveyEnumerationAreaHouseholdListingDto
) {}
```

**Base DTO (CreateSurveyEnumerationAreaHouseholdListingDto):**
```typescript
export class CreateSurveyEnumerationAreaHouseholdListingDto {
  @IsInt()
  @IsOptional()
  structureId?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  householdIdentification?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  householdSerialNumber?: number;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  nameOfHOH?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalMale?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  totalFemale?: number;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  remarks?: string;
}
```

**Fields:**
- `structureId` (optional, integer): ID of the structure this household belongs to
- `householdIdentification` (optional, string): Unique household identifier
- `householdSerialNumber` (optional, integer, positive): Serial number within the structure
- `nameOfHOH` (optional, string): Name of Head of Household
- `totalMale` (optional, integer, min: 0): Total number of males in household
- `totalFemale` (optional, integer, min: 0): Total number of females in household
- `phoneNumber` (optional, string): Contact phone number
- `remarks` (optional, string): Additional remarks or notes

**Validation Rules:**
- All fields are optional
- `structureId` must be a positive integer if provided
- `householdSerialNumber` must be a positive integer if provided
- `totalMale` and `totalFemale` must be non-negative integers if provided
- `householdIdentification` and `nameOfHOH` cannot be empty strings if provided

**Example:**
```json
{
  "nameOfHOH": "Updated Name",
  "totalMale": 3,
  "totalFemale": 4,
  "phoneNumber": "17234567",
  "remarks": "Updated household information"
}
```

---

## 2. Enumerator Management DTOs

### EnumeratorCsvRowDto

**File:** `src/modules/survey/survey-enumerator/dto/bulk-assign-csv.dto.ts`

**Used in:** `POST /supervisor/survey-enumerator/bulk-assign-csv`

**Description:** DTO representing a single row in the enumerator CSV upload file.

```typescript
export class EnumeratorCsvRowDto {
  name: string;
  cid: string;
  emailAddress?: string;
  phoneNumber?: string;
  password?: string;
  role?: string;
  dzongkhagCode: string; // Dzongkhag code (e.g., "01", "02")
}
```

**Fields:**
- `name` (required, string): Full name of the enumerator
- `cid` (required, string): Citizen ID number (unique identifier)
- `emailAddress` (optional, string): Email address. If not provided, auto-generated as `{cid}@dummy.nsb.gov.bt`
- `phoneNumber` (optional, string): Contact phone number
- `password` (optional, string): Password. If not provided, uses CID as password
- `role` (optional, string): User role (typically "ENUMERATOR")
- `dzongkhagCode` (required, string): Dzongkhag code (e.g., "01", "02", "10"). Must be in supervisor's assigned dzongkhags

**Validation Rules:**
- `name` and `cid` are required
- `dzongkhagCode` is required and must match a dzongkhag the supervisor has access to
- `emailAddress` and `phoneNumber` are optional
- If `password` is not provided, CID is used as the password

**Example:**
```json
{
  "name": "Nima Yoezer",
  "cid": "12345678901",
  "emailAddress": "nima.yoezer@example.com",
  "phoneNumber": "17123456",
  "password": "",
  "dzongkhagCode": "01"
}
```

---

### BulkAssignFromCsvDto

**File:** `src/modules/survey/survey-enumerator/dto/bulk-assign-csv.dto.ts`

**Used in:** `POST /supervisor/survey-enumerator/bulk-assign-csv` (internal use)

**Description:** DTO for bulk assigning enumerators from CSV data.

```typescript
export class BulkAssignFromCsvDto {
  @IsInt()
  @IsNotEmpty()
  surveyId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EnumeratorCsvRowDto)
  enumerators: EnumeratorCsvRowDto[];
}
```

**Fields:**
- `surveyId` (required, integer): ID of the survey to assign enumerators to
- `enumerators` (required, array): Array of enumerator data from CSV

**Validation Rules:**
- `surveyId` must be a positive integer
- `enumerators` must be a non-empty array
- Each enumerator in the array must be a valid `EnumeratorCsvRowDto`

**Example:**
```json
{
  "surveyId": 1,
  "enumerators": [
    {
      "name": "Nima Yoezer",
      "cid": "12345678901",
      "emailAddress": "nima.yoezer@example.com",
      "phoneNumber": "17123456",
      "dzongkhagCode": "01"
    },
    {
      "name": "Sonam Wangmo",
      "cid": "23456789012",
      "emailAddress": "sonam.wangmo@example.com",
      "phoneNumber": "17234567",
      "dzongkhagCode": "02"
    }
  ]
}
```

---

### ResetEnumeratorPasswordDto

**File:** `src/modules/supervisor/dto/reset-enumerator-password.dto.ts`

**Used in:** `POST /supervisor/survey-enumerator/:userId/reset-password`

**Description:** DTO for resetting an enumerator's password.

```typescript
export class ResetEnumeratorPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  newPassword: string;
}
```

**Fields:**
- `newPassword` (required, string, min length: 6): New password for the enumerator

**Validation Rules:**
- `newPassword` must be a non-empty string
- `newPassword` must be at least 6 characters long

**Example:**
```json
{
  "newPassword": "newSecurePassword123"
}
```

---

### UpdateEnumeratorDto

**File:** `src/modules/supervisor/dto/update-enumerator.dto.ts`

**Used in:** `PATCH /supervisor/survey-enumerator/:userId`

**Description:** DTO for updating enumerator details (user information or assignment).

```typescript
export class UpdateEnumeratorDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  emailAddress?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsInt()
  @IsPositive()
  @IsOptional()
  surveyId?: number;

  @IsInt()
  @IsPositive()
  @IsOptional()
  dzongkhagId?: number;
}
```

**Fields:**
- `name` (optional, string): Updated name of the enumerator
- `emailAddress` (optional, string, email format): Updated email address
- `phoneNumber` (optional, string): Updated phone number
- `surveyId` (optional, integer, positive): Survey ID for assignment update (must be provided with dzongkhagId)
- `dzongkhagId` (optional, integer, positive): Dzongkhag ID for assignment update (must be provided with surveyId)

**Validation Rules:**
- All fields are optional
- `emailAddress` must be a valid email format if provided
- `surveyId` and `dzongkhagId` must be positive integers if provided
- If updating assignment, both `surveyId` and `dzongkhagId` should be provided together
- New `dzongkhagId` must be in supervisor's assigned dzongkhags

**Example:**
```json
{
  "name": "Updated Name",
  "emailAddress": "updated.email@example.com",
  "phoneNumber": "17345678"
}
```

**Example (with assignment update):**
```json
{
  "name": "Updated Name",
  "surveyId": 1,
  "dzongkhagId": 2
}
```

---

## 3. Sampling DTOs

### RunEnumerationAreaSamplingDto

**File:** `src/modules/sampling/dto/run-enumeration-area-sampling.dto.ts`

**Used in:** 
- `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/run`
- `POST /supervisor/sampling/surveys/:surveyId/enumeration-areas/:seaId/resample`

**Description:** DTO for running sampling on an enumeration area.

```typescript
export class RunEnumerationAreaSamplingDto {
  @IsOptional()
  @IsEnum(SamplingMethod)
  method?: SamplingMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  randomStart?: number;

  @IsOptional()
  @IsBoolean()
  overwriteExisting?: boolean;
}
```

**Fields:**
- `method` (optional, enum): Sampling method - `'CSS'` (Circular Systematic Sampling) or `'SRS'` (Simple Random Sampling). If not provided, uses survey's default method from config
- `sampleSize` (optional, integer, positive): Number of households to sample. If not provided, uses survey's default sample size from config
- `randomStart` (optional, integer, positive): Random starting point for CSS method. Only used when method is CSS
- `overwriteExisting` (optional, boolean): Whether to overwrite existing sampling results. Default: `false`. For resample endpoint, this is automatically set to `true`

**Validation Rules:**
- All fields are optional
- `method` must be one of: `'CSS'` or `'SRS'`
- `sampleSize` and `randomStart` must be positive integers if provided
- `overwriteExisting` must be a boolean if provided

**Example:**
```json
{
  "method": "CSS",
  "sampleSize": 10,
  "randomStart": 3,
  "overwriteExisting": false
}
```

**Example (minimal):**
```json
{
  "sampleSize": 15
}
```

---

### BulkRunSamplingDto

**File:** `src/modules/supervisor/dto/bulk-run-sampling.dto.ts`

**Used in:** `POST /supervisor/sampling/surveys/:surveyId/bulk-run`

**Description:** DTO for running sampling on multiple enumeration areas in bulk.

```typescript
export class BulkRunSamplingDto {
  @IsArray()
  @IsInt({ each: true })
  @IsPositive({ each: true })
  @Type(() => Number)
  surveyEnumerationAreaIds: number[];

  @IsOptional()
  @IsEnum(SamplingMethod)
  method?: SamplingMethod;

  @IsOptional()
  @IsInt()
  @IsPositive()
  sampleSize?: number;

  @IsOptional()
  @IsInt()
  @IsPositive()
  randomStart?: number;
}
```

**Fields:**
- `surveyEnumerationAreaIds` (required, array of integers): Array of survey enumeration area IDs to run sampling on
- `method` (optional, enum): Sampling method - `'CSS'` or `'SRS'`. Applied to all EAs
- `sampleSize` (optional, integer, positive): Sample size. Applied to all EAs
- `randomStart` (optional, integer, positive): Random starting point for CSS method. Applied to all EAs

**Validation Rules:**
- `surveyEnumerationAreaIds` must be a non-empty array of positive integers
- All IDs in the array must belong to enumeration areas the supervisor has access to
- `method`, `sampleSize`, and `randomStart` follow the same rules as `RunEnumerationAreaSamplingDto`

**Example:**
```json
{
  "surveyEnumerationAreaIds": [1, 2, 3, 4, 5],
  "method": "CSS",
  "sampleSize": 10,
  "randomStart": 3
}
```

---

## 4. Common Enums

### SamplingMethod

**File:** `src/modules/sampling/entities/survey-sampling-config.entity.ts`

**Description:** Enumeration of available sampling methods.

```typescript
export enum SamplingMethod {
  CSS = 'CSS',  // Circular Systematic Sampling
  SRS = 'SRS', // Simple Random Sampling
}
```

**Values:**
- `CSS`: Circular Systematic Sampling - Selects households at regular intervals with a random start
- `SRS`: Simple Random Sampling - Randomly selects households from the population

---

## 5. Response DTOs

### RunSamplingResponseDto

**File:** `src/modules/sampling/dto/run-sampling-response.dto.ts`

**Description:** Response DTO for sampling operations.

```typescript
export class RunSamplingResponseDto {
  success: boolean;
  message: string;
  data: {
    samplingId: number;
    surveyEnumerationAreaId: number;
    method: SamplingMethod;
    sampleSize: number;
    populationSize: number;
    isFullSelection: boolean;
    executedAt: Date;
  };
}
```

**Fields:**
- `success` (boolean): Whether the operation was successful
- `message` (string): Human-readable message
- `data` (object): Sampling result data
  - `samplingId` (number): ID of the created sampling record
  - `surveyEnumerationAreaId` (number): ID of the survey enumeration area
  - `method` (SamplingMethod): Method used for sampling
  - `sampleSize` (number): Number of households selected
  - `populationSize` (number): Total number of households in the EA
  - `isFullSelection` (boolean): Whether all households were selected (population <= sample size)
  - `executedAt` (Date): Timestamp when sampling was executed

---

## Validation Summary

### Common Validation Decorators

- `@IsString()`: Field must be a string
- `@IsInt()`: Field must be an integer
- `@IsEmail()`: Field must be a valid email address
- `@IsOptional()`: Field is optional
- `@IsNotEmpty()`: Field cannot be empty
- `@IsArray()`: Field must be an array
- `@IsEnum()`: Field must be one of the enum values
- `@IsBoolean()`: Field must be a boolean
- `@IsPositive()`: Number must be positive (> 0)
- `@Min(n)`: Number must be at least n
- `@Max(n)`: Number must be at most n
- `@MinLength(n)`: String must be at least n characters
- `@ValidateNested()`: Validate nested objects in arrays
- `@Type()`: Transform the value (e.g., to Number)

---

## Usage Notes

1. **Optional Fields**: All optional fields can be omitted from the request body
2. **Validation**: All DTOs use `class-validator` decorators for automatic validation
3. **Transformation**: Some DTOs use `class-transformer` for type conversion (e.g., string to number)
4. **Error Messages**: Validation errors return detailed messages indicating which field failed and why
5. **Nested Validation**: Arrays of DTOs are validated recursively using `@ValidateNested()`

---

## Example Error Responses

### Validation Error (400 Bad Request)

```json
{
  "statusCode": 400,
  "message": [
    "count must be a positive number",
    "newPassword must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

### Access Denied (403 Forbidden)

```json
{
  "statusCode": 403,
  "message": "You do not have access to this enumeration area",
  "error": "Forbidden"
}
```

---

## Support

For questions about DTOs or validation rules, please refer to the main documentation or contact the development team.

