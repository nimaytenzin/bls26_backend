# Enumeration Area API Changes Documentation

## Overview

The Enumeration Area API has been updated to support a **many-to-many relationship** with Sub-Administrative Zones via a junction table. This allows multiple Sub-Administrative Zones to be combined into a single Enumeration Area.

## Breaking Changes

### ⚠️ DTO Changes

#### Before (Old Format)
```typescript
{
  name: string;
  description: string;
  areaCode: string;
  subAdministrativeZoneId: number;  // ❌ SINGULAR - REMOVED
  areaSqKm?: number;
  geom: string;
}
```

#### After (New Format)
```typescript
{
  name: string;
  description: string;
  areaCode: string;
  subAdministrativeZoneIds: number[];  // ✅ ARRAY - REQUIRED (min 1)
  areaSqKm?: number | null;
  geom: string;
}
```

### Key Changes

1. **`subAdministrativeZoneId` (singular)** → **`subAdministrativeZoneIds` (array)**
   - Old field has been **completely removed**
   - New field is **required** and must contain **at least 1 SAZ ID**
   - Allows linking one EA to multiple SAZs

2. **`areaSqKm`** can now be `null` (previously only optional)

## Updated Routes

### 1. Create Enumeration Area

**Endpoint:** `POST /enumeration-area`

**Access:** Admin only

**Request Body:**
```json
{
  "name": "EA-1",
  "description": "Enumeration Area 1",
  "areaCode": "01",
  "subAdministrativeZoneIds": [1, 2],  // Array of SAZ IDs
  "areaSqKm": 22.22,
  "geom": "MULTIPOLYGON(...)"
}
```

**Response:**
```json
{
  "id": 1,
  "name": "EA-1",
  "description": "Enumeration Area 1",
  "areaCode": "01",
  "areaSqKm": 22.22,
  "subAdministrativeZones": [
    {
      "id": 1,
      "name": "SAZ-1",
      "areaCode": "01",
      "type": "lap"
    },
    {
      "id": 2,
      "name": "SAZ-2",
      "areaCode": "02",
      "type": "chiwog"
    }
  ]
}
```

### 2. Create Enumeration Area from GeoJSON

**Endpoint:** `POST /enumeration-area/geojson`

**Access:** Public

**Request Body:**
```json
{
  "type": "Feature",
  "properties": {
    "name": "EA-1",
    "description": "Enumeration Area 1",
    "areaCode": "01",
    "subAdministrativeZoneIds": [1, 2],  // Array of SAZ IDs
    "areaSqKm": 22.22
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [...]
  }
}
```

### 3. Bulk Upload Enumeration Areas from GeoJSON

**Endpoint:** `POST /enumeration-area/bulk-upload-geojson`

**Access:** Admin only

**Request:** `multipart/form-data`
- `file`: GeoJSON FeatureCollection file

