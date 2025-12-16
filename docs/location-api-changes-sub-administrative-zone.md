# Sub-Administrative Zone API Changes Documentation

## Overview

The Sub-Administrative Zone API has been updated to support a **many-to-many relationship** with Enumeration Areas via a junction table. This allows multiple SAZs to be combined into a single EA.

## Changes

### Response Structure Changes

#### Before (Old Format)
```typescript
{
  id: number;
  name: string;
  enumerationAreas: EnumerationArea[];  // Direct HasMany relationship
}
```

#### After (New Format)
```typescript
{
  id: number;
  name: string;
  enumerationAreas: EnumerationArea[];  // Via junction table (BelongsToMany)
}
```

**Note:** The response structure remains the same, but the underlying relationship is now managed via a junction table, allowing multiple SAZs to share the same EA.

## Updated Routes

### 1. Get Sub-Administrative Zone

**Endpoint:** `GET /sub-administrative-zone/:id`

**Query Parameters:**
- `withoutGeom` (boolean, default: false) - Exclude geometry
- `includeEnumerationAreas` (boolean, default: false) - Include linked EAs

**Example Request:**
```
GET /sub-administrative-zone/1?includeEnumerationAreas=true
```

**Response (with `includeEnumerationAreas=true`):**
```json
{
  "id": 1,
  "name": "Dechencholing I",
  "type": "lap",
  "areaCode": "01",
  "areaSqKm": 0.8272,
  "administrativeZoneId": 12,
  "enumerationAreas": [
    {
      "id": 4,
      "name": "EA-1(Test)",
      "description": "Description",
      "areaCode": "01",
      "areaSqKm": 22.0
    }
  ]
}
```

**Note:** An EA can appear in multiple SAZs' `enumerationAreas` arrays if it's linked to multiple SAZs via the junction table.

### 2. Get All Sub-Administrative Zones

**Endpoint:** `GET /sub-administrative-zone`

**Query Parameters:**
- `administrativeZoneId` (number) - Filter by administrative zone

**Response:**
```json
[
  {
    "id": 1,
    "name": "SAZ-1",
    "type": "lap",
    "areaCode": "01",
    "areaSqKm": 22.22,
    "administrativeZoneId": 5
  }
]
```

**Note:** Enumeration areas are not included by default. Use `includeEnumerationAreas` query parameter when fetching individual SAZs.

### 3. Create Sub-Administrative Zone

**Endpoint:** `POST /sub-administrative-zone`

**Access:** Admin only

**Request Body:**
```json
{
  "administrativeZoneId": 5,
  "name": "New SAZ",
  "areaCode": "03",
  "type": "lap",
  "areaSqKm": 15.5,
  "geom": "MULTIPOLYGON(...)"
}
```

**Response:**
```json
{
  "id": 10,
  "name": "New SAZ",
  "type": "lap",
  "areaCode": "03",
  "areaSqKm": 15.5,
  "administrativeZoneId": 5
}
```

**Note:** Creating a SAZ does not automatically create EAs. EAs must be created separately and linked via the junction table.

### 4. Upload SAZ with EA (Single SAZ, Single EA)

**Endpoint:** `POST /sub-administrative-zone/upload-saz-ea`

**Access:** Admin only

**Request:** `multipart/form-data`

**Form Fields:**
- `administrativeZoneId` (number, required) - Administrative Zone ID
- `name` (string, required) - SAZ name
- `areaCode` (string, required) - SAZ area code
- `type` (string, required) - Must be "chiwog" or "lap"
- `areaSqKm` (number, required) - SAZ area in square kilometers
- `file` (GeoJSON file, required) - GeoJSON file used for both SAZ and EA geometry

**Special Behavior:**
- Creates both a SAZ and an EA in one operation
- EA is created with **fixed values**:
  - `name`: "EA1"
  - `areaCode`: "01"
  - `areaSqKm`: 22.22
- Both SAZ and EA share the **same geometry** from the uploaded file
- SAZ and EA are automatically linked via the junction table

**Example Request (Angular):**
```typescript
const formData = new FormData();
formData.append('administrativeZoneId', '5');
formData.append('name', 'Dechencholing I');
formData.append('areaCode', '01');
formData.append('type', 'lap');
formData.append('areaSqKm', '0.8272');
formData.append('file', geoJsonFile);

this.http.post('http://localhost:3000/sub-administrative-zone/upload-saz-ea', formData)
  .subscribe(response => console.log(response));
```

