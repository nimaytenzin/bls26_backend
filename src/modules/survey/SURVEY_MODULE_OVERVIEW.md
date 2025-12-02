# Survey Module Overview

Complete documentation for the Survey Module including entities, DTOs, and workflows.

## Module Structure

```
survey/
├── survey/                          # Main survey entity
│   ├── entities/
│   │   └── survey.entity.ts
│   └── dto/
│       ├── create-survey.dto.ts
│       ├── update-survey.dto.ts
│       └── survey-statistics-response.dto.ts
│
├── survey-enumeration-area/        # Junction table (Survey ↔ EnumerationArea)
│   ├── entities/
│   │   └── survey-enumeration-area.entity.ts
│   └── dto/
│       ├── create-survey-enumeration-area.dto.ts
│       ├── publish-survey-enumeration-area.dto.ts
│       └── update-survey-enumeration-area.dto.ts
│
├── survey-enumeration-area-structure/  # Structures within EA
│   ├── entities/
│   │   └── survey-enumeration-area-structure.entity.ts
│   └── dto/
│       ├── create-survey-enumeration-area-structure.dto.ts
│       └── update-survey-enumeration-area-structure.dto.ts
│
├── survey-enumeration-area-household-listing/  # Households within EA
│   ├── entities/
│   │   └── survey-enumeration-area-household-listing.entity.ts
│   └── dto/
│       ├── create-survey-enumeration-area-household-listing.dto.ts
│       └── update-survey-enumeration-area-household-listing.dto.ts
│
├── survey-enumerator/               # Enumerator assignments
│   ├── entities/
│   │   └── survey-enumerator.entity.ts
│   └── dto/
│       └── create-survey-enumerator.dto.ts
│
├── dto/
│   └── survey-entity-response.dto.ts  # Complete entity DTOs
│
├── WORKFLOW_ADD_STRUCTURE_AND_HOUSEHOLD.md
└── SURVEY_MODULE_OVERVIEW.md
```

---

## Entity Relationships

```
Survey (1) ──< (Many) SurveyEnumerationArea (Many) >── (1) EnumerationArea
                │
                ├──< (Many) SurveyEnumerationAreaStructure
                │       │
                │       └──< (Many) SurveyEnumerationAreaHouseholdListing
                │
                └──< (Many) SurveyEnumerationAreaHouseholdListing

Survey (1) ──< (Many) SurveyEnumerator (Many) >── (1) User
```

---

## Core Entities

### 1. Survey
**Purpose**: Represents a survey campaign
**Key Fields**:
- `id`, `name`, `description`
- `startDate`, `endDate`, `year`
- `status` (ACTIVE/ENDED)
- `isFullyValidated`

### 2. SurveyEnumerationArea
**Purpose**: Links surveys to enumeration areas with workflow tracking
**Key Fields**:
- Workflow: `isEnumerated`, `isSampled`, `isPublished`
- Users: `enumeratedBy`, `sampledBy`, `publishedBy`
- Dates: `enumerationDate`, `sampledDate`, `publishedDate`

### 3. SurveyEnumerationAreaStructure
**Purpose**: Physical structures within an enumeration area
**Key Fields**:
- `structureNumber` (unique per EA)
- `latitude`, `longitude` (geolocation)

### 4. SurveyEnumerationAreaHouseholdListing
**Purpose**: Household data collected during survey
**Key Fields**:
- `householdIdentification`, `householdSerialNumber`
- `nameOfHOH`, `totalMale`, `totalFemale`
- `structureId` (links to structure)

### 5. SurveyEnumerator
**Purpose**: Assigns enumerators to surveys
**Key Fields**:
- `userId`, `surveyId` (composite primary key)

---

## Workflow States

### SurveyEnumerationArea Workflow

```
┌─────────────────┐
│ Not Enumerated  │ ← Initial state
│ isEnumerated:   │
│   false         │
└────────┬────────┘
         │
         │ Enumerator completes data collection
         │ POST /complete-enumeration
         ▼
┌─────────────────┐
│   Enumerated    │ ← Data collection complete
│ isEnumerated:   │
│   true          │
│ isSampled:      │
│   false         │
└────────┬────────┘
         │
         │ Supervisor performs sampling
         │ POST /sampling/run
         ▼
┌─────────────────┐
│    Sampled      │ ← Sampling complete
│ isEnumerated:   │
│   true          │
│ isSampled:      │
│   true          │
│ isPublished:    │
│   false         │
└────────┬────────┘
         │
         │ Admin publishes data
         │ POST /publish
         ▼
┌─────────────────┐
│   Published     │ ← Final state
│ isEnumerated:   │
│   true          │
│ isSampled:      │
│   true          │
│ isPublished:    │
│   true          │
└─────────────────┘
```

---

## Data Collection Workflow

See `WORKFLOW_ADD_STRUCTURE_AND_HOUSEHOLD.md` for detailed workflow.