**GeoJSON Format:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "EA-1",
        "description": "Description",
        "areaCode": "01",
        "subAdministrativeZoneIds": [1, 2],  // Array required
        "areaSqKm": 22.22
      },
      "geometry": {...}
    }
  ]
}
```

### 4. Update Enumeration Area

**Endpoint:** `PATCH /enumeration-area/:id`

**Access:** Admin only

**Request Body:** (All fields optional)
```json
{
  "name": "Updated EA Name",
  "subAdministrativeZoneIds": [1, 3, 5],  // Can update SAZ associations
  "areaSqKm": 25.5
}
```

**Note:** Updating `subAdministrativeZoneIds` will replace all existing associations.

### 5. Get Enumeration Area

**Endpoint:** `GET /enumeration-area/:id`

**Query Parameters:**
- `withGeom` (boolean, default: false) - Include geometry
- `includeSubAdminZone` (boolean, default: false) - Include linked SAZs

**Response (with `includeSubAdminZone=true`):**
```json
{
  "id": 1,
  "name": "EA-1",
  "description": "Description",
  "areaCode": "01",
  "areaSqKm": 22.22,
  "subAdministrativeZones": [
    {
      "id": 1,
      "name": "SAZ-1",
      "areaCode": "01",
      "type": "lap",
      "administrativeZoneId": 5
    },
    {
      "id": 2,
      "name": "SAZ-2",
      "areaCode": "02",
      "type": "chiwog",
      "administrativeZoneId": 5
    }
  ]
}
```

### 6. Get All Enumeration Areas

**Endpoint:** `GET /enumeration-area`

**Query Parameters:**
- `withGeom` (boolean, default: false)
- `subAdministrativeZoneId` (number) - Filter by SAZ ID
- `includeSubAdminZone` (boolean, default: false)

**Note:** When filtering by `subAdministrativeZoneId`, returns all EAs linked to that SAZ via the junction table.

## New Response Structure

### Enumeration Area Response

All enumeration area responses now include `subAdministrativeZones` as an **array** (when included):

```typescript
{
  id: number;
  name: string;
  description: string;
  areaCode: string;
  areaSqKm: number | null;
  geom?: string;
  subAdministrativeZones?: SubAdministrativeZone[];  // Array via junction table
}
```

## Migration Guide

### Frontend Migration Steps

1. **Update DTOs:**
   ```typescript
   // OLD
   interface CreateEnumerationAreaDto {
     subAdministrativeZoneId: number;
   }
   
   // NEW
   interface CreateEnumerationAreaDto {
     subAdministrativeZoneIds: number[];  // Array, min 1
   }
   ```

2. **Update Service Calls:**
   ```typescript
   // OLD
   this.enumerationAreaService.create({
     name: "EA-1",
     subAdministrativeZoneId: 5
   });
   
   // NEW
   this.enumerationAreaService.create({
     name: "EA-1",
     subAdministrativeZoneIds: [5]  // Array, even for single SAZ
   });
   ```

3. **Update Response Handling:**
   ```typescript
   // OLD
   const sazId = ea.subAdministrativeZoneId;
   const saz = ea.subAdministrativeZone;
   
   // NEW
   const sazIds = ea.subAdministrativeZoneIds;  // Array
   const sazs = ea.subAdministrativeZones;  // Array
   const firstSaz = ea.subAdministrativeZones?.[0];  // If you need single SAZ
   ```

## Error Handling

### Common Errors

1. **Missing `subAdministrativeZoneIds`:**
   ```json
   {
     "statusCode": 400,
     "message": [
       "subAdministrativeZoneIds should not be empty",
       "subAdministrativeZoneIds must be an array"
     ]
   }
   ```

2. **Empty Array:**
   ```json
   {
     "statusCode": 400,
     "message": [
       "At least one Sub-Administrative Zone is required"
     ]
   }
   ```

3. **Invalid SAZ ID:**
   - If any SAZ ID in the array doesn't exist, the entire operation will fail
   - All SAZ IDs must be valid

## Examples

### Example 1: Create EA with Single SAZ
```typescript
POST /enumeration-area
{
  "name": "EA-1",
  "description": "Single SAZ EA",
  "areaCode": "01",
  "subAdministrativeZoneIds": [5],  // Single SAZ as array
  "areaSqKm": 22.22,
  "geom": "..."
}
```

### Example 2: Create EA with Multiple SAZs
```typescript
POST /enumeration-area
{
  "name": "EA-Combined",
  "description": "Combined EA from multiple SAZs",
  "areaCode": "02",
  "subAdministrativeZoneIds": [1, 2, 3],  // Multiple SAZs
  "areaSqKm": 50.0,
  "geom": "..."
}
```

### Example 3: Angular Service Example
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class EnumerationAreaService {
  private apiUrl = 'http://localhost:3000/enumeration-area';

  constructor(private http: HttpClient) {}

  create(createDto: {
    name: string;
    description: string;
    areaCode: string;
    subAdministrativeZoneIds: number[];  // Array
    areaSqKm?: number | null;
    geom: string;
  }): Observable<any> {
    return this.http.post(this.apiUrl, createDto);
  }

  findOne(id: number, includeSubAdminZone = false): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`, {
      params: { includeSubAdminZone: includeSubAdminZone.toString() }
    });
  }
}
```

## Database Schema

The relationship is now managed via a junction table:

**Table:** `EnumerationAreaSubAdministrativeZones`
- `enumerationAreaId` (FK, Primary Key)
- `subAdministrativeZoneId` (FK, Primary Key)

**Note:** The old `subAdministrativeZoneId` column in `EnumerationAreas` table should be removed or made nullable via database migration.

