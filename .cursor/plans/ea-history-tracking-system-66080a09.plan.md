<!-- 66080a09-5677-479c-81c6-f06b216a7926 ac976809-1dbe-42f1-b0a4-facf4bd15550 -->
# Enumeration Area History Tracking System

## Overview

Implement a system to track enumeration area (EA) history when EAs are split or merged, maintaining references for existing surveys while providing full lineage tracking.

## Architecture

### Database Changes

1. **EnumerationArea Entity Updates**

   - Add `isActive: boolean` field (default: true) to mark inactive EAs
   - Add `deactivatedAt: Date` field (nullable) to track when EA was deactivated
   - Add `deactivatedReason: string` field (nullable) for notes

2. **New EnumerationAreaLineage Entity**

   - `id: number` (PK)
   - `parentEaId: number` (FK to EnumerationArea) - the original EA(s) that were split/merged
   - `childEaId: number` (FK to EnumerationArea) - the resulting EA(s) from split/merge
   - `operationType: 'SPLIT' | 'MERGE'` - type of operation
   - `operationDate: Date` - when operation occurred
   - `reason: string` (nullable) - notes/reason for the operation
   - Indexes on parentEaId, childEaId, operationType

### Service Layer Changes

**enumeration-area.service.ts** - Add new methods:

1. `splitEnumerationArea(sourceEaId, splitData[], performedBy, reason)`

   - Mark source EA as inactive
   - Create new EAs from split data
   - Create lineage records linking source to each new EA
   - Return new EAs with lineage info

2. `mergeEnumerationAreas(sourceEaIds[], mergedEaData, performedBy, reason)`

   - Mark all source EAs as inactive
   - Create new merged EA
   - Create lineage records linking each source EA to merged EA
   - Return merged EA with lineage info

3. `getEaLineage(eaId, direction: 'ancestors' | 'descendants' | 'both')`

   - Query lineage table to get full history
   - Support recursive queries for multi-level history

4. `getEaHistory(eaId)`

   - Get complete history tree (all ancestors and descendants)
   - Include operation details, timestamps, reasons

5. `findAllActive()` - Update existing findAll to filter by isActive=true by default
6. `findAllInactive()` - Get all inactive EAs
7. `findAllWithHistory()` - Get all EAs with their lineage info

**Critical: Update all EA queries across location and survey modules to filter by isActive=true by default**

### Location Module Updates:

- `enumeration-area.service.ts`: Update findAll, findOne, findBySubAdministrativeZone, findByAdministrativeZone, findAllAsGeoJson methods
- `dzongkhag.service.ts`: Update EnumerationArea.findAll queries (lines 76, 356, 452)
- `sub-administrative-zone.service.ts`: Update any EA queries to filter by isActive
- `administrative-zone.service.ts`: Update any EA queries to filter by isActive
- `location-download.service.ts`: Update any EA queries to filter by isActive

### Survey Module Updates:

- `survey-enumeration-area.service.ts`: Update EnumerationArea queries to filter by isActive (but allow inactive EAs for historical survey references)
- `survey.service.ts`: Update EnumerationArea.findAll queries (lines 247, 378, 545, 692, 959, 1269)
- `survey-enumeration-area-household-listing.service.ts`: Update EnumerationArea queries (lines 657, 845, 1378)

### Other Module Updates:

- `enumerator-routes.service.ts`: Update EnumerationArea.findAll (line 566)
- `sampling.service.ts`: Update EnumerationArea.findAll (line 798)
- `ea-annual-stats.service.ts`: Update EnumerationArea.findAll (lines 186, 298)
- `dzongkhag-annual-stats.service.ts`: Update EnumerationArea.findAll (lines 223, 462)
- `public-api.service.ts`: Update EnumerationArea queries (lines 483, 513, 535)

**Note**: Survey references should still be able to access inactive EAs (for historical data), but all GET/list operations should default to active EAs only.

### Controller Layer Changes

**enumeration-area.controller.ts** - Add new endpoints:

1. `POST /enumeration-area/:id/split` - Split an EA into multiple EAs
2. `POST /enumeration-area/merge` - Merge multiple EAs into one
3. `GET /enumeration-area/:id/lineage` - Get EA lineage (ancestors/descendants)
4. `GET /enumeration-area/:id/history` - Get complete EA history tree
5. `GET /enumeration-area/inactive` - Get all inactive EAs
6. `GET /enumeration-area/active` - Get all active EAs (default behavior)

### DTOs

1. **SplitEnumerationAreaDto**

   - `sourceEaId: number`
   - `newEas: Array<{name, areaCode, description, geom, subAdministrativeZoneIds}>`
   - `reason?: string`

2. **MergeEnumerationAreasDto**

   - `sourceEaIds: number[]`
   - `mergedEa: {name, areaCode, description, geom, subAdministrativeZoneIds}`
   - `reason?: string`

3. **EaLineageResponseDto**

   - `ea: EnumerationArea`
   - `ancestors: EaLineageNode[]`
   - `descendants: EaLineageNode[]`
   - `operations: EaOperation[]`

4. **EaHistoryResponseDto**

   - Complete tree structure with all relationships

### Frontend Visualization Support