**Quick Summary**:
1. Create Survey Enumeration Area
2. Add Structure(s) with geolocation
3. Add Household Listing(s) linked to structures
4. Complete Enumeration (requires ≥1 household)

---

## DTOs

### Request DTOs (Create/Update)
- `CreateSurveyDto`
- `CreateSurveyEnumerationAreaDto`
- `CreateSurveyEnumerationAreaStructureDto`
- `CreateSurveyEnumerationAreaHouseholdListingDto`
- `CreateSurveyEnumeratorDto`

### Response DTOs
- `SurveyResponseDto`
- `SurveyEnumerationAreaResponseDto`
- `SurveyEnumerationAreaStructureResponseDto`
- `SurveyEnumerationAreaHouseholdListingResponseDto`
- `SurveyEnumeratorResponseDto`

**Complete DTOs**: See `dto/survey-entity-response.dto.ts`

---

## API Endpoints

### Survey Management
- `GET /survey` - List all surveys
- `POST /survey` - Create survey
- `GET /survey/:id` - Get survey details
- `PUT /survey/:id` - Update survey
- `DELETE /survey/:id` - Delete survey

### Enumeration Area Management
- `GET /survey-enumeration-area` - List enumeration areas
- `POST /survey-enumeration-area` - Create enumeration area
- `GET /survey-enumeration-area/:id` - Get enumeration area
- `POST /survey-enumeration-area/:id/complete-enumeration` - Complete enumeration
- `POST /survey-enumeration-area/:id/publish` - Publish data (Admin)

### Structure Management
- `GET /survey-enumeration-area-structure` - List structures
- `POST /survey-enumeration-area-structure` - Create structure
- `GET /survey-enumeration-area-structure/:id` - Get structure
- `PUT /survey-enumeration-area-structure/:id` - Update structure
- `DELETE /survey-enumeration-area-structure/:id` - Delete structure

### Household Listing Management
- `GET /survey-enumeration-area-household-listing` - List households
- `POST /survey-enumeration-area-household-listing` - Create household
- `GET /survey-enumeration-area-household-listing/:id` - Get household
- `PUT /survey-enumeration-area-household-listing/:id` - Update household
- `DELETE /survey-enumeration-area-household-listing/:id` - Delete household

### Enumerator Management
- `GET /survey-enumerator` - List enumerator assignments
- `POST /survey-enumerator` - Assign enumerator
- `DELETE /survey-enumerator/:userId/:surveyId` - Remove assignment

---

## Role-Based Access Control

### ENUMERATOR
- ✅ View assigned surveys
- ✅ Add/modify structures and households
- ✅ Complete enumeration
- ✅ View sampling results
- ❌ Cannot modify after enumeration complete
- ❌ Cannot perform sampling
- ❌ Cannot publish data

### SUPERVISOR
- ✅ View all surveys
- ✅ View enumerated areas
- ✅ Perform sampling
- ✅ View sampling status
- ❌ Cannot complete enumeration
- ❌ Cannot publish data

### ADMIN
- ✅ All enumerator permissions
- ✅ All supervisor permissions
- ✅ Publish data
- ✅ Bulk operations
- ✅ Manage surveys

---

## Validation Rules

### Structure
- Structure number must be unique within enumeration area
- Latitude: -90 to 90
- Longitude: -180 to 180

### Household Listing
- Household serial number must be unique within enumeration area
- Must be linked to valid structure
- `totalMale` and `totalFemale` must be ≥ 0
- At least one household required before completing enumeration

### Enumeration Area
- Cannot complete if already completed
- Cannot complete without at least one household
- Cannot modify data after completion (enumerator)

---

## Database Constraints

### Unique Constraints
- `(surveyId, enumerationAreaId)` - One EA per survey
- `(surveyEnumerationAreaId, structureNumber)` - Unique structure numbers
- `(surveyEnumerationAreaId, householdSerialNumber)` - Unique household serials
- `(userId, surveyId)` - One enumerator assignment per survey

### Foreign Key Constraints
- `surveyEnumerationAreaId` → `SurveyEnumerationArea.id`
- `structureId` → `SurveyEnumerationAreaStructure.id`
- `enumeratedBy`, `sampledBy`, `publishedBy` → `User.id`

---

## Migration Notes

### Recent Changes
- Renamed `isSubmitted` → `isEnumerated`
- Renamed `submittedBy` → `enumeratedBy`
- Removed `isValidated`, `validatedBy`, `validationDate`
- Added `isSampled`, `sampledBy`, `sampledDate`
- Added `isPublished`, `publishedBy`, `publishedDate`

### Structure Migration
- `structureNumber` field in household listing is temporary
- Will be removed after all households are linked to structures via `structureId`

---

## Testing

See `WORKFLOW_TEST_CHECKLIST.md` for comprehensive testing workflow.

**Key Test Scenarios**:
1. Add structure and household
2. Complete enumeration
3. Perform sampling
4. Publish data
5. Verify workflow state transitions
6. Test role-based access

---

**Last Updated**: December 2024
**Version**: 1.0

