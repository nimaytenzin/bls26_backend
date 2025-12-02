# Survey Entity - Changes Documentation

## Overview

The Survey entity represents a survey campaign. This document outlines all changes made to the Survey entity and related components.

---

## Entity Changes

### Current State

**File**: `src/modules/survey/survey/entities/survey.entity.ts`

**Fields**:
- `id`: number (Primary Key)
- `name`: string
- `description`: text
- `startDate`: Date (DATEONLY)
- `endDate`: Date (DATEONLY)
- `year`: number
- `status`: SurveyStatus enum (ACTIVE | ENDED)
- `isFullyValidated`: boolean (default: false)
- `createdAt`: Date (auto)
- `updatedAt`: Date (auto)

**Relationships**:
- `enumerationAreas`: BelongsToMany (via SurveyEnumerationArea)
- `surveyEnumerationAreas`: HasMany

---

## Changes Made

### 1. Field Naming (Future Consideration)

**Status**: ⚠️ **Pending Migration**

**Change**: The field `isFullyValidated` should be renamed to `isFullyPublished` to align with the new workflow terminology.

**Current**:
```typescript
isFullyValidated: boolean;
```

**Proposed**:
```typescript
isFullyPublished: boolean;
```

**Reason**: 
- Aligns with new workflow: Enumeration → Sampling → Publishing
- "Validation" step has been removed from workflow
- Publishing is the final step that makes data available for statistics

**Migration Required**: Yes (database column rename)

**Impact**: 
- DTOs updated to use `isFullyPublished` in response
- Service layer has TODO comment for future migration
- Entity still uses `isFullyValidated` for backward compatibility

---

## DTO Changes

### SurveyStatisticsResponseDto

**File**: `src/modules/survey/survey/dto/survey-statistics-response.dto.ts`

**Changes**:
- ✅ Updated field names to match new workflow:
  - `submittedEnumerationAreas` → `enumeratedEnumerationAreas`
  - `validatedEnumerationAreas` → `sampledEnumerationAreas`
  - Added: `publishedEnumerationAreas`
  - `submissionPercentage` → `enumerationPercentage`
  - `validationPercentage` → `samplingPercentage`
  - Added: `publishingPercentage`
  - `isFullyValidated` → `isFullyPublished` (in response, entity still uses old name)

**Before**:
```typescript
submittedEnumerationAreas: number;
validatedEnumerationAreas: number;
submissionPercentage: string;
validationPercentage: string;
isFullyValidated: boolean;
```

**After**:
```typescript
enumeratedEnumerationAreas: number;
sampledEnumerationAreas: number;
publishedEnumerationAreas: number;
enumerationPercentage: string;
samplingPercentage: string;
publishingPercentage: string;
isFullyPublished: boolean;
```

---

## Service Changes

### SurveyService

**File**: `src/modules/survey/survey/survey.service.ts`

**Changes**:

1. **Statistics Calculation** (Line ~508)
   - Updated to use new workflow fields
   - Changed from `isSubmitted`/`isValidated` to `isEnumerated`/`isSampled`/`isPublished`

2. **getSurveyStatistics()** Method
   - Updated return object to use new field names
   - Added `samplingPercentage` and `publishingPercentage`
   - Changed `isFullyValidated` to `isFullyPublished` in response (with TODO note)

3. **getSurveyEnumerationHierarchy()** Method (Line ~638)
   - Updated attributes query to fetch new workflow fields
   - Removed old fields: `isSubmitted`, `submittedBy`, `submissionDate`, `isValidated`, `validatedBy`, `validationDate`
   - Added new fields: `isEnumerated`, `enumeratedBy`, `enumerationDate`, `isSampled`, `sampledBy`, `sampledDate`, `isPublished`, `publishedBy`, `publishedDate`

**Before**:
```typescript
attributes: ['id', 'enumerationAreaId', 'isSubmitted', 'isValidated']
const submittedEAs = surveyEAs.filter((ea) => ea.isSubmitted).length;
const validatedEAs = surveyEAs.filter((ea) => ea.isValidated).length;
```

**After**:
```typescript
attributes: [
  'id', 'enumerationAreaId',
  'isEnumerated', 'enumeratedBy', 'enumerationDate',
  'isSampled', 'sampledBy', 'sampledDate',
  'isPublished', 'publishedBy', 'publishedDate'
]
const enumeratedEAs = surveyEAs.filter((ea) => ea.isEnumerated).length;
const sampledEAs = surveyEAs.filter((ea) => ea.isSampled).length;
const publishedEAs = surveyEAs.filter((ea) => ea.isPublished).length;
```

---

## Database Changes

### No Direct Schema Changes

The Survey table itself has no schema changes. However:

1. **Related Table Changes**: The `SurveyEnumerationAreas` table (junction table) has significant changes that affect how surveys track completion status.

2. **Computed Fields**: The `isFullyValidated` field is computed based on related `SurveyEnumerationArea` records, which now use the new workflow.

---

## API Changes

### Endpoints

No new endpoints added. Existing endpoints updated:

- `GET /survey/:id/statistics` - Response structure updated
- `GET /survey/:id/enumeration-hierarchy` - Response structure updated

### Response Changes

**Before**:
```json
{
  "submittedEnumerationAreas": 10,
  "validatedEnumerationAreas": 8,
  "submissionPercentage": "50.00",
  "validationPercentage": "80.00"
}
```

**After**:
```json
{
  "enumeratedEnumerationAreas": 10,
  "sampledEnumerationAreas": 8,
  "publishedEnumerationAreas": 5,
  "enumerationPercentage": "50.00",
  "samplingPercentage": "80.00",
  "publishingPercentage": "62.50"
}
```

---

## Migration Notes

### Future Migration Required

1. **Rename `isFullyValidated` to `isFullyPublished`**
   ```sql
   ALTER TABLE "Surveys" 
   RENAME COLUMN "isFullyValidated" TO "isFullyPublished";
   ```

2. **Update Logic**
   - Update computation logic to check `isPublished = true` instead of `isValidated = true`
   - Update all references in codebase

---

## Testing Checklist

- [ ] Verify statistics calculation uses new workflow fields
- [ ] Verify enumeration hierarchy response includes new fields
- [ ] Verify `isFullyPublished` is computed correctly (when entity field is renamed)
- [ ] Test statistics endpoint returns correct percentages
- [ ] Verify backward compatibility during transition period

---

## Breaking Changes

### None (Yet)

Currently, the entity maintains backward compatibility by keeping `isFullyValidated`. However:

⚠️ **Future Breaking Change**: When `isFullyValidated` is renamed to `isFullyPublished`, this will be a breaking change requiring:
- Database migration
- Code updates
- API versioning consideration

---

## Related Changes

- **SurveyEnumerationArea**: Major workflow changes (see `survey-enumeration-area/CHANGES.md`)
- **DTOs**: Updated to reflect new workflow terminology
- **Services**: Updated to use new field names

---

**Last Updated**: December 2024  
**Version**: 1.0  
**Status**: Active (with pending migration)


