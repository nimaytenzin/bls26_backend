# Dzongkhag API Changes Documentation

## Overview

The Dzongkhag API has been updated to properly handle enumeration areas via the new junction table relationship. The `GET /dzongkhag/:id/enumeration-areas` endpoint now correctly includes enumeration areas in the hierarchical response.

## Updated Routes

### 1. Get Enumeration Areas by Dzongkhag

**Endpoint:** `GET /dzongkhag/:id/enumeration-areas`

**Query Parameters:**
- `withGeom` (boolean, default: false) - Include geometry for enumeration areas
- `includeHierarchy` (boolean, default: true) - Include full hierarchy structure

**Default Behavior:** Returns full hierarchy with enumeration areas

**Example Request:**
```
GET /dzongkhag/22/enumeration-areas?withGeom=true
```

**Response Structure (with `includeHierarchy=true`):**
```json
{
  "id": 22,
  "name": "Thimphu",
  "areaCode": "14",
  "areaSqKm": "1796.5673",
  "administrativeZones": [
    {
      "id": 12,
      "dzongkhagId": 22,
      "name": "Thimphu Thromde",
      "areaCode": "51",
      "type": "Thromde",
      "areaSqKm": "26.1584",
      "subAdministrativeZones": [
        {
          "id": 2,
          "administrativeZoneId": 12,
          "name": "Dechencholing II",
          "type": "lap",
          "areaCode": "02",
          "areaSqKm": "22.2200",
          "enumerationAreas": [  // ✅ Now included via junction table
            {
              "id": 4,
              "name": "EA-1(Test)",
              "description": "Description",
              "areaCode": "01",
              "areaSqKm": "22.0000"
            }
          ]
        },
        {
          "id": 1,
          "administrativeZoneId": 12,
          "name": "Dechencholing I",
          "type": "lap",
          "areaCode": "01",
          "areaSqKm": "0.8272",
          "enumerationAreas": []  // ✅ Empty array if no EAs linked
        }
      ]
    }
  ]
}
```

**Response Structure (with `includeHierarchy=false`):**
```json
{
  "dzongkhagId": 22,
  "enumerationAreas": [
    {
      "id": 4,
      "name": "EA-1(Test)",
      "description": "Description",
      "areaCode": "01",
      "areaSqKm": "22.0000"
    }
  ],
  "totalCount": 1
}
```

### 2. Get Enumeration Areas as GeoJSON by Dzongkhag

**Endpoint:** `GET /dzongkhag/:id/enumeration-areas/geojson`

**Response:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "id": 4,
        "name": "EA-1(Test)",
        "areaCode": "01",
        "areaSqKm": "22.0000"
      },
      "geometry": {
        "type": "MultiPolygon",
        "coordinates": [...]
      }
    }
  ]
}
```

### 3. Get Dzongkhag with Enumeration Areas

**Endpoint:** `GET /dzongkhag/:id`

**Query Parameters:**
- `withGeom` (boolean, default: false)
- `includeAdminZones` (boolean, default: false)
- `includeSubAdminZones` (boolean, default: false)
- `includeEAs` (boolean, default: false) - Include enumeration areas

**Example Request:**
```
GET /dzongkhag/22?includeAdminZones=true&includeSubAdminZones=true&includeEAs=true
```

**Response:**
```json
{
  "id": 22,
  "name": "Thimphu",
  "administrativeZones": [
    {
      "id": 12,
      "name": "Thimphu Thromde",
      "subAdministrativeZones": [
        {
          "id": 2,
          "name": "Dechencholing II",
          "enumerationAreas": [  // ✅ Included when includeEAs=true
            {
              "id": 4,
              "name": "EA-1(Test)",
              "areaCode": "01"
            }
          ]
        }
      ]
    }
  ]
}
```

## Key Changes

### 1. Enumeration Areas Now Included

- Enumeration areas are now properly loaded via the junction table
- Each `subAdministrativeZone` in the hierarchy includes an `enumerationAreas` array
- Empty arrays (`[]`) are returned for SAZs with no linked EAs

### 2. Attribute Names Fixed

- All enumeration area attributes are now returned with correct names:
  - `name` (not `nam`)
  - `description` (not `des`)
  - `areaCode` (not `are`)
  - `areaSqKm`

### 3. Junction Table Support

- Enumeration areas are queried via `EnumerationAreaSubAdministrativeZones` junction table
- Supports EAs linked to multiple SAZs
- Properly handles cases where an EA appears under multiple SAZs

## Migration Guide

### Frontend Changes

1. **Response Structure**
   ```typescript
   // Enumeration areas are now always included in hierarchy
   const dzongkhag = response;
   dzongkhag.administrativeZones.forEach(az => {
     az.subAdministrativeZones.forEach(saz => {
       const eas = saz.enumerationAreas;  // ✅ Always an array
       // Empty array if no EAs linked
     });
   });
   ```

2. **Query Parameters**
   ```typescript
   // Default includes hierarchy with EAs
   GET /dzongkhag/22/enumeration-areas
   
   // Flat list without hierarchy
   GET /dzongkhag/22/enumeration-areas?includeHierarchy=false
   
   // With geometry
   GET /dzongkhag/22/enumeration-areas?withGeom=true
   ```

3. **Handling Empty Arrays**
   ```typescript
   // Always check for empty arrays
   saz.enumerationAreas?.forEach(ea => {
     // Process EA
   });
   
   // Or check length
   if (saz.enumerationAreas?.length > 0) {
     // Has EAs
   }
   ```

## Examples

### Example 1: Get Full Hierarchy with EAs
```typescript
GET /dzongkhag/22/enumeration-areas

Response includes:
- Dzongkhag
  - Administrative Zones
    - Sub-Administrative Zones
      - Enumeration Areas (via junction table)
```

### Example 2: Get Flat List of EAs
```typescript
GET /dzongkhag/22/enumeration-areas?includeHierarchy=false

Response:
{
  "dzongkhagId": 22,
  "enumerationAreas": [...],
  "totalCount": 10
}
```

### Example 3: Angular Service
```typescript
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DzongkhagService {
  private apiUrl = 'http://localhost:3000/dzongkhag';

  constructor(private http: HttpClient) {}

  getEnumerationAreas(
    dzongkhagId: number,
    withGeom = false,
    includeHierarchy = true
  ): Observable<any> {
    const params: any = {};
    if (withGeom) params.withGeom = 'true';
    if (!includeHierarchy) params.includeHierarchy = 'false';
    
    return this.http.get(
      `${this.apiUrl}/${dzongkhagId}/enumeration-areas`,
      { params }
    );
  }
}
```

## Error Handling

### Common Issues

1. **Missing Enumeration Areas**
   - If no EAs are linked to any SAZ in the dzongkhag, all `enumerationAreas` arrays will be empty
   - This is expected behavior, not an error

2. **Geometry Not Included**
   - By default, geometry is excluded for performance
   - Use `withGeom=true` to include geometry

## Database Schema

The enumeration areas are queried via the junction table:

```sql
SELECT DISTINCT ea.*
FROM "EnumerationAreas" ea
INNER JOIN "EnumerationAreaSubAdministrativeZones" junction 
  ON ea.id = junction."enumerationAreaId"
JOIN "SubAdministrativeZones" saz ON junction."subAdministrativeZoneId" = saz.id
JOIN "AdministrativeZones" az ON saz."administrativeZoneId" = az.id
WHERE az."dzongkhagId" = :dzongkhagId
```

This ensures that:
- Only EAs linked via the junction table are included
- EAs linked to multiple SAZs are properly handled
- The hierarchy correctly reflects the many-to-many relationship

