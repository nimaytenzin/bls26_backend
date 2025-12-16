# Location API Changes - Documentation Index

## Overview

This documentation covers all changes made to the Location API modules to support the new many-to-many relationship between Enumeration Areas and Sub-Administrative Zones via a junction table.

## Documentation Files

### 1. [Enumeration Area API Changes](./location-api-changes-enumeration-area.md)
**Key Changes:**
- `subAdministrativeZoneId` (singular) → `subAdministrativeZoneIds` (array)
- All create/update endpoints now require array of SAZ IDs
- Response includes `subAdministrativeZones` array

**Routes Covered:**
- `POST /enumeration-area` - Create EA
- `POST /enumeration-area/geojson` - Create from GeoJSON
- `POST /enumeration-area/bulk-upload-geojson` - Bulk upload
- `PATCH /enumeration-area/:id` - Update EA
- `GET /enumeration-area/:id` - Get EA
- `GET /enumeration-area` - List EAs

### 2. [Sub-Administrative Zone API Changes](./location-api-changes-sub-administrative-zone.md)
**Key Changes:**
- `enumerationAreas` relationship now via junction table
- New route: `POST /sub-administrative-zone/upload-saz-ea` - Upload SAZ with EA
- `includeEnumerationAreas` query parameter for loading EAs

**Routes Covered:**
- `GET /sub-administrative-zone/:id` - Get SAZ
- `GET /sub-administrative-zone` - List SAZs
- `POST /sub-administrative-zone/upload-saz-ea` - Upload SAZ with EA
- `GET /sub-administrative-zone/by-dzongkhag/:dzongkhagId` - Get by Dzongkhag

### 3. [Dzongkhag API Changes](./location-api-changes-dzongkhag.md)
**Key Changes:**
- `GET /dzongkhag/:id/enumeration-areas` now properly includes EAs in hierarchy
- All SAZs in hierarchy include `enumerationAreas` array (empty if none)
- Fixed attribute name truncation issues

**Routes Covered:**
- `GET /dzongkhag/:id/enumeration-areas` - Get EAs by Dzongkhag
- `GET /dzongkhag/:id/enumeration-areas/geojson` - Get EAs as GeoJSON
- `GET /dzongkhag/:id` - Get Dzongkhag with optional EAs

### 4. [Migration Guide](./location-api-migration-guide.md)
**Comprehensive guide for migrating frontend code:**
- Step-by-step migration instructions
- Code examples (Before/After)
- Angular service and component examples
- Common pitfalls and solutions
- Testing checklist

## Quick Reference

### Breaking Changes Summary

| Component | Old | New |
|-----------|-----|-----|
| **Create EA DTO** | `subAdministrativeZoneId: number` | `subAdministrativeZoneIds: number[]` |
| **EA Response** | `subAdministrativeZone: SAZ` | `subAdministrativeZones: SAZ[]` |
| **Relationship** | One-to-Many | Many-to-Many |
| **Database** | Direct FK | Junction Table |

### Common Migration Patterns

#### 1. Creating Enumeration Area
```typescript
// OLD
{ subAdministrativeZoneId: 5 }

// NEW
{ subAdministrativeZoneIds: [5] }  // Array, even for single SAZ
```

#### 2. Reading Enumeration Area
```typescript
// OLD
const saz = ea.subAdministrativeZone;

// NEW
const sazs = ea.subAdministrativeZones;  // Array
const firstSaz = ea.subAdministrativeZones?.[0];
```

#### 3. Hierarchy Response
```typescript
// NEW - EAs always included in hierarchy
dzongkhag.administrativeZones.forEach(az => {
  az.subAdministrativeZones.forEach(saz => {
    const eas = saz.enumerationAreas;  // Array, may be empty
  });
});
```

## Database Schema

### Junction Table
**Table:** `EnumerationAreaSubAdministrativeZones`
- `enumerationAreaId` (FK, Primary Key)
- `subAdministrativeZoneId` (FK, Primary Key)

### Migration Required
```sql
-- Make old column nullable or drop it
ALTER TABLE "EnumerationAreas" 
ALTER COLUMN "subAdministrativeZoneId" DROP NOT NULL;

-- Or drop entirely
ALTER TABLE "EnumerationAreas" 
DROP COLUMN "subAdministrativeZoneId";
```

## API Endpoints Summary

### Enumeration Area Endpoints
- `POST /enumeration-area` - Create (requires `subAdministrativeZoneIds` array)
- `GET /enumeration-area/:id` - Get (optional `includeSubAdminZone` param)
- `PATCH /enumeration-area/:id` - Update (can update `subAdministrativeZoneIds`)
- `POST /enumeration-area/geojson` - Create from GeoJSON
- `POST /enumeration-area/bulk-upload-geojson` - Bulk upload

### Sub-Administrative Zone Endpoints
- `GET /sub-administrative-zone/:id` - Get (optional `includeEnumerationAreas` param)
- `POST /sub-administrative-zone/upload-saz-ea` - Upload SAZ with EA (new)

### Dzongkhag Endpoints
- `GET /dzongkhag/:id/enumeration-areas` - Get EAs with hierarchy (now includes EAs)
- `GET /dzongkhag/:id` - Get Dzongkhag (optional `includeEAs` param)

## Testing

Before deploying, ensure:
1. ✅ All DTOs updated to use arrays
2. ✅ All service calls send arrays
3. ✅ All response handling works with arrays
4. ✅ Database migration completed
5. ✅ Forms support multi-select
6. ✅ UI displays multiple SAZs correctly

## Support

For detailed information, refer to the individual documentation files:
- [Enumeration Area Changes](./location-api-changes-enumeration-area.md)
- [Sub-Administrative Zone Changes](./location-api-changes-sub-administrative-zone.md)
- [Dzongkhag Changes](./location-api-changes-dzongkhag.md)
- [Migration Guide](./location-api-migration-guide.md)