**Response:**
```json
{
  "subAdministrativeZone": {
    "id": 1,
    "name": "Dechencholing I",
    "type": "lap",
    "areaCode": "01",
    "areaSqKm": 0.8272,
    "administrativeZoneId": 5
  },
  "enumerationArea": {
    "id": 4,
    "name": "EA1",
    "areaCode": "01",
    "areaSqKm": 22.22,
    "description": null
  }
}
```

### 5. Get Sub-Administrative Zones by Dzongkhag

**Endpoint:** `GET /sub-administrative-zone/by-dzongkhag/:dzongkhagId`

**Response:**
```json
[
  {
    "id": 1,
    "name": "SAZ-1",
    "type": "lap",
    "areaCode": "01",
    "areaSqKm": 22.22,
    "administrativeZoneId": 5
  }
]
```

### 6. Get Sub-Administrative Zones as GeoJSON

**Endpoint:** `GET /sub-administrative-zone/geojson/:id`

**Response:**
```json
{
  "type": "Feature",
  "properties": {
    "id": 1,
    "name": "SAZ-1",
    "type": "lap",
    "areaCode": "01",
    "areaSqKm": 22.22
  },
  "geometry": {
    "type": "MultiPolygon",
    "coordinates": [...]
  }
}
```

## Important Notes

### 1. Junction Table Relationship

- SAZs and EAs are now linked via `EnumerationAreaSubAdministrativeZones` junction table
- One EA can be linked to multiple SAZs
- One SAZ can be linked to multiple EAs
- This allows combining small SAZs into larger EAs

### 2. Querying Enumeration Areas

When querying for enumeration areas linked to a SAZ:
- Use `includeEnumerationAreas=true` query parameter
- The response will include all EAs linked to that SAZ via the junction table
- An EA may appear in multiple SAZs if it's linked to multiple SAZs

### 3. Creating EAs with Multiple SAZs

To create an EA linked to multiple SAZs, use the Enumeration Area API:

```typescript
POST /enumeration-area
{
  "name": "EA-Combined",
  "description": "Combined from multiple SAZs",
  "areaCode": "01",
  "subAdministrativeZoneIds": [1, 2, 3],  // Multiple SAZ IDs
  "areaSqKm": 50.0,
  "geom": "..."
}
```

## Migration Guide

### Frontend Changes

1. **No DTO Changes Required**
   - SAZ DTOs remain unchanged
   - Only the relationship behavior has changed

2. **Response Handling**
   ```typescript
   // Response structure is the same
   const saz = response;
   const eas = saz.enumerationAreas;  // Array, via junction table
   
   // Note: An EA might appear in multiple SAZs
   ```

3. **Query Parameters**
   ```typescript
   // Include enumeration areas when needed
   GET /sub-administrative-zone/1?includeEnumerationAreas=true
   ```

## Examples

### Example 1: Get SAZ with EAs
```typescript
GET /sub-administrative-zone/1?includeEnumerationAreas=true

Response:
{
  "id": 1,
  "name": "SAZ-1",
  "enumerationAreas": [
    {
      "id": 4,
      "name": "EA-1",
      "areaCode": "01"
    }
  ]
}
```

### Example 2: Angular Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SubAdministrativeZoneService {
  private apiUrl = 'http://localhost:3000/sub-administrative-zone';

  constructor(private http: HttpClient) {}

  findOne(id: number, includeEnumerationAreas = false): Observable<any> {
    const params: any = {};
    if (includeEnumerationAreas) {
      params.includeEnumerationAreas = 'true';
    }
    return this.http.get(`${this.apiUrl}/${id}`, { params });
  }

  uploadSazWithEa(formData: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/upload-saz-ea`, formData);
  }
}
```

## Database Schema

The relationship is managed via a junction table:

**Table:** `EnumerationAreaSubAdministrativeZones`
- `enumerationAreaId` (FK, Primary Key)
- `subAdministrativeZoneId` (FK, Primary Key)

**Composite Primary Key:** (`enumerationAreaId`, `subAdministrativeZoneId`)

