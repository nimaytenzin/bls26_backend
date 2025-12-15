# Enumeration Area - Sub-Administrative Zone Many-to-Many Implementation

## Overview

This document describes the implementation of a many-to-many relationship between Enumeration Areas (EA) and Sub-Administrative Zones (SAZ), allowing multiple SAZs to be grouped together to form a single EA.

## Architecture

### Design Decision: Backward Compatible Approach

Instead of completely removing the existing `subAdministrativeZoneId` foreign key, we maintain it as the **primary SAZ** and add a junction table for **additional SAZs**. This approach:

- ✅ Maintains backward compatibility with existing code
- ✅ No breaking API changes
- ✅ Allows gradual migration
- ✅ Existing queries continue to work

### Data Model

```
EnumerationArea
├── subAdministrativeZoneId (FK) - PRIMARY SAZ (required)
└── additionalSubAdministrativeZones (via junction table) - ADDITIONAL SAZs (optional)

EnumerationAreaSubAdministrativeZones (Junction Table)
├── enumerationAreaId (FK, PK)
└── subAdministrativeZoneId (FK, PK)
```

### Key Concepts

1. **Primary SAZ**: The main SAZ stored in `EnumerationArea.subAdministrativeZoneId`
   - Required field
   - Maintains existing one-to-one relationship
   - Used for backward compatibility

2. **Additional SAZs**: Additional SAZs stored in junction table
   - Optional
   - Stored in `EnumerationAreaSubAdministrativeZones` table
   - Accessed via `additionalSubAdministrativeZones` relationship

3. **All SAZs**: Combined list of primary + additional SAZs
   - Use `getAllSubAdministrativeZones()` helper method
   - Use `getAllSubAdministrativeZoneIds()` for IDs only

## API Changes

### New Endpoints

#### Get All SAZs for an EA
```
GET /enumeration-area/:id/sub-administrative-zones
```
Returns both primary and additional SAZs.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Primary SAZ",
    "areaCode": "SAZ001",
    "type": "chiwog",
    "administrativeZoneId": 1,
    "areaSqKm": 5.2
  },
  {
    "id": 2,
    "name": "Additional SAZ 1",
    "areaCode": "SAZ002",
    "type": "chiwog",
    "administrativeZoneId": 1,
    "areaSqKm": 3.1
  }
]
```

#### Add Additional SAZs to EA
```
POST /enumeration-area/:id/sub-administrative-zones
Authorization: Bearer <token>
Role: ADMIN

Body:
{
  "subAdministrativeZoneIds": [2, 3, 4]
}
```

**Response:**
```json
{
  "message": "Sub-administrative zones added successfully",
  "enumerationAreaId": 1,
  "addedSAZs": [2, 3, 4]
}
```

#### Remove Additional SAZs from EA
```
DELETE /enumeration-area/:id/sub-administrative-zones
Authorization: Bearer <token>
Role: ADMIN