**API Response Structure for History Visualization:**

```typescript
{
  currentEa: EnumerationArea,
  history: {
    ancestors: [
      {
        ea: EnumerationArea,
        operation: { type, date, performedBy, reason },
        children: [...]
      }
    ],
    descendants: [
      {
        ea: EnumerationArea,
        operation: { type, date, performedBy, reason },
        parents: [...]
      }
    ]
  }
}
```

This structure allows frontend to:

- Display EA family tree
- Show split/merge operations as nodes
- Visualize complete lineage with timestamps
- Show operation reasons/notes

### Key Implementation Details

1. **Survey Compatibility**: Surveys continue referencing original EA IDs. Inactive EAs remain queryable but filtered out of default listings.

2. **Transaction Safety**: All split/merge operations wrapped in database transactions.

3. **Validation**: 

   - Prevent splitting/merging inactive EAs
   - Validate geometry overlaps for merge operations
   - Ensure new areaCodes are unique

4. **Migration**: Existing EAs default to `isActive: true`, no data loss.

## Complex EA History Scenarios

The following diagrams illustrate various complex scenarios of EA splits and merges:

### Scenario 1: Simple Split

```
EA1 (inactive) ──SPLIT──> EA2 (active)
                └─SPLIT──> EA3 (active)
```

### Scenario 2: Split Then Merge

```
EA1 (inactive) ──SPLIT──> EA2 (inactive) ──MERGE──> EA5 (active)
                └─SPLIT──> EA3 (inactive) ──MERGE──┘
                └─SPLIT──> EA4 (active)
```

### Scenario 3: Multiple Splits Over Time

```
EA1 (inactive) ──SPLIT──> EA2 (inactive) ──SPLIT──> EA5 (active)
                │         └─SPLIT──> EA6 (active)
                └─SPLIT──> EA3 (inactive) ──SPLIT──> EA7 (active)
                │         └─SPLIT──> EA8 (active)
                └─SPLIT──> EA4 (active)
```

### Scenario 4: Merge Then Split

```
EA1 (inactive) ──MERGE──> EA5 (inactive) ──SPLIT──> EA6 (active)
EA2 (inactive) ──MERGE──┘                └─SPLIT──> EA7 (active)
EA3 (inactive) ──MERGE──┘
EA4 (inactive) ──MERGE──┘
```

### Scenario 5: Complex Multi-Level Operations

```
EA1 (inactive) ──SPLIT──> EA2 (inactive) ──MERGE──> EA6 (inactive) ──SPLIT──> EA8 (active)
                │         └─SPLIT──> EA3 (inactive) ──MERGE──┘                └─SPLIT──> EA9 (active)
                │         └─SPLIT──> EA4 (active)     └─MERGE──> EA7 (active)
                └─SPLIT──> EA5 (active)
```

The history tree API will return all these relationships, allowing frontend to visualize:

- Complete ancestor chain (all parents up to root)
- Complete descendant tree (all children and their children)
- Operation types and dates at each level
- Reasons for each operation

## Files to Modify/Create

### New Files

- `src/modules/location/enumeration-area/entities/enumeration-area-lineage.entity.ts`
- `src/modules/location/enumeration-area/dto/split-enumeration-area.dto.ts`
- `src/modules/location/enumeration-area/dto/merge-enumeration-areas.dto.ts`
- `src/modules/location/enumeration-area/dto/ea-lineage-response.dto.ts`
- `src/modules/location/enumeration-area/dto/ea-history-response.dto.ts`

### Modified Files

- `src/modules/location/enumeration-area/entities/enumeration-area.entity.ts` - Add isActive, deactivatedAt, deactivatedReason
- `src/modules/location/enumeration-area/enumeration-area.service.ts` - Add split/merge/history methods
- `src/modules/location/enumeration-area/enumeration-area.controller.ts` - Add split/merge/history endpoints
- `src/modules/location/enumeration-area/enumeration-area.module.ts` - Register new lineage entity

## Testing Considerations

- Test split operation creates correct lineage
- Test merge operation creates correct lineage  
- Test multi-level history (EA split, then one of those split again)
- Test survey references to inactive EAs still work
- Test history queries return correct tree structure

### To-dos

- [ ] Create EnumerationAreaLineage entity with parentEaId, childEaId, operationType, operationDate, performedBy, reason fields
- [ ] Update EnumerationArea entity to add isActive, deactivatedAt, deactivatedReason fields
- [ ] Create DTOs: SplitEnumerationAreaDto, MergeEnumerationAreasDto, EaLineageResponseDto, EaHistoryResponseDto
- [ ] Implement splitEnumerationArea service method with transaction, lineage tracking, and inactive marking
- [ ] Implement mergeEnumerationAreas service method with transaction, lineage tracking, and inactive marking
- [ ] Implement getEaLineage and getEaHistory service methods for querying EA history
- [ ] Update findAll methods to filter by isActive by default, add findAllInactive and findAllWithHistory methods
- [ ] Add controller endpoints: POST /split, POST /merge, GET /lineage, GET /history, GET /inactive, GET /active
- [ ] Register EnumerationAreaLineage entity in enumeration-area.module.ts