Body:
{
  "subAdministrativeZoneIds": [2, 3]
}
```

**Response:** 204 No Content

### Updated Endpoints

#### Create Enumeration Area
```
POST /enumeration-area
Authorization: Bearer <token>
Role: ADMIN
```

**Request Body (Updated):**
```json
{
  "subAdministrativeZoneId": 1,  // Required: Primary SAZ
  "additionalSubAdministrativeZoneIds": [2, 3],  // Optional: Additional SAZs
  "name": "EA Name",
  "description": "EA Description",
  "areaCode": "EA001",
  "areaSqKm": 10.5,
  "geom": "..."
}
```

**Note:** The primary SAZ should NOT be included in `additionalSubAdministrativeZoneIds`.

**Response:**
```json
{
  "id": 1,
  "subAdministrativeZoneId": 1,
  "name": "EA Name",
  "description": "EA Description",
  "areaCode": "EA001",
  "areaSqKm": 10.5,
  "subAdministrativeZone": {
    "id": 1,
    "name": "Primary SAZ",
    ...
  },
  "additionalSubAdministrativeZones": [
    {
      "id": 2,
      "name": "Additional SAZ 1",
      ...
    },
    {
      "id": 3,
      "name": "Additional SAZ 2",
      ...
    }
  ]
}
```

#### Update Enumeration Area
```
PATCH /enumeration-area/:id
Authorization: Bearer <token>
Role: ADMIN
```

**Request Body (Updated):**
```json
{
  "name": "Updated Name",
  "additionalSubAdministrativeZoneIds": [2, 3, 4]  // Optional: Replace all additional SAZs
}
```

**Note:** Providing `additionalSubAdministrativeZoneIds` will replace all existing additional SAZs. To keep existing ones, include them in the array.

#### Get Enumeration Area
```
GET /enumeration-area/:id?includeAdditionalSAZs=true
```

**New Query Parameters:**
- `includeAdditionalSAZs` (boolean): Include additional SAZs in response
- `withGeom` (boolean): Include geometry (default: false)
- `includeSubAdminZone` (boolean): Include primary sub-administrative zone (default: false)

**Response (with includeAdditionalSAZs=true):**
```json
{
  "id": 1,
  "subAdministrativeZoneId": 1,
  "name": "EA Name",
  "description": "EA Description",
  "areaCode": "EA001",
  "areaSqKm": 10.5,
  "subAdministrativeZone": {
    "id": 1,
    "name": "Primary SAZ",
    "areaCode": "SAZ001",
    "type": "chiwog",
    ...
  },
  "additionalSubAdministrativeZones": [
    {
      "id": 2,
      "name": "Additional SAZ 1",
      "areaCode": "SAZ002",
      "type": "chiwog",
      ...
    },
    {
      "id": 3,
      "name": "Additional SAZ 2",
      "areaCode": "SAZ003",
      "type": "lap",
      ...
    }
  ]
}
```

#### Get All Enumeration Areas
```
GET /enumeration-area?subAdministrativeZoneId=1
```

**Behavior:** Now returns EAs where the SAZ is either primary OR additional.

**Response:** Array of Enumeration Areas

## Service Methods

### New Methods

#### `getSubAdministrativeZonesForEA(enumerationAreaId: number): Promise<SubAdministrativeZone[]>`
Returns all SAZs (primary + additional) for an EA.

**Parameters:**
- `enumerationAreaId` (number): The EA ID

**Returns:** Array of SubAdministrativeZone objects

**Example:**
```typescript
const allSAZs = await enumerationAreaService.getSubAdministrativeZonesForEA(1);
```

#### `addSubAdministrativeZones(enumerationAreaId: number, subAdministrativeZoneIds: number[]): Promise<void>`
Adds additional SAZs to an EA.

**Parameters:**
- `enumerationAreaId` (number): The EA ID
- `subAdministrativeZoneIds` (number[]): Array of SAZ IDs to add

**Throws:**
- `NotFoundException`: If EA not found
- `BadRequestException`: If primary SAZ is in the list

**Example:**
```typescript
await enumerationAreaService.addSubAdministrativeZones(1, [2, 3, 4]);
```

#### `removeSubAdministrativeZones(enumerationAreaId: number, subAdministrativeZoneIds: number[]): Promise<void>`
Removes additional SAZs from an EA.

**Parameters:**
- `enumerationAreaId` (number): The EA ID
- `subAdministrativeZoneIds` (number[]): Array of SAZ IDs to remove

**Example:**
```typescript
await enumerationAreaService.removeSubAdministrativeZones(1, [2, 3]);
```

### Updated Methods

#### `findOne(id, withGeom, includeSubAdminZone, includeAdditionalSAZs)`
New parameter: `includeAdditionalSAZs` - includes additional SAZs in response.

**Parameters:**
- `id` (number): EA ID
- `withGeom` (boolean, default: false): Include geometry
- `includeSubAdminZone` (boolean, default: false): Include primary SAZ
- `includeAdditionalSAZs` (boolean, default: false): Include additional SAZs

**Returns:** EnumerationArea with optional associations

**Example:**
```typescript
const ea = await enumerationAreaService.findOne(1, false, true, true);
```

#### `findBySubAdministrativeZone(subAdministrativeZoneId, withGeom, includeSubAdminZone)`
Now returns EAs where the SAZ is either primary OR additional.

**Parameters:**
- `subAdministrativeZoneId` (number): SAZ ID
- `withGeom` (boolean, default: false): Include geometry
- `includeSubAdminZone` (boolean, default: false): Include SAZ in response

**Returns:** Array of EnumerationAreas

**Example:**
```typescript
// Returns EAs where SAZ 1 is either primary or additional
const eas = await enumerationAreaService.findBySubAdministrativeZone(1);
```

#### `create(createEnumerationAreaDto)`
Now accepts `additionalSubAdministrativeZoneIds` array.

**Parameters:**
- `createEnumerationAreaDto` (CreateEnumerationAreaDto): DTO with optional `additionalSubAdministrativeZoneIds`

**Returns:** Created EnumerationArea with associations

**Example:**
```typescript
const ea = await enumerationAreaService.create({
  subAdministrativeZoneId: 1,
  additionalSubAdministrativeZoneIds: [2, 3],
  name: "EA Name",
  description: "Description",
  areaCode: "EA001",
  areaSqKm: 10.5,
  geom: "..."
});
```

#### `update(id, updateEnumerationAreaDto)`
Now accepts `additionalSubAdministrativeZoneIds` array to replace all additional SAZs.

**Parameters:**
- `id` (number): EA ID
- `updateEnumerationAreaDto` (UpdateEnumerationAreaDto): DTO with optional `additionalSubAdministrativeZoneIds`

**Returns:** Updated EnumerationArea with associations

**Example:**
```typescript
const ea = await enumerationAreaService.update(1, {
  name: "Updated Name",
  additionalSubAdministrativeZoneIds: [2, 3, 4]  // Replaces all existing additional SAZs
});
```

## Entity Helper Methods

### `getAllSubAdministrativeZones(): Promise<SubAdministrativeZone[]>`
Returns all SAZs (primary + additional) for the EA.

**Usage:**
```typescript
const ea = await enumerationAreaService.findOne(1, false, true, true);
const allSAZs = await ea.getAllSubAdministrativeZones();
// Returns: [primarySAZ, ...additionalSAZs]
```

### `getAllSubAdministrativeZoneIds(): number[]`
Returns all SAZ IDs (primary + additional) for the EA.

**Usage:**
```typescript
const ea = await enumerationAreaService.findOne(1, false, true, true);
const allSAZIds = ea.getAllSubAdministrativeZoneIds();
// Returns: [1, 2, 3] (primary + additional IDs)
```

## Database Schema

### Junction Table: `EnumerationAreaSubAdministrativeZones`

```sql
CREATE TABLE "EnumerationAreaSubAdministrativeZones" (
  "enumerationAreaId" INTEGER NOT NULL,
  "subAdministrativeZoneId" INTEGER NOT NULL,
  PRIMARY KEY ("enumerationAreaId", "subAdministrativeZoneId"),
  FOREIGN KEY ("enumerationAreaId") REFERENCES "EnumerationAreas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY ("subAdministrativeZoneId") REFERENCES "SubAdministrativeZones"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "unique_ea_saz" ON "EnumerationAreaSubAdministrativeZones" ("enumerationAreaId", "subAdministrativeZoneId");
CREATE INDEX "idx_enumeration_area" ON "EnumerationAreaSubAdministrativeZones" ("enumerationAreaId");
CREATE INDEX "idx_sub_administrative_zone" ON "EnumerationAreaSubAdministrativeZones" ("subAdministrativeZoneId");
```

### Existing Table: `EnumerationAreas`

No changes to the existing table structure. The `subAdministrativeZoneId` column remains as the primary SAZ.

## Migration Guide

### Step 1: Run Database Migration
```bash
npm run migration:run
```

This creates the `EnumerationAreaSubAdministrativeZones` junction table.

### Step 2: Update Code
1. ✅ Create junction table entity
2. ✅ Update EnumerationArea entity
3. ✅ Update SubAdministrativeZone entity
4. ✅ Update DTOs
5. ✅ Update service methods
6. ✅ Update controller endpoints
7. ✅ Update module providers

### Step 3: Test
- ✅ Test creating EA with additional SAZs
- ✅ Test updating EA with additional SAZs
- ✅ Test querying EAs by SAZ (should return EAs where SAZ is primary OR additional)
- ✅ Test helper methods
- ✅ Test backward compatibility (existing EAs work as before)

### Step 4: Gradual Migration
- ✅ Existing EAs continue to work with just primary SAZ
- ✅ New EAs can use additional SAZs
- ✅ Existing queries continue to work
- ✅ No breaking changes to existing APIs

## Query Examples

### Find EAs by SAZ (Primary or Additional)
```typescript
// Returns EAs where SAZ 1 is either primary or additional
const eas = await enumerationAreaService.findBySubAdministrativeZone(1);
```

### Get All SAZs for an EA
```typescript
// Method 1: Using service method
const allSAZs = await enumerationAreaService.getSubAdministrativeZonesForEA(1);

// Method 2: Using entity helper method
const ea = await enumerationAreaService.findOne(1, false, true, true);
const allSAZs = await ea.getAllSubAdministrativeZones();
```

### Check if EA Contains SAZ
```typescript
const ea = await enumerationAreaService.findOne(1, false, true, true);
const allSAZIds = ea.getAllSubAdministrativeZoneIds();
const containsSAZ = allSAZIds.includes(sazId);
```

### Get EAs with All SAZs Included
```typescript
const eas = await enumerationAreaService.findAll(false, true);
// Then for each EA, load additional SAZs if needed
for (const ea of eas) {
  await ea.reload({
    include: [
      { model: SubAdministrativeZone, as: 'subAdministrativeZone' },
      { model: SubAdministrativeZone, as: 'additionalSubAdministrativeZones' }
    ]
  });
}
```

### Count EAs by SAZ (Including Additional)
```typescript
// Get count of EAs where SAZ is primary
const primaryCount = await EnumerationArea.count({
  where: { subAdministrativeZoneId: sazId }
});

// Get count of EAs where SAZ is additional
const additionalCount = await EnumerationAreaSubAdministrativeZone.count({
  where: { subAdministrativeZoneId: sazId }
});

const totalCount = primaryCount + additionalCount;
```

## Validation Rules

1. **Primary SAZ cannot be in additional list**: When creating/updating EA, the primary SAZ must not be included in `additionalSubAdministrativeZoneIds`.
   - **Error**: `Primary SAZ cannot be included in additional SAZs list`
   - **Error**: `Cannot add primary SAZ as additional SAZ`

2. **No duplicate SAZs**: The system automatically removes duplicates in the `additionalSubAdministrativeZoneIds` array.

3. **Cascade delete**: When an EA is deleted, all junction table records are automatically deleted (CASCADE).

4. **Cascade delete**: When a SAZ is deleted, all junction table records referencing it are automatically deleted (CASCADE).

5. **Unique constraint**: The combination of `enumerationAreaId` and `subAdministrativeZoneId` must be unique in the junction table.

## Performance Considerations

1. **Indexes**: The junction table has indexes on both foreign keys for fast lookups:
   - `idx_enumeration_area` on `enumerationAreaId`
   - `idx_sub_administrative_zone` on `subAdministrativeZoneId`
   - `unique_ea_saz` unique index on both columns

2. **Eager Loading**: Use `includeAdditionalSAZs=true` parameter to avoid N+1 queries when fetching multiple EAs.

3. **Query Optimization**: `findBySubAdministrativeZone` performs two queries (primary + additional) and combines results. For better performance with large datasets, consider:
   - Adding a database view
   - Using a materialized view
   - Implementing a single SQL query with UNION

4. **Bulk Operations**: When adding multiple SAZs, use `addSubAdministrativeZones` which uses `bulkCreate` for efficiency.

## Backward Compatibility

✅ **All existing code continues to work:**
- `ea.subAdministrativeZoneId` - still works
- `ea.subAdministrativeZone` - still works
- Existing queries - still work
- Existing APIs - still work (with optional new fields)

✅ **No breaking changes:**
- All existing endpoints work as before
- New functionality is additive
- Old data structure is preserved
- Existing migrations are not affected

✅ **Gradual adoption:**
- Existing EAs work with just primary SAZ
- New EAs can optionally use additional SAZs
- Teams can migrate at their own pace

## Impact on Other Modules

### Annual Statistics

The annual statistics modules may need updates to handle EAs with multiple SAZs:

1. **EA Annual Stats**: No changes needed (stats are per EA)

2. **SAZ Annual Stats**: May need to aggregate from EAs where SAZ is either primary or additional

3. **Dzongkhag Annual Stats**: May need to account for EAs spanning multiple SAZs

**Example Update Needed:**
```typescript
// In saz-annual-stats.service.ts
// When aggregating from EAs, need to include:
// 1. EAs where SAZ is primary (ea.subAdministrativeZoneId = sazId)
// 2. EAs where SAZ is additional (via junction table)
```

### Survey Module

The survey module should continue to work as EAs are still the primary unit. However, when displaying hierarchical structures, may need to show all SAZs for an EA.

### Enumerator Routes

The enumerator routes module may need updates to handle EAs with multiple SAZs when building hierarchical structures.

## Future Considerations

1. **Deprecation Path**: Consider deprecating `subAdministrativeZoneId` in the future and making all SAZs equal (no primary/additional distinction). This would require:
   - Migration script to move primary SAZ to junction table
   - Update all queries
   - Remove `subAdministrativeZoneId` column

2. **Statistics Aggregation**: Update annual statistics services to handle EAs with multiple SAZs correctly, especially for SAZ-level aggregations.

3. **Geographic Validation**: Add validation to ensure EA geometry encompasses all associated SAZ geometries.

4. **UI Updates**: Update frontend to display all SAZs for an EA and allow managing additional SAZs.

5. **API Versioning**: Consider API versioning if making breaking changes in the future.

## Troubleshooting

### Issue: Primary SAZ in additional list
**Error**: `Primary SAZ cannot be included in additional SAZs list`  
**Solution**: Remove the primary SAZ ID from `additionalSubAdministrativeZoneIds` array.

### Issue: Cannot add primary SAZ as additional
**Error**: `Cannot add primary SAZ as additional SAZ`  
**Solution**: The primary SAZ is already associated with the EA via `subAdministrativeZoneId`. Don't add it to additional SAZs.

### Issue: Duplicate SAZ associations
**Solution**: The system automatically handles duplicates, but ensure your input doesn't have duplicates for clarity.

### Issue: Performance with many additional SAZs
**Solution**: 
- Use proper indexing (already in place)
- Consider pagination for large datasets
- Use eager loading to avoid N+1 queries
- Consider caching for frequently accessed data

### Issue: EA not found when adding SAZs
**Error**: `Enumeration area with ID X not found`  
**Solution**: Ensure the EA exists before adding SAZs.

### Issue: SAZ not found
**Error**: Foreign key constraint violation  
**Solution**: Ensure all SAZ IDs in `additionalSubAdministrativeZoneIds` exist in the database.

## Related Files

### Entities
- `src/modules/location/enumeration-area/entities/enumeration-area-sub-administrative-zone.entity.ts` (NEW)
- `src/modules/location/enumeration-area/entities/enumeration-area.entity.ts` (UPDATED)
- `src/modules/location/sub-administrative-zone/entities/sub-administrative-zone.entity.ts` (UPDATED)

### Services
- `src/modules/location/enumeration-area/enumeration-area.service.ts` (UPDATED)

### Controllers
- `src/modules/location/enumeration-area/enumeration-area.controller.ts` (UPDATED)

### DTOs
- `src/modules/location/enumeration-area/dto/create-enumeration-area.dto.ts` (UPDATED)
- `src/modules/location/enumeration-area/dto/create-enumeration-area-geojson.dto.ts` (UPDATED)
- `src/modules/location/enumeration-area/dto/update-enumeration-area.dto.ts` (UPDATED via PartialType)

### Modules
- `src/modules/location/enumeration-area/enumeration-area.module.ts` (UPDATED)

### Migrations
- `migrations/XXXXXX-create-enumeration-area-sub-administrative-zone-table.ts` (NEW)

## Testing Checklist

- [ ] Create EA with only primary SAZ (backward compatibility)
- [ ] Create EA with primary SAZ + additional SAZs
- [ ] Update EA to add additional SAZs
- [ ] Update EA to remove additional SAZs
- [ ] Update EA to replace all additional SAZs
- [ ] Get EA with additional SAZs included
- [ ] Get all SAZs for an EA
- [ ] Find EAs by SAZ (primary)
- [ ] Find EAs by SAZ (additional)
- [ ] Find EAs by SAZ (returns both primary and additional)
- [ ] Delete EA (cascade delete junction records)
- [ ] Validation: Primary SAZ in additional list (should fail)
- [ ] Validation: Duplicate SAZs (should be handled)
- [ ] Helper methods: `getAllSubAdministrativeZones()`
- [ ] Helper methods: `getAllSubAdministrativeZoneIds()`
- [ ] API endpoints: GET `/enumeration-area/:id/sub-administrative-zones`
- [ ] API endpoints: POST `/enumeration-area/:id/sub-administrative-zones`
- [ ] API endpoints: DELETE `/enumeration-area/:id/sub-administrative-zones`
- [ ] Performance: Query with many additional SAZs
- [ ] Performance: Eager loading additional SAZs

## Changelog

### Version 1.0.0 (Initial Implementation)
- Added junction table `EnumerationAreaSubAdministrativeZones`
- Added support for additional SAZs beyond primary SAZ
- Added new service methods for managing additional SAZs
- Added new API endpoints for managing additional SAZs
- Updated DTOs to support `additionalSubAdministrativeZoneIds`
- Maintained full backward compatibility

## Support

For questions or issues related to this implementation, please contact the development team or create an issue in the project repository.